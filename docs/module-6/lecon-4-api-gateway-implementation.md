# Leçon 6.4 - Implémentation d'un API Gateway pour un Accès Centralisé

**Module 6** : Déploiement, surveillance et évolutivité

---

## Objectifs pédagogiques

- Comprendre le rôle et les bénéfices d'un API Gateway dans une architecture microservices
- Maîtriser les concepts de routage centralisé et d'abstraction des services
- Implémenter les préoccupations transversales (cross-cutting concerns) : authentification, rate limiting, logging
- Configurer un API Gateway avec Express.js et http-proxy-middleware
- Comprendre les patterns de composition d'API et d'agrégation
- Comparer les différentes technologies d'API Gateway disponibles

## Prérequis

- Leçon 6.1 : Containerisation avec Docker
- Leçon 6.2 : Orchestration avec Docker Compose et Kubernetes
- Leçon 6.3 : Déploiement de Microservices sur Plateformes Cloud
- Module 4 : Stratégies d'authentification et JWT
- Connaissance de base d'Express.js et des middlewares

---

## Introduction

L'implémentation d'un API Gateway est cruciale dans une architecture microservices pour fournir un **point d'entrée unique et unifié** permettant aux clients externes d'accéder aux différents microservices sous-jacents. Il agit comme un **reverse proxy**, routant les requêtes vers les services appropriés, gérant les préoccupations transversales et abstrayant la complexité de la structure interne des microservices pour le client.

**Pour notre Application de Réservation Touristique**, l'API Gateway centralise l'accès à :

- 🏨 **Tour Catalog Service** (port 3001) : Gestion du catalogue de tours
- 📅 **Booking Management Service** (port 3002) : Gestion des réservations
- 💳 **Payment Gateway Service** (port 3004) : Traitement des paiements
- 🔐 **Auth Service** (port 3005) : Authentification et autorisation

```
                    ┌──────────────────┐
                    │   React          │
                    │   Frontend       │
                    │  (localhost:5173)│
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │   API Gateway    │
                    │ (localhost:8080) │
                    │                  │
                    │  • Routage       │
                    │  • Auth JWT      │
                    │  • Rate Limit    │
                    │  • CORS          │
                    └────────┬─────────┘
                             │
         ┌───────────┬───────┼───────┬───────────┐
         │           │       │       │           │
         ▼           ▼       ▼       ▼           ▼
    ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
    │  Auth   │ │  Tours  │ │ Bookings│ │ Payment │
    │ :3005   │ │ :3001   │ │  :3002  │ │  :3004  │
    └─────────┘ └─────────┘ └─────────┘ └─────────┘
```

---

## 1. Rôle et Bénéfices d'un API Gateway

Un API Gateway se positionne à la périphérie de l'architecture microservices, servant d'interface entre les clients (comme notre frontend React) et les microservices individuels. Il centralise diverses fonctionnalités qui devraient autrement être implémentées de manière répétitive dans chaque microservice ou gérées par le client.

### 1.1 Routage Centralisé des Requêtes

La fonction principale d'un API Gateway est de **router les requêtes entrantes vers le bon microservice backend**. Au lieu que les clients connaissent les emplacements réseau spécifiques (adresses IP et ports) de chaque microservice, ils communiquent uniquement avec le gateway.

#### Sans API Gateway

Le frontend React devrait connaître :

```javascript
// ❌ Configuration sans API Gateway - Complexe et couplée
const API_ENDPOINTS = {
  tours: "http://tour-catalog-service:3001/api/tours",
  bookings: "http://booking-service:3002/api/bookings",
  payments: "http://payment-service:3004/api/payments",
  auth: "http://auth-service:3005/api/auth",
};

// Le frontend doit gérer plusieurs URLs
async function fetchTours() {
  return fetch(API_ENDPOINTS.tours);
}

async function createBooking(data) {
  return fetch(API_ENDPOINTS.bookings, {
    method: "POST",
    body: JSON.stringify(data),
  });
}
```

#### Avec API Gateway

Le frontend interagit uniquement avec `http://api-gateway:8080` :

```javascript
// ✅ Configuration avec API Gateway - Simple et découplée
const API_BASE = "http://localhost:8080";

// Une seule URL, le gateway route automatiquement
async function fetchTours() {
  return fetch(`${API_BASE}/api/tours`);
}

async function createBooking(data) {
  return fetch(`${API_BASE}/api/bookings`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}
```

