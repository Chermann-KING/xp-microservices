# Leçon 5.2 - Mise en œuvre de la Communication Asynchrone avec Message Queues (RabbitMQ, Kafka)

**Module 5** : Architecture Event-Driven et Communication Asynchrone

---

## Objectifs pédagogiques

- Comprendre le rôle et les avantages des message queues dans les architectures microservices
- Configurer et utiliser **RabbitMQ** pour la communication asynchrone
- Implémenter des **producteurs** et **consommateurs** avec RabbitMQ
- Configurer et utiliser **Apache Kafka** pour le streaming d'événements
- Comparer RabbitMQ et Kafka pour choisir la solution appropriée
- Gérer la **durabilité**, les **accusés de réception** et la **tolérance aux pannes**

## Prérequis

- Leçon 5.1 : Introduction à l'Architecture Event-Driven
- Docker installé pour exécuter RabbitMQ et Kafka
- Node.js et npm configurés
- Compréhension des concepts asynchrones (Promises, async/await)

---

## Introduction

L'architecture événementielle, comme introduite dans la leçon précédente, nécessite des mécanismes robustes pour la communication asynchrone entre microservices. Les **message queues** (files d'attente de messages) servent de composant fondamental pour permettre une interaction découplée, scalable et résiliente dans de tels systèmes.

Elles fournissent un **buffer** pour les messages, permettant aux services d'envoyer et de recevoir des données sans connexions directes et synchrones, améliorant ainsi la tolérance aux pannes et la réactivité globale de l'application.

---

## 1. Comprendre les Message Queues

Les message queues facilitent la communication asynchrone en fournissant un **stockage temporaire** pour les messages.

### 1.1 Flux de Communication

```
┌─────────────────────────────────────────────────────────────────┐
│              FLUX MESSAGE QUEUE - VUE D'ENSEMBLE                │
└─────────────────────────────────────────────────────────────────┘

  Producer Service              Message Queue             Consumer Service
  (Booking Service)             (RabbitMQ/Kafka)         (Notification Service)
         │                             │                          │
         │ 1. Publier message          │                          │
         │    "Tour Réservé"           │                          │
         │ ──────────────────────────> │                          │
         │                             │                          │
         │                             │ 2. Stocker message       │
         │                             │    (durable)             │
         │                             │                          │
         │                             │ 3. Délivrer message      │
         │                             │ ───────────────────────> │
         │                             │                          │
         │                             │                          │ 4. Traiter
         │                             │                          │    (envoyer email)
         │                             │                          │
         │                             │ 5. Accusé de réception   │
         │                             │ <─────────────────────── │
```

Un service **producteur** envoie des messages à une queue, et un service **consommateur** récupère les messages de cette queue. Ce mécanisme découple le producteur du consommateur : le producteur n'a pas besoin de savoir si le consommateur est disponible ou comment il traitera le message.

---

## 2. Concepts Clés des Message Queues

### 2.1 Composants Fondamentaux

| Composant    | Description                                                                              | Exemple (Application Touristique)                           |
| ------------ | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| **Producer** | Service qui crée et envoie des messages à une queue                                      | Booking Management Service publiant "booking.confirmed"     |
| **Consumer** | Service qui se connecte à une queue, s'abonne à des messages spécifiques et les traite   | Notification Service consommant les messages de réservation |
| **Message**  | La charge utile de données envoyée par le producteur et consommée par le consumer        | `{bookingId, tourId, userId, date, price}`                  |
| **Queue**    | Structure de données durable qui stocke les messages dans l'ordre où ils sont reçus      | `notification_queue`, `inventory_queue`                     |
| **Broker**   | Le système de message queue lui-même (RabbitMQ, Kafka) qui gère les queues et le routage | Instance RabbitMQ ou cluster Kafka                          |

---

## 3. Avantages de la Communication Asynchrone

### 3.1 Découplage

Les services n'ont pas besoin de connaître l'existence ou le statut actuel des autres services.

**Exemple** : Le Booking Service peut publier un événement `"booking.confirmed"` sans savoir quels autres services réagiront (payment, notification, inventory).

### 3.2 Scalabilité

Les producteurs peuvent envoyer des messages à leur propre rythme, et les consommateurs peuvent les traiter indépendamment.

