# Leçon 5.5 : Gestion de la Concurrence et de l'Idempotence dans les Transactions

**Module 5** : Architecture Event-Driven et Communication Asynchrone

---

## Objectifs d'Apprentissage

À la fin de cette leçon, vous serez capable de :

- Comprendre les problèmes de concurrence dans les systèmes distribués
- Implémenter le verrouillage optimiste pour gérer les mises à jour concurrentes
- Utiliser le verrouillage pessimiste et les verrous distribués
- Garantir l'idempotence dans les transactions distribuées
- Utiliser des clés d'idempotence pour détecter les doublons
- Appliquer des techniques de déduplication dans les files de messages

---

## Introduction

Dans une architecture de microservices event-driven, plusieurs services traitent souvent des événements simultanément. Cela peut entraîner :

- **Conditions de course (Race Conditions)** : Deux services tentent de modifier la même ressource en même temps
- **Incohérences de données** : Les mises à jour sont écrasées ou perdues
- **Traitement en double** : Le même événement est traité plusieurs fois

Cette leçon explore les techniques pour gérer ces défis dans notre application de réservation touristique.

---

## Comprendre la Concurrence dans les Transactions Distribuées

### Pourquoi la Concurrence est Importante

Dans les systèmes monolithiques, les transactions de base de données garantissent l'**atomicité** et l'**isolation** (propriétés ACID). Dans les systèmes distribués :

- Les microservices fonctionnent indépendamment
- Chaque service peut avoir sa propre base de données (pattern Database per Service)
- Les transactions distribuées sont complexes et coûteuses

**Exemple : Scénario de Réservation de Visite**

```
État Initial : Tour ID 42 a 5 places disponibles

Événement 1 : BookingCreated { tourId: 42, seatsBooked: 3 }
Événement 2 : BookingCreated { tourId: 42, seatsBooked: 2 }
```

Si les deux événements sont traités en même temps par le service Tour Catalog :

```javascript
// Service 1 lit : available_seats = 5
// Service 2 lit : available_seats = 5

// Service 1 calcule : 5 - 3 = 2, écrit 2
// Service 2 calcule : 5 - 2 = 3, écrit 3

// Résultat final : available_seats = 3 (devrait être 0 !)
```

### Impact sur Notre application de réservation touristique

Les problèmes de concurrence peuvent affecter :

1. **Gestion des Réservations** : Surréservation de visites à capacité limitée
2. **Catalogue de Visites** : Décomptes de places incorrects
3. **Passerelle de Paiement** : Double facturation pour la même réservation
4. **Service de Notification** : Envoi de plusieurs emails pour le même événement

---

## Stratégies pour Gérer la Concurrence

### 1. Verrouillage Optimiste (Optimistic Locking)

Le verrouillage optimiste suppose que les conflits sont rares. Il détecte les conflits lors de la mise à jour en utilisant un **numéro de version**.

#### Comment ça Marche

1. Chaque enregistrement a un champ `version` ou `optimistic_lock_version`
2. Lors de la lecture, enregistrez la version actuelle
3. Lors de l'écriture, vérifiez que la version n'a pas changé
4. Si elle a changé, un autre processus a effectué une mise à jour → rejeter ou réessayer

#### Implémentation dans le Service Tour Catalog

**Schéma de Base de Données**

```sql
CREATE TABLE tours (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    available_seats INT NOT NULL,
    optimistic_lock_version INT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Code du Gestionnaire d'Événements avec Retry**

```javascript
// Tour Catalog Microservice - Event Handler
const { Tour } = require("./models");

