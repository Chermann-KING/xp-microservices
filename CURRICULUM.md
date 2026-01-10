# Programme Détaillé - Application de Réservation Touristique

Ce document liste toutes les 42 leçons réparties sur 7 modules.

---

## MODULE 1 : Fondements du Développement Web Moderne et des Microservices

### Leçon 1.1 - Introduction à l'étude de cas de l'application de réservation touristique ✅

- Comprendre le contexte et les objectifs de l'application
- Identifier les exigences fonctionnelles clés
- Analyser les besoins utilisateurs et tour-opérateurs

### Leçon 1.2 - Fondamentaux de React : Composants, Props et Gestion d'État ✅

- Concept de composants React
- Utilisation des props pour la communication
- Gestion d'état avec useState et useEffect

### Leçon 1.3 - Configuration d'un environnement de développement Fullstack ✅

- Installation de Node.js avec nvm
- Configuration d'Express.js
- Setup PostgreSQL et pgAdmin

### Leçon 1.4 - Principes de Design d'API RESTful et Bonnes Pratiques ✅

- Principes fondamentaux REST
- Conception d'URIs et gestion des ressources
- Versioning, pagination et filtrage

### Leçon 1.5 - Introduction à l'architecture microservices et ses avantages ✅

- Principes fondamentaux des microservices
- Caractéristiques clés vs monolithes
- Avantages et défis

### Leçon 1.6 - Monolithe vs Microservices : comprendre les compromis ✅

- Caractéristiques de l'architecture monolithique
- Comparaison objective des avantages/inconvénients
- Critères de choix architectural

---

## MODULE 2 : Conception et Implémentation des Microservices Principaux

### Leçon 2.1 - Domain-Driven Design pour les Microservices : Bounded Contexts ✅

- Principes fondamentaux du DDD
- Concept de Bounded Context
- Agrégats, entités et value objects

### Leçon 2.2 - Conception de l'API du Microservice Tour Catalog ✅

- Design API RESTful cohérente
- Application du Bounded Context aux endpoints
- Modèle de données et filtrage

### Leçon 2.3 - Implémentation du Microservice Tour Catalog ✅

- API RESTful avec Node.js et Express
- Structure microservice (routes, contrôleurs, modèles)
- Validation et gestion d'erreurs

### Leçon 2.4 - Conception de l'API du Microservice Booking Management ✅

- API RESTful pour gestion des réservations
- Cycle de vie et transitions de statut
- Règles métier et validations

### Leçon 2.5 - Implémentation du Microservice Booking Management ✅

- Implémentation API réservations
- Machine à états pour cycle de vie
- Communication inter-services

### Leçon 2.6 - Conception de Base de Données et Intégration ORM pour les Microservices ✅

- Principes de conception BDD pour microservices
- Propriété des données par service
- Intégration ORM Sequelize avec migrations

---

## MODULE 3 : Principes SOLID, Design Patterns et React Avancé

### Leçon 3.1 - Le Principe de Responsabilité Unique (SRP) dans les Microservices et les Composants React ✅

- Définition et application du SRP
- Refactoring avec pattern Repository
- SRP dans les composants React

### Leçon 3.2 - Le Principe Ouvert/Fermé (OCP) pour un Code Extensible ✅

- Définition du principe OCP
- Extension sans modification
- Patterns Strategy et Factory

### Leçon 3.3 - Principe de Substitution de Liskov (LSP) ✅

- Définition et principes LSP
- Contrats et héritage comportemental
- Application dans les interfaces

### Leçon 3.4 - Le Principe de Ségrégation des Interfaces (ISP) dans la Conception d'API ✅

- Définition du principe ISP
- Interfaces spécifiques et cohésives
- Application dans la conception d'API

### Leçon 3.5 - Le Principe d'Inversion des Dépendances (DIP) et l'Inversion de Contrôle ✅

- Définition DIP et IoC
- Dependency Injection avec conteneur
- Refactoring des microservices

### Leçon 3.6 - React Avancé : State Management et Hooks Personnalisés ✅

- Context API et useReducer
- Hooks personnalisés réutilisables
- Patterns Container/Presentational

---

## MODULE 4 : Intégration et Sécurité du Traitement des Paiements

### Leçon 4.1 - Conception du Microservice d'Intégration de la Passerelle de Paiement ✅

- Architecture du service de paiement
- Flux de paiement sécurisé
- Gestion des états de paiement

