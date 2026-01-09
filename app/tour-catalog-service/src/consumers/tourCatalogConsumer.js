import amqplib from "amqplib";
import { v4 as uuidv4 } from "uuid";
import rabbitmqProducer from "../services/rabbitmqProducer.js";

const RABBITMQ_URL =
  process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";
const EXCHANGE_NAME = process.env.RABBITMQ_EXCHANGE || "tour_booking_events";
const QUEUE_NAME = "tour_catalog_queue";

class TourCatalogConsumer {
  constructor(tourService) {
    this.connection = null;
    this.channel = null;
    this.tourService = tourService;
    this.maxRetries = 3;
  }

  async connect() {
    try {
      console.log("🔌 Connexion RabbitMQ Consumer (Tour Catalog)...");
      this.connection = await amqplib.connect(RABBITMQ_URL);
      this.channel = await this.connection.createChannel();

      // Déclarer l'exchange
      await this.channel.assertExchange(EXCHANGE_NAME, "topic", {
        durable: true,
      });

      // Déclarer la queue
      await this.channel.assertQueue(QUEUE_NAME, { durable: true });

      // Bind aux événements de réservation
      const routingKeys = ["booking.confirmed", "booking.cancelled"];

      for (const routingKey of routingKeys) {
        await this.channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, routingKey);
        console.log(`🔗 Binding: ${routingKey} → ${QUEUE_NAME}`);
      }

      // Consommer les messages
      await this.channel.consume(QUEUE_NAME, (msg) => this.handleMessage(msg), {
        noAck: false,
      });

      console.log(`✅ Consumer démarré sur '${QUEUE_NAME}'`);
      console.log(`📡 En écoute: ${routingKeys.join(", ")}`);
    } catch (error) {
      console.error("❌ Erreur connexion RabbitMQ Consumer:", error);
      throw error;
    }
  }

  async handleMessage(msg) {
    if (!msg) return;

    const routingKey = msg.fields.routingKey;
    const content = JSON.parse(msg.content.toString());

    console.log(`\n📩 Message reçu [${routingKey}]:`, content.data?.bookingId);

    try {
      await this.routeEvent(routingKey, content);
      this.channel.ack(msg);
      console.log(`✅ Message traité et acquitté`);
    } catch (error) {
      console.error(`❌ Erreur traitement:`, error.message);

      // Retry logic avec backoff exponentiel
      const retryCount = (msg.properties.headers?.["x-retry-count"] || 0) + 1;

      if (retryCount <= this.maxRetries) {
        console.log(`🔄 Retry ${retryCount}/${this.maxRetries}...`);

        // Republier avec compteur de retry
        setTimeout(() => {
          this.channel.publish(EXCHANGE_NAME, routingKey, msg.content, {
            ...msg.properties,
            headers: {
              ...msg.properties.headers,
              "x-retry-count": retryCount,
            },
          });
          this.channel.ack(msg);
        }, Math.pow(2, retryCount) * 100); // 200ms, 400ms, 800ms
      } else {
        console.error(`❌ Max retries atteint - message rejeté`);
        this.channel.nack(msg, false, false); // Dead letter queue
      }
    }
  }

  async routeEvent(routingKey, content) {
    switch (routingKey) {
      case "booking.confirmed":
        await this.handleBookingConfirmed(content.data);
        break;

      case "booking.cancelled":
        await this.handleBookingCancelled(content.data);
        break;

      default:
        console.log(`⚠️  Pas de handler pour: ${routingKey}`);
    }
  }

  /**
   * Handler: Réservation confirmée - Décrémenter les places disponibles
   */
  async handleBookingConfirmed(data) {
    console.log(`📉 Décrémentation places pour tour ${data.tourId}...`);

    const { tourId, participants } = data;

    // Utiliser updateAvailableSeats avec optimistic locking
    const result = await this.tourService.updateAvailableSeats(
      tourId,
      -participants // Négatif pour décrémenter
    );

    if (!result.success) {
      throw new Error(`Échec décrémentation: ${result.error}`);
    }

    console.log(`✅ Places décrémentées: ${participants} pour tour ${tourId}`);

    // Vérifier si disponibilité faible
    const tour = result.data;
    const availableSeats = tour.maxGroupSize - tour.bookedSeats;
    const threshold = Math.ceil(tour.maxGroupSize * 0.2); // 20% du max

    if (availableSeats <= threshold && availableSeats > 0) {
      console.log(`⚠️  Disponibilité faible: ${availableSeats} places`);

      // Publier événement tour.availability.low
      await rabbitmqProducer.publishEvent("tour.availability.low", {
        eventId: uuidv4(),
        eventType: "tour.availability.low",
        eventVersion: "1.0",
        timestamp: new Date().toISOString(),
        data: {
          tourId: tour.id,
          tourTitle: tour.title,
          availableSeats,
          maxGroupSize: tour.maxGroupSize,
          threshold,
        },
      });
    }
  }

  /**
   * Handler: Réservation annulée - Incrémenter les places disponibles
   */
  async handleBookingCancelled(data) {
    console.log(`📈 Incrémentation places pour tour ${data.tourId}...`);

    const { tourId, participants } = data;

    const result = await this.tourService.updateAvailableSeats(
      tourId,
      participants // Positif pour incrémenter
    );

    if (!result.success) {
      throw new Error(`Échec incrémentation: ${result.error}`);
    }

    console.log(`✅ Places incrémentées: ${participants} pour tour ${tourId}`);
  }

  async disconnect() {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
    console.log("❌ Consumer arrêté (Tour Catalog)");
  }
}

export default TourCatalogConsumer;
