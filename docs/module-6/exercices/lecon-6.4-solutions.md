# Solutions - Leçon 6.4 : Implémentation d'un API Gateway

## Exercice 1 : Configuration de Routage API Gateway

### Solution

**1. Ajouter la configuration du service dans `servicesConfig` :**

```javascript
// src/config/services.js

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
  // ✅ Nouveau service Review ajouté
  reviews: {
    url: process.env.REVIEW_SERVICE_URL || "http://localhost:3006",
    routes: ["/api/reviews"],
    healthEndpoint: "/health",
  },
};
```

**2. Définir les routes publiques et protégées :**

```javascript
export const routesConfig = {
  public: [
    { path: "/api/auth/register", methods: ["POST"] },
    { path: "/api/auth/login", methods: ["POST"] },
    { path: "/api/auth/refresh", methods: ["POST"] },
    { path: "/api/tours", methods: ["GET"] },
    { path: "/api/tours/:id", methods: ["GET"] },
    { path: "/api/payments/config", methods: ["GET"] },
    { path: "/webhooks/stripe", methods: ["POST"] },
    { path: "/health", methods: ["GET"] },
    // ✅ Routes publiques pour les avis (lecture)
    { path: "/api/reviews", methods: ["GET"] },
    { path: "/api/reviews/:id", methods: ["GET"] },
    { path: "/api/reviews/tour/:tourId", methods: ["GET"] },
  ],

  adminOnly: [
    { path: "/api/tours", methods: ["POST", "PUT", "DELETE"] },
    { path: "/api/payments/:id/refund", methods: ["POST"] },
    // ✅ Route admin pour supprimer des avis inappropriés
    { path: "/api/reviews/:id", methods: ["DELETE"] },
  ],
};
```

**3. Ajouter le proxy dans `server.js` :**

```javascript
// server.js

// ... autres imports et configurations ...

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

// ✅ Review Service (nouveau)
app.use("/api/reviews", createServiceProxy("reviews"));

// Route 404 mise à jour
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
      "/api/reviews", // ✅ Ajouté
      "/health",
    ],
  });
});
```

**4. Ajouter la variable d'environnement dans `.env.example` :**

```bash
# .env.example

# Service URLs
AUTH_SERVICE_URL=http://localhost:3005
TOUR_SERVICE_URL=http://localhost:3001
BOOKING_SERVICE_URL=http://localhost:3002
PAYMENT_SERVICE_URL=http://localhost:3004
REVIEW_SERVICE_URL=http://localhost:3006  # ✅ Nouveau
```

---

## Exercice 2 : Comprendre les Préoccupations Transversales

### Solution a) Utilisateur non authentifié tentant de poster un avis

**Scénario :** `POST /api/reviews` sans token JWT

```
┌─────────────────────────────────────────────────────────────────┐
│                        Flux de la requête                       │
└─────────────────────────────────────────────────────────────────┘

1. Client → POST /api/reviews (sans Authorization header)
                    │
                    ▼
2. API Gateway reçoit la requête
                    │
                    ▼
3. gatewayAuthMiddleware() vérifie:
   - /api/reviews POST n'est PAS dans les routes publiques
   - Authentification requise
                    │
                    ▼
4. authenticate() échoue (pas de token)
                    │
                    ▼
5. Gateway retourne immédiatement:
   {
     "success": false,
     "error": "Token d'authentification requis",
     "code": "UNAUTHORIZED"
   }
   Status: 401 Unauthorized

❌ Le Review Microservice n'est JAMAIS contacté
```

**Rôle du Gateway :**

- Intercepte la requête avant qu'elle atteigne le Review Service
- Valide la présence et la validité du token JWT
- Rejette la requête avec une erreur 401
- Protège le service backend des requêtes non autorisées

**Microservices impliqués :**

- API Gateway (traitement)
- Review Service (jamais contacté)

---

### Solution b) Tour Catalog Service sous charge élevée

**Scénario :** Le service répond lentement, risque de cascade de défaillances

