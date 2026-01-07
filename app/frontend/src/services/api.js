import axios from "axios";

/**
 * Client API configuré pour l'application
 * Module 4 - Service centralisé avec API Gateway
 */

// URL de base - utilise l'API Gateway en production
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Intercepteur pour ajouter le token d'auth
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercepteur pour gérer les erreurs et le refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si erreur 401 et pas déjà retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem("auth_refresh_token");

      if (refreshToken) {
        try {
          // Essayer de rafraîchir le token
          const response = await axios.post(
            `${API_BASE_URL}/api/auth/refresh`,
            {
              refreshToken,
            }
          );

          const { accessToken, refreshToken: newRefreshToken } =
            response.data.data;

          localStorage.setItem("auth_access_token", accessToken);
          localStorage.setItem("auth_refresh_token", newRefreshToken);

          // Réessayer la requête originale
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh échoué - déconnecter
          localStorage.removeItem("auth_access_token");
          localStorage.removeItem("auth_refresh_token");
          localStorage.removeItem("auth_user");
          window.location.href = "/login";
        }
      } else {
        // Pas de refresh token - déconnecter
        localStorage.removeItem("auth_access_token");
        localStorage.removeItem("auth_user");
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