async function handleBookingCreated(event, retries = 3) {
  const { tourId, seatsBooked } = event.payload;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      // Lire la version actuelle
      const tour = await Tour.findByPk(tourId);

      if (!tour) {
        console.error(`Tour ${tourId} not found`);
        return;
      }

      if (tour.available_seats < seatsBooked) {
        console.warn(`Not enough seats for tour ${tourId}`);
        return;
      }

      // Mise à jour atomique avec vérification de version
      const [updatedRows] = await Tour.update(
        {
          available_seats: tour.available_seats - seatsBooked,
          optimistic_lock_version: tour.optimistic_lock_version + 1,
        },
        {
          where: {
            id: tourId,
            optimistic_lock_version: tour.optimistic_lock_version, // Doit correspondre
          },
        }
      );

      if (updatedRows === 0) {
        // Conflit détecté - une autre transaction a mis à jour en parallèle
        console.warn(
          `Optimistic lock conflict for tour ${tourId}. Attempt ${
            attempt + 1
          }/${retries}`
        );

        // Attente exponentielle avant de réessayer
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 100)
        );
        continue; // Réessayer
      }

      // Succès !
      console.log(
        `Tour ${tourId} updated. New available_seats: ${
          tour.available_seats - seatsBooked
        }`
      );
      return;
    } catch (error) {
      console.error(`Error updating tour ${tourId}:`, error);
      throw error;
    }
  }

  // Toutes les tentatives ont échoué
  throw new Error(`Failed to update tour ${tourId} after ${retries} attempts`);
}

module.exports = { handleBookingCreated };
```

**Avantages**

- ✅ Pas de verrouillage de base de données coûteux
- ✅ Bonne performance pour les faibles taux de contention
- ✅ Facile à implémenter avec les ORM (Sequelize, TypeORM)

**Inconvénients**

- ❌ Nécessite une logique de retry
- ❌ Peut échouer si la contention est élevée

---

### 2. Verrouillage Pessimiste (Pessimistic Locking)

Le verrouillage pessimiste suppose que les conflits sont fréquents. Il acquiert un **verrou** sur l'enregistrement avant de le modifier.

#### Implémentation avec PostgreSQL

```javascript
// Tour Catalog Microservice - Pessimistic Lock
const { Tour, sequelize } = require("./models");

async function handleBookingCreatedWithLock(event) {
  const { tourId, seatsBooked } = event.payload;

  // Démarrer une transaction
  const transaction = await sequelize.transaction();

  try {
    // Acquérir un verrou exclusif sur la ligne (FOR UPDATE)
    const tour = await Tour.findByPk(tourId, {
      lock: transaction.LOCK.UPDATE, // SELECT ... FOR UPDATE
      transaction,
    });

    if (!tour) {
      await transaction.rollback();
      console.error(`Tour ${tourId} not found`);
      return;
    }

    if (tour.available_seats < seatsBooked) {
      await transaction.rollback();
      console.warn(`Not enough seats for tour ${tourId}`);
      return;
    }

    // Mettre à jour en toute sécurité (le verrou empêche les autres)
    tour.available_seats -= seatsBooked;
    await tour.save({ transaction });

    // Valider la transaction (libère le verrou)
    await transaction.commit();

    console.log(
      `Tour ${tourId} updated. New available_seats: ${tour.available_seats}`
    );
  } catch (error) {
    await transaction.rollback();
    console.error(`Error updating tour ${tourId}:`, error);
    throw error;
  }
}

module.exports = { handleBookingCreatedWithLock };
```

**Avantages**

- ✅ Garantit l'exclusivité - aucune condition de course
- ✅ Pas besoin de logique de retry

**Inconvénients**

- ❌ Peut provoquer des deadlocks
- ❌ Réduit le débit sous haute contention
- ❌ Nécessite que la base de données supporte les verrous (PostgreSQL `FOR UPDATE`)

---

### 3. Verrous Distribués avec Redis (Redlock)

Pour les systèmes où plusieurs instances de service s'exécutent, utilisez un **gestionnaire de verrous distribués** comme Redis.

#### Implémentation avec Redis Redlock

**Installation**

```bash
npm install redlock ioredis
```

**Code du Gestionnaire de Verrous**

```javascript
// lockManager.js
const Redlock = require("redlock");
const Redis = require("ioredis");

