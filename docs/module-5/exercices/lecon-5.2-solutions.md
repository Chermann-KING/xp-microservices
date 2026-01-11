# Exercices - Leçon 5.2 Communication Asynchrone avec Message Queues

## Exercice 1 : Expansion RabbitMQ Producer/Consumer

### Énoncé

**Objectif** : Enrichir le flux de messaging avec des données supplémentaires.

**Tâches** :

1. Modifier le **Booking Management Microservice** (producer) pour inclure dans le payload :

   - Email de l'utilisateur
   - Numéro de téléphone
   - Prix total
   - Nom du tour

2. Mettre à jour le **Notification Microservice** (consumer) pour :

   - Extraire ces informations supplémentaires
   - Afficher un message de notification réaliste : `"Email envoyé à user@example.com pour le tour 'Paris City Tour' d'un montant de 199.99 USD"`

3. **Bonus** : Expérimenter avec différentes routing keys :
   - `booking.confirmed.premium`
   - `booking.confirmed.standard`
   - Modifier le consumer pour s'abonner à tous les événements de réservation : `booking.confirmed.*`

---

### Solution

#### Partie 1 : Producer Enrichi (Booking Service)

```javascript
// booking-management-service/src/rabbitmqProducer.js
const amqp = require("amqplib");

const RABBITMQ_URL =
  process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";
const EXCHANGE_NAME = "tour_booking_events";

let channel;

/**
 * Connexion à RabbitMQ et création de l'exchange
 */
async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();

    // Créer un exchange de type "topic" durable
    await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: true });

    console.log("✅ Connecté à RabbitMQ");
  } catch (error) {
    console.error("❌ Échec de connexion à RabbitMQ:", error);
    process.exit(1);
  }
}

/**
 * Publier un événement "Tour Réservé" avec données enrichies
 * @param {Object} bookingDetails - Détails complets de la réservation
 * @returns {boolean} - Succès de la publication
 */
async function publishTourBookedEvent(bookingDetails) {
  if (!channel) {
    console.error("❌ Canal RabbitMQ non établi.");
    return false;
  }

  // Déterminer la routing key selon le type de tour
  const tourType = bookingDetails.tourType || "standard"; // 'premium' ou 'standard'
  const routingKey = `booking.confirmed.${tourType}`;

  // Payload enrichi avec toutes les informations nécessaires
  const enrichedPayload = {
    bookingId: bookingDetails.bookingId,
    tourId: bookingDetails.tourId,
    tourName: bookingDetails.tourName,
    tourType: tourType,
    userId: bookingDetails.userId,
    userEmail: bookingDetails.userEmail,
    userPhone: bookingDetails.userPhone,
    userName: bookingDetails.userName,
    bookingDate: bookingDetails.bookingDate,
    tourDate: bookingDetails.tourDate,
    participants: bookingDetails.participants,
    totalPrice: bookingDetails.totalPrice,
    currency: bookingDetails.currency || "USD",
    status: "confirmed",
    timestamp: new Date().toISOString(),
  };

  const message = JSON.stringify(enrichedPayload);

  try {
    // Publier le message vers l'exchange avec la routing key
    channel.publish(EXCHANGE_NAME, routingKey, Buffer.from(message), {
      persistent: true, // Message persistant
      contentType: "application/json",
      timestamp: Date.now(),
    });

    console.log(`📨 Message publié '${routingKey}': ${message}`);
    return true;
  } catch (error) {
    console.error("❌ Échec de publication du message:", error);
    return false;
  }
}

module.exports = {
  connectRabbitMQ,
  publishTourBookedEvent,
};
```

#### Partie 2 : Route de Réservation Enrichie

