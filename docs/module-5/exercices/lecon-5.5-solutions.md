# Solutions - Leçon 5.5 : Gestion de la Concurrence et de l'Idempotence

## Exercice 1 : Implémenter le Verrouillage Optimiste avec Retry

**Objectif** : Modifier le service Tour Catalog pour utiliser le verrouillage optimiste avec logique de retry.

### Solution Complète

#### Étape 1 : Migration de Base de Données

Ajouter la colonne `optimistic_lock_version` à la table `tours`.

```sql
-- migrations/add-optimistic-lock-version-to-tours.sql
ALTER TABLE tours ADD COLUMN optimistic_lock_version INT DEFAULT 0;
```

**Avec Sequelize Migration**

```javascript
// migrations/YYYYMMDDHHMMSS-add-optimistic-lock-version.js
"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("tours", "optimistic_lock_version", {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("tours", "optimistic_lock_version");
  },
};
```

**Exécuter la migration**

```bash
npx sequelize-cli db:migrate
```

---

#### Étape 2 : Modèle Tour avec Verrouillage Optimiste

Mettre à jour le modèle Sequelize pour inclure le champ de version.

```javascript
// models/Tour.js
const { Model, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  class Tour extends Model {
    static associate(models) {
      // Associations si nécessaire
    }
  }

  Tour.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      available_seats: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      optimistic_lock_version: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "Tour",
      tableName: "tours",
      timestamps: true,
      underscored: true,
    }
  );

  return Tour;
};
```

---

#### Étape 3 : Gestionnaire d'Événements avec Verrouillage Optimiste

Implémenter le gestionnaire pour `BookingCreated` avec retry et backoff exponentiel.

```javascript
// handlers/bookingCreatedHandler.js
const { Tour } = require("../models");

/**
 * Gestionnaire d'événements avec verrouillage optimiste et retry
 * @param {Object} event - L'événement BookingCreated
 * @param {number} maxRetries - Nombre maximum de tentatives (défaut: 3)
 * @returns {Promise<void>}
 */
async function handleBookingCreated(event, maxRetries = 3) {
  const { eventId, payload } = event;
  const { tourId, seatsBooked } = payload;

  console.log(
    `[BookingCreatedHandler] Processing event ${eventId} for tour ${tourId}`
  );

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Lire la version actuelle de la visite
      const tour = await Tour.findByPk(tourId);

      if (!tour) {
        console.error(`[BookingCreatedHandler] Tour ${tourId} not found`);
        return;
      }

      // Vérifier la disponibilité
      if (tour.available_seats < seatsBooked) {
        console.warn(
          `[BookingCreatedHandler] Not enough seats for tour ${tourId}. ` +
            `Available: ${tour.available_seats}, Requested: ${seatsBooked}`
        );
        return;
      }

      // Capturer la version actuelle
      const currentVersion = tour.optimistic_lock_version;

      // Mise à jour atomique avec vérification de version
      const [updatedRows] = await Tour.update(
        {
          available_seats: tour.available_seats - seatsBooked,
          optimistic_lock_version: currentVersion + 1,
        },
        {
          where: {
            id: tourId,
            optimistic_lock_version: currentVersion, // Condition de verrouillage
          },
        }
      );

      if (updatedRows === 0) {
        // Conflit détecté - une autre transaction a mis à jour en parallèle
        console.warn(
          `[BookingCreatedHandler] Optimistic lock conflict for tour ${tourId}. ` +
            `Attempt ${
              attempt + 1
            }/${maxRetries}. Current version: ${currentVersion}`
        );

        // Backoff exponentiel : 100ms, 200ms, 400ms
        const backoffDelay = Math.pow(2, attempt) * 100;
        console.log(`[BookingCreatedHandler] Retrying in ${backoffDelay}ms...`);

        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        continue; // Réessayer
      }

      // Succès !
      const newAvailableSeats = tour.available_seats - seatsBooked;
      console.log(
        `[BookingCreatedHandler] Tour ${tourId} updated successfully. ` +
          `Available seats: ${tour.available_seats} -> ${newAvailableSeats}. ` +
          `Version: ${currentVersion} -> ${currentVersion + 1}`
      );

      return;
    } catch (error) {
      console.error(
        `[BookingCreatedHandler] Error updating tour ${tourId} (attempt ${
          attempt + 1
        }/${maxRetries}):`,
        error
      );

      // Si c'est une erreur non liée à la concurrence, ne pas réessayer
      if (error.name !== "SequelizeOptimisticLockError") {
        throw error;
      }
    }
  }

  // Toutes les tentatives ont échoué
  const errorMessage = `Failed to update tour ${tourId} after ${maxRetries} attempts due to optimistic lock conflicts`;
  console.error(`[BookingCreatedHandler] ${errorMessage}`);
  throw new Error(errorMessage);
}

module.exports = { handleBookingCreated };
```

