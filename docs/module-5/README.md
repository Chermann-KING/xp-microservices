# Module 5 - Architecture Event-Driven et Communication Asynchrone

## 🎯 Objectifs du Module

Ce module explore l'**architecture événementielle** (Event-Driven Architecture) et la **communication asynchrone** entre microservices. Vous apprendrez à concevoir des systèmes découplés et résilients utilisant des message brokers, à implémenter des transactions distribuées avec le pattern Saga, et à gérer la concurrence et l'idempotence.

---

## 📚 Ce que vous allez apprendre

### Architecture Event-Driven

- Comprendre les **principes fondamentaux** de l'architecture événementielle
- Différencier **Events vs Commands** et **Event Sourcing**
- Maîtriser les patterns **Publisher/Subscriber**
- Gérer la **cohérence éventuelle** (Eventual Consistency)

### Message Queues et Event Brokers

- Configurer et utiliser **RabbitMQ** et **Apache Kafka**
- Implémenter des **producers** et **consumers**
- Comprendre les patterns de **messaging** (Fanout, Topic, Direct)
- Gérer la **persistance** et la **durabilité** des messages

### Pattern Saga pour Transactions Distribuées

- Résoudre le problème des **transactions distribuées**
- Implémenter **Choreography-based Saga** vs **Orchestration-based Saga**
- Créer des **compensating transactions** pour gérer les échecs
- Assurer la **cohérence éventuelle** à travers plusieurs services

### Microservice de Notifications

- Concevoir un **service de notifications** multi-canal
- Intégrer **Email** (SendGrid/Mailgun), **SMS** (Twilio), et **Push**
- Implémenter des **templates** de messages dynamiques
- Gérer les **préférences utilisateur** et le **rate limiting**

### Concurrence et Idempotence

- Gérer la **concurrence** avec **Optimistic Locking** et **Pessimistic Locking**
- Implémenter des stratégies de **Retry Logic** et **Timeout**
- Garantir l'**idempotence** des opérations
- Prévenir les **race conditions** et **double processing**

### Communication Temps Réel avec WebSockets

- Comprendre le protocole **WebSocket** vs HTTP
- Implémenter **Socket.io** pour le temps réel
- Créer un système de **disponibilité en temps réel** des tours
- Gérer les **reconnexions** et la **scalabilité** horizontale

---

## 📖 Leçons du Module