```javascript
// booking-management-service/src/routes/bookingRoutes.js
const express = require("express");
const router = express.Router();
const { bookTour } = require("../controllers/bookingController");
const { publishTourBookedEvent } = require("../rabbitmqProducer");
const { getTourById } = require("../services/tourService");
const { getUserById } = require("../services/userService");

router.post("/bookings", async (req, res) => {
  try {
    const bookingData = req.body;

    // 1. Créer la réservation en base de données
    const newBooking = await bookTour(bookingData);

    // 2. Récupérer les détails du tour et de l'utilisateur
    const tour = await getTourById(newBooking.tourId);
    const user = await getUserById(newBooking.userId);

    // 3. Publier l'événement avec toutes les données enrichies
    const eventPublished = await publishTourBookedEvent({
      bookingId: newBooking.id,
      tourId: newBooking.tourId,
      tourName: tour.name,
      tourType: tour.type, // 'premium' ou 'standard'
      userId: newBooking.userId,
      userEmail: user.email,
      userPhone: user.phone,
      userName: user.name,
      bookingDate: newBooking.createdAt,
      tourDate: newBooking.tourDate,
      participants: newBooking.participants,
      totalPrice: newBooking.totalPrice,
      currency: "USD",
    });

    if (!eventPublished) {
      console.warn("⚠️ Échec de publication de l'événement vers RabbitMQ.");
    }

    res.status(201).json({
      message: "Réservation réussie",
      booking: newBooking,
    });
  } catch (error) {
    console.error("❌ Erreur lors de la réservation:", error);
    res.status(500).json({
      message: "Erreur lors de la réservation",
      error: error.message,
    });
  }
});

module.exports = router;
```

#### Partie 3 : Consumer Enrichi (Notification Service)

```javascript
// notification-service/src/rabbitmqConsumer.js
const amqp = require("amqplib");

const RABBITMQ_URL =
  process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";
const EXCHANGE_NAME = "tour_booking_events";
const QUEUE_NAME = "notification_queue";

// Pattern pour s'abonner à tous les événements de réservation
const ROUTING_KEY_PATTERN = "booking.confirmed.*"; // Wildcard pour premium ET standard

/**
 * Formater le message de notification
 */
function formatNotificationMessage(eventData) {
  const {
    userName,
    userEmail,
    tourName,
    tourType,
    totalPrice,
    currency,
    participants,
    tourDate,
    bookingId,
  } = eventData;

  const typeLabel = tourType === "premium" ? "⭐ Premium" : "Standard";

  return `
📧 Email envoyé à ${userEmail} pour le tour "${tourName}" (${typeLabel})
   👤 Client: ${userName}
   💰 Montant: ${totalPrice} ${currency}
   👥 Participants: ${participants} personne(s)
   📅 Date du tour: ${new Date(tourDate).toLocaleDateString("fr-FR")}
   🆔 ID Réservation: ${bookingId}
    `.trim();
}

/**
 * Envoyer une notification par email (simulation)
 */
async function sendEmailNotification(eventData) {
  // Dans un vrai système, utiliser un service comme SendGrid, Mailgun, etc.
  console.log("\n📬 Envoi d'email de confirmation...");
  console.log(formatNotificationMessage(eventData));
  console.log("✅ Email envoyé avec succès!\n");

  // Simulation d'un délai d'envoi
  await new Promise((resolve) => setTimeout(resolve, 500));
}

/**
 * Envoyer une notification par SMS (simulation)
 */
async function sendSmsNotification(eventData) {
  const { userPhone, tourName, tourDate } = eventData;

  console.log("\n📱 Envoi de SMS...");
  console.log(`   Destinataire: ${userPhone}`);
  console.log(
    `   Message: Votre réservation pour "${tourName}" le ${new Date(
      tourDate
    ).toLocaleDateString("fr-FR")} est confirmée!`
  );
  console.log("✅ SMS envoyé avec succès!\n");

  await new Promise((resolve) => setTimeout(resolve, 300));
}

/**
 * Démarrer la consommation de messages
 */
async function startConsuming() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    // Assurer que l'exchange existe
    await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: true });

    // Créer une queue durable
    const q = await channel.assertQueue(QUEUE_NAME, { durable: true });

    // Lier la queue à l'exchange avec le pattern wildcard
    await channel.bindQueue(q.queue, EXCHANGE_NAME, ROUTING_KEY_PATTERN);

    console.log(`📬 En attente de messages dans ${q.queue}`);
    console.log(`   Pattern de routing: ${ROUTING_KEY_PATTERN}`);
    console.log("   CTRL+C pour quitter\n");

    // Consommer les messages
    channel.consume(
      q.queue,
      async (msg) => {
        if (msg.content) {
          const eventData = JSON.parse(msg.content.toString());
          const routingKey = msg.fields.routingKey;

          console.log(`\n📨 Événement reçu: '${routingKey}'`);

          try {
            // Déterminer le type de notification selon la routing key
            if (routingKey === "booking.confirmed.premium") {
              console.log(
                "🌟 Réservation Premium détectée - Envoi notifications prioritaires"
              );
              // Pour les premium, envoyer email ET SMS
              await sendEmailNotification(eventData);
              await sendSmsNotification(eventData);
            } else if (routingKey === "booking.confirmed.standard") {
              console.log("📧 Réservation Standard détectée - Envoi email");
              // Pour les standard, envoyer uniquement email
              await sendEmailNotification(eventData);
            }

            // Accuser réception du message (très important!)
            channel.ack(msg);
          } catch (error) {
            console.error("❌ Erreur lors du traitement du message:", error);
            // Rejeter le message et le remettre dans la queue
            channel.nack(msg, false, true);
          }
        }
      },
      {
        noAck: false, // Accusé de réception manuel
      }
    );
  } catch (error) {
    console.error("❌ Échec de démarrage du consumer RabbitMQ:", error);
    process.exit(1);
  }
}

// Démarrer la consommation au démarrage du service
startConsuming();
```

