# Solutions - Leçon 5.3 : Pattern Saga pour Transactions Distribuées

## 📋 Table des Matières

- [Exercice 1 : Saga de Réservation de Chambre d'Hôtel (Choreography)](#exercice-1--saga-de-réservation-de-chambre-dhôtel-choreography)
- [Exercice 2 : Convertir le Booking en Orchestration-based Saga](#exercice-2--convertir-le-booking-en-orchestration-based-saga)
- [Exercice 3 : Implémenter l'Idempotence dans le Payment Service](#exercice-3--implémenter-lidempotence-dans-le-payment-service)

---

## Exercice 1 : Saga de Réservation de Chambre d'Hôtel (Choreography)

### 📝 Énoncé

Concevoir une **Choreography-based Saga** pour une réservation de chambre d'hôtel impliquant :

1. **Room Service** : Réserver une chambre
2. **Payment Service** : Traiter le paiement
3. **Loyalty Service** : Ajouter des points de fidélité
4. **Notification Service** : Envoyer une confirmation par email

**Objectifs** :

- Définir la séquence d'événements pour le flux nominal
- Définir les événements de compensation en cas d'échec
- Identifier les scénarios d'échec critiques

---

### ✅ Solution

#### 1. Séquence d'Événements pour le Flux Nominal

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│   Client     │       │ Room Service │       │   Payment    │       │   Loyalty    │
│   Request    │       │              │       │   Service    │       │   Service    │
└──────┬───────┘       └──────┬───────┘       └──────┬───────┘       └──────┬───────┘
       │                      │                      │                      │
       │  1. room.reserve     │                      │                      │
       │─────────────────────>│                      │                      │
       │                      │                      │                      │
       │                      │  room.reserved       │                      │
       │                      │──────────────────────>│                      │
       │                      │                      │                      │
       │                      │                      │  payment.initiated   │
       │                      │                      │─────────────────────>│
       │                      │                      │                      │
       │                      │                      │  payment.succeeded   │
       │                      │<─────────────────────│                      │
       │                      │                      │                      │
       │                      │                      │                      │
       │                      │                      │  payment.succeeded   │
       │                      │                      │─────────────────────>│
       │                      │                      │                      │
       │                      │                      │                      │ loyalty.points.added
       │                      │<─────────────────────┼──────────────────────│
       │                      │                      │                      │
       │                      │  booking.confirmed   │                      │
       │<─────────────────────│                      │                      │
       │                      │                      │                      │
       │                      │                      │                      │
       │                      │  notification.send   │                      │
       │                      │──────────────────────┼─────────────────────>│
       │                      │                      │                      │
       │  notification.sent   │                      │                      │
       │<─────────────────────┼──────────────────────┼──────────────────────│
       │                      │                      │                      │
```

**Événements du flux nominal** :

| Étape | Événement                | Producteur       | Consommateur(s)       | Description                       |
| ----- | ------------------------ | ---------------- | --------------------- | --------------------------------- |
| 1     | `room.reserve.requested` | Client API       | Room Service          | Demande de réservation de chambre |
| 2     | `room.reserved`          | Room Service     | Payment Service       | Chambre réservée avec succès      |
| 3     | `payment.initiated`      | Payment Service  | (Audit log)           | Paiement démarré                  |
| 4     | `payment.succeeded`      | Payment Service  | Room Service, Loyalty | Paiement réussi                   |
| 5     | `loyalty.points.added`   | Loyalty Service  | Notification Service  | Points ajoutés au compte client   |
| 6     | `booking.confirmed`      | Room Service     | Notification Service  | Réservation confirmée             |
| 7     | `notification.sent`      | Notification Svc | (Audit log)           | Email de confirmation envoyé      |

---

#### 2. Événements de Compensation en Cas d'Échec

**Scénario 1 : Échec du Paiement**

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│   Client     │       │ Room Service │       │   Payment    │
│   Request    │       │              │       │   Service    │
└──────┬───────┘       └──────┬───────┘       └──────┬───────┘
       │                      │                      │
       │  1. room.reserve     │                      │
       │─────────────────────>│                      │
       │                      │                      │
       │                      │  room.reserved       │
       │                      │──────────────────────>│
       │                      │                      │
       │                      │                      │  ❌ payment.failed
       │                      │<─────────────────────│
       │                      │                      │
       │                      │  room.release        │
       │                      │  (COMPENSATION)      │
       │                      │<─────────────────────│
       │                      │                      │
       │                      │  room.released       │
       │                      │──────────────────────>│
       │                      │                      │
       │  booking.failed      │                      │
       │<─────────────────────│                      │
       │                      │                      │
```

**Scénario 2 : Échec de l'Ajout de Points de Fidélité**

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│ Room Service │       │   Payment    │       │   Loyalty    │       │ Notification │
│              │       │   Service    │       │   Service    │       │   Service    │
└──────┬───────┘       └──────┬───────┘       └──────┬───────┘       └──────┬───────┘
       │                      │                      │                      │
       │  room.reserved       │                      │                      │
       │──────────────────────>│                      │                      │
       │                      │                      │                      │
       │                      │  payment.succeeded   │                      │
       │<─────────────────────│──────────────────────>│                      │
       │                      │                      │                      │
       │                      │                      │  ❌ loyalty.failed   │
       │<─────────────────────┼──────────────────────│                      │
       │                      │                      │                      │
       │  ⚠️ Décision : Continuer ou Compenser ?    │                      │
       │                      │                      │                      │
       │  Option A : Continuer (points non critiques)│                      │
       │                      │                      │                      │
       │  booking.confirmed   │                      │                      │
       │──────────────────────┼──────────────────────┼─────────────────────>│
       │                      │                      │                      │
       │  + Alert Ops pour manual fix                │                      │
       │                      │                      │                      │
```

**Tableau de Compensation** :

| Événement d'Échec         | Transaction à Compenser      | Événement de Compensation | Responsable          |
| ------------------------- | ---------------------------- | ------------------------- | -------------------- |
| `payment.failed`          | Réservation de chambre       | `room.release`            | Room Service         |
| `room.reservation.failed` | Aucune                       | N/A                       | N/A                  |
| `loyalty.failed`          | (Non critique - Alert Ops)   | `loyalty.retry` ou Skip   | Loyalty Service      |
| `notification.failed`     | (Non critique - Retry async) | `notification.retry`      | Notification Service |

---

#### 3. Scénarios d'Échec Critiques

**Scénario A : Échec de Compensation**

```
┌──────────────┐       ┌──────────────┐
│ Room Service │       │   Payment    │
│              │       │   Service    │
└──────┬───────┘       └──────┬───────┘
       │                      │
       │  room.reserved       │
       │──────────────────────>│
       │                      │
       │                      │  ❌ payment.failed
       │<─────────────────────│
       │                      │
       │  room.release        │
       │  (COMPENSATION)      │
       │<─────────────────────│
       │                      │
       │  ❌ room.release.failed (DB down, network issue)
       │──────────────────────>│
       │                      │
       │  🚨 ALERT OPS        │
       │  Manual intervention │
       │  required            │
       │                      │
```

**Gestion** :

- **Dead Letter Queue (DLQ)** : Envoyer l'événement `room.release` dans une DLQ
- **Alertes** : Notifier l'équipe Ops via PagerDuty/Slack
- **Retry avec Backoff** : Réessayer automatiquement 3 fois avec délais exponentiels
- **Compensation Manuelle** : Si échec persistant, intervention humaine

**Scénario B : Double Événement (Non-Idempotence)**

```
┌──────────────┐       ┌──────────────┐
│   Payment    │       │ Room Service │
│   Service    │       │              │
└──────┬───────┘       └──────┬───────┘
       │                      │
       │  payment.succeeded   │
       │──────────────────────>│
       │                      │
       │                      │  ✅ Chambre marquée confirmée
       │                      │
       │  payment.succeeded   │  (Duplicata - Retry réseau)
       │──────────────────────>│
       │                      │
       │                      │  ⚠️ Si NON idempotent :
       │                      │     Double confirmation possible
       │                      │
       │                      │  ✅ Si idempotent (correlationId check) :
       │                      │     Message ignoré
       │                      │
```

**Gestion** :

- **Idempotency Keys** : Utiliser `correlationId` ou `eventId` unique
- **Redis Cache** : Stocker les événements déjà traités (TTL 24h)
- **Database Unique Constraints** : Contrainte unique sur `bookingId`

---

#### 4. Implémentation Code - Room Service (Consumer)

```javascript
// room-service/src/eventConsumers/paymentEventConsumer.js
const amqp = require("amqplib");
const redis = require("redis");
const { v4: uuidv4 } = require("uuid");

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost:5672";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const EXCHANGE_NAME = "hotel_events";
const QUEUE_NAME = "room_service_queue";

let channel;
let redisClient;

// Connexion Redis pour idempotence
async function connectRedis() {
  redisClient = redis.createClient({ url: REDIS_URL });
  await redisClient.connect();
  console.log("✅ Connecté à Redis");
}

// Connexion RabbitMQ
async function connectRabbitMQ() {
  const connection = await amqp.connect(RABBITMQ_URL);
  channel = await connection.createChannel();

  await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: true });
  await channel.assertQueue(QUEUE_NAME, { durable: true });

  // Bind aux événements payment.*
  await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, "payment.succeeded");
  await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, "payment.failed");

  console.log("✅ Room Service Consumer démarré");
}

