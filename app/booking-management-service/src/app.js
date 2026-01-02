import express from "express";
import cors from "cors";
import bookingRoutes from "./routes/bookingRoutes.js";
import availabilityRoutes from "./routes/availabilityRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

// Middleware global
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
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
    message: "Booking Management Service is healthy",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
const API_BASE = `${process.env.API_BASE_PATH}/${process.env.API_VERSION}/booking-management`;

app.use(`${API_BASE}/bookings`, bookingRoutes);
app.use(`${API_BASE}/availability`, availabilityRoutes);

// Route 404
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

// Middleware de gestion des erreurs
app.use(errorHandler);

export default app;
