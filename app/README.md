# XP Microservices - Application

Architecture microservices pour une plateforme de réservation touristique avec communication event-driven.

## 📦 Services

| Service                        | Port | Description                                                     |
| ------------------------------ | ---- | --------------------------------------------------------------- |
| **api-gateway**                | 8080 | Point d'entrée unique, routage, authentification, rate limiting |
| **auth-service**               | 3005 | Authentification JWT, gestion des utilisateurs                  |
| **payment-service**            | 3004 | Paiements Stripe, webhooks, remboursements                      |
| **booking-management-service** | 3002 | Gestion des réservations, **Event Producer** (Module 5)         |
| **tour-catalog-service**       | 3001 | Catalogue des tours, **Event Consumer** (Module 5)              |
| **notification-service**       | 3006 | **Notifications multi-canal** (Email, SMS) - Module 5           |
| **websocket-server**           | 8080 | **WebSocket temps réel** - Disponibilités tours (Module 5)      |
| **frontend**                   | 5173 | Application React (Vite)                                        |

### Infrastructure (Module 5)

| Service        | Port(s)     | Description                                         |
| -------------- | ----------- | --------------------------------------------------- |
| **RabbitMQ**   | 5672, 15672 | Message broker (AMQP) + Management UI (guest/guest) |
| **Redis**      | 6379        | Cache et idempotence pour les événements            |
| **PostgreSQL** | 5432        | Bases de données (une par service)                  |

## 🏗️ Architecture Event-Driven (Module 5)

### Diagramme Simplifié

```
Frontend (React) ──HTTP──▶ API Gateway (8080)
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
   Auth Service         Tour Catalog          Booking Service
    (3005)                (3001)                  (3002)
                          [CONSUMER]             [PRODUCER]
                              │                     │
                              │    RabbitMQ         │
                              │  (5672/15672)       │
                              │  tour_booking_      │
                              │     events          │
                              └──────┬──────────────┘
                                     │
                     ┌───────────────┼───────────────┐
                     │               │               │
                     ▼               ▼               ▼
              Notification      WebSocket       Payment
               Service          Server          Service
               (3006)           (8080)          (3004)
              [CONSUMER]       [CONSUMER]

                     │
                     ▼
                  Redis (6379)
              Idempotence Cache
```

### Événements RabbitMQ

Exchange : `tour_booking_events` (type: **topic**)

| Routing Key             | Producer                   | Consumers                      | Description                          |
| ----------------------- | -------------------------- | ------------------------------ | ------------------------------------ |
| `booking.confirmed`     | booking-management-service | tour-catalog, notification     | Réservation confirmée                |
| `booking.cancelled`     | booking-management-service | tour-catalog, notification     | Réservation annulée                  |
| `booking.completed`     | booking-management-service | notification                   | Réservation terminée                 |
| `payment.succeeded`     | payment-service            | notification                   | Paiement réussi                      |
| `payment.failed`        | payment-service            | notification                   | Paiement échoué                      |
| `tour.availability.low` | tour-catalog-service       | notification, websocket-server | Disponibilité faible (seuil atteint) |

### Flux Event-Driven

```
1. Client crée réservation → POST /api/bookings
2. booking-management-service confirme → Publish "booking.confirmed" to RabbitMQ
3. tour-catalog-service consomme → Décrémente places (optimistic locking)
4. notification-service consomme → Envoie email confirmation
5. Si places < 20% max → tour-catalog publie "tour.availability.low"
6. websocket-server consomme → Broadcast temps réel aux clients WebSocket
7. Frontend reçoit via WebSocket → Affiche alerte "Plus que X places !"
```

## 🏗️ Architecture HTTP (Legacy - Modules 1-4)

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

- **Node.js** >= 18
- **PostgreSQL** 15+
- **Docker** + **Docker Compose** (Module 5)
- **Compte Stripe** (clés API pour payments)

### Option 1 : Avec Docker Compose (Recommandé - Module 5)

**Module 5 inclut RabbitMQ et Redis via Docker Compose**

```bash
# Démarrer toute l'infrastructure
cd app
docker-compose up -d

# Vérifier les services
docker-compose ps

# Logs en temps réel
docker-compose logs -f

# Accès RabbitMQ Management UI
open http://localhost:15672  # guest/guest
```

Services disponibles après `docker-compose up` :

- ✅ RabbitMQ : `localhost:5672` (AMQP) + `localhost:15672` (Management)
- ✅ Redis : `localhost:6379`
- ✅ Tour Catalog Service : `localhost:3001`
- ✅ Notification Service : `localhost:3006`
- ✅ WebSocket Server : `ws://localhost:8080`

