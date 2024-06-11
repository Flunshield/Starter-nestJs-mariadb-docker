import { Injectable } from '@nestjs/common';
import { Stripe } from 'stripe';
import { PrismaClient } from '@prisma/client';
import { User } from 'src/interfaces/userInterface';
import { PdfService } from '../pdfservice/pdf.service';
import { MailService } from '../../email/service/MailService';

const prisma: PrismaClient = new PrismaClient();

@Injectable()
export class StripeService {
  private stripe = new Stripe(
    'sk_test_51P1YCzFoLa8m0nzyi1YXY5DWNpDYc89lZ0oa17ueukKAwuJkhUMP1Ig1XRtuveCVaMJBcxXq1dVuD1p1UtHEqZNd007GVNqPQx',
    {
      apiVersion: '2023-10-16',
    },
  );

  constructor(
    private readonly mailService: MailService,
    private readonly pdfService: PdfService,
  ) {}

  /**
   * Récupère une session de paiement Stripe spécifiée par son identifiant de session.
   * Cette fonction tente de récupérer les détails d'une session de paiement en utilisant l'API Stripe Checkout.
   * Elle tente d'élargir les informations récupérées en incluant les 'line_items' (éléments de la ligne de commande).
   *
   * @param sessionId - L'identifiant de la session Stripe à récupérer.
   * @returns Une promesse résolue avec les détails de la session Stripe si elle est trouvée, ou `undefined` si aucun résultat n'est trouvé.
   * @throws {Error} Lève une exception si une erreur survient pendant la récupération de la session.
   */
  async retrieveSession(
    sessionId: string,
  ): Promise<Stripe.Response<Stripe.Checkout.Session>> {
    try {
      let session;

      if (sessionId) {
        session = this.stripe.checkout.sessions.retrieve(sessionId, {
          expand: ['line_items'],
        });
      }

      if (session) {
        return session;
      } else {
        return;
      }
    } catch (e) {
      console.log(e);
    }
  }

  /**
   * Récupère le statut d'abonnement d'un client en fonction de son ID client Stripe.
   *
   * Cette méthode liste tous les abonnements associés au client spécifié, filtre ceux qui sont
   * actifs, en période d'essai ou en retard de paiement, et retourne leur statut.
   *
   * @param {string} customerId - L'ID du client Stripe.
   *
   * @returns {Promise<{ active: boolean, subscriptions: Array<Object> }>} - Retourne une promesse qui
   *     se résout avec un objet contenant un indicateur de statut d'abonnement actif et une liste
   *     des abonnements actifs.
   *
   * @throws {Error} - Lance une erreur si une opération échoue.
   */
  async getSubscriptionStatus(
    customerId: string,
  ): Promise<{ active: boolean; subscriptions: Array<object> }> {
    try {
      const subscriptions = await this.stripe.subscriptions.list({
        customer: customerId,
        status: 'all',
        expand: ['data.default_payment_method'],
      });

      if (subscriptions.data.length === 0) {
        return { active: false, subscriptions: [] };
      }

      const activeSubscriptions = subscriptions.data.filter(
        (subscription) =>
          subscription.status === 'active' ||
          subscription.status === 'trialing' ||
          subscription.status === 'past_due',
      );

      return {
        active: activeSubscriptions.length > 0,
        subscriptions: activeSubscriptions,
      };
    } catch (e) {
      console.log(e);
    }
  }

  /**
   * Annule l'abonnement d'un utilisateur à la fin de la période de facturation en cours.
   *
   * Cette méthode met à jour l'abonnement Stripe pour qu'il se termine à la fin de la période en cours,
   * met à jour l'état de la commande dans la base de données pour indiquer qu'elle est annulée,
   * et réinitialise l'identifiant du groupe de l'utilisateur.
   *
   * @param {Object} lastCommande - La dernière commande de l'utilisateur.
   * @param {string} lastCommande.idPayment - L'ID de paiement de la commande à annuler.
   * @param {number} lastCommande.userID - L'ID de l'utilisateur dont l'abonnement est annulé.
   *
   * @returns {Promise<Object|undefined>} - Retourne l'objet de réponse de l'abonnement annulé de Stripe
   *                                        si toutes les opérations réussissent, sinon `undefined`.
   *
   * @throws {Error} - Lance une erreur si une opération échoue.
   */
  async unsuscribeUser(lastCommande) {
    const unsuscribe = await this.stripe.subscriptions.update(
      lastCommande.idPayment,
      {
        cancel_at_period_end: true,
      },
    );

    if (unsuscribe) {
      const resetGroupUser = await prisma.user.update({
        where: {
          id: lastCommande.userID,
        },
        data: {
          groupsId: 1,
        },
      });

      if (resetGroupUser) {
        return unsuscribe;
      }
    }
  }

  async getLatestInvoice(
    customerId: string,
    id?: string,
    user?: User,
  ): Promise<Buffer> {
    const latestInvoice = await this.stripe.invoices.list({
      customer: customerId,
      limit: 1,
      status: 'paid',
      expand: ['data.default_payment_method'],
    });
    if (!user) {
      user = await prisma.user.findFirst({
        where: {
          id: parseInt(id),
        },
      });
    }
    return await this.pdfService.generateInvoicePDF(
      latestInvoice.data[0],
      user,
    );
  }
}