// Créer des clients Redis (utilisez plusieurs instances pour la haute disponibilité)
const redisClient = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
});

// Initialiser Redlock
const redlock = new Redlock(
  [redisClient], // Liste des clients Redis
  {
    driftFactor: 0.01,
    retryCount: 10,
    retryDelay: 200,
    retryJitter: 200,
  }
);

async function withDistributedLock(resourceKey, ttl, callback) {
  const lock = await redlock.acquire([resourceKey], ttl);

  try {
    // Exécuter l'opération critique
    const result = await callback();
    return result;
  } finally {
    // Toujours libérer le verrou
    await lock.release();
  }
}

module.exports = { withDistributedLock };
```

**Utilisation dans le Gestionnaire d'Événements**

```javascript
// Tour Catalog Microservice - Distributed Lock
const { Tour } = require("./models");
const { withDistributedLock } = require("./lockManager");

async function handleBookingCreatedWithRedlock(event) {
  const { tourId, seatsBooked } = event.payload;
  const lockKey = `lock:tour:${tourId}`;
  const lockTTL = 5000; // 5 secondes

  await withDistributedLock(lockKey, lockTTL, async () => {
    const tour = await Tour.findByPk(tourId);

    if (!tour) {
      console.error(`Tour ${tourId} not found`);
      return;
    }

    if (tour.available_seats < seatsBooked) {
      console.warn(`Not enough seats for tour ${tourId}`);
      return;
    }

    // Mise à jour sécurisée (protégée par le verrou distribué)
    tour.available_seats -= seatsBooked;
    await tour.save();

    console.log(
      `Tour ${tourId} updated. New available_seats: ${tour.available_seats}`
    );
  });
}

module.exports = { handleBookingCreatedWithRedlock };
```

**Avantages**

- ✅ Fonctionne à travers plusieurs instances de service
- ✅ Empêche les conditions de course dans les systèmes distribués
- ✅ Redis est rapide et largement utilisé

**Inconvénients**

- ❌ Ajoute une dépendance externe (Redis)
- ❌ Risque de deadlock si les verrous ne sont pas libérés
- ❌ Nécessite une gestion correcte des TTL

---

### 4. Event Sourcing et Résolution de Conflits

Dans l'**Event Sourcing**, au lieu de stocker l'état actuel, vous stockez une séquence d'**événements immuables**. L'état est reconstruit en rejouant les événements.

#### Avantages pour la Gestion de la Concurrence

- Les événements sont ajoutés (append-only) → pas de mise à jour concurrente
- Les conflits sont résolus au niveau de l'application lors de la reconstruction de l'état
- Audit trail complet de toutes les modifications

#### Exemple : Event Store pour les Réservations

```javascript
// Event Store (Table PostgreSQL ou EventStoreDB)
const events = [
  {
    id: 1,
    aggregateId: "tour-42",
    type: "BookingCreated",
    data: { seatsBooked: 3 },
    timestamp: "2024-01-15T10:00:00Z",
  },
  {
    id: 2,
    aggregateId: "tour-42",
    type: "BookingCreated",
    data: { seatsBooked: 2 },
    timestamp: "2024-01-15T10:00:05Z",
  },
  {
    id: 3,
    aggregateId: "tour-42",
    type: "BookingCancelled",
    data: { seatsReleased: 1 },
    timestamp: "2024-01-15T11:00:00Z",
  },
];

// Reconstruire l'état actuel
function rebuildTourState(tourId) {
  const tourEvents = events.filter((e) => e.aggregateId === tourId);

  let state = { tourId, availableSeats: 10 }; // État initial

  for (const event of tourEvents) {
    switch (event.type) {
      case "BookingCreated":
        state.availableSeats -= event.data.seatsBooked;
        break;
      case "BookingCancelled":
        state.availableSeats += event.data.seatsReleased;
        break;
    }
  }

  return state;
}