### Option 2 : Installation manuelle (Développement local)

#### 1. Configuration des variables d'environnement

Copiez les fichiers `.env.example` vers `.env` dans chaque service :

```bash
# Pour chaque service
cp auth-service/.env.example auth-service/.env
cp payment-service/.env.example payment-service/.env
cp api-gateway/.env.example api-gateway/.env
cp tour-catalog-service/.env.example tour-catalog-service/.env
cp booking-management-service/.env.example booking-management-service/.env
cp notification-service/.env.example notification-service/.env
cp websocket-server/.env.example websocket-server/.env
```

#### 2. Installation des dépendances

```bash
# Package partagé
cd shared/auth-middleware && npm install && cd ../..

# Services
cd api-gateway && npm install && cd ..
cd auth-service && npm install && cd ..
cd payment-service && npm install && cd ..
cd booking-management-service && npm install && cd ..
cd tour-catalog-service && npm install && cd ..
cd notification-service && npm install && cd ..
cd websocket-server && npm install && cd ..

# Frontend
cd frontend && npm install && cd ..
```

#### 3. Bases de données

Chaque service a sa propre base de données PostgreSQL. Créez-les :

```sql
CREATE DATABASE auth_service_db;
CREATE DATABASE payment_service_db;
CREATE DATABASE booking_service_db;
CREATE DATABASE tour_service_db;
```

#### 4. Démarrage des services

En mode développement, démarrez chaque service dans un terminal séparé :

```bash
# Terminal 1 - RabbitMQ (Docker)
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3.12-management-alpine

# Terminal 2 - Redis (Docker)
docker run -d --name redis -p 6379:6379 redis:7-alpine

# Terminal 3 - API Gateway
cd api-gateway && npm run dev

# Terminal 4 - Auth Service
cd auth-service && npm run dev

# Terminal 5 - Payment Service
cd payment-service && npm run dev

# Terminal 6 - Booking Service
cd booking-management-service && npm run dev

# Terminal 7 - Tour Catalog Service
cd tour-catalog-service && npm run dev

# Terminal 8 - Notification Service (Module 5)
cd notification-service && npm run dev

# Terminal 9 - WebSocket Server (Module 5)
cd websocket-server && npm run dev

# Terminal 10 - Frontend
cd frontend && npm run dev
```

#### 5. Accès

- **Frontend** : http://localhost:5173
- **API Gateway** : http://localhost:8080
- **API Gateway Health** : http://localhost:8080/health
- **RabbitMQ Management** : http://localhost:15672 (guest/guest)
- **WebSocket Server** : ws://localhost:8080
- **WebSocket Health** : http://localhost:8080/health

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
4. payment-service notifie booking-management-service → PATCH /api/bookings/:id/payment-status
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
- [**Module 5 - Architecture Event-Driven et Communication Asynchrone**](../docs/module-5/README.md)
- [**Module 6 - Déploiement, Monitoring et Scalabilité**](../docs/module-6/README.md)
- [Module 5 - Progress Tracking](./MODULE-5-PROGRESS.md)
- [API Gateway README](./api-gateway/README.md)
- [Auth Service README](./auth-service/README.md)
- [Payment Service README](./payment-service/README.md)
- [Notification Service README](./notification-service/README.md)
- [WebSocket Server README](./websocket-server/README.md)
- [**Kubernetes Manifests README**](./k8s/base/README.md)
- [**Kubernetes Deployment Guide**](./k8s/base/DEPLOY.md)

## ⚙️ Configuration Module 5

### Variables d'environnement RabbitMQ

Tous les services event-driven partagent ces variables :

```env
RABBITMQ_URL=amqp://guest:guest@localhost:5672
RABBITMQ_EXCHANGE=tour_booking_events
```

### Variables d'environnement Redis

Pour le service de notification (idempotence) :

```env
REDIS_URL=redis://localhost:6379
```

### Variables d'environnement SMTP

Pour le service de notification (emails) :

```env
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your_mailtrap_user
SMTP_PASS=your_mailtrap_pass
SMTP_FROM_EMAIL=noreply@tourisme-app.com
SMTP_FROM_NAME=Tourisme App
```

## 🐛 Dépannage Module 5

### RabbitMQ ne démarre pas

```bash
# Vérifier si le port 5672 est déjà utilisé
lsof -i :5672  # macOS/Linux
netstat -ano | findstr :5672  # Windows

# Redémarrer RabbitMQ
docker restart rabbitmq

# Vérifier les logs
docker logs rabbitmq
```

