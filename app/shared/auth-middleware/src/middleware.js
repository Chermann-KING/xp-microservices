/**
 * @fileoverview Middlewares d'authentification Express réutilisables
 * @module @booking-tourism-app/auth-middleware/middleware
 */

import { verifyToken, extractTokenFromHeader } from "./jwt.js";

/**
 * Crée un middleware d'authentification JWT
 * @param {Object} config - Configuration du middleware
 * @param {string} config.secret - Clé secrète JWT
 * @param {boolean} [config.optional=false] - Si true, continue même sans token
 * @returns {Function} Middleware Express
 */
export function createAuthMiddleware(config) {
  const { secret, optional = false } = config;

  if (!secret) {
    throw new Error("JWT secret is required for auth middleware");
  }

  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      if (optional) {
        req.user = null;
        return next();
      }
      return res.status(401).json({
        success: false,
        error: "Token d'authentification requis",
        code: "AUTH_TOKEN_MISSING",
      });
    }

    try {
      const decoded = verifyToken(token, secret);
      req.user = decoded;
      next();
    } catch (error) {
      if (optional) {
        req.user = null;
        return next();
      }

      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          error: "Token expiré",
          code: "AUTH_TOKEN_EXPIRED",
        });
      }

      if (error.name === "JsonWebTokenError") {
        return res.status(401).json({
          success: false,
          error: "Token invalide",
          code: "AUTH_TOKEN_INVALID",
        });
      }

      return res.status(500).json({
        success: false,
        error: "Erreur de vérification du token",
        code: "AUTH_VERIFICATION_ERROR",
      });
    }
  };
}

/**
 * Crée un middleware de vérification de rôles
 * @param {string[]} allowedRoles - Liste des rôles autorisés
 * @returns {Function} Middleware Express
 */
export function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentification requise",
        code: "AUTH_REQUIRED",
      });
    }

    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: "Accès non autorisé pour ce rôle",
        code: "FORBIDDEN_ROLE",
        requiredRoles: allowedRoles,
        currentRole: userRole,
      });
    }

    next();
  };
}

/**
 * Middleware pour vérifier que l'utilisateur accède à ses propres ressources
 * @param {Function} getResourceUserId - Fonction pour extraire l'userId de la ressource
 * @returns {Function} Middleware Express
 */
export function requireOwnership(getResourceUserId) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentification requise",
        code: "AUTH_REQUIRED",
      });
    }

    try {
      const resourceUserId = await getResourceUserId(req);

      // Les admins peuvent accéder à toutes les ressources
      if (req.user.role === "admin") {
        return next();
      }

      if (resourceUserId !== req.user.userId) {
        return res.status(403).json({
          success: false,
          error: "Vous ne pouvez accéder qu'à vos propres ressources",
          code: "FORBIDDEN_OWNERSHIP",
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: "Erreur lors de la vérification de propriété",
        code: "OWNERSHIP_CHECK_ERROR",
      });
    }
  };
}

export default {
  createAuthMiddleware,
  requireRoles,
  requireOwnership,
};
