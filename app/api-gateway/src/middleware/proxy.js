/**
 * @fileoverview Configuration du proxy pour les microservices
 */

import { createProxyMiddleware } from "http-proxy-middleware";
import { servicesConfig } from "../config/services.js";

/**
 * Crée un proxy middleware pour un service
 * @param {string} serviceName - Nom du service
 * @param {Object} options - Options additionnelles
 * @returns {Function} Middleware de proxy
 */
export function createServiceProxy(serviceName, options = {}) {
  const service = servicesConfig[serviceName];

  if (!service) {
    throw new Error(`Service inconnu: ${serviceName}`);
  }

  return createProxyMiddleware({
    target: service.url,
    changeOrigin: true,
    // Conserver les headers d'authentification
    onProxyReq: (proxyReq, req) => {
      // Transférer l'info utilisateur si disponible
      if (req.user) {
        proxyReq.setHeader("X-User-Id", req.user.userId);
        proxyReq.setHeader("X-User-Email", req.user.email);
        proxyReq.setHeader("X-User-Role", req.user.role);
      }

      // Log en développement
      if (process.env.NODE_ENV === "development") {
        console.log(`🔀 Proxy: ${req.method} ${req.path} -> ${service.url}`);
      }
    },
    onProxyRes: (proxyRes, req, res) => {
      // Ajouter un header pour identifier le service source
      proxyRes.headers["X-Served-By"] = serviceName;
    },
    onError: (err, req, res) => {
      console.error(`❌ Erreur proxy ${serviceName}:`, err.message);

      res.status(503).json({
        success: false,
        error: `Service ${serviceName} temporairement indisponible`,
        code: "SERVICE_UNAVAILABLE",
      });
    },
    ...options,
  });
}

/**
 * Proxy spécial pour les webhooks (nécessite le raw body)
 */
export function createWebhookProxy() {
  return createProxyMiddleware({
    target: servicesConfig.payments.url,
    changeOrigin: true,
    // Ne pas parser le body pour les webhooks
    onProxyReq: (proxyReq, req) => {
      if (process.env.NODE_ENV === "development") {
        console.log(`🔀 Webhook Proxy: ${req.method} ${req.path}`);
      }
    },
    onError: (err, req, res) => {
      console.error("❌ Erreur proxy webhook:", err.message);
      res.status(503).json({
        success: false,
        error: "Service de paiement temporairement indisponible",
        code: "SERVICE_UNAVAILABLE",
      });
    },
  });
}

export default { createServiceProxy, createWebhookProxy };
