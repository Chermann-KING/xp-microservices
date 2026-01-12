# Leçon 5.4 : Conception et Implémentation du Microservice de Notifications

**Module 5** : Architecture Event-Driven et Communication Asynchrone

---

## 🎯 Objectifs de la Leçon

À la fin de cette leçon, vous serez capable de :

- ✅ Concevoir un microservice de notifications découplé et scalable
- ✅ Consommer des événements depuis RabbitMQ/Kafka pour déclencher des notifications
- ✅ Implémenter l'envoi d'emails avec templates dynamiques
- ✅ Intégrer plusieurs canaux de notification (Email, SMS, Push)
- ✅ Gérer les échecs et mettre en place des mécanismes de retry
- ✅ Garantir l'idempotence des notifications

---

## 📌 Prérequis

Avant de commencer cette leçon, vous devez avoir :

- ✅ Complété la [Leçon 5.2 - Communication Asynchrone](./lecon-2-message-queues.md)
- ✅ Compris les concepts de **Producer/Consumer** avec RabbitMQ
- ✅ Notions de templating HTML (Pug, Handlebars, EJS)
- ✅ Compte développeur sur un service d'email (SendGrid, Mailtrap, Mailgun)

---

## 1. Responsabilités et Principes de Conception

### 1.1 Pourquoi un Microservice de Notifications Dédié ?

Dans une architecture microservices, il est crucial de séparer la logique métier de la logique de notification. Le **Notification Microservice** centralise toutes les responsabilités liées à l'envoi de messages aux utilisateurs.

```
┌────────────────────────────────────────────────────────────────┐
│              ARCHITECTURE SANS NOTIFICATION SERVICE            │
└────────────────────────────────────────────────────────────────┘

Booking Service ──> SendGrid API (Email)
                ──> Twilio API (SMS)
                ──> Firebase (Push)

Payment Service ──> SendGrid API (Email)
                ──> Twilio API (SMS)

Tour Catalog Service ──> SendGrid API (Email)

❌ Problèmes:
- Code dupliqué dans chaque service
- Couplage fort avec les providers externes
- Difficile de changer de provider
- Aucune centralisation des logs/historique
```

**Avec un Notification Service centralisé** :

```
┌────────────────────────────────────────────────────────────────┐
│              ARCHITECTURE AVEC NOTIFICATION SERVICE            │
└────────────────────────────────────────────────────────────────┘

Booking Service ──┐
                  │
Payment Service ──┼──> Message Queue ──> Notification Service
                  │                           │
Tour Catalog ─────┘                           ├──> SendGrid (Email)
                                              ├──> Twilio (SMS)
                                              └──> Firebase (Push)

✅ Avantages:
- Séparation des responsabilités (SRP)
- Un seul point d'intégration avec les providers
- Historique centralisé
- Retry et gestion d'erreurs centralisés
```

---

### 1.2 Principes de Conception

| Principe                       | Description                                             | Implémentation                             |
| ------------------------------ | ------------------------------------------------------- | ------------------------------------------ |
| **Communication Event-Driven** | Écoute les événements publiés par les autres services   | Consumer RabbitMQ/Kafka                    |
| **Abstraction des Canaux**     | Support multi-canal sans modifier la logique métier     | Interface `NotificationChannel`            |
| **Templating Dynamique**       | Messages personnalisés selon les données de l'événement | Pug, Handlebars, ou Mustache               |
| **Résilience et Retry**        | Gestion des échecs transitoires avec retry exponentiel  | Queue de retry, Dead Letter Queue          |
| **Idempotence**                | Éviter l'envoi de notifications en double               | Redis cache avec `notificationId`          |
| **Scalabilité Horizontale**    | Plusieurs instances consomment la même queue            | RabbitMQ round-robin, Kafka consumer group |

---

## 2. Consommation d'Événements

### 2.1 Événements Consommés

Le Notification Service s'abonne à plusieurs types d'événements :

```
┌────────────────────────────────────────────────────────────────┐
│                 ÉVÉNEMENTS DU SYSTÈME TOURISTIQUE              │
└────────────────────────────────────────────────────────────────┘

┌─────────────────────────┐
│  Booking Events         │
├─────────────────────────┤
│ booking.confirmed       │ → Email de confirmation
│ booking.cancelled       │ → Email d'annulation
│ booking.reminder        │ → SMS de rappel (24h avant)
└─────────────────────────┘

┌─────────────────────────┐
│  Payment Events         │
├─────────────────────────┤
│ payment.succeeded       │ → Email de reçu
│ payment.failed          │ → Email d'échec + SMS
│ payment.refunded        │ → Email de remboursement
└─────────────────────────┘

┌─────────────────────────┐
│  User Events            │
├─────────────────────────┤
│ user.registered         │ → Email de bienvenue
│ user.password.reset     │ → Email avec lien de reset
└─────────────────────────┘
```