#### Partie 4 : Services Mock (pour les données enrichies)

```javascript
// booking-management-service/src/services/tourService.js

/**
 * Récupérer les détails d'un tour par ID
 * (Dans un vrai système, ceci ferait un appel à la base de données)
 */
async function getTourById(tourId) {
  // Simulation de données
  const tours = {
    tour_001: {
      id: "tour_001",
      name: "Paris City Tour",
      type: "standard",
      duration: "3 heures",
      price: 199.99,
    },
    tour_002: {
      id: "tour_002",
      name: "Tour Eiffel Experience Premium",
      type: "premium",
      duration: "5 heures",
      price: 499.99,
    },
    tour_003: {
      id: "tour_003",
      name: "Versailles Palace Tour",
      type: "standard",
      duration: "6 heures",
      price: 299.99,
    },
  };

  return (
    tours[tourId] || {
      id: tourId,
      name: "Tour Inconnu",
      type: "standard",
      price: 0,
    }
  );
}

module.exports = { getTourById };
```

```javascript
// booking-management-service/src/services/userService.js

/**
 * Récupérer les détails d'un utilisateur par ID
 * (Dans un vrai système, ceci ferait un appel à la base de données)
 */
async function getUserById(userId) {
  // Simulation de données
  const users = {
    user_001: {
      id: "user_001",
      name: "Tony Stark",
      email: "tony.stark@avengers.com",
      phone: "+1-555-0100",
    },
    user_002: {
      id: "user_002",
      name: "Bruce Wayne",
      email: "bruce.wayne@wayne.com",
      phone: "+1-555-0200",
    },
    user_003: {
      id: "user_003",
      name: "Peter Parker",
      email: "peter.parker@dailybugle.com",
      phone: "+1-555-0300",
    },
  };

  return (
    users[userId] || {
      id: userId,
      name: "Utilisateur Inconnu",
      email: "unknown@example.com",
      phone: "+0-000-0000",
    }
  );
}

module.exports = { getUserById };
```

#### Résultat Attendu

Quand une réservation premium est créée :

```
📨 Message publié 'booking.confirmed.premium': {"bookingId":"bkg_123",...}

📨 Événement reçu: 'booking.confirmed.premium'
🌟 Réservation Premium détectée - Envoi notifications prioritaires

📬 Envoi d'email de confirmation...
📧 Email envoyé à tony.stark@avengers.com pour le tour "Tour Eiffel Experience Premium" (⭐ Premium)
   👤 Client: Tony Stark
   💰 Montant: 499.99 USD
   👥 Participants: 2 personne(s)
   📅 Date du tour: 15/02/2024
   🆔 ID Réservation: bkg_123
✅ Email envoyé avec succès!

📱 Envoi de SMS...
   Destinataire: +1-555-0100
   Message: Votre réservation pour "Tour Eiffel Experience Premium" le 15/02/2024 est confirmée!
✅ SMS envoyé avec succès!
```

---

## Exercice 2 : Amélioration Kafka Producer/Consumer

### Énoncé

**Objectif** : Implémenter la gestion d'erreurs et l'idempotence.

**Tâches** :

1. **Gestion d'erreurs pour le producer** :

   - Implémenter un mécanisme de retry avec backoff exponentiel en cas d'échec d'envoi
   - Logger les échecs persistants

2. **Idempotence du consumer** :

   - Ajouter un système de vérification pour éviter de traiter deux fois le même message
   - Utiliser Redis pour stocker les `bookingId` déjà traités

3. **Correlation ID** :
   - Ajouter un `correlationId` dans les headers du message
   - Propager ce `correlationId` dans tous les logs pour le tracing end-to-end

---

### Solution

#### Partie 1 : Kafka Producer avec Retry et Correlation ID