// Vérification d'idempotence
async function isEventProcessed(eventId) {
  const key = `processed_event:${eventId}`;
  const exists = await redisClient.exists(key);
  return exists === 1;
}

// Marquer un événement comme traité
async function markEventAsProcessed(eventId) {
  const key = `processed_event:${eventId}`;
  await redisClient.setEx(key, 86400, "1"); // Expire après 24h
}

// Consumer principal
async function consumeEvents() {
  channel.consume(
    QUEUE_NAME,
    async (msg) => {
      if (!msg) return;

      const routingKey = msg.fields.routingKey;
      const eventData = JSON.parse(msg.content.toString());
      const eventId = eventData.eventId || uuidv4();
      const correlationId = eventData.correlationId;

      console.log(`📩 [${correlationId}] Événement reçu: ${routingKey}`);

      try {
        // Vérification d'idempotence
        if (await isEventProcessed(eventId)) {
          console.log(`⏭️ [${correlationId}] Événement déjà traité, ignoré.`);
          channel.ack(msg);
          return;
        }

        // Traitement selon le type d'événement
        if (routingKey === "payment.succeeded") {
          await handlePaymentSucceeded(eventData, correlationId);
        } else if (routingKey === "payment.failed") {
          await handlePaymentFailed(eventData, correlationId);
        }

        // Marquer comme traité
        await markEventAsProcessed(eventId);

        // ACK le message
        channel.ack(msg);
        console.log(`✅ [${correlationId}] Message traité avec succès`);
      } catch (error) {
        console.error(`❌ [${correlationId}] Erreur de traitement:`, error);

        // NACK avec requeue (max 3 tentatives)
        const retryCount = (msg.properties.headers["x-retry-count"] || 0) + 1;

        if (retryCount < 3) {
          console.log(`🔄 [${correlationId}] Retry ${retryCount}/3`);
          channel.nack(msg, false, true); // Requeue
        } else {
          console.error(
            `💀 [${correlationId}] Échec après 3 tentatives, envoi en DLQ`
          );
          channel.nack(msg, false, false); // Envoyer en Dead Letter Queue
        }
      }
    },
    { noAck: false }
  );
}

// Handler : Paiement réussi
async function handlePaymentSucceeded(eventData, correlationId) {
  const { bookingId, roomId, userId } = eventData;

  console.log(
    `💳 [${correlationId}] Paiement réussi pour bookingId: ${bookingId}`
  );

  // Mettre à jour la réservation en base
  await updateBookingStatus(bookingId, "CONFIRMED");

  // Publier événement booking.confirmed
  const confirmationEvent = {
    eventId: uuidv4(),
    correlationId,
    eventType: "booking.confirmed",
    timestamp: new Date().toISOString(),
    data: {
      bookingId,
      roomId,
      userId,
      status: "CONFIRMED",
    },
  };

  channel.publish(
    EXCHANGE_NAME,
    "booking.confirmed",
    Buffer.from(JSON.stringify(confirmationEvent)),
    { persistent: true }
  );

  console.log(
    `✅ [${correlationId}] Réservation confirmée et événement publié`
  );
}

