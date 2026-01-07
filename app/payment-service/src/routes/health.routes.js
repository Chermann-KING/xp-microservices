/**
 * @fileoverview Routes de santé du service
 */

import { Router } from "express";
import { sequelize } from "../config/database.js";
import { stripe } from "../config/stripe.js";

const router = Router();

/**
 * @route GET /health
 * @desc Health check du service
 * @access Public
 */
router.get("/", async (req, res) => {
  const health = {
    status: "ok",
    service: "payment-service",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {},
  };

  // Check database
  try {
    await sequelize.authenticate();
    health.checks.database = { status: "ok" };
  } catch (error) {
    health.status = "degraded";
    health.checks.database = {
      status: "error",
      message: error.message,
    };
  }

  // Check Stripe connectivity
  try {
    await stripe.balance.retrieve();
    health.checks.stripe = { status: "ok" };
  } catch (error) {
    health.status = "degraded";
    health.checks.stripe = {
      status: "error",
      message: "Stripe API non accessible",
    };
  }

  const statusCode = health.status === "ok" ? 200 : 503;
  res.status(statusCode).json(health);
});

/**
 * @route GET /health/live
 * @desc Liveness probe (Kubernetes)
 * @access Public
 */
router.get("/live", (req, res) => {
  res.json({ status: "alive" });
});

/**
 * @route GET /health/ready
 * @desc Readiness probe (Kubernetes)
 * @access Public
 */
router.get("/ready", async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ status: "ready" });
  } catch (error) {
    res.status(503).json({
      status: "not ready",
      error: error.message,
    });
  }
});

export default router;
