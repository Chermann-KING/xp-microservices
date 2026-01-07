# Leçon 5.3 - Pattern Saga pour les Transactions Distribuées

**Module 5** : Architecture Event-Driven et Communication Asynchrone

---

## Objectifs pédagogiques

- Comprendre les défis des transactions distribuées dans les architectures microservices
- Maîtriser le **Pattern Saga** et ses deux approches (Choreography et Orchestration)
- Implémenter des **transactions compensatoires** pour gérer les échecs
- Appliquer les meilleures pratiques pour les sagas (idempotence, retry, state management)
- Utiliser le **Transactional Outbox Pattern** pour garantir la cohérence

## Prérequis

- Leçon 5.1 : Architecture Event-Driven
- Leçon 5.2 : Message Queues (RabbitMQ/Kafka)
- Compréhension des propriétés ACID des transactions
- Connaissance des patterns de messaging

---

## Introduction

Les transactions distribuées à travers plusieurs microservices présentent des défis significatifs en raison de la nature indépendante de chaque service et de l'absence d'un coordinateur de transactions global. Le **Pattern Saga** fournit une solution pour gérer ces transactions, garantissant la cohérence des données même lorsque des pannes se produisent dans un environnement distribué, en s'appuyant sur les stratégies de communication asynchrone discutées précédemment avec les message queues.

---

## 1. Transactions Distribuées et Propriétés ACID

### 1.1 Les Propriétés ACID

Dans une application monolithique, les transactions adhèrent typiquement aux propriétés **ACID** :

| Propriété       | Description                                                                   |
| --------------- | ----------------------------------------------------------------------------- |
| **Atomicity**   | La transaction est tout-ou-rien : soit tout réussit, soit tout échoue         |
| **Consistency** | La transaction fait passer le système d'un état valide à un autre état valide |
| **Isolation**   | Les transactions concurrentes n'interfèrent pas entre elles                   |
| **Durability**  | Une fois validée, la transaction persiste même en cas de panne système        |

**Exemple monolithique** :

```sql
BEGIN TRANSACTION;
  INSERT INTO bookings (tour_id, user_id, status) VALUES (1, 123, 'pending');
  UPDATE tours SET available_seats = available_seats - 1 WHERE id = 1;
  INSERT INTO payments (booking_id, amount, status) VALUES (1, 299.99, 'completed');
COMMIT;
```

Un seul gestionnaire de transactions coordonne les changements à travers plusieurs tables.

### 1.2 Le Défi des Microservices

Dans une architecture microservices, **chaque service gère souvent sa propre base de données**, rendant une transaction ACID globale impossible.

```
┌──────────────────────────────────────────────────────────────────┐
│        PROBLÈME: TRANSACTION DISTRIBUÉE SANS COORDINATION        │
└──────────────────────────────────────────────────────────────────┘

Booking Service          Payment Service         Tour Catalog Service
  (DB: bookings)           (DB: payments)          (DB: tours)
       │                         │                        │
       │ 1. CREATE booking       │                        │
       │ ✅ Success             │                        │
       │                         │                        │
       │                         │ 2. PROCESS payment     │
       │                         │ ❌ FAILED!            │
       │                         │                        │
       │                         │                        │ 3. UPDATE seats
       │                         │                        │ ⚠️ Ne devrait pas
       │                         │                        │    se produire!

❌ Incohérence: Réservation existe, paiement échoué, places décrémentées
```

---

## 2. Le Pattern Saga : Vue d'Ensemble

### 2.1 Définition

Le **Pattern Saga** est une méthode pour gérer les transactions distribuées. Une saga est une **séquence de transactions locales** où :

- Chaque transaction met à jour les données au sein d'un seul service
- Chaque transaction publie un événement pour déclencher la prochaine transaction locale
- Si une transaction locale échoue, la saga exécute des **transactions compensatoires** pour annuler les changements effectués par les transactions précédentes

### 2.2 Cas d'Usage : Réservation de Tour

Considérons notre Application de Réservation Touristique. Une réservation de tour implique plusieurs services :