---

### 2.2 Structure d'un Événement

```json
{
  "eventId": "evt_1234567890",
  "eventType": "booking.confirmed",
  "correlationId": "corr_abc123",
  "timestamp": "2025-01-08T14:30:00Z",
  "data": {
    "bookingId": "book_789",
    "userId": "user_456",
    "userEmail": "alice@example.com",
    "userName": "Alice Dupont",
    "phoneNumber": "+33612345678",
    "tourId": "tour_123",
    "tourName": "Visite guidée de Paris",
    "bookingDate": "2025-01-15T09:00:00Z",
    "numberOfGuests": 2,
    "totalPrice": 199.99,
    "currency": "EUR"
  }
}
```

---

### 2.3 Workflow : Confirmation de Réservation

```
┌────────────────────────────────────────────────────────────────┐
│         FLUX COMPLET: RÉSERVATION → NOTIFICATION               │
└────────────────────────────────────────────────────────────────┘

1. User ────> POST /bookings ────> Booking Service
                                        │
                                        │ Créer réservation en DB
                                        │
                                        v
2. Booking Service ───> Publier "booking.confirmed" ───> RabbitMQ Queue
                                                        │
                                                        │
3. Notification Service <──── Consume event ───────────┘
         │
         │ Parse event data
         │
         v
4. Render Template ───> "booking-confirmation.pug"
         │
         │ { userName, tourName, bookingDate, price }
         │
         v
5. Send Email ───> SendGrid/Mailgun ───> User Email Inbox
         │
         │
         v
6. Log Notification ───> Database (notifications table)
```

---

## 3. Composants Architecturaux

### 3.1 Architecture Interne

```
┌────────────────────────────────────────────────────────────────┐
│              NOTIFICATION MICROSERVICE - ARCHITECTURE          │
└────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────┐
│                    Event Listener/Consumer                    │
│  (RabbitMQ/Kafka Consumer - Écoute les événements)            │
└───────────────────────┬───────────────────────────────────────┘
                        │
                        v
┌───────────────────────────────────────────────────────────────┐
│                   Notification Processor                      │
│  - Détermine le type de notification                          │
│  - Sélectionne le canal (Email, SMS, Push)                    │
│  - Orchestre le rendering et l'envoi                          │
└───────────────────────┬───────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        v               v               v
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   Email      │ │     SMS      │ │    Push      │
│  Dispatcher  │ │  Dispatcher  │ │  Dispatcher  │
│              │ │              │ │              │
│  SendGrid    │ │   Twilio     │ │   Firebase   │
└──────────────┘ └──────────────┘ └──────────────┘
        │               │               │
        └───────────────┼───────────────┘
                        │
                        v
┌───────────────────────────────────────────────────────────────┐
│                Notification Repository (DB)                   │
│  - Logs de toutes les notifications envoyées                  │
│  - Statut (PENDING, SENT, FAILED)                             │
│  - Retry count et error details                               │
└───────────────────────────────────────────────────────────────┘
```

---

### 3.2 Abstraction des Canaux avec Pattern Strategy

```javascript
// src/channels/NotificationChannel.js
/**
 * Interface pour les canaux de notification
 */
class NotificationChannel {
  async send(recipient, message) {
    throw new Error("Method send() must be implemented");
  }

  getName() {
    throw new Error("Method getName() must be implemented");
  }
}

module.exports = NotificationChannel;
```

```javascript
// src/channels/EmailChannel.js
const NotificationChannel = require("./NotificationChannel");
const nodemailer = require("nodemailer");

class EmailChannel extends NotificationChannel {
  constructor(config) {
    super();
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: false,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });
    this.senderEmail = config.senderEmail;
  }

  async send(recipient, message) {
    try {
      await this.transporter.sendMail({
        from: this.senderEmail,
        to: recipient.email,
        subject: message.subject,
        html: message.htmlContent,
      });

      console.log(`📧 Email envoyé à ${recipient.email}`);
      return { success: true, channel: "email" };
    } catch (error) {
      console.error(`❌ Échec envoi email:`, error.message);
      return { success: false, channel: "email", error: error.message };
    }
  }

  getName() {
    return "email";
  }
}

module.exports = EmailChannel;
```

```javascript
// src/channels/SMSChannel.js
const NotificationChannel = require("./NotificationChannel");
const twilio = require("twilio");

class SMSChannel extends NotificationChannel {
  constructor(config) {
    super();
    this.client = twilio(config.accountSid, config.authToken);
    this.fromNumber = config.fromNumber;
  }

  async send(recipient, message) {
    try {
      await this.client.messages.create({
        from: this.fromNumber,
        to: recipient.phoneNumber,
        body: message.textContent,
      });

      console.log(`📱 SMS envoyé à ${recipient.phoneNumber}`);
      return { success: true, channel: "sms" };
    } catch (error) {
      console.error(`❌ Échec envoi SMS:`, error.message);
      return { success: false, channel: "sms", error: error.message };
    }
  }

  getName() {
    return "sms";
  }
}

module.exports = SMSChannel;
```

