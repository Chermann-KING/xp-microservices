/**
 * @fileoverview Service d'authentification - logique métier
 */

import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
} from "@booking-tourism-app/auth-middleware";
import { userRepository } from "../repositories/userRepository.js";

class AuthService {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET;
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
    this.accessExpiry = process.env.JWT_ACCESS_EXPIRY || "15m";
    this.refreshExpiry = process.env.JWT_REFRESH_EXPIRY || "7d";
  }

  /**
   * Inscription d'un nouvel utilisateur
   * @param {Object} userData - Données d'inscription
   * @returns {Promise<Object>} Utilisateur créé et tokens
   */
  async register(userData) {
    // Vérifier si l'email existe déjà
    const existingUser = await userRepository.findByEmail(userData.email);
    if (existingUser) {
      const error = new Error("Cet email est déjà utilisé");
      error.code = "EMAIL_EXISTS";
      error.statusCode = 409;
      throw error;
    }

    // Créer l'utilisateur
    const user = await userRepository.create({
      ...userData,
      email: userData.email.toLowerCase(),
    });

    // Générer les tokens
    const tokens = this._generateTokens(user);

    // Sauvegarder le refresh token
    await userRepository.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      user: user.toSafeJSON(),
      ...tokens,
    };
  }

  /**
   * Connexion d'un utilisateur
   * @param {string} email
   * @param {string} password
   * @returns {Promise<Object>} Utilisateur et tokens
   */
  async login(email, password) {
    // Trouver l'utilisateur
    const user = await userRepository.findByEmail(email);
    if (!user) {
      const error = new Error("Email ou mot de passe incorrect");
      error.code = "INVALID_CREDENTIALS";
      error.statusCode = 401;
      throw error;
    }

    // Vérifier si le compte est actif
    if (!user.isActive) {
      const error = new Error("Ce compte a été désactivé");
      error.code = "ACCOUNT_DISABLED";
      error.statusCode = 403;
      throw error;
    }

    // Vérifier le mot de passe
    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      const error = new Error("Email ou mot de passe incorrect");
      error.code = "INVALID_CREDENTIALS";
      error.statusCode = 401;
      throw error;
    }

    // Générer les tokens
    const tokens = this._generateTokens(user);

    // Mettre à jour refresh token et last login
    await Promise.all([
      userRepository.updateRefreshToken(user.id, tokens.refreshToken),
      userRepository.updateLastLogin(user.id),
    ]);

    return {
      user: user.toSafeJSON(),
      ...tokens,
    };
  }

  /**
   * Rafraîchit le token d'accès
   * @param {string} refreshToken
   * @returns {Promise<Object>} Nouveaux tokens
   */
  async refreshTokens(refreshToken) {
    // Vérifier le refresh token
    let payload;
    try {
      payload = verifyToken(refreshToken, this.jwtRefreshSecret);
    } catch (error) {
      const err = new Error("Refresh token invalide ou expiré");
      err.code = "INVALID_REFRESH_TOKEN";
      err.statusCode = 401;
      throw err;
    }

    // Trouver l'utilisateur par refresh token
    const user = await userRepository.findByRefreshToken(refreshToken);
    if (!user || user.id !== payload.userId) {
      const error = new Error("Refresh token non reconnu");
      error.code = "REFRESH_TOKEN_NOT_FOUND";
      error.statusCode = 401;
      throw error;
    }

    // Générer de nouveaux tokens
    const tokens = this._generateTokens(user);

    // Mettre à jour le refresh token (rotation)
    await userRepository.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  /**
   * Déconnexion - invalide le refresh token
   * @param {string} userId
   * @returns {Promise<void>}
   */
  async logout(userId) {
    await userRepository.updateRefreshToken(userId, null);
  }

  /**
   * Récupère le profil utilisateur
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async getProfile(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      const error = new Error("Utilisateur non trouvé");
      error.code = "USER_NOT_FOUND";
      error.statusCode = 404;
      throw error;
    }
    return user.toSafeJSON();
  }

  /**
   * Vérifie si un token est valide (pour les autres services)
   * @param {string} token
   * @returns {Promise<Object>} Payload du token si valide
   */
  async verifyAccessToken(token) {
    try {
      const payload = verifyToken(token, this.jwtSecret);

      // Optionnel: vérifier que l'utilisateur existe encore et est actif
      const user = await userRepository.findById(payload.userId);
      if (!user || !user.isActive) {
        const error = new Error("Utilisateur invalide");
        error.code = "INVALID_USER";
        error.statusCode = 401;
        throw error;
      }

      return {
        valid: true,
        payload,
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
      };
    }
  }

  /**
   * Génère une paire de tokens pour un utilisateur
   * @private
   * @param {User} user
   * @returns {Object} accessToken et refreshToken
   */
  _generateTokens(user) {
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(tokenPayload, this.jwtSecret, {
      expiresIn: this.accessExpiry,
    });

    const refreshToken = generateRefreshToken(
      { userId: user.id },
      this.jwtRefreshSecret,
      { expiresIn: this.refreshExpiry }
    );

    return { accessToken, refreshToken };
  }
}

export const authService = new AuthService();
export default authService;