### Leçon 4.2 - Implémentation du Traitement Sécurisé des Paiements avec Stripe API ✅

- Configuration et SDK Stripe
- Création de sessions de paiement
- Gestion des intents et confirmations

### Leçon 4.3 - Gestion des Callbacks et Webhooks de Paiement ✅

- Configuration des webhooks Stripe
- Vérification des signatures
- Gestion de l'idempotence

### Leçon 4.4 - Stratégies d'Authentification et d'Autorisation (JWT, OAuth2) ✅

- JWT et tokens d'accès
- OAuth2 et OpenID Connect
- Best practices de sécurité

### Leçon 4.5 - Mise en œuvre du Microservice d'Authentification des Utilisateurs ✅

- Service d'authentification complet
- Gestion des tokens et refresh
- Validation et sécurité

### Leçon 4.6 - Communication Sécurisée entre Microservices (API Gateway, HTTPS) ✅

- Rôle de l'API Gateway
- Configuration HTTPS/TLS
- Authentication inter-services

---

## MODULE 5 : Architecture Event-Driven et Communication Asynchrone

### Leçon 5.1 - Introduction à l'Architecture Event-Driven des Microservices ✅

- Principes de l'architecture événementielle
- Events vs Commands vs Queries
- Avantages du découplage asynchrone

### Leçon 5.2 - Mise en œuvre de la Communication Asynchrone avec Message Queues (RabbitMQ, Kafka) ✅

- RabbitMQ : exchanges, queues, bindings
- Pattern Publisher/Subscriber
- Fiabilité et acknowledgements

### Leçon 5.3 - Pattern Saga pour les Transactions Distribuées ✅

- Gestion des transactions distribuées
- Choreography vs Orchestration
- Compensation et rollback

### Leçon 5.4 - Conception et Implémentation du Microservice de Notifications ✅

- Service notifications multi-canal
- Email, SMS, Push (Strategy Pattern)
- Templates et idempotence avec Redis

### Leçon 5.5 - Gestion de la Concurrence et de l'Idempotence dans les Transactions ✅

- Optimistic Locking avec versioning
- Retry logic et exponential backoff
- Idempotence et déduplication

### Leçon 5.6 - Création de Fonctionnalités Temps Réel avec WebSockets pour la Disponibilité des Tours ✅

- Serveur WebSocket avec ws
- Broadcast événements en temps réel
- Intégration frontend avec notifications

---

## MODULE 6 : Déploiement et Monitoring

### Leçon 6.1 - Docker Containerization

- Docker basics
- Dockerfiles
- Best practices

### Leçon 6.2 - Orchestration

- Docker Compose
- Kubernetes
- Pods et Services

### Leçon 6.3 - Cloud Deployment

- AWS/Azure/GCP
- Services managés
- Infrastructure as Code

### Leçon 6.4 - API Gateway

- Rôle API Gateway
- Routing
- **Circuit Breaker Pattern**
- **Rate Limiting**
- **Load Balancing**

### Leçon 6.5 - Logging & Monitoring

- ELK Stack
- Collecte logs
- Dashboards

### Leçon 6.6 - Scaling Strategies

- Horizontal/Vertical
- Auto-scaling
- Load balancing

---

## MODULE 7 : Testing et Sujets Avancés

### Leçon 7.1 - Unit Testing

- Jest
- React Testing Library
- Coverage

### Leçon 7.2 - Integration & E2E Testing

- Tests d'intégration
- Cypress
- Stratégie testing

### Leçon 7.3 - API Documentation

- OpenAPI/Swagger
- Documentation automatique
- Maintenance

### Leçon 7.4 - CI/CD Pipelines

- GitHub Actions/Jenkins
- Pipeline stages
- Déploiement auto

### Leçon 7.5 - Serverless & FaaS

- Architecture serverless
- AWS Lambda
- Cas d'usage

### Leçon 7.6 - Performance & Caching

- Redis caching
- CDN
- Optimization

---

**Progression : 30/42 leçons (71.4%)** ✅

- ✅ Module 1 : 6/6 leçons complétées
- ✅ Module 2 : 6/6 leçons complétées
- ✅ Module 3 : 6/6 leçons complétées
- ✅ Module 4 : 6/6 leçons complétées
- ✅ Module 5 : 6/6 leçons complétées
- 🔜 Module 6 : 0/6 leçons
- 🔜 Module 7 : 0/6 leçons