---

## 4. Modèle de Données

### 4.1 Table `notifications`

```sql
-- Schema pour PostgreSQL
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    event_id VARCHAR(255) NOT NULL UNIQUE, -- Pour idempotence
    event_type VARCHAR(255) NOT NULL,
    channel VARCHAR(50) NOT NULL, -- 'email', 'sms', 'push'
    status VARCHAR(50) NOT NULL, -- 'PENDING', 'SENT', 'FAILED', 'RETRYING'
    recipient VARCHAR(255) NOT NULL, -- Email ou numéro de téléphone
    subject VARCHAR(500),
    message_content TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    last_retry_at TIMESTAMP WITH TIME ZONE,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    error_details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour performances
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_event_id ON notifications(event_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
```

---

### 4.2 Table `notification_templates`

```sql
CREATE TABLE notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE, -- 'booking_confirmation', 'payment_receipt'
    event_type VARCHAR(255) NOT NULL,
    channel VARCHAR(50) NOT NULL,
    subject_template VARCHAR(500), -- Pour emails
    body_template TEXT NOT NULL, -- Template Pug/Handlebars
    language VARCHAR(10) DEFAULT 'fr',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Exemple d'insertion
INSERT INTO notification_templates (name, event_type, channel, subject_template, body_template)
VALUES (
    'booking_confirmation_email',
    'booking.confirmed',
    'email',
    'Confirmation de votre réservation pour {{tourName}}',
    '...' -- Contenu du template Pug
);
```

---

## 5. Implémentation Complète (Node.js/Express)

### 5.1 Structure du Projet

```
notification-service/
├── src/
│   ├── channels/
│   │   ├── NotificationChannel.js
│   │   ├── EmailChannel.js
│   │   └── SMSChannel.js
│   ├── consumers/
│   │   └── rabbitmqConsumer.js
│   ├── processors/
│   │   └── notificationProcessor.js
│   ├── templates/
│   │   ├── booking-confirmation.pug
│   │   ├── payment-receipt.pug
│   │   └── tour-reminder.pug
│   ├── repositories/
│   │   └── notificationRepository.js
│   ├── config/
│   │   └── database.js
│   └── index.js
├── package.json
├── .env
└── README.md
```

---

### 5.2 Dépendances (`package.json`)

```json
{
  "name": "notification-service",
  "version": "1.0.0",
  "description": "Notification Microservice pour Application Touristique",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js"
  },
  "dependencies": {
    "amqplib": "^0.10.3",
    "dotenv": "^16.0.3",
    "express": "^4.18.2",
    "nodemailer": "^6.9.1",
    "pug": "^3.0.2",
    "pg": "^8.10.0",
    "ioredis": "^5.3.1",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "nodemon": "^2.0.22"
  }
}
```

---

### 5.3 Variables d'Environnement (`.env`)

```bash
# Service Configuration
PORT=3005
NODE_ENV=development

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@localhost:5672
NOTIFICATION_QUEUE=notifications_queue

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/notifications_db

# Redis (pour idempotence)
REDIS_URL=redis://localhost:6379

# Email Configuration (Mailtrap pour dev, SendGrid pour prod)
EMAIL_SERVICE_HOST=smtp.mailtrap.io
EMAIL_SERVICE_PORT=2525
EMAIL_SERVICE_USER=your_mailtrap_user
EMAIL_SERVICE_PASS=your_mailtrap_password
SENDER_EMAIL=noreply@tourism-app.com
SENDER_NAME=Tourism App

# SMS Configuration (Twilio)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+15551234567
```

---

### 5.4 Template Email (`src/templates/booking-confirmation.pug`)

