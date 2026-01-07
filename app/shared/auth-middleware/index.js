/**
 * @fileoverview Point d'entrée du module auth-middleware
 * @module @booking-tourism-app/auth-middleware
 *
 * Package partagé pour l'authentification JWT dans les microservices de l'application de réservation touristique.
 *
 * @example
 * // Utilisation basique
 * import { createAuthMiddleware } from '@booking-tourism-app/auth-middleware';
 *
 * const authenticate = createAuthMiddleware({
 *   secret: process.env.JWT_SECRET
 * });
 *
 * app.use('/api/protected', authenticate, protectedRoutes);
 *
 * @example
 * // Génération de tokens
 * import { generateAccessToken, generateRefreshToken } from '@booking-tourism-app/auth-middleware';
 *
 * const accessToken = generateAccessToken(
 *   { userId: user.id, email: user.email, role: user.role },
 *   process.env.JWT_SECRET
 * );
 */

// JWT utilities
export {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  decodeToken,
  extractTokenFromHeader,
} from "./src/jwt.js";

// Middlewares
export {
  createAuthMiddleware,
  requireRoles,
  requireOwnership,
} from "./src/middleware.js";

// Re-export defaults
import jwt from "./src/jwt.js";
import middleware from "./src/middleware.js";

export { jwt, middleware };

export default {
  ...jwt,
  ...middleware,
};
