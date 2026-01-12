/**
 * @fileoverview Proxy résilient avec Circuit Breaker, Retry et Timeout
 * Module 6 - Leçon 6.4 : API Gateway Avancé
 */

import axios from "axios";
import { createCircuitBreaker } from "./circuitBreaker.js";
import { servicesConfig } from "../config/services.js";

/**
 * Crée une fonction de requête avec circuit breaker pour un service
 * @param {string} serviceName - Nom du service
 * @returns {Function} Fonction de requête protégée
 */
function createResilientRequest(serviceName) {
  const service = servicesConfig[serviceName];

  if (!service) {
    throw new Error(`Service inconnu: ${serviceName}`);
  }

  // Fonction qui fait la requête réelle
  const requestFunction = async (req) => {
    const { method, path, body, headers } = req;

    const requestOptions = {
      method: method.toLowerCase(),
      url: `${service.url}${path}`,
      headers: {
        ...headers,
        // Retirer les headers problématiques
        host: undefined,
        connection: undefined,
      },
      timeout: 5000,
    };

    // Ajouter le body pour POST/PUT/PATCH
    if (body && ["post", "put", "patch"].includes(requestOptions.method)) {
      requestOptions.data = body;
    }

    try {
      const response = await axios(requestOptions);
      return response;
    } catch (error) {
      // Re-throw pour que le circuit breaker puisse le détecter
      throw new Error(
        `${serviceName} error: ${error.response?.statusText || error.message}`
      );
    }
  };

  // Créer le circuit breaker
  const breaker = createCircuitBreaker(serviceName, requestFunction, {
    timeout: 5000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000,
  });

  // Définir un fallback
  breaker.fallback((req) => {
    return {
      data: {
        success: false,
        error: `Service ${serviceName} indisponible`,
        code: "SERVICE_UNAVAILABLE",
      },
      status: 503,
      headers: {},
    };
  });

  return breaker;
}

/**
 * Map des circuit breakers par service
 */
const resilientRequests = {};

/**
 * Obtient ou crée un circuit breaker pour un service
 * @param {string} serviceName - Nom du service
 * @returns {CircuitBreaker} Circuit breaker du service
 */
function getResilientRequest(serviceName) {
  if (!resilientRequests[serviceName]) {
    resilientRequests[serviceName] = createResilientRequest(serviceName);
  }
  return resilientRequests[serviceName];
}

/**
 * Middleware Express pour proxy résilient
 * @param {string} serviceName - Nom du service cible
 * @returns {Function} Middleware Express
 */
export function createResilientProxy(serviceName) {
  return async (req, res, next) => {
    try {
      const breaker = getResilientRequest(serviceName);

      // Préparer les données de requête
      const requestData = {
        method: req.method,
        path: req.path,
        body: req.body,
        headers: {
          ...req.headers,
          // Ajouter les headers d'authentification si disponibles
          ...(req.user && {
            "X-User-Id": req.user.userId,
            "X-User-Email": req.user.email,
            "X-User-Role": req.user.role,
          }),
        },
      };

      // Log en développement
      if (process.env.NODE_ENV === "development") {
        console.log(
          `🔀 Resilient Proxy: ${req.method} ${req.path} -> ${serviceName}`
        );
      }

      // Faire la requête via le circuit breaker
      const response = await breaker.fire(requestData);

      // Ajouter header pour identifier le service
      res.set("X-Served-By", serviceName);

      // Envoyer la réponse
      res.status(response.status).json(response.data);
    } catch (error) {
      console.error(`❌ Erreur proxy résilient ${serviceName}:`, error.message);

      // Vérifier si c'est une erreur de circuit ouvert
      if (error.message && error.message.includes("is open")) {
        return res.status(503).json({
          success: false,
          error: `Service ${serviceName} temporairement indisponible`,
          code: "CIRCUIT_OPEN",
          message: "Le circuit est ouvert. Réessayez dans 30 secondes.",
          retry: {
            after: 30,
            unit: "seconds",
          },
        });
      }

      // Autres erreurs
      res.status(503).json({
        success: false,
        error: `Service ${serviceName} indisponible`,
        code: "SERVICE_ERROR",
        message: error.message,
      });
    }
  };
}

export default { createResilientProxy };