// Handler : Paiement échoué (COMPENSATION)
async function handlePaymentFailed(eventData, correlationId) {
  const { bookingId, roomId, userId, reason } = eventData;

  console.log(
    `❌ [${correlationId}] Paiement échoué pour bookingId: ${bookingId}`
  );
  console.log(`📝 Raison: ${reason}`);

  try {
    // COMPENSATION : Libérer la chambre réservée
    await releaseRoomReservation(roomId);

    // Mettre à jour le statut de la réservation
    await updateBookingStatus(bookingId, "CANCELLED");

    // Publier événement room.released
    const releaseEvent = {
      eventId: uuidv4(),
      correlationId,
      eventType: "room.released",
      timestamp: new Date().toISOString(),
      data: {
        bookingId,
        roomId,
        userId,
        reason: "payment_failed",
      },
    };

    channel.publish(
      EXCHANGE_NAME,
      "room.released",
      Buffer.from(JSON.stringify(releaseEvent)),
      { persistent: true }
    );

    console.log(`✅ [${correlationId}] Compensation réussie - Chambre libérée`);

    // Publier événement booking.failed pour notification
    const failureEvent = {
      eventId: uuidv4(),
      correlationId,
      eventType: "booking.failed",
      timestamp: new Date().toISOString(),
      data: {
        bookingId,
        roomId,
        userId,
        reason,
      },
    };

    channel.publish(
      EXCHANGE_NAME,
      "booking.failed",
      Buffer.from(JSON.stringify(failureEvent)),
      { persistent: true }
    );
  } catch (error) {
    console.error(`🚨 [${correlationId}] ÉCHEC DE COMPENSATION:`, error);

    // Alerter les Ops
    await alertOps({
      severity: "CRITICAL",
      service: "room-service",
      correlationId,
      bookingId,
      error: error.message,
      action: "MANUAL_INTERVENTION_REQUIRED",
    });

    throw error; // Réessayer ou envoyer en DLQ
  }
}

// Fonction DB : Libérer la chambre
async function releaseRoomReservation(roomId) {
  // Simulation - Remplacer par requête DB réelle
  console.log(`🔓 Libération de la chambre ${roomId}`);
  // await db.rooms.update({ id: roomId }, { status: "AVAILABLE" });
}

// Fonction DB : Mettre à jour le statut de réservation
async function updateBookingStatus(bookingId, status) {
  // Simulation - Remplacer par requête DB réelle
  console.log(`📝 Mise à jour bookingId ${bookingId} -> ${status}`);
  // await db.bookings.update({ id: bookingId }, { status });
}

// Alerter les Ops
async function alertOps(alertData) {
  console.error("🚨 ALERT OPS:", JSON.stringify(alertData, null, 2));
  // Intégration PagerDuty, Slack, etc.
}

// Démarrage
(async () => {
  await connectRedis();
  await connectRabbitMQ();
  await consumeEvents();
})();

module.exports = {
  connectRabbitMQ,
  consumeEvents,
};
```

---

#### 5. Configuration Dead Letter Queue (DLQ)

```javascript
// rabbitmq-setup.js
const amqp = require("amqplib");

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost:5672";
const EXCHANGE_NAME = "hotel_events";
const DLQ_EXCHANGE = "hotel_events_dlx";
const DLQ_QUEUE = "hotel_events_dlq";

async function setupRabbitMQ() {
  const connection = await amqp.connect(RABBITMQ_URL);
  const channel = await connection.createChannel();

  // Exchange principal
  await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: true });

  // Dead Letter Exchange
  await channel.assertExchange(DLQ_EXCHANGE, "topic", { durable: true });

  // Dead Letter Queue
  await channel.assertQueue(DLQ_QUEUE, { durable: true });
  await channel.bindQueue(DLQ_QUEUE, DLQ_EXCHANGE, "#");

  // Queue normale avec DLX configuré
  await channel.assertQueue("room_service_queue", {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": DLQ_EXCHANGE,
      "x-dead-letter-routing-key": "dlq.room_service",
    },
  });

  console.log("✅ RabbitMQ configuré avec Dead Letter Queue");
  await connection.close();
}

setupRabbitMQ();
```

---

## Exercice 2 : Convertir le Booking en Orchestration-based Saga

### 📝 Énoncé

Convertir le **système de réservation de tours** en **Orchestration-based Saga** avec un **Orchestrator central**.

**Services impliqués** :

1. **Tour Catalog Service** : Réserver des places
2. **Booking Service** : Créer une réservation
3. **Payment Service** : Traiter le paiement
4. **Notification Service** : Envoyer une confirmation

**Objectifs** :

- Créer un **Orchestrator Service** qui coordonne les transactions
- Définir les **commandes** envoyées à chaque service
- Implémenter la **gestion d'état** de la saga
- Gérer les **compensations** en cas d'échec

---

### ✅ Solution

#### 1. Architecture de l'Orchestrator

```
┌─────────────────────────────────────────────────────────────┐
│                  Booking Orchestrator Service               │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           TourBookingSaga State Machine            │   │
│  │                                                     │   │
│  │  States:                                            │   │
│  │    STARTED → TOUR_RESERVED → BOOKING_CREATED →     │   │
│  │    PAYMENT_PROCESSED → NOTIFICATION_SENT →         │   │
│  │    COMPLETED                                        │   │
│  │                                                     │   │
│  │  Error States:                                      │   │
│  │    COMPENSATING → FAILED                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         Command Handlers (HTTP Clients)            │   │
│  │                                                     │   │
│  │  - reserveTourSpots()      → Tour Catalog Service  │   │
│  │  - createBooking()         → Booking Service       │   │
│  │  - processPayment()        → Payment Service       │   │
│  │  - sendNotification()      → Notification Service  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │      Compensation Handlers (Rollback)              │   │
│  │                                                     │   │
│  │  - releaseTourSpots()      → Tour Catalog Service  │   │
│  │  - cancelBooking()         → Booking Service       │   │
│  │  - refundPayment()         → Payment Service       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

#### 2. Séquence de Commandes

**Flux Nominal** :

| Étape | Commande                  | Service Cible        | Compensation si échec     |
| ----- | ------------------------- | -------------------- | ------------------------- |
| 1     | `ReserveTourSpotsCommand` | Tour Catalog Service | `ReleaseTourSpotsCommand` |
| 2     | `CreateBookingCommand`    | Booking Service      | `CancelBookingCommand`    |
| 3     | `ProcessPaymentCommand`   | Payment Service      | `RefundPaymentCommand`    |
| 4     | `SendNotificationCommand` | Notification Service | (Non critique - retry)    |

