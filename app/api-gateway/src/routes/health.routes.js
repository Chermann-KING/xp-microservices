/**
 * @fileoverview Routes de santé et monitoring de l'API Gateway
 */

import { Router } from "express";
import axios from "axios";
import { servicesConfig } from "../config/services.js";

const router = Router();

/**
 * Vérifie la santé d'un service
 * @param {string} name - Nom du service
 * @param {Object} config - Configuration du service
 * @returns {Promise<Object>}
 */
async function checkServiceHealth(name, config) {
  try {
    const response = await axios.get(`${config.url}${config.healthEndpoint}`, {
      timeout: 3000,
    });
    return {
      name,
      status: "ok",
      url: config.url,
      response: response.data,
    };
  } catch (error) {
    return {
      name,
      status: "error",
      url: config.url,
      error: error.message,
    };
  }
}

/**
 * @route GET /health
 * @desc Health check de l'API Gateway et de tous les services
 * @access Public
 */
router.get("/", async (req, res) => {
  const health = {
    status: "ok",
    service: "api-gateway",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {},
  };

  // Vérifier tous les services en parallèle
  const checks = await Promise.all(
    Object.entries(servicesConfig).map(([name, config]) =>
      checkServiceHealth(name, config)
    )
  );

  // Compiler les résultats
  checks.forEach((check) => {
    health.services[check.name] = {
      status: check.status,
      url: check.url,
      ...(check.error && { error: check.error }),
    };

    if (check.status === "error") {
      health.status = "degraded";
    }
  });

  const statusCode = health.status === "ok" ? 200 : 503;
  res.status(statusCode).json(health);
});

/**
 * @route GET /health/live
 * @desc Liveness probe (Kubernetes)
 * @access Public
 */
router.get("/live", (req, res) => {
  res.json({ status: "alive", service: "api-gateway" });
});

/**
 * @route GET /health/ready
 * @desc Readiness probe - vérifie que les services critiques sont up
 * @access Public
 */
router.get("/ready", async (req, res) => {
  // Vérifier au moins auth et un service métier
  const criticalServices = ["auth", "tours"];

  const checks = await Promise.all(
    criticalServices.map((name) =>
      checkServiceHealth(name, servicesConfig[name])
    )
  );

  const allOk = checks.every((c) => c.status === "ok");

  if (allOk) {
    res.json({ status: "ready" });
  } else {
    res.status(503).json({
      status: "not ready",
      services: checks.reduce((acc, c) => {
        acc[c.name] = c.status;
        return acc;
      }, {}),
    });
  }
});

export default router;