```javascript
// booking-management-service/src/kafkaProducer.js
const { Kafka, logLevel } = require("kafkajs");
const { v4: uuidv4 } = require("uuid");

const KAFKA_BROKERS = [process.env.KAFKA_BROKER || "localhost:9092"];
const TOPIC_NAME = "tour_booking_events";

const kafka = new Kafka({
  clientId: "booking-management-service",
  brokers: KAFKA_BROKERS,
  logLevel: logLevel.ERROR,
  retry: {
    initialRetryTime: 100,
    retries: 8,
  },
});

const producer = kafka.producer({
  idempotent: true, // Garantit que les messages ne sont pas dupliqués
  maxInFlightRequests: 5,
  transactionalId: "booking-producer-tx-id",
});

/**
 * Connexion du producer Kafka
 */
async function connectKafkaProducer() {
  try {
    await producer.connect();
    console.log("✅ Kafka Producer connecté");
  } catch (error) {
    console.error("❌ Échec de connexion Kafka Producer:", error);
    process.exit(1);
  }
}

/**
 * Retry avec backoff exponentiel
 * @param {Function} fn - Fonction à réessayer
 * @param {number} maxRetries - Nombre maximum de tentatives
 * @param {string} correlationId - ID de corrélation pour les logs
 */
async function retryWithBackoff(fn, maxRetries = 5, correlationId) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        console.error(
          `❌ [${correlationId}] Échec définitif après ${maxRetries} tentatives:`,
          error.message
        );
        throw error;
      }

      // Backoff exponentiel: 2^attempt * 100ms
      const delayMs = Math.pow(2, attempt) * 100;
      console.warn(
        `⚠️ [${correlationId}] Tentative ${attempt}/${maxRetries} échouée. Nouvelle tentative dans ${delayMs}ms...`
      );

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

/**
 * Publier un événement "Tour Réservé" vers Kafka avec retry et correlation ID
 * @param {Object} bookingDetails - Détails de la réservation
 * @param {string} correlationId - ID de corrélation (optionnel, généré si absent)
 * @returns {Object} - { success: boolean, correlationId: string }
 */
async function publishTourBookedEventKafka(
  bookingDetails,
  correlationId = null
) {
  // Générer un correlation ID si non fourni
  const corrId = correlationId || uuidv4();

  if (!producer) {
    console.error(`❌ [${corrId}] Kafka producer non initialisé.`);
    return { success: false, correlationId: corrId };
  }

  const message = JSON.stringify(bookingDetails);

  try {
    console.log(`📤 [${corrId}] Tentative d'envoi du message vers Kafka...`);

    // Utiliser retry avec backoff exponentiel
    await retryWithBackoff(
      async () => {
        await producer.send({
          topic: TOPIC_NAME,
          messages: [
            {
              key: bookingDetails.bookingId.toString(),
              value: message,
              headers: {
                eventType: "booking.confirmed",
                correlationId: corrId,
                timestamp: Date.now().toString(),
                source: "booking-management-service",
                version: "1.0",
              },
            },
          ],
        });
      },
      5,
      corrId
    );

    console.log(`✅ [${corrId}] Message publié vers Kafka avec succès`);
    return { success: true, correlationId: corrId };
  } catch (error) {
    console.error(
      `❌ [${corrId}] Échec définitif de publication Kafka:`,
      error
    );

    // Logger l'échec dans un système de monitoring (ex: Sentry, DataDog)
    // await logToMonitoring('kafka_publish_failure', { corrId, error, bookingDetails });

    return { success: false, correlationId: corrId, error: error.message };
  }
}

/**
 * Déconnexion gracieuse
 */
async function disconnectKafkaProducer() {
  try {
    await producer.disconnect();
    console.log("Kafka Producer déconnecté");
  } catch (error) {
    console.error("Erreur lors de la déconnexion:", error);
  }
}

// Gestion de l'arrêt gracieux
process.on("SIGTERM", disconnectKafkaProducer);
process.on("SIGINT", disconnectKafkaProducer);

module.exports = {
  connectKafkaProducer,
  publishTourBookedEventKafka,
  disconnectKafkaProducer,
};
```

#### Partie 2 : Kafka Consumer avec Idempotence (Redis)

```javascript
// notification-service/src/kafkaConsumer.js
const { Kafka, logLevel } = require("kafkajs");
const redis = require("redis");
const { promisify } = require("util");

const KAFKA_BROKERS = [process.env.KAFKA_BROKER || "localhost:9092"];
const TOPIC_NAME = "tour_booking_events";
const GROUP_ID = "notification_service_group";