**État Final** : `COMPLETED` ou `FAILED`

---

#### 3. Implémentation de l'Orchestrator Service

```javascript
// booking-orchestrator-service/src/sagas/TourBookingSaga.js
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const redis = require("redis");

// URLs des services
const TOUR_CATALOG_URL =
  process.env.TOUR_CATALOG_URL || "http://localhost:3001";
const BOOKING_URL = process.env.BOOKING_URL || "http://localhost:3002";
const PAYMENT_URL = process.env.PAYMENT_URL || "http://localhost:3004";
const NOTIFICATION_URL =
  process.env.NOTIFICATION_URL || "http://localhost:3006";

// Redis pour persister l'état
const redisClient = redis.createClient({ url: process.env.REDIS_URL });

class TourBookingSaga {
  constructor(sagaId, bookingData) {
    this.sagaId = sagaId || uuidv4();
    this.bookingData = bookingData;
    this.state = "STARTED";
    this.currentStep = 0;
    this.compensationsNeeded = [];
    this.createdResources = {}; // IDs des ressources créées
  }

  // Exécuter la saga complète
  async execute() {
    console.log(`🚀 [Saga ${this.sagaId}] Démarrage`);

    try {
      // Étape 1 : Réserver les places du tour
      await this.reserveTourSpots();
      this.currentStep = 1;
      this.state = "TOUR_RESERVED";
      this.compensationsNeeded.push("releaseTourSpots");
      await this.persistState();

      // Étape 2 : Créer la réservation
      await this.createBooking();
      this.currentStep = 2;
      this.state = "BOOKING_CREATED";
      this.compensationsNeeded.push("cancelBooking");
      await this.persistState();

      // Étape 3 : Traiter le paiement
      await this.processPayment();
      this.currentStep = 3;
      this.state = "PAYMENT_PROCESSED";
      this.compensationsNeeded.push("refundPayment");
      await this.persistState();

      // Étape 4 : Envoyer la notification
      await this.sendNotification();
      this.state = "NOTIFICATION_SENT";
      await this.persistState();

      // Saga complétée avec succès
      this.state = "COMPLETED";
      await this.persistState();

      console.log(`✅ [Saga ${this.sagaId}] Complétée avec succès`);

      return {
        success: true,
        sagaId: this.sagaId,
        bookingId: this.createdResources.bookingId,
      };
    } catch (error) {
      console.error(
        `❌ [Saga ${this.sagaId}] Échec à l'étape ${this.currentStep}:`,
        error.message
      );

      // Démarrer les compensations
      this.state = "COMPENSATING";
      await this.persistState();
      await this.compensate();

      this.state = "FAILED";
      await this.persistState();

      return {
        success: false,
        sagaId: this.sagaId,
        error: error.message,
        failedAtStep: this.currentStep,
      };
    }
  }

  // Étape 1 : Réserver les places du tour
  async reserveTourSpots() {
    console.log(`📅 [Saga ${this.sagaId}] Réservation des places du tour...`);

    const { tourId, numberOfSpots } = this.bookingData;

    try {
      const response = await axios.post(
        `${TOUR_CATALOG_URL}/api/tours/${tourId}/reserve`,
        {
          numberOfSpots,
          sagaId: this.sagaId,
        },
        {
          timeout: 5000,
          headers: { "X-Idempotency-Key": `${this.sagaId}-reserve-tour` },
        }
      );

      this.createdResources.reservationId = response.data.reservationId;
      console.log(
        `✅ [Saga ${this.sagaId}] Places réservées - reservationId: ${response.data.reservationId}`
      );
    } catch (error) {
      console.error(
        `❌ [Saga ${this.sagaId}] Échec de réservation des places:`,
        error.message
      );
      throw new Error(`TOUR_RESERVATION_FAILED: ${error.message}`);
    }
  }

  // Étape 2 : Créer la réservation
  async createBooking() {
    console.log(`📝 [Saga ${this.sagaId}] Création de la réservation...`);

    const { tourId, userId, numberOfSpots, totalPrice } = this.bookingData;

    try {
      const response = await axios.post(
        `${BOOKING_URL}/api/bookings`,
        {
          tourId,
          userId,
          numberOfSpots,
          totalPrice,
          sagaId: this.sagaId,
          reservationId: this.createdResources.reservationId,
        },
        {
          timeout: 5000,
          headers: { "X-Idempotency-Key": `${this.sagaId}-create-booking` },
        }
      );

      this.createdResources.bookingId = response.data.bookingId;
      console.log(
        `✅ [Saga ${this.sagaId}] Réservation créée - bookingId: ${response.data.bookingId}`
      );
    } catch (error) {
      console.error(
        `❌ [Saga ${this.sagaId}] Échec de création de réservation:`,
        error.message
      );
      throw new Error(`BOOKING_CREATION_FAILED: ${error.message}`);
    }
  }

  // Étape 3 : Traiter le paiement
  async processPayment() {
    console.log(`💳 [Saga ${this.sagaId}] Traitement du paiement...`);

    const { userId, totalPrice, paymentMethod } = this.bookingData;

    try {
      const response = await axios.post(
        `${PAYMENT_URL}/api/payments`,
        {
          userId,
          amount: totalPrice,
          currency: "USD",
          paymentMethod,
          bookingId: this.createdResources.bookingId,
          sagaId: this.sagaId,
        },
        {
          timeout: 10000, // Timeout plus long pour le paiement
          headers: { "X-Idempotency-Key": `${this.sagaId}-process-payment` },
        }
      );

      this.createdResources.paymentId = response.data.paymentId;
      console.log(
        `✅ [Saga ${this.sagaId}] Paiement traité - paymentId: ${response.data.paymentId}`
      );
    } catch (error) {
      console.error(
        `❌ [Saga ${this.sagaId}] Échec du paiement:`,
        error.message
      );
      throw new Error(`PAYMENT_FAILED: ${error.message}`);
    }
  }

  // Étape 4 : Envoyer la notification
  async sendNotification() {
    console.log(`📧 [Saga ${this.sagaId}] Envoi de la notification...`);

    const { userId } = this.bookingData;

    try {
      await axios.post(
        `${NOTIFICATION_URL}/api/notifications/send`,
        {
          userId,
          type: "BOOKING_CONFIRMATION",
          bookingId: this.createdResources.bookingId,
          sagaId: this.sagaId,
        },
        {
          timeout: 5000,
          headers: { "X-Idempotency-Key": `${this.sagaId}-send-notification` },
        }
      );

      console.log(`✅ [Saga ${this.sagaId}] Notification envoyée`);
    } catch (error) {
      // La notification est non-critique, on log mais ne fait pas échouer la saga
      console.warn(
        `⚠️ [Saga ${this.sagaId}] Échec d'envoi de notification (non-critique):`,
        error.message
      );
      // Retry asynchrone possible
    }
  }

  // Compensation : Exécuter toutes les compensations dans l'ordre inverse
  async compensate() {
    console.log(`🔄 [Saga ${this.sagaId}] Début des compensations`);

    // Inverser l'ordre des compensations (LIFO)
    const compensations = [...this.compensationsNeeded].reverse();

    for (const compensationName of compensations) {
      try {
        console.log(
          `🔙 [Saga ${this.sagaId}] Exécution de ${compensationName}...`
        );
        await this[compensationName]();
        console.log(`✅ [Saga ${this.sagaId}] ${compensationName} réussie`);
      } catch (error) {
        console.error(
          `🚨 [Saga ${this.sagaId}] Échec de compensation ${compensationName}:`,
          error.message
        );

        // Alerter les Ops
        await this.alertOps(compensationName, error);
      }
    }

    console.log(`🔄 [Saga ${this.sagaId}] Compensations terminées`);
  }

  // Compensation 1 : Libérer les places du tour
  async releaseTourSpots() {
    const { tourId } = this.bookingData;
    const { reservationId } = this.createdResources;

    try {
      await axios.post(
        `${TOUR_CATALOG_URL}/api/tours/${tourId}/release`,
        {
          reservationId,
          sagaId: this.sagaId,
        },
        {
          timeout: 5000,
          headers: { "X-Idempotency-Key": `${this.sagaId}-release-tour` },
        }
      );

      console.log(`✅ [Saga ${this.sagaId}] Places du tour libérées`);
    } catch (error) {
      throw new Error(`RELEASE_TOUR_FAILED: ${error.message}`);
    }
  }

  // Compensation 2 : Annuler la réservation
  async cancelBooking() {
    const { bookingId } = this.createdResources;

    try {
      await axios.patch(
        `${BOOKING_URL}/api/bookings/${bookingId}/cancel`,
        {
          reason: "SAGA_COMPENSATION",
          sagaId: this.sagaId,
        },
        {
          timeout: 5000,
          headers: { "X-Idempotency-Key": `${this.sagaId}-cancel-booking` },
        }
      );

      console.log(`✅ [Saga ${this.sagaId}] Réservation annulée`);
    } catch (error) {
      throw new Error(`CANCEL_BOOKING_FAILED: ${error.message}`);
    }
  }

  // Compensation 3 : Rembourser le paiement
  async refundPayment() {
    const { paymentId } = this.createdResources;

    try {
      await axios.post(
        `${PAYMENT_URL}/api/payments/${paymentId}/refund`,
        {
          reason: "SAGA_COMPENSATION",
          sagaId: this.sagaId,
        },
        {
          timeout: 10000,
          headers: { "X-Idempotency-Key": `${this.sagaId}-refund-payment` },
        }
      );

      console.log(`✅ [Saga ${this.sagaId}] Paiement remboursé`);
    } catch (error) {
      throw new Error(`REFUND_PAYMENT_FAILED: ${error.message}`);
    }
  }

  // Persister l'état de la saga dans Redis
  async persistState() {
    const stateData = {
      sagaId: this.sagaId,
      state: this.state,
      currentStep: this.currentStep,
      bookingData: this.bookingData,
      compensationsNeeded: this.compensationsNeeded,
      createdResources: this.createdResources,
      timestamp: new Date().toISOString(),
    };

    await redisClient.setEx(
      `saga:${this.sagaId}`,
      86400,
      JSON.stringify(stateData)
    );
  }

  // Restaurer l'état d'une saga depuis Redis
  static async restore(sagaId) {
    const stateData = await redisClient.get(`saga:${sagaId}`);

    if (!stateData) {
      throw new Error(`Saga ${sagaId} non trouvée`);
    }

    const state = JSON.parse(stateData);
    const saga = new TourBookingSaga(sagaId, state.bookingData);
    saga.state = state.state;
    saga.currentStep = state.currentStep;
    saga.compensationsNeeded = state.compensationsNeeded;
    saga.createdResources = state.createdResources;

    return saga;
  }

  // Alerter les Ops en cas d'échec critique
  async alertOps(compensationName, error) {
    console.error("🚨 ALERT OPS - Échec de compensation critique:");
    console.error({
      sagaId: this.sagaId,
      compensation: compensationName,
      error: error.message,
      createdResources: this.createdResources,
      timestamp: new Date().toISOString(),
    });

    // Intégration PagerDuty, Slack, etc.
  }
}