const tourState = rebuildTourState("tour-42");
console.log(tourState); // { tourId: 'tour-42', availableSeats: 6 }
```

**Avantages**

- ✅ Pas de conflits de mise à jour (append-only)
- ✅ Audit trail complet
- ✅ Peut rejouer les événements pour reconstruire l'état

**Inconvénients**

- ❌ Complexité accrue
- ❌ Nécessite un changement de paradigme
- ❌ Les requêtes nécessitent la reconstruction de l'état

---

## Garantir l'Idempotence dans les Transactions

### Qu'est-ce que l'Idempotence ?

Une opération est **idempotente** si elle peut être appliquée plusieurs fois avec le même résultat.

**Exemple Mathématique**

- `SET x = 5` est idempotent (peut être répété en toute sécurité)
- `x = x + 1` n'est PAS idempotent (change à chaque exécution)

### Pourquoi l'Idempotence est Cruciale

Dans les systèmes event-driven, les événements peuvent être :

- **Livrés plusieurs fois** (au moins une fois, garantie de livraison)
- **Retraités** (retries après échecs)
- **Dupliqués** (problèmes réseau, défaillances de broker)

Si les gestionnaires d'événements ne sont pas idempotents :

- Les paiements peuvent être facturés deux fois
- Les notifications peuvent être envoyées plusieurs fois
- Les inventaires peuvent être incorrectement décrémentés

---

### Stratégies pour Garantir l'Idempotence

#### 1. Clés d'Idempotence (Request IDs)

Attribuez un **ID de requête unique** (UUID) à chaque événement ou requête. Stockez les IDs traités pour détecter les doublons.

**Schéma de Base de Données**

```sql
CREATE TABLE idempotency_store (
    idempotency_key VARCHAR(255) PRIMARY KEY,
    status VARCHAR(50) NOT NULL, -- 'in_progress', 'completed', 'failed'
    request_payload JSONB,
    response_payload JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_idempotency_created ON idempotency_store(created_at);
```

**Implémentation dans la Passerelle de Paiement**

```javascript
// Payment Gateway Microservice
const express = require("express");
const { IdempotencyStore } = require("./models");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();
app.use(express.json());

app.post("/process-payment", async (req, res) => {
  const idempotencyKey = req.headers["x-idempotency-key"];

  if (!idempotencyKey) {
    return res.status(400).json({ error: "Missing X-Idempotency-Key header" });
  }

  const { bookingId, amount, currency } = req.body;

  try {
    // Vérifier si cette requête a déjà été traitée
    const existingRecord = await IdempotencyStore.findByPk(idempotencyKey);

    if (existingRecord) {
      if (existingRecord.status === "completed") {
        // Retourner la réponse en cache (idempotence)
        console.log(`Duplicate payment request detected: ${idempotencyKey}`);
        return res.status(200).json(existingRecord.response_payload);
      }

      if (existingRecord.status === "in_progress") {
        // Une autre requête est en cours de traitement
        return res.status(409).json({ error: "Request already in progress" });
      }
    }

    // Enregistrer la nouvelle requête
    await IdempotencyStore.create({
      idempotency_key: idempotencyKey,
      status: "in_progress",
      request_payload: { bookingId, amount, currency },
    });

    // Traiter le paiement
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // En centimes
      currency,
      metadata: { bookingId },
    });

    const responsePayload = {
      paymentId: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount / 100,
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

    console.log(`Payment processed successfully: ${idempotencyKey}`);
    return res.status(200).json(responsePayload);
  } catch (error) {
    console.error(`Payment processing failed: ${idempotencyKey}`, error);

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

    return res.status(500).json({ error: "Payment processing failed" });
  }
});

module.exports = app;
```

**Utilisation depuis le Service de Réservation**

```javascript
// Booking Management Microservice
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");

async function processPayment(bookingId, amount, currency) {
  const idempotencyKey = uuidv4(); // Générer une clé unique

  const response = await axios.post(
    "http://payment-gateway/process-payment",
    { bookingId, amount, currency },
    {
      headers: {
        "X-Idempotency-Key": idempotencyKey,
      },
    }
  );

  return response.data;
}

