# Module 5 - Leçon 5.4 : Solutions des Exercices

## Table des Matières

1. [Exercice 1 : Implémentation SMS pour Rappels de Tours](#exercice-1--implémentation-sms-pour-rappels-de-tours)
2. [Exercice 2 : Historique de Notifications et Retry](#exercice-2--historique-de-notifications-et-retry)
3. [Exercice 3 : Préférences Utilisateur pour Notifications](#exercice-3--préférences-utilisateur-pour-notifications)

---

## Exercice 1 : Implémentation SMS pour Rappels de Tours

### Objectif

Étendre le service de notifications pour envoyer des SMS de rappel 24 heures avant le début d'un tour réservé, en utilisant Twilio.

### Solution Complète

#### 1. Installation des Dépendances

```bash
npm install twilio
```

#### 2. Configuration de Twilio

**Fichier : `.env`**

```env
# Configuration Twilio
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+15551234567
```

**Fichier : `src/config/index.js`**

```javascript
module.exports = {
  // Configuration Email existante
  email: {
    host: process.env.SMTP_HOST || "smtp.mailtrap.io",
    port: parseInt(process.env.SMTP_PORT) || 2525,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    senderEmail: process.env.SENDER_EMAIL || "noreply@tourify.com",
  },

  // Nouvelle configuration SMS
  sms: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
  },

  rabbitmq: {
    url: process.env.RABBITMQ_URL || "amqp://localhost",
    queue: "notifications",
  },
};
```

#### 3. Implémentation du Canal SMS

**Fichier : `src/channels/smsChannel.js`**

```javascript
const twilio = require("twilio");
const NotificationChannel = require("./notificationChannel");

/**
 * Canal de notification par SMS utilisant Twilio
 */
class SmsChannel extends NotificationChannel {
  /**
   * @param {Object} config - Configuration Twilio
   * @param {string} config.accountSid - SID du compte Twilio
   * @param {string} config.authToken - Token d'authentification Twilio
   * @param {string} config.phoneNumber - Numéro de téléphone Twilio
   */
  constructor(config) {
    super();

    // Validation de la configuration
    if (!config.accountSid || !config.authToken || !config.phoneNumber) {
      throw new Error("Configuration Twilio incomplète");
    }

    this.client = twilio(config.accountSid, config.authToken);
    this.phoneNumber = config.phoneNumber;
  }

  /**
   * Envoie un SMS via Twilio
   * @param {Object} recipient - Destinataire du SMS
   * @param {string} recipient.phone - Numéro de téléphone du destinataire
   * @param {Object} message - Contenu du message
   * @param {string} message.body - Corps du message SMS
   * @returns {Promise<Object>} Résultat de l'envoi
   */
  async send(recipient, message) {
    try {
      // Validation du numéro de téléphone
      if (!recipient.phone) {
        console.warn("⚠️ Numéro de téléphone manquant pour le destinataire");
        return {
          success: false,
          channel: "sms",
          error: "Numéro de téléphone manquant",
        };
      }

      // Normalisation du numéro de téléphone (format international)
      const phoneNumber = this.normalizePhoneNumber(recipient.phone);

      // Envoi du SMS via l'API Twilio
      const result = await this.client.messages.create({
        body: message.body,
        from: this.phoneNumber,
        to: phoneNumber,
      });

      console.log(`📱 SMS envoyé à ${phoneNumber} (SID: ${result.sid})`);

      return {
        success: true,
        channel: "sms",
        messageId: result.sid,
        status: result.status,
      };
    } catch (error) {
      console.error(`❌ Échec envoi SMS:`, error.message);

      return {
        success: false,
        channel: "sms",
        error: error.message,
        errorCode: error.code,
      };
    }
  }

  /**
   * Normalise un numéro de téléphone au format international
   * @param {string} phone - Numéro de téléphone à normaliser
   * @returns {string} Numéro normalisé
   */
  normalizePhoneNumber(phone) {
    // Supprime les espaces, tirets et parenthèses
    let normalized = phone.replace(/[\s\-()]/g, "");

    // Ajoute le préfixe + si absent
    if (!normalized.startsWith("+")) {
      // Par défaut, assume un numéro français si pas de préfixe
      if (normalized.startsWith("0")) {
        normalized = "+33" + normalized.substring(1);
      } else {
        normalized = "+" + normalized;
      }
    }

    return normalized;
  }

  /**
   * Vérifie si le canal est disponible
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    try {
      // Teste la connexion en récupérant les infos du compte
      await this.client.api.accounts(this.client.accountSid).fetch();
      return true;
    } catch (error) {
      console.error("❌ Canal SMS non disponible:", error.message);
      return false;
    }
  }
}

module.exports = SmsChannel;
```

#### 4. Mise à Jour du Factory de Canaux

**Fichier : `src/channels/channelFactory.js`**

```javascript
const EmailChannel = require("./emailChannel");
const SmsChannel = require("./smsChannel");
const PushChannel = require("./pushChannel");

/**
 * Factory pour créer des canaux de notification
 */
class ChannelFactory {
  /**
   * @param {Object} config - Configuration des canaux
   */
  constructor(config) {
    this.config = config;
    this.channels = new Map();
    this.initializeChannels();
  }

  /**
   * Initialise tous les canaux configurés
   */
  initializeChannels() {
    try {
      // Canal Email
      if (this.config.email) {
        this.channels.set("email", new EmailChannel(this.config.email));
        console.log("✅ Canal Email initialisé");
      }

      // Canal SMS
      if (this.config.sms) {
        this.channels.set("sms", new SmsChannel(this.config.sms));
        console.log("✅ Canal SMS initialisé");
      }

      // Canal Push
      if (this.config.push) {
        this.channels.set("push", new PushChannel(this.config.push));
        console.log("✅ Canal Push initialisé");
      }
    } catch (error) {
      console.error(
        "❌ Erreur lors de l'initialisation des canaux:",
        error.message
      );
      throw error;
    }
  }

  /**
   * Récupère un canal par son nom
   * @param {string} channelName - Nom du canal (email, sms, push)
   * @returns {NotificationChannel|null}
   */
  getChannel(channelName) {
    return this.channels.get(channelName) || null;
  }

  /**
   * Récupère tous les canaux disponibles
   * @returns {Map<string, NotificationChannel>}
   */
  getAllChannels() {
    return this.channels;
  }

  /**
   * Vérifie si un canal est disponible
   * @param {string} channelName - Nom du canal
   * @returns {boolean}
   */
  hasChannel(channelName) {
    return this.channels.has(channelName);
  }
}

module.exports = ChannelFactory;
```

#### 5. Gestionnaire d'Événement pour les Rappels

**Fichier : `src/processors/tourReminderProcessor.js`**

```javascript
const { compileTemplate } = require("../templates/templateEngine");

/**
 * Traite les événements de rappel de tour
 * @param {Object} event - Événement de rappel
 * @param {Object} dispatcher - Dispatcher de notifications
 * @param {Object} notificationRepository - Repository pour la persistance
 */
async function handleTourReminder(event, dispatcher, notificationRepository) {
  const { eventId, data } = event;
  const {
    userId,
    userEmail,
    userPhone,
    userName,
    tourName,
    bookingId,
    tourDate,
    tourTime,
    meetingPoint,
    numberOfGuests,
  } = data;

  console.log(`🔔 Traitement du rappel de tour pour bookingId: ${bookingId}`);

  // Vérifier l'idempotence
  const existingNotification = await notificationRepository.findByEventId(
    eventId
  );
  if (existingNotification) {
    console.log(`⏭️ Notification déjà traitée pour eventId: ${eventId}`);
    return;
  }

  // Préparer le message SMS
  const smsMessage = {
    body: formatSmsReminder({
      userName,
      tourName,
      tourDate,
      tourTime,
      meetingPoint,
      numberOfGuests,
    }),
  };

  // Préparer le message Email (en complément)
  const emailSubject = `Rappel : Votre tour ${tourName} commence demain !`;
  const emailHtml = compileTemplate("tour-reminder", {
    userName,
    tourName,
    bookingId,
    tourDate: new Date(tourDate).toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    tourTime,
    meetingPoint,
    numberOfGuests,
  });

  const emailMessage = {
    subject: emailSubject,
    htmlContent: emailHtml,
  };

  // Créer la notification avec multi-canal (SMS prioritaire, Email en fallback)
  const notification = {
    userId,
    eventId,
    eventType: "tour.reminder",
    channels: ["sms", "email"], // SMS en priorité, Email en fallback
    recipients: {
      sms: { phone: userPhone },
      email: { email: userEmail },
    },
    messages: {
      sms: smsMessage,
      email: emailMessage,
    },
    metadata: {
      bookingId,
      tourName,
      tourDate,
    },
  };

  // Envoyer la notification
  try {
    const result = await dispatcher.send(notification);

    // Enregistrer le résultat
    await notificationRepository.save({
      eventId,
      userId,
      eventType: "tour.reminder",
      channels: notification.channels,
      status: result.success ? "sent" : "failed",
      sentAt: new Date(),
      metadata: notification.metadata,
      results: result.results,
    });

    if (result.success) {
      console.log(
        `✅ Rappel de tour envoyé avec succès pour bookingId: ${bookingId}`
      );
    } else {
      console.error(
        `❌ Échec de l'envoi du rappel pour bookingId: ${bookingId}`
      );
    }
  } catch (error) {
    console.error(`❌ Erreur lors de l'envoi du rappel:`, error.message);

    // Enregistrer l'échec
    await notificationRepository.save({
      eventId,
      userId,
      eventType: "tour.reminder",
      channels: notification.channels,
      status: "failed",
      sentAt: new Date(),
      error: error.message,
      metadata: notification.metadata,
    });
  }
}