module.exports = TourBookingSaga;
```

---

#### 4. API de l'Orchestrator Service

```javascript
// booking-orchestrator-service/src/routes/orchestrator.routes.js
const express = require("express");
const TourBookingSaga = require("../sagas/TourBookingSaga");

const router = express.Router();

// POST /api/orchestrator/bookings - Démarrer une nouvelle saga de réservation
router.post("/bookings", async (req, res) => {
  try {
    const bookingData = {
      tourId: req.body.tourId,
      userId: req.body.userId,
      numberOfSpots: req.body.numberOfSpots,
      totalPrice: req.body.totalPrice,
      paymentMethod: req.body.paymentMethod,
    };

    // Validation
    if (
      !bookingData.tourId ||
      !bookingData.userId ||
      !bookingData.numberOfSpots
    ) {
      return res.status(400).json({
        error: "Données manquantes : tourId, userId, numberOfSpots requis",
      });
    }

    // Créer et exécuter la saga
    const saga = new TourBookingSaga(null, bookingData);
    const result = await saga.execute();

    if (result.success) {
      return res.status(201).json({
        message: "Réservation réussie",
        sagaId: result.sagaId,
        bookingId: result.bookingId,
      });
    } else {
      return res.status(500).json({
        error: "Échec de la réservation",
        sagaId: result.sagaId,
        reason: result.error,
        failedAtStep: result.failedAtStep,
      });
    }
  } catch (error) {
    console.error("Erreur lors de l'exécution de la saga:", error);
    return res.status(500).json({ error: error.message });
  }
});

