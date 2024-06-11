import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AuthService } from '../authentificationService/auth.service';
import { User } from '../../interfaces/userInterface';
import { Dto } from '../../dto/Dto';
import { MailService } from '../../email/service/MailService';

const prisma: PrismaClient = new PrismaClient();

/**
 * Service responsable de la gestion des utilisateurs.
 *
 * Ce service fournit des fonctionnalités telles que la création d'un nouvel utilisateur
 * avec des vérifications d'existence et le hachage sécurisé du mot de passe.
 *
 * @remarks
 * Ce service utilise le client Prisma pour interagir avec la base de données.
 *
 * @example
 * ```typescript
 * const userService = new UserService();
 * const newUser: User = { ... }; // Définir les détails de l'utilisateur
 * const userCreated = await userService.create(newUser);
 * console.log('L\'utilisateur a été créé avec succès ?', userCreated);
 * ```
 */
@Injectable()
export class UserService {
  constructor(private readonly mailService: MailService) {}

  /**
   * Crée un nouvel utilisateur avec des vérifications d'existence et hachage sécurisé du mot de passe.
   *
   * @param data - Les détails de l'utilisateur à créer.
   * @returns Une promesse résolue avec un boolean indiquant si l'utilisateur a été créé avec succès.
   * @throws {Error} Une erreur si la création de l'utilisateur échoue.
   */
  public async create(data: Dto) {
    const regexPassword =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    try {
      if (!regexPassword.test(data.password)) {
        // Si le mot de passe n'est pas conforme.
        return { bool: false, type: 'password' };
      }

      const userExist = await prisma.user.findFirst({
        where: {
          OR: [{ userName: data.userName }, { email: data.email }],
        },
      });

      if (!userExist) {
        const password: string = await AuthService.hashPassword(data.password);

        try {
          const createUser: User = await prisma.user.create({
            data: {
              userName: data.userName,
              password: password,
              email: data.email,
              firstName: data.firstName,
              lastName: data.lastName,
              groupsId: 1, // Par défaut groupe 1 qui équivaut au groupe utilisation lambda
            },
          });

          // Realise les actions necessaire à l'envoie du mail de création de compte.
          const responseSendMail = await this.mailService.prepareMail(
            createUser.id,
            data,
            1,
          );
          return {
            bool: createUser && responseSendMail,
            type: 'ok',
          };
        } catch (error) {
          console.error("Erreur lors de la création de l'utilisateur :", error);
          // Gérer l'erreur de création de l'utilisateur
        }
      } else {
        //Si l'utilisateur existe déja
        return { bool: false, type: 'username' };
      }
    } catch (error) {
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Met à jour les informations d'un utilisateur dans la base de données.
   *
   * @param user - Les nouvelles informations de l'utilisateur à mettre à jour.
   *
   * @returns Le code de statut HTTP indiquant le résultat de l'opération de mise à jour.
   * - HttpStatus.OK (200) si la mise à jour a réussi.
   * - HttpStatus.NOT_FOUND (404) si l'utilisateur n'a pas été trouvé dans la base de données.
   *
   * @throws Error si une erreur se produit lors de la mise à jour de l'utilisateur.
   *
   * @beta
   */
  async update(user: User) {
    /**
     * Met à jour les informations de l'utilisateur dans la base de données.
     * Les champs mis à jour incluent l'avatar, la présentation, la localisation, l'entreprise, l'école, GitHub, l'URL, le nom, le prénom et les titres.
     */
    const userUpdate = await prisma.user.update({
      where: {
        userName: user.userName,
        id: user.id,
      },
      data: {
        avatar: user.avatar,
        lastName: user.lastName,
        firstName: user.firstName,
      },
    });

    /**
     * Vérifie si la mise à jour de l'utilisateur a réussi.
     * Retourne le code de statut HTTP approprié en conséquence.
     */
    return userUpdate ? HttpStatus.OK : HttpStatus.NOT_FOUND;
  }

  async getUsers(
    pageNumber: number,
    itemPerPage: number,
    isEntreprise: string,
  ) {
    const offset = (pageNumber - 1) * itemPerPage;
    const testEntreprise = isEntreprise === 'true';
    try {
      const users = await prisma.user.findMany({
        take: itemPerPage,
        skip: offset,
        select: {
          id: true,
          firstName: testEntreprise,
          lastName: testEntreprise,
          userName: true,
          email: testEntreprise,
        },
      });

      const countUser = await prisma.user.count();

      return { item: users, total: countUser };
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs :', error);
      throw error;
    }
  }

  async getUsersByUserName(
    userNameSubstring: string,
    itemPerPage: number,
    isEntreprise: string,
  ) {
    try {
      const testEntreprise = isEntreprise === 'true';
      const users = await prisma.user.findMany({
        take: itemPerPage,
        where: {
          userName: {
            contains: userNameSubstring,
          },
        },
        select: {
          id: true,
          firstName: testEntreprise,
          lastName: testEntreprise,
          userName: true,
          email: testEntreprise,
        },
      });

      const countUser = await prisma.user.count({
        where: {
          userName: {
            contains: userNameSubstring,
          },
        },
      });
      return { item: users, total: countUser };
    } catch (error) {
      console.error(
        'Error fetching users with userName containing:',
        userNameSubstring,
        error,
      );
      throw error;
    }
  }
}
