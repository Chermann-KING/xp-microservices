/**
 * @fileoverview Contrôleur pour les webhooks Stripe
 */

import { stripe } from "../config/stripe.js";
import { paymentService } from "../services/paymentService.js";

class WebhookController {
  /**
   * POST /webhooks/stripe
   * Réception des événements webhook Stripe
   */
  async handleStripeWebhook(req, res) {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
      // Vérifier la signature du webhook
      event = stripe.webhooks.constructEvent(
        req.body, // Raw body
        sig,
        webhookSecret
      );
    } catch (err) {
      console.error("❌ Erreur signature webhook:", err.message);
      return res.status(400).json({
        success: false,
        error: `Signature webhook invalide: ${err.message}`,
      });
    }

    try {
      // Traiter l'événement
      const result = await paymentService.handleWebhookEvent(event);

      res.json({
        success: true,
        received: true,
        ...result,
      });
    } catch (error) {
      console.error("❌ Erreur traitement webhook:", error.message);

      // Toujours retourner 200 pour éviter les retry Stripe
      // (sauf si c'est une erreur de signature)
      res.json({
        success: false,
        error: error.message,
        received: true,
      });
    }
  }
}

export const webhookController = new WebhookController();
export default webhookController;