**Avantage** : Si un service consommateur est surchargé, les messages s'accumulent simplement dans la queue, en attendant des ressources disponibles, sans impacter le producteur. De nouveaux consommateurs peuvent être ajoutés pour gérer la charge accrue.

### 3.3 Résilience

Si un service consommateur échoue, les messages restent dans la queue jusqu'à ce que le service récupère ou qu'une nouvelle instance prenne le relais.

**Résultat** : Prévention de la perte de données et garantie de traitement éventuel.

### 3.4 Load Leveling (Lissage de Charge)

Les message queues peuvent absorber les pics de trafic, empêchant les services en aval d'être submergés.

**Mécanisme** : La queue agit comme un buffer, lissant les taux de livraison des messages.

### 3.5 Tolérance aux Pannes

Une panne transitoire dans un service consommateur ne bloque pas le service producteur.

**Garantie** : Les messages sont réessayés ou livrés à d'autres consommateurs.

---

## 4. Exemples Réels d'Utilisation de Message Queues

### 4.1 Traitement de Commandes E-commerce

Quand un client passe une commande, le **Order Service** publie un événement `"Order Placed"` vers une message queue.

**Consommateurs multiples** :

```
Order Service (Producer)
       │
       ├──> "order.placed" event
       │
       v
Message Queue (RabbitMQ)
       │
       ├──> Payment Service (traite le paiement)
       ├──> Inventory Service (réserve le stock)
       ├──> Shipping Service (prépare l'expédition)
       └──> Notification Service (envoie email de confirmation)
```

**Avantage** : Si le Payment Service est temporairement down, le message de commande persiste, et les autres services peuvent continuer, ou le Payment Service peut le traiter une fois récupéré.

---

### 4.2 Traitement d'Images/Vidéos

Un utilisateur télécharge une image haute résolution sur une plateforme de médias sociaux.

**Flux** :

1. **Upload Service** publie un événement `"Image Uploaded"`
2. **Image Resizing Service** crée des thumbnails et diverses résolutions
3. **Watermarking Service** ajoute un watermark
4. **Content Moderation Service** scanne l'image pour contenu inapproprié

**Résultat** : Ces opérations se passent en parallèle, réduisant significativement le temps d'attente de l'utilisateur.

---

### 4.3 Scénario Hypothétique : Confirmation de Réservation (Application de Réservation Touristique)

Quand un utilisateur réserve un tour avec succès, le **Booking Management Microservice** doit informer plusieurs autres services :

```
┌────────────────────────────────────────────────────────────────┐
│       FLUX COMPLET: RÉSERVATION AVEC MESSAGE QUEUE             │
└────────────────────────────────────────────────────────────────┘

Booking Management Service
         │
         │ 1. Crée réservation en DB
         │ 2. Publie "tour.booked" event
         │
         v
   Message Queue (RabbitMQ)
         │
         ├──> Payment Gateway Service (finalise paiement)
         ├──> Notification Service (envoie email/SMS)
         └──> Availability Service (met à jour disponibilité)
```

**Alternative sans Message Queue** (problématique) :

- Appels HTTP directs vers chaque service
- Couplage fort
- Si un service est down, tout le flux échoue

**Avec Message Queue** :

- Publication unique d'événement
- Chaque service s'abonne indépendamment
- Résilience : si un service est down, il traite le message plus tard

---

## 5. Implémentation avec RabbitMQ

**RabbitMQ** est un courtier de messages open-source populaire qui implémente le protocole **AMQP** (Advanced Message Queuing Protocol). Il fournit des fonctionnalités de messaging robustes, incluant la durabilité des messages, le routage flexible et des bibliothèques clientes pour de nombreux langages.

### 5.1 Composants Principaux de RabbitMQ

```
┌────────────────────────────────────────────────────────────────┐
│                  ARCHITECTURE RABBITMQ                         │
└────────────────────────────────────────────────────────────────┘

Producer Service
       │
       │ 1. Publier message
       v
   Exchange (Topic/Fanout/Direct)
       │
       │ 2. Router selon binding + routing key
       │
       ├──> Queue A ──> Consumer Service A
       ├──> Queue B ──> Consumer Service B
       └──> Queue C ──> Consumer Service C
```