**Mapping interne du Gateway :**

| Requête Client         | Service Backend                              |
| ---------------------- | -------------------------------------------- |
| `GET /api/tours`       | `http://tour-catalog-service:3001/api/tours` |
| `POST /api/bookings`   | `http://booking-service:3002/api/bookings`   |
| `POST /api/payments`   | `http://payment-service:3004/api/payments`   |
| `POST /api/auth/login` | `http://auth-service:3005/api/auth/login`    |

Cette abstraction permet de refactorer ou relocaliser les microservices internes sans impacter le code côté client, respectant le **Principe Ouvert/Fermé (OCP)** pour les applications clientes.

### 1.2 Préoccupations Transversales (Cross-Cutting Concerns)

Les API Gateways sont idéaux pour implémenter des **préoccupations transversales**—des fonctionnalités qui s'appliquent à plusieurs services mais ne font pas partie de la logique métier d'un service particulier. Centraliser ces préoccupations au niveau du gateway évite la duplication et assure la cohérence.

#### Authentification et Autorisation

Au lieu que chaque microservice valide les tokens JWT (comme vu au Module 4), l'API Gateway peut effectuer cette vérification **une seule fois** pour chaque requête entrante.

```
┌───────────────────────────────────────────────────────────────┐
│                         API Gateway                           │
│                                                               │
│  1. Requête arrive avec JWT                                   │
│  2. Gateway vérifie le token                                  │
│  3. Si valide → route vers le service                         │
│  4. Si invalide → 401 Unauthorized (service jamais contacté)  │
└───────────────────────────────────────────────────────────────┘
```

**Exemple concret :** Un utilisateur tente d'accéder à `POST /api/tours` (création de tour, réservé aux admins). L'API Gateway intercepte la requête, valide le token JWT, vérifie que le token contient un rôle `admin`. Si ce n'est pas le cas, il retourne une erreur `403 Forbidden` sans même contacter le Tour Catalog Service.

#### Rate Limiting

Pour protéger les microservices backend d'être submergés par trop de requêtes, l'API Gateway peut imposer des **limites de débit** par client, adresse IP ou clé API.

```
┌─────────────────────────────────────────────────────────────────┐
│                    Rate Limiting par Route                      │
├─────────────────┬───────────────┬───────────────────────────────┤
│ Type            │ Fenêtre       │ Max Requêtes                  │
├─────────────────┼───────────────┼───────────────────────────────┤
│ Par défaut      │ 15 minutes    │ 100                           │
│ Authentification│ 15 minutes    │ 10 (prévention brute force)   │
│ Paiements       │ 1 minute      │ 20                            │
└─────────────────┴───────────────┴───────────────────────────────┘
```

**Exemple :** Un bot malveillant essaie de frapper l'endpoint `/api/tours` 1000 fois par seconde. L'API Gateway, configuré pour permettre seulement 100 requêtes par 15 minutes depuis une seule IP, bloque les requêtes subséquentes avec un statut `429 Too Many Requests`.

#### Logging et Monitoring

En étant le point d'entrée unique, l'API Gateway peut centraliser le logging des requêtes, capturant des métadonnées essentielles (origine de la requête, timestamp, latence) avant de transférer les requêtes.

```javascript
// Chaque requête passant par le gateway enregistre :
{
  timestamp: "2024-01-15T10:30:00.000Z",
  method: "POST",
  path: "/api/bookings",
  clientIP: "192.168.1.100",
  userAgent: "Mozilla/5.0...",
  userId: "user-123",
  targetService: "bookings",
  responseTime: 245, // ms
  statusCode: 201
}
```

#### Pattern Circuit Breaker

Pour prévenir les défaillances en cascade, un API Gateway peut implémenter un **circuit breaker**. Si un microservice particulier échoue constamment ou est lent, le gateway peut "ouvrir le circuit" et arrêter d'envoyer des requêtes pendant une période, retournant une réponse de fallback directement au client.

```
┌────────────────────────────────────────────────────────────┐
│                    Circuit Breaker States                  │
│                                                            │
│   CLOSED (Normal)  ──timeout──>  OPEN (Pas de requêtes)    │
│         ▲                              │                   │
│         │                              │ timeout           │
│         │                              ▼                   │
│         └────────success───────  HALF-OPEN (Test)          │
└────────────────────────────────────────────────────────────┘
```

