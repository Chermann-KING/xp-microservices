# Notification Service

Microservice de notifications multi-canal pour l'application de réservation touristique.

## Module 5 - Architecture Event-Driven

Ce service consomme des événements depuis RabbitMQ et envoie des notifications par différents canaux (Email, SMS, Push).

## Fonctionnalités

- ✅ **Consommation d'événements RabbitMQ** (pattern Pub/Sub)
- ✅ **Envoi d'emails** avec templates Pug
- ✅ **Idempotence** via Redis (évite les doublons)
- ✅ **Pattern Strategy** pour les canaux (Email, SMS, Push)
- ✅ **Accusé de réception manuel** pour la fiabilité
- ✅ **Retry automatique** en cas d'échec

## Événements consommés

| Routing Key             | Description           | Action                             |
| ----------------------- | --------------------- | ---------------------------------- |
| `booking.confirmed`     | Réservation confirmée | Email de confirmation              |
| `booking.cancelled`     | Réservation annulée   | Email d'annulation + remboursement |
| `payment.succeeded`     | Paiement réussi       | Email de confirmation paiement     |
| `payment.failed`        | Paiement échoué       | Email d'échec paiement             |
| `tour.availability.low` | Stock faible          | Alerte administrateurs             |

## Structure du projet

```
notification-service/
├── src/
│   ├── channels/
│   │   ├── notificationChannel.js      # Interface abstraite
│   │   ├── emailChannel.js             # Implémentation Email
│   │   └── channelFactory.js           # Factory pattern
│   ├── consumers/
│   │   └── notificationConsumer.js     # Consumer RabbitMQ
│   ├── services/
│   │   ├── idempotenceService.js       # Gestion idempotence avec Redis
│   │   └── templateService.js          # Génération templates Pug
│   ├── templates/
│   │   ├── booking-confirmation.pug
│   │   ├── booking-cancellation.pug
│   │   └── payment-success.pug
│   ├── config/
│   │   └── index.js
│   └── server.js
├── package.json
└── .env.example
```

## Installation

```bash
# Installer les dépendances
npm install

# Copier le fichier d'environnement
cp .env.example .env

# Configurer les variables (voir section suivante)
```

## Configuration

Créer un fichier `.env` :

```env
# Service
NODE_ENV=development
PORT=3006

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@localhost:5672
RABBITMQ_EXCHANGE=tour_booking_events
RABBITMQ_QUEUE=notification_queue

# Redis
REDIS_URL=redis://localhost:6379
REDIS_TTL=86400

# Email (Mailtrap pour dev)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your_mailtrap_user
SMTP_PASS=your_mailtrap_password
SENDER_EMAIL=noreply@bookingtourismapp.com
SENDER_NAME=Booking Tourism App
```

## Démarrage

### Mode développement

```bash
npm run dev
```

### Mode production

```bash
npm start
```

## Test du service

```bash
# Health check
curl http://localhost:3006/health
```

## Prérequis

- Node.js 18+
- RabbitMQ en cours d'exécution
- Redis en cours d'exécution
- Compte Mailtrap (ou autre SMTP) configuré

## Démarrage avec Docker Compose

```bash
# Depuis le dossier app/
docker-compose up rabbitmq redis notification-service
```

## Architecture

### Pattern Strategy

Les canaux de notification implémentent l'interface `NotificationChannel` :

```javascript
class NotificationChannel {
  async send(recipient, message) { ... }
  async isAvailable() { ... }
}
```

### Idempotence

Chaque événement possède un `eventId` unique. Le service vérifie dans Redis si l'événement a déjà été traité avant de l'envoyer.

### Retry Logic

Si l'envoi échoue, le message est rejeté avec `nack(msg, false, true)`, ce qui le renvoie dans la queue pour retry.

## Templates Email

Les templates Pug sont dans `src/templates/` et permettent de générer des emails HTML dynamiques.

Exemple :

```pug
p Bonjour #{userName},
p Votre réservation ##{bookingId} est confirmée.
```

## Logs

```
🚀 Notification Service démarré sur le port 3006
📊 Environnement: development
🔌 Connexion à RabbitMQ...
✅ Redis connecté pour idempotence
✅ Consumer démarré sur la queue 'notification_queue'
📡 En écoute des événements: booking.confirmed, booking.cancelled, ...
```

## Prochaines étapes

- [ ] Ajouter `SmsChannel` avec Twilio
- [ ] Ajouter `PushChannel` avec Firebase
- [ ] Implémenter Dead Letter Queue pour échecs persistants
- [ ] Ajouter métriques Prometheus
- [ ] Tests unitaires et d'intégration

## Références

- [Leçon 5.4 - Notification Microservice](../../docs/module-5/lecon-4-notification-microservice.md)
- [Leçon 5.2 - Message Queues](../../docs/module-5/lecon-2-message-queues.md)