---

#### Étape 4 : Consommateur d'Événements RabbitMQ

Intégrer le gestionnaire avec RabbitMQ pour consommer les événements.

```javascript
// consumers/bookingEventsConsumer.js
const amqp = require("amqplib");
const { handleBookingCreated } = require("../handlers/bookingCreatedHandler");

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost:5672";
const EXCHANGE_NAME = "booking-events";
const QUEUE_NAME = "tour-catalog.booking-created";
const ROUTING_KEY = "booking.created";

async function startConsumer() {
  try {
    // Connexion à RabbitMQ
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    // Déclarer l'exchange
    await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: true });

    // Déclarer la queue
    await channel.assertQueue(QUEUE_NAME, { durable: true });

    // Lier la queue à l'exchange avec la routing key
    await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, ROUTING_KEY);

    // Limiter le prefetch à 1 pour éviter la surcharge
    await channel.prefetch(1);

    console.log(
      `[BookingEventsConsumer] Waiting for messages in queue: ${QUEUE_NAME}`
    );

    // Consommer les messages
    channel.consume(QUEUE_NAME, async (msg) => {
      if (!msg) return;

      try {
        const event = JSON.parse(msg.content.toString());
        console.log(`[BookingEventsConsumer] Received event:`, event);

        // Traiter l'événement avec le gestionnaire
        await handleBookingCreated(event);

        // Acquitter le message
        channel.ack(msg);
        console.log(
          `[BookingEventsConsumer] Event ${event.eventId} processed successfully`
        );
      } catch (error) {
        console.error(
          `[BookingEventsConsumer] Error processing message:`,
          error
        );

        // Rejeter le message et le remettre dans la queue (ou DLQ)
        channel.nack(msg, false, false);
      }
    });

    // Gestion de la fermeture propre
    process.on("SIGINT", async () => {
      console.log("[BookingEventsConsumer] Shutting down...");
      await channel.close();
      await connection.close();
      process.exit(0);
    });
  } catch (error) {
    console.error("[BookingEventsConsumer] Error starting consumer:", error);
    process.exit(1);
  }
}

// Démarrer le consommateur
startConsumer();

module.exports = { startConsumer };
```

---

#### Étape 5 : Tests d'Événements Concurrents

Créer un script de test pour simuler des événements concurrents.