```
┌──────────────────────────────────────────────────────────────────┐
│           FLUX DE RÉSERVATION - SERVICES IMPLIQUÉS               │
└──────────────────────────────────────────────────────────────────┘

1. Booking Management Service
   └──> Crée un enregistrement de réservation PENDING

2. Payment Service
   └──> Traite le paiement

3. Tour Catalog Service
   └──> Décrémente les places disponibles

4. Notification Service
   └──> Envoie un email de confirmation
```

**Problématique** : Si le paiement échoue après la création de la réservation, le système doit s'assurer que :

- ❌ Les places du tour ne sont PAS décrémentées
- ✅ L'enregistrement de réservation est annulé ou compensé

### 2.3 Deux Approches de Coordination

Il existe deux manières principales de coordonner les sagas :

| Approche          | Description                                                                             | Avantage Principal                |
| ----------------- | --------------------------------------------------------------------------------------- | --------------------------------- |
| **Choreography**  | Chaque service produit et écoute des événements, décidant quand exécuter sa transaction | Découplage élevé                  |
| **Orchestration** | Un orchestrateur central dit à chaque service quelle transaction locale exécuter        | Flux clair et facile à comprendre |

---

## 3. Saga basée sur la Chorégraphie (Choreography)

### 3.1 Principe

Dans une saga basée sur la chorégraphie, il n'y a **pas d'orchestrateur central**. Chaque service impliqué écoute les événements et réagit à ceux-ci.

```
┌──────────────────────────────────────────────────────────────────┐
│              SAGA CHOREOGRAPHY - FLUX D'ÉVÉNEMENTS               │
└──────────────────────────────────────────────────────────────────┘

User Request
     │
     v
Booking Service ──┐
                  │ Publier: booking.pending
                  v
             Event Broker
                  │
    ┌─────────────┼─────────────┐
    │             │             │
    v             v             v
Payment      Tour Catalog   Notification
Service       Service         Service
    │
    ├──> Success: payment.processed
    └──> Failure: payment.failed
```

### 3.2 Exemple Détaillé : Réservation de Tour avec Choreography

#### Étape 1 : Initiation de la Réservation

**Booking Management Service** :

```javascript
// booking-service/src/controllers/bookingController.js
async function initiateBooking(req, res) {
  const { tourId, userId, participants } = req.body;

  // Transaction locale 1: Créer réservation PENDING
  const booking = await Booking.create({
    tourId,
    userId,
    participants,
    status: "PENDING",
    createdAt: new Date(),
  });

  // Publier événement
  await eventPublisher.publish("booking.pending", {
    bookingId: booking.id,
    tourId,
    userId,
    participants,
    totalPrice: calculatePrice(tourId, participants),
  });

  res.status(201).json({
    message: "Réservation initiée",
    bookingId: booking.id,
    status: "PENDING",
  });
}
```

#### Étape 2 : Traitement du Paiement

**Payment Service** :

```javascript
// payment-service/src/consumers/bookingConsumer.js
eventBroker.subscribe("booking.pending", async (event) => {
  const { bookingId, totalPrice, userId } = event.data;

  try {
    // Transaction locale 2: Traiter le paiement
    const payment = await processPayment({
      bookingId,
      userId,
      amount: totalPrice,
    });

    if (payment.success) {
      // Publier succès
      await eventPublisher.publish("payment.processed", {
        bookingId,
        paymentId: payment.id,
        amount: totalPrice,
      });
    } else {
      throw new Error("Paiement refusé");
    }
  } catch (error) {
    // Publier échec
    await eventPublisher.publish("payment.failed", {
      bookingId,
      reason: error.message,
    });
  }
});
```

#### Étape 3 : Mise à Jour du Catalogue

**Tour Catalog Service** :

```javascript
// tour-catalog-service/src/consumers/paymentConsumer.js
eventBroker.subscribe("payment.processed", async (event) => {
  const { bookingId, tourId, participants } = event.data;

  try {
    // Transaction locale 3: Décrémenter les places
    const tour = await Tour.findById(tourId);

    if (tour.availableSeats >= participants) {
      tour.availableSeats -= participants;
      await tour.save();

      // Publier succès
      await eventPublisher.publish("seats.decremented", {
        bookingId,
        tourId,
        seatsReserved: participants,
      });
    } else {
      throw new Error("Places insuffisantes");
    }
  } catch (error) {
    // Publier échec
    await eventPublisher.publish("seats.decrement.failed", {
      bookingId,
      tourId,
      reason: error.message,
    });
  }
});
```