```pug
doctype html
html(lang="fr")
  head
    meta(charset="UTF-8")
    meta(name="viewport", content="width=device-width, initial-scale=1.0")
    style.
      body {
        font-family: 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        background-color: #f4f4f4;
        margin: 0;
        padding: 0;
      }
      .container {
        max-width: 600px;
        margin: 40px auto;
        background-color: #ffffff;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        overflow: hidden;
      }
      .header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 30px;
        text-align: center;
      }
      .header h1 {
        margin: 0;
        font-size: 28px;
        font-weight: 600;
      }
      .content {
        padding: 30px;
      }
      .greeting {
        font-size: 18px;
        margin-bottom: 20px;
      }
      .tour-details {
        background-color: #f8f9fa;
        border-left: 4px solid #667eea;
        padding: 20px;
        margin: 20px 0;
      }
      .tour-details h2 {
        margin-top: 0;
        color: #667eea;
      }
      .detail-item {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid #e9ecef;
      }
      .detail-item:last-child {
        border-bottom: none;
      }
      .detail-label {
        font-weight: 600;
        color: #6c757d;
      }
      .detail-value {
        color: #212529;
      }
      .price {
        font-size: 24px;
        font-weight: bold;
        color: #28a745;
      }
      .footer {
        background-color: #f8f9fa;
        padding: 20px 30px;
        text-align: center;
        font-size: 14px;
        color: #6c757d;
      }
      .button {
        display: inline-block;
        padding: 12px 24px;
        background-color: #667eea;
        color: white;
        text-decoration: none;
        border-radius: 5px;
        margin-top: 20px;
      }
  body
    .container
      .header
        h1 ✅ Réservation Confirmée

      .content
        .greeting
          p Bonjour #{userName},

        p Votre réservation pour le tour <strong>#{tourName}</strong> a été confirmée avec succès !

        .tour-details
          h2 📋 Détails de la Réservation

          .detail-item
            .detail-label ID de Réservation :
            .detail-value #{bookingId}

          .detail-item
            .detail-label Nom du Tour :
            .detail-value #{tourName}

          .detail-item
            .detail-label Date :
            .detail-value #{bookingDate}

          .detail-item
            .detail-label Nombre de Participants :
            .detail-value #{numberOfGuests}

          .detail-item
            .detail-label Montant Total :
            .detail-value
              span.price #{totalPrice} #{currency}

        p Nous sommes impatients de vous accueillir ! Vous recevrez un SMS de rappel 24 heures avant votre tour.

        a.button(href="https://tourism-app.com/bookings/#{bookingId}") Voir ma Réservation

        p.
          Si vous avez des questions, n'hésitez pas à nous contacter à
          <a href="mailto:support@tourism-app.com">support@tourism-app.com</a>.

      .footer
        p Cordialement,
        p <strong>L'équipe Tourism App</strong>
        p.
          Ceci est un email automatique. Merci de ne pas y répondre directement.
```

---

### 5.5 Notification Processor (`src/processors/notificationProcessor.js`)

```javascript
const pug = require("pug");
const path = require("path");
const EmailChannel = require("../channels/EmailChannel");
const SMSChannel = require("../channels/SMSChannel");
const notificationRepository = require("../repositories/notificationRepository");
const { v4: uuidv4 } = require("uuid");

// Configuration des canaux
const emailChannel = new EmailChannel({
  host: process.env.EMAIL_SERVICE_HOST,
  port: process.env.EMAIL_SERVICE_PORT,
  user: process.env.EMAIL_SERVICE_USER,
  pass: process.env.EMAIL_SERVICE_PASS,
  senderEmail: process.env.SENDER_EMAIL,
});

const smsChannel = new SMSChannel({
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  fromNumber: process.env.TWILIO_PHONE_NUMBER,
});

/**
 * Compiler un template Pug
 */
function compileTemplate(templateName, data) {
  const templatePath = path.join(
    __dirname,
    "../templates",
    `${templateName}.pug`
  );
  return pug.renderFile(templatePath, data);
}

/**
 * Traiter l'événement booking.confirmed
 */
async function handleBookingConfirmed(event) {
  const { eventId, data } = event;
  const {
    userId,
    userEmail,
    userName,
    tourName,
    bookingId,
    bookingDate,
    numberOfGuests,
    totalPrice,
    currency,
  } = data;

  console.log(
    `📩 Traitement de l'événement booking.confirmed - bookingId: ${bookingId}`
  );

  if (!userEmail) {
    console.warn("⚠️ Email utilisateur manquant. Notification ignorée.");
    return;
  }

  try {
    // Vérifier si notification déjà envoyée (idempotence)
    const existingNotification = await notificationRepository.findByEventId(
      eventId
    );
    if (existingNotification) {
      console.log(`⏭️ Notification déjà traitée pour eventId: ${eventId}`);
      return;
    }

    // Compiler le template email
    const emailSubject = `Confirmation de votre réservation pour ${tourName}`;
    const emailHtml = compileTemplate("booking-confirmation", {
      userName,
      tourName,
      bookingId,
      bookingDate: new Date(bookingDate).toLocaleDateString("fr-FR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      numberOfGuests,
      totalPrice: totalPrice.toFixed(2),
      currency: currency || "EUR",
    });

    // Créer l'enregistrement de notification
    const notification = await notificationRepository.create({
      eventId,
      userId,
      eventType: "booking.confirmed",
      channel: "email",
      recipient: userEmail,
      subject: emailSubject,
      messageContent: emailHtml,
      status: "PENDING",
    });

    // Envoyer l'email
    const result = await emailChannel.send(
      { email: userEmail },
      { subject: emailSubject, htmlContent: emailHtml }
    );

    if (result.success) {
      await notificationRepository.updateStatus(
        notification.id,
        "SENT",
        new Date()
      );
      console.log(
        `✅ Notification envoyée avec succès - notificationId: ${notification.id}`
      );
    } else {
      await notificationRepository.updateStatus(
        notification.id,
        "FAILED",
        null,
        result.error
      );
      console.error(
        `❌ Échec d'envoi de la notification - error: ${result.error}`
      );
    }
  } catch (error) {
    console.error("❌ Erreur lors du traitement de booking.confirmed:", error);
    throw error;
  }
}