// GET /api/orchestrator/sagas/:sagaId - Récupérer l'état d'une saga
router.get("/sagas/:sagaId", async (req, res) => {
  try {
    const saga = await TourBookingSaga.restore(req.params.sagaId);

    return res.json({
      sagaId: saga.sagaId,
      state: saga.state,
      currentStep: saga.currentStep,
      createdResources: saga.createdResources,
    });
  } catch (error) {
    return res.status(404).json({ error: error.message });
  }
});

module.exports = router;
```

---

#### 5. Gestion d'État avec Redis

**Pourquoi Redis ?**

- **Persistance** : L'état de la saga persiste même si l'orchestrator redémarre
- **Recovery** : Possibilité de reprendre une saga interrompue
- **Audit** : Trace de toutes les sagas exécutées

**Structure de la clé** :

```
saga:<sagaId> → {
  sagaId: "abc-123",
  state: "PAYMENT_PROCESSED",
  currentStep: 3,
  bookingData: {...},
  compensationsNeeded: ["releaseTourSpots", "cancelBooking", "refundPayment"],
  createdResources: {
    reservationId: "res-456",
    bookingId: "book-789",
    paymentId: "pay-012"
  },
  timestamp: "2025-01-08T10:30:00Z"
}
```

---

#### 6. Configuration Docker Compose

```yaml
# booking-orchestrator-service/docker-compose.yml
version: "3.8"

services:
  orchestrator:
    build: .
    ports:
      - "3007:3007"
    environment:
      - PORT=3007
      - REDIS_URL=redis://redis:6379
      - TOUR_CATALOG_URL=http://tour-catalog-service:3001
      - BOOKING_URL=http://booking-management-service:3002
      - PAYMENT_URL=http://payment-service:3004
      - NOTIFICATION_URL=http://notification-service:3006
    depends_on:
      - redis
    networks:
      - microservices-network

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - microservices-network

volumes:
  redis_data:

networks:
  microservices-network:
    external: true
```

---

## Exercice 3 : Implémenter l'Idempotence dans le Payment Service

### 📝 Énoncé

Implémenter un mécanisme d'**idempotence** dans le **Payment Service** pour garantir qu'un utilisateur ne soit jamais débité deux fois pour le même paiement, même si l'API de paiement est appelée plusieurs fois (retries réseau, duplicatas, etc.).

**Exigences** :

- Utiliser des **Idempotency Keys** (`X-Idempotency-Key` header)
- Stocker les paiements déjà traités dans **Redis**
- Si une requête avec la même clé arrive, retourner le résultat original sans retraiter

---

### ✅ Solution

#### 1. Architecture de l'Idempotence

```
┌────────────────────────────────────────────────────────────┐
│                      Payment Service                       │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │         Idempotency Middleware                       │ │
│  │                                                      │ │
│  │  1. Extraire X-Idempotency-Key du header            │ │
│  │  2. Vérifier dans Redis si déjà traité              │ │
│  │  3. Si OUI → Retourner résultat stocké              │ │
│  │  4. Si NON → Continuer vers le handler              │ │
│  └──────────────────────────────────────────────────────┘ │
│                           ↓                                │
│  ┌──────────────────────────────────────────────────────┐ │
│  │         Payment Handler                              │ │
│  │                                                      │ │
│  │  1. Traiter le paiement (Stripe API)                │ │
│  │  2. Stocker le résultat dans Redis                  │ │
│  │  3. Retourner la réponse au client                  │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│                         Redis                              │
│                                                            │
│  Key: idempotency:<idempotency-key>                       │
│  Value: {                                                  │
│    paymentId: "pay_123",                                   │
│    status: "succeeded",                                    │
│    amount: 15000,                                          │
│    response: {...}                                         │
│  }                                                         │
│  TTL: 24 heures                                            │
└────────────────────────────────────────────────────────────┘
```

---

#### 2. Implémentation du Middleware d'Idempotence

```javascript
// payment-service/src/middleware/idempotency.middleware.js
const redis = require("redis");

const redisClient = redis.createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

(async () => {
  await redisClient.connect();
  console.log("✅ Redis connecté pour l'idempotence");
})();

const IDEMPOTENCY_TTL = 86400; // 24 heures

/**
 * Middleware d'idempotence pour les requêtes de paiement
 * Empêche le double traitement d'une même requête
 */
async function idempotencyMiddleware(req, res, next) {
  const idempotencyKey = req.headers["x-idempotency-key"];

  // Si pas de clé d'idempotence, continuer normalement
  if (!idempotencyKey) {
    console.warn("⚠️ Requête sans X-Idempotency-Key header");
    return next();
  }

  const redisKey = `idempotency:${idempotencyKey}`;

  try {
    // Vérifier si cette requête a déjà été traitée
    const cachedResponse = await redisClient.get(redisKey);

    if (cachedResponse) {
      console.log(`⏭️ Requête idempotente détectée - Clé: ${idempotencyKey}`);
      const response = JSON.parse(cachedResponse);

      // Retourner la réponse mise en cache
      return res.status(response.statusCode).json(response.body);
    }

    // Requête non encore traitée - continuer
    console.log(`✅ Nouvelle requête - Clé: ${idempotencyKey}`);

    // Intercepter la réponse pour la mettre en cache
    const originalJson = res.json.bind(res);

    res.json = function (body) {
      const statusCode = res.statusCode;

      // Stocker la réponse dans Redis
      const responseData = {
        statusCode,
        body,
        timestamp: new Date().toISOString(),
      };

      redisClient
        .setEx(redisKey, IDEMPOTENCY_TTL, JSON.stringify(responseData))
        .catch((err) => {
          console.error(
            "❌ Erreur lors de la mise en cache de la réponse:",
            err
          );
        });

      // Envoyer la réponse au client
      return originalJson(body);
    };

    next();
  } catch (error) {
    console.error("❌ Erreur dans le middleware d'idempotence:", error);
    // En cas d'erreur Redis, continuer sans idempotence (degraded mode)
    next();
  }
}