#### Étape 4 : Finalisation de la Réservation

**Booking Management Service** (écoute les résultats) :

```javascript
// booking-service/src/consumers/sagaConsumer.js

// Cas de succès
eventBroker.subscribe("seats.decremented", async (event) => {
  const { bookingId } = event.data;

  // Mettre à jour le statut à CONFIRMED
  await Booking.update(
    { id: bookingId },
    { status: "CONFIRMED", confirmedAt: new Date() }
  );

  // Publier événement de confirmation finale
  await eventPublisher.publish("booking.confirmed", {
    bookingId,
  });
});

// Cas d'échec du paiement - COMPENSATION
eventBroker.subscribe("payment.failed", async (event) => {
  const { bookingId, reason } = event.data;

  // Transaction compensatoire 1: Annuler la réservation
  await Booking.update(
    { id: bookingId },
    { status: "CANCELLED", cancelReason: reason }
  );

  // Publier événement d'annulation
  await eventPublisher.publish("booking.cancelled", {
    bookingId,
    reason,
  });
});

// Cas d'échec de décrémentation - COMPENSATION
eventBroker.subscribe("seats.decrement.failed", async (event) => {
  const { bookingId, reason } = event.data;

  // Transaction compensatoire 1: Annuler la réservation
  await Booking.update(
    { id: bookingId },
    { status: "CANCELLED", cancelReason: reason }
  );

  // Transaction compensatoire 2: Demander remboursement
  await eventPublisher.publish("payment.refund.needed", {
    bookingId,
  });

  // Publier événement d'annulation
  await eventPublisher.publish("booking.cancelled", {
    bookingId,
    reason,
  });
});
```

### 3.3 Avantages et Inconvénients

**Avantages** ✅ :

- Implémentation plus simple pour les sagas simples
- Découplage élevé : les services communiquent directement via événements
- Pas de point unique de défaillance (single point of failure)

**Inconvénients** ❌ :

- Peut devenir complexe à gérer avec l'augmentation du nombre de participants ("spaghetti" d'événements)
- Difficile de suivre la progression globale de la saga
- Risque de dépendances cycliques si mal conçu

---

## 4. Saga basée sur l'Orchestration (Orchestration)

### 4.1 Principe

Dans une saga basée sur l'orchestration, un **service dédié** (l'orchestrateur) gère la transaction distribuée. L'orchestrateur est responsable de coordonner l'exécution des transactions locales en envoyant des commandes aux services participants et en traitant leurs réponses.

```
┌──────────────────────────────────────────────────────────────────┐
│               SAGA ORCHESTRATION - FLUX CENTRALISÉ               │
└──────────────────────────────────────────────────────────────────┘

                         Booking Orchestrator
                                │
                ┌───────────────┼───────────────┐
                │               │               │
            Command 1       Command 2       Command 3
                │               │               │
                v               v               v
          Booking         Payment          Tour Catalog
          Service         Service           Service
                │               │               │
              Event 1         Event 2         Event 3
                │               │               │
                └───────────────┴───────────────┘
                                │
                                v
                         Orchestrator
                     (Décide de la suite)
```

### 4.2 Exemple Détaillé : Réservation de Tour avec Orchestration

#### Service Orchestrateur

