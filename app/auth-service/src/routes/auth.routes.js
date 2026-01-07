/**
 * @fileoverview Routes d'authentification
 */

import { Router } from "express";
import { createAuthMiddleware } from "@booking-tourism-app/auth-middleware";
import { authController } from "../controllers/authController.js";
import { validate } from "../middleware/validate.js";
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  verifyTokenSchema,
} from "../validators/authValidators.js";

const router = Router();

// Middleware d'authentification
const authenticate = createAuthMiddleware({
  secret: process.env.JWT_SECRET,
});

// ============================================================
// Routes publiques
// ============================================================

/**
 * @route POST /api/auth/register
 * @desc Inscription d'un nouvel utilisateur
 * @access Public
 */
router.post(
  "/register",
  validate(registerSchema),
  authController.register.bind(authController)
);

/**
 * @route POST /api/auth/login
 * @desc Connexion d'un utilisateur
 * @access Public
 */
router.post(
  "/login",
  validate(loginSchema),
  authController.login.bind(authController)
);

/**
 * @route POST /api/auth/refresh
 * @desc Rafraîchit le token d'accès
 * @access Public (avec refresh token)
 */
router.post(
  "/refresh",
  validate(refreshTokenSchema),
  authController.refresh.bind(authController)
);

/**
 * @route POST /api/auth/verify
 * @desc Vérifie si un token est valide (pour inter-service communication)
 * @access Public (généralement appelé par d'autres services)
 */
router.post(
  "/verify",
  validate(verifyTokenSchema),
  authController.verifyToken.bind(authController)
);

// ============================================================
// Routes protégées
// ============================================================

/**
 * @route POST /api/auth/logout
 * @desc Déconnexion de l'utilisateur
 * @access Private
 */
router.post(
  "/logout",
  authenticate,
  authController.logout.bind(authController)
);

/**
 * @route GET /api/auth/profile
 * @desc Récupère le profil de l'utilisateur connecté
 * @access Private
 */
router.get(
  "/profile",
  authenticate,
  authController.getProfile.bind(authController)
);

export default router;
