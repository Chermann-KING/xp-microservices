import amqplib from "amqplib";

const RABBITMQ_URL =
  process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";
const EXCHANGE_NAME = process.env.RABBITMQ_EXCHANGE || "tour_booking_events";

class RabbitMQProducer {
  constructor() {
    this.connection = null;
    this.channel = null;
  }

  /**
   * Connexion à RabbitMQ
   */
  async connect() {
    try {
      this.connection = await amqplib.connect(RABBITMQ_URL);
      this.channel = await this.connection.createChannel();

      // Déclarer l'exchange (type topic pour routing flexible)
      await this.channel.assertExchange(EXCHANGE_NAME, "topic", {
        durable: true,
      });

      console.log("✅ RabbitMQ Producer connecté");
    } catch (error) {
      console.error("❌ Erreur connexion RabbitMQ Producer:", error);
      throw error;
    }
  }

  /**
   * Publie un événement
   * @param {string} routingKey - Clé de routage (ex: 'booking.confirmed')
   * @param {Object} eventData - Données de l'événement
   * @returns {boolean}
   */
  async publishEvent(routingKey, eventData) {
    if (!this.channel) {
      console.error("❌ Canal RabbitMQ non établi");
      return false;
    }

    try {
      const message = JSON.stringify(eventData);

      this.channel.publish(EXCHANGE_NAME, routingKey, Buffer.from(message), {
        persistent: true, // Message durable
        contentType: "application/json",
        timestamp: Date.now(),
      });

      console.log(
        `📨 Événement publié [${routingKey}]:`,
        eventData.eventId || "no-id"
      );
      return true;
    } catch (error) {
      console.error(`❌ Échec publication événement [${routingKey}]:`, error);
      return false;
    }
  }

  /**
   * Ferme les connexions
   */
  async disconnect() {
    try {
      if (this.channel) await this.channel.close();
      if (this.connection) await this.connection.close();
      console.log("❌ RabbitMQ Producer déconnecté");
    } catch (error) {
      console.error("Erreur déconnexion RabbitMQ:", error);
    }
  }
}

// Instance singleton
const producer = new RabbitMQProducer();

export default producer;