```
┌─────────────────────────────────────────────────────────────────┐
│                    Pattern Circuit Breaker                      │
└─────────────────────────────────────────────────────────────────┘

État Normal (Circuit FERMÉ):
─────────────────────────────
Client → Gateway → Tour Catalog Service → Réponse (200ms)
                                          ✅ OK

Détection de problème:
─────────────────────────────
Client → Gateway → Tour Catalog Service → Timeout (5000ms)
                                          ⚠️ Échec 1/5

Client → Gateway → Tour Catalog Service → Timeout (5000ms)
                                          ⚠️ Échec 2/5

... 3 autres échecs consécutifs ...

Circuit OUVERT (après 5 échecs):
─────────────────────────────
Client → Gateway → 🔴 Circuit ouvert!
                   │
                   ▼
            Retourne immédiatement:
            {
              "success": false,
              "error": "Service Tour Catalog temporairement indisponible",
              "code": "SERVICE_UNAVAILABLE",
              "retryAfter": 30
            }
            Status: 503

❌ Le Tour Catalog Service n'est plus contacté pendant 30 secondes
```

**Implémentation possible avec opossum :**

```javascript
// src/middleware/circuitBreaker.js

import CircuitBreaker from "opossum";

const circuitOptions = {
  timeout: 3000, // Timeout de 3 secondes
  errorThresholdPercentage: 50, // 50% d'erreurs déclenche l'ouverture
  resetTimeout: 30000, // Réessayer après 30 secondes
};

export function createCircuitBreaker(serviceName, proxyFunction) {
  const breaker = new CircuitBreaker(proxyFunction, circuitOptions);

  breaker.on("open", () => {
    console.warn(`🔴 Circuit OUVERT pour ${serviceName}`);
  });

  breaker.on("halfOpen", () => {
    console.info(`🟡 Circuit SEMI-OUVERT pour ${serviceName}`);
  });

  breaker.on("close", () => {
    console.info(`🟢 Circuit FERMÉ pour ${serviceName}`);
  });

  breaker.fallback(() => ({
    success: false,
    error: `Service ${serviceName} temporairement indisponible`,
    code: "SERVICE_UNAVAILABLE",
  }));

  return breaker;
}
```

**Rôle du Gateway :**

- Surveille les temps de réponse et taux d'erreur du Tour Catalog Service
- Détecte les défaillances répétées
- "Ouvre le circuit" pour arrêter les requêtes vers le service défaillant
- Retourne une réponse de fallback immédiate
- Teste périodiquement si le service est rétabli

**Bénéfices :**

- Évite l'accumulation de requêtes en attente
- Préserve les ressources du gateway et des autres services
- Améliore l'expérience utilisateur (réponse rapide même en cas d'erreur)
- Permet au service surchargé de récupérer

---

### Solution c) Agrégation de données Tour + Note moyenne

**Scénario :** Afficher les détails d'un tour avec sa note moyenne en un seul appel

```
┌─────────────────────────────────────────────────────────────────┐
│                    Endpoint d'agrégation                        │
└─────────────────────────────────────────────────────────────────┘

Client: GET /api/tours/tour-123/details

         ┌────────────────────────────────────────────┐
         │            API Gateway                     │
         │                                            │
         │  1. Reçoit GET /api/tours/tour-123/details │
         │                                            │
         │  2. Fait 2 appels en parallèle:            │
         │     ┌─────────────────────────────────┐    │
         │     │ Promise.all([                   │    │
         │     │   fetch(Tour Catalog),          │    │
         │     │   fetch(Review Service)         │    │
         │     │ ])                              │    │
         │     └─────────────────────────────────┘    │
         │                                            │
         │  3. Combine les réponses                   │
         │                                            │
         │  4. Retourne une seule réponse             │
         └───────────────────┬────────────────────────┘
                             │
           ┌─────────────────┴─────────────────┐
           │                                   │
           ▼                                   ▼
   ┌───────────────┐                   ┌───────────────┐
   │ Tour Catalog  │                   │ Review        │
   │ Service       │                   │ Service       │
   │               │                   │               │
   │ GET /tours/   │                   │ GET /reviews/ │
   │ tour-123      │                   │ tour/tour-123/│
   │               │                   │ stats         │
   └───────┬───────┘                   └───────┬───────┘
           │                                   │
           ▼                                   ▼
   { name: "Safari",                    { averageRating: 4.5,
     price: 199,                          totalReviews: 127,
     duration: "3 days",                  distribution: {...}
     ... }                              }
```

**Implémentation :**

