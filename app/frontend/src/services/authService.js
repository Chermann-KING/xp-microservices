/**
 * Service d'authentification - Module 4
 *
 * Gère les appels API pour l'authentification via l'API Gateway
 */

import api from "./api";

const AUTH_ENDPOINTS = {
  LOGIN: "/api/auth/login",
  REGISTER: "/api/auth/register",
  LOGOUT: "/api/auth/logout",
  REFRESH: "/api/auth/refresh",
  PROFILE: "/api/auth/profile",
};

export const authService = {
  /**
   * Connexion d'un utilisateur
   * @param {string} email
   * @param {string} password
   * @returns {Promise<Object>} { user, accessToken, refreshToken }
   */
  async login(email, password) {
    const response = await api.post(AUTH_ENDPOINTS.LOGIN, { email, password });
    const { user, accessToken, refreshToken } = response.data.data;

    // Sauvegarder les tokens
    localStorage.setItem("auth_access_token", accessToken);
    localStorage.setItem("auth_refresh_token", refreshToken);
    localStorage.setItem("auth_user", JSON.stringify(user));

    return { user, accessToken, refreshToken };
  },

  /**
   * Inscription d'un nouvel utilisateur
   * @param {Object} userData - { email, password, firstName, lastName }
   * @returns {Promise<Object>} { user, accessToken, refreshToken }
   */
  async register(userData) {
    const response = await api.post(AUTH_ENDPOINTS.REGISTER, userData);
    const { user, accessToken, refreshToken } = response.data.data;

    // Sauvegarder les tokens
    localStorage.setItem("auth_access_token", accessToken);
    localStorage.setItem("auth_refresh_token", refreshToken);
    localStorage.setItem("auth_user", JSON.stringify(user));

    return { user, accessToken, refreshToken };
  },

  /**
   * Déconnexion
   */
  async logout() {
    try {
      await api.post(AUTH_ENDPOINTS.LOGOUT);
    } finally {
      this.clearTokens();
    }
  },

  /**
   * Rafraîchit les tokens
   * @returns {Promise<Object>} { accessToken, refreshToken }
   */
  async refreshTokens() {
    const refreshToken = localStorage.getItem("auth_refresh_token");

    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await api.post(AUTH_ENDPOINTS.REFRESH, { refreshToken });
    const { accessToken, refreshToken: newRefreshToken } = response.data.data;

    localStorage.setItem("auth_access_token", accessToken);
    localStorage.setItem("auth_refresh_token", newRefreshToken);

    return { accessToken, refreshToken: newRefreshToken };
  },

  /**
   * Récupère le profil de l'utilisateur connecté
   * @returns {Promise<Object>} User profile
   */
  async getProfile() {
    const response = await api.get(AUTH_ENDPOINTS.PROFILE);
    return response.data.data;
  },

  /**
   * Supprime tous les tokens et données utilisateur
   */
  clearTokens() {
    localStorage.removeItem("auth_access_token");
    localStorage.removeItem("auth_refresh_token");
    localStorage.removeItem("auth_user");
  },

  /**
   * Vérifie si l'utilisateur est authentifié
   * @returns {boolean}
   */
  isAuthenticated() {
    return !!localStorage.getItem("auth_access_token");
  },

  /**
   * Récupère le token d'accès actuel
   * @returns {string|null}
   */
  getAccessToken() {
    return localStorage.getItem("auth_access_token");
  },

  /**
   * Récupère l'utilisateur stocké localement
   * @returns {Object|null}
   */
  getStoredUser() {
    const user = localStorage.getItem("auth_user");
    return user ? JSON.parse(user) : null;
  },
};

export default authService;
