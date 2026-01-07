/**
 * @fileoverview Repository pour les opérations de paiement
 */

import { Payment } from "../models/index.js";

class PaymentRepository {
  /**
   * Crée un nouveau paiement
   * @param {Object} paymentData
   * @returns {Promise<Payment>}
   */
  async create(paymentData) {
    return Payment.create(paymentData);
  }

  /**
   * Trouve un paiement par ID
   * @param {string} id
   * @returns {Promise<Payment|null>}
   */
  async findById(id) {
    return Payment.findByPk(id);
  }

  /**
   * Trouve un paiement par PaymentIntent Stripe
   * @param {string} paymentIntentId
   * @returns {Promise<Payment|null>}
   */
  async findByPaymentIntentId(paymentIntentId) {
    return Payment.findOne({
      where: { stripePaymentIntentId: paymentIntentId },
    });
  }

  /**
   * Trouve tous les paiements d'une réservation
   * @param {string} bookingId
   * @returns {Promise<Payment[]>}
   */
  async findByBookingId(bookingId) {
    return Payment.findAll({
      where: { bookingId },
      order: [["created_at", "DESC"]],
    });
  }

  /**
   * Trouve tous les paiements d'un utilisateur
   * @param {string} userId
   * @param {Object} options - Options de pagination
   * @returns {Promise<{rows: Payment[], count: number}>}
   */
  async findByUserId(userId, options = {}) {
    const { page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;

    return Payment.findAndCountAll({
      where: { userId },
      limit,
      offset,
      order: [["created_at", "DESC"]],
    });
  }

  /**
   * Met à jour le statut d'un paiement
   * @param {string} id
   * @param {string} status
   * @param {Object} additionalData
   * @returns {Promise<[number]>}
   */
  async updateStatus(id, status, additionalData = {}) {
    return Payment.update({ status, ...additionalData }, { where: { id } });
  }

  /**
   * Met à jour par PaymentIntent ID
   * @param {string} paymentIntentId
   * @param {Object} updateData
   * @returns {Promise<[number]>}
   */
  async updateByPaymentIntentId(paymentIntentId, updateData) {
    return Payment.update(updateData, {
      where: { stripePaymentIntentId: paymentIntentId },
    });
  }
}

export const paymentRepository = new PaymentRepository();
export default paymentRepository;
