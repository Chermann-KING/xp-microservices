/**
 * @fileoverview Routes pour monitorer et gérer les circuit breakers
 * Module 6 - Leçon 6.4 : API Gateway Avancé
 */

import express from "express";
import {
  getCircuitBreakerStats,
  resetCircuitBreaker,
  resetAllCircuitBreakers,
} from "../middleware/circuitBreaker.js";

const router = express.Router();

/**
 * GET /circuit-breaker/status
 * Récupère l'état de tous les circuit breakers
 */
router.get("/status", (req, res) => {
  try {
    const stats = getCircuitBreakerStats();

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      circuitBreakers: stats,
      summary: {
        total: Object.keys(stats).length,
        open: Object.values(stats).filter((s) => s.state === "OPEN").length,
        halfOpen: Object.values(stats).filter((s) => s.state === "HALF_OPEN").length,
        closed: Object.values(stats).filter((s) => s.state === "CLOSED").length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Erreur lors de la récupération des statistiques",
      message: error.message,
    });
  }
});

/**
 * POST /circuit-breaker/reset/:serviceName
 * Réinitialise un circuit breaker spécifique
 */
router.post("/reset/:serviceName", (req, res) => {
  try {
    const { serviceName } = req.params;

    resetCircuitBreaker(serviceName);

    res.json({
      success: true,
      message: `Circuit breaker ${serviceName} réinitialisé`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Erreur lors de la réinitialisation",
      message: error.message,
    });
  }
});

/**
 * POST /circuit-breaker/reset
 * Réinitialise tous les circuit breakers
 */
router.post("/reset", (req, res) => {
  try {
    resetAllCircuitBreakers();

    res.json({
      success: true,
      message: "Tous les circuit breakers ont été réinitialisés",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Erreur lors de la réinitialisation",
      message: error.message,
    });
  }
});

/**
 * GET /circuit-breaker/health
 * Health check pour les circuit breakers
 */
router.get("/health", (req, res) => {
  try {
    const stats = getCircuitBreakerStats();
    const openCircuits = Object.values(stats).filter((s) => s.state === "OPEN");

    const healthy = openCircuits.length === 0;

    res.status(healthy ? 200 : 503).json({
      success: healthy,
      status: healthy ? "healthy" : "degraded",
      openCircuits: openCircuits.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Erreur lors du health check",
      message: error.message,
    });
  }
});

export default router;