```javascript
// src/routes/aggregation.routes.js

import express from "express";
import axios from "axios";
import { servicesConfig } from "../config/services.js";

const router = express.Router();

/**
 * GET /api/tours/:tourId/details
 * Agrège les informations du tour et ses statistiques d'avis
 */
router.get("/tours/:tourId/details", async (req, res) => {
  const { tourId } = req.params;

  try {
    // Appels parallèles aux deux services
    const [tourResponse, reviewsResponse] = await Promise.allSettled([
      axios.get(`${servicesConfig.tours.url}/api/tours/${tourId}`, {
        timeout: 3000,
      }),
      axios.get(
        `${servicesConfig.reviews.url}/api/reviews/tour/${tourId}/stats`,
        { timeout: 3000 }
      ),
    ]);

    // Gestion des résultats
    const tour =
      tourResponse.status === "fulfilled" ? tourResponse.value.data.data : null;

    const reviewStats =
      reviewsResponse.status === "fulfilled"
        ? reviewsResponse.value.data.data
        : { averageRating: null, totalReviews: 0 };

    // Vérifier que le tour existe
    if (!tour) {
      return res.status(404).json({
        success: false,
        error: "Tour non trouvé",
      });
    }

    // Réponse agrégée
    res.json({
      success: true,
      data: {
        // Données du tour
        id: tour.id,
        name: tour.name,
        description: tour.description,
        price: tour.price,
        duration: tour.duration,
        location: tour.location,
        images: tour.images,
        availableDates: tour.availableDates,

        // Statistiques des avis (agrégées)
        rating: {
          average: reviewStats.averageRating,
          total: reviewStats.totalReviews,
          distribution: reviewStats.distribution || null,
        },
      },
      aggregatedFrom: ["tour-catalog-service", "review-service"],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Erreur agrégation tour details:", error.message);
    res.status(500).json({
      success: false,
      error: "Impossible de récupérer les détails du tour",
    });
  }
});

export default router;
```

**Dans `server.js` :**

```javascript
import aggregationRoutes from "./src/routes/aggregation.routes.js";

// Après l'authentification, avant les proxies
app.use("/api", aggregationRoutes);
```

**Microservices impliqués :**

- API Gateway (orchestration et agrégation)
- Tour Catalog Service (données du tour)
- Review Service (statistiques des avis)

**Rôle du Gateway :**

- Orchestre les appels vers les deux services en parallèle
- Combine les réponses en une structure cohérente
- Gère les erreurs partielles (ex: avis indisponibles mais tour OK)
- Réduit la latence côté client (1 appel au lieu de 2)

---

## Exercice 3 : Impact Côté Client de l'API Gateway

### Solution

**1. Comment l'appel API du frontend change-t-il ?**

```javascript
// ❌ AVANT (sans API Gateway)
// Le frontend doit connaître les URLs de chaque service

const TOUR_SERVICE_URL = "http://tour-catalog-service:3001";
const BOOKING_SERVICE_URL = "http://booking-service:3002";
const AUTH_SERVICE_URL = "http://auth-service:3005";

// Chaque appel utilise une URL différente
async function fetchTours() {
  const response = await fetch(`${TOUR_SERVICE_URL}/api/tours`);
  return response.json();
}

async function createBooking(data) {
  const response = await fetch(`${BOOKING_SERVICE_URL}/api/bookings`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return response.json();
}
```

```javascript
// ✅ APRÈS (avec API Gateway)
// Une seule URL pour tous les services

const API_BASE = "http://localhost:8080"; // Ou en production: https://api.booking-tourism-app.com

// Configuration centralisée
const api = {
  async get(endpoint) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    });
    return response.json();
  },

  async post(endpoint, data) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(data),
    });
    return response.json();
  },
};

// Utilisation simplifiée
async function fetchTours() {
  return api.get("/api/tours");
}

async function createBooking(data) {
  return api.post("/api/bookings", data);
}
```

**2. Bénéfices si l'URL interne change :**

| Aspect                      | Sans Gateway                      | Avec Gateway                          |
| --------------------------- | --------------------------------- | ------------------------------------- |
| **Changement de port**      | Modifier toutes les URLs frontend | Modifier uniquement la config gateway |
| **Renommage de service**    | Redéploiement du frontend         | Changement transparent                |
| **Migration vers cloud**    | Refactoring majeur du frontend    | Mise à jour de la config gateway      |
| **Ajout de load balancing** | Complexe côté client              | Géré par le gateway                   |

**Exemple concret :**

