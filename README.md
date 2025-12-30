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
│   ├── module-1/
│   │   └── lecon-1-introduction-etude-de-cas.md
│   ├── module-2/
│   ├── module-3/
│   ├── module-4/
│   ├── module-5/
│   ├── module-6/
│   └── module-7/
│
├── app/                            # Code de l'application
│   ├── frontend/                   # Application React
│   └── backend/                    # Microservices
│       ├── tour-catalog-service/
│       ├── booking-service/
│       ├── user-service/
│       ├── payment-service/
│       ├── notification-service/
│       └── api-gateway/
│
├── sources/                        # Documents sources
├── ROADMAP.md                      # Roadmap détaillée des modules
├── CURRICULUM.md                   # Liste complète des 42 leçons
└── README.md                       # Ce fichier
```

## Parcours d'apprentissage

### Module 1 : Fondements du Développement Web Moderne (6 leçons)

- ✅ Introduction à l'étude de cas
- React Fundamentals
- Setup environnement fullstack
- RESTful API Design
- Introduction aux microservices
- Monolithe vs Microservices

### Module 2 : Conception et Implémentation des Microservices (6 leçons)

- Domain-Driven Design
- Tour Catalog Microservice (Design + Implementation)
- Booking Management Microservice (Design + Implementation)
- Database Design et ORM

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

**1/42 leçons complétées (2.4%)**

Voir [ROADMAP.md](ROADMAP.md) pour plus de détails sur chaque module.
Voir [CURRICULUM.md](CURRICULUM.md) pour la liste complète des leçons.

## Comment utiliser ce projet

### Prérequis

- Node.js (version LTS recommandée)
- PostgreSQL
- Docker (pour les modules avancés)
- Git

### Installation

Les instructions détaillées seront fournies dans la Leçon 1.3 (Setup Fullstack Environment).

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

1. Commencer la Leçon 1.2 : React Fundamentals
2. Configurer l'environnement de développement (Leçon 1.3)
3. Continuer progressivement module par module

---

**Bon apprentissage !**