// Configuration Redis pour l'idempotence
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
  retry_strategy: (options) => {
    if (options.total_retry_time > 1000 * 60 * 60) {
      return new Error("Redis retry time exhausted");
    }
    return Math.min(options.attempt * 100, 3000);
  },
});

const getAsync = promisify(redisClient.get).bind(redisClient);
const setexAsync = promisify(redisClient.setex).bind(redisClient);

const kafka = new Kafka({
  clientId: "notification-service",
  brokers: KAFKA_BROKERS,
  logLevel: logLevel.ERROR,
});

const consumer = kafka.consumer({
  groupId: GROUP_ID,
  sessionTimeout: 30000,
  heartbeatInterval: 3000,
});

/**
 * Vérifier si un message a déjà été traité (idempotence)
 * @param {string} bookingId - ID de la réservation
 * @param {string} correlationId - ID de corrélation pour les logs
 * @returns {boolean} - true si déjà traité
 */
async function isMessageAlreadyProcessed(bookingId, correlationId) {
  try {
    const key = `processed:booking:${bookingId}`;
    const result = await getAsync(key);

    if (result) {
      console.log(`⚠️ [${correlationId}] Message déjà traité: ${bookingId}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(
      `❌ [${correlationId}] Erreur Redis lors de la vérification:`,
      error
    );
    // En cas d'erreur Redis, on continue pour ne pas bloquer le traitement
    return false;
  }
}

/**
 * Marquer un message comme traité
 * @param {string} bookingId - ID de la réservation
 * @param {string} correlationId - ID de corrélation
 * @param {number} ttlSeconds - Durée de vie en secondes (par défaut 24h)
 */
async function markMessageAsProcessed(
  bookingId,
  correlationId,
  ttlSeconds = 86400
) {
  try {
    const key = `processed:booking:${bookingId}`;
    const value = JSON.stringify({
      processedAt: new Date().toISOString(),
      correlationId: correlationId,
    });

    await setexAsync(key, ttlSeconds, value);
    console.log(
      `✅ [${correlationId}] Message marqué comme traité: ${bookingId} (expire dans ${ttlSeconds}s)`
    );
  } catch (error) {
    console.error(
      `❌ [${correlationId}] Erreur Redis lors du marquage:`,
      error
    );
  }
}

/**
 * Traiter un message de réservation
 * @param {Object} eventData - Données de l'événement
 * @param {string} correlationId - ID de corrélation
 */
async function processBookingEvent(eventData, correlationId) {
  const { bookingId, userId, tourName, totalPrice } = eventData;

  console.log(`\n📧 [${correlationId}] Traitement de la notification...`);
  console.log(`   Réservation: ${bookingId}`);
  console.log(`   Utilisateur: ${userId}`);
  console.log(`   Tour: ${tourName}`);
  console.log(`   Montant: ${totalPrice} USD`);

  // Simuler l'envoi d'email (dans un vrai système, utiliser SendGrid, etc.)
  await new Promise((resolve) => setTimeout(resolve, 1000));

  console.log(`✅ [${correlationId}] Notification envoyée avec succès!\n`);
}

/**
 * Démarrer la consommation depuis Kafka
 */
async function startConsumingKafka() {
  try {
    // Connexion Redis
    await new Promise((resolve, reject) => {
      redisClient.on("connect", () => {
        console.log("✅ Connecté à Redis");
        resolve();
      });
      redisClient.on("error", (err) => {
        console.error("❌ Erreur Redis:", err);
        reject(err);
      });
    });

    // Connexion Kafka
    await consumer.connect();
    await consumer.subscribe({
      topic: TOPIC_NAME,
      fromBeginning: false,
    });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        // Extraire le correlation ID depuis les headers
        const correlationId = message.headers?.correlationId
          ? message.headers.correlationId.toString()
          : "unknown";

        const eventType = message.headers?.eventType
          ? message.headers.eventType.toString()
          : "unknown";

        console.log(
          `\n📨 [${correlationId}] Message reçu du topic ${topic}, partition ${partition}, offset ${message.offset}`
        );
        console.log(`   Type d'événement: ${eventType}`);

        if (eventType === "booking.confirmed") {
          try {
            const eventData = JSON.parse(message.value.toString());
            const { bookingId } = eventData;

            // Vérification de l'idempotence
            const alreadyProcessed = await isMessageAlreadyProcessed(
              bookingId,
              correlationId
            );

            if (alreadyProcessed) {
              console.log(`⏭️ [${correlationId}] Message ignoré (déjà traité)`);
              return; // Ne pas traiter à nouveau
            }

            // Traiter le message
            await processBookingEvent(eventData, correlationId);

            // Marquer comme traité (expire après 24h)
            await markMessageAsProcessed(bookingId, correlationId);
          } catch (error) {
            console.error(
              `❌ [${correlationId}] Erreur lors du traitement:`,
              error
            );
            // Dans un vrai système, envoyer à une dead letter queue
            throw error;
          }
        } else {
          console.log(
            `⚠️ [${correlationId}] Type d'événement inconnu: ${eventType}`
          );
        }
      },
    });

    console.log(`\n✅ Kafka Consumer démarré`);
    console.log(`   Topic: ${TOPIC_NAME}`);
    console.log(`   Group: ${GROUP_ID}`);
    console.log(`   Idempotence: Activée (Redis)\n`);
  } catch (error) {
    console.error("❌ Échec du démarrage du consumer Kafka:", error);
    process.exit(1);
  }
}