module.exports = idempotencyMiddleware;
```

---

#### 3. Implémentation du Payment Service avec Idempotence

```javascript
// payment-service/src/routes/payment.routes.js
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const idempotencyMiddleware = require("../middleware/idempotency.middleware");

const router = express.Router();

/**
 * POST /api/payments - Créer un nouveau paiement
 * Header requis: X-Idempotency-Key
 */
router.post("/", idempotencyMiddleware, async (req, res) => {
  const { userId, amount, currency, paymentMethod, bookingId } = req.body;
  const idempotencyKey = req.headers["x-idempotency-key"];

  console.log(
    `💳 Traitement du paiement - Booking: ${bookingId}, Montant: ${amount} ${currency}`
  );

  try {
    // Validation
    if (!userId || !amount || !paymentMethod) {
      return res.status(400).json({
        error: "Données manquantes : userId, amount, paymentMethod requis",
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        error: "Le montant doit être supérieur à 0",
      });
    }

    // Créer un paiement Stripe avec idempotence
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: Math.round(amount * 100), // Stripe utilise les centimes
        currency: currency || "usd",
        payment_method: paymentMethod,
        confirm: true,
        metadata: {
          userId,
          bookingId,
        },
      },
      {
        // Stripe supporte nativement l'idempotence
        idempotencyKey: idempotencyKey || uuidv4(),
      }
    );

    // Vérifier le statut du paiement
    if (paymentIntent.status === "succeeded") {
      console.log(`✅ Paiement réussi - PaymentIntent: ${paymentIntent.id}`);

      // Enregistrer le paiement dans la base de données
      const payment = await savePaymentToDatabase({
        paymentId: paymentIntent.id,
        userId,
        bookingId,
        amount,
        currency,
        status: "succeeded",
        stripePaymentIntentId: paymentIntent.id,
      });

      return res.status(201).json({
        message: "Paiement traité avec succès",
        paymentId: payment.paymentId,
        status: "succeeded",
        amount,
        currency,
      });
    } else if (paymentIntent.status === "requires_payment_method") {
      console.warn(
        `⚠️ Paiement nécessite une méthode de paiement - PaymentIntent: ${paymentIntent.id}`
      );

      return res.status(400).json({
        error: "Méthode de paiement invalide",
        paymentId: paymentIntent.id,
        status: "requires_payment_method",
      });
    } else {
      console.error(
        `❌ Paiement échoué - PaymentIntent: ${paymentIntent.id}, Status: ${paymentIntent.status}`
      );

      return res.status(500).json({
        error: "Échec du paiement",
        paymentId: paymentIntent.id,
        status: paymentIntent.status,
      });
    }
  } catch (error) {
    console.error("❌ Erreur lors du traitement du paiement:", error);

    return res.status(500).json({
      error: "Erreur interne du serveur",
      message: error.message,
    });
  }
});

/**
 * POST /api/payments/:paymentId/refund - Rembourser un paiement
 * Header requis: X-Idempotency-Key
 */
router.post("/:paymentId/refund", idempotencyMiddleware, async (req, res) => {
  const { paymentId } = req.params;
  const { reason } = req.body;
  const idempotencyKey = req.headers["x-idempotency-key"];

  console.log(`💸 Remboursement du paiement - PaymentId: ${paymentId}`);

  try {
    // Récupérer le paiement depuis la base de données
    const payment = await getPaymentFromDatabase(paymentId);

    if (!payment) {
      return res.status(404).json({ error: "Paiement non trouvé" });
    }

    if (payment.status === "refunded") {
      console.log(`⏭️ Paiement déjà remboursé - PaymentId: ${paymentId}`);
      return res.status(200).json({
        message: "Paiement déjà remboursé",
        paymentId,
        status: "refunded",
      });
    }

    // Créer un remboursement Stripe
    const refund = await stripe.refunds.create(
      {
        payment_intent: payment.stripePaymentIntentId,
        reason: reason || "requested_by_customer",
      },
      {
        idempotencyKey: idempotencyKey || uuidv4(),
      }
    );

    if (refund.status === "succeeded") {
      console.log(`✅ Remboursement réussi - RefundId: ${refund.id}`);

      // Mettre à jour le statut du paiement
      await updatePaymentStatus(paymentId, "refunded");

      return res.status(200).json({
        message: "Remboursement effectué avec succès",
        paymentId,
        refundId: refund.id,
        status: "refunded",
      });
    } else {
      console.error(
        `❌ Remboursement échoué - RefundId: ${refund.id}, Status: ${refund.status}`
      );

      return res.status(500).json({
        error: "Échec du remboursement",
        refundId: refund.id,
        status: refund.status,
      });
    }
  } catch (error) {
    console.error("❌ Erreur lors du remboursement:", error);

    return res.status(500).json({
      error: "Erreur interne du serveur",
      message: error.message,
    });
  }
});

// Fonctions helpers pour la base de données (simulation)
async function savePaymentToDatabase(paymentData) {
  // Simulation - Remplacer par insertion réelle en DB
  console.log("💾 Sauvegarde du paiement en base de données:", paymentData);
  return paymentData;
}

async function getPaymentFromDatabase(paymentId) {
  // Simulation - Remplacer par requête DB réelle
  console.log(
    "🔍 Récupération du paiement depuis la base de données:",
    paymentId
  );
  return {
    paymentId,
    stripePaymentIntentId: "pi_test_123",
    status: "succeeded",
  };
}

async function updatePaymentStatus(paymentId, status) {
  // Simulation - Remplacer par update DB réel
  console.log(`📝 Mise à jour du statut du paiement ${paymentId} -> ${status}`);
}

module.exports = router;
```

---

#### 4. Tests d'Idempotence

```javascript
// payment-service/tests/idempotency.test.js
const request = require("supertest");
const app = require("../src/app");
const { v4: uuidv4 } = require("uuid");