module.exports = { processPayment };
```

**Avantages**

- ✅ Empêche le double traitement
- ✅ Fonctionne pour les API REST et les événements
- ✅ Peut stocker les réponses en cache

**Inconvénients**

- ❌ Nécessite un stockage supplémentaire
- ❌ Les clés doivent être générées correctement

---

#### 2. Mises à Jour Conditionnelles

Utilisez des clauses `WHERE` pour garantir qu'une mise à jour n'est appliquée qu'une seule fois.

**Exemple : Annulation de Réservation Idempotente**

```javascript
// Booking Management Microservice
async function cancelBooking(bookingId) {
  // Mise à jour seulement si le statut est 'confirmed'
  const [updatedRows] = await Booking.update(
    { status: "cancelled", cancelled_at: new Date() },
    {
      where: {
        id: bookingId,
        status: "confirmed", // Condition : seulement si pas déjà annulé
      },
    }
  );

  if (updatedRows === 0) {
    console.log(`Booking ${bookingId} already cancelled or not found`);
    return { success: false, reason: "Already cancelled" };
  }

  console.log(`Booking ${bookingId} cancelled successfully`);
  return { success: true };
}

module.exports = { cancelBooking };
```

**Avantages**

- ✅ Simple à implémenter
- ✅ Aucun stockage supplémentaire requis

**Inconvénients**

- ❌ Limité aux mises à jour basées sur l'état
- ❌ Ne fonctionne pas pour toutes les opérations

---

#### 3. UPSERT (Update or Insert)

Utilisez les opérations `UPSERT` pour gérer idempotent l'insertion ou la mise à jour d'enregistrements.

**Exemple : Stockage de Profil Utilisateur Idempotent**

```javascript
// User Profile Microservice
async function saveUserProfile(userId, profileData) {
  // PostgreSQL UPSERT avec ON CONFLICT
  const [profile, created] = await UserProfile.upsert(
    {
      user_id: userId,
      ...profileData,
    },
    {
      conflictFields: ["user_id"], // Clé unique
    }
  );

  if (created) {
    console.log(`Profile created for user ${userId}`);
  } else {
    console.log(`Profile updated for user ${userId}`);
  }

  return profile;
}

module.exports = { saveUserProfile };
```

**Avantages**

- ✅ Idempotent par nature
- ✅ Simple et efficace

**Inconvénients**

- ❌ Limité aux opérations basées sur des clés uniques

---

#### 4. Déduplication au Niveau de la File de Messages

Certains systèmes de messagerie offrent une déduplication intégrée.

**Exemple : AWS SQS FIFO avec Déduplication**

```javascript
// AWS SQS FIFO Queue (Déduplication automatique sur 5 minutes)
const AWS = require("aws-sdk");
const sqs = new AWS.SQS();

const params = {
  QueueUrl: process.env.SQS_QUEUE_URL,
  MessageBody: JSON.stringify({
    eventType: "BookingCreated",
    payload: { bookingId: "123", tourId: "42" },
  }),
  MessageGroupId: "booking-events",
  MessageDeduplicationId: "booking-123-created", // ID de déduplication unique
};

sqs.sendMessage(params, (err, data) => {
  if (err) {
    console.error("Error sending message:", err);
  } else {
    console.log("Message sent:", data.MessageId);
  }
});
```

**RabbitMQ avec Plugin de Déduplication**

```bash
# Installer le plugin de déduplication
rabbitmq-plugins enable rabbitmq_message_deduplication
```

```javascript
// RabbitMQ avec en-têtes de déduplication
const amqp = require("amqplib");

