/**
 * @fileoverview Point d'entrée du service de paiement
 * @module payment-service
 */

import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { sequelize } from "./src/config/database.js";
import paymentRoutes from "./src/routes/payment.routes.js";
import webhookRoutes from "./src/routes/webhook.routes.js";
import healthRoutes from "./src/routes/health.routes.js";
import { errorHandler } from "./src/middleware/errorHandler.js";

const app = express();
const PORT = process.env.PORT || 3004;

// ============================================================
// Middlewares de sécurité
// ============================================================
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(morgan("combined"));

// ============================================================
// Routes Webhook (AVANT express.json() - besoin du raw body)
// ============================================================
app.use("/webhooks", webhookRoutes);

// ============================================================
// Parsing JSON (après webhooks)
// ============================================================
app.use(express.json());

// ============================================================
// Routes
// ============================================================
app.use("/health", healthRoutes);
app.use("/api/payments", paymentRoutes);

// ============================================================
// Gestion des erreurs
// ============================================================
app.use(errorHandler);

// Route 404
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Route non trouvée",
    path: req.originalUrl,
  });
});

// ============================================================
// Démarrage du serveur
// ============================================================
async function startServer() {
  try {
    // Test de connexion à la base de données
    await sequelize.authenticate();
    console.log("✅ Connexion à PostgreSQL établie");

    // Synchronisation des modèles (dev only)
    if (process.env.NODE_ENV === "development") {
      await sequelize.sync({ alter: true });
      console.log("✅ Modèles synchronisés");
    }

    app.listen(PORT, () => {
      console.log(`🚀 Payment Service démarré sur le port ${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/health`);
      console.log(`📍 API Payments: http://localhost:${PORT}/api/payments`);
      console.log(`📍 Webhooks: http://localhost:${PORT}/webhooks/stripe`);
    });
  } catch (error) {
    console.error("❌ Erreur de démarrage:", error.message);
    process.exit(1);
  }
}

startServer();

export default app;
