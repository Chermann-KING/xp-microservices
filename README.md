# Application de Réservation Touristique - Fullstack Microservices

Projet d'apprentissage pour maîtriser le développement d'applications web modernes basées sur les microservices avec React, Node.js, Express, PostgreSQL et les principes SOLID.

## Vue d'ensemble

Ce projet est une application complète de réservation touristique construite progressivement à travers **42 leçons** réparties sur **7 modules**. L'objectif est d'apprendre et de pratiquer les concepts modernes de développement web fullstack en construisant une application réelle et fonctionnelle.

## Fonctionnalités de l'application

### Pour les utilisateurs

- Recherche et découverte de visites touristiques (destination, dates, activités, prix)
- Consultation des détails de visites (itinéraires, photos, avis)
- Réservation de visites avec sélection de dates et quantités
- Gestion des réservations (consultation, modification, annulation)
- Authentification et gestion de profil
- Traitement sécurisé des paiements
- Notifications en temps réel

### Pour les tour-opérateurs

- Gestion du catalogue de visites
- Suivi des réservations
- Gestion de la disponibilité

## Architecture technique

### Stack technologique

**Frontend**

- React 18+
- Context API / Redux Toolkit
- React Router
- Axios

**Backend**

- Node.js
- Express.js
- PostgreSQL
- Sequelize / Prisma (ORM)

**Microservices**

- Tour Catalog Service (Port 3001)
- Booking Management Service (Port 3002)
- User Authentication Service (Port 3005)
- Payment Gateway Service (Port 3004)
- Notification Service (Port 3006)
- WebSocket Server (Port 8080)
- API Gateway (Port 8080)

**Infrastructure**

- Docker & Docker Compose
- RabbitMQ 3.12 (Message Broker)
- Redis 7 (Caching & Idempotence)
- PostgreSQL 15+ (Database per service)
- Kubernetes (Orchestration)
- ELK Stack (Monitoring)

### Principes appliqués

- Principes SOLID (SRP, OCP, LSP, ISP, DIP)
- Domain-Driven Design (DDD)
- Architecture event-driven
- API RESTful
- Microservices patterns

## Structure du projet

```
xp-microservices/
├── docs/                           # Documentation et leçons
│   ├── module-1/                   # Fondements (6 leçons) ✅
│   ├── module-2/                   # Microservices (6 leçons) ✅
│   ├── module-3/                   # SOLID & React (6 leçons) ✅
│   ├── module-4/                   # Paiements & Sécurité (6 leçons) ✅
│   ├── module-5/                   # Event-Driven (6 leçons) ✅
│   ├── module-6/                   # Déploiement (6 leçons)
│   └── module-7/                   # Testing (6 leçons)
│
├── app/
│   ├── frontend/                   # 🆕 Application React (Module 3)
│   │   └── src/
│   │       ├── contexts/           # Context API + useReducer
│   │       ├── hooks/              # Custom Hooks
│   │       ├── components/         # Container/Presentational
│   │       └── pages/              # Pages de l'application
│   │
│   ├── backend/                    # API Backend monolithique (Module 1)
│   │   ├── src/
│   │   │   ├── server.js
│   │   │   ├── config/db.js
│   │   │   ├── routes/
│   │   │   └── database/
│   │   └── package.json
│   │
│   ├── shared/                     # 🆕 Shared Libraries (Module 4)
│   │   └── auth-middleware/        # Package JWT Auth
│   │
│   ├── auth-service/               # 🆕 Microservice Auth (Port 3005)
│   │   ├── server.js
│   │   └── src/
│   │
│   ├── payment-service/            # 🆕 Microservice Paiement (Port 3004)
│   │   ├── server.js
│   │   └── src/
│   │
│   ├── api-gateway/                # 🆕 API Gateway (Port 8080)
│   │   ├── server.js
│   │   └── src/
│   │
│   ├── notification-service/       # 🆕 Microservice Notifications (Port 3006)
│   │   ├── server.js
│   │   └── src/
│   │       ├── consumers/          # RabbitMQ Consumers
│   │       ├── channels/           # Email, SMS, Push
│   │       ├── services/           # Idempotence, Templates
│   │       └── templates/          # Email Templates (Pug)
│   │
│   ├── websocket-server/           # 🆕 Serveur WebSocket (Port 8080)
│   │   ├── server.js
│   │   └── README.md
│   │
│   ├── tour-catalog-service/       # Microservice Catalogue (Port 3001)
│   │   ├── server.js
│   │   └── src/
│   │       ├── app.js
│   │       ├── config/
│   │       │   └── container.js    # 🆕 DI Container (Module 3)
│   │       ├── consumers/          # 🆕 RabbitMQ Consumers (Module 5)
│   │       │   └── tourCatalogConsumer.js
│   │       ├── repositories/       # 🆕 Data Access Layer (Module 3)
│   │       │   └── TourRepository.js
│   │       ├── services/           # 🆕 Business Logic (Module 3)
│   │       │   ├── TourService.js
│   │       │   └── rabbitmqProducer.js  # 🆕 Event Publisher (Module 5)
│   │       ├── controllers/        # HTTP uniquement (refactorisé)
│   │       ├── models/             # 🆕 + Optimistic Locking (Module 5)
│   │       ├── routes/
│   │       ├── middleware/
│   │       └── utils/
│   │
│   ├── booking-management-service/ # Microservice Réservations (Port 3002)
│   │   ├── server.js
│   │   └── src/
│   │       ├── app.js
│   │       ├── config/
│   │       │   ├── services.js     # URLs des services
│   │       │   └── container.js    # 🆕 DI Container (Module 3)
│   │       ├── repositories/       # 🆕 Data Access Layer (Module 3)
│   │       │   └── BookingRepository.js
│   │       ├── controllers/        # HTTP uniquement (refactorisé)
│   │       ├── models/
│   │       ├── routes/
│   │       ├── services/
│   │       │   ├── BookingService.js      # 🆕 Business Logic (Module 3)
│   │       │   ├── rabbitmqProducer.js    # 🆕 Event Publisher (Module 5)
│   │       │   ├── tourCatalogService.js  # Communication inter-services
│   │       │   ├── availabilityService.js
│   │       │   └── bookingStateMachine.js
│   │       ├── middleware/
│   │       └── utils/
│   │
│   └── docker-compose.yml          # 🆕 Orchestration infrastructure (Module 5)
│
├── ROADMAP.md                      # Roadmap détaillée des modules
├── CURRICULUM.md                   # Liste complète des 42 leçons
└── README.md                       # Ce fichier
```