```javascript
// booking-orchestrator-service/src/sagas/tourBookingSaga.js
const { v4: uuidv4 } = require("uuid");

class TourBookingSaga {
  constructor(sagaId, bookingData) {
    this.sagaId = sagaId || uuidv4();
    this.bookingData = bookingData;
    this.state = "STARTED";
    this.currentStep = 0;
    this.compensationsNeeded = [];
  }

  /**
   * Exécuter la saga
   */
  async execute() {
    try {
      // Étape 1: Créer la réservation
      await this.createBooking();
      this.currentStep = 1;
      this.compensationsNeeded.push("cancelBooking");

      // Étape 2: Traiter le paiement
      await this.processPayment();
      this.currentStep = 2;
      this.compensationsNeeded.push("refundPayment");

      // Étape 3: Décrémenter les places
      await this.decrementSeats();
      this.currentStep = 3;
      this.compensationsNeeded.push("incrementSeats");

      // Étape 4: Confirmer la réservation
      await this.confirmBooking();
      this.currentStep = 4;

      // Étape 5: Envoyer notification
      await this.sendNotification();

      this.state = "COMPLETED";
      await this.persistState();

      return { success: true, bookingId: this.bookingData.bookingId };
    } catch (error) {
      console.error(
        `Saga ${this.sagaId} échouée à l'étape ${this.currentStep}:`,
        error
      );
      await this.compensate();
      this.state = "FAILED";
      await this.persistState();

      return { success: false, error: error.message };
    }
  }

  /**
   * Étape 1: Créer réservation PENDING
   */
  async createBooking() {
    const command = {
      type: "CREATE_BOOKING",
      data: this.bookingData,
    };

    const response = await this.sendCommand("booking-service", command);

    if (!response.success) {
      throw new Error("Échec de création de réservation");
    }

    this.bookingData.bookingId = response.bookingId;
  }

  /**
   * Étape 2: Traiter le paiement
   */
  async processPayment() {
    const command = {
      type: "PROCESS_PAYMENT",
      data: {
        bookingId: this.bookingData.bookingId,
        userId: this.bookingData.userId,
        amount: this.bookingData.totalPrice,
      },
    };

    const response = await this.sendCommand("payment-service", command);

    if (!response.success) {
      throw new Error(`Paiement échoué: ${response.reason}`);
    }

    this.bookingData.paymentId = response.paymentId;
  }

  /**
   * Étape 3: Décrémenter les places
   */
  async decrementSeats() {
    const command = {
      type: "DECREMENT_SEATS",
      data: {
        tourId: this.bookingData.tourId,
        participants: this.bookingData.participants,
      },
    };

    const response = await this.sendCommand("tour-catalog-service", command);

    if (!response.success) {
      throw new Error(`Échec de décrémentation: ${response.reason}`);
    }
  }

  /**
   * Étape 4: Confirmer la réservation
   */
  async confirmBooking() {
    const command = {
      type: "CONFIRM_BOOKING",
      data: {
        bookingId: this.bookingData.bookingId,
      },
    };

    await this.sendCommand("booking-service", command);
  }

  /**
   * Étape 5: Envoyer notification
   */
  async sendNotification() {
    const command = {
      type: "SEND_BOOKING_CONFIRMATION",
      data: {
        bookingId: this.bookingData.bookingId,
        userId: this.bookingData.userId,
      },
    };

    // Non bloquant - on ne fail pas la saga si la notification échoue
    await this.sendCommand("notification-service", command).catch((err) => {
      console.warn("Échec de notification (non critique):", err);
    });
  }

  /**
   * Compenser les transactions en ordre inverse
   */
  async compensate() {
    console.log(`🔄 Début des compensations pour saga ${this.sagaId}`);

    // Exécuter les compensations en ordre inverse
    for (let i = this.compensationsNeeded.length - 1; i >= 0; i--) {
      const compensationAction = this.compensationsNeeded[i];

      try {
        await this[compensationAction]();
        console.log(`✅ Compensation ${compensationAction} réussie`);
      } catch (error) {
        console.error(`❌ Échec de compensation ${compensationAction}:`, error);
        // Dans un vrai système, alerter l'équipe ops
        await this.alertOps(compensationAction, error);
      }
    }
  }

  /**
   * Compensation 1: Annuler la réservation
   */
  async cancelBooking() {
    const command = {
      type: "CANCEL_BOOKING",
      data: {
        bookingId: this.bookingData.bookingId,
        reason: "Saga compensation",
      },
    };

    await this.sendCommand("booking-service", command);
  }

  /**
   * Compensation 2: Rembourser le paiement
   */
  async refundPayment() {
    const command = {
      type: "REFUND_PAYMENT",
      data: {
        paymentId: this.bookingData.paymentId,
        reason: "Saga compensation",
      },
    };

    await this.sendCommand("payment-service", command);
  }

  /**
   * Compensation 3: Incrémenter les places
   */
  async incrementSeats() {
    const command = {
      type: "INCREMENT_SEATS",
      data: {
        tourId: this.bookingData.tourId,
        participants: this.bookingData.participants,
      },
    };

    await this.sendCommand("tour-catalog-service", command);
  }

  /**
   * Envoyer une commande à un service
   */
  async sendCommand(serviceName, command) {
    // Implémentation dépend de votre architecture:
    // - Appel HTTP synchrone
    // - Message queue avec réponse
    // - gRPC

    const timeout = 5000; // 5 secondes

    return await commandSender.send(serviceName, command, { timeout });
  }

  /**
   * Persister l'état de la saga (pour reprise après crash)
   */
  async persistState() {
    await SagaState.upsert({
      sagaId: this.sagaId,
      state: this.state,
      currentStep: this.currentStep,
      bookingData: JSON.stringify(this.bookingData),
      compensationsNeeded: JSON.stringify(this.compensationsNeeded),
      updatedAt: new Date(),
    });
  }

  /**
   * Alerter l'équipe ops en cas d'échec de compensation
   */
  async alertOps(compensationAction, error) {
    await alertingSystem.send({
      severity: "CRITICAL",
      message: `Échec de compensation dans saga ${this.sagaId}`,
      details: {
        compensationAction,
        error: error.message,
        bookingData: this.bookingData,
      },
    });
  }
}