async function publishEvent(eventType, payload) {
  const connection = await amqp.connect(process.env.RABBITMQ_URL);
  const channel = await connection.createChannel();

  const exchange = "booking-events";
  const routingKey = "booking.created";

  await channel.assertExchange(exchange, "topic", { durable: true });

  const message = JSON.stringify({ eventType, payload });
  const options = {
    persistent: true,
    headers: {
      "x-deduplication-header": `${eventType}-${payload.bookingId}`, // Clé de déduplication
    },
  };

  channel.publish(exchange, routingKey, Buffer.from(message), options);

  console.log(`Event published: ${eventType}`);
  await channel.close();
  await connection.close();
}

module.exports = { publishEvent };
```

**Avantages**

- ✅ Déduplication gérée par l'infrastructure
- ✅ Réduit la complexité de l'application

**Inconvénients**

- ❌ Dépend des capacités du broker de messages
- ❌ Fenêtre de déduplication limitée (ex: 5 minutes pour SQS)

---

#### 5. Idempotence au Niveau de l'Application avec event_id

Stockez les IDs d'événements traités dans la base de données.

**Schéma de Base de Données**

```sql
CREATE TABLE processed_events (
    event_id VARCHAR(255) PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_processed_events_type ON processed_events(event_type);
```

**Gestionnaire d'Événements Idempotent**

```javascript
// Tour Catalog Microservice - Idempotent Event Handler
const { Tour, ProcessedEvent, sequelize } = require("./models");

async function handleBookingCreated(event) {
  const { eventId, tourId, seatsBooked } = event;

  // Démarrer une transaction
  const transaction = await sequelize.transaction();

  try {
    // Vérifier si l'événement a déjà été traité
    const alreadyProcessed = await ProcessedEvent.findByPk(eventId, {
      transaction,
    });

    if (alreadyProcessed) {
      console.log(`Event ${eventId} already processed. Skipping...`);
      await transaction.commit();
      return; // Idempotence - pas de retraitement
    }

    // Traiter l'événement
    const tour = await Tour.findByPk(tourId, { transaction });

    if (!tour) {
      throw new Error(`Tour ${tourId} not found`);
    }

    if (tour.available_seats < seatsBooked) {
      throw new Error(`Not enough seats for tour ${tourId}`);
    }

    tour.available_seats -= seatsBooked;
    await tour.save({ transaction });

    // Marquer l'événement comme traité
    await ProcessedEvent.create(
      {
        event_id: eventId,
        event_type: "BookingCreated",
      },
      { transaction }
    );

    // Valider la transaction
    await transaction.commit();

    console.log(`Event ${eventId} processed successfully`);
  } catch (error) {
    await transaction.rollback();
    console.error(`Error processing event ${eventId}:`, error);
    throw error;
  }
}

module.exports = { handleBookingCreated };
```

**Avantages**

- ✅ Garantie d'idempotence complète
- ✅ Fonctionne pour tout type d'événement
- ✅ Peut être combiné avec d'autres stratégies

**Inconvénients**

- ❌ Nécessite un stockage supplémentaire
- ❌ La table `processed_events` peut devenir grande (envisager le nettoyage)

**Nettoyage Périodique**

```javascript
// Cron Job - Nettoyer les anciens événements traités (> 30 jours)
const { ProcessedEvent } = require("./models");
const { Op } = require("sequelize");

async function cleanupOldProcessedEvents() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const deletedCount = await ProcessedEvent.destroy({
    where: {
      processed_at: {
        [Op.lt]: thirtyDaysAgo,
      },
    },
  });

  console.log(`Cleaned up ${deletedCount} old processed events`);
}

// Exécuter toutes les 24 heures
setInterval(cleanupOldProcessedEvents, 24 * 60 * 60 * 1000);