**Exemple :** Le Payment Service devient non-réactif. L'API Gateway détecte cela après quelques timeouts et "déclenche le circuit", retournant immédiatement un message "Service de Paiement Indisponible" aux tentatives de réservation suivantes, plutôt que de faire attendre l'utilisateur pour un timeout du service de paiement réel.

---

## 2. Implémentation avec Express.js et http-proxy-middleware

Pour notre application de tourisme, nous utilisons **Express.js** avec **http-proxy-middleware** pour créer un API Gateway Node.js flexible et performant.

### 2.1 Structure du Projet API Gateway

```
api-gateway/
├── server.js                    # Point d'entrée
├── package.json
├── Dockerfile
├── .env.example
└── src/
    ├── config/
    │   └── services.js          # Configuration des services
    ├── middleware/
    │   ├── auth.js              # Authentification JWT
    │   ├── proxy.js             # Proxy vers services
    │   └── rateLimiter.js       # Rate limiting
    └── routes/
        └── health.routes.js     # Health checks
```

### 2.2 Configuration des Services Backend

Le fichier de configuration centralise les URLs des microservices et définit les règles de routage :

```javascript
// src/config/services.js

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
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
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
```

### 2.3 Middleware de Proxy

Le middleware de proxy utilise `http-proxy-middleware` pour transférer les requêtes vers les services appropriés :

```javascript
// src/middleware/proxy.js

import { createProxyMiddleware } from "http-proxy-middleware";
import { servicesConfig } from "../config/services.js";

/**
 * Crée un proxy middleware pour un service
 * @param {string} serviceName - Nom du service
 * @param {Object} options - Options additionnelles
 * @returns {Function} Middleware de proxy
 */
export function createServiceProxy(serviceName, options = {}) {
  const service = servicesConfig[serviceName];

  if (!service) {
    throw new Error(`Service inconnu: ${serviceName}`);
  }

  return createProxyMiddleware({
    target: service.url,
    changeOrigin: true,

    // Modification des headers avant transfert vers le service
    onProxyReq: (proxyReq, req) => {
      // Transférer l'info utilisateur si disponible (après auth)
      if (req.user) {
        proxyReq.setHeader("X-User-Id", req.user.userId);
        proxyReq.setHeader("X-User-Email", req.user.email);
        proxyReq.setHeader("X-User-Role", req.user.role);
      }

      // Log en développement
      if (process.env.NODE_ENV === "development") {
        console.log(`🔀 Proxy: ${req.method} ${req.path} -> ${service.url}`);
      }
    },

    // Ajout de headers à la réponse
    onProxyRes: (proxyRes, req, res) => {
      // Identifier le service source pour le debugging
      proxyRes.headers["X-Served-By"] = serviceName;
    },

    // Gestion des erreurs de proxy
    onError: (err, req, res) => {
      console.error(`❌ Erreur proxy ${serviceName}:`, err.message);

      res.status(503).json({
        success: false,
        error: `Service ${serviceName} temporairement indisponible`,
        code: "SERVICE_UNAVAILABLE",
      });
    },

    ...options,
  });
}

/**
 * Proxy spécial pour les webhooks (nécessite le raw body)
 */
export function createWebhookProxy() {
  return createProxyMiddleware({
    target: servicesConfig.payments.url,
    changeOrigin: true,
    // Ne pas parser le body pour les webhooks Stripe
    onProxyReq: (proxyReq, req) => {
      if (process.env.NODE_ENV === "development") {
        console.log(`🔀 Webhook Proxy: ${req.method} ${req.path}`);
      }
    },
    onError: (err, req, res) => {
      console.error("❌ Erreur proxy webhook:", err.message);
      res.status(503).json({
        success: false,
        error: "Service de paiement temporairement indisponible",
        code: "SERVICE_UNAVAILABLE",
      });
    },
  });
}
```

### 2.4 Middleware d'Authentification Conditionnel

L'authentification est gérée de manière conditionnelle selon le type de route :