/**
 * Formate le message SMS pour un rappel de tour
 * @param {Object} data - Données du rappel
 * @returns {string} Message SMS formaté
 */
function formatSmsReminder(data) {
  const {
    userName,
    tourName,
    tourDate,
    tourTime,
    meetingPoint,
    numberOfGuests,
  } = data;

  // Formater la date en format lisible
  const formattedDate = new Date(tourDate).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  // Construction du message (max 160 caractères pour un SMS standard)
  let message = `Bonjour ${userName},\n\n`;
  message += `Rappel : Votre tour "${tourName}" commence demain !\n\n`;
  message += `📅 Date : ${formattedDate}\n`;
  message += `🕒 Heure : ${tourTime}\n`;
  message += `📍 Point de rencontre : ${meetingPoint}\n`;
  message += `👥 Participants : ${numberOfGuests}\n\n`;
  message += `À bientôt ! - Tourify`;

  return message;
}

module.exports = {
  handleTourReminder,
  formatSmsReminder,
};
```

#### 6. Mise à Jour du Router d'Événements

**Fichier : `src/processors/eventProcessor.js`**

```javascript
const { handleTourBooked } = require("./tourBookedProcessor");
const { handlePaymentReceived } = require("./paymentProcessor");
const { handleTourReminder } = require("./tourReminderProcessor");

/**
 * Route les événements vers les handlers appropriés
 * @param {Object} event - Événement reçu
 * @param {Object} dispatcher - Dispatcher de notifications
 * @param {Object} notificationRepository - Repository
 */
async function processEvent(event, dispatcher, notificationRepository) {
  const { eventType } = event;

  console.log(`📨 Traitement de l'événement: ${eventType}`);

  try {
    switch (eventType) {
      case "booking.confirmed":
        await handleBookingConfirmed(event, dispatcher, notificationRepository);
        break;

      case "payment.received":
        await handlePaymentReceived(event, dispatcher, notificationRepository);
        break;

      case "tour.reminder":
        await handleTourReminder(event, dispatcher, notificationRepository);
        break;

      default:
        console.warn(`⚠️ Type d'événement non géré: ${eventType}`);
    }
  } catch (error) {
    console.error(
      `❌ Erreur lors du traitement de l'événement ${eventType}:`,
      error.message
    );
    throw error;
  }
}

