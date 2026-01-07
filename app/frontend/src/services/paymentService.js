/**
 * Service de paiement - Module 4
 *
 * Gère les appels API pour les paiements Stripe via l'API Gateway
 */

import api from "./api";

const PAYMENT_ENDPOINTS = {
  CONFIG: "/api/payments/config",
  CREATE_INTENT: "/api/payments/create-intent",
  MY_PAYMENTS: "/api/payments/user/me",
  GET_PAYMENT: "/api/payments",
  BOOKING_PAYMENTS: "/api/payments/booking",
};

export const paymentService = {
  /**
   * Récupère la configuration Stripe (clé publique)
   * @returns {Promise<Object>} { publishableKey }
   */
  async getConfig() {
    const response = await api.get(PAYMENT_ENDPOINTS.CONFIG);
    return response.data.data;
  },

  /**
   * Crée un PaymentIntent pour une réservation
   * @param {Object} params - { bookingId, amount, currency }
   * @returns {Promise<Object>} { clientSecret, paymentIntentId, payment }
   */
  async createPaymentIntent({ bookingId, amount, currency = "eur" }) {
    const response = await api.post(PAYMENT_ENDPOINTS.CREATE_INTENT, {
      bookingId,
      amount,
      currency,
    });
    return response.data.data;
  },

  /**
   * Récupère les paiements de l'utilisateur connecté
   * @param {Object} params - { page, limit }
   * @returns {Promise<Object>} { payments, total, page, totalPages }
   */
  async getMyPayments({ page = 1, limit = 10 } = {}) {
    const response = await api.get(PAYMENT_ENDPOINTS.MY_PAYMENTS, {
      params: { page, limit },
    });
    return response.data.data;
  },

  /**
   * Récupère le statut d'un paiement
   * @param {string} paymentId
   * @returns {Promise<Object>} Payment details
   */
  async getPaymentStatus(paymentId) {
    const response = await api.get(
      `${PAYMENT_ENDPOINTS.GET_PAYMENT}/${paymentId}`
    );
    return response.data.data;
  },

  /**
   * Récupère les paiements d'une réservation
   * @param {string} bookingId
   * @returns {Promise<Array>} Payments array
   */
  async getBookingPayments(bookingId) {
    const response = await api.get(
      `${PAYMENT_ENDPOINTS.BOOKING_PAYMENTS}/${bookingId}`
    );
    return response.data.data;
  },
};

export default paymentService;