## Parcours d'apprentissage

### Module 1 : Fondements du Développement Web Moderne (6 leçons) ✅

- ✅ Introduction à l'étude de cas
- ✅ React Fundamentals
- ✅ Setup environnement fullstack
- ✅ RESTful API Design
- ✅ Introduction aux microservices
- ✅ Monolithe vs Microservices

### Module 2 : Conception et Implémentation des Microservices (6 leçons) ✅

- ✅ Domain-Driven Design (Leçons 2.1-2.2)
- ✅ Tour Catalog Microservice - Design + Implementation (Leçons 2.2-2.3)
- ✅ Booking Management Microservice - Design + Implementation (Leçons 2.4-2.5)
- ✅ Database Design et ORM avec PostgreSQL/Sequelize (Leçon 2.6)

### Module 3 : Principes SOLID et React Avancé (6 leçons) ✅

- ✅ Single Responsibility Principle (SRP) - Leçon 3.1
- ✅ Open/Closed Principle (OCP) - Leçon 3.2
- ✅ Liskov Substitution Principle (LSP) - Leçon 3.3
- ✅ Interface Segregation Principle (ISP) - Leçon 3.4
- ✅ Dependency Inversion Principle (DIP) - Leçon 3.5
- ✅ Advanced React State Management - Leçon 3.6

### Module 4 : Paiements et Sécurité (6 leçons) ✅

- ✅ Payment Gateway Integration
- ✅ Stripe API
- ✅ Webhooks
- ✅ Authentication (JWT, OAuth2)
- ✅ Secure Communication

### Module 5 : Architecture Event-Driven (6 leçons) ✅

- ✅ Event-Driven Microservices - Introduction RabbitMQ
- ✅ Message Queues - Pattern Publisher/Subscriber
- ✅ Notification Microservice - Multi-canal (Email, SMS, Push)
- ✅ Booking Events - Publication événements réservation
- ✅ Concurrency & Idempotency - Optimistic Locking
- ✅ WebSockets temps réel - Diffusion disponibilités

### Module 6 : Déploiement et Monitoring (6 leçons)

- Docker Containerization
- Kubernetes
- Cloud Deployment
- API Gateway
- ELK Stack
- Scaling Strategies

### Module 7 : Testing et Sujets Avancés (6 leçons)

- Unit Testing
- Integration & E2E Testing
- API Documentation (Swagger)
- CI/CD Pipelines
- Serverless & FaaS
- Performance & Caching

## Progression actuelle

**30/42 leçons complétées (71.4%)** - Module 5 terminé ✅

| Module                   | Statut     | Leçons |
| ------------------------ | ---------- | ------ |
| Module 1 - Fondements    | ✅ Terminé | 6/6    |
| Module 2 - Microservices | ✅ Terminé | 6/6    |
| Module 3 - SOLID & React | ✅ Terminé | 6/6    |
| Module 4 - Paiements     | ✅ Terminé | 6/6    |
| Module 5 - Event-Driven  | ✅ Terminé | 6/6    |
| Module 6 - Déploiement   | 🔜 À venir | 0/6    |
| Module 7 - Testing       | 🔜 À venir | 0/6    |

Voir [ROADMAP.md](ROADMAP.md) pour plus de détails sur chaque module.
Voir [CURRICULUM.md](CURRICULUM.md) pour la liste complète des leçons.

## Comment utiliser ce projet

### Prérequis

- Node.js 22+ (LTS recommandé)
- PostgreSQL 16+
- npm 10+
- Git