| Composant    | Description                                                                  |
| ------------ | ---------------------------------------------------------------------------- |
| **Producer** | Envoie des messages à un exchange                                            |
| **Exchange** | Reçoit les messages et les route vers des queues selon des règles (bindings) |
| **Queue**    | Stocke les messages jusqu'à ce qu'ils soient consommés                       |
| **Consumer** | Récupère les messages des queues                                             |
| **Binding**  | Lien entre un exchange et une queue, défini par une "routing key"            |

### 5.2 Types d'Exchange

| Type        | Description                                                     | Use Case                                  |
| ----------- | --------------------------------------------------------------- | ----------------------------------------- |
| **Direct**  | Route vers les queues dont la routing key correspond exactement | Routage point-à-point                     |
| **Fanout**  | Route vers toutes les queues liées, ignore la routing key       | Broadcasting d'événements                 |
| **Topic**   | Route selon un pattern de routing key (wildcards: \*, #)        | Routage flexible basé sur des patterns    |
| **Headers** | Route selon les headers de message plutôt que la routing key    | Routage complexe basé sur les métadonnées |

---

## 6. Configuration de RabbitMQ avec Docker

### 6.1 Démarrer RabbitMQ

```bash
docker run -d \
  --hostname my-rabbit \
  --name rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  rabbitmq:3-management
```

**Paramètres** :

- `-d` : Mode détaché (background)
- `--hostname my-rabbit` : Définit le hostname dans le conteneur
- `--name rabbitmq` : Nom du conteneur
- `-p 5672:5672` : Port AMQP (protocole de messaging)
- `-p 15672:15672` : Port de l'interface de gestion web
- `rabbitmq:3-management` : Image avec plugin de gestion activé

**Accès à l'interface de gestion** :

- URL : `http://localhost:15672`
- Identifiants par défaut : `guest` / `guest`

---

## 7. Code : Booking Service (Producer avec RabbitMQ)

### 7.1 Installation de la Bibliothèque

```bash
npm install amqplib
```

### 7.2 Implémentation du Producer

```javascript
// booking-service/src/rabbitmqProducer.js
const amqp = require("amqplib");

const RABBITMQ_URL =
  process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";
const EXCHANGE_NAME = "tour_events";

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
    // Dans une vraie application, implémenter une logique de reconnexion
    process.exit(1);
  }
}

/**
 * Publier un événement "Tour Réservé"
 * @param {Object} bookingDetails - Détails de la réservation
 * @returns {boolean} - Succès de la publication
 */
async function publishTourBookedEvent(bookingDetails) {
  if (!channel) {
    console.error("❌ Canal RabbitMQ non établi.");
    return false;
  }

  const routingKey = "tour.booked"; // Clé de routage spécifique
  const message = JSON.stringify(bookingDetails);

  try {
    // Publier le message vers l'exchange avec la routing key
    channel.publish(
      EXCHANGE_NAME,
      routingKey,
      Buffer.from(message),
      { persistent: true } // Message persistant (sauvegardé sur disque)
    );

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

### 7.3 Intégration dans le Route de Réservation

```javascript
// booking-service/src/routes/bookingRoutes.js
const express = require("express");
const router = express.Router();
const { bookTour } = require("../controllers/bookingController");
const { publishTourBookedEvent } = require("../rabbitmqProducer");

router.post("/bookings", async (req, res) => {
  try {
    const bookingData = req.body;

    // 1. Créer la réservation en base de données
    const newBooking = await bookTour(bookingData);

    // 2. Publier l'événement après réservation réussie
    const eventPublished = await publishTourBookedEvent({
      bookingId: newBooking.id,
      tourId: newBooking.tourId,
      userId: newBooking.userId,
      bookingDate: newBooking.createdAt,
      status: "confirmed",
      totalPrice: newBooking.totalPrice,
    });

    if (!eventPublished) {
      console.warn("⚠️ Échec de publication de l'événement vers RabbitMQ.");
      // Considérer un rollback ou une action compensatoire si critique
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

### 7.4 Démarrage du Service

```javascript
// booking-service/src/index.js
const express = require("express");
const { connectRabbitMQ } = require("./rabbitmqProducer");
const bookingRoutes = require("./routes/bookingRoutes");

const app = express();
app.use(express.json());
app.use("/api", bookingRoutes);

const PORT = process.env.PORT || 3003;

async function startServer() {
  // Connexion à RabbitMQ au démarrage
  await connectRabbitMQ();

  app.listen(PORT, () => {
    console.log(`🚀 Booking Service démarré sur le port ${PORT}`);
  });
}

startServer();
```

---

## 8. Code : Notification Service (Consumer avec RabbitMQ)

### 8.1 Installation

```bash
npm install amqplib
```

### 8.2 Implémentation du Consumer

```javascript
// notification-service/src/rabbitmqConsumer.js
const amqp = require("amqplib");

const RABBITMQ_URL =
  process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";
const EXCHANGE_NAME = "tour_events";
const QUEUE_NAME = "notification_queue";
const ROUTING_KEY_PATTERN = "tour.booked"; // Pattern pour s'abonner

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

    // Lier la queue à l'exchange avec la routing key
    await channel.bindQueue(q.queue, EXCHANGE_NAME, ROUTING_KEY_PATTERN);

    console.log(
      `📬 En attente de messages dans ${q.queue}. CTRL+C pour quitter`
    );

    // Consommer les messages
    channel.consume(
      q.queue,
      async (msg) => {
        if (msg.content) {
          const eventData = JSON.parse(msg.content.toString());
          console.log(`📨 Reçu '${msg.fields.routingKey}':`, eventData);

          // Simuler l'envoi d'une notification
          console.log(
            `📧 Envoi de notification pour réservation ${eventData.bookingId} à l'utilisateur ${eventData.userId}`
          );

          // Dans un vrai scénario, envoyer email, SMS ou notification push
          // await EmailService.sendBookingConfirmation(eventData);

          // Accuser réception du message (très important!)
          channel.ack(msg);
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

---

## 9. Concepts Importants : Acknowledgements et Durabilité

### 9.1 Message Acknowledgement

```javascript
channel.consume(
  queue,
  (msg) => {
    // Traiter le message
    processMessage(msg);

    // ✅ Accuser réception après traitement réussi
    channel.ack(msg);
  },
  {
    noAck: false, // IMPORTANT: Accusé manuel
  }
);
```

**Pourquoi c'est important** :

- ✅ Si le consumer échoue avant `ack()`, RabbitMQ relivrera le message
- ✅ Garantit qu'aucun message n'est perdu en cas de panne du consumer
- ❌ Si `noAck: true`, les messages sont considérés traités dès la livraison (risqué)

### 9.2 Queues et Exchanges Durables

```javascript
// Exchange durable (survit au redémarrage du broker)
await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: true });

// Queue durable
await channel.assertQueue(QUEUE_NAME, { durable: true });
```

**Avantages** :

- ✅ Les exchanges et queues survivent au redémarrage de RabbitMQ
- ✅ Évite la perte de configuration

### 9.3 Messages Persistants

```javascript
channel.publish(exchange, routingKey, Buffer.from(message), {
  persistent: true, // ✅ Message sauvegardé sur disque
});
```

**Garantie** :

- ✅ Si RabbitMQ crash avant de livrer le message, il sera toujours disponible après redémarrage
- ✅ Fonctionne en conjonction avec les queues durables

---

## 10. Implémentation avec Apache Kafka

**Apache Kafka** est une plateforme de streaming distribuée, souvent utilisée pour des flux d'événements à **haut débit** et **faible latence**. Contrairement à RabbitMQ qui est un courtier de messages général, Kafka est optimisé pour gérer des flux d'événements et est souvent préféré pour des pipelines de données en temps réel à grande échelle.

### 10.1 Concepts Principaux de Kafka

```
┌────────────────────────────────────────────────────────────────┐
│                    ARCHITECTURE KAFKA                          │
└────────────────────────────────────────────────────────────────┘

Producer Service A ──┐
                     │
Producer Service B ──┼──> Topic: tour_events
                     │     ├─ Partition 0 (offset: 0, 1, 2, ...)
                     │     ├─ Partition 1 (offset: 0, 1, 2, ...)
Producer Service C ──┘     └─ Partition 2 (offset: 0, 1, 2, ...)
                                    │
                                    ├──> Consumer Group A
                                    │    ├─ Consumer 1 (Partition 0)
                                    │    └─ Consumer 2 (Partition 1, 2)
                                    │
                                    └──> Consumer Group B
                                         ├─ Consumer 1 (Partition 0, 1)
                                         └─ Consumer 2 (Partition 2)
```

| Composant          | Description                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------ |
| **Producer**       | Envoie des records (messages) vers des topics Kafka                                        |
| **Consumer**       | S'abonne à un ou plusieurs topics et traite les records                                    |
| **Broker**         | Serveur Kafka qui stocke les records et gère les requêtes producer/consumer                |
| **Topic**          | Catégorie ou flux vers lequel les records sont publiés. Les topics sont partitionnés       |
| **Partition**      | Division d'un topic en séquences ordonnées et immuables de records                         |
| **Consumer Group** | Groupe de consumers qui traitent collectivement les records. Chaque partition → 1 consumer |

---

## 11. Configuration de Kafka avec Docker Compose

### 11.1 Fichier docker-compose.yml

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
      - "9093:9093"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:29092,PLAINTEXT_HOST://localhost:9092
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_NUM_PARTITIONS: 3
```

### 11.2 Démarrage

```bash
docker-compose up -d
```

---

## 12. Code : Booking Service (Producer avec Kafka)

### 12.1 Installation

```bash
npm install kafkajs
```

### 12.2 Implémentation du Producer

```javascript
// booking-service/src/kafkaProducer.js
const { Kafka } = require("kafkajs");

const KAFKA_BROKERS = [process.env.KAFKA_BROKER || "localhost:9092"];
const TOPIC_NAME = "tour_events";

const kafka = new Kafka({
  clientId: "booking-management-service",
  brokers: KAFKA_BROKERS,
});

const producer = kafka.producer();

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
 * Publier un événement "Tour Réservé" vers Kafka
 * @param {Object} bookingDetails - Détails de la réservation
 * @returns {boolean} - Succès de la publication
 */
async function publishTourBookedEventKafka(bookingDetails) {
  if (!producer) {
    console.error("❌ Kafka producer non initialisé.");
    return false;
  }

  const message = JSON.stringify(bookingDetails);

  try {
    await producer.send({
      topic: TOPIC_NAME,
      messages: [
        {
          // Utiliser bookingId comme clé pour garantir l'ordre dans la partition
          key: bookingDetails.bookingId.toString(),
          value: message,
          headers: {
            eventType: "tour.booked", // Header personnalisé
          },
        },
      ],
    });

    console.log(`📨 Kafka - Message 'tour.booked' publié: ${message}`);
    return true;
  } catch (error) {
    console.error("❌ Échec de publication Kafka:", error);
    return false;
  }
}

/**
 * Déconnexion gracieuse
 */
async function disconnectKafkaProducer() {
  await producer.disconnect();
  console.log("Kafka Producer déconnecté");
}

// Gestion de l'arrêt gracieux
process.on("SIGTERM", disconnectKafkaProducer);
process.on("SIGINT", disconnectKafkaProducer);

module.exports = {
  connectKafkaProducer,
  publishTourBookedEventKafka,
};
```

### 12.3 Intégration dans le Route

```javascript
// booking-service/src/routes/bookingRoutes.js (version Kafka)
const express = require("express");
const router = express.Router();
const { bookTour } = require("../controllers/bookingController");
const { publishTourBookedEventKafka } = require("../kafkaProducer");

router.post("/bookings", async (req, res) => {
  try {
    const bookingData = req.body;
    const newBooking = await bookTour(bookingData);

    // Publier l'événement vers Kafka
    const eventPublished = await publishTourBookedEventKafka({
      bookingId: newBooking.id,
      tourId: newBooking.tourId,
      userId: newBooking.userId,
      bookingDate: newBooking.createdAt,
      status: "confirmed",
      totalPrice: newBooking.totalPrice,
    });

    if (!eventPublished) {
      console.warn("⚠️ Échec de publication vers Kafka.");
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

---

## 13. Code : Notification Service (Consumer avec Kafka)

```javascript
// notification-service/src/kafkaConsumer.js
const { Kafka } = require("kafkajs");

const KAFKA_BROKERS = [process.env.KAFKA_BROKER || "localhost:9092"];
const TOPIC_NAME = "tour_events";
const GROUP_ID = "notification_service_group"; // ID unique du consumer group

const kafka = new Kafka({
  clientId: "notification-service",
  brokers: KAFKA_BROKERS,
});

const consumer = kafka.consumer({ groupId: GROUP_ID });

/**
 * Démarrer la consommation depuis Kafka
 */
async function startConsumingKafka() {
  try {
    await consumer.connect();
    await consumer.subscribe({
      topic: TOPIC_NAME,
      fromBeginning: false, // Commencer depuis le dernier offset
    });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        // Extraire le type d'événement depuis les headers
        const eventType =
          message.headers && message.headers.eventType
            ? message.headers.eventType.toString()
            : "unknown";

        if (eventType === "tour.booked") {
          const eventData = JSON.parse(message.value.toString());

          console.log(
            `📨 Kafka - Reçu du topic ${topic}, partition ${partition}, offset ${message.offset}`
          );
          console.log(`Type d'événement: ${eventType}, Données:`, eventData);

          // Simuler l'envoi d'une notification
          console.log(
            `📧 Envoi de notification pour réservation ${eventData.bookingId} à l'utilisateur ${eventData.userId}`
          );

          // Dans un vrai scénario:
          // await EmailService.sendBookingConfirmation(eventData);
        } else {
          console.log(`⚠️ Type d'événement inconnu: ${eventType}`);
        }
      },
    });

    console.log(
      `✅ Kafka Consumer démarré - Topic: ${TOPIC_NAME}, Group: ${GROUP_ID}`
    );
  } catch (error) {
    console.error("❌ Échec du démarrage du consumer Kafka:", error);
    process.exit(1);
  }
}

/**
 * Déconnexion gracieuse
 */
async function disconnectKafkaConsumer() {
  await consumer.disconnect();
  console.log("Kafka Consumer déconnecté");
}

// Gestion de l'arrêt gracieux
process.on("SIGTERM", disconnectKafkaConsumer);
process.on("SIGINT", disconnectKafkaConsumer);

// Démarrer la consommation au démarrage du service
startConsumingKafka();
```

---

## 14. RabbitMQ vs Kafka : Comparaison

| Caractéristique         | RabbitMQ                                            | Kafka                                           |
| ----------------------- | --------------------------------------------------- | ----------------------------------------------- |
| **Modèle de messaging** | Message Queues / Pub-Sub                            | Distributed Streaming Platform                  |
| **Protocole**           | AMQP (Advanced Message Queuing Protocol)            | Protocole binaire personnalisé                  |
| **Persistance**         | Messages durables dans les queues                   | Log-based, tous les messages sont persistants   |
| **Livraison**           | At-least-once garanti avec acknowledgements         | At-least-once, souvent effectively-once         |
| **Ordre**               | Par queue                                           | Par partition                                   |
| **Scalabilité**         | Scalable horizontalement, plus complexe             | Conçu pour haut débit, scalabilité horizontale  |
| **Use Cases**           | Task queues, messages court-terme, routage complexe | Event streaming, analytics temps réel, logs     |
| **Replayability**       | Non (messages supprimés après consommation)         | Oui (messages conservés selon retention policy) |
| **Complexité**          | Plus simple pour démarrer                           | Courbe d'apprentissage plus élevée              |
| **Performance**         | ~20k-50k msg/sec                                    | ~100k-1M+ msg/sec                               |

### 14.1 Quand choisir RabbitMQ ?

✅ **Cas d'usage** :

- Task queues avec routage complexe
- Messages éphémères (courte durée de vie)
- Besoin de garanties de livraison forte (dead letter queues, retry)
- Équipe déjà familière avec AMQP
- Démarrage rapide et simplicité

**Exemple** : Système de notifications par email où les messages peuvent être traités et supprimés immédiatement.

### 14.2 Quand choisir Kafka ?

✅ **Cas d'usage** :

- Event streaming et log aggregation
- Besoin de rejouer les événements (replayability)
- Très haut débit (100k+ messages/sec)
- Analytics en temps réel
- Event sourcing et audit log

**Exemple** : Pipeline de données temps réel pour analyser les comportements utilisateurs à travers tous les microservices.

---

## 15. Exercices Pratiques

### Exercice 1 : Expansion RabbitMQ Producer/Consumer

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
   - `tour.booked.premium`
   - `tour.booked.standard`
   - Modifier le consumer pour s'abonner à tous les événements de réservation : `tour.booked.*`

---

### Exercice 2 : Amélioration Kafka Producer/Consumer

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

**Code exemple (idempotence)** :

```javascript
const redis = require("redis");
const client = redis.createClient();

async function handleMessage(eventData) {
  const { bookingId } = eventData;
  const key = `processed:${bookingId}`;

  // Vérifier si déjà traité
  const alreadyProcessed = await client.get(key);
  if (alreadyProcessed) {
    console.log(`⚠️ Message déjà traité: ${bookingId}`);
    return;
  }

  // Traiter le message
  await sendNotification(eventData);

  // Marquer comme traité (expire après 24h)
  await client.setex(key, 86400, "true");
}
```

---

### Exercice 3 : Choisir une Message Queue

**Objectif** : Analyser et justifier le choix entre RabbitMQ et Kafka pour différents scénarios.

**Tâches** :

Rédigez une analyse (2-3 paragraphes) pour chacun des scénarios suivants, en justifiant votre choix de RabbitMQ ou Kafka :

1. **Scénario A** : Envoi d'emails de confirmation de réservation (latence max 5 secondes, volume: 1000 msg/jour)

2. **Scénario B** : Collecte et analyse en temps réel de tous les clics utilisateurs sur l'application web (volume: 1M+ événements/jour, besoin de rejouer les événements pour analytics)

3. **Scénario C** : Workflow de traitement de paiement avec compensation en cas d'échec (besoin de garanties fortes de livraison, dead letter queues)

**Points à considérer** :

- Volume de messages
- Latence acceptable
- Besoin de replayability
- Complexité opérationnelle
- Garanties de livraison

---

## Conclusion

L'implémentation de la communication asynchrone avec des message queues comme **RabbitMQ** ou **Kafka** est une pierre angulaire pour construire des architectures microservices résilientes, scalables et découplées.

**Points clés** :

✅ En permettant aux services de communiquer via des événements plutôt que des requêtes directes, nous améliorons significativement la tolérance aux pannes et la réactivité de notre Application Touristique

✅ Les **producteurs** publient des événements sans se soucier de la disponibilité immédiate des consommateurs

✅ Les **consommateurs** traitent ces événements à leur propre rythme, assurant que même sous charge lourde ou pannes transitoires, les processus métier critiques continuent de fonctionner de manière fiable

✅ **RabbitMQ** excelle pour les task queues et le routage complexe, tandis que **Kafka** est optimal pour l'event streaming et les analytics temps réel

**Prochaine étape** : Cette compréhension fondamentale sera essentielle dans les prochaines leçons où nous explorerons des patterns plus complexes comme le **Saga Pattern** pour les transactions distribuées et la conception du **Notification Microservice**.

---

## Navigation

- **⬅️ Précédent** : [Leçon 5.1 - Introduction à l'Architecture Event-Driven des Microservices](lecon-1-event-driven-intro.md)
- **➡️ Suivant** : [Leçon 5.3 - Pattern Saga pour les Transactions Distribuées](lecon-3-saga-pattern.md)
- **🏠 Sommaire** : [Retour au README](README.md)

---

## Ressources Complémentaires

- 📖 [RabbitMQ Official Tutorials](https://www.rabbitmq.com/getstarted.html)
- 📖 [Apache Kafka Documentation](https://kafka.apache.org/documentation/)
- 📖 [KafkaJS - Modern Kafka Client for Node.js](https://kafka.js.org/)
- 📖 [Enterprise Integration Patterns - Message Queue](https://www.enterpriseintegrationpatterns.com/patterns/messaging/MessageChannel.html)
- 🎥 [RabbitMQ in Microservices - Hussein Nasser](https://www.youtube.com/watch?v=deG25y_r6OY)
- 🎥 [Apache Kafka Crash Course - freeCodeCamp](https://www.youtube.com/watch?v=R873BlNVUB4)