```javascript
// src/middleware/auth.js

import { createAuthMiddleware } from "@booking-tourism-app/auth-middleware";
import { routesConfig } from "../config/services.js";

/**
 * Vérifie si une route correspond à un pattern
 * @param {string} path - Chemin de la requête
 * @param {string} pattern - Pattern à matcher (supporte :param)
 * @returns {boolean}
 */
function matchRoute(path, pattern) {
  const regexPattern = pattern
    .replace(/:[^/]+/g, "[^/]+") // :id devient [^/]+
    .replace(/\//g, "\\/");

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(path);
}

/**
 * Vérifie si la route est publique
 */
function isPublicRoute(path, method) {
  return routesConfig.public.some((route) => {
    const pathMatches = matchRoute(path, route.path);
    const methodMatches = route.methods.includes(method);
    return pathMatches && methodMatches;
  });
}

/**
 * Vérifie si la route nécessite un rôle admin
 */
function isAdminRoute(path, method) {
  return routesConfig.adminOnly.some((route) => {
    const pathMatches = matchRoute(path, route.path);
    const methodMatches = route.methods.includes(method);
    return pathMatches && methodMatches;
  });
}

/**
 * Middleware d'authentification conditionnel
 * - Routes publiques: pas d'auth requise
 * - Routes admin: auth + rôle admin requis
 * - Autres routes: auth requise
 */
export function gatewayAuthMiddleware() {
  const authenticate = createAuthMiddleware({
    secret: process.env.JWT_SECRET,
  });

  return (req, res, next) => {
    const path = req.path;
    const method = req.method;

    // Routes publiques - pas d'auth
    if (isPublicRoute(path, method)) {
      return next();
    }

    // Authentification requise
    authenticate(req, res, (err) => {
      if (err) return next(err);

      // Vérifier si c'est une route admin
      if (isAdminRoute(path, method)) {
        if (!req.user || req.user.role !== "admin") {
          return res.status(403).json({
            success: false,
            error: "Accès interdit - Droits administrateur requis",
            code: "FORBIDDEN",
          });
        }
      }

      next();
    });
  };
}
```

### 2.5 Middleware de Rate Limiting

```javascript
// src/middleware/rateLimiter.js

import rateLimit from "express-rate-limit";
import { rateLimitConfig } from "../config/services.js";

/**
 * Rate limiter par défaut
 */
export const defaultLimiter = rateLimit({
  windowMs: rateLimitConfig.default.windowMs,
  max: rateLimitConfig.default.max,
  message: {
    success: false,
    error: "Trop de requêtes, veuillez réessayer plus tard",
    code: "RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
});

/**
 * Rate limiter pour les routes d'authentification (plus restrictif)
 */
export const authLimiter = rateLimit({
  windowMs: rateLimitConfig.auth.windowMs,
  max: rateLimitConfig.auth.max,
  message: {
    success: false,
    error:
      "Trop de tentatives d'authentification, veuillez réessayer dans 15 minutes",
    code: "AUTH_RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Clé basée sur l'IP et le chemin pour limiter par type d'action
  keyGenerator: (req) => `${req.ip}-${req.path}`,
});

/**
 * Rate limiter pour les paiements
 */
export const paymentLimiter = rateLimit({
  windowMs: rateLimitConfig.payments.windowMs,
  max: rateLimitConfig.payments.max,
  message: {
    success: false,
    error: "Trop de requêtes de paiement, veuillez réessayer dans une minute",
    code: "PAYMENT_RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
```

### 2.6 Point d'Entrée Principal

```javascript
// server.js

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

// Sécurité (headers HTTP)
app.use(
  helmet({
    contentSecurityPolicy: false, // Désactivé pour permettre les intégrations frontend
  })
);

// CORS (Cross-Origin Resource Sharing)
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:5173"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

// Logging des requêtes
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
// Rate Limiting (appliquer AVANT le routing)
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
});
```

---

## 3. Composition et Agrégation d'API

Dans certains cas, une seule requête client peut nécessiter des données de **plusieurs microservices**. Un API Gateway peut gérer cela en effectuant plusieurs requêtes vers différents services backend, agrégeant leurs réponses et composant une réponse unique pour le client.

### 3.1 Scénario : Tableau de Bord Utilisateur

Imaginez une page "Tableau de Bord Utilisateur" dans le frontend React qui doit afficher :

