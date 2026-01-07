/**
 * @fileoverview Utilitaires JWT pour la génération et la vérification de tokens
 * @module @booking-tourism-app/auth-middleware/jwt
 */

import jwt from "jsonwebtoken";

/**
 * Configuration par défaut pour les tokens JWT
 */
const DEFAULT_CONFIG = {
  accessTokenExpiry: "15m",
  refreshTokenExpiry: "7d",
  algorithm: "HS256",
};

/**
 * Génère un token d'accès JWT
 * @param {Object} payload - Données à encoder dans le token
 * @param {string} secret - Clé secrète pour la signature
 * @param {Object} options - Options de configuration
 * @param {string} [options.expiresIn='15m'] - Durée de validité du token
 * @returns {string} Token JWT signé
 */
export function generateAccessToken(payload, secret, options = {}) {
  const expiresIn = options.expiresIn || DEFAULT_CONFIG.accessTokenExpiry;

  return jwt.sign(payload, secret, {
    expiresIn,
    algorithm: DEFAULT_CONFIG.algorithm,
  });
}

/**
 * Génère un token de rafraîchissement JWT
 * @param {Object} payload - Données à encoder dans le token
 * @param {string} secret - Clé secrète pour la signature
 * @param {Object} options - Options de configuration
 * @param {string} [options.expiresIn='7d'] - Durée de validité du token
 * @returns {string} Token JWT signé
 */
export function generateRefreshToken(payload, secret, options = {}) {
  const expiresIn = options.expiresIn || DEFAULT_CONFIG.refreshTokenExpiry;

  return jwt.sign(payload, secret, {
    expiresIn,
    algorithm: DEFAULT_CONFIG.algorithm,
  });
}

/**
 * Vérifie et décode un token JWT
 * @param {string} token - Token JWT à vérifier
 * @param {string} secret - Clé secrète pour la vérification
 * @returns {Object} Payload décodé du token
 * @throws {jwt.JsonWebTokenError} Si le token est invalide
 * @throws {jwt.TokenExpiredError} Si le token a expiré
 */
export function verifyToken(token, secret) {
  return jwt.verify(token, secret, {
    algorithms: [DEFAULT_CONFIG.algorithm],
  });
}

/**
 * Décode un token sans vérification (utile pour l'inspection)
 * @param {string} token - Token JWT à décoder
 * @returns {Object|null} Payload décodé ou null si invalide
 */
export function decodeToken(token) {
  return jwt.decode(token);
}

/**
 * Extrait le token du header Authorization
 * @param {string} authHeader - Header Authorization complet
 * @returns {string|null} Token extrait ou null
 */
export function extractTokenFromHeader(authHeader) {
  if (!authHeader) return null;

  const parts = authHeader.split(" ");

  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
    return null;
  }

  return parts[1];
}

export default {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  decodeToken,
  extractTokenFromHeader,
};