/**
 * Traiter l'événement payment.succeeded
 */
async function handlePaymentSucceeded(event) {
  const { eventId, data } = event;
  const { userId, userEmail, userName, bookingId, amount, currency } = data;

  console.log(
    `📩 Traitement de l'événement payment.succeeded - bookingId: ${bookingId}`
  );

  if (!userEmail) {
    console.warn("⚠️ Email utilisateur manquant. Notification ignorée.");
    return;
  }

  try {
    // Vérifier idempotence
    const existingNotification = await notificationRepository.findByEventId(
      eventId
    );
    if (existingNotification) {
      console.log(`⏭️ Notification déjà traitée pour eventId: ${eventId}`);
      return;
    }

    // Compiler le template
    const emailSubject = `Reçu de paiement pour votre réservation ${bookingId}`;
    const emailHtml = compileTemplate("payment-receipt", {
      userName,
      bookingId,
      amount: amount.toFixed(2),
      currency: currency || "EUR",
      paymentDate: new Date().toLocaleDateString("fr-FR"),
    });

    // Créer la notification
    const notification = await notificationRepository.create({
      eventId,
      userId,
      eventType: "payment.succeeded",
      channel: "email",
      recipient: userEmail,
      subject: emailSubject,
      messageContent: emailHtml,
      status: "PENDING",
    });

    // Envoyer l'email
    const result = await emailChannel.send(
      { email: userEmail },
      { subject: emailSubject, htmlContent: emailHtml }
    );

    if (result.success) {
      await notificationRepository.updateStatus(
        notification.id,
        "SENT",
        new Date()
      );
      console.log(
        `✅ Reçu de paiement envoyé - notificationId: ${notification.id}`
      );
    } else {
      await notificationRepository.updateStatus(
        notification.id,
        "FAILED",
        null,
        result.error
      );
    }
  } catch (error) {
    console.error("❌ Erreur lors du traitement de payment.succeeded:", error);
    throw error;
  }
}

/**
 * Router les événements vers les handlers appropriés
 */
async function processEvent(event) {
  const { eventType } = event;

  switch (eventType) {
    case "booking.confirmed":
      await handleBookingConfirmed(event);
      break;

    case "payment.succeeded":
      await handlePaymentSucceeded(event);
      break;

    case "booking.cancelled":
      console.log("📩 Traitement de booking.cancelled:", event.data);
      // Implémenter le handler pour annulation
      break;

    case "payment.failed":
      console.log("📩 Traitement de payment.failed:", event.data);
      // Implémenter le handler pour échec de paiement
      break;

    default:
      console.warn(`⚠️ Type d'événement non géré: ${eventType}`);
  }
}

module.exports = {
  processEvent,
  handleTourBooked,
  handlePaymentSucceeded,
};
```

---

### 5.6 Notification Repository (`src/repositories/notificationRepository.js`)

```javascript
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Créer une nouvelle notification
 */
async function create(notificationData) {
  const {
    eventId,
    userId,
    eventType,
    channel,
    recipient,
    subject,
    messageContent,
    status,
  } = notificationData;

  const query = `
    INSERT INTO notifications (
      event_id, user_id, event_type, channel, recipient,
      subject, message_content, status, created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
    RETURNING *
  `;

  const values = [
    eventId,
    userId,
    eventType,
    channel,
    recipient,
    subject,
    messageContent,
    status,
  ];

  const result = await pool.query(query, values);
  return result.rows[0];
}

/**
 * Trouver une notification par eventId (pour idempotence)
 */
async function findByEventId(eventId) {
  const query = "SELECT * FROM notifications WHERE event_id = $1";
  const result = await pool.query(query, [eventId]);
  return result.rows[0];
}

/**
 * Mettre à jour le statut d'une notification
 */
async function updateStatus(
  notificationId,
  status,
  sentAt = null,
  errorDetails = null
) {
  const query = `
    UPDATE notifications
    SET status = $1, sent_at = $2, error_details = $3, updated_at = NOW()
    WHERE id = $4
    RETURNING *
  `;

  const values = [status, sentAt, errorDetails, notificationId];
  const result = await pool.query(query, values);
  return result.rows[0];
}

/**
 * Obtenir les notifications en échec nécessitant un retry
 */
