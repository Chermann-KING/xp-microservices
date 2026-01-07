/**
 * @fileoverview Routes de paiement
 */

import { Router } from "express";
import {
  createAuthMiddleware,
  requireRoles,
} from "@booking-tourism-app/auth-middleware";
import { paymentController } from "../controllers/paymentController.js";
import { validate } from "../middleware/validate.js";
import {
  createPaymentIntentSchema,
  refundSchema,
  paginationSchema,
} from "../validators/paymentValidators.js";

const router = Router();

// Middleware d'authentification
const authenticate = createAuthMiddleware({
  secret: process.env.JWT_SECRET,
});

// ============================================================
// Routes publiques
// ============================================================

/**
 * @route GET /api/payments/config
 * @desc Récupère la clé publique Stripe
 * @access Public
 */
router.get("/config", paymentController.getConfig.bind(paymentController));

// ============================================================
// Routes protégées
// ============================================================

/**
 * @route POST /api/payments/create-intent
 * @desc Crée un PaymentIntent Stripe
 * @access Private
 */
router.post(
  "/create-intent",
  authenticate,
  validate(createPaymentIntentSchema),
  paymentController.createPaymentIntent.bind(paymentController)
);

/**
 * @route GET /api/payments/user/me
 * @desc Récupère les paiements de l'utilisateur connecté
 * @access Private
 */
router.get(
  "/user/me",
  authenticate,
  validate(paginationSchema, "query"),
  paymentController.getMyPayments.bind(paymentController)
);

/**
 * @route GET /api/payments/:id
 * @desc Récupère le statut d'un paiement
 * @access Private
 */
router.get(
  "/:id",
  authenticate,
  paymentController.getPaymentStatus.bind(paymentController)
);

/**
 * @route GET /api/payments/booking/:bookingId
 * @desc Récupère les paiements d'une réservation
 * @access Private
 */
router.get(
  "/booking/:bookingId",
  authenticate,
  paymentController.getBookingPayments.bind(paymentController)
);

/**
 * @route POST /api/payments/:id/refund
 * @desc Rembourse un paiement (admin uniquement)
 * @access Private (Admin)
 */
router.post(
  "/:id/refund",
  authenticate,
  requireRoles("admin"),
  validate(refundSchema),
  paymentController.refundPayment.bind(paymentController)
);

export default router;
