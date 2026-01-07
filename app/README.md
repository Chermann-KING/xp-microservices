# XP Microservices - Application

Architecture microservices pour une plateforme de réservation de tours guidés.

## 📦 Services

| Service                        | Port | Description                                                     |
| ------------------------------ | ---- | --------------------------------------------------------------- |
| **api-gateway**                | 8080 | Point d'entrée unique, routage, authentification, rate limiting |
| **auth-service**               | 3005 | Authentification JWT, gestion des utilisateurs                  |
| **payment-service**            | 3004 | Paiements Stripe, webhooks, remboursements                      |
| **booking-management-service** | 3002 | Gestion des réservations                                        |
| **tour-catalog-service**       | 3001 | Catalogue des tours                                             |
| **frontend**                   | 5173 | Application React (Vite)                                        |

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                   │
│                           (React + Vite)                                │
│                             Port 5173                                   │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           API GATEWAY                                   │
│                            Port 8080                                    │
│  ┌─────────────┬──────────────┬──────────────┬───────────────────────┐  │
│  │ Rate Limit  │   JWT Auth   │    CORS      │     Health Check      │  │
│  └─────────────┴──────────────┴──────────────┴───────────────────────┘  │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          │                       │                       │
          ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  auth-service   │    │ tour-catalog    │    │    booking      │
│   Port 3005     │    │   Port 3001     │    │   Port 3002     │
│                 │    │                 │    │                 │
│  - Register     │    │  - List Tours   │    │  - Create       │
│  - Login        │    │  - Get Tour     │    │  - Read         │
│  - Refresh      │    │  - Search       │    │  - Update       │
│  - Profile      │    │                 │    │  - Payment Stat │
└────────┬────────┘    └─────────────────┘    └────────┬────────┘
         │                                             │
         │         ┌─────────────────┐                 │
         │         │ payment-service │                 │
         │         │   Port 3004     │◄────────────────┘
         │         │                 │  (Payment Status)
         │         │  - PayIntent    │
         │         │  - Webhooks     │
         │         │  - Refunds      │
         │         └─────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        shared/auth-middleware                           │
│              (Package NPM partagé pour l'authentification)              │
└─────────────────────────────────────────────────────────────────────────┘
```

## 🚀 Démarrage rapide

### Prérequis

- Node.js >= 18
- PostgreSQL 15+
- Compte Stripe (clés API)

### 1. Configuration des variables d'environnement

Copiez les fichiers `.env.example` vers `.env` dans chaque service :

```bash
# Pour chaque service
cp auth-service/.env.example auth-service/.env
cp payment-service/.env.example payment-service/.env
cp api-gateway/.env.example api-gateway/.env
# ... etc
```

### 2. Installation des dépendances

```bash
# Package partagé
cd shared/auth-middleware && npm install && cd ../..

# Services
cd api-gateway && npm install && cd ..
cd auth-service && npm install && cd ..
cd payment-service && npm install && cd ..
cd booking-management-service && npm install && cd ..
cd tour-catalog-service && npm install && cd ..

# Frontend
cd frontend && npm install && cd ..
```

### 3. Bases de données

Chaque service a sa propre base de données PostgreSQL. Créez-les :

```sql
CREATE DATABASE auth_service_db;
CREATE DATABASE payment_service_db;
CREATE DATABASE booking_service_db;
CREATE DATABASE tour_service_db;
```

### 4. Démarrage des services

En mode développement, démarrez chaque service dans un terminal séparé :

```bash
# Terminal 1 - API Gateway
cd api-gateway && npm run dev

# Terminal 2 - Auth Service
cd auth-service && npm run dev

# Terminal 3 - Payment Service
cd payment-service && npm run dev

# Terminal 4 - Booking Service
cd booking-management-service && npm run dev

# Terminal 5 - Tour Service
cd tour-catalog-service && npm run dev

# Terminal 6 - Frontend
cd frontend && npm run dev
```

### 5. Accès

- **Frontend** : http://localhost:5173
- **API Gateway** : http://localhost:8080
- **API Gateway Health** : http://localhost:8080/health

## 🔐 Authentification

L'authentification utilise des JWT (JSON Web Tokens) avec rotation des refresh tokens :

1. **Access Token** : Courte durée (15 min), utilisé pour les requêtes API
2. **Refresh Token** : Longue durée (7 jours), utilisé pour renouveler l'access token

### Flux d'authentification

```
1. POST /api/auth/login     → {accessToken, refreshToken, user}
2. GET  /api/protected      → Header: Authorization: Bearer <accessToken>
3. POST /api/auth/refresh   → {accessToken, refreshToken} (si expiré)
4. POST /api/auth/logout    → Invalide le refresh token
```

## 💳 Paiements

Les paiements sont gérés par Stripe via le `payment-service` :

### Flux de paiement

```
1. POST /api/payments/create-intent  → {clientSecret, paymentIntentId}
2. Frontend confirme avec Stripe.js
3. Stripe envoie webhook → POST /api/webhooks/stripe
4. payment-service notifie booking-service → PATCH /api/bookings/:id/payment-status
```

### Configuration Stripe

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

Pour tester les webhooks en local :

```bash
stripe listen --forward-to localhost:3004/api/webhooks/stripe
```

## 📁 Structure des services

Chaque microservice suit une architecture en couches :

```
service/
├── src/
│   ├── config/         # Configuration (DB, services externes)
│   ├── controllers/    # Contrôleurs HTTP
│   ├── middleware/     # Middlewares Express
│   ├── models/         # Modèles Sequelize
│   ├── repositories/   # Accès aux données
│   ├── routes/         # Définition des routes
│   ├── services/       # Logique métier
│   └── validators/     # Validation des entrées (Joi)
├── server.js           # Point d'entrée
├── package.json
├── .env.example
└── README.md
```

## 🧪 Tests

```bash
# Dans chaque service
npm test

# Tests d'intégration
npm run test:integration
```

## 📊 Monitoring

### Health Checks

Chaque service expose un endpoint `/health` :

```bash
# Service individuel
curl http://localhost:3005/health

# Tous les services via l'API Gateway
curl http://localhost:8080/health
```

### Rate Limiting

L'API Gateway applique des limites de taux :

| Route            | Limite  | Fenêtre |
| ---------------- | ------- | ------- |
| Général          | 100 req | 15 min  |
| /api/auth/\*     | 10 req  | 15 min  |
| /api/payments/\* | 20 req  | 1 min   |

## 🔧 Développement

### Ajouter un nouveau service

1. Créer le dossier du service
2. Configurer package.json avec les dépendances
3. Implémenter les routes et contrôleurs
4. Ajouter au proxy de l'API Gateway (`api-gateway/src/config/services.js`)
5. Mettre à jour ce README

### Conventions

- **ES Modules** : `import/export` (pas de CommonJS)
- **Async/Await** : Pour toutes les opérations asynchrones
- **Validation** : Joi pour la validation des entrées
- **Erreurs** : Format uniforme `{ status, error, message, details? }`

## 📚 Documentation supplémentaire

- [Module 4 - Intégration et Sécurité du Traitement des Paiements](../docs/module-4/README.md)
- [API Gateway README](./api-gateway/README.md)
- [Auth Service README](./auth-service/README.md)
- [Payment Service README](./payment-service/README.md)

## 📝 Licence

MIT
