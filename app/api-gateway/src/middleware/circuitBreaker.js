/**
 * @fileoverview Circuit Breaker pour protéger contre les défaillances de services
 * Module 6 - Leçon 6.4 : API Gateway Avancé
 *
 * Pattern Circuit Breaker:
 * - CLOSED: Toutes les requêtes passent normalement
 * - OPEN: Les requêtes échouent immédiatement (fast-fail) sans appeler le service
 * - HALF_OPEN: Teste si le service est revenu (quelques requêtes passent)
 */

import CircuitBreaker from "opossum";

/**
 * Configuration par défaut du Circuit Breaker
 */
const defaultOptions = {
  timeout: 5000, // Timeout après 5 secondes
  errorThresholdPercentage: 50, // Ouvre le circuit si 50% d'erreurs
  resetTimeout: 30000, // Tente de fermer après 30 secondes
  rollingCountTimeout: 10000, // Fenêtre de 10s pour calculer les stats
  rollingCountBuckets: 10, // 10 buckets de 1s chacun
  name: "default-circuit",
  volumeThreshold: 10, // Min 10 requêtes avant d'ouvrir le circuit
};

/**
 * Map pour stocker les circuit breakers par service
 */
const circuitBreakers = new Map();

/**
 * Crée un circuit breaker pour un service spécifique
 * @param {string} serviceName - Nom du service
 * @param {Function} requestFunction - Fonction qui fait l'appel au service
 * @param {Object} options - Options du circuit breaker
 * @returns {CircuitBreaker} Instance du circuit breaker
 */
export function createCircuitBreaker(serviceName, requestFunction, options = {}) {
  // Si le circuit breaker existe déjà, le retourner
  if (circuitBreakers.has(serviceName)) {
    return circuitBreakers.get(serviceName);
  }

  const circuitOptions = {
    ...defaultOptions,
    ...options,
    name: serviceName,
  };

  const breaker = new CircuitBreaker(requestFunction, circuitOptions);

  // Event listeners pour logging et monitoring
  breaker.on("open", () => {
    console.warn(`⚠️  Circuit OPEN pour ${serviceName} - Fast-fail activé`);
  });

  breaker.on("halfOpen", () => {
    console.log(`🔄 Circuit HALF-OPEN pour ${serviceName} - Test de récupération`);
  });

  breaker.on("close", () => {
    console.log(`✅ Circuit CLOSED pour ${serviceName} - Service rétabli`);
  });

  breaker.on("fallback", (result) => {
    console.log(`🔀 Fallback activé pour ${serviceName}`);
  });

  breaker.on("reject", () => {
    console.warn(`🚫 Requête rejetée pour ${serviceName} - Circuit ouvert`);
  });

  breaker.on("timeout", () => {
    console.warn(`⏱️  Timeout pour ${serviceName}`);
  });

  // Stocker le circuit breaker
  circuitBreakers.set(serviceName, breaker);

  return breaker;
}

/**
 * Récupère le circuit breaker d'un service
 * @param {string} serviceName - Nom du service
 * @returns {CircuitBreaker|null} Circuit breaker ou null
 */
export function getCircuitBreaker(serviceName) {
  return circuitBreakers.get(serviceName) || null;
}

/**
 * Récupère les statistiques de tous les circuit breakers
 * @returns {Object} Statistiques par service
 */
export function getCircuitBreakerStats() {
  const stats = {};

  circuitBreakers.forEach((breaker, serviceName) => {
    const breakerStats = breaker.stats;
    stats[serviceName] = {
      state: breaker.opened ? "OPEN" : breaker.halfOpen ? "HALF_OPEN" : "CLOSED",
      failures: breakerStats.failures,
      successes: breakerStats.successes,
      rejects: breakerStats.rejects,
      timeouts: breakerStats.timeouts,
      fallbacks: breakerStats.fallbacks,
      fires: breakerStats.fires,
      latencyMean: breakerStats.latencyMean,
      percentiles: breakerStats.percentiles,
    };
  });

  return stats;
}

/**
 * Réinitialise un circuit breaker spécifique
 * @param {string} serviceName - Nom du service
 */
export function resetCircuitBreaker(serviceName) {
  const breaker = circuitBreakers.get(serviceName);
  if (breaker) {
    breaker.close();
    console.log(`🔄 Circuit breaker ${serviceName} réinitialisé`);
  }
}

/**
 * Réinitialise tous les circuit breakers
 */
export function resetAllCircuitBreakers() {
  circuitBreakers.forEach((breaker, serviceName) => {
    breaker.close();
  });
  console.log("🔄 Tous les circuit breakers réinitialisés");
}

/**
 * Middleware Express pour appliquer le circuit breaker
 * @param {string} serviceName - Nom du service
 * @param {Object} options - Options du circuit breaker
 * @returns {Function} Middleware Express
 */
export function circuitBreakerMiddleware(serviceName, options = {}) {
  return async (req, res, next) => {
    // Stocker le service name pour utilisation ultérieure
    req.targetService = serviceName;
    req.circuitBreakerOptions = options;
    next();
  };
}

/**
 * Fallback par défaut en cas d'échec du service
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Error} error - Erreur originale
 */
export function defaultFallback(req, res, error) {
  const serviceName = req.targetService || "unknown";

  console.error(`❌ Fallback pour ${serviceName}:`, error.message);

  // Vérifier si le circuit est ouvert
  const breaker = getCircuitBreaker(serviceName);
  const isCircuitOpen = breaker && breaker.opened;

  res.status(503).json({
    success: false,
    error: `Service ${serviceName} temporairement indisponible`,
    code: isCircuitOpen ? "CIRCUIT_OPEN" : "SERVICE_ERROR",
    message: isCircuitOpen
      ? "Le service est en mode protection. Réessayez dans quelques instants."
      : "Une erreur s'est produite lors de la communication avec le service.",
    retry: {
      after: isCircuitOpen ? 30 : 5,
      unit: "seconds",
    },
  });
}

export default {
  createCircuitBreaker,
  getCircuitBreaker,
  getCircuitBreakerStats,
  resetCircuitBreaker,
  resetAllCircuitBreakers,
  circuitBreakerMiddleware,
  defaultFallback,
};