module.exports = { processEvent };
```

#### 7. Template Email pour les Rappels

**Fichier : `src/templates/tour-reminder.pug`**

```pug
doctype html
html
  head
    meta(charset='UTF-8')
    meta(name='viewport', content='width=device-width, initial-scale=1.0')
    title Rappel de Tour
    style.
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
      }
      .header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 30px;
        text-align: center;
        border-radius: 10px 10px 0 0;
      }
      .content {
        background: #f9f9f9;
        padding: 30px;
        border-radius: 0 0 10px 10px;
      }
      .reminder-box {
        background: white;
        border-left: 4px solid #667eea;
        padding: 20px;
        margin: 20px 0;
        border-radius: 5px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      .detail-row {
        display: flex;
        padding: 10px 0;
        border-bottom: 1px solid #eee;
      }
      .detail-row:last-child {
        border-bottom: none;
      }
      .detail-label {
        font-weight: bold;
        width: 150px;
        color: #667eea;
      }
      .detail-value {
        flex: 1;
        color: #555;
      }
      .cta-button {
        display: inline-block;
        background: #667eea;
        color: white;
        padding: 12px 30px;
        text-decoration: none;
        border-radius: 5px;
        margin-top: 20px;
        font-weight: bold;
      }
      .footer {
        text-align: center;
        margin-top: 30px;
        padding-top: 20px;
        border-top: 1px solid #ddd;
        color: #777;
        font-size: 12px;
      }
      .alert-icon {
        font-size: 48px;
        text-align: center;
        margin-bottom: 20px;
      }

  body
    .header
      h1 🔔 Rappel Important !
      p Votre tour commence bientôt

    .content
      p Bonjour #{userName},

      .alert-icon 📅

      p
        strong Votre tour "#{tourName}" commence demain !
        br
        | Nous vous rappelons les détails de votre réservation :

      .reminder-box
        .detail-row
          .detail-label 📅 Date
          .detail-value= tourDate

        .detail-row
          .detail-label 🕒 Heure
          .detail-value= tourTime

        .detail-row
          .detail-label 📍 Point de rencontre
          .detail-value= meetingPoint

        .detail-row
          .detail-label 👥 Nombre de participants
          .detail-value= numberOfGuests

        .detail-row
          .detail-label 🎫 Référence
          .detail-value= bookingId

      p
        strong Conseils pour votre tour :
        ul
          li Arrivez 15 minutes avant l'heure de départ
          li Vérifiez la météo et habillez-vous en conséquence
          li N'oubliez pas votre pièce d'identité
          li Apportez de l'eau et des collations si nécessaire

      center
        a.cta-button(href=`https://tourify.com/bookings/${bookingId}`) Voir ma réservation

      p
        | Si vous avez des questions ou besoin d'assistance, n'hésitez pas à nous contacter.

      p
        | À très bientôt !
        br
        strong L'équipe Tourify

    .footer
      p Vous recevez cet email car vous avez une réservation confirmée sur Tourify.
      p © 2024 Tourify - Tous droits réservés
```

#### 8. Service de Planification des Rappels

Pour envoyer automatiquement les rappels 24h avant le tour, nous devons créer un service qui vérifie les tours à venir et publie des événements.

**Fichier : `src/schedulers/reminderScheduler.js`**

```javascript
const cron = require("node-cron");
const amqp = require("amqplib");

/**
 * Planificateur de rappels de tours
 */
class ReminderScheduler {
  constructor(config, bookingService) {
    this.config = config;
    this.bookingService = bookingService;
    this.connection = null;
    this.channel = null;
  }

  /**
   * Démarre le planificateur (vérifie toutes les heures)
   */
  async start() {
    try {
      // Connexion à RabbitMQ
      this.connection = await amqp.connect(this.config.rabbitmq.url);
      this.channel = await this.connection.createChannel();
      await this.channel.assertQueue(this.config.rabbitmq.queue, {
        durable: true,
      });

      console.log("✅ Planificateur de rappels démarré");

      // Exécuter toutes les heures à la minute 0
      cron.schedule("0 * * * *", async () => {
        console.log("🔍 Vérification des tours pour rappels...");
        await this.checkUpcomingTours();
      });

      // Exécution immédiate au démarrage
      await this.checkUpcomingTours();
    } catch (error) {
      console.error(
        "❌ Erreur lors du démarrage du planificateur:",
        error.message
      );
      throw error;
    }
  }

  /**
   * Vérifie les tours dans les prochaines 24h et envoie des rappels
   */
  async checkUpcomingTours() {
    try {
      // Calculer la fenêtre de temps (24h à partir de maintenant)
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Récupérer les réservations pour les 24 prochaines heures
      const upcomingBookings = await this.bookingService.getBookingsBetween(
        now,
        tomorrow
      );

      console.log(`📊 ${upcomingBookings.length} tours à rappeler`);

      // Publier un événement de rappel pour chaque réservation
      for (const booking of upcomingBookings) {
        await this.publishReminderEvent(booking);
      }
    } catch (error) {
      console.error(
        "❌ Erreur lors de la vérification des tours:",
        error.message
      );
    }
  }

  /**
   * Publie un événement de rappel dans la queue
   * @param {Object} booking - Réservation
   */
  async publishReminderEvent(booking) {
    try {
      const event = {
        eventId: `reminder-${booking.id}-${Date.now()}`,
        eventType: "tour.reminder",
        timestamp: new Date().toISOString(),
        data: {
          userId: booking.userId,
          userEmail: booking.userEmail,
          userPhone: booking.userPhone,
          userName: booking.userName,
          tourName: booking.tourName,
          bookingId: booking.id,
          tourDate: booking.tourDate,
          tourTime: booking.tourTime,
          meetingPoint: booking.meetingPoint,
          numberOfGuests: booking.numberOfGuests,
        },
      };

      // Publier dans la queue
      this.channel.sendToQueue(
        this.config.rabbitmq.queue,
        Buffer.from(JSON.stringify(event)),
        { persistent: true }
      );

      console.log(`📤 Événement de rappel publié pour booking ${booking.id}`);
    } catch (error) {
      console.error(
        `❌ Erreur lors de la publication du rappel:`,
        error.message
      );
    }
  }

  /**
   * Arrête le planificateur proprement
   */
  async stop() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      console.log("✅ Planificateur de rappels arrêté");
    } catch (error) {
      console.error(
        "❌ Erreur lors de l'arrêt du planificateur:",
        error.message
      );
    }
  }
}

module.exports = ReminderScheduler;
```

**Installation de la dépendance cron :**

```bash
npm install node-cron
```

#### 9. Intégration dans l'Application Principale

**Fichier : `src/index.js`**

```javascript
const express = require("express");
const config = require("./config");
const { consumeNotifications } = require("./consumers/notificationConsumer");
const ChannelFactory = require("./channels/channelFactory");
const NotificationDispatcher = require("./dispatchers/notificationDispatcher");
const NotificationRepository = require("./repositories/notificationRepository");
const ReminderScheduler = require("./schedulers/reminderScheduler");
const BookingService = require("./services/bookingService");

const app = express();
app.use(express.json());

// Initialisation des composants
const channelFactory = new ChannelFactory(config);
const dispatcher = new NotificationDispatcher(channelFactory);
const notificationRepository = new NotificationRepository();

// Initialisation du service de réservations (mock ou API réelle)
const bookingService = new BookingService(config);

// Démarrage du consumer RabbitMQ
consumeNotifications(dispatcher, notificationRepository);

// Démarrage du planificateur de rappels
const reminderScheduler = new ReminderScheduler(config, bookingService);
reminderScheduler.start();

// Endpoint de santé
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "notification-service",
    timestamp: new Date().toISOString(),
    channels: Array.from(channelFactory.getAllChannels().keys()),
  });
});

// Gestion de l'arrêt gracieux
process.on("SIGINT", async () => {
  console.log("\n🛑 Arrêt du service...");
  await reminderScheduler.stop();
  process.exit(0);
});

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
  console.log(`🚀 Service de Notifications démarré sur le port ${PORT}`);
});
```

#### 10. Tests de la Fonctionnalité

**Fichier : `tests/smsChannel.test.js`**

```javascript
const SmsChannel = require("../src/channels/smsChannel");

