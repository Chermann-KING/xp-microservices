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

- Tour Catalog Service
- Booking Management Service
- User Authentication Service
- Payment Gateway Service
- Notification Service
- API Gateway

**Infrastructure**

- Docker & Kubernetes
- RabbitMQ / Kafka
- Redis (caching)
- ELK Stack (monitoring)

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
│   ├── module-1/                   # Fondements (6 leçons)
│   └── module-2/                   # Microservices (6 leçons)
│
├── app/
│   ├── frontend/                   # Application React (à venir)
│   │
│   ├── backend/                    # API Backend monolithique (Module 1)
│   │   ├── src/
│   │   │   ├── server.js
│   │   │   ├── config/db.js
│   │   │   ├── routes/
│   │   │   └── database/
│   │   └── package.json
│   │
│   ├── tour-catalog-service/       # 🆕 Microservice Catalogue (Port 3001)
│   │   ├── server.js
│   │   └── src/
│   │       ├── app.js
│   │       ├── controllers/        # tour, category, destination
│   │       ├── models/             # In-memory storage
│   │       ├── routes/
│   │       ├── middleware/
│   │       └── utils/
│   │
│   └── booking-management-service/ # 🆕 Microservice Réservations (Port 3002)
│       ├── server.js
│       └── src/
│           ├── app.js
│           ├── config/services.js  # URLs des services
│           ├── controllers/        # booking, availability
│           ├── models/
│           ├── routes/
│           ├── services/           # Communication inter-services
│           │   ├── tourCatalogService.js  ← Axios
│           │   ├── availabilityService.js
│           │   └── bookingStateMachine.js
│           ├── middleware/
│           └── utils/
│
├── ROADMAP.md                      # Roadmap détaillée des modules
├── CURRICULUM.md                   # Liste complète des 42 leçons
├── MODULE-1-COMPLETE.md            # Résumé Module 1 terminé
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

### Module 3 : Principes SOLID et React Avancé (6 leçons)

- Les 5 principes SOLID (SRP, OCP, LSP, ISP, DIP)
- Advanced React State Management

### Module 4 : Paiements et Sécurité (6 leçons)

- Payment Gateway Integration
- Stripe API
- Webhooks
- Authentication (JWT, OAuth2)
- Secure Communication

### Module 5 : Architecture Event-Driven (6 leçons)

- Event-Driven Microservices
- Message Queues (RabbitMQ, Kafka)
- Saga Pattern
- Notification Microservice
- Concurrency & Idempotency
- WebSockets temps réel

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

**12/42 leçons complétées (28.6%)** - Module 2 terminé ✅

| Module                   | Statut     | Leçons |
| ------------------------ | ---------- | ------ |
| Module 1 - Fondements    | ✅ Terminé | 6/6    |
| Module 2 - Microservices | ✅ Terminé | 6/6    |
| Module 3 - SOLID & React | 🔜 À venir | 0/6    |
| Module 4 - Paiements     | 🔜 À venir | 0/6    |
| Module 5 - Event-Driven  | 🔜 À venir | 0/6    |
| Module 6 - Déploiement   | 🔜 À venir | 0/6    |
| Module 7 - Testing       | 🔜 À venir | 0/6    |

Voir [ROADMAP.md](ROADMAP.md) pour plus de détails sur chaque module.
Voir [CURRICULUM.md](CURRICULUM.md) pour la liste complète des leçons.
Voir [MODULE-1-COMPLETE.md](MODULE-1-COMPLETE.md) pour le résumé du Module 1.

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

### Installation des Microservices (Module 2)

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
3. 🔜 Module 3 : Principes SOLID et React Avancé

---

**Bon apprentissage !**