```javascript
// tests/concurrency-test.js
const amqp = require("amqplib");
const { v4: uuidv4 } = require("uuid");

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost:5672";
const EXCHANGE_NAME = "booking-events";
const ROUTING_KEY = "booking.created";

/**
 * Publier un événement BookingCreated
 */
async function publishBookingCreated(tourId, seatsBooked, delay = 0) {
  const connection = await amqp.connect(RABBITMQ_URL);
  const channel = await connection.createChannel();

  await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: true });

  const event = {
    eventId: uuidv4(),
    eventType: "BookingCreated",
    timestamp: new Date().toISOString(),
    payload: {
      tourId,
      seatsBooked,
    },
  };

  // Attendre le délai spécifié
  if (delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  channel.publish(
    EXCHANGE_NAME,
    ROUTING_KEY,
    Buffer.from(JSON.stringify(event)),
    { persistent: true }
  );

  console.log(
    `[Test] Published event ${event.eventId} for tour ${tourId} (${seatsBooked} seats)`
  );

  await channel.close();
  await connection.close();
}

/**
 * Test de concurrence : publier plusieurs événements simultanément
 */
async function testConcurrentBookings() {
  console.log("[Test] Starting concurrency test...\n");

  const tourId = 42; // ID de la visite à tester
  const concurrentEvents = 5; // Nombre d'événements concurrents

  // Publier plusieurs événements en même temps
  const promises = [];
  for (let i = 0; i < concurrentEvents; i++) {
    promises.push(publishBookingCreated(tourId, 1, i * 50)); // Décalage de 50ms
  }

  await Promise.all(promises);

  console.log(
    `\n[Test] Published ${concurrentEvents} concurrent events for tour ${tourId}`
  );
  console.log(
    "[Test] Check the consumer logs to verify optimistic lock handling"
  );
}

// Exécuter le test
testConcurrentBookings()
  .then(() => {
    console.log("\n[Test] Test completed. Press Ctrl+C to exit.");
  })
  .catch((error) => {
    console.error("[Test] Error:", error);
    process.exit(1);
  });
```

**Exécuter le test**

```bash
# Terminal 1 : Démarrer le consommateur
node consumers/bookingEventsConsumer.js

# Terminal 2 : Lancer le test de concurrence
node tests/concurrency-test.js
```

---

#### Étape 6 : Logs Attendus

Lors de l'exécution du test, vous devriez voir des logs montrant les conflits détectés et les retries :

```
[BookingCreatedHandler] Processing event abc-123 for tour 42
[BookingCreatedHandler] Tour 42 updated successfully. Available seats: 10 -> 9. Version: 0 -> 1

[BookingCreatedHandler] Processing event def-456 for tour 42
[BookingCreatedHandler] Optimistic lock conflict for tour 42. Attempt 1/3. Current version: 0
[BookingCreatedHandler] Retrying in 100ms...
[BookingCreatedHandler] Tour 42 updated successfully. Available seats: 9 -> 8. Version: 1 -> 2

[BookingCreatedHandler] Processing event ghi-789 for tour 42
[BookingCreatedHandler] Optimistic lock conflict for tour 42. Attempt 1/3. Current version: 1
[BookingCreatedHandler] Retrying in 100ms...
[BookingCreatedHandler] Tour 42 updated successfully. Available seats: 8 -> 7. Version: 2 -> 3
```

---

#### Critères de Succès ✅

- ✅ Le décompte de `available_seats` est toujours correct, même avec des événements concurrents
- ✅ Les conflits de verrouillage optimiste sont détectés et réessayés automatiquement
- ✅ Les logs montrent clairement les tentatives de retry et les résolutions de conflits
- ✅ Le système converge vers un état cohérent après tous les événements

---

## Exercice 2 : Garantir l'Idempotence pour les Annulations de Réservation

**Objectif** : Implémenter un gestionnaire d'événements idempotent pour l'événement `BookingCancelled`.

### Solution Complète

#### Étape 1 : Table `processed_events`

Créer une table pour stocker les IDs d'événements traités.

```sql
-- migrations/create-processed-events-table.sql
CREATE TABLE processed_events (
    event_id VARCHAR(255) PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    aggregate_id VARCHAR(255),
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_processed_events_type ON processed_events(event_type);
CREATE INDEX idx_processed_events_aggregate ON processed_events(aggregate_id);
CREATE INDEX idx_processed_events_processed_at ON processed_events(processed_at);
```

**Avec Sequelize Migration**