### Installation du Backend Monolithique (Module 1)

```bash
# Cloner le projet
git clone <url-du-repo>
cd xp-microservices

# Installer les dépendances backend
cd app/backend
npm install

# Configurer l'environnement
cp .env.example .env
# Éditer .env avec vos paramètres PostgreSQL

# Créer les tables
npm run db:migrate

# Insérer les données de test
npm run db:seed

# Lancer le serveur
npm run dev
```

Le serveur démarre sur `http://localhost:3000`

### Installation des Microservices (Modules 2-5)

#### Option 1 : Avec Docker Compose (Recommandé pour Module 5)

```bash
# Démarrer tous les services + infrastructure
cd app
docker-compose up -d

# Vérifier les logs
docker-compose logs -f

# Accès RabbitMQ Management
# → http://localhost:15672 (guest/guest)
```

#### Option 2 : Manuellement

```bash
# Terminal 1 - Tour Catalog Service
cd app/tour-catalog-service
npm install
npm run dev
# → http://localhost:3001

# Terminal 2 - Booking Management Service
cd app/booking-management-service
npm install
npm run dev
# → http://localhost:3002

# Terminal 3 - Notification Service (Module 5)
cd app/notification-service
npm install
npm start
# → http://localhost:3006

# Terminal 4 - WebSocket Server (Module 5)
cd app/websocket-server
npm install
npm start
# → ws://localhost:8080
```

**Endpoints Tour Catalog (Port 3001) :**

- `GET/POST /api/v1/tours-catalog/tours` - Gestion des visites
- `GET/POST /api/v1/tours-catalog/categories` - Catégories
- `GET/POST /api/v1/tours-catalog/destinations` - Destinations
- `GET /health` - État du service

**Endpoints Booking Management (Port 3002) :**

- `GET/POST /api/v1/booking-management/bookings` - Réservations
- `PATCH /api/v1/booking-management/bookings/:id/status` - Changement d'état
- `GET /api/v1/booking-management/availability` - Disponibilités
- `GET /health` - État du service

Voir [app/backend/README.md](app/backend/README.md) pour la documentation API complète.

### Approche d'apprentissage

1. **Suivre les leçons dans l'ordre** - Chaque leçon s'appuie sur les précédentes
2. **Pratiquer activement** - Implémenter le code au fur et à mesure
3. **Faire les exercices** - Chaque leçon inclut des exercices pratiques
4. **Construire progressivement** - L'application évolue leçon par leçon
5. **Respecter les principes** - Appliquer les bonnes pratiques apprises

## Méthodologie

- **Pas de divagation** - Focus sur les concepts vérifiables et éprouvés
- **Technologies à jour** - Utilisation des dernières versions stables
- **Exemples réels** - Inspirés d'applications réelles (Booking.com, Expedia, Netflix, Uber)
- **Approche progressive** - Du simple au complexe
- **Principes SOLID** - Appliqués tout au long du parcours

## Ressources

- Documentation officielle React: https://react.dev/
- Documentation Node.js: https://nodejs.org/
- Documentation Express: https://expressjs.com/
- Documentation PostgreSQL: https://www.postgresql.org/docs/
- Microservices patterns: https://microservices.io/

## Notes importantes

- Les leçons originales en anglais sont traduites en français
- Les technologies sont mises à jour avec les dernières versions
- L'accent est mis sur des pratiques vérifiables et éprouvées
- Aucune hallucination - seulement des informations factuelles

## Prochaines étapes

1. ✅ ~~Module 1 terminé~~
2. ✅ ~~Module 2 terminé~~
   - ~~Domain-Driven Design (Leçons 2.1-2.2)~~
   - ~~Tour Catalog Service (Leçons 2.2-2.3)~~
   - ~~Booking Management Service (Leçons 2.4-2.5)~~
   - ~~PostgreSQL + Sequelize ORM (Leçon 2.6)~~
3. ✅ ~~Module 3 terminé~~
   - ~~Principes SOLID appliqués aux deux microservices~~
   - ~~Architecture Repository → Service → Controller~~
   - ~~Frontend React avec Context API, useReducer, Custom Hooks~~
4. ✅ ~~Module 4 terminé~~
   - ~~Authentication Service (JWT, Refresh Tokens)~~
   - ~~Payment Service (Stripe Integration)~~
   - ~~API Gateway (Rate Limiting, Proxy)~~
   - ~~Securité (Middleware Partagé, Secrets)~~
5. ✅ ~~Module 5 terminé~~
   - ~~RabbitMQ Message Broker avec Exchange Topic~~
   - ~~Pattern Publisher/Subscriber (Booking → Notification)~~
   - ~~Notification Service multi-canal (Email, SMS, Push)~~
   - ~~Events booking.confirmed/cancelled/completed~~
   - ~~Optimistic Locking pour concurrence~~
   - ~~WebSocket Server pour mises à jour temps réel~~
   - ~~Frontend WebSocket + Notifications navigateur~~
6. 🔜 Module 6 : Déploiement et Monitoring

---

**Bon apprentissage !**
