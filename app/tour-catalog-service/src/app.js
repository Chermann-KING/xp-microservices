/**
 * Application Express - Tour Catalog Service
 * Leçon 2.6 - Intégration PostgreSQL/Sequelize
 */

import express from "express";
import cors from "cors";

// Routes Sequelize (PostgreSQL)
import tourRoutes from "./routes/tour.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import destinationRoutes from "./routes/destination.routes.js";

import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

// Middleware global
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware pour le développement
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Tour Catalog Service is healthy",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
const API_BASE = `${process.env.API_BASE_PATH}/${process.env.API_VERSION}/tours-catalog`;

app.use(`${API_BASE}/tours`, tourRoutes);
app.use(`${API_BASE}/categories`, categoryRoutes);
app.use(`${API_BASE}/destinations`, destinationRoutes);

// Route 404 pour les endpoints non trouvés
app.use((req, res) => {
  res.status(404).json({
    status: "error",
    error: {
      code: "ENDPOINT_NOT_FOUND",
      message: "The requested endpoint does not exist",
      path: req.path,
    },
  });
});

// Middleware de gestion des erreurs (doit être en dernier)
app.use(errorHandler);

export default app;