```javascript
// migrations/YYYYMMDDHHMMSS-create-processed-events.js
"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("processed_events", {
      event_id: {
        type: Sequelize.STRING(255),
        primaryKey: true,
      },
      event_type: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      aggregate_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      processed_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    // Ajouter les index
    await queryInterface.addIndex("processed_events", ["event_type"]);
    await queryInterface.addIndex("processed_events", ["aggregate_id"]);
    await queryInterface.addIndex("processed_events", ["processed_at"]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("processed_events");
  },
};
```

---

#### Étape 2 : Modèle ProcessedEvent

```javascript
// models/ProcessedEvent.js
const { Model, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  class ProcessedEvent extends Model {}

  ProcessedEvent.init(
    {
      event_id: {
        type: DataTypes.STRING(255),
        primaryKey: true,
      },
      event_type: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      aggregate_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      processed_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: "ProcessedEvent",
      tableName: "processed_events",
      timestamps: false,
      underscored: true,
    }
  );

  return ProcessedEvent;
};
```

---

#### Étape 3 : Gestionnaire `handleBookingCancelled` pour Tour Catalog

Implémenter le gestionnaire avec vérification d'idempotence.

```javascript
// handlers/bookingCancelledHandler.js - Tour Catalog Service
const { Tour, ProcessedEvent, sequelize } = require("../models");

/**
 * Gestionnaire idempotent pour BookingCancelled dans Tour Catalog
 * @param {Object} event - L'événement BookingCancelled
 * @returns {Promise<void>}
 */
async function handleBookingCancelled(event) {
  const { eventId, payload } = event;
  const { bookingId, tourId, seatsReleased } = payload;

  console.log(
    `[BookingCancelledHandler] Processing event ${eventId} for booking ${bookingId}`
  );

  // Démarrer une transaction pour garantir l'atomicité
  const transaction = await sequelize.transaction();

  try {
    // Vérifier si l'événement a déjà été traité (idempotence)
    const alreadyProcessed = await ProcessedEvent.findByPk(eventId, {
      transaction,
    });

    if (alreadyProcessed) {
      console.log(
        `[BookingCancelledHandler] Event ${eventId} already processed at ` +
          `${alreadyProcessed.processed_at}. Skipping (idempotent).`
      );
      await transaction.commit();
      return;
    }

    // Récupérer la visite
    const tour = await Tour.findByPk(tourId, { transaction });

    if (!tour) {
      throw new Error(`Tour ${tourId} not found`);
    }

    // Augmenter le nombre de places disponibles
    tour.available_seats += seatsReleased;
    await tour.save({ transaction });

    // Marquer l'événement comme traité
    await ProcessedEvent.create(
      {
        event_id: eventId,
        event_type: "BookingCancelled",
        aggregate_id: bookingId,
      },
      { transaction }
    );

    // Valider la transaction
    await transaction.commit();

    console.log(
      `[BookingCancelledHandler] Event ${eventId} processed successfully. ` +
        `Tour ${tourId} now has ${tour.available_seats} available seats.`
    );
  } catch (error) {
    await transaction.rollback();
    console.error(
      `[BookingCancelledHandler] Error processing event ${eventId}:`,
      error
    );
    throw error;
  }
}

module.exports = { handleBookingCancelled };
```

---

#### Étape 4 : Gestionnaire `handleBookingCancelled` pour Payment Gateway

Implémenter le gestionnaire de remboursement avec clés d'idempotence.

**Table `idempotency_store`**

```sql
-- migrations/create-idempotency-store.sql
CREATE TABLE idempotency_store (
    idempotency_key VARCHAR(255) PRIMARY KEY,
    status VARCHAR(50) NOT NULL, -- 'in_progress', 'completed', 'failed'
    request_payload JSONB,
    response_payload JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_idempotency_created ON idempotency_store(created_at);
CREATE INDEX idx_idempotency_status ON idempotency_store(status);
```

**Modèle IdempotencyStore**