```
AVANT le changement:
Tour Catalog → port 3001

APRÈS le changement:
Tour Catalog → port 4001 (ou migration vers AWS ECS)

Sans Gateway:
─────────────
1. Modifier le frontend
2. Rebuilder l'application React
3. Redéployer le frontend
4. Risque de cache navigateur avec ancienne URL
5. Temps d'indisponibilité potentiel

Avec Gateway:
─────────────
1. Modifier servicesConfig dans le gateway:
   tours: {
     url: "http://tour-catalog-service:4001", // Changé
     ...
   }
2. Redémarrer le gateway
3. Le frontend continue de fonctionner sans modification
```

**3. Avantages en termes de sécurité :**

```
┌─────────────────────────────────────────────────────────────────┐
│                    Avantages Sécurité                           │
└─────────────────────────────────────────────────────────────────┘

a) Surface d'attaque réduite
   ─────────────────────────
   Sans Gateway: 5 services exposés sur Internet
   Avec Gateway: 1 seul point d'entrée exposé

   ┌──────────────────────────────────────────────────────────┐
   │  Internet  →  Firewall  →  API Gateway  →  Services     │
   │                              (8080)         (internes)  │
   └──────────────────────────────────────────────────────────┘

b) Abstraction des services internes
   ─────────────────────────────────
   - Les ports internes (3001, 3002, etc.) ne sont pas exposés
   - L'architecture interne reste secrète pour les attaquants
   - Impossible de scanner les services individuellement

c) Authentification centralisée
   ────────────────────────────
   - Validation JWT à un seul endroit
   - Politique de sécurité cohérente
   - Logs d'audit centralisés

d) Protection DDoS facilitée
   ─────────────────────────
   - Rate limiting global
   - Filtrage au niveau du gateway
   - Intégration avec WAF (Web Application Firewall)

e) Headers de sécurité
   ────────────────────
   - Helmet.js ajouté une seule fois
   - CSP, HSTS, X-Frame-Options appliqués uniformément
   - Pas de duplication dans chaque service
```

**Configuration sécurité du Gateway :**

```javascript
// Tous ces headers sont ajoutés par le gateway
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://js.stripe.com"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://api.stripe.com"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  })
);

// CORS restrictif
app.use(
  cors({
    origin: ["https://tourism-app.com"], // Production uniquement
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
```

---

## Bonus : Test d'Intégration du Gateway

```javascript
// tests/gateway.integration.test.js

import request from "supertest";
import app from "../server.js";

describe("API Gateway Integration Tests", () => {
  describe("Routing", () => {
    it("devrait router /api/tours vers le Tour Catalog Service", async () => {
      const response = await request(app).get("/api/tours");

      expect(response.status).toBe(200);
      expect(response.headers["x-served-by"]).toBe("tours");
    });

    it("devrait retourner 404 pour une route inconnue", async () => {
      const response = await request(app).get("/api/unknown");

      expect(response.status).toBe(404);
      expect(response.body.availableEndpoints).toContain("/api/tours");
    });
  });

  describe("Authentication", () => {
    it("devrait permettre l'accès aux routes publiques sans token", async () => {
      const response = await request(app).get("/api/tours");

      expect(response.status).not.toBe(401);
    });

    it("devrait bloquer les routes protégées sans token", async () => {
      const response = await request(app).get("/api/bookings");

      expect(response.status).toBe(401);
    });

    it("devrait bloquer les routes admin pour un user normal", async () => {
      const userToken = "jwt-token-user-role";

      const response = await request(app)
        .post("/api/tours")
        .set("Authorization", `Bearer ${userToken}`)
        .send({ name: "Test Tour" });

      expect(response.status).toBe(403);
    });
  });

  describe("Rate Limiting", () => {
    it("devrait limiter les tentatives de login", async () => {
      // 10 requêtes en 15 minutes max
      const requests = Array(12)
        .fill()
        .map(() =>
          request(app)
            .post("/api/auth/login")
            .send({ email: "test@test.com", password: "wrong" })
        );

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter((r) => r.status === 429);

      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe("Health Checks", () => {
    it("devrait retourner le statut de tous les services", async () => {
      const response = await request(app).get("/health");

      expect(response.body).toHaveProperty("services");
      expect(response.body.services).toHaveProperty("auth");
      expect(response.body.services).toHaveProperty("tours");
    });
  });
});
```