/**
 * Déconnexion gracieuse
 */
async function disconnectKafkaConsumer() {
  try {
    await consumer.disconnect();
    redisClient.quit();
    console.log("Kafka Consumer et Redis déconnectés");
  } catch (error) {
    console.error("Erreur lors de la déconnexion:", error);
  }
}

// Gestion de l'arrêt gracieux
process.on("SIGTERM", disconnectKafkaConsumer);
process.on("SIGINT", disconnectKafkaConsumer);

// Démarrer la consommation au démarrage du service
startConsumingKafka();
```

#### Partie 3 : Configuration Docker Compose avec Redis

```yaml
# docker-compose.yml
version: "3.8"

services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    hostname: zookeeper
    container_name: zookeeper
    ports:
      - "2181:2181"
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    hostname: kafka
    container_name: kafka
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:29092,PLAINTEXT_HOST://localhost:9092
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_NUM_PARTITIONS: 3

  redis:
    image: redis:7-alpine
    hostname: redis
    container_name: redis
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data

volumes:
  redis-data:
```

#### Partie 4 : Installation des Dépendances

```bash
# Dans booking-service
npm install kafkajs uuid

# Dans notification-service
npm install kafkajs redis
```

#### Résultat Attendu

**Premier message** :

```
📤 [a1b2c3d4-e5f6-7890] Tentative d'envoi du message vers Kafka...
✅ [a1b2c3d4-e5f6-7890] Message publié vers Kafka avec succès

📨 [a1b2c3d4-e5f6-7890] Message reçu du topic tour_booking_events, partition 0, offset 42
   Type d'événement: booking.confirmed

📧 [a1b2c3d4-e5f6-7890] Traitement de la notification...
   Réservation: bkg_123
   Utilisateur: user_001
   Tour: Paris City Tour
   Montant: 199.99 USD
✅ [a1b2c3d4-e5f6-7890] Notification envoyée avec succès!
✅ [a1b2c3d4-e5f6-7890] Message marqué comme traité: bkg_123 (expire dans 86400s)
```

**Message dupliqué** :

```
📨 [a1b2c3d4-e5f6-7890] Message reçu du topic tour_booking_events, partition 0, offset 43
   Type d'événement: booking.confirmed