```javascript
// models/IdempotencyStore.js
const { Model, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  class IdempotencyStore extends Model {}

  IdempotencyStore.init(
    {
      idempotency_key: {
        type: DataTypes.STRING(255),
        primaryKey: true,
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      request_payload: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      response_payload: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "IdempotencyStore",
      tableName: "idempotency_store",
      timestamps: true,
      underscored: true,
    }
  );

  return IdempotencyStore;
};
```

**Gestionnaire de Remboursement**

```javascript
// handlers/refundHandler.js - Payment Gateway Service
const { IdempotencyStore } = require("../models");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

/**
 * Traiter le remboursement de manière idempotente
 * @param {Object} event - L'événement BookingCancelled
 * @returns {Promise<Object>}
 */
async function handleBookingCancelled(event) {
  const { eventId, payload } = event;
  const { bookingId, paymentId, amount } = payload;

  // Utiliser eventId comme clé d'idempotence
  const idempotencyKey = eventId;

  console.log(
    `[RefundHandler] Processing refund for booking ${bookingId} with key ${idempotencyKey}`
  );

  try {
    // Vérifier si ce remboursement a déjà été traité
    const existingRecord = await IdempotencyStore.findByPk(idempotencyKey);

    if (existingRecord) {
      if (existingRecord.status === "completed") {
        console.log(
          `[RefundHandler] Refund already processed for booking ${bookingId}. ` +
            `Returning cached response (idempotent).`
        );
        return existingRecord.response_payload;
      }

      if (existingRecord.status === "in_progress") {
        console.warn(
          `[RefundHandler] Refund already in progress for booking ${bookingId}`
        );
        return { status: "in_progress" };
      }

      if (existingRecord.status === "failed") {
        console.log(
          `[RefundHandler] Previous refund attempt failed. Retrying...`
        );
        // Continuer pour réessayer
      }
    }

    // Enregistrer que le remboursement est en cours
    await IdempotencyStore.upsert({
      idempotency_key: idempotencyKey,
      status: "in_progress",
      request_payload: { bookingId, paymentId, amount },
    });

    // Traiter le remboursement avec Stripe
    console.log(`[RefundHandler] Creating refund for payment ${paymentId}...`);

    const refund = await stripe.refunds.create({
      payment_intent: paymentId,
      amount: amount * 100, // En centimes
      metadata: { bookingId },
    });

    const responsePayload = {
      refundId: refund.id,
      status: refund.status,
      amount: refund.amount / 100,
      bookingId,
    };

    // Mettre à jour l'enregistrement avec le résultat
    await IdempotencyStore.update(
      {
        status: "completed",
        response_payload: responsePayload,
      },
      {
        where: { idempotency_key: idempotencyKey },
      }
    );

    console.log(
      `[RefundHandler] Refund processed successfully for booking ${bookingId}`
    );
    return responsePayload;
  } catch (error) {
    console.error(
      `[RefundHandler] Error processing refund for booking ${bookingId}:`,
      error
    );

    // Marquer comme échoué
    await IdempotencyStore.update(
      {
        status: "failed",
        response_payload: { error: error.message },
      },
      {
        where: { idempotency_key: idempotencyKey },
      }
    );

    throw error;
  }
}

module.exports = { handleBookingCancelled };
```

---

#### Étape 5 : Gestionnaire pour Service de Notification

Garantir qu'un seul email de confirmation est envoyé.