async function getFailedNotificationsForRetry() {
  const query = `
    SELECT * FROM notifications
    WHERE status = 'FAILED'
      AND retry_count < max_retries
      AND (last_retry_at IS NULL OR last_retry_at < NOW() - INTERVAL '5 minutes')
    ORDER BY created_at ASC
    LIMIT 100
  `;

  const result = await pool.query(query);
  return result.rows;
}

/**
 * Incrémenter le retry count
 */
async function incrementRetryCount(notificationId) {
  const query = `
    UPDATE notifications
    SET retry_count = retry_count + 1, last_retry_at = NOW(), updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `;

  const result = await pool.query(query, [notificationId]);
  return result.rows[0];
}

module.exports = {
  create,
  findByEventId,
  updateStatus,
  getFailedNotificationsForRetry,
  incrementRetryCount,
};
```

---

### 5.7 RabbitMQ Consumer (`src/consumers/rabbitmqConsumer.js`)

```javascript
const amqp = require("amqplib");
const { processEvent } = require("../processors/notificationProcessor");

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";
const NOTIFICATION_QUEUE =
  process.env.NOTIFICATION_QUEUE || "notifications_queue";

let channel;

/**
 * Démarrer la consommation depuis RabbitMQ
 */
async function startConsuming() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();

    // Assurer que la queue existe
    await channel.assertQueue(NOTIFICATION_QUEUE, { durable: true });

    console.log(`📬 En attente de messages dans ${NOTIFICATION_QUEUE}...`);

    // Consommer les messages
    channel.consume(
      NOTIFICATION_QUEUE,
      async (msg) => {
        if (msg) {
          try {
            const event = JSON.parse(msg.content.toString());
            console.log(
              `📨 Événement reçu: ${event.eventType} - eventId: ${event.eventId}`
            );

            // Traiter l'événement
            await processEvent(event);

            // Accuser réception du message
            channel.ack(msg);
            console.log(
              `✅ Message traité avec succès - eventId: ${event.eventId}`
            );
          } catch (error) {
            console.error("❌ Erreur lors du traitement du message:", error);

            // NACK avec requeue (max 3 tentatives)
            const retryCount =
              (msg.properties.headers["x-retry-count"] || 0) + 1;

            if (retryCount < 3) {
              console.log(`🔄 Requeue du message - tentative ${retryCount}/3`);
              msg.properties.headers["x-retry-count"] = retryCount;
              channel.nack(msg, false, true); // Requeue
            } else {
              console.error(
                "💀 Message envoyé en Dead Letter Queue après 3 échecs"
              );
              channel.nack(msg, false, false); // Dead Letter Queue
            }
          }
        }
      },
      {
        noAck: false, // Accusé de réception manuel
      }
    );
  } catch (error) {
    console.error("❌ Échec de connexion à RabbitMQ:", error);
    setTimeout(startConsuming, 5000); // Retry après 5 secondes
  }
}

module.exports = {
  startConsuming,
};
```

---

### 5.8 Fichier Principal (`src/index.js`)

```javascript
require("dotenv").config();
const express = require("express");
const { startConsuming } = require("./consumers/rabbitmqConsumer");

const app = express();
const PORT = process.env.PORT || 3005;

app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    service: "notification-service",
    timestamp: new Date().toISOString(),
  });
});