module.exports = TourBookingSaga;
```

#### Démarrage de la Saga

```javascript
// booking-orchestrator-service/src/controllers/sagaController.js
const TourBookingSaga = require("../sagas/tourBookingSaga");

async function startTourBookingSaga(req, res) {
  const bookingData = {
    tourId: req.body.tourId,
    userId: req.body.userId,
    participants: req.body.participants,
    totalPrice: calculatePrice(req.body.tourId, req.body.participants),
  };

  // Créer et exécuter la saga
  const saga = new TourBookingSaga(null, bookingData);
  const result = await saga.execute();

  if (result.success) {
    res.status(201).json({
      message: "Réservation confirmée",
      bookingId: result.bookingId,
    });
  } else {
    res.status(400).json({
      message: "Échec de la réservation",
      error: result.error,
    });
  }
}
```

### 4.3 Avantages et Inconvénients

**Avantages** ✅ :

- Séparation claire des responsabilités : l'orchestrateur gère le workflow
- Plus facile à comprendre le flux global
- Implémentation plus simple pour les sagas complexes avec de nombreuses étapes
- Suivi facile de l'état et de la progression
- Facilite le debugging et le monitoring

**Inconvénients** ❌ :

- Point unique de défaillance si l'orchestrateur n'est pas hautement disponible
- Couplage accru entre l'orchestrateur et les services participants
- Peut devenir un goulot d'étranglement si mal conçu

---

## 5. Transactions Compensatoires

### 5.1 Principe

Les **transactions compensatoires** sont des opérations conçues pour annuler les effets d'une transaction locale précédente si une étape ultérieure de la saga échoue.

**Règle importante** : Chaque transaction locale qui effectue un changement d'état doit avoir une transaction compensatoire correspondante.

### 5.2 Tableau des Compensations

| Étape de la Saga       | Transaction Locale            | Transaction Compensatoire     |
| ---------------------- | ----------------------------- | ----------------------------- |
| **Booking Management** | Créer réservation PENDING     | Mettre à jour → CANCELLED     |
| **Payment Service**    | Traiter le paiement           | Rembourser le paiement        |
| **Tour Catalog**       | Décrémenter les places        | Incrémenter les places        |
| **Notification**       | Envoyer email de confirmation | (Pas de compensation directe) |

### 5.3 Exemple de Compensation en Code

```javascript
// Scénario: Échec de décrémentation des places

/**
 * Transaction Locale: Traiter le paiement
 */
async function processPayment(bookingId, amount) {
  const payment = await Payment.create({
    bookingId,
    amount,
    status: "COMPLETED",
    processedAt: new Date(),
  });

  return payment;
}

/**
 * Transaction Compensatoire: Rembourser le paiement
 */