```javascript
// handlers/cancellationNotificationHandler.js - Notification Service
const { ProcessedEvent, sequelize } = require("../models");
const nodemailer = require("nodemailer");

// Configuration du transporteur email
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Envoyer un email de confirmation d'annulation (idempotent)
 * @param {Object} event - L'événement BookingCancelled
 * @returns {Promise<void>}
 */
async function handleBookingCancelled(event) {
  const { eventId, payload } = event;
  const { bookingId, userEmail, tourName } = payload;

  console.log(
    `[NotificationHandler] Processing cancellation notification for booking ${bookingId}`
  );

  const transaction = await sequelize.transaction();

  try {
    // Vérifier si l'email a déjà été envoyé (idempotence)
    const alreadyProcessed = await ProcessedEvent.findByPk(eventId, {
      transaction,
    });

    if (alreadyProcessed) {
      console.log(
        `[NotificationHandler] Notification already sent for event ${eventId}. ` +
          `Skipping (idempotent).`
      );
      await transaction.commit();
      return;
    }

    // Envoyer l'email de confirmation
    const mailOptions = {
      from: process.env.EMAIL_FROM || "noreply@tourismapp.com",
      to: userEmail,
      subject: "Confirmation d'annulation de votre réservation",
      html: `
                <h1>Annulation confirmée</h1>
                <p>Bonjour,</p>
                <p>Votre réservation pour <strong>${tourName}</strong> a été annulée avec succès.</p>
                <p>Numéro de réservation : <strong>${bookingId}</strong></p>
                <p>Vous recevrez le remboursement sous 5-7 jours ouvrables.</p>
                <p>Merci de votre compréhension.</p>
            `,
    };

    await transporter.sendMail(mailOptions);

    // Marquer l'événement comme traité
    await ProcessedEvent.create(
      {
        event_id: eventId,
        event_type: "BookingCancelled.Notification",
        aggregate_id: bookingId,
      },
      { transaction }
    );

    await transaction.commit();

    console.log(
      `[NotificationHandler] Cancellation email sent to ${userEmail} for booking ${bookingId}`
    );
  } catch (error) {
    await transaction.rollback();
    console.error(
      `[NotificationHandler] Error sending notification for event ${eventId}:`,
      error
    );
    throw error;
  }
}

module.exports = { handleBookingCancelled };
```

---

#### Étape 6 : Script de Test pour Événements Dupliqués

Tester l'idempotence en publiant le même événement plusieurs fois.

```javascript
// tests/idempotency-test.js
const amqp = require("amqplib");

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost:5672";
const EXCHANGE_NAME = "booking-events";
const ROUTING_KEY = "booking.cancelled";

/**
 * Publier le même événement plusieurs fois
 */
async function testIdempotency() {
  console.log("[Test] Starting idempotency test...\n");

  const connection = await amqp.connect(RABBITMQ_URL);
  const channel = await connection.createChannel();

  await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: true });

  const event = {
    eventId: "test-event-12345", // Même ID pour tous
    eventType: "BookingCancelled",
    timestamp: new Date().toISOString(),
    payload: {
      bookingId: "BK-42",
      tourId: 101,
      seatsReleased: 2,
      paymentId: "pi_test_123",
      amount: 150.0,
      userEmail: "test@example.com",
      tourName: "Paris City Tour",
    },
  };

  // Publier le même événement 5 fois
  for (let i = 1; i <= 5; i++) {
    channel.publish(
      EXCHANGE_NAME,
      ROUTING_KEY,
      Buffer.from(JSON.stringify(event)),
      { persistent: true }
    );

    console.log(
      `[Test] Published duplicate event #${i} with eventId: ${event.eventId}`
    );
    await new Promise((resolve) => setTimeout(resolve, 500)); // Attendre 500ms
  }

  await channel.close();
  await connection.close();

  console.log(
    "\n[Test] Published 5 duplicate events. Check service logs to verify idempotency."
  );
}