| #   | Leçon                                                                                  | Description                                    | Durée estimée |
| --- | -------------------------------------------------------------------------------------- | ---------------------------------------------- | ------------- |
| 5.1 | [Introduction à l'Architecture Event-Driven](lecon-1-event-driven-intro.md)            | Principes, Events vs Commands, Event Sourcing  | ~2h           |
| 5.2 | [Communication Asynchrone avec Message Queues](lecon-2-message-queues.md)              | RabbitMQ/Kafka, Producers/Consumers, Patterns  | ~3h           |
| 5.3 | [Pattern Saga pour Transactions Distribuées](lecon-3-saga-pattern.md)                  | Choreography vs Orchestration, Compensation    | ~2h30         |
| 5.4 | [Mise en œuvre du Microservice de Notifications](lecon-4-notification-microservice.md) | Email/SMS/Push, Templates, Gestion files       | ~2h           |
| 5.5 | [Gestion de la Concurrence et Idempotence](lecon-5-concurrency-idempotency.md)         | Locking, Retry, Timeout, Idempotence           | ~2h30         |
| 5.6 | [Communication Temps Réel avec WebSockets](lecon-6-websockets-realtime.md)             | WebSocket, Socket.io, Disponibilité temps réel | ~2h           |

**Temps total estimé : ~14 heures**

---

## 🏆 Acquis à la fin du Module

À la fin de ce module, vous serez capable de :

### Architecture Événementielle

- ✅ Concevoir une **architecture event-driven** découplée
- ✅ Choisir entre **communication synchrone** et **asynchrone**
- ✅ Implémenter le pattern **Publisher/Subscriber**
- ✅ Gérer la **cohérence éventuelle** entre services

### Message Brokers

- ✅ Configurer **RabbitMQ** et **Apache Kafka**
- ✅ Créer des **producers** et **consumers** robustes
- ✅ Choisir le bon **exchange type** (Fanout, Topic, Direct)
- ✅ Garantir la **durabilité** et **l'ordre** des messages

### Transactions Distribuées

- ✅ Implémenter le **Saga Pattern** (Choreography et Orchestration)
- ✅ Créer des **compensating transactions**
- ✅ Gérer les **échecs partiels** dans un workflow distribué
- ✅ Assurer la **traçabilité** des transactions

### Résilience et Fiabilité

- ✅ Implémenter **Optimistic Locking** et **Pessimistic Locking**
- ✅ Créer des **stratégies de retry** intelligentes
- ✅ Garantir l'**idempotence** des opérations critiques
- ✅ Gérer les **timeouts** et **circuit breakers**

---

## 🛠️ Stack Technique

| Technologie | Version | Usage                          |
| ----------- | ------- | ------------------------------ |
| RabbitMQ    | 3.12+   | Message Broker (AMQP)          |
| amqplib     | 0.10.x  | Client RabbitMQ pour Node.js   |
| ws          | 8.x     | WebSocket natif pour Node.js   |
| nodemailer  | 6.x     | Envoi d'emails (SMTP)          |
| pug         | 3.x     | Templates email HTML           |
| ioredis     | 5.x     | Redis pour idempotence/locking |

> **Note** : Apache Kafka et Twilio SMS sont mentionnés dans les leçons comme alternatives mais ne sont pas implémentés dans le code de l'application.

---

## 🏗️ Services Construits

### Notification Service (Port 3006)

**Fonctionnalités :**

- Envoi d'emails transactionnels (confirmations, annulations)
- Envoi de SMS pour notifications urgentes
- Gestion des templates de messages
- File d'attente pour traitement asynchrone

**Événements consommés :**

```
booking.confirmed      → Envoie email de confirmation
booking.cancelled      → Envoie email d'annulation
payment.succeeded      → Envoie email de paiement réussi
payment.failed         → Envoie notification d'échec
tour.availability.low  → Alerte les utilisateurs intéressés
```

### Event Bus / Message Broker

**Infrastructure :**

- **RabbitMQ** pour le messaging transactionnel
- **Kafka** pour l'event streaming et l'audit log
- **Exchanges** configurés (Fanout, Topic, Direct)
- **Dead Letter Queues** pour les messages en échec

**Topics principaux :**

```
bookings.*             → Événements de réservation
payments.*             → Événements de paiement
tours.*                → Événements du catalogue
notifications.*        → Événements de notification
```

### Saga Orchestrator (Port 3006)

**Fonctionnalités :**

- Orchestration du workflow de réservation
- Gestion des compensations en cas d'échec
- État des transactions distribuées
- Retry automatique avec backoff exponentiel

**Workflow de réservation :**

```
1. Reserve Tour Spots      → Tour Catalog Service
2. Create Booking          → Booking Service
3. Process Payment         → Payment Service
4. Send Confirmation       → Notification Service

En cas d'échec au step 3 :
↓ Compensation
1. Cancel Booking          → Booking Service
2. Release Tour Spots      → Tour Catalog Service
3. Send Failure Email      → Notification Service
```

---

## 📁 Structure des Fichiers

```
docs/module-5/
├── README.md                              # Ce fichier
├── lecon-1-event-driven-intro.md          # Architecture événementielle
├── lecon-2-message-queues.md              # RabbitMQ/Kafka
├── lecon-3-saga-pattern.md                # Transactions distribuées
├── lecon-4-notification-microservice.md   # Service notifications
├── lecon-5-concurrency-idempotency.md     # Concurrence et idempotence
├── lecon-6-websockets-realtime.md         # WebSockets temps réel
└── exercices/
    ├── lecon-5.1-solutions.md             # Solutions Event-Driven
    ├── lecon-5.2-solutions.md             # Solutions Message Queues
    ├── lecon-5.3-solutions.md             # Solutions Saga Pattern
    ├── lecon-5.4-solutions.md             # Solutions Notifications
    ├── lecon-5.5-solutions.md             # Solutions Concurrency
    └── lecon-5.6-solutions.md             # Solutions WebSockets
```

---

## 📋 Prérequis

Avant de commencer ce module :

- ✅ Avoir complété les **Modules 1-4**
- ✅ **Docker** installé (pour RabbitMQ et Kafka)
- ✅ Compréhension des **callbacks** et **Promises** en JavaScript
- ✅ Notions de **transactions** et **ACID**
- ✅ Compte **SendGrid** (gratuit) pour l'envoi d'emails

**Installations requises :**

```bash
# Message Brokers
docker pull rabbitmq:3-management
docker pull bitnami/kafka:latest

# Clients Node.js
npm install amqplib kafkajs
npm install socket.io socket.io-client
npm install @sendgrid/mail twilio
npm install ioredis uuid
```

---

## 🔗 Liens avec les Autres Modules

| Module       | Relation                                        |
| ------------ | ----------------------------------------------- |
| **Module 1** | Base - Fondamentaux Node.js et architecture     |
| **Module 2** | Base - Microservices et Domain-Driven Design    |
| **Module 3** | Base - SOLID et patterns de conception          |
| **Module 4** | Base - Authentification et webhooks (async)     |
| **Module 6** | Suite - Déploiement et orchestration Kubernetes |
| **Module 7** | Suite - Testing des systèmes asynchrones        |

---

## 💡 Conseils d'Apprentissage

1. **Installez Docker d'abord** - RabbitMQ et Kafka nécessitent des conteneurs
2. **Testez localement avec RabbitMQ Management UI** - Interface web sur `http://localhost:15672`
3. **Comprenez la différence entre message queue et event stream** - RabbitMQ vs Kafka
4. **Implémentez l'idempotence dès le début** - Critique pour les systèmes asynchrones
5. **Utilisez des Correlation IDs** - Essentiel pour tracer les événements à travers les services
6. **Loggez abondamment** - Le debugging asynchrone est complexe

---

## ⚠️ Bonnes Pratiques Event-Driven

| Pratique                                    | Importance   |
| ------------------------------------------- | ------------ |
| **Implémenter l'idempotence des consumers** | 🔴 Critique  |
| **Utiliser des Dead Letter Queues**         | 🔴 Critique  |
| **Valider les schémas d'événements**        | 🔴 Critique  |
| **Ajouter des Correlation IDs**             | 🟠 Important |
| **Implémenter des retry strategies**        | 🟠 Important |
| **Monitorer la latence des messages**       | 🟠 Important |
| **Versionner les événements**               | 🟢 Utile     |

---

## ✅ Checklist de Validation

Avant de passer au Module 6, vérifiez que vous avez :

- [ ] Lu et compris les 6 leçons
- [ ] Configuré RabbitMQ et/ou Kafka en local
- [ ] Implémenté un producer et un consumer fonctionnels
- [ ] Créé un Saga Pattern pour un workflow complet
- [ ] Implémenté un service de notifications avec emails
- [ ] Testé l'idempotence d'au moins une opération
- [ ] Créé une communication temps réel avec WebSockets
- [ ] Compris la différence entre Choreography et Orchestration
- [ ] Complété les exercices d'au moins 4 leçons sur 6

---

## 🔐 Variables d'Environnement Requises

```env
# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@localhost:5672
RABBITMQ_EXCHANGE=tour_booking_events
RABBITMQ_QUEUE_PREFIX=tour_app

# Kafka
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=tour-booking-app
KAFKA_GROUP_ID=tour-services

# Notification Service
SENDGRID_API_KEY=SG.xxxxx
SENDGRID_FROM_EMAIL=noreply@bookingtourismapp.com
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+15551234567

# Redis (pour idempotence)
REDIS_URL=redis://localhost:6379
REDIS_TTL=86400

# WebSocket
WEBSOCKET_PORT=3007
WEBSOCKET_CORS_ORIGIN=http://localhost:3000
```

---

## 🎯 Événements Clés du Système

### Booking Events

```typescript
booking.created; // Nouvelle réservation créée
booking.confirmed; // Réservation confirmée (paiement OK)
booking.cancelled; // Réservation annulée
booking.completed; // Tour terminé (date passée)
```

### Payment Events

```typescript
payment.initiated; // Paiement démarré
payment.succeeded; // Paiement réussi
payment.failed; // Paiement échoué
payment.refunded; // Remboursement effectué
```

### Tour Events

```typescript
tour.created; // Nouveau tour ajouté
tour.updated; // Détails tour modifiés
tour.availability.low; // Places < seuil
tour.sold.out; // Plus de places disponibles
```

---

**Bon apprentissage ! 🚀📬**