module.exports = { cleanupOldProcessedEvents };
```

---

## Exercices Pratiques

### Exercice 1 : Implémenter le Verrouillage Optimiste avec Retry

**Objectif** : Modifier le service Tour Catalog pour utiliser le verrouillage optimiste avec logique de retry.

**Tâches**

1. Ajouter une colonne `optimistic_lock_version` à la table `tours`
2. Implémenter un gestionnaire d'événements pour `BookingCreated` avec verrouillage optimiste
3. Ajouter une logique de retry avec backoff exponentiel (3 tentatives maximum)
4. Tester avec des événements concurrents pour la même visite

**Critères de Succès**

- Le décompte de `available_seats` est toujours correct, même avec des événements concurrents
- Les conflits de verrouillage optimiste sont détectés et réessayés
- Les logs montrent les tentatives de retry et les résolutions de conflits

---

### Exercice 2 : Garantir l'Idempotence pour les Annulations de Réservation

**Objectif** : Implémenter un gestionnaire d'événements idempotent pour l'événement `BookingCancelled`.

**Scénario**

- Le service Booking Management publie `BookingCancelled` lorsqu'un utilisateur annule
- Le service Tour Catalog doit augmenter `available_seats`
- Le service Payment Gateway doit traiter le remboursement
- Le service Notification doit envoyer un email de confirmation

**Tâches**

1. Créer une table `processed_events` pour stocker les IDs d'événements traités
2. Implémenter le gestionnaire `handleBookingCancelled` dans Tour Catalog avec vérification d'idempotence
3. Implémenter le gestionnaire `handleBookingCancelled` dans Payment Gateway avec clés d'idempotence
4. S'assurer que rejouer le même événement plusieurs fois ne cause pas de doubles remboursements ou de décomptes incorrects

**Critères de Succès**

- Rejouer le même événement `BookingCancelled` n'a aucun effet (idempotent)
- Le remboursement n'est traité qu'une seule fois
- L'email de confirmation n'est envoyé qu'une seule fois
- Les logs indiquent clairement quand un événement est ignoré comme doublon

---

## Résumé

Dans cette leçon, nous avons exploré :

- **Problèmes de Concurrence** : Conditions de course, incohérences de données dans les systèmes distribués
- **Verrouillage Optimiste** : Détection de conflits basée sur la version avec logique de retry
- **Verrouillage Pessimiste** : Verrous de base de données pour l'accès exclusif
- **Verrous Distribués** : Redis Redlock pour la coordination entre plusieurs instances
- **Idempotence** : Garantir qu'une opération peut être répétée en toute sécurité
- **Clés d'Idempotence** : Détection de doublons avec IDs de requête uniques
- **Mises à Jour Conditionnelles** : Mises à jour basées sur l'état pour l'idempotence
- **Déduplication** : Au niveau de l'application et au niveau de la file de messages

Ces techniques sont essentielles pour construire des architectures event-driven robustes et fiables.

---

## Ressources

### Documentation

- [PostgreSQL Concurrency Control](https://www.postgresql.org/docs/current/mvcc.html)
- [Redis Redlock Algorithm](https://redis.io/docs/manual/patterns/distributed-locks/)
- [AWS SQS FIFO Queues](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues.html)
- [Stripe Idempotent Requests](https://stripe.com/docs/api/idempotent_requests)

### Articles

- [Designing Data-Intensive Applications](https://dataintensive.net/) - Martin Kleppmann
- [Idempotency Patterns in Microservices](https://microservices.io/patterns/communication-style/idempotent-consumer.html)
- [Optimistic vs Pessimistic Locking](https://stackoverflow.com/questions/129329/optimistic-vs-pessimistic-locking)

### Outils

- [Redlock](https://www.npmjs.com/package/redlock) - Implémentation Node.js de l'algorithme Redlock
- [EventStoreDB](https://www.eventstore.com/) - Base de données pour Event Sourcing
- [RabbitMQ Message Deduplication Plugin](https://github.com/noxdafox/rabbitmq-message-deduplication)

---

## Navigation

- **⬅️ Précédent** : [Leçon 5.4 : Microservice de Notification](./lecon-4-notification-microservice.md)
- **➡️ Suivant** : [Leçon 5.6 : WebSockets et Communication Temps Réel →](./lecon-6-websockets-realtime.md)
- **🏠 Sommaire** : [Retour au README](README.md)

---
