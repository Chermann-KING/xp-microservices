# Payment Service

Microservice de paiement Stripe pour de l'application de réservation touristique.

## Fonctionnalités

- ✅ Création de PaymentIntent
- ✅ Gestion des webhooks Stripe
- ✅ Suivi des paiements
- ✅ Remboursements (complets et partiels)
- ✅ Notification du booking service

## Démarrage rapide

### Prérequis

- Node.js 18+
- PostgreSQL 14+
- Compte Stripe (mode test)

### Installation

```bash
# Installer les dépendances
npm install

# Copier le fichier d'environnement
cp .env.example .env

# Configurer les clés Stripe dans .env
# STRIPE_SECRET_KEY=sk_test_...
# STRIPE_PUBLISHABLE_KEY=pk_test_...

# Créer la base de données PostgreSQL
createdb xp_travel_payments

# Démarrer le service
npm run dev
```

### Variables d'environnement

| Variable                 | Description                     | Défaut                |
| ------------------------ | ------------------------------- | --------------------- |
| `PORT`                   | Port du serveur                 | 3004                  |
| `DB_*`                   | Configuration PostgreSQL        | localhost             |
| `JWT_SECRET`             | Clé JWT (même que auth-service) | -                     |
| `STRIPE_SECRET_KEY`      | Clé secrète Stripe              | -                     |
| `STRIPE_PUBLISHABLE_KEY` | Clé publique Stripe             | -                     |
| `STRIPE_WEBHOOK_SECRET`  | Secret webhook Stripe           | -                     |
| `BOOKING_SERVICE_URL`    | URL du booking service          | http://localhost:3002 |

## API Endpoints

### Routes publiques

| Méthode | Endpoint               | Description                     |
| ------- | ---------------------- | ------------------------------- |
| GET     | `/api/payments/config` | Récupère la clé publique Stripe |

### Routes protégées

| Méthode | Endpoint                           | Description                 |
| ------- | ---------------------------------- | --------------------------- |
| POST    | `/api/payments/create-intent`      | Crée un PaymentIntent       |
| GET     | `/api/payments/user/me`            | Paiements de l'utilisateur  |
| GET     | `/api/payments/:id`                | Statut d'un paiement        |
| GET     | `/api/payments/booking/:bookingId` | Paiements d'une réservation |
| POST    | `/api/payments/:id/refund`         | Rembourser (admin)          |

### Webhooks

| Méthode | Endpoint           | Description                 |
| ------- | ------------------ | --------------------------- |
| POST    | `/webhooks/stripe` | Réception événements Stripe |

## Configuration Stripe

### 1. Obtenir les clés API

1. Connectez-vous sur [Stripe Dashboard](https://dashboard.stripe.com)
2. Allez dans Developers → API keys
3. Copiez les clés test (commencent par `sk_test_` et `pk_test_`)

### 2. Configurer les webhooks

1. Dans Stripe Dashboard, allez dans Developers → Webhooks
2. Cliquez sur "Add endpoint"
3. URL: `https://votre-domaine.com/webhooks/stripe`
4. Sélectionnez les événements:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
   - `charge.refunded`
5. Copiez le signing secret (commence par `whsec_`)

### 3. Test local avec Stripe CLI

```bash
# Installer Stripe CLI
brew install stripe/stripe-cli/stripe

# Se connecter
stripe login

# Écouter les webhooks en local
stripe listen --forward-to localhost:3004/webhooks/stripe

# Copier le webhook secret affiché et le mettre dans .env
```

## Exemples d'utilisation

### Créer un PaymentIntent

```bash
curl -X POST http://localhost:3004/api/payments/create-intent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "bookingId": "uuid-de-la-reservation",
    "amount": 199.99,
    "currency": "eur"
  }'
```

Réponse:

```json
{
  "success": true,
  "data": {
    "clientSecret": "pi_xxx_secret_xxx",
    "paymentIntentId": "pi_xxx",
    "payment": {
      "id": "uuid",
      "status": "pending",
      ...
    }
  }
}
```

### Récupérer la configuration Stripe (frontend)

```bash
curl http://localhost:3004/api/payments/config
```

```json
{
  "success": true,
  "data": {
    "publishableKey": "pk_test_..."
  }
}
```

## Architecture

```
payment-service/
├── server.js              # Point d'entrée
├── package.json
├── .env.example
└── src/
    ├── config/
    │   ├── database.js    # Configuration Sequelize
    │   └── stripe.js      # Client Stripe
    ├── controllers/
    │   ├── paymentController.js
    │   └── webhookController.js
    ├── middleware/
    │   ├── errorHandler.js
    │   └── validate.js
    ├── models/
    │   ├── Payment.js
    │   └── index.js
    ├── repositories/
    │   └── paymentRepository.js
    ├── routes/
    │   ├── payment.routes.js
    │   ├── webhook.routes.js
    │   └── health.routes.js
    ├── services/
    │   └── paymentService.js
    └── validators/
        └── paymentValidators.js
```

## Flux de paiement

```
┌─────────┐    ┌─────────────┐    ┌──────────────┐    ┌────────┐
│ Frontend│    │ Payment Svc │    │    Stripe    │    │Booking │
└────┬────┘    └──────┬──────┘    └──────┬───────┘    └───┬────┘
     │                │                   │                │
     │ Create Intent  │                   │                │
     │───────────────>│                   │                │
     │                │ Create PaymentInt │                │
     │                │──────────────────>│                │
     │                │<──────────────────│                │
     │<───────────────│ clientSecret      │                │
     │                │                   │                │
     │ Confirm Payment (Stripe.js)        │                │
     │───────────────────────────────────>│                │
     │                │                   │                │
     │                │   Webhook Event   │                │
     │                │<──────────────────│                │
     │                │                   │                │
     │                │ Update payment status              │
     │                │───────────────────────────────────>│
     │                │                   │                │
```

## Sécurité

- Vérification de signature webhook Stripe
- Authentification JWT pour toutes les routes sensibles
- Remboursements réservés aux admins
- Pas de stockage des données de carte (géré par Stripe)
