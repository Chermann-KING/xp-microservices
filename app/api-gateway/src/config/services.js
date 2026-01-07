/**
 * @fileoverview Configuration des routes et services backend
 */

/**
 * Configuration des services backend
 * Chaque service définit son URL et les routes qu'il gère
 */
export const servicesConfig = {
  auth: {
    url: process.env.AUTH_SERVICE_URL || "http://localhost:3005",
    routes: ["/api/auth"],
    healthEndpoint: "/health",
  },
  tours: {
    url: process.env.TOUR_SERVICE_URL || "http://localhost:3001",
    routes: ["/api/tours"],
    healthEndpoint: "/health",
  },
  bookings: {
    url: process.env.BOOKING_SERVICE_URL || "http://localhost:3002",
    routes: ["/api/bookings"],
    healthEndpoint: "/health",
  },
  payments: {
    url: process.env.PAYMENT_SERVICE_URL || "http://localhost:3004",
    routes: ["/api/payments", "/webhooks"],
    healthEndpoint: "/health",
  },
};

/**
 * Configuration des routes protégées et publiques
 */
export const routesConfig = {
  // Routes qui ne nécessitent pas d'authentification
  public: [
    { path: "/api/auth/register", methods: ["POST"] },
    { path: "/api/auth/login", methods: ["POST"] },
    { path: "/api/auth/refresh", methods: ["POST"] },
    { path: "/api/auth/verify", methods: ["POST"] },
    { path: "/api/tours", methods: ["GET"] },
    { path: "/api/tours/:id", methods: ["GET"] },
    { path: "/api/payments/config", methods: ["GET"] },
    { path: "/webhooks/stripe", methods: ["POST"] },
    { path: "/health", methods: ["GET"] },
  ],

  // Routes nécessitant un rôle admin
  adminOnly: [
    { path: "/api/tours", methods: ["POST", "PUT", "DELETE"] },
    { path: "/api/payments/:id/refund", methods: ["POST"] },
  ],
};

/**
 * Configuration du rate limiting par type de route
 */
export const rateLimitConfig = {
  default: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Plus restrictif pour éviter le brute force
  },
  payments: {
    windowMs: 60 * 1000, // 1 minute
    max: 20,
  },
};

export default { servicesConfig, routesConfig, rateLimitConfig };