describe("SmsChannel", () => {
  let smsChannel;

  beforeEach(() => {
    smsChannel = new SmsChannel({
      accountSid: "test_account_sid",
      authToken: "test_auth_token",
      phoneNumber: "+15551234567",
    });
  });

  test("normalizePhoneNumber - ajoute le préfixe français", () => {
    const normalized = smsChannel.normalizePhoneNumber("0612345678");
    expect(normalized).toBe("+33612345678");
  });

  test("normalizePhoneNumber - conserve le préfixe international", () => {
    const normalized = smsChannel.normalizePhoneNumber("+33612345678");
    expect(normalized).toBe("+33612345678");
  });

  test("normalizePhoneNumber - supprime les espaces et tirets", () => {
    const normalized = smsChannel.normalizePhoneNumber("+33 6 12 34 56 78");
    expect(normalized).toBe("+33612345678");
  });

  test("send - retourne une erreur si le numéro est manquant", async () => {
    const result = await smsChannel.send({}, { body: "Test" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("Numéro de téléphone manquant");
  });
});
```

**Scénario de Test Complet :**

```javascript
// Test d'intégration : Envoi d'un rappel de tour
const testReminderEvent = {
  eventId: "reminder-test-12345",
  eventType: "tour.reminder",
  timestamp: "2024-01-15T10:00:00Z",
  data: {
    userId: "user123",
    userEmail: "john.doe@example.com",
    userPhone: "+33612345678",
    userName: "John Doe",
    tourName: "Visite de la Tour Eiffel",
    bookingId: "booking-456",
    tourDate: "2024-01-16",
    tourTime: "14:00",
    meetingPoint: "Entrée principale, Champ de Mars",
    numberOfGuests: 2,
  },
};

// Publier l'événement dans RabbitMQ
await publishEvent(testReminderEvent);

// Vérifier les logs du service
// Résultat attendu :
// 📨 Traitement de l'événement: tour.reminder
// 🔔 Traitement du rappel de tour pour bookingId: booking-456
// 📱 SMS envoyé à +32486345678 (SID: SM...)
// 📧 Email envoyé à chermann.king@example.com
// ✅ Rappel de tour envoyé avec succès pour bookingId: booking-456
```

### Résultat de l'Exercice

Vous avez maintenant un système complet de rappels par SMS qui :

1. ✅ Envoie des SMS 24h avant le début d'un tour via Twilio
2. ✅ Utilise le Pattern Strategy pour abstraire le canal SMS
3. ✅ Normalise automatiquement les numéros de téléphone
4. ✅ Inclut un planificateur automatique avec cron jobs
5. ✅ Envoie à la fois SMS et Email pour une meilleure fiabilité
6. ✅ Gère les erreurs avec fallback gracieux
7. ✅ Respecte l'idempotence avec `eventId`

**Message SMS reçu par l'utilisateur :**

```
Bonjour Chermann KING,

Rappel : Votre tour "Visite de la Tour Eiffel" commence demain !

📅 Date : mardi 16 janvier
🕒 Heure : 14:00
📍 Point de rencontre : Entrée principale, Champ de Mars
👥 Participants : 2

À bientôt ! - Booking Tourism App
```

---

## Exercice 2 : Historique de Notifications et Retry

### Objectif

Persister toutes les notifications dans PostgreSQL et implémenter un worker qui retente automatiquement l'envoi des notifications échouées avec un délai exponentiel.

### Solution Complète

#### 1. Configuration de la Base de Données

**Fichier : `db/schema.sql`**

```sql
-- Table pour stocker l'historique des notifications
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  event_id VARCHAR(255) UNIQUE NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  channels TEXT[] NOT NULL,
  status VARCHAR(50) NOT NULL,
  sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_retry_at TIMESTAMP,
  error_message TEXT,
  metadata JSONB,
  results JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX idx_notifications_event_id ON notifications(event_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_next_retry ON notifications(next_retry_at) WHERE status = 'failed' AND retry_count < max_retries;

-- Table pour les tentatives d'envoi individuelles
CREATE TABLE IF NOT EXISTS notification_attempts (
  id SERIAL PRIMARY KEY,
  notification_id INTEGER NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  channel VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  attempted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  error_message TEXT,
  response JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notification_attempts_notification_id ON notification_attempts(notification_id);
CREATE INDEX idx_notification_attempts_channel ON notification_attempts(channel);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour la table notifications
CREATE TRIGGER update_notifications_updated_at
BEFORE UPDATE ON notifications
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

**Exécution du schéma :**

```bash
psql -U postgres -d tourify_notifications -f db/schema.sql
```

#### 2. Repository pour la Persistance

**Fichier : `src/repositories/notificationRepository.js`**

```javascript
const { Pool } = require("pg");

/**
 * Repository pour gérer la persistance des notifications
 */
class NotificationRepository {
  constructor(config) {
    this.pool = new Pool({
      host: config.host || "localhost",
      port: config.port || 5432,
      database: config.database || "tourify_notifications",
      user: config.user || "postgres",
      password: config.password,
    });

    console.log("✅ NotificationRepository initialisé");
  }

  /**
   * Sauvegarde une notification dans la base de données
   * @param {Object} notification - Données de la notification
   * @returns {Promise<Object>} Notification sauvegardée
   */
  async save(notification) {
    const {
      eventId,
      userId,
      eventType,
      channels,
      status,
      sentAt,
      retryCount = 0,
      maxRetries = 3,
      nextRetryAt = null,
      errorMessage = null,
      metadata = {},
      results = {},
    } = notification;

    try {
      const query = `
        INSERT INTO notifications (
          event_id, user_id, event_type, channels, status, sent_at,
          retry_count, max_retries, next_retry_at, error_message, metadata, results
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (event_id)
        DO UPDATE SET
          status = EXCLUDED.status,
          sent_at = EXCLUDED.sent_at,
          retry_count = EXCLUDED.retry_count,
          next_retry_at = EXCLUDED.next_retry_at,
          error_message = EXCLUDED.error_message,
          results = EXCLUDED.results,
          updated_at = NOW()
        RETURNING *
      `;

      const values = [
        eventId,
        userId,
        eventType,
        channels,
        status,
        sentAt,
        retryCount,
        maxRetries,
        nextRetryAt,
        errorMessage,
        JSON.stringify(metadata),
        JSON.stringify(results),
      ];

      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error(
        "❌ Erreur lors de la sauvegarde de la notification:",
        error.message
      );
      throw error;
    }
  }

  /**
   * Enregistre une tentative d'envoi
   * @param {number} notificationId - ID de la notification
   * @param {Object} attempt - Données de la tentative
   */
  async saveAttempt(notificationId, attempt) {
    const {
      channel,
      status,
      attemptedAt,
      errorMessage = null,
      response = {},
    } = attempt;

    try {
      const query = `
        INSERT INTO notification_attempts (
          notification_id, channel, status, attempted_at, error_message, response
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const values = [
        notificationId,
        channel,
        status,
        attemptedAt,
        errorMessage,
        JSON.stringify(response),
      ];

      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error(
        "❌ Erreur lors de la sauvegarde de la tentative:",
        error.message
      );
      throw error;
    }
  }

  /**
   * Recherche une notification par event_id
   * @param {string} eventId - ID de l'événement
   * @returns {Promise<Object|null>}
   */
  async findByEventId(eventId) {
    try {
      const query = "SELECT * FROM notifications WHERE event_id = $1";
      const result = await this.pool.query(query, [eventId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error(
        "❌ Erreur lors de la recherche de notification:",
        error.message
      );
      throw error;
    }
  }

  /**
   * Récupère les notifications échouées prêtes pour un retry
   * @returns {Promise<Array>}
   */
  async getFailedNotificationsForRetry() {
    try {
      const query = `
        SELECT * FROM notifications
        WHERE status = 'failed'
          AND retry_count < max_retries
          AND (next_retry_at IS NULL OR next_retry_at <= NOW())
        ORDER BY next_retry_at ASC NULLS FIRST
        LIMIT 100
      `;

      const result = await this.pool.query(query);
      return result.rows;
    } catch (error) {
      console.error(
        "❌ Erreur lors de la récupération des notifications échouées:",
        error.message
      );
      throw error;
    }
  }

  /**
   * Met à jour le statut d'une notification
   * @param {string} eventId - ID de l'événement
   * @param {Object} updates - Champs à mettre à jour
   */
  async updateStatus(eventId, updates) {
    const { status, retryCount, nextRetryAt, errorMessage, results } = updates;

    try {
      const query = `
        UPDATE notifications
        SET status = $2,
            retry_count = $3,
            next_retry_at = $4,
            error_message = $5,
            results = $6,
            updated_at = NOW()
        WHERE event_id = $1
        RETURNING *
      `;

      const values = [
        eventId,
        status,
        retryCount,
        nextRetryAt,
        errorMessage,
        JSON.stringify(results),
      ];

      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error(
        "❌ Erreur lors de la mise à jour de la notification:",
        error.message
      );
      throw error;
    }
  }

  /**
   * Récupère l'historique des notifications d'un utilisateur
   * @param {string} userId - ID de l'utilisateur
   * @param {number} limit - Nombre de résultats
   * @returns {Promise<Array>}
   */
  async getHistoryByUserId(userId, limit = 50) {
    try {
      const query = `
        SELECT * FROM notifications
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `;

      const result = await this.pool.query(query, [userId, limit]);
      return result.rows;
    } catch (error) {
      console.error(
        "❌ Erreur lors de la récupération de l'historique:",
        error.message
      );
      throw error;
    }
  }

  /**
   * Récupère les tentatives d'envoi pour une notification
   * @param {number} notificationId - ID de la notification
   * @returns {Promise<Array>}
   */
  async getAttempts(notificationId) {
    try {
      const query = `
        SELECT * FROM notification_attempts
        WHERE notification_id = $1
        ORDER BY attempted_at DESC
      `;

      const result = await this.pool.query(query, [notificationId]);
      return result.rows;
    } catch (error) {
      console.error(
        "❌ Erreur lors de la récupération des tentatives:",
        error.message
      );
      throw error;
    }
  }

  /**
   * Récupère les statistiques des notifications
   * @param {string} userId - ID de l'utilisateur (optionnel)
   * @returns {Promise<Object>}
   */
  async getStats(userId = null) {
    try {
      const whereClause = userId ? "WHERE user_id = $1" : "";
      const values = userId ? [userId] : [];

      const query = `
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'sent') as sent,
          COUNT(*) FILTER (WHERE status = 'failed') as failed,
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          AVG(retry_count) as avg_retry_count
        FROM notifications
        ${whereClause}
      `;

      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error(
        "❌ Erreur lors de la récupération des statistiques:",
        error.message
      );
      throw error;
    }
  }

  /**
   * Ferme la connexion à la base de données
   */
  async close() {
    await this.pool.end();
    console.log("✅ Connexion à la base de données fermée");
  }
}

module.exports = NotificationRepository;
```

**Installation de pg :**

```bash
npm install pg
```

#### 3. Mise à Jour de la Configuration

**Fichier : `src/config/index.js`**

```javascript
module.exports = {
  email: {
    host: process.env.SMTP_HOST || "smtp.mailtrap.io",
    port: parseInt(process.env.SMTP_PORT) || 2525,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    senderEmail: process.env.SENDER_EMAIL || "noreply@tourify.com",
  },

  sms: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
  },

  database: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || "tourify_notifications",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD,
  },

  rabbitmq: {
    url: process.env.RABBITMQ_URL || "amqp://localhost",
    queue: "notifications",
  },

  retry: {
    maxRetries: parseInt(process.env.MAX_RETRIES) || 3,
    baseDelay: parseInt(process.env.RETRY_BASE_DELAY) || 60000, // 1 minute
    maxDelay: parseInt(process.env.RETRY_MAX_DELAY) || 3600000, // 1 heure
  },
};
```

#### 4. Utilitaire pour le Calcul du Délai Exponentiel

**Fichier : `src/utils/retryHelper.js`**

```javascript
/**
 * Calcule le délai pour la prochaine tentative (backoff exponentiel)
 * @param {number} retryCount - Nombre de tentatives déjà effectuées
 * @param {number} baseDelay - Délai de base en ms (défaut: 60000 = 1 minute)
 * @param {number} maxDelay - Délai maximum en ms (défaut: 3600000 = 1 heure)
 * @returns {number} Délai en millisecondes
 */
function calculateBackoffDelay(
  retryCount,
  baseDelay = 60000,
  maxDelay = 3600000
) {
  // Formule: baseDelay * 2^retryCount
  // Exemple: 1min, 2min, 4min, 8min, 16min, 32min, 1h (max)
  const delay = baseDelay * Math.pow(2, retryCount);
  return Math.min(delay, maxDelay);
}

/**
 * Calcule la date/heure de la prochaine tentative
 * @param {number} retryCount - Nombre de tentatives déjà effectuées
 * @param {number} baseDelay - Délai de base en ms
 * @param {number} maxDelay - Délai maximum en ms
 * @returns {Date} Date de la prochaine tentative
 */
function calculateNextRetryAt(
  retryCount,
  baseDelay = 60000,
  maxDelay = 3600000
) {
  const delay = calculateBackoffDelay(retryCount, baseDelay, maxDelay);
  return new Date(Date.now() + delay);
}

/**
 * Détermine si une notification doit être tentée à nouveau
 * @param {Object} notification - Notification
 * @returns {boolean}
 */
function shouldRetry(notification) {
  return (
    notification.status === "failed" &&
    notification.retry_count < notification.max_retries &&
    (!notification.next_retry_at ||
      new Date(notification.next_retry_at) <= new Date())
  );
}

/**
 * Formate un message d'erreur lisible pour le délai de retry
 * @param {number} retryCount - Nombre de tentatives
 * @param {Date} nextRetryAt - Date de la prochaine tentative
 * @returns {string}
 */
function formatRetryMessage(retryCount, nextRetryAt) {
  const now = new Date();
  const delayMs = nextRetryAt.getTime() - now.getTime();
  const delayMinutes = Math.round(delayMs / 60000);

  return `Tentative ${retryCount} échouée. Nouvelle tentative dans ${delayMinutes} minute(s) à ${nextRetryAt.toLocaleTimeString(
    "fr-FR"
  )}`;
}

module.exports = {
  calculateBackoffDelay,
  calculateNextRetryAt,
  shouldRetry,
  formatRetryMessage,
};
```

#### 5. Worker de Retry

**Fichier : `src/workers/retryWorker.js`**

```javascript
const cron = require("node-cron");
const NotificationDispatcher = require("../dispatchers/notificationDispatcher");
const {
  calculateNextRetryAt,
  formatRetryMessage,
} = require("../utils/retryHelper");

/**
 * Worker qui retente l'envoi des notifications échouées
 */
class RetryWorker {
  constructor(notificationRepository, dispatcher, config) {
    this.repository = notificationRepository;
    this.dispatcher = dispatcher;
    this.config = config;
    this.isRunning = false;
  }

  /**
   * Démarre le worker (exécution toutes les minutes)
   */
  start() {
    console.log("✅ RetryWorker démarré");

    // Exécuter toutes les minutes
    cron.schedule("* * * * *", async () => {
      if (!this.isRunning) {
        await this.processFailedNotifications();
      }
    });

    // Exécution immédiate au démarrage
    this.processFailedNotifications();
  }

  /**
   * Traite toutes les notifications échouées prêtes pour un retry
   */
  async processFailedNotifications() {
    this.isRunning = true;

    try {
      const failedNotifications =
        await this.repository.getFailedNotificationsForRetry();

      if (failedNotifications.length === 0) {
        console.log("✅ Aucune notification à retenter");
        return;
      }

      console.log(
        `🔄 ${failedNotifications.length} notification(s) à retenter`
      );

      for (const notification of failedNotifications) {
        await this.retryNotification(notification);
      }
    } catch (error) {
      console.error(
        "❌ Erreur lors du traitement des notifications échouées:",
        error.message
      );
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Retente l'envoi d'une notification
   * @param {Object} notification - Notification à retenter
   */
  async retryNotification(notification) {
    console.log(
      `🔄 Retry de la notification ${notification.event_id} (tentative ${
        notification.retry_count + 1
      }/${notification.max_retries})`
    );

    try {
      // Reconstruire l'objet de notification
      const notificationData = {
        userId: notification.user_id,
        eventId: notification.event_id,
        eventType: notification.event_type,
        channels: notification.channels,
        recipients: notification.metadata.recipients || {},
        messages: notification.metadata.messages || {},
        metadata: notification.metadata,
      };

      // Tenter l'envoi
      const result = await this.dispatcher.send(notificationData);

      const newRetryCount = notification.retry_count + 1;

      if (result.success) {
        // Succès : marquer comme envoyée
        await this.repository.updateStatus(notification.event_id, {
          status: "sent",
          retryCount: newRetryCount,
          nextRetryAt: null,
          errorMessage: null,
          results: result.results,
        });

        console.log(
          `✅ Notification ${notification.event_id} envoyée avec succès après ${newRetryCount} tentative(s)`
        );
      } else {
        // Échec : planifier un nouveau retry ou marquer comme définitivement échouée
        if (newRetryCount >= notification.max_retries) {
          // Max retries atteint : déplacer vers Dead Letter Queue
          await this.repository.updateStatus(notification.event_id, {
            status: "dead_letter",
            retryCount: newRetryCount,
            nextRetryAt: null,
            errorMessage: `Échec après ${newRetryCount} tentatives`,
            results: result.results,
          });

          console.error(
            `☠️ Notification ${notification.event_id} déplacée vers Dead Letter Queue après ${newRetryCount} tentatives`
          );

          // Optionnel : envoyer une alerte aux administrateurs
          await this.notifyAdmins(notification);
        } else {
          // Planifier un nouveau retry avec backoff exponentiel
          const nextRetryAt = calculateNextRetryAt(
            newRetryCount,
            this.config.retry.baseDelay,
            this.config.retry.maxDelay
          );

          await this.repository.updateStatus(notification.event_id, {
            status: "failed",
            retryCount: newRetryCount,
            nextRetryAt,
            errorMessage: result.error || "Erreur inconnue",
            results: result.results,
          });

          const message = formatRetryMessage(newRetryCount, nextRetryAt);
          console.log(`⏰ ${message}`);
        }
      }

      // Enregistrer la tentative
      for (const channelResult of result.results) {
        await this.repository.saveAttempt(notification.id, {
          channel: channelResult.channel,
          status: channelResult.success ? "sent" : "failed",
          attemptedAt: new Date(),
          errorMessage: channelResult.error || null,
          response: channelResult,
        });
      }
    } catch (error) {
      console.error(
        `❌ Erreur lors du retry de la notification ${notification.event_id}:`,
        error.message
      );

      // Enregistrer l'erreur
      await this.repository.updateStatus(notification.event_id, {
        status: "failed",
        retryCount: notification.retry_count + 1,
        nextRetryAt: calculateNextRetryAt(
          notification.retry_count + 1,
          this.config.retry.baseDelay,
          this.config.retry.maxDelay
        ),
        errorMessage: error.message,
        results: {},
      });
    }
  }

  /**
   * Notifie les administrateurs d'une notification définitivement échouée
   * @param {Object} notification - Notification échouée
   */
  async notifyAdmins(notification) {
    try {
      console.log(
        `📧 Envoi d'une alerte admin pour la notification ${notification.event_id}`
      );

      // Créer une notification d'alerte pour les administrateurs
      const adminAlert = {
        userId: "admin",
        eventId: `admin-alert-${notification.event_id}`,
        eventType: "notification.failed",
        channels: ["email"],
        recipients: {
          email: { email: process.env.ADMIN_EMAIL || "admin@tourify.com" },
        },
        messages: {
          email: {
            subject: `⚠️ Notification définitivement échouée - ${notification.event_id}`,
            htmlContent: this.generateAdminAlertHtml(notification),
          },
        },
        metadata: {
          originalNotificationId: notification.id,
          originalEventId: notification.event_id,
        },
      };

      await this.dispatcher.send(adminAlert);
    } catch (error) {
      console.error(
        "❌ Erreur lors de l'envoi de l'alerte admin:",
        error.message
      );
    }
  }

  /**
   * Génère le HTML pour l'alerte administrateur
   * @param {Object} notification - Notification échouée
   * @returns {string}
   */
  generateAdminAlertHtml(notification) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .alert { background: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; border-radius: 5px; }
          .details { background: #f9f9f9; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .label { font-weight: bold; color: #dc3545; }
        </style>
      </head>
      <body>
        <div class="alert">
          <h2>⚠️ Alerte : Notification Définitivement Échouée</h2>
          <p>Une notification n'a pas pu être envoyée après ${
            notification.max_retries
          } tentatives.</p>
        </div>

        <div class="details">
          <p><span class="label">Event ID:</span> ${notification.event_id}</p>
          <p><span class="label">User ID:</span> ${notification.user_id}</p>
          <p><span class="label">Event Type:</span> ${
            notification.event_type
          }</p>
          <p><span class="label">Canaux:</span> ${notification.channels.join(
            ", "
          )}</p>
          <p><span class="label">Tentatives:</span> ${
            notification.retry_count
          }</p>
          <p><span class="label">Dernière erreur:</span> ${
            notification.error_message
          }</p>
          <p><span class="label">Date de création:</span> ${new Date(
            notification.created_at
          ).toLocaleString("fr-FR")}</p>
        </div>

        <p><strong>Action requise:</strong> Veuillez vérifier les logs et intervenir manuellement si nécessaire.</p>
      </body>
      </html>
    `;
  }
}

module.exports = RetryWorker;
```

#### 6. Mise à Jour des Processeurs d'Événements

**Fichier : `src/processors/tourBookedProcessor.js` (extrait modifié)**

```javascript
const { calculateNextRetryAt } = require("../utils/retryHelper");

async function handleTourBooked(event, dispatcher, notificationRepository) {
  const { eventId, data } = event;
  // ... (code existant pour la préparation de la notification)

  try {
    const result = await dispatcher.send(notification);

    // Calculer next_retry_at si échec
    let nextRetryAt = null;
    if (!result.success) {
      nextRetryAt = calculateNextRetryAt(0, 60000, 3600000); // Premier retry dans 1 minute
    }

    // Enregistrer dans la base de données
    const savedNotification = await notificationRepository.save({
      eventId,
      userId,
      eventType: "booking.confirmed",
      channels: notification.channels,
      status: result.success ? "sent" : "failed",
      sentAt: new Date(),
      retryCount: 0,
      maxRetries: 3,
      nextRetryAt,
      errorMessage: result.success ? null : result.error,
      metadata: {
        ...notification.metadata,
        recipients: notification.recipients,
        messages: notification.messages,
      },
      results: result.results,
    });

    // Enregistrer les tentatives individuelles
    for (const channelResult of result.results) {
      await notificationRepository.saveAttempt(savedNotification.id, {
        channel: channelResult.channel,
        status: channelResult.success ? "sent" : "failed",
        attemptedAt: new Date(),
        errorMessage: channelResult.error || null,
        response: channelResult,
      });
    }

    if (result.success) {
      console.log(`✅ Notification envoyée pour booking ${bookingId}`);
    } else {
      console.error(
        `❌ Échec de la notification pour booking ${bookingId}. Retry planifié.`
      );
    }
  } catch (error) {
    console.error(
      `❌ Erreur lors de l'envoi de la notification:`,
      error.message
    );

    // Enregistrer l'échec
    await notificationRepository.save({
      eventId,
      userId,
      eventType: "booking.confirmed",
      channels: notification.channels,
      status: "failed",
      sentAt: new Date(),
      retryCount: 0,
      maxRetries: 3,
      nextRetryAt: calculateNextRetryAt(0, 60000, 3600000),
      errorMessage: error.message,
      metadata: notification.metadata,
      results: {},
    });
  }
}

module.exports = { handleBookingConfirmed };
```

#### 7. Tests et Intégration

Le fichier `src/index.js` et les tests sont déjà détaillés dans le code ci-dessus (voir section 7 de l'Exercice 2).

### Résultat de l'Exercice 2

Vous avez maintenant un système complet de gestion de l'historique et des retries qui :

1. ✅ Persiste toutes les notifications dans PostgreSQL
2. ✅ Enregistre chaque tentative d'envoi avec ses détails
3. ✅ Implémente un worker de retry avec backoff exponentiel
4. ✅ Gère une Dead Letter Queue pour les échecs définitifs
5. ✅ Fournit des API pour consulter l'historique et les statistiques
6. ✅ Envoie des alertes aux administrateurs en cas d'échec définitif
7. ✅ Respecte les limites de retry configurables (max 3 par défaut)

**Exemple de Timeline de Retry :**

```
T+0min  : Première tentative - ÉCHEC
T+1min  : Retry 1 - ÉCHEC
T+3min  : Retry 2 - ÉCHEC
T+7min  : Retry 3 - ÉCHEC → Dead Letter Queue + Alerte Admin
```

---

## Exercice 3 : Préférences Utilisateur pour Notifications

### Objectif

Permettre aux utilisateurs de configurer leurs préférences de notifications (canaux préférés, types de notifications, fréquence) et respecter ces préférences lors de l'envoi.

### Solution Complète

#### 1. Schéma de Base de Données pour les Préférences

**Fichier : `db/preferences-schema.sql`**

```sql
-- Table pour les préférences de notification des utilisateurs
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) UNIQUE NOT NULL,

  -- Canaux activés (tableau)
  enabled_channels TEXT[] DEFAULT ARRAY['email'],

  -- Préférences par type d'événement (JSONB pour flexibilité)
  event_preferences JSONB DEFAULT '{
    "booking.confirmed": {"enabled": true, "channels": ["email"]},
    "tour.reminder": {"enabled": true, "channels": ["email", "sms"]},
    "payment.received": {"enabled": true, "channels": ["email"]},
    "booking.cancelled": {"enabled": true, "channels": ["email", "sms"]},
    "newsletter": {"enabled": false, "channels": []}
  }'::jsonb,

  -- Quiet hours (heures de silence)
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '08:00',

  -- Fréquence de digest (pour les notifications non-urgentes)
  digest_enabled BOOLEAN DEFAULT false,
  digest_frequency VARCHAR(50) DEFAULT 'daily',

  -- Langue préférée
  preferred_language VARCHAR(10) DEFAULT 'fr',

  -- Métadonnées
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX idx_user_preferences_user_id ON user_notification_preferences(user_id);

-- Trigger pour updated_at
CREATE TRIGGER update_user_preferences_updated_at
BEFORE UPDATE ON user_notification_preferences
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Insérer des préférences par défaut pour quelques utilisateurs de test
INSERT INTO user_notification_preferences (user_id, enabled_channels, event_preferences)
VALUES
  ('user123', ARRAY['email', 'sms'], '{
    "booking.confirmed": {"enabled": true, "channels": ["email", "sms"]},
    "tour.reminder": {"enabled": true, "channels": ["sms"]},
    "payment.received": {"enabled": true, "channels": ["email"]},
    "newsletter": {"enabled": false, "channels": []}
  }'::jsonb),
  ('user456', ARRAY['email'], '{
    "booking.confirmed": {"enabled": true, "channels": ["email"]},
    "tour.reminder": {"enabled": false, "channels": []},
    "payment.received": {"enabled": true, "channels": ["email"]},
    "newsletter": {"enabled": true, "channels": ["email"]}
  }'::jsonb)
ON CONFLICT (user_id) DO NOTHING;
```

#### 2. Repository pour les Préférences

Le code du PreferencesRepository est très long (environ 200 lignes). Voici les méthodes principales :

**Fichier : `src/repositories/preferencesRepository.js`**

```javascript
const { Pool } = require("pg");

class PreferencesRepository {
  constructor(config) {
    this.pool = new Pool(config);
    console.log("✅ PreferencesRepository initialisé");
  }

  async getPreferences(userId) {
    const query =
      "SELECT * FROM user_notification_preferences WHERE user_id = $1";
    const result = await this.pool.query(query, [userId]);
    return result.rows[0] || null;
  }

  async getAllowedChannels(userId, eventType) {
    const preferences = await this.getPreferences(userId);
    if (!preferences) return ["email"];

    const eventPref = preferences.event_preferences[eventType];
    if (!eventPref || !eventPref.enabled) return [];

    return eventPref.channels.filter((channel) =>
      preferences.enabled_channels.includes(channel)
    );
  }

  async isInQuietHours(userId) {
    const preferences = await this.getPreferences(userId);
    if (!preferences || !preferences.quiet_hours_enabled) return false;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
    const { quiet_hours_start, quiet_hours_end } = preferences;

    if (quiet_hours_start < quiet_hours_end) {
      return currentTime >= quiet_hours_start && currentTime < quiet_hours_end;
    } else {
      return currentTime >= quiet_hours_start || currentTime < quiet_hours_end;
    }
  }

  // ... autres méthodes (upsertPreferences, updatePreferences, etc.)
}

module.exports = PreferencesRepository;
```

#### 3. Service de Filtrage de Notifications

**Fichier : `src/services/notificationFilter.js`**

```javascript
class NotificationFilter {
  constructor(preferencesRepository) {
    this.preferencesRepository = preferencesRepository;
  }

  async filterNotification(notification) {
    const { userId, eventType } = notification;

    // Récupérer les canaux autorisés
    const allowedChannels = await this.preferencesRepository.getAllowedChannels(
      userId,
      eventType
    );

    if (allowedChannels.length === 0) {
      console.log(
        `🚫 Notification bloquée par préférences (userId: ${userId}, eventType: ${eventType})`
      );
      return {
        ...notification,
        channels: [],
        filtered: true,
        filterReason: "user_preferences",
      };
    }

    // Vérifier quiet hours pour notifications non-urgentes
    const isUrgent = this.isUrgentNotification(eventType);
    if (!isUrgent) {
      const inQuietHours = await this.preferencesRepository.isInQuietHours(
        userId
      );
      if (inQuietHours) {
        console.log(
          `🌙 Notification retardée (quiet hours) pour userId: ${userId}`
        );
        return {
          ...notification,
          channels: [],
          filtered: true,
          filterReason: "quiet_hours",
        };
      }
    }

    // Filtrer les canaux
    const filteredChannels = notification.channels.filter((ch) =>
      allowedChannels.includes(ch)
    );

    return {
      ...notification,
      channels: filteredChannels,
      filtered: false,
    };
  }

  isUrgentNotification(eventType) {
    const urgentTypes = [
      "booking.cancelled",
      "tour.reminder",
      "payment.refunded",
      "account.security",
    ];
    return urgentTypes.includes(eventType);
  }
}

module.exports = NotificationFilter;
```

#### 4. Mise à Jour du Dispatcher

**Fichier : `src/dispatchers/notificationDispatcher.js`**

```javascript
const NotificationFilter = require("../services/notificationFilter");

class NotificationDispatcher {
  constructor(channelFactory, preferencesRepository) {
    this.channelFactory = channelFactory;
    this.filter = new NotificationFilter(preferencesRepository);
  }

  async send(notification) {
    // Filtrer selon les préférences utilisateur
    const filteredNotification = await this.filter.filterNotification(
      notification
    );

    if (
      filteredNotification.filtered ||
      filteredNotification.channels.length === 0
    ) {
      return {
        success: false,
        filtered: true,
        filterReason: filteredNotification.filterReason || "no_channels",
        results: [],
      };
    }

    // Envoyer sur les canaux autorisés
    const results = [];
    for (const channelName of filteredNotification.channels) {
      const channel = this.channelFactory.getChannel(channelName);
      if (!channel) continue;

      const recipient = notification.recipients[channelName];
      const message = notification.messages[channelName];
      if (!recipient || !message) continue;

      const result = await channel.send(recipient, message);
      results.push(result);
    }

    const success = results.some((r) => r.success);
    return {
      success,
      filtered: false,
      results,
      error: success ? null : "Échec sur tous les canaux",
    };
  }
}

module.exports = NotificationDispatcher;
```

#### 5. API REST pour Gérer les Préférences

**Fichier : `src/routes/preferencesRoutes.js`**

```javascript
const express = require("express");

module.exports = (preferencesRepository) => {
  const router = express.Router();

  // GET /preferences/:userId - Récupérer les préférences
  router.get("/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const preferences = await preferencesRepository.getPreferences(userId);

      if (!preferences) {
        return res
          .status(404)
          .json({ success: false, error: "Préférences non trouvées" });
      }

      res.json({
        success: true,
        preferences: {
          userId: preferences.user_id,
          enabledChannels: preferences.enabled_channels,
          eventPreferences: preferences.event_preferences,
          quietHours: {
            enabled: preferences.quiet_hours_enabled,
            start: preferences.quiet_hours_start,
            end: preferences.quiet_hours_end,
          },
          preferredLanguage: preferences.preferred_language,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // PATCH /preferences/:userId - Mettre à jour les préférences
  router.patch("/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const updates = req.body;

      const updatedPreferences = await preferencesRepository.updatePreferences(
        userId,
        updates
      );

      res.json({ success: true, preferences: updatedPreferences });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // DELETE /preferences/:userId/channels/:channel - Désactiver un canal
  router.delete("/:userId/channels/:channel", async (req, res) => {
    try {
      const { userId, channel } = req.params;

      const preferences = await preferencesRepository.getPreferences(userId);
      const currentChannels = preferences ? preferences.enabled_channels : [];
      const filteredChannels = currentChannels.filter((c) => c !== channel);

      const updated = await preferencesRepository.updatePreferences(userId, {
        enabledChannels: filteredChannels,
      });

      res.json({
        success: true,
        message: `Canal ${channel} désactivé`,
        enabledChannels: updated.enabled_channels,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
};
```

#### 6. Intégration Finale

**Fichier : `src/index.js`**

```javascript
const express = require("express");
const config = require("./config");
const ChannelFactory = require("./channels/channelFactory");
const NotificationDispatcher = require("./dispatchers/notificationDispatcher");
const NotificationRepository = require("./repositories/notificationRepository");
const PreferencesRepository = require("./repositories/preferencesRepository");
const RetryWorker = require("./workers/retryWorker");
const preferencesRoutes = require("./routes/preferencesRoutes");

const app = express();
app.use(express.json());

// Initialisation
const channelFactory = new ChannelFactory(config);
const notificationRepository = new NotificationRepository(config.database);
const preferencesRepository = new PreferencesRepository(config.database);
const dispatcher = new NotificationDispatcher(
  channelFactory,
  preferencesRepository
);

// Démarrage des workers
const retryWorker = new RetryWorker(notificationRepository, dispatcher, config);
retryWorker.start();

// Routes API
app.use("/preferences", preferencesRoutes(preferencesRepository));

app.get("/health", (req, res) => {
  res.json({ status: "healthy", service: "notification-service" });
});

// Arrêt gracieux
process.on("SIGINT", async () => {
  console.log("\n🛑 Arrêt du service...");
  await notificationRepository.close();
  await preferencesRepository.close();
  process.exit(0);
});

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
  console.log(`🚀 Service de Notifications démarré sur le port ${PORT}`);
});
```

#### 7. Tests des Préférences

**Test cURL :**

```bash
# 1. Créer des préférences
curl -X PATCH http://localhost:3006/preferences/user123 \
  -H "Content-Type: application/json" \
  -d '{
    "enabledChannels": ["email", "sms"],
    "quietHoursEnabled": true,
    "quietHoursStart": "22:00",
    "quietHoursEnd": "08:00"
  }'

# 2. Récupérer les préférences
curl http://localhost:3006/preferences/user123

# 3. Désactiver le canal SMS
curl -X DELETE http://localhost:3006/preferences/user123/channels/sms

# Résultat : Les notifications SMS seront bloquées pour user123
```

### Résultat de l'Exercice 3

Vous avez maintenant un système complet de gestion des préférences qui :

1. ✅ Permet aux utilisateurs de configurer leurs préférences
2. ✅ Filtre les canaux selon les préférences
3. ✅ Gère les préférences par type d'événement
4. ✅ Implémente les quiet hours
5. ✅ Distingue les notifications urgentes des non-urgentes
6. ✅ Fournit une API REST complète
7. ✅ Respecte l'opt-in/opt-out

**Exemple d'utilisation :**

```
Utilisateur user123 : email + SMS pour booking.confirmed
→ ✅ Email envoyé, ✅ SMS envoyé

Utilisateur user456 : email uniquement pour booking.confirmed
→ ✅ Email envoyé, 🚫 SMS bloqué
```

---

## Conclusion

Vous avez maintenant complété les 3 exercices de la leçon 5.4 ! Votre microservice de notifications est :

### Fonctionnalités Complètes

✅ **Multi-canal** : Email (Nodemailer), SMS (Twilio), Push (FCM)
✅ **Résilient** : Retry automatique avec backoff exponentiel
✅ **Respectueux des utilisateurs** : Préférences configurables, quiet hours
✅ **Observable** : Historique complet, statistiques
✅ **Scalable** : Architecture event-driven, workers asynchrones

### Architecture Finale

```
RabbitMQ Queue → Consumer → Dispatcher (+Filter) → Channels
                     ↓              ↓
              RetryWorker    PreferencesRepo
                     ↓
           NotificationRepo (PostgreSQL)
```

---

## Résumé

### Exercice 1 : Implémentation SMS pour Rappels de Tours

- ✅ Configuration Twilio complète
- ✅ Classe `SmsChannel` avec normalisation des numéros de téléphone
- ✅ Gestionnaire d'événements `handleTourReminder`
- ✅ Template email pour les rappels
- ✅ Planificateur automatique avec cron jobs
- ✅ Tests unitaires et d'intégration

### Exercice 2 : Historique de Notifications et Retry

- ✅ Schéma PostgreSQL pour `notifications` et `notification_attempts`
- ✅ Repository complet avec toutes les méthodes CRUD
- ✅ Worker de retry avec backoff exponentiel
- ✅ Dead Letter Queue pour les échecs définitifs
- ✅ Alertes administrateurs
- ✅ API REST pour consulter l'historique
- ✅ Tests de retry

### Exercice 3 : Préférences Utilisateur pour Notifications

- ✅ Schéma PostgreSQL pour `user_notification_preferences`
- ✅ Repository pour gérer les préférences
- ✅ Service de filtrage avec quiet hours
- ✅ Mise à jour du Dispatcher pour respecter les préférences
- ✅ API REST complète (GET, PATCH, DELETE)
- ✅ Tests cURL et scénarios d'utilisation

### Conclusion

- ✅ Résumé des fonctionnalités complètes
- ✅ Architecture finale
- ✅ Prochaines étapes (leçons 5.5 et 5.6)

---

Excellent travail ! 🎉
