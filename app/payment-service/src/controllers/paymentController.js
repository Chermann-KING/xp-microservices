/**
 * @fileoverview Contrôleur de paiement
 */

import { paymentService } from "../services/paymentService.js";

class PaymentController {
  /**
   * POST /api/payments/create-intent
   * Crée un PaymentIntent Stripe
   */
  async createPaymentIntent(req, res, next) {
    try {
      const { bookingId, amount, currency, metadata } = req.body;
      const userId = req.user.userId;

      const result = await paymentService.createPaymentIntent({
        bookingId,
        userId,
        amount,
        currency,
        metadata,
      });

      res.status(201).json({
        success: true,
        message: "PaymentIntent créé",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/payments/:id
   * Récupère le statut d'un paiement
   */
  async getPaymentStatus(req, res, next) {
    try {
      const { id } = req.params;
      const payment = await paymentService.getPaymentStatus(id);

      res.json({
        success: true,
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/payments/user/me
   * Récupère les paiements de l'utilisateur connecté
   */
  async getMyPayments(req, res, next) {
    try {
      const userId = req.user.userId;
      const { page, limit } = req.query;

      const result = await paymentService.getUserPayments(userId, {
        page,
        limit,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/payments/booking/:bookingId
   * Récupère les paiements d'une réservation
   */
  async getBookingPayments(req, res, next) {
    try {
      const { bookingId } = req.params;
      const payments = await paymentService.getBookingPayments(bookingId);

      res.json({
        success: true,
        data: payments,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/payments/:id/refund
   * Rembourse un paiement
   */
  async refundPayment(req, res, next) {
    try {
      const { id } = req.params;
      const { amount, reason } = req.body;

      const result = await paymentService.refundPayment(id, amount, reason);

      res.json({
        success: true,
        message: "Remboursement effectué",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/payments/config
   * Retourne la clé publique Stripe pour le frontend
   */
  getConfig(req, res) {
    res.json({
      success: true,
      data: {
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      },
    });
  }
}

export const paymentController = new PaymentController();
export default paymentController;