- Les informations du profil utilisateur (du Auth Service)
- La liste des réservations à venir (du Booking Management Service)
- Les tours récemment consultés (d'un hypothétique Recommendation Service)

**Sans agrégation :** Le frontend React doit faire 3 appels API séparés :

```javascript
// ❌ Frontend fait 3 appels parallèles
async function loadDashboard(userId) {
  const [profile, bookings, recommendations] = await Promise.all([
    fetch("/api/auth/profile"),
    fetch("/api/bookings?upcoming=true"),
    fetch("/api/recommendations/tours"),
  ]);

  return {
    profile: await profile.json(),
    bookings: await bookings.json(),
    recommendations: await recommendations.json(),
  };
}
```

**Avec agrégation au niveau Gateway :**

```javascript
// ✅ Endpoint d'agrégation dans le Gateway
// src/routes/aggregation.routes.js

import express from "express";
import axios from "axios";
import { servicesConfig } from "../config/services.js";

const router = express.Router();

/**
 * GET /api/dashboard
 * Agrège les données de plusieurs services pour le tableau de bord
 */
router.get("/dashboard", async (req, res) => {
  try {
    const userId = req.user.userId;

    // Appels parallèles aux différents services
    const [profileRes, bookingsRes, toursRes] = await Promise.all([
      axios.get(`${servicesConfig.auth.url}/api/auth/profile`, {
        headers: { "X-User-Id": userId },
      }),
      axios.get(`${servicesConfig.bookings.url}/api/bookings`, {
        headers: { "X-User-Id": userId },
        params: { upcoming: true, limit: 5 },
      }),
      axios.get(`${servicesConfig.tours.url}/api/tours`, {
        params: { limit: 3, sort: "-createdAt" },
      }),
    ]);

    // Composition de la réponse agrégée
    res.json({
      success: true,
      data: {
        profile: profileRes.data.data,
        upcomingBookings: bookingsRes.data.data,
        featuredTours: toursRes.data.data,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Erreur agrégation dashboard:", error.message);
    res.status(500).json({
      success: false,
      error: "Impossible de charger le tableau de bord",
    });
  }
});

export default router;
```

### 3.2 Avantages de l'Agrégation

| Aspect                 | Sans Agrégation          | Avec Agrégation Gateway |
| ---------------------- | ------------------------ | ----------------------- |
| Nombre d'appels réseau | 3 (client → services)    | 1 (client → gateway)    |
| Latence perçue         | Plus élevée              | Réduite                 |
| Complexité frontend    | Haute                    | Basse                   |
| Gestion d'erreurs      | Dans le frontend         | Centralisée au gateway  |
| Traitement parallèle   | Limité par le navigateur | Optimisé côté serveur   |

---

## 4. Technologies d'API Gateway Alternatives

### 4.1 Nginx / Nginx Plus

**Nginx** est un serveur web open-source populaire qui peut également fonctionner comme un reverse proxy et load balancer très efficace.

```nginx
# Exemple de configuration Nginx pour API Gateway
upstream tour_catalog_service {
    server tour-catalog-service:3001;
}

upstream booking_management_service {
    server booking-service:3002;
}

server {
    listen 80;
    server_name api.booking-tourism-app.com;

    # Route vers Tour Catalog
    location /api/tours {
        proxy_pass http://tour_catalog_service/api/tours;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Route vers Booking Management
    location /api/bookings {
        proxy_pass http://booking_management_service/api/bookings;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**Avantages :**

- ✅ Haute performance, mature, configuration flexible
- ✅ Excellent pour le routage et le load balancing

**Inconvénients :**

- ❌ Logique d'authentification complexe nécessite des scripts Lua
- ❌ Moins flexible pour la logique métier

### 4.2 Kong Gateway

**Kong** est un API Gateway open-source cloud-native construit sur Nginx et LuaJIT, avec une architecture de plugins puissante.

**Avantages :**

- ✅ Riche en fonctionnalités, écosystème de plugins extensif
- ✅ Hautement scalable, bon pour la gestion et sécurisation des APIs

**Inconvénients :**

- ❌ Peut être gourmand en ressources
- ❌ Courbe d'apprentissage pour la configuration et le développement de plugins

### 4.3 API Gateways Cloud Managés

**AWS API Gateway / Azure API Management / Google Cloud API Gateway** offrent des services API Gateway managés qui s'intègrent parfaitement avec leurs écosystèmes cloud respectifs.

**Avantages :**

- ✅ Serverless, hautement scalable, entièrement managé
- ✅ Intégré avec d'autres services cloud (IAM, CloudWatch)
- ✅ Fonctionnalités robustes pour le caching, throttling, portails développeur

**Inconvénients :**

- ❌ Vendor lock-in
- ❌ Le coût peut augmenter avec un trafic élevé
- ❌ Peut avoir des limitations en personnalisation extrême

### 4.4 Comparaison des Solutions

| Critère            | Express.js + Proxy | Nginx      | Kong         | Cloud Managé |
| ------------------ | ------------------ | ---------- | ------------ | ------------ |
| Complexité setup   | Faible             | Moyenne    | Moyenne      | Faible       |
| Flexibilité        | Très haute         | Moyenne    | Haute        | Moyenne      |
| Performance        | Bonne              | Excellente | Excellente   | Excellente   |
| Coût               | Infra uniquement   | Infra      | Infra + Plus | Pay-per-use  |
| Écosystème Node.js | Parfait            | Limité     | Moyen        | Variable     |

---

## 5. Health Checks Agrégés

L'API Gateway centralise également les **vérifications de santé** de tous les services :

```javascript
// src/routes/health.routes.js

import express from "express";
import axios from "axios";
import { servicesConfig } from "../config/services.js";

const router = express.Router();

/**
 * GET /health
 * Vérifie la santé de tous les services backend
 */
router.get("/", async (req, res) => {
  const servicesHealth = {};

  // Vérifier chaque service en parallèle
  await Promise.all(
    Object.entries(servicesConfig).map(async ([name, config]) => {
      try {
        const response = await axios.get(
          `${config.url}${config.healthEndpoint}`,
          { timeout: 5000 }
        );
        servicesHealth[name] = {
          status: "ok",
          url: config.url,
          responseTime: response.headers["x-response-time"],
        };
      } catch (error) {
        servicesHealth[name] = {
          status: "error",
          url: config.url,
          error: error.message,
        };
      }
    })
  );

  // Déterminer le statut global
  const allHealthy = Object.values(servicesHealth).every(
    (s) => s.status === "ok"
  );

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? "ok" : "degraded",
    service: "api-gateway",
    timestamp: new Date().toISOString(),
    services: servicesHealth,
  });
});