async function refundPayment(paymentId) {
  const payment = await Payment.findById(paymentId);

  if (!payment || payment.status !== "COMPLETED") {
    throw new Error("Paiement introuvable ou déjà remboursé");
  }

  // Créer un enregistrement de remboursement
  const refund = await Refund.create({
    paymentId: payment.id,
    amount: payment.amount,
    reason: "Saga compensation - échec de réservation",
    processedAt: new Date(),
  });

  // Mettre à jour le paiement
  payment.status = "REFUNDED";
  payment.refundId = refund.id;
  await payment.save();

  return refund;
}
```

---

## 6. Meilleures Pratiques et Considérations

### 6.1 Idempotence

Les services doivent garantir que leurs transactions locales sont **idempotentes** : exécuter une transaction plusieurs fois produit le même résultat qu'une seule exécution.

```javascript
// Exemple: Idempotence avec clé unique
async function processPaymentIdempotent(paymentRequest) {
  const { idempotencyKey, bookingId, amount } = paymentRequest;

  // Vérifier si déjà traité
  const existingPayment = await Payment.findOne({ idempotencyKey });

  if (existingPayment) {
    console.log(`Paiement déjà traité: ${idempotencyKey}`);
    return existingPayment; // Retourner le résultat précédent
  }

  // Traiter le nouveau paiement
  const payment = await Payment.create({
    idempotencyKey,
    bookingId,
    amount,
    status: "COMPLETED",
  });

  return payment;
}
```

### 6.2 Retry et Timeouts

Implémenter des mécanismes de retry robustes avec backoff exponentiel pour les échecs transitoires.

```javascript
/**
 * Retry avec backoff exponentiel
 */
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }

      const delayMs = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
      console.log(
        `Tentative ${attempt} échouée. Nouvelle tentative dans ${delayMs}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

// Utilisation
const payment = await retryWithBackoff(() => processPayment(bookingId, amount));
```

### 6.3 Gestion d'État (pour Orchestrateurs)

L'orchestrateur doit persister son état pour pouvoir reprendre après un crash.

```javascript
// Modèle de base de données pour l'état de la saga
const SagaStateSchema = {
  sagaId: String, // UUID unique
  sagaType: String, // 'TourBooking', 'PackageBooking', etc.
  state: String, // 'STARTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED'
  currentStep: Number,
  bookingData: Object,
  compensationsNeeded: Array,
  createdAt: Date,
  updatedAt: Date,
};
```

### 6.4 Monitoring et Observabilité

Implémenter un tracing distribué pour suivre le flux de la saga.

```javascript
// Exemple avec correlation ID
const correlationId = uuidv4();

// Propager dans tous les événements/commandes
await eventPublisher.publish("booking.pending", {
  correlationId,
  bookingId,
  // ... autres données
});

// Logger avec correlation ID
logger.info(`[${correlationId}] Étape 2: Traitement du paiement`);
```

---

## 7. Pattern Transactional Outbox

### 7.1 Problème

Comment garantir l'**atomicité** entre :

- La transaction locale de la base de données
- La publication d'un événement vers la message queue

```
❌ PROBLÈME:
1. Booking.create() → ✅ Success
2. eventPublisher.publish() → ❌ Crash avant publication!

Résultat: Réservation créée mais aucun événement publié
```

### 7.2 Solution : Transactional Outbox

Sauvegarder l'événement dans une table "outbox" dans la **même transaction** que les données métier.

```javascript
// booking-service/src/services/bookingService.js
async function createBookingWithOutbox(bookingData) {
  const transaction = await sequelize.transaction();

  try {
    // 1. Créer la réservation
    const booking = await Booking.create(bookingData, { transaction });

    // 2. Sauvegarder l'événement dans la table outbox
    await OutboxEvent.create(
      {
        eventType: "booking.pending",
        aggregateId: booking.id,
        payload: JSON.stringify({
          bookingId: booking.id,
          tourId: booking.tourId,
          userId: booking.userId,
          totalPrice: booking.totalPrice,
        }),
        createdAt: new Date(),
      },
      { transaction }
    );

    // 3. Commit de la transaction (tout-ou-rien)
    await transaction.commit();

    return booking;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
```

### 7.3 Outbox Relay

Un processus séparé lit les événements de la table outbox et les publie.

```javascript
// booking-service/src/workers/outboxRelay.js
async function processOutboxEvents() {
  // Récupérer les événements non publiés
  const events = await OutboxEvent.findAll({
    where: { published: false },
    order: [["createdAt", "ASC"]],
    limit: 100,
  });

  for (const event of events) {
    try {
      // Publier l'événement vers RabbitMQ/Kafka
      await eventPublisher.publish(event.eventType, JSON.parse(event.payload));

      // Marquer comme publié
      event.published = true;
      event.publishedAt = new Date();
      await event.save();

      console.log(`✅ Événement ${event.id} publié`);
    } catch (error) {
      console.error(
        `❌ Échec de publication de l'événement ${event.id}:`,
        error
      );
      // Retry plus tard
    }
  }
}

