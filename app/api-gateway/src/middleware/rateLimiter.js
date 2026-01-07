/**
 * @fileoverview Configuration du rate limiting
 */

import rateLimit from "express-rate-limit";
import { rateLimitConfig } from "../config/services.js";

/**
 * Rate limiter par défaut
 */
export const defaultLimiter = rateLimit({
  windowMs: rateLimitConfig.default.windowMs,
  max: rateLimitConfig.default.max,
  message: {
    success: false,
    error: "Trop de requêtes, veuillez réessayer plus tard",
    code: "RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter pour les routes d'authentification (plus restrictif)
 */
export const authLimiter = rateLimit({
  windowMs: rateLimitConfig.auth.windowMs,
  max: rateLimitConfig.auth.max,
  message: {
    success: false,
    error:
      "Trop de tentatives d'authentification, veuillez réessayer dans 15 minutes",
    code: "AUTH_RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Clé basée sur l'IP et le chemin pour limiter par type d'action
  keyGenerator: (req) => `${req.ip}-${req.path}`,
});

/**
 * Rate limiter pour les paiements
 */
export const paymentLimiter = rateLimit({
  windowMs: rateLimitConfig.payments.windowMs,
  max: rateLimitConfig.payments.max,
  message: {
    success: false,
    error: "Trop de requêtes de paiement, veuillez réessayer dans une minute",
    code: "PAYMENT_RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export default { defaultLimiter, authLimiter, paymentLimiter };