/**
 * GET /health/live
 * Liveness probe - le gateway est-il vivant?
 */
router.get("/live", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

/**
 * GET /health/ready
 * Readiness probe - le gateway est-il prêt à recevoir du trafic?
 */
router.get("/ready", async (req, res) => {
  // Vérifier qu'au moins les services essentiels sont disponibles
  const essentialServices = ["auth", "tours"];
  let ready = true;

  for (const service of essentialServices) {
    try {
      await axios.get(
        `${servicesConfig[service].url}${servicesConfig[service].healthEndpoint}`,
        { timeout: 3000 }
      );
    } catch {
      ready = false;
      break;
    }
  }

  res.status(ready ? 200 : 503).json({
    status: ready ? "ready" : "not_ready",
    timestamp: new Date().toISOString(),
  });
});

export default router;
```

---

## 6. Préparation pour le Monitoring et la Scalabilité

L'implémentation d'un API Gateway pose les bases essentielles pour les prochains sujets de ce module.

### 6.1 Logging et Monitoring Centralisés

En canalisant tout le trafic externe via l'API Gateway, nous créons un **point unique** où les requêtes peuvent être interceptées et loggées. Ceci est inestimable pour le logging centralisé avec des outils comme **ELK Stack** (Elasticsearch, Logstash, Kibana), que nous couvrirons dans la prochaine leçon.

```javascript
// Headers ajoutés par le gateway pour le traçage
// Requête vers les services:
{
  "X-User-Id": "user-123",
  "X-User-Email": "user@example.com",
  "X-User-Role": "customer",
  "X-Request-Id": "req-abc-123",      // Pour traçage distribué
  "X-Gateway-Timestamp": "2024-01-15T10:30:00Z"
}

// Réponse au client:
{
  "X-Served-By": "tour-catalog-service",
  "X-Response-Time": "125ms"
}
```

### 6.2 Scaling des Microservices

Un API Gateway inclut souvent des capacités de **load balancing**. Quand nous scalons un microservice horizontalement en ajoutant plus d'instances (par exemple, exécuter trois instances du Tour Catalog Service), l'API Gateway peut distribuer les requêtes entrantes entre ces instances, assurant une utilisation efficace des ressources et une haute disponibilité.

```
                    ┌─────────────────┐
                    │   API Gateway   │
                    │   Load Balancer │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
         ┌─────────┐   ┌─────────┐   ┌─────────┐
         │ Tour    │   │ Tour    │   │ Tour    │
         │ Service │   │ Service │   │ Service │
         │ (1)     │   │ (2)     │   │ (3)     │
         └─────────┘   └─────────┘   └─────────┘
```

---

## Exercices

### Exercice 1 : Configuration de Routage API Gateway

Supposons que vous ayez développé un nouveau **Review Microservice** pour l'application de tourisme qui gère les avis sur les tours. Ce service s'exécute sur `http://review-service:3006`.

**Tâches :**

1. Ajoutez la configuration du service dans `servicesConfig`
2. Définissez les routes publiques et protégées appropriées
3. Ajoutez le proxy dans `server.js`

### Exercice 2 : Comprendre les Préoccupations Transversales

Décrivez comment un API Gateway gérerait les scénarios suivants pour notre application de tourisme, en mentionnant spécifiquement quels microservices sont impliqués et quel serait le rôle du gateway :

a. Un utilisateur tente de poster un nouvel avis (`POST /api/reviews`) mais n'est pas authentifié.

b. Le Tour Catalog Service subit une charge élevée et répond lentement, affectant potentiellement d'autres services si les requêtes continuent de s'accumuler.

c. Le frontend React doit afficher les détails d'un tour, incluant ses informations de base (du Tour Catalog Service) et sa note moyenne (du Review Microservice), le tout en un seul appel API.

### Exercice 3 : Impact Côté Client de l'API Gateway

Avant l'API Gateway, notre frontend React appelait directement `http://tour-catalog-service:3001/api/tours`. Après l'implémentation de l'API Gateway :

1. Comment l'appel API du frontend change-t-il ?
2. Expliquez les bénéfices pour le développement frontend si l'URL interne ou le port du Tour Catalog Microservice change.
3. Quels sont les avantages en termes de sécurité ?

---

## Résumé

Dans cette leçon, nous avons couvert :

| Concept                    | Description                                                      |
| -------------------------- | ---------------------------------------------------------------- |
| **Rôle de l'API Gateway**  | Point d'entrée unique abstrayant la complexité des microservices |
| **Routage centralisé**     | Redirection des requêtes vers les services appropriés            |
| **Cross-cutting concerns** | Authentification, rate limiting, logging, circuit breaker        |
| **Agrégation d'API**       | Composition de réponses depuis plusieurs services                |
| **Technologies**           | Express.js, Nginx, Kong, Cloud Managed Gateways                  |
| **Health checks**          | Surveillance centralisée de l'état des services                  |

---

## Prochaines Étapes

Dans la prochaine leçon, nous exploiterons l'accès centralisé fourni par l'API Gateway pour implémenter le **Logging et Monitoring Centralisés avec la Stack ELK**. Nous apprendrons comment :

- Collecter les logs de nos microservices et de l'API Gateway
- Agréger et indexer les logs avec Elasticsearch
- Visualiser les données avec Kibana
- Créer des dashboards de monitoring et des alertes

---

## Ressources Complémentaires

- [Documentation http-proxy-middleware](https://github.com/chimurai/http-proxy-middleware)
- [Express.js Rate Limiting](https://www.npmjs.com/package/express-rate-limit)
- [Pattern Circuit Breaker](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Kong Gateway Documentation](https://docs.konghq.com/)
- [AWS API Gateway](https://aws.amazon.com/api-gateway/)
- [Microservices Patterns - API Gateway](https://microservices.io/patterns/apigateway.html)

---

## Navigation

- **⬅️ Précédent** : [Leçon 6.3 - Déploiement de Microservices sur Plateformes Cloud](lecon-3-deployment-cloud.md)
- **➡️ Suivant** : [Leçon 6.5 - Logging et Monitoring Centralisés avec la Stack ELK](lecon-5-elk-stack-logging.md)
- **🏠 Sommaire** : [Retour au README](README.md)

---