⚠️ [a1b2c3d4-e5f6-7890] Message déjà traité: bkg_123
⏭️ [a1b2c3d4-e5f6-7890] Message ignoré (déjà traité)
```

**Échec avec retry** :

```
📤 [x9y8z7w6-v5u4-3210] Tentative d'envoi du message vers Kafka...
⚠️ [x9y8z7w6-v5u4-3210] Tentative 1/5 échouée. Nouvelle tentative dans 200ms...
⚠️ [x9y8z7w6-v5u4-3210] Tentative 2/5 échouée. Nouvelle tentative dans 400ms...
✅ [x9y8z7w6-v5u4-3210] Message publié vers Kafka avec succès
```

---

## Exercice 3 : Choisir une Message Queue

### Énoncé

**Objectif** : Analyser et justifier le choix entre RabbitMQ et Kafka pour différents scénarios.

**Tâches** :

Rédigez une analyse (2-3 paragraphes) pour chacun des scénarios suivants, en justifiant votre choix de RabbitMQ ou Kafka :

1. **Scénario A** : Envoi d'emails de confirmation de réservation (latence max 5 secondes, volume: 1000 msg/jour)
2. **Scénario B** : Collecte et analyse en temps réel de tous les clics utilisateurs sur l'application web (volume: 1M+ événements/jour, besoin de rejouer les événements pour analytics)
3. **Scénario C** : Workflow de traitement de paiement avec compensation en cas d'échec (besoin de garanties fortes de livraison, dead letter queues)

---

### Solution

#### Scénario A : Envoi d'Emails de Confirmation de Réservation

**Choix recommandé : RabbitMQ** ✅

**Justification** :

Pour l'envoi d'emails de confirmation de réservation, **RabbitMQ** est le choix optimal pour plusieurs raisons. Premièrement, le volume de 1000 messages par jour est relativement faible (environ 0,7 msg/sec en moyenne), ce qui est largement dans les capacités de RabbitMQ sans nécessiter l'overhead de Kafka. La latence maximale de 5 secondes est facilement respectée avec RabbitMQ, qui offre une latence typique de quelques millisecondes à quelques centaines de millisecondes.

Deuxièmement, les emails de confirmation sont des messages **éphémères** : une fois l'email envoyé, il n'y a pas besoin de conserver l'événement pour un traitement ultérieur. RabbitMQ permet de supprimer automatiquement les messages après leur consommation et acknowledgement, ce qui réduit l'utilisation du stockage. De plus, RabbitMQ offre des fonctionnalités natives comme les **dead letter queues** (DLQ) qui sont essentielles pour gérer les échecs d'envoi d'email (adresse invalide, serveur SMTP temporairement indisponible). Les messages qui échouent après plusieurs tentatives peuvent être automatiquement routés vers une DLQ pour investigation manuelle.

Enfin, la simplicité opérationnelle de RabbitMQ est un avantage majeur pour ce cas d'usage. L'équipe peut rapidement mettre en place un système fiable avec un minimum de configuration, et l'interface de gestion web de RabbitMQ facilite le monitoring des queues et le dépannage. Pour un système de notifications comme celui-ci, où la complexité de Kafka n'apporte pas de valeur ajoutée significative, RabbitMQ représente le meilleur rapport simplicité/efficacité.

**Architecture recommandée** :

```
Booking Service
       │
       └──> Exchange "notifications"
              │
              ├──> Queue "email_confirmations" ──> Email Service
              │                                    (Retry 3x)
              │                                         │
              │                                         │ (échecs)
              │                                         v
              └──> Dead Letter Queue "email_failed" ──> Monitoring
```

---

#### Scénario B : Collecte et Analyse en Temps Réel des Clics Utilisateurs

**Choix recommandé : Apache Kafka** ✅

**Justification** :

Pour la collecte et l'analyse de clics utilisateurs à grande échelle, **Apache Kafka** est indiscutablement la meilleure solution. Le volume de 1M+ événements par jour (environ 12-15 événements/seconde en moyenne, avec des pics potentiellement beaucoup plus élevés) dépasse largement le sweet spot de RabbitMQ et entre dans le domaine où Kafka excelle. Kafka est spécifiquement conçu pour gérer des flux d'événements à très haut débit, avec des capacités de traitement pouvant atteindre des centaines de milliers voire millions de messages par seconde.

Le besoin de **rejouer les événements** pour l'analytics est l'argument décisif en faveur de Kafka. Contrairement à RabbitMQ qui supprime les messages après consommation, Kafka conserve tous les événements dans un log immuable pendant une période configurable (jours, semaines, voire indéfiniment). Cette capacité de **replayability** est cruciale pour plusieurs cas d'usage : recalculer les métriques historiques après avoir corrigé un bug dans le code d'analytics, former de nouveaux modèles de machine learning sur des données historiques, ou permettre à de nouveaux consumers (par exemple, un nouveau dashboard analytics) de traiter l'historique complet des clics depuis le début.

De plus, l'architecture distribuée de Kafka avec son système de **partitions** permet de paralléliser facilement le traitement des clics. Par exemple, on peut partitionner les événements par `userId` pour garantir que tous les clics d'un même utilisateur sont traités dans l'ordre par le même consumer, tout en distribuant la charge de traitement sur plusieurs instances. Cette scalabilité horizontale native de Kafka est essentielle pour maintenir des performances constantes même quand le volume d'événements augmente. Le modèle de consumer groups de Kafka permet également d'avoir plusieurs équipes (analytics, marketing, product) qui consomment indépendamment le même flux d'événements, chacune avec son propre offset.

**Architecture recommandée** :

```
Web App / Mobile App
       │
       └──> Kafka Topic "user_clicks" (12 partitions)
              │
              ├──> Consumer Group "realtime_analytics"
              │    └──> 4 instances (analytics en temps réel)
              │
              ├──> Consumer Group "data_warehouse"
              │    └──> 2 instances (sauvegarde en S3/BigQuery)
              │
              └──> Consumer Group "ml_training"
                   └──> 1 instance (entraînement modèles ML)
