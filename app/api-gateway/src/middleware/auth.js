/**
 * @fileoverview Middleware d'authentification pour l'API Gateway
 */

import { createAuthMiddleware } from "@booking-tourism-app/auth-middleware";
import { routesConfig } from "../config/services.js";

/**
 * Vérifie si une route correspond à un pattern
 * @param {string} path - Chemin de la requête
 * @param {string} pattern - Pattern à matcher (supporte :param)
 * @returns {boolean}
 */
function matchRoute(path, pattern) {
  // Convertir le pattern en regex
  const regexPattern = pattern
    .replace(/:[^/]+/g, "[^/]+") // :id devient [^/]+
    .replace(/\//g, "\\/");

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(path);
}

/**
 * Vérifie si la route est publique
 * @param {string} path
 * @param {string} method
 * @returns {boolean}
 */
function isPublicRoute(path, method) {
  return routesConfig.public.some((route) => {
    const pathMatches = matchRoute(path, route.path);
    const methodMatches = route.methods.includes(method);
    return pathMatches && methodMatches;
  });
}

/**
 * Vérifie si la route nécessite un rôle admin
 * @param {string} path
 * @param {string} method
 * @returns {boolean}
 */
function isAdminRoute(path, method) {
  return routesConfig.adminOnly.some((route) => {
    const pathMatches = matchRoute(path, route.path);
    const methodMatches = route.methods.includes(method);
    return pathMatches && methodMatches;
  });
}

/**
 * Middleware d'authentification conditionnel
 * - Routes publiques: pas d'auth requise
 * - Routes admin: auth + rôle admin requis
 * - Autres routes: auth requise
 */
export function gatewayAuthMiddleware() {
  const authenticate = createAuthMiddleware({
    secret: process.env.JWT_SECRET,
  });

  return (req, res, next) => {
    const path = req.path;
    const method = req.method;

    // Routes publiques - pas d'auth
    if (isPublicRoute(path, method)) {
      return next();
    }

    // Authentification requise
    authenticate(req, res, (err) => {
      if (err) return next(err);

      // Vérifier si c'est une route admin
      if (isAdminRoute(path, method)) {
        if (!req.user || req.user.role !== "admin") {
          return res.status(403).json({
            success: false,
            error: "Accès réservé aux administrateurs",
            code: "FORBIDDEN_ADMIN_ONLY",
          });
        }
      }

      next();
    });
  };
}

export default gatewayAuthMiddleware;