### Consumer ne reçoit pas les messages

1. Vérifier que RabbitMQ est démarré : `docker ps | grep rabbitmq`
2. Accéder au Management UI : http://localhost:15672
3. Vérifier l'exchange `tour_booking_events` existe (Exchanges tab)
4. Vérifier les queues sont bindées (Queues tab)
5. Vérifier les connexions actives (Connections tab)

### Duplicates d'emails malgré idempotence

1. Vérifier que Redis est démarré : `docker ps | grep redis`
2. Tester la connexion Redis : `redis-cli -h localhost ping`
3. Vérifier les clés Redis : `redis-cli keys "processed:*"`
4. TTL des clés : 24 heures par défaut

### WebSocket ne se connecte pas

1. Vérifier le serveur : http://localhost:8080/health
2. Vérifier les CORS dans `.env` : `ALLOWED_ORIGINS`
3. Tester avec `wscat` : `wscat -c ws://localhost:8080`
4. Vérifier les logs du serveur pour les erreurs

## 📊 Monitoring Module 5

### RabbitMQ Management UI

Accéder à http://localhost:15672 (guest/guest)

- **Connections** : Voir les services connectés
- **Channels** : Voir les channels actifs
- **Exchanges** : `tour_booking_events` (type: topic)
- **Queues** :
  - `tour_catalog_queue` (booking events)
  - `notification_queue` (all notification events)
  - `websocket_availability_queue` (availability events)
- **Message Rates** : Publier/Consommer en temps réel

### Redis CLI

```bash
# Connexion
redis-cli -h localhost

# Voir toutes les clés d'idempotence
KEYS processed:*

# Voir TTL d'une clé
TTL processed:<event-id>

# Compter les clés
DBSIZE

# Vider le cache (DEV uniquement)
FLUSHDB
```

### Logs des événements

Chaque service log les événements :

```bash
# Booking Service (Producer)
cd booking-management-service && npm run dev
# 📤 Événement publié: booking.confirmed

# Tour Catalog Service (Consumer)
cd tour-catalog-service && npm run dev
# 📩 Message reçu [booking.confirmed]: <bookingId>
# ✅ Places décrémentées: 2 pour tour <tourId>

# Notification Service (Consumer)
cd notification-service && npm run dev
# 📩 Événement reçu: booking.confirmed
# ✅ Email envoyé: booking-confirmation

# WebSocket Server (Consumer + Broadcaster)
cd websocket-server && npm run dev
# 📩 Événement reçu: tour.availability.low
# 📡 Broadcast: 5 succès, 0 échecs
```

## ☸️ Kubernetes & Production (Module 6)

### Déploiement Kubernetes

L'application est prête pour un déploiement production sur Kubernetes :

```bash
# Déployer sur Kubernetes
cd k8s
./deploy.sh

# Ou avec kubectl
kubectl apply -k base/

# Vérifier le déploiement
kubectl get all -n booking-tourism-app

# Port-forward pour tester localement
kubectl port-forward service/api-gateway-service 8080:8080 -n booking-tourism-app
```

**Architecture Kubernetes** :

- 📦 **18 manifests YAML** complets
- 🔐 **ConfigMaps & Secrets** pour configuration
- 💾 **4 StatefulSets PostgreSQL** avec stockage persistant
- 🚀 **7 Deployments** pour les microservices
- 🌐 **Ingress NGINX** avec TLS automatique (Cert-Manager)
- 📊 **HPA** sur 7 services (auto-scaling CPU/Memory)
- 🔄 **Kustomize** pour multi-environnements

### Circuit Breaker & Résilience

L'API Gateway implémente le pattern Circuit Breaker :

```javascript
// Circuit breaker automatique sur chaque service
// États : CLOSED → OPEN → HALF-OPEN
```

**Endpoints de monitoring** :

- `GET /circuit-breaker/status` - État de tous les circuits
- `POST /circuit-breaker/reset/:service` - Réinitialiser un circuit
- `GET /circuit-breaker/health` - Health check des circuits

**Configuration** :

- Timeout : 5 secondes
- Seuil d'erreur : 50%
- Réinitialisation : 30 secondes

### ELK Stack - Logging Centralisé

Stack complète pour la supervision des logs :

```bash
# Démarrer ELK avec Docker Compose
docker-compose up -d elasticsearch logstash kibana

# Accès aux interfaces
# Kibana: http://localhost:5601
# Elasticsearch: http://localhost:9200
```

