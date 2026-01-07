# API Gateway

Point d'entrée unique pour tous les microservices de l'application de réservation touristique.

## Fonctionnalités

- ✅ Routage vers les microservices
- ✅ Authentification JWT centralisée
- ✅ Rate limiting (par route)
- ✅ Headers de sécurité (Helmet)
- ✅ CORS configuré
- ✅ Health checks agrégés
- ✅ Logging des requêtes

## Architecture

```
                    ┌─────────────────┐
                    │   Frontend      │
                    │  (localhost:5173)│
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   API Gateway   │
                    │ (localhost:8080) │
                    └────────┬────────┘
                             │
         ┌───────────┬───────┼───────┬───────────┐
         │           │       │       │           │
         ▼           ▼       ▼       ▼           ▼
    ┌─────────┐ ┌─────────┐ ┌─────┐ ┌─────────┐ ┌─────────┐
    │  Auth   │ │  Tours  │ │Book-│ │ Payment │ │Webhooks │
    │ :3005   │ │ :3001   │ │ings │ │  :3004  │ │ (Stripe)│
    └─────────┘ └─────────┘ │:3002│ └─────────┘ └─────────┘
                            └─────┘
```

## Démarrage rapide

### Prérequis

- Node.js 18+
- Tous les microservices démarrés

### Installation

```bash
# Installer les dépendances
npm install

# Copier le fichier d'environnement
cp .env.example .env

# Démarrer le gateway
npm run dev
```

### Variables d'environnement

| Variable                  | Description                        | Défaut                |
| ------------------------- | ---------------------------------- | --------------------- |
| `PORT`                    | Port du gateway                    | 8080                  |
| `JWT_SECRET`              | Clé JWT (identique à auth-service) | -                     |
| `AUTH_SERVICE_URL`        | URL du service auth                | http://localhost:3005 |
| `TOUR_SERVICE_URL`        | URL du service tours               | http://localhost:3001 |
| `BOOKING_SERVICE_URL`     | URL du service bookings            | http://localhost:3002 |
| `PAYMENT_SERVICE_URL`     | URL du service payments            | http://localhost:3004 |
| `CORS_ORIGIN`             | Origines CORS autorisées           | http://localhost:5173 |
| `RATE_LIMIT_WINDOW_MS`    | Fenêtre rate limit (ms)            | 900000 (15 min)       |
| `RATE_LIMIT_MAX_REQUESTS` | Max requêtes par fenêtre           | 100                   |

## Routes disponibles

### Authentication

| Méthode | Endpoint             | Auth | Description        |
| ------- | -------------------- | ---- | ------------------ |
| POST    | `/api/auth/register` | ❌   | Inscription        |
| POST    | `/api/auth/login`    | ❌   | Connexion          |
| POST    | `/api/auth/refresh`  | ❌   | Rafraîchir token   |
| POST    | `/api/auth/logout`   | ✅   | Déconnexion        |
| GET     | `/api/auth/profile`  | ✅   | Profil utilisateur |

### Tours

| Méthode | Endpoint         | Auth     | Description       |
| ------- | ---------------- | -------- | ----------------- |
| GET     | `/api/tours`     | ❌       | Liste des tours   |
| GET     | `/api/tours/:id` | ❌       | Détail d'un tour  |
| POST    | `/api/tours`     | 🔒 Admin | Créer un tour     |
| PUT     | `/api/tours/:id` | 🔒 Admin | Modifier un tour  |
| DELETE  | `/api/tours/:id` | 🔒 Admin | Supprimer un tour |

### Bookings

| Méthode | Endpoint            | Auth | Description          |
| ------- | ------------------- | ---- | -------------------- |
| GET     | `/api/bookings`     | ✅   | Mes réservations     |
| GET     | `/api/bookings/:id` | ✅   | Détail réservation   |
| POST    | `/api/bookings`     | ✅   | Créer réservation    |
| PATCH   | `/api/bookings/:id` | ✅   | Modifier réservation |
| DELETE  | `/api/bookings/:id` | ✅   | Annuler réservation  |

### Payments

| Méthode | Endpoint                      | Auth     | Description     |
| ------- | ----------------------------- | -------- | --------------- |
| GET     | `/api/payments/config`        | ❌       | Config Stripe   |
| POST    | `/api/payments/create-intent` | ✅       | Créer paiement  |
| GET     | `/api/payments/user/me`       | ✅       | Mes paiements   |
| GET     | `/api/payments/:id`           | ✅       | Détail paiement |
| POST    | `/api/payments/:id/refund`    | 🔒 Admin | Remboursement   |

### Health

| Méthode | Endpoint        | Description               |
| ------- | --------------- | ------------------------- |
| GET     | `/health`       | État de tous les services |
| GET     | `/health/live`  | Liveness probe            |
| GET     | `/health/ready` | Readiness probe           |

## Rate Limiting

| Type                  | Fenêtre | Max requêtes |
| --------------------- | ------- | ------------ |
| Par défaut            | 15 min  | 100          |
| Auth (login/register) | 15 min  | 10           |
| Payments              | 1 min   | 20           |

## Headers ajoutés

Le gateway ajoute des headers pour le traçage:

**Requête vers les services:**

- `X-User-Id`: ID de l'utilisateur authentifié
- `X-User-Email`: Email de l'utilisateur
- `X-User-Role`: Rôle de l'utilisateur

**Réponse au client:**

- `X-Served-By`: Nom du service qui a traité la requête

## Exemples

### Via API Gateway (production)

```bash
# Login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Password123"}'

# Liste des tours
curl http://localhost:8080/api/tours

# Créer une réservation (authentifié)
curl -X POST http://localhost:8080/api/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"tourId":"uuid","date":"2024-06-15","participants":2}'
```

### Health check

```bash
curl http://localhost:8080/health
```

```json
{
  "status": "ok",
  "service": "api-gateway",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "services": {
    "auth": { "status": "ok", "url": "http://localhost:3005" },
    "tours": { "status": "ok", "url": "http://localhost:3001" },
    "bookings": { "status": "ok", "url": "http://localhost:3002" },
    "payments": { "status": "ok", "url": "http://localhost:3004" }
  }
}
```

## Structure du projet

```
api-gateway/
├── server.js           # Point d'entrée
├── package.json
├── .env.example
└── src/
    ├── config/
    │   └── services.js     # Configuration des services
    ├── middleware/
    │   ├── auth.js         # Authentification
    │   ├── proxy.js        # Proxy vers services
    │   └── rateLimiter.js  # Rate limiting
    └── routes/
        └── health.routes.js
```