describe("Idempotence du Payment Service", () => {
  it("devrait retourner le même résultat pour des requêtes identiques", async () => {
    const idempotencyKey = uuidv4();

    const paymentData = {
      userId: "user_123",
      amount: 100.0,
      currency: "USD",
      paymentMethod: "pm_card_visa",
      bookingId: "booking_456",
    };

    // Première requête
    const response1 = await request(app)
      .post("/api/payments")
      .set("X-Idempotency-Key", idempotencyKey)
      .send(paymentData);

    expect(response1.status).toBe(201);
    expect(response1.body.status).toBe("succeeded");

    const paymentId1 = response1.body.paymentId;

    // Deuxième requête avec la même clé (simulant un retry)
    const response2 = await request(app)
      .post("/api/payments")
      .set("X-Idempotency-Key", idempotencyKey)
      .send(paymentData);

    expect(response2.status).toBe(201);
    expect(response2.body.paymentId).toBe(paymentId1); // Même paymentId
    expect(response2.body.status).toBe("succeeded");
  });

  it("ne devrait PAS facturer deux fois le client", async () => {
    const idempotencyKey = uuidv4();

    const paymentData = {
      userId: "user_789",
      amount: 500.0,
      currency: "USD",
      paymentMethod: "pm_card_visa",
      bookingId: "booking_789",
    };

    // Envoyer 5 requêtes identiques (simulant des retries réseau)
    const promises = Array(5)
      .fill()
      .map(() =>
        request(app)
          .post("/api/payments")
          .set("X-Idempotency-Key", idempotencyKey)
          .send(paymentData)
      );

    const responses = await Promise.all(promises);

    // Toutes les réponses doivent être identiques
    const paymentIds = responses.map((r) => r.body.paymentId);
    const uniquePaymentIds = new Set(paymentIds);

    expect(uniquePaymentIds.size).toBe(1); // Un seul paiement créé
    expect(responses.every((r) => r.status === 201)).toBe(true);
  });

  it("devrait créer des paiements différents avec des clés différentes", async () => {
    const paymentData = {
      userId: "user_999",
      amount: 200.0,
      currency: "USD",
      paymentMethod: "pm_card_visa",
      bookingId: "booking_999",
    };

    // Première requête avec clé A
    const response1 = await request(app)
      .post("/api/payments")
      .set("X-Idempotency-Key", uuidv4())
      .send(paymentData);

    // Deuxième requête avec clé B (différente)
    const response2 = await request(app)
      .post("/api/payments")
      .set("X-Idempotency-Key", uuidv4())
      .send(paymentData);

    expect(response1.body.paymentId).not.toBe(response2.body.paymentId); // Paiements différents
  });
});
```

---

#### 5. Bonnes Pratiques d'Idempotence

| Pratique                                       | Description                                                       |
| ---------------------------------------------- | ----------------------------------------------------------------- |
| **Header X-Idempotency-Key obligatoire**       | Requérir systématiquement ce header pour les opérations critiques |
| **TTL de 24 heures minimum**                   | Stocker les résultats suffisamment longtemps pour couvrir retries |
| **Retourner le statut HTTP original**          | Même code de statut (201, 400, 500) que la première requête       |
| **Supporter l'idempotence native des APIs**    | Stripe, PayPal supportent nativement l'idempotence                |
| **Logs détaillés**                             | Logger chaque requête idempotente détectée pour audit             |
| **Graceful degradation si Redis indisponible** | Continuer sans idempotence plutôt que bloquer complètement        |

---

#### 6. Exemple de Requête Client avec Idempotence

```javascript
// client-example.js
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");

async function createPaymentWithRetry(paymentData, maxRetries = 3) {
  const idempotencyKey = uuidv4(); // Générer une clé unique pour cette transaction

  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `🔄 Tentative ${attempt}/${maxRetries} - Idempotency Key: ${idempotencyKey}`
      );

      const response = await axios.post(
        "http://localhost:3004/api/payments",
        paymentData,
        {
          headers: {
            "X-Idempotency-Key": idempotencyKey, // Même clé pour tous les retries
          },
          timeout: 5000,
        }
      );

      console.log(`✅ Paiement réussi:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`❌ Tentative ${attempt} échouée:`, error.message);
      lastError = error;

      if (attempt < maxRetries) {
        // Backoff exponentiel avant de réessayer
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`⏳ Attente de ${delay}ms avant le prochain essai...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`Échec après ${maxRetries} tentatives: ${lastError.message}`);
}

// Exemple d'utilisation
(async () => {
  try {
    const payment = await createPaymentWithRetry({
      userId: "user_123",
      amount: 150.0,
      currency: "USD",
      paymentMethod: "pm_card_visa",
      bookingId: "booking_456",
    });

    console.log("✅ Transaction complétée:", payment.paymentId);
  } catch (error) {
    console.error("❌ Transaction échouée:", error.message);
  }
})();
```

---

## 🎯 Résumé des Solutions

### Exercice 1 : Choreography-based Saga (Réservation Hôtel)

- ✅ Séquence complète d'événements définie (room.reserved → payment.succeeded → loyalty.points.added)
- ✅ Événements de compensation pour chaque étape
- ✅ Gestion des scénarios d'échec critiques (compensation failed, double événement)
- ✅ Implémentation complète du Room Service consumer avec idempotence Redis
- ✅ Configuration Dead Letter Queue pour messages en échec

### Exercice 2 : Orchestration-based Saga (Booking Tourism App)

- ✅ Architecture d'orchestrator centralisé avec state machine
- ✅ Implémentation complète de la classe `TourBookingSaga`
- ✅ Gestion d'état persistée dans Redis (recovery possible)
- ✅ Compensations automatiques en ordre inverse (LIFO)
- ✅ API REST pour démarrer et interroger l'état des sagas

### Exercice 3 : Idempotence dans Payment Service

- ✅ Middleware d'idempotence avec Redis
- ✅ Support du header `X-Idempotency-Key`
- ✅ Cache des réponses pendant 24 heures
- ✅ Tests unitaires couvrant les cas de duplicata
- ✅ Exemple client avec retry logic et backoff exponentiel

---

**🎉 Félicitations ! Vous maîtrisez maintenant le Pattern Saga et l'idempotence pour les transactions distribuées.**

---

## 📚 Ressources Complémentaires

- [Microservices Patterns - Chris Richardson](https://microservices.io/patterns/data/saga.html)
- [Stripe API Idempotency](https://stripe.com/docs/api/idempotent_requests)
- [RabbitMQ Dead Letter Exchanges](https://www.rabbitmq.com/dlx.html)
- [Redis Best Practices for Idempotency](https://redis.io/topics/distlock)