// Exécuter toutes les 5 secondes
setInterval(processOutboxEvents, 5000);
```

---

## 8. Exercices Pratiques

### Exercice 1 : Concevoir une Saga en Choreography pour Réservation d'Hôtel

**Contexte** : Un utilisateur souhaite réserver une chambre d'hôtel. Cela implique :

1. **Booking Service** : Crée une réservation en attente
2. **Payment Service** : Traite le paiement
3. **Room Inventory Service** : Décrémente la disponibilité des chambres
4. **Loyalty Points Service** : Attribue des points de fidélité

**Tâches** :

1. Dessinez la séquence d'événements et de transactions locales
2. Définissez les transactions compensatoires pour chaque étape si une panne survient
3. Décrivez le flux en cas de :
   - Échec du paiement
   - Chambre non disponible
   - Échec d'attribution des points (non critique)

---

### Exercice 2 : Convertir en Saga Orchestrée

**Contexte** : Reprendre l'exemple de réservation de tour de cette leçon (Booking, Payment, Tour Catalog, Notification).

**Tâches** :

1. Concevoir un service `TourBookingOrchestrator`
2. Détailler la séquence de commandes que l'orchestrateur envoie
3. Spécifier comment l'orchestrateur gère l'état et coordonne les compensations pour :
   - Échec de paiement
   - Échec de décrémentation des places

---

### Exercice 3 : Idempotence dans le Payment Service

**Contexte** : Le Payment Service reçoit une commande `ProcessPaymentCommand`.

**Questions** :

1. Comment le Payment Service peut-il garantir l'idempotence ?
2. Quelles données sont nécessaires ?
3. Quelle logique implémenter pour éviter de facturer un client deux fois ?
4. Proposez une implémentation en code

---

## Conclusion

Le **Pattern Saga** est fondamental pour construire des systèmes distribués fiables, particulièrement lorsqu'on traite des processus métier qui couvrent plusieurs microservices.

**Points clés** :

✅ Comprendre les deux types de coordination (**Choreography** vs **Orchestration**) et leurs compromis

✅ L'importance des **transactions compensatoires** pour garantir la cohérence des données

✅ Les concepts d'**idempotence**, **transactional outbox** et gestion d'erreurs robuste sont essentiels

✅ Le monitoring et le tracing distribué sont cruciaux pour le debugging

**Prochaine étape** : Dans les prochaines leçons, nous approfondirons la conception et l'implémentation de services de notifications (qui jouent souvent un rôle dans les sagas) et la gestion de la concurrence pour consolider davantage ces patterns de transactions distribuées.

---

## Navigation

- **⬅️ Précédent** : [Leçon 5.2 - Communication Asynchrone avec Message Queues (RabbitMQ, Kafka)](lecon-2-message-queues.md)
- **➡️ Suivant** : [Leçon 5.4 - Mise en œuvre du Microservice de Notifications](lecon-4-notification-microservice.md)
- **🏠 Sommaire** : [Retour au README](README.md)

---

## Ressources Complémentaires

- 📖 [Microservices Patterns - Chris Richardson (Saga Pattern)](https://microservices.io/patterns/data/saga.html)
- 📖 [Martin Fowler - Saga Pattern](https://martinfowler.com/articles/patterns-of-distributed-systems/saga.html)
- 📖 [AWS - Saga Execution Coordinator](https://aws.amazon.com/blogs/architecture/saga-orchestration-with-aws-step-functions/)
- 🎥 [GOTO 2021 - Saga Pattern for Microservices](https://www.youtube.com/watch?v=YPbGW3Fnmbc)
- 📖 [Eventuate Tram Sagas](https://eventuate.io/docs/manual/eventuate-tram/latest/getting-started-eventuate-tram-sagas.html)
