const amqplib = require("amqplib");
const config = require("../config");
const idempotenceService = require("../services/idempotenceService");
const templateService = require("../services/templateService");
const channelFactory = require("../channels/channelFactory");

class NotificationConsumer {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.emailChannel = channelFactory.getChannel("email");
  }

  /**
   * Connexion à RabbitMQ et création des bindings
   */
  async connect() {
    try {
      console.log("🔌 Connexion à RabbitMQ...");
      this.connection = await amqplib.connect(config.rabbitmq.url);
      this.channel = await this.connection.createChannel();

      // Déclarer l'exchange
      await this.channel.assertExchange(config.rabbitmq.exchange, "topic", {
        durable: true,
      });

      // Déclarer la queue
      await this.channel.assertQueue(config.rabbitmq.queue, {
        durable: true,
      });

      // Bind la queue à l'exchange avec les routing keys
      for (const routingKey of config.rabbitmq.routingKeys) {
        await this.channel.bindQueue(
          config.rabbitmq.queue,
          config.rabbitmq.exchange,
          routingKey
        );
        console.log(`🔗 Binding: ${routingKey} → ${config.rabbitmq.queue}`);
      }

      // Consommer les messages
      await this.channel.consume(
        config.rabbitmq.queue,
        (msg) => this.handleMessage(msg),
        { noAck: false } // Accusé de réception manuel
      );

      console.log(
        `✅ Consumer démarré sur la queue '${config.rabbitmq.queue}'`
      );
      console.log(
        `📡 En écoute des événements: ${config.rabbitmq.routingKeys.join(", ")}`
      );
    } catch (error) {
      console.error("❌ Erreur connexion RabbitMQ:", error);
      process.exit(1);
    }
  }

  /**
   * Traite un message reçu
   * @param {Object} msg - Message RabbitMQ
   */
  async handleMessage(msg) {
    if (!msg) return;

    const routingKey = msg.fields.routingKey;
    const content = JSON.parse(msg.content.toString());

    console.log(`\n📩 Message reçu [${routingKey}]:`, content);

    try {
      // Vérifier l'idempotence
      if (content.eventId) {
        const alreadyProcessed = await idempotenceService.isProcessed(
          content.eventId
        );

        if (alreadyProcessed) {
          console.log(`⚠️  Événement ${content.eventId} déjà traité - Ignoré`);
          this.channel.ack(msg);
          return;
        }
      }

      // Router vers le handler approprié
      await this.routeEvent(routingKey, content);

      // Marquer comme traité
      if (content.eventId) {
        await idempotenceService.markAsProcessed(content.eventId);
      }

      // Accusé de réception
      this.channel.ack(msg);
      console.log(`✅ Message traité et acquitté`);
    } catch (error) {
      console.error(`❌ Erreur traitement message:`, error);

      // Rejeter le message et le renvoyer dans la queue (retry)
      this.channel.nack(msg, false, true);
    }
  }

  /**
   * Route l'événement vers le handler approprié
   * @param {string} routingKey
   * @param {Object} content
   */
  async routeEvent(routingKey, content) {
    switch (routingKey) {
      case "booking.confirmed":
        await this.handleBookingConfirmed(content);
        break;

      case "booking.cancelled":
        await this.handleBookingCancelled(content);
        break;

      case "payment.succeeded":
        await this.handlePaymentSucceeded(content);
        break;

      case "payment.failed":
        await this.handlePaymentFailed(content);
        break;

      case "tour.availability.low":
        await this.handleTourAvailabilityLow(content);
        break;

      default:
        console.log(`⚠️  Pas de handler pour: ${routingKey}`);
    }
  }

  /**
   * Handler: Réservation confirmée
   */
  async handleBookingConfirmed(data) {
    console.log("📧 Envoi email de confirmation de réservation...");

    const emailContent = templateService.generateBookingConfirmation({
      bookingId: data.bookingId,
      tourName: data.tourName,
      tourDate: data.tourDate,
      userName: data.userName,
      participants: data.participants,
      totalPrice: data.totalPrice,
      currency: data.currency,
    });

    const result = await this.emailChannel.send(
      { email: data.userEmail, name: data.userName },
      emailContent
    );

    if (result.success) {
      console.log("✅ Email de confirmation envoyé");
    } else {
      console.error("❌ Échec envoi email:", result.error);
      throw new Error(result.error);
    }
  }

  /**
   * Handler: Réservation annulée
   */
  async handleBookingCancelled(data) {
    console.log("📧 Envoi email d'annulation...");

    const emailContent = templateService.generateBookingCancellation({
      bookingId: data.bookingId,
      tourName: data.tourName,
      tourDate: data.tourDate,
      userName: data.userName,
      totalPrice: data.totalPrice,
      currency: data.currency,
      canceledAt: data.canceledAt,
      refundAmount: data.refundAmount,
      cancellationFee: data.cancellationFee,
    });

    const result = await this.emailChannel.send(
      { email: data.userEmail, name: data.userName },
      emailContent
    );

    if (result.success) {
      console.log("✅ Email d'annulation envoyé");
    }
  }

  /**
   * Handler: Paiement réussi
   */
  async handlePaymentSucceeded(data) {
    console.log("📧 Envoi email de confirmation de paiement...");

    const emailContent = templateService.generatePaymentSuccess({
      amount: data.amount,
      currency: data.currency,
      transactionId: data.transactionId,
      bookingId: data.bookingId,
    });

    await this.emailChannel.send({ email: data.userEmail }, emailContent);
  }

  /**
   * Handler: Paiement échoué
   */
  async handlePaymentFailed(data) {
    console.log("⚠️  Paiement échoué - Notification utilisateur");
    // TODO: Implémenter template payment-failed
  }

  /**
   * Handler: Disponibilité faible
   */
  async handleTourAvailabilityLow(data) {
    console.log(
      `⚠️  Disponibilité faible pour tour ${data.tourId}: ${data.availableSeats} places`
    );
    // TODO: Notifier les administrateurs
  }

  /**
   * Ferme les connexions proprement
   */
  async disconnect() {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
    await idempotenceService.disconnect();
    console.log("❌ Consumer arrêté");
  }
}

module.exports = NotificationConsumer;