// Endpoint pour obtenir l'historique des notifications d'un utilisateur
app.get("/api/notifications/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const notificationRepository = require("./repositories/notificationRepository");
    const notifications = await notificationRepository.findByUserId(userId);

    res.status(200).json({
      userId,
      notifications,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des notifications:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🚀 Notification Service démarré sur le port ${PORT}`);
  console.log(`📬 Mode: ${process.env.NODE_ENV || "development"}`);

  // Démarrer le consumer RabbitMQ
  startConsuming();
});

// Gestion gracieuse de l'arrêt
process.on("SIGTERM", () => {
  console.log("👋 SIGTERM reçu, arrêt gracieux...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("👋 SIGINT reçu, arrêt gracieux...");
  process.exit(0);
});
```

---

## 6. Extension Multi-Canal

### 6.1 Ajout du Canal SMS

```javascript
// src/processors/notificationProcessor.js (extension)

/**
 * Traiter l'événement tour.reminder (SMS de rappel 24h avant)
 */
async function handleTourReminder(event) {
  const { eventId, data } = event;
  const { userId, phoneNumber, tourName, tourDate } = data;

  console.log(`📩 Traitement de l'événement tour.reminder - tour: ${tourName}`);

  if (!phoneNumber) {
    console.warn("⚠️ Numéro de téléphone manquant. Notification ignorée.");
    return;
  }

  try {
    // Vérifier idempotence
    const existingNotification = await notificationRepository.findByEventId(
      eventId
    );
    if (existingNotification) {
      console.log(`⏭️ Notification déjà traitée pour eventId: ${eventId}`);
      return;
    }

    // Construire le message SMS
    const smsMessage = `Rappel: Votre tour "${tourName}" est prévu demain, le ${new Date(
      tourDate
    ).toLocaleDateString("fr-FR")} à ${new Date(tourDate).toLocaleTimeString(
      "fr-FR",
      { hour: "2-digit", minute: "2-digit" }
    )}. À bientôt ! - Booking Tourism App`;

    // Créer la notification
    const notification = await notificationRepository.create({
      eventId,
      userId,
      eventType: "tour.reminder",
      channel: "sms",
      recipient: phoneNumber,
      subject: null,
      messageContent: smsMessage,
      status: "PENDING",
    });

    // Envoyer le SMS
    const result = await smsChannel.send(
      { phoneNumber },
      { textContent: smsMessage }
    );

    if (result.success) {
      await notificationRepository.updateStatus(
        notification.id,
        "SENT",
        new Date()
      );
      console.log(
        `✅ SMS de rappel envoyé - notificationId: ${notification.id}`
      );
    } else {
      await notificationRepository.updateStatus(
        notification.id,
        "FAILED",
        null,
        result.error
      );
    }
  } catch (error) {
    console.error("❌ Erreur lors du traitement de tour.reminder:", error);
    throw error;
  }
}

// Ajouter le cas dans processEvent()
// case 'tour.reminder':
//   await handleTourReminder(event);
//   break;
```

---

### 6.2 Ajout du Canal Push Notification (Firebase)

```javascript
// src/channels/PushNotificationChannel.js
const NotificationChannel = require("./NotificationChannel");
const admin = require("firebase-admin");

class PushNotificationChannel extends NotificationChannel {
  constructor(config) {
    super();
    admin.initializeApp({
      credential: admin.credential.cert(config.serviceAccount),
    });
  }

  async send(recipient, message) {
    try {
      const payload = {
        notification: {
          title: message.title,
          body: message.body,
        },
        token: recipient.deviceToken,
      };

      await admin.messaging().send(payload);
      console.log(`🔔 Push notification envoyée à ${recipient.deviceToken}`);
      return { success: true, channel: "push" };
    } catch (error) {
      console.error(`❌ Échec envoi push:`, error.message);
      return { success: false, channel: "push", error: error.message };
    }
  }

  getName() {
    return "push";
  }
}

module.exports = PushNotificationChannel;
```

---

## 7. Exercices Pratiques

### Exercice 1 : Implémentation SMS pour Rappels de Tours

**Objectif** : Étendre le Notification Service pour envoyer des SMS de rappel 24 heures avant un tour.

**Tâches** :

1. **Événement `tour.reminder.needed`** :

   - Supposer qu'un service Scheduler (externe) publie un événement `tour.reminder.needed` 24h avant chaque tour
   - Payload : `{ userId, phoneNumber, tourName, tourDate }`

2. **Dispatcher SMS** :

   - Utiliser Twilio (ou simuler avec des logs console si pas de compte)
   - Implémenter `sendSMS(phoneNumber, message)`

3. **Template SMS** :

   - Message simple : `"Rappel: Votre tour '{tourName}' est demain, {date} à {heure}. À bientôt !"`

4. **Event Handler** :

   - Créer `handleTourReminder(event)` dans `notificationProcessor.js`
   - Ajouter le cas dans `processEvent()`

5. **Test** :
   - Publier manuellement un événement `tour.reminder.needed` dans RabbitMQ
   - Vérifier que le SMS est envoyé (ou loggé)

**Output Attendu** :

```
📱 SMS envoyé à +32486345678:
"Rappel: Votre tour 'Visite guidée de Paris' est demain, 15/01/2026 à 09:00. À bientôt !"
```

---

### Exercice 2 : Historique de Notifications et Retry

**Objectif** : Ajouter la persistence des notifications et implémenter un mécanisme de retry pour les échecs.

**Tâches** :

1. **Setup Database** :

   - Utiliser PostgreSQL (ou SQLite pour simplicité)
   - Créer la table `notifications` avec le schéma fourni dans la Section 4.1

2. **Fonction `saveNotificationAttempt`** :

   - Créer une fonction qui insère un enregistrement dans la table
   - Champs : `user_id`, `event_id`, `event_type`, `channel`, `status`, `message_content`, `sent_at`

3. **Modifier `sendEmail`** :

   - Avant envoi : Créer un enregistrement avec `status = 'PENDING'`
   - Après succès : Mettre à jour `status = 'SENT'`, `sent_at = NOW()`
   - Après échec : Mettre à jour `status = 'FAILED'`, incrémenter `retry_count`

4. **Worker de Retry** :

   - Créer un fichier `src/workers/retryWorker.js`
   - Toutes les 5 minutes, requêter les notifications avec `status = 'FAILED'` et `retry_count < 3`
   - Réessayer l'envoi pour chaque notification
   - Incrémenter `retry_count` et mettre à jour `last_retry_at`

5. **Test** :
   - Simuler un échec d'envoi (par exemple, email invalide)
   - Vérifier que la notification est marquée `FAILED`
   - Attendre que le retry worker la retraite

**Bonus** :

- Implémenter un backoff exponentiel : 5 min, 15 min, 45 min
- Dead Letter Queue après 3 échecs

---

### Exercice 3 : Préférences Utilisateur pour Notifications

**Objectif** : Permettre aux utilisateurs de configurer leurs préférences de notification.

**Tâches** :

1. **Table `user_notification_preferences`** :

```sql
CREATE TABLE user_notification_preferences (
    user_id UUID PRIMARY KEY,
    email_enabled BOOLEAN DEFAULT TRUE,
    sms_enabled BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT TRUE,
    marketing_emails BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

2. **Vérifier les Préférences** :

   - Dans chaque handler (`handleTourBooked`, etc.), avant d'envoyer une notification :
   - Requêter les préférences de l'utilisateur depuis la DB
   - Si `email_enabled = FALSE`, skip l'envoi email

3. **API Endpoint** :

   - `GET /api/notifications/preferences/:userId` : Récupérer les préférences
   - `PATCH /api/notifications/preferences/:userId` : Mettre à jour les préférences

4. **Catégories de Notifications** :
   - Transactionnelles (toujours envoyées) : `booking.confirmed`, `payment.succeeded`
   - Marketing (respect des préférences) : `tour.promotion`, `seasonal.offer`

**Test** :

- Créer un utilisateur avec `email_enabled = FALSE`
- Publier un événement `booking.confirmed` pour cet utilisateur
- Vérifier que l'email n'est PAS envoyé

---

## 8. Résumé

### 8.1 Ce que Vous Avez Appris

- ✅ **Architecture** : Conception d'un Notification Service découplé et event-driven
- ✅ **Consommation** : Consumer RabbitMQ avec gestion d'erreurs et retry
- ✅ **Templating** : Génération dynamique d'emails avec Pug
- ✅ **Multi-Canal** : Abstraction des canaux (Email, SMS, Push) avec Pattern Strategy
- ✅ **Persistance** : Logs et historique des notifications en base de données
- ✅ **Idempotence** : Éviter les doublons avec `event_id` unique
- ✅ **Résilience** : Retry automatique pour les échecs transitoires

---

### 8.2 Bonnes Pratiques

| Pratique                       | Description                                                |
| ------------------------------ | ---------------------------------------------------------- |
| **Idempotence**                | Vérifier `event_id` avant traitement pour éviter doublons  |
| **Accusé de Réception Manuel** | `noAck: false` dans RabbitMQ consumer                      |
| **Templates Versionnés**       | Gérer plusieurs versions de templates en DB                |
| **Rate Limiting**              | Limiter le nombre de notifications par utilisateur/période |
| **Observabilité**              | Logs structurés avec `correlation_id`                      |
| **Circuit Breaker**            | Si provider externe est down, éviter les appels répétés    |
| **Graceful Degradation**       | Si email échoue, envoyer SMS comme fallback                |

---

## 9. Ressources

### Documentation Officielle

- [Nodemailer](https://nodemailer.com/) - Envoi d'emails avec Node.js
- [Twilio Node SDK](https://www.twilio.com/docs/libraries/node) - API SMS
- [SendGrid Node SDK](https://github.com/sendgrid/sendgrid-nodejs) - Service Email
- [Pug Template Engine](https://pugjs.org/) - Templating HTML
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging) - Push Notifications

### Outils de Développement

- [Mailtrap](https://mailtrap.io/) - Email testing (gratuit pour dev)
- [MailHog](https://github.com/mailhog/MailHog) - SMTP testing local
- [Twilio Sandbox](https://www.twilio.com/docs/usage/tutorials/how-to-use-your-free-trial-account) - Test SMS gratuit

### Articles Recommandés

- [Transactional Email Best Practices](https://sendgrid.com/blog/transactional-email-best-practices/)
- [Designing a Notification System](https://martinfowler.com/articles/201701-event-driven.html)
- [Idempotence in Distributed Systems](https://medium.com/analytics-vidhya/idempotence-in-distributed-systems-943b7e8b4560)

---

**🎉 Félicitations ! Vous maîtrisez maintenant la conception et l'implémentation d'un Notification Microservice robuste et scalable.**

---

## Navigation

- **⬅️ Précédent** : [Leçon 5.3 - Modèle Saga pour les Transactions Distribuées](lecon-3-saga-pattern.md)
- **➡️ Suivant** : [Leçon 5.5 - Gestion de la Concurrence et de l'Idempotence dans les Transactions](lecon-5-concurrency-idempotency.md)
- **🏠 Sommaire** : [Retour au README](README.md)

---