```

---

#### Scénario C : Workflow de Traitement de Paiement avec Compensation

**Choix recommandé : RabbitMQ** ✅

**Justification** :

Pour un workflow de traitement de paiement avec mécanisme de compensation, **RabbitMQ** offre les garanties et les fonctionnalités les mieux adaptées. Le traitement des paiements nécessite des **garanties de livraison extrêmement fortes** : aucun message de paiement ne peut être perdu, et chaque paiement doit être traité exactement une fois (ou au moins avec idempotence garantie). RabbitMQ, avec son protocole AMQP et son système d'acknowledgements manuels, offre une fiabilité éprouvée pour ce type de workflows critiques. La capacité d'attendre l'acknowledgement explicite du consumer avant de supprimer le message de la queue garantit qu'aucune transaction n'est perdue même en cas de crash d'un service.

Les **dead letter queues** (DLQ) de RabbitMQ sont essentielles pour implémenter un système de compensation robuste dans les workflows de paiement. Quand une étape du workflow échoue (par exemple, le paiement est refusé par la banque, ou le service d'inventory ne peut pas réserver les places), le message peut être automatiquement routé vers une DLQ spécifique. Ce mécanisme permet d'implémenter facilement le pattern Saga avec des transactions compensatoires : on peut avoir une queue "payment_compensation" qui déclenche l'annulation de la réservation et le remboursement du client. RabbitMQ permet également de configurer des délais de retry avec backoff exponentiel directement au niveau du broker, sans logique complexe dans le code applicatif.

Le **routage sophistiqué** de RabbitMQ via les exchanges (topic, direct, fanout) est particulièrement utile pour orchestrer les différentes étapes d'un workflow de paiement complexe. Par exemple, on peut utiliser des routing keys comme `payment.initiated`, `payment.authorized`, `payment.captured`, `payment.failed` pour router les messages vers les queues appropriées selon l'état de la transaction. Cette flexibilité de routage, combinée avec la possibilité de définir des **Time-To-Live (TTL)** et des **priority queues**, permet d'implémenter des workflows de paiement sophistiqués avec timeouts et gestion des priorités (par exemple, traiter en priorité les paiements premium).

**Architecture recommandée** :

```
API Gateway
       │
       └──> Exchange "payments" (Topic)
              │
              ├──> [routing: payment.initiated]
              │    └──> Queue "payment_processing" ──> Payment Service
              │                                         (Retry 3x, TTL: 30s)
              │                                              │
              │                                              ├─ [success]
              │                                              │  └──> publish "payment.captured"
              │                                              │
              │                                              └─ [failure]
              │                                                 └──> DLQ "payment_failed"
              │
              ├──> [routing: payment.captured]
              │    └──> Queue "booking_confirmation" ──> Booking Service
              │                                          (finalise réservation)
              │
              └──> [routing: payment.failed]
                   └──> Queue "payment_compensation" ──> Compensation Service
                                                         (annulation + remboursement)
```

**Avantages spécifiques pour les paiements** :

- ✅ **Durabilité** : Messages persistés sur disque
- ✅ **Acknowledgements manuels** : Pas de perte de messages
- ✅ **Dead Letter Queues** : Gestion des échecs et compensation
- ✅ **TTL et Priority** : Timeouts et priorités des transactions
- ✅ **Routage flexible** : Orchestration des workflows complexes
- ✅ **Monitoring simple** : Interface web pour surveiller l'état des queues

---

## Conclusion

Ces trois exercices démontrent l'importance de comprendre les caractéristiques et les trade-offs entre RabbitMQ et Kafka pour choisir la solution appropriée selon le cas d'usage :

- **RabbitMQ** excelle pour les **task queues**, les **workflows transactionnels**, et les cas où les **garanties de livraison** et le **routage complexe** sont critiques.

- **Kafka** est optimal pour les **flux d'événements à haut débit**, les **analytics en temps réel**, et les cas nécessitant la **replayability** et le **traitement distribué**.

Le choix ne doit pas être dogmatique : de nombreuses architectures modernes utilisent **les deux** en fonction des besoins spécifiques de chaque composant du système.
