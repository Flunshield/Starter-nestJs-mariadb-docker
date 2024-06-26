import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { RefreshTokenService } from '../../services/authentificationService/RefreshTokenService';

interface Mail {
  email?: string;
  userName?: string;
  firstName?: string;
  lastName?: string;
  commentaire?: string;
  idPuzzle?: string;
  pdfBuffer?: Promise<Buffer>;
}
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly mailerService: MailerService,
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

  async sendActiveAccount(data: Mail, urlActive: string): Promise<boolean> {
    try {
      await this.mailerService.sendMail({
        to: data.email,
        subject: 'Active ton compte',
        template: 'active',
        context: {
          urlActive: urlActive,
          userName: data.userName,
        },
      });
      return true;
    } catch (error) {
      this.logger.error(
        `Erreur lors de l'envoi de l'e-mail : ${error.message}`,
        error.stack,
      );
    }
  }

  async sendForgotPassword(data: Mail, urlActive: string): Promise<boolean> {
    try {
      await this.mailerService.sendMail({
        to: data.email,
        subject: 'Modifie ton mot de passe',
        template: 'forgot',
        context: {
          urlActive: urlActive,
          userName: data.userName,
        },
      });
      return true;
    } catch (error) {
      this.logger.error(
        `Erreur lors de l'envoi de l'e-mail : ${error.message}`,
        error.stack,
      );
    }
  }

  async sendPuzzleToUser(data: Mail, urlActive: string): Promise<boolean> {
    try {
      await this.mailerService.sendMail({
        to: data.email,
        subject: 'Puzzle de test',
        template: 'puzzleTest',
        context: {
          urlActive: urlActive,
          firstName: data.firstName,
          lastName: data.lastName,
          commentaire: data.commentaire,
        },
      });
      return true;
    } catch (error) {
      this.logger.error(
        `Erreur lors de l'envoi de l'e-mail : ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Envoie un e-mail d'activation de compte à l'utilisateur avec les informations spécifiées.
   *
   * @param id - L'identifiant numérique associé à l'utilisateur.
   * @param data - Les informations de l'utilisateur, y compris le nom d'utilisateur.
   * @returns Une promesse qui se résout lorsque l'e-mail a été envoyé avec succès.
   * @throws {Error} Une erreur est levée si la génération du jeton d'accès échoue ou si l'envoi de l'e-mail échoue.
   *
   * @remarks
   * Cette fonction génère un jeton d'accès en utilisant la fonction `generateAccessTokenEmail`
   * du service de rafraîchissement de jeton (`RefreshTokenService`).
   * Le lien d'activation dans l'e-mail contient le jeton généré et pointe vers l'URL spécifiée.
   *
   * @param id - L'identifiant numérique associé à l'utilisateur.
   * @param type
   * @param data - Les informations de l'utilisateur, y compris le nom d'utilisateur.
   *
   * @param mailID
   * @example
   * ```typescript
   * const id = 123;
   * const userData = { userName: 'john_doe',  ...other user data };
   * await sendMail(id, userData);
   * ```
   **/
  public async prepareMail(
    id?: number,
    data?: Mail,
    type?: number,
    mailID?: number,
  ) {
    // TYPE 1 : Envoie du mail pour valider l'adresse mail.
    if (type === 1) {
      const token = await this.refreshTokenService.generateAccesTokenEmail({
        id: id,
        userName: data.userName,
      });
      return await this.sendActiveAccount(
        data,
        `${process.env.URL_BACK}/auth/validMail?token=${token}`,
      );
    }

    // TYPE 2 : Envoie du mail d'oublie de mot de passe
    if (type === 2) {
      const token =
        await this.refreshTokenService.generateAccesTokenPasswordChange(
          id,
          data.userName,
        );
      return await this.sendForgotPassword(
        data,
        `${process.env.URL_FRONT}/changePassword?token=${token}&userName=${data.userName}`,
      );
    }

    // TYPE 3 : Envoie d'un puzzle par mail
    if (type === 3) {
      const token = await this.refreshTokenService.generateAccesTokenEmail(
        { puzzleID: data.idPuzzle, mailID: mailID },
        '7d',
      );
      return await this.sendPuzzleToUser(
        data,
        `${process.env.URL_FRONT}/loadGame?token=${token}`,
      );
    }

    // TYPE 4 : Envoie d'un mail de confirmation d'achat avec facture
    if (type === 4) {
      return await this.sendConfirmationOrder(data);
    }
  }

  async sendConfirmationOrder(data: Mail): Promise<boolean> {
    try {
      // Attendre la résolution de la promesse pour obtenir le Buffer
      const pdfBuffer = await data.pdfBuffer;

      await this.mailerService.sendMail({
        to: data.email,
        subject: "Confirmation d'achat",
        template: 'confirmOrder',
        context: {
          firstName: data.firstName,
          lastName: data.lastName,
        },
        attachments: [
          {
            filename: 'facture.pdf',
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      });
      return true;
    } catch (error) {
      this.logger.error(
        `Erreur lors de l'envoi de l'e-mail : ${error.message}`,
        error.stack,
      );
    }
  }
}
