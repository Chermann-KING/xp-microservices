/**
 * @fileoverview Service de paiement - intégration Stripe
 */

import { stripe } from "../config/stripe.js";
import { paymentRepository } from "../repositories/paymentRepository.js";
import axios from "axios";

const BOOKING_SERVICE_URL =
  process.env.BOOKING_SERVICE_URL || "http://localhost:3002";

class PaymentService {
  /**
   * Crée un PaymentIntent Stripe
   * @param {Object} params
   * @param {string} params.bookingId - ID de la réservation
   * @param {string} params.userId - ID de l'utilisateur
   * @param {number} params.amount - Montant en centimes
   * @param {string} params.currency - Devise (défaut: eur)
   * @param {Object} params.metadata - Métadonnées additionnelles
   * @returns {Promise<Object>} PaymentIntent et enregistrement local
   */
  async createPaymentIntent({
    bookingId,
    userId,
    amount,
    currency = "eur",
    metadata = {},
  }) {
    // Créer le PaymentIntent Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe attend les montants en centimes
      currency,
      metadata: {
        bookingId,
        userId,
        ...metadata,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Créer l'enregistrement local
    const payment = await paymentRepository.create({
      bookingId,
      userId,
      stripePaymentIntentId: paymentIntent.id,
      amount,
      currency,
      status: "pending",
      metadata,
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      payment: payment.toJSON(),
    };
  }

  /**
   * Récupère le statut d'un paiement
   * @param {string} paymentId
   * @returns {Promise<Object>}
   */
  async getPaymentStatus(paymentId) {
    const payment = await paymentRepository.findById(paymentId);

    if (!payment) {
      const error = new Error("Paiement non trouvé");
      error.code = "PAYMENT_NOT_FOUND";
      error.statusCode = 404;
      throw error;
    }

    // Si on a un PaymentIntent, récupérer le statut actuel depuis Stripe
    if (payment.stripePaymentIntentId) {
      const paymentIntent = await stripe.paymentIntents.retrieve(
        payment.stripePaymentIntentId
      );

      // Synchroniser le statut si différent
      const stripeStatus = this._mapStripeStatus(paymentIntent.status);
      if (stripeStatus !== payment.status) {
        await paymentRepository.updateStatus(payment.id, stripeStatus);
        payment.status = stripeStatus;
      }
    }

    return payment.toJSON();
  }

  /**
   * Récupère les paiements d'un utilisateur
   * @param {string} userId
   * @param {Object} options
   * @returns {Promise<Object>}
   */
  async getUserPayments(userId, options = {}) {
    const { rows, count } = await paymentRepository.findByUserId(
      userId,
      options
    );

    return {
      payments: rows.map((p) => p.toJSON()),
      total: count,
      page: options.page || 1,
      totalPages: Math.ceil(count / (options.limit || 10)),
    };
  }

  /**
   * Récupère les paiements d'une réservation
   * @param {string} bookingId
   * @returns {Promise<Object[]>}
   */
  async getBookingPayments(bookingId) {
    const payments = await paymentRepository.findByBookingId(bookingId);
    return payments.map((p) => p.toJSON());
  }

  /**
   * Traite un remboursement
   * @param {string} paymentId
   * @param {number} amount - Montant à rembourser (null = total)
   * @param {string} reason - Raison du remboursement
   * @returns {Promise<Object>}
   */
  async refundPayment(paymentId, amount = null, reason = "") {
    const payment = await paymentRepository.findById(paymentId);

    if (!payment) {
      const error = new Error("Paiement non trouvé");
      error.code = "PAYMENT_NOT_FOUND";
      error.statusCode = 404;
      throw error;
    }

    if (payment.status !== "succeeded") {
      const error = new Error(
        "Seuls les paiements réussis peuvent être remboursés"
      );
      error.code = "INVALID_PAYMENT_STATUS";
      error.statusCode = 400;
      throw error;
    }

    // Calculer le montant à rembourser
    const refundAmount = amount || payment.amount - payment.refundedAmount;

    if (refundAmount <= 0) {
      const error = new Error("Montant de remboursement invalide");
      error.code = "INVALID_REFUND_AMOUNT";
      error.statusCode = 400;
      throw error;
    }

    // Créer le remboursement Stripe
    const refund = await stripe.refunds.create({
      payment_intent: payment.stripePaymentIntentId,
      amount: Math.round(refundAmount * 100),
      reason: reason || "requested_by_customer",
    });

    // Mettre à jour l'enregistrement local
    const newRefundedAmount = parseFloat(payment.refundedAmount) + refundAmount;
    const newStatus =
      newRefundedAmount >= payment.amount ? "refunded" : "partially_refunded";

    await paymentRepository.updateStatus(payment.id, newStatus, {
      refundedAmount: newRefundedAmount,
    });

    // Notifier le booking service
    await this._notifyBookingService(payment.bookingId, "refunded");

    return {
      refundId: refund.id,
      amount: refundAmount,
      status: newStatus,
      totalRefunded: newRefundedAmount,
    };
  }

  /**
   * Traite les événements webhook Stripe
   * @param {Object} event - Événement Stripe
   * @returns {Promise<Object>}
   */
  async handleWebhookEvent(event) {
    const { type, data } = event;
    const paymentIntent = data.object;

    console.log(`📥 Webhook Stripe: ${type}`);

    switch (type) {
      case "payment_intent.succeeded":
        return this._handlePaymentSucceeded(paymentIntent);

      case "payment_intent.payment_failed":
        return this._handlePaymentFailed(paymentIntent);

      case "payment_intent.canceled":
        return this._handlePaymentCanceled(paymentIntent);

      case "charge.refunded":
        return this._handleChargeRefunded(data.object);

      default:
        console.log(`⚠️  Événement non géré: ${type}`);
        return { handled: false, type };
    }
  }

  /**
   * Gère un paiement réussi
   * @private
   */
  async _handlePaymentSucceeded(paymentIntent) {
    const payment = await paymentRepository.findByPaymentIntentId(
      paymentIntent.id
    );

    if (!payment) {
      console.warn(
        `⚠️  PaymentIntent ${paymentIntent.id} non trouvé localement`
      );
      return { handled: false, reason: "payment_not_found" };
    }

    // Extraire les infos de carte si disponibles
    const charge = paymentIntent.latest_charge;
    let cardInfo = {};

    if (charge && typeof charge === "object") {
      cardInfo = {
        cardLast4: charge.payment_method_details?.card?.last4,
        cardBrand: charge.payment_method_details?.card?.brand,
        receiptUrl: charge.receipt_url,
      };
    }

    await paymentRepository.updateStatus(payment.id, "succeeded", {
      paymentMethod: paymentIntent.payment_method_types?.[0] || "card",
      ...cardInfo,
    });

    // Notifier le booking service
    await this._notifyBookingService(payment.bookingId, "paid");

    return { handled: true, status: "succeeded", bookingId: payment.bookingId };
  }

  /**
   * Gère un paiement échoué
   * @private
   */
  async _handlePaymentFailed(paymentIntent) {
    const payment = await paymentRepository.findByPaymentIntentId(
      paymentIntent.id
    );

    if (!payment) {
      return { handled: false, reason: "payment_not_found" };
    }

    const errorMessage =
      paymentIntent.last_payment_error?.message || "Paiement refusé";

    await paymentRepository.updateStatus(payment.id, "failed", {
      errorMessage,
    });

    // Notifier le booking service
    await this._notifyBookingService(payment.bookingId, "payment_failed");

    return { handled: true, status: "failed", bookingId: payment.bookingId };
  }

  /**
   * Gère un paiement annulé
   * @private
   */
  async _handlePaymentCanceled(paymentIntent) {
    const payment = await paymentRepository.findByPaymentIntentId(
      paymentIntent.id
    );

    if (!payment) {
      return { handled: false, reason: "payment_not_found" };
    }

    await paymentRepository.updateStatus(payment.id, "canceled");

    // Notifier le booking service
    await this._notifyBookingService(payment.bookingId, "canceled");

    return { handled: true, status: "canceled", bookingId: payment.bookingId };
  }

  /**
   * Gère un remboursement via webhook
   * @private
   */
  async _handleChargeRefunded(charge) {
    // Le charge contient le payment_intent
    const paymentIntentId = charge.payment_intent;
    const payment = await paymentRepository.findByPaymentIntentId(
      paymentIntentId
    );

    if (!payment) {
      return { handled: false, reason: "payment_not_found" };
    }

    const refundedAmount = charge.amount_refunded / 100;
    const status =
      refundedAmount >= payment.amount ? "refunded" : "partially_refunded";

    await paymentRepository.updateStatus(payment.id, status, {
      refundedAmount,
    });

    return { handled: true, status, bookingId: payment.bookingId };
  }

  /**
   * Notifie le booking service d'un changement de statut de paiement
   * @private
   */
  async _notifyBookingService(bookingId, paymentStatus) {
    try {
      await axios.patch(
        `${BOOKING_SERVICE_URL}/api/bookings/${bookingId}/payment-status`,
        { paymentStatus },
        { timeout: 5000 }
      );
      console.log(`✅ Booking ${bookingId} notifié: ${paymentStatus}`);
    } catch (error) {
      // Log mais ne pas échouer - le webhook doit toujours retourner 200
      console.error(`❌ Erreur notification booking: ${error.message}`);
    }
  }

  /**
   * Mappe le statut Stripe vers notre statut interne
   * @private
   */
  _mapStripeStatus(stripeStatus) {
    const statusMap = {
      requires_payment_method: "pending",
      requires_confirmation: "pending",
      requires_action: "processing",
      processing: "processing",
      requires_capture: "processing",
      succeeded: "succeeded",
      canceled: "canceled",
    };
    return statusMap[stripeStatus] || "pending";
  }
}

export const paymentService = new PaymentService();
export default paymentService;