// Exécuter le test
testIdempotency()
  .then(() => {
    console.log("\n[Test] Test completed.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("[Test] Error:", error);
    process.exit(1);
  });
```

---

#### Logs Attendus (Idempotence)

```
[BookingCancelledHandler] Processing event test-event-12345 for booking BK-42
[BookingCancelledHandler] Event test-event-12345 processed successfully. Tour 101 now has 12 available seats.

[BookingCancelledHandler] Processing event test-event-12345 for booking BK-42
[BookingCancelledHandler] Event test-event-12345 already processed at 2024-01-15T10:30:00Z. Skipping (idempotent).

[RefundHandler] Processing refund for booking BK-42 with key test-event-12345
[RefundHandler] Refund already processed for booking BK-42. Returning cached response (idempotent).

[NotificationHandler] Processing cancellation notification for booking BK-42
[NotificationHandler] Notification already sent for event test-event-12345. Skipping (idempotent).
```

---

#### Critères de Succès ✅

- ✅ Rejouer le même événement `BookingCancelled` plusieurs fois n'a aucun effet après la première fois
- ✅ Le remboursement n'est traité qu'une seule fois (pas de double remboursement)
- ✅ L'email de confirmation n'est envoyé qu'une seule fois
- ✅ Les logs indiquent clairement quand un événement est ignoré comme doublon
- ✅ La table `processed_events` contient un seul enregistrement pour chaque `eventId` unique

---

## Résumé des Solutions

### Exercice 1 : Verrouillage Optimiste

**Techniques utilisées** :

- ✅ Colonne `optimistic_lock_version` pour la détection de conflits
- ✅ Logique de retry avec backoff exponentiel (3 tentatives)
- ✅ Logs détaillés des conflits et des résolutions
- ✅ Tests de concurrence pour valider le comportement

**Résultat** : Le système gère correctement les événements concurrents sans perte de données.

---

### Exercice 2 : Idempotence

**Techniques utilisées** :

- ✅ Table `processed_events` pour déduplication au niveau de l'application
- ✅ Table `idempotency_store` pour les opérations externes (paiements)
- ✅ Transactions de base de données pour garantir l'atomicité
- ✅ Tests de duplication pour valider l'idempotence

**Résultat** : Les gestionnaires d'événements sont complètement idempotents - rejouer le même événement n'a aucun effet secondaire.

---

## Bonnes Pratiques Appliquées

1. **Atomicité** : Utilisation de transactions pour garantir que la vérification et la mise à jour sont atomiques
2. **Logging Structuré** : Logs clairs avec contexte (eventId, bookingId, etc.)
3. **Gestion d'Erreurs** : Rollback des transactions en cas d'erreur
4. **Cleanup** : Stratégie de nettoyage pour éviter la croissance illimitée de `processed_events`
5. **Tests** : Scripts de test pour valider la concurrence et l'idempotence

---

## Améliorations Possibles

### Nettoyage Périodique de `processed_events`

```javascript
// jobs/cleanupProcessedEvents.js
const cron = require("node-cron");
const { ProcessedEvent } = require("../models");
const { Op } = require("sequelize");

// Nettoyer les événements traités de plus de 30 jours
async function cleanupOldEvents() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const deletedCount = await ProcessedEvent.destroy({
    where: {
      processed_at: {
        [Op.lt]: thirtyDaysAgo,
      },
    },
  });

  console.log(`[Cleanup] Deleted ${deletedCount} old processed events`);
}

// Exécuter tous les jours à 2h du matin
cron.schedule("0 2 * * *", () => {
  console.log("[Cleanup] Starting cleanup job...");
  cleanupOldEvents().catch((error) => {
    console.error("[Cleanup] Error:", error);
  });
});

module.exports = { cleanupOldEvents };
```

### Métriques et Monitoring

```javascript
// monitoring/metrics.js
const prometheus = require("prom-client");

// Compteur de conflits de verrouillage optimiste
const optimisticLockConflicts = new prometheus.Counter({
  name: "optimistic_lock_conflicts_total",
  help: "Total number of optimistic lock conflicts",
  labelNames: ["resource_type"],
});

// Compteur d'événements dupliqués
const duplicateEvents = new prometheus.Counter({
  name: "duplicate_events_total",
  help: "Total number of duplicate events detected",
  labelNames: ["event_type"],
});

module.exports = {
  optimisticLockConflicts,
  duplicateEvents,
};
```
