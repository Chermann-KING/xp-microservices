/**
 * @fileoverview Point d'entrée de l'API Gateway
 * @module api-gateway
 *
 * L'API Gateway est le point d'entrée unique pour tous les clients.
 * Il gère:
 * - Le routing vers les microservices
 * - L'authentification JWT
 * - Le rate limiting
 * - Les headers de sécurité
 */

import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { gatewayAuthMiddleware } from "./src/middleware/auth.js";
import {
  defaultLimiter,
  authLimiter,
  paymentLimiter,
} from "./src/middleware/rateLimiter.js";
import {
  createServiceProxy,
  createWebhookProxy,
} from "./src/middleware/proxy.js";
import healthRoutes from "./src/routes/health.routes.js";

const app = express();
const PORT = process.env.PORT || 8080;

// ============================================================
// Middlewares globaux
// ============================================================

// Sécurité
app.use(
  helmet({
    contentSecurityPolicy: false, // Désactivé pour permettre les intégrations frontend
  })
);

// CORS
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:5173"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

// Logging
app.use(morgan(process.env.LOG_LEVEL || "combined"));

// ============================================================
// Routes de santé (avant auth)
// ============================================================
app.use("/health", healthRoutes);

// ============================================================
// Webhooks (avant express.json et auth - besoin du raw body)
// ============================================================
app.use("/webhooks", createWebhookProxy());

// ============================================================
// Parsing JSON
// ============================================================
app.use(express.json());

// ============================================================
// Rate Limiting
// ============================================================
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/payments", paymentLimiter);
app.use(defaultLimiter);

// ============================================================
// Authentification
// ============================================================
app.use(gatewayAuthMiddleware());

// ============================================================
// Proxy vers les microservices
// ============================================================

// Auth Service
app.use("/api/auth", createServiceProxy("auth"));

// Tour Catalog Service
app.use("/api/tours", createServiceProxy("tours"));

// Booking Management Service
app.use("/api/bookings", createServiceProxy("bookings"));

// Payment Service
app.use("/api/payments", createServiceProxy("payments"));

// ============================================================
// Route 404
// ============================================================
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Route non trouvée",
    path: req.originalUrl,
    availableEndpoints: [
      "/api/auth",
      "/api/tours",
      "/api/bookings",
      "/api/payments",
      "/health",
    ],
  });
});

// ============================================================
// Gestion des erreurs globales
// ============================================================
app.use((err, req, res, next) => {
  console.error("Gateway Error:", err);

  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Erreur interne du gateway",
    code: err.code || "GATEWAY_ERROR",
  });
});

// ============================================================
// Démarrage
// ============================================================
app.listen(PORT, () => {
  console.log(`\n🚀 API Gateway démarré sur le port ${PORT}`);
  console.log(`\n📍 Endpoints:`);
  console.log(`   - Health:    http://localhost:${PORT}/health`);
  console.log(`   - Auth:      http://localhost:${PORT}/api/auth`);
  console.log(`   - Tours:     http://localhost:${PORT}/api/tours`);
  console.log(`   - Bookings:  http://localhost:${PORT}/api/bookings`);
  console.log(`   - Payments:  http://localhost:${PORT}/api/payments`);
  console.log(`\n📡 Services backend:`);
  console.log(
    `   - Auth:      ${process.env.AUTH_SERVICE_URL || "http://localhost:3005"}`
  );
  console.log(
    `   - Tours:     ${process.env.TOUR_SERVICE_URL || "http://localhost:3001"}`
  );
  console.log(
    `   - Bookings:  ${
      process.env.BOOKING_SERVICE_URL || "http://localhost:3002"
    }`
  );
  console.log(
    `   - Payments:  ${
      process.env.PAYMENT_SERVICE_URL || "http://localhost:3004"
    }`
  );
  console.log("\n");
});

export default app;