**Pipeline de logs** :

1. **Microservices** → Logs JSON vers Logstash (TCP/UDP port 5000)
2. **Logstash** → Parse et enrichit les logs
3. **Elasticsearch** → Stocke les logs indexés
4. **Kibana** → Dashboards et visualisations

**Index Elasticsearch** : `microservices-logs-YYYY.MM.dd`

### Auto-Scaling Horizontal

HPA configurés pour adaptation dynamique :

| Service         | Min | Max | CPU Target | Memory Target |
| --------------- | --- | --- | ---------- | ------------- |
| API Gateway     | 2   | 10  | 70%        | 80%           |
| Tour Catalog    | 2   | 8   | 70%        | 80%           |
| Booking Service | 2   | 8   | 70%        | 80%           |
| Payment Service | 2   | 6   | 70%        | 80%           |
| Auth Service    | 2   | 8   | 70%        | 80%           |
| Notification    | 2   | 6   | 70%        | 80%           |
| WebSocket       | 2   | 8   | 70%        | 80%           |

```bash
# Vérifier les HPAs
kubectl get hpa -n booking-tourism-app

# Forcer un scale manuel
kubectl scale deployment tour-catalog-deployment --replicas=5 -n booking-tourism-app
```

## 🎯 Progression Actuelle

✅ **Modules 1-6 complétés** (36/42 leçons = **85.7%**)
⏳ **Module 7 à venir** (6 leçons restantes)

### Détail des modules

- ✅ **Module 1** : Fondamentaux React & Architecture (6 leçons) - Implémenté
- ✅ **Module 2** : Conception & Implémentation Services (6 leçons) - Implémenté
- ✅ **Module 3** : SOLID Principles & State Management (6 leçons) - Implémenté
- ✅ **Module 4** : Paiements & Sécurité (6 leçons) - Implémenté
- ✅ **Module 5** : Architecture Event-Driven (6 leçons) - Implémenté
- ✅ **Module 6** : Déploiement & Monitoring (6 leçons) - Implémenté
  - ✅ Leçon 6.1 : Docker Containerization - Dockerfiles multi-stage
  - ✅ Leçon 6.2 : Orchestration Kubernetes - 18 manifests K8s complets
  - ✅ Leçon 6.3 : Cloud Deployment - Documentation (IaaS/PaaS/CaaS)
  - ✅ Leçon 6.4 : API Gateway avancé - Circuit Breaker + Rate Limiting
  - ✅ Leçon 6.5 : ELK Stack - Elasticsearch, Logstash, Kibana
  - ✅ Leçon 6.6 : Scaling - HPA pour 7 services
- ⏳ **Module 7** : Testing & Sujets Avancés (6 leçons) - À venir

### Module 6 - Checklist d'implémentation

- [x] **Leçon 6.1** : Docker Containerization
  - [x] Dockerfiles multi-stage pour tous les services
  - [x] Health checks dans les conteneurs
  - [x] Optimisation des images (Alpine, layers)
- [x] **Leçon 6.2** : Orchestration Kubernetes
  - [x] Namespace `booking-tourism-app`
  - [x] ConfigMaps et Secrets
  - [x] StatefulSets PostgreSQL (4 bases)
  - [x] Deployments (RabbitMQ, Redis, 7 microservices)
  - [x] Services ClusterIP pour communication interne
  - [x] Ingress NGINX avec TLS/SSL
  - [x] Kustomize pour gestion des environnements
- [x] **Leçon 6.3** : Cloud Deployment
  - [x] Documentation IaaS/PaaS/CaaS
  - [x] Bonnes pratiques sécurité cloud
- [x] **Leçon 6.4** : API Gateway Avancé
  - [x] Circuit Breaker avec opossum
  - [x] Rate Limiting par route
  - [x] Monitoring des circuit breakers
  - [x] Fallback automatique
- [x] **Leçon 6.5** : ELK Stack
  - [x] Elasticsearch pour stockage des logs
  - [x] Logstash pour pipeline de logs
  - [x] Kibana pour visualisation
  - [x] Configuration Docker Compose
- [x] **Leçon 6.6** : Scaling Horizontal & Vertical
  - [x] HPA (Horizontal Pod Autoscaler) pour 7 services
  - [x] Métriques CPU et Memory
  - [x] Politiques de scale-up/scale-down
- [x] Scripts de déploiement
  - [x] `deploy.sh` - Déploiement automatique
  - [x] `cleanup.sh` - Nettoyage complet

## 📝 Licence

MIT
