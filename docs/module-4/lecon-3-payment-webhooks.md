# Leçon 4.3 - Gestion des Callbacks et Webhooks de Paiement

**Module 4** : Intégration et sécurité du traitement des paiements

---

## Objectifs pédagogiques

À la fin de cette leçon, vous serez capable de :

- ✅ Comprendre la différence entre callbacks et webhooks
- ✅ Implémenter un endpoint webhook sécurisé pour Stripe
- ✅ Vérifier les signatures de webhook pour garantir l'authenticité
- ✅ Gérer l'idempotence pour éviter les traitements en double
- ✅ Concevoir un flux robuste combinant callbacks et webhooks

## Prérequis

- Avoir complété la [Leçon 4.2 - Implémentation Stripe API](lecon-2-stripe-integration.md)
- Comprendre le flux PaymentIntent et la confirmation côté client
- Connaissances de base en Express.js

## Durée estimée

2h00

---

## Introduction

Le traitement des paiements implique souvent une communication asynchrone où la passerelle de paiement, après avoir traité une transaction, doit informer votre application du résultat. Cette notification se fait généralement via des **callbacks** ou des **webhooks**, essentiels pour mettre à jour l'état de votre application, confirmer des réservations ou gérer les échecs de paiement.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CALLBACKS vs WEBHOOKS                                     │
└─────────────────────────────────────────────────────────────────────────────┘

  CALLBACK (Redirection navigateur)          WEBHOOK (Serveur à serveur)
  ================================          ============================

  ┌──────────┐    ┌────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
  │  Client  │───►│ Stripe │───►│  Client  │    │  Stripe  │───►│  Backend │
  │ (Browser)│    │  Page  │    │ (success │    │  Server  │    │  Server  │
  └──────────┘    └────────┘    │   URL)   │    └──────────┘    └──────────┘
                                └──────────┘
       │                              │              │                 │
       │    Dépend du navigateur     │              │  Indépendant    │
       │    ❌ Peut échouer           │              │  ✅ Fiable      │
       └──────────────────────────────┘              └─────────────────┘
```

---

## 1. Comprendre les Callbacks de Paiement

Un **callback de paiement** est un mécanisme où la passerelle de paiement redirige le navigateur de l'utilisateur vers une URL spécifiée dans votre application après une tentative de paiement.

### 1.1 Fonctionnement des Callbacks

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FLUX DE CALLBACK                                     │
└─────────────────────────────────────────────────────────────────────────────┘

1. INITIATION
   ┌─────────┐     ┌─────────────┐
   │ Votre   │────►│   Stripe    │  L'utilisateur est redirigé
   │   App   │     │  Checkout   │  vers Stripe
   └─────────┘     └─────────────┘

2. TRAITEMENT DU PAIEMENT
   ┌─────────────┐
   │   Stripe    │  L'utilisateur entre ses
   │  Checkout   │  informations de carte
   └─────────────┘

3. REDIRECTION
   ┌─────────────┐     ┌─────────────────────────────────────────────┐
   │   Stripe    │────►│ votre-app.com/payment-success               │
   │  Checkout   │     │   ?session_id=cs_xxx&booking_id=123        │
   └─────────────┘     └─────────────────────────────────────────────┘

4. TRAITEMENT PAR L'APPLICATION
   ┌─────────────────────────────────────────────┐
   │ Votre App extrait session_id et vérifie    │
   │ le statut auprès de Stripe                  │
   └─────────────────────────────────────────────┘
```

### 1.2 Exemple : Stripe Checkout avec Callbacks

```javascript
// payment-gateway-service/src/controllers/checkout.controller.js

import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Crée une session Stripe Checkout
 * Alternative au flux PaymentIntent pour un checkout hébergé
 */
export const createCheckoutSession = async (req, res, next) => {
  try {
    const { bookingId, amount, currency, tourName, customerEmail } = req.body;

    // Validation
    if (!bookingId || !amount || !currency) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Paramètres manquants" },
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: tourName || `Réservation Tour ${bookingId}`,
              description: `Réservation #${bookingId}`,
            },
            unit_amount: Math.round(amount * 100), // En centimes
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      customer_email: customerEmail,

      // URLs de callback - où Stripe redirige l'utilisateur
      success_url: `${process.env.FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}&booking_id=${bookingId}`,
      cancel_url: `${process.env.FRONTEND_URL}/payment-cancel?booking_id=${bookingId}`,

      // Métadonnées pour lier à notre système
      metadata: {
        booking_id: bookingId,
        source: "checkout_session",
      },
    });

    res.status(200).json({
      success: true,
      data: {
        sessionId: session.id,
        checkoutUrl: session.url,
      },
    });
  } catch (error) {
    next(error);
  }
};
```

### 1.3 Page de Succès Côté Frontend

```jsx
// frontend/src/pages/PaymentSuccess.jsx

import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("verifying"); // verifying, confirmed, error

  const sessionId = searchParams.get("session_id");
  const bookingId = searchParams.get("booking_id");

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId || !bookingId) {
        setStatus("error");
        return;
      }

      try {
        // Vérifier le statut auprès du backend
        // ⚠️ NE JAMAIS faire confiance aux params URL seuls !
        const response = await axios.get(
          `${
            import.meta.env.VITE_API_URL
          }/api/v1/payment-gateway/sessions/${sessionId}/verify`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        if (response.data.data.status === "complete") {
          setStatus("confirmed");
        } else {
          // Le webhook n'a peut-être pas encore été traité
          setStatus("pending");
        }
      } catch (error) {
        console.error("Verification error:", error);
        setStatus("error");
      }
    };

    verifyPayment();
  }, [sessionId, bookingId]);

  return (
    <div className="max-w-lg mx-auto p-6 text-center">
      {status === "verifying" && (
        <div>
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p>Vérification du paiement...</p>
        </div>
      )}

      {status === "confirmed" && (
        <div className="text-green-600">
          <div className="text-6xl mb-4">✓</div>
          <h1 className="text-2xl font-bold mb-2">Paiement Confirmé !</h1>
          <p className="mb-4">Votre réservation #{bookingId} est confirmée.</p>
          <button
            onClick={() => navigate(`/bookings/${bookingId}`)}
            className="bg-blue-600 text-white px-6 py-2 rounded"
          >
            Voir ma réservation
          </button>
        </div>
      )}

      {status === "pending" && (
        <div className="text-yellow-600">
          <div className="text-6xl mb-4">⏳</div>
          <h1 className="text-2xl font-bold mb-2">
            Paiement en cours de traitement
          </h1>
          <p>Vous recevrez un email de confirmation sous peu.</p>
        </div>
      )}

      {status === "error" && (
        <div className="text-red-600">
          <div className="text-6xl mb-4">✗</div>
          <h1 className="text-2xl font-bold mb-2">Erreur de vérification</h1>
          <p>Veuillez contacter le support si le problème persiste.</p>
        </div>
      )}
    </div>
  );
};

export default PaymentSuccess;
```

### 1.4 Limitations des Callbacks

| Limitation                 | Description                                               | Impact                                    |
| -------------------------- | --------------------------------------------------------- | ----------------------------------------- |
| **Dépendance navigateur**  | Si l'utilisateur ferme le navigateur avant la redirection | Callback jamais reçu                      |
| **Sécurité**               | Les paramètres URL peuvent être manipulés                 | Jamais faire confiance aux données client |
| **Information limitée**    | Souvent juste un ID de session                            | Nécessite un appel API supplémentaire     |
| **Pas d'événements async** | Ne gère pas les remboursements, abonnements, etc.         | Cas d'usage limités                       |

> ⚠️ **Important** : Les callbacks sont pour l'**UX** (rediriger l'utilisateur), pas pour la **fiabilité** (confirmer le paiement).

---

## 2. Explorer les Webhooks

Les **webhooks** sont des requêtes HTTP POST automatiques envoyées par la passerelle de paiement vers une URL pré-configurée dans votre application lorsqu'un événement spécifique se produit. Contrairement aux callbacks, les webhooks sont des communications **serveur à serveur** et ne dépendent pas du navigateur de l'utilisateur.

### 2.1 Fonctionnement des Webhooks

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FLUX DE WEBHOOK                                      │
└─────────────────────────────────────────────────────────────────────────────┘

1. ABONNEMENT (Configuration initiale)
   ┌─────────────────┐                    ┌─────────────────┐
   │  Stripe         │                    │  Votre Backend  │
   │  Dashboard      │ ──── Configure ───►│  /webhooks/     │
   │                 │     endpoint URL   │    stripe       │
   └─────────────────┘                    └─────────────────┘

2. ÉVÉNEMENT SE PRODUIT
   ┌─────────────────┐
   │  Stripe Server  │  payment_intent.succeeded
   │                 │  checkout.session.completed
   │                 │  charge.refunded
   └────────┬────────┘
            │
            │ POST (payload signé)
            ▼
3. LIVRAISON DU WEBHOOK
   ┌─────────────────┐
   │  Votre Backend  │
   │  /webhooks/     │  Reçoit, vérifie signature,
   │    stripe       │  traite l'événement
   └────────┬────────┘
            │
            │ 200 OK
            ▼
4. ACCUSÉ DE RÉCEPTION
   ┌─────────────────┐
   │  Stripe Server  │  Marque le webhook comme livré
   └─────────────────┘
```

### 2.2 Types d'Événements Stripe

| Événement                       | Description               | Usage                    |
| ------------------------------- | ------------------------- | ------------------------ |
| `payment_intent.succeeded`      | Paiement réussi           | Confirmer la réservation |
| `payment_intent.payment_failed` | Paiement échoué           | Notifier l'utilisateur   |
| `checkout.session.completed`    | Session checkout terminée | Confirmer après checkout |
| `charge.refunded`               | Remboursement effectué    | Mettre à jour le statut  |
| `charge.dispute.created`        | Litige ouvert             | Alerter l'équipe         |
| `customer.subscription.created` | Abonnement créé           | Pour les récurrents      |

### 2.3 Implémentation du Webhook Handler

```javascript
// payment-gateway-service/src/routes/webhook.routes.js

import express from "express";
import Stripe from "stripe";
import { getContainer } from "../config/container.js";

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Endpoint Webhook Stripe
 *
 * IMPORTANT: Ce endpoint doit recevoir le body RAW (non parsé)
 * pour que la vérification de signature fonctionne
 *
 * @route POST /api/v1/payment-gateway/webhooks/stripe
 */
router.post(
  "/stripe",
  // Middleware pour recevoir le body raw
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const { webhookService, logger } = getContainer();

    const signature = req.headers["stripe-signature"];

    if (!signature) {
      logger.warn("Webhook received without signature");
      return res.status(400).json({ error: "Missing signature" });
    }

    let event;

    try {
      // 1. VÉRIFICATION DE LA SIGNATURE
      // C'est CRITIQUE pour la sécurité !
      event = stripe.webhooks.constructEvent(
        req.body, // Body RAW
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      logger.error("Webhook signature verification failed", {
        error: err.message,
      });
      return res.status(400).json({
        error: `Webhook Error: ${err.message}`,
      });
    }

    logger.info("Webhook received", {
      type: event.type,
      id: event.id,
    });

    try {
      // 2. TRAITEMENT DE L'ÉVÉNEMENT
      await webhookService.handleStripeEvent(event);

      // 3. ACCUSÉ DE RÉCEPTION
      // Toujours retourner 200 rapidement !
      res.status(200).json({ received: true });
    } catch (processingError) {
      logger.error("Webhook processing failed", {
        eventId: event.id,
        eventType: event.type,
        error: processingError.message,
      });

      // Retourner 500 pour que Stripe réessaie
      res.status(500).json({
        received: true,
        error: processingError.message,
      });
    }
  }
);

export default router;
```

### 2.4 Service de Traitement des Webhooks

```javascript
// payment-gateway-service/src/services/WebhookService.js

import { EventEmitter } from "events";

/**
 * Service dédié au traitement des événements webhook
 * Applique le principe SRP - séparé du PaymentService
 */
class WebhookService {
  constructor({ paymentRepository, bookingClient, logger }) {
    this.paymentRepository = paymentRepository;
    this.bookingClient = bookingClient;
    this.logger = logger;
    this.eventEmitter = new EventEmitter();
  }

  /**
   * Point d'entrée principal pour les événements Stripe
   */
  async handleStripeEvent(event) {
    const { type, id, data } = event;

    // Vérification d'idempotence
    if (await this._isEventAlreadyProcessed(id)) {
      this.logger.info("Event already processed, skipping", { eventId: id });
      return { skipped: true, reason: "already_processed" };
    }

    // Router vers le handler approprié
    switch (type) {
      case "payment_intent.succeeded":
        return this._handlePaymentIntentSucceeded(data.object, id);

      case "payment_intent.payment_failed":
        return this._handlePaymentIntentFailed(data.object, id);

      case "checkout.session.completed":
        return this._handleCheckoutSessionCompleted(data.object, id);

      case "charge.refunded":
        return this._handleChargeRefunded(data.object, id);

      case "charge.dispute.created":
        return this._handleDisputeCreated(data.object, id);

      default:
        this.logger.info("Unhandled event type", { type });
        return { handled: false, type };
    }
  }

  /**
   * Gère le succès d'un PaymentIntent
   */
  async _handlePaymentIntentSucceeded(paymentIntent, eventId) {
    const { id: paymentIntentId, metadata, amount, currency } = paymentIntent;
    const bookingId = metadata?.bookingId || metadata?.booking_id;

    this.logger.info("Processing payment_intent.succeeded", {
      paymentIntentId,
      bookingId,
    });

    // 1. Mettre à jour notre transaction
    const transaction = await this.paymentRepository.findByExternalId(
      paymentIntentId
    );

    if (!transaction) {
      this.logger.warn("Transaction not found for PaymentIntent", {
        paymentIntentId,
      });
      // Créer une transaction si elle n'existe pas (cas edge)
      await this.paymentRepository.create({
        externalTransactionId: paymentIntentId,
        bookingId,
        amount: amount / 100,
        currency,
        status: "succeeded",
        paymentGateway: "stripe",
      });
    } else {
      await this.paymentRepository.update(transaction.id, {
        status: "succeeded",
        gatewayResponse: paymentIntent,
      });
    }

    // 2. Notifier le Booking Service
    if (bookingId) {
      try {
        await this.bookingClient.updateBookingStatus(bookingId, {
          status: "confirmed",
          paymentIntentId,
          paidAt: new Date().toISOString(),
        });
        this.logger.info("Booking status updated to confirmed", { bookingId });
      } catch (bookingError) {
        this.logger.error("Failed to update booking status", {
          bookingId,
          error: bookingError.message,
        });
        // Ne pas échouer le webhook pour ça - utiliser une queue de retry
        // En production, publier un événement pour retry asynchrone
      }
    }

    // 3. Marquer l'événement comme traité
    await this._markEventAsProcessed(eventId, "payment_intent.succeeded");

    // 4. Émettre un événement interne (pour notifications, etc.)
    this.eventEmitter.emit("payment.confirmed", {
      paymentIntentId,
      bookingId,
      amount: amount / 100,
      currency,
    });

    return { success: true, paymentIntentId, bookingId };
  }

  /**
   * Gère l'échec d'un PaymentIntent
   */
  async _handlePaymentIntentFailed(paymentIntent, eventId) {
    const { id: paymentIntentId, metadata, last_payment_error } = paymentIntent;
    const bookingId = metadata?.bookingId || metadata?.booking_id;

    this.logger.info("Processing payment_intent.payment_failed", {
      paymentIntentId,
      bookingId,
      errorCode: last_payment_error?.code,
    });

    // Mettre à jour la transaction
    const transaction = await this.paymentRepository.findByExternalId(
      paymentIntentId
    );

    if (transaction) {
      await this.paymentRepository.update(transaction.id, {
        status: "failed",
        errorCode: last_payment_error?.code,
        errorMessage: last_payment_error?.message,
        gatewayResponse: paymentIntent,
      });
    }

    // Notifier le Booking Service pour garder le statut "pending"
    // L'utilisateur peut réessayer

    await this._markEventAsProcessed(eventId, "payment_intent.payment_failed");

    this.eventEmitter.emit("payment.failed", {
      paymentIntentId,
      bookingId,
      error: last_payment_error,
    });

    return { success: true, paymentIntentId, status: "failed" };
  }

  /**
   * Gère la complétion d'une session Checkout
   */
  async _handleCheckoutSessionCompleted(session, eventId) {
    const {
      id: sessionId,
      payment_intent,
      metadata,
      amount_total,
      currency,
    } = session;
    const bookingId = metadata?.booking_id;

    this.logger.info("Processing checkout.session.completed", {
      sessionId,
      paymentIntentId: payment_intent,
      bookingId,
    });

    // Le traitement est similaire à payment_intent.succeeded
    // mais avec les données de la session

    // 1. Créer/mettre à jour l'enregistrement de paiement
    await this.paymentRepository.upsert({
      externalTransactionId: payment_intent,
      checkoutSessionId: sessionId,
      bookingId,
      amount: amount_total / 100,
      currency,
      status: "succeeded",
      paymentGateway: "stripe",
    });

    // 2. Mettre à jour la réservation
    if (bookingId) {
      await this.bookingClient.updateBookingStatus(bookingId, {
        status: "confirmed",
        paymentIntentId: payment_intent,
        paidAt: new Date().toISOString(),
      });
    }

    await this._markEventAsProcessed(eventId, "checkout.session.completed");

    return { success: true, sessionId, bookingId };
  }

  /**
   * Gère un remboursement
   */
  async _handleChargeRefunded(charge, eventId) {
    const { payment_intent, amount_refunded, refunded } = charge;

    this.logger.info("Processing charge.refunded", {
      paymentIntentId: payment_intent,
      amountRefunded: amount_refunded,
      fullyRefunded: refunded,
    });

    const transaction = await this.paymentRepository.findByExternalId(
      payment_intent
    );

    if (transaction) {
      const newStatus = refunded ? "refunded" : "partially_refunded";

      await this.paymentRepository.update(transaction.id, {
        status: newStatus,
        refundedAmount: amount_refunded / 100,
        gatewayResponse: charge,
      });

      // Notifier le Booking Service
      if (transaction.bookingId) {
        await this.bookingClient.updateBookingStatus(transaction.bookingId, {
          status: refunded ? "cancelled" : "partially_refunded",
          refundedAt: new Date().toISOString(),
        });
      }
    }

    await this._markEventAsProcessed(eventId, "charge.refunded");

    return { success: true, paymentIntentId: payment_intent, refunded };
  }

  /**
   * Gère un litige (dispute)
   */
  async _handleDisputeCreated(dispute, eventId) {
    const { payment_intent, amount, reason, status } = dispute;

    this.logger.warn("Dispute created!", {
      paymentIntentId: payment_intent,
      amount,
      reason,
      status,
    });

    const transaction = await this.paymentRepository.findByExternalId(
      payment_intent
    );

    if (transaction) {
      await this.paymentRepository.update(transaction.id, {
        status: "disputed",
        disputeReason: reason,
        gatewayResponse: dispute,
      });

      // Alerter l'équipe (en production, envoyer un email/Slack)
      this.eventEmitter.emit("payment.disputed", {
        transactionId: transaction.id,
        bookingId: transaction.bookingId,
        amount,
        reason,
      });
    }

    await this._markEventAsProcessed(eventId, "charge.dispute.created");

    return { success: true, disputed: true };
  }

  /**
   * Vérifie si un événement a déjà été traité (idempotence)
   * @private
   */
  async _isEventAlreadyProcessed(eventId) {
    // En production, vérifier dans une table webhook_events
    const existingEvent = await this.paymentRepository.findWebhookEvent(
      eventId
    );
    return !!existingEvent;
  }

  /**
   * Marque un événement comme traité
   * @private
   */
  async _markEventAsProcessed(eventId, eventType) {
    await this.paymentRepository.saveWebhookEvent({
      eventId,
      eventType,
      processedAt: new Date(),
    });
  }
}

export default WebhookService;
```

---

## 3. Idempotence des Webhooks

Les webhooks peuvent être délivrés plusieurs fois en raison de problèmes réseau ou de retry par la passerelle de paiement. Il est crucial que votre handler traite chaque événement **exactement une fois**.

### 3.1 Stratégies d'Idempotence

```javascript
// payment-gateway-service/src/models/WebhookEvent.js

import { DataTypes } from "sequelize";

/**
 * Modèle pour tracker les événements webhook traités
 * Garantit l'idempotence
 */
export default (sequelize) => {
  const WebhookEvent = sequelize.define(
    "WebhookEvent",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      eventId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true, // Index unique pour éviter les doublons
        comment: "ID unique de l'événement Stripe (evt_xxx)",
      },
      eventType: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Type d'événement (payment_intent.succeeded, etc.)",
      },
      payload: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: "Payload complet de l'événement pour audit",
      },
      status: {
        type: DataTypes.ENUM("processed", "failed", "skipped"),
        defaultValue: "processed",
      },
      processedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      errorMessage: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "webhook_events",
      indexes: [
        { fields: ["eventId"], unique: true },
        { fields: ["eventType"] },
        { fields: ["processedAt"] },
        { fields: ["status"] },
      ],
    }
  );

  return WebhookEvent;
};
```

### 3.2 Vérification d'Idempotence

```javascript
// Dans WebhookService

async _isEventAlreadyProcessed(eventId) {
  try {
    const existingEvent = await this.WebhookEvent.findOne({
      where: { eventId }
    });

    if (existingEvent) {
      this.logger.debug('Duplicate event detected', {
        eventId,
        originalProcessedAt: existingEvent.processedAt
      });
      return true;
    }

    return false;
  } catch (error) {
    // En cas d'erreur de DB, on laisse passer pour ne pas bloquer
    // Le risque de double traitement est préférable au blocage
    this.logger.error('Error checking event idempotency', {
      eventId,
      error: error.message
    });
    return false;
  }
}

async _markEventAsProcessed(eventId, eventType, payload = null) {
  try {
    await this.WebhookEvent.create({
      eventId,
      eventType,
      payload,
      status: 'processed',
      processedAt: new Date()
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      // Doublon - pas grave, déjà traité
      this.logger.debug('Event already marked as processed', { eventId });
    } else {
      throw error;
    }
  }
}
```

### 3.3 Idempotence Basée sur l'État

Au-delà du tracking des événements, concevez vos transitions d'état pour être idempotentes :

```javascript
// Si on reçoit payment_intent.succeeded pour une réservation déjà confirmée
async _handlePaymentIntentSucceeded(paymentIntent, eventId) {
  const transaction = await this.paymentRepository.findByExternalId(paymentIntent.id);

  // Vérification basée sur l'état
  if (transaction && transaction.status === 'succeeded') {
    this.logger.info('Transaction already succeeded, acknowledging webhook', {
      transactionId: transaction.id
    });
    // Acquitter sans retraiter
    await this._markEventAsProcessed(eventId, 'payment_intent.succeeded');
    return { success: true, skipped: true, reason: 'already_succeeded' };
  }

  // Traitement normal...
}
```

---

## 4. Sécurité des Webhooks

Puisque les webhooks sont des endpoints exposés publiquement, leur sécurisation est primordiale.

### 4.1 Vérification de Signature

```javascript
// Configuration Express pour le webhook
// IMPORTANT: Le body doit rester RAW pour la vérification

// Dans app.js ou server.js
app.use(
  "/api/v1/payment-gateway/webhooks/stripe",
  express.raw({ type: "application/json" })
);

// Pour les autres routes, utiliser json()
app.use("/api/v1/payment-gateway", express.json());
```

```javascript
// Vérification de signature
const verifyStripeSignature = (payload, signature, secret) => {
  try {
    return stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (error) {
    throw new Error(`Signature verification failed: ${error.message}`);
  }
};
```

### 4.2 Bonnes Pratiques de Sécurité

| Pratique          | Description                         | Implémentation                     |
| ----------------- | ----------------------------------- | ---------------------------------- |
| **HTTPS**         | Toujours servir le webhook en HTTPS | Config serveur/reverse proxy       |
| **Signature**     | Toujours vérifier la signature      | `stripe.webhooks.constructEvent()` |
| **IP Whitelist**  | Accepter uniquement les IPs Stripe  | Firewall/middleware                |
| **Rate Limiting** | Limiter les requêtes                | `express-rate-limit`               |
| **Timeout court** | Répondre rapidement (< 5s)          | Traitement async                   |

### 4.3 Middleware de Sécurité

```javascript
// payment-gateway-service/src/middleware/webhookSecurity.js

import rateLimit from "express-rate-limit";

// Rate limiting pour les webhooks
export const webhookRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requêtes par minute max
  message: { error: "Too many webhook requests" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Vérification optionnelle des IPs Stripe
// Liste des IPs: https://stripe.com/docs/ips
const STRIPE_WEBHOOK_IPS = [
  "3.18.12.63",
  "3.130.192.231",
  "13.235.14.237",
  "13.235.122.149",
  "18.211.135.69",
  "35.154.171.200",
  "52.15.183.38",
  "54.88.130.119",
  "54.88.130.237",
  "54.187.174.169",
  "54.187.205.235",
  "54.187.216.72",
];

export const stripeIPWhitelist = (req, res, next) => {
  // En production uniquement
  if (process.env.NODE_ENV !== "production") {
    return next();
  }

  const clientIP = req.ip || req.connection.remoteAddress;

  // Tenir compte des proxies
  const forwardedFor = req.headers["x-forwarded-for"];
  const realIP = forwardedFor ? forwardedFor.split(",")[0].trim() : clientIP;

  if (!STRIPE_WEBHOOK_IPS.includes(realIP)) {
    console.warn("Webhook request from unauthorized IP:", realIP);
    // En prod, vous pourriez vouloir bloquer
    // return res.status(403).json({ error: 'Forbidden' });
  }

  next();
};
```

---

## 5. Conception pour Callbacks ET Webhooks

Pour une intégration de paiement robuste, utilisez les deux approches de manière complémentaire.

### 5.1 Architecture Recommandée

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FLUX ROBUSTE : CALLBACKS + WEBHOOKS                       │
└─────────────────────────────────────────────────────────────────────────────┘

                    UTILISATEUR
                         │
                         ▼
    ┌────────────────────────────────────────┐
    │           FRONTEND (React)             │
    │                                        │
    │  1. Initie paiement                    │
    │  4. Redirigé vers success_url          │
    │  5. Affiche "Vérification..."          │
    │  6. Poll le statut                     │
    │  7. Affiche confirmation               │
    └────────────────────────────────────────┘
                    │           ▲
                    │           │ (polling)
                    ▼           │
    ┌────────────────────────────────────────┐
    │        PAYMENT GATEWAY SERVICE         │
    │                                        │
    │  2. Crée PaymentIntent/Session         │
    │  8. Retourne statut de la réservation  │
    └────────────────────────────────────────┘
                    │           ▲
                    │           │ (webhook)
                    ▼           │
    ┌────────────────────────────────────────┐
    │              STRIPE                    │
    │                                        │
    │  3. Traite le paiement                 │
    │  3a. Envoie webhook                    │
    └────────────────────────────────────────┘
```

### 5.2 Endpoint de Polling

```javascript
// payment-gateway-service/src/controllers/payment.controller.js

/**
 * Endpoint pour vérifier le statut d'un paiement
 * Appelé par le frontend après redirection
 *
 * @route GET /api/v1/payment-gateway/payments/:bookingId/status
 */
export const getPaymentStatus = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { paymentRepository } = getContainer();

    const transaction = await paymentRepository.findByBookingId(bookingId);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Transaction non trouvée" },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        bookingId,
        status: transaction.status,
        amount: transaction.amount,
        currency: transaction.currency,
        paidAt:
          transaction.status === "succeeded" ? transaction.updatedAt : null,
      },
    });
  } catch (error) {
    next(error);
  }
};
```

### 5.3 Frontend avec Polling

```jsx
// frontend/src/hooks/usePaymentStatus.js

import { useState, useEffect, useCallback } from "react";
import axios from "axios";

/**
 * Hook pour poller le statut de paiement
 * Utilise un intervalle exponentiel pour réduire la charge serveur
 */
export const usePaymentStatus = (bookingId, options = {}) => {
  const {
    initialInterval = 1000, // 1 seconde
    maxInterval = 10000, // 10 secondes
    maxAttempts = 30, // 30 tentatives max
    onSuccess,
    onFailure,
  } = options;

  const [status, setStatus] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attempts, setAttempts] = useState(0);

  const checkStatus = useCallback(async () => {
    try {
      const response = await axios.get(
        `${
          import.meta.env.VITE_API_URL
        }/api/v1/payment-gateway/payments/${bookingId}/status`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const { status: paymentStatus } = response.data.data;
      setStatus(paymentStatus);

      if (paymentStatus === "succeeded") {
        setLoading(false);
        onSuccess?.(response.data.data);
        return true; // Arrêter le polling
      }

      if (paymentStatus === "failed") {
        setLoading(false);
        onFailure?.(response.data.data);
        return true; // Arrêter le polling
      }

      return false; // Continuer le polling
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, [bookingId, onSuccess, onFailure]);

  useEffect(() => {
    if (!bookingId) return;

    let timeoutId;
    let currentInterval = initialInterval;

    const poll = async () => {
      setAttempts((prev) => prev + 1);

      const shouldStop = await checkStatus();

      if (shouldStop || attempts >= maxAttempts) {
        setLoading(false);
        return;
      }

      // Augmenter l'intervalle progressivement
      currentInterval = Math.min(currentInterval * 1.5, maxInterval);
      timeoutId = setTimeout(poll, currentInterval);
    };

    poll();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [
    bookingId,
    checkStatus,
    initialInterval,
    maxInterval,
    maxAttempts,
    attempts,
  ]);

  return { status, loading, error, attempts };
};
```

```jsx
// frontend/src/pages/PaymentSuccess.jsx - Version améliorée

import React from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { usePaymentStatus } from "../hooks/usePaymentStatus";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const bookingId = searchParams.get("booking_id");

  const { status, loading, error, attempts } = usePaymentStatus(bookingId, {
    onSuccess: (data) => {
      console.log("Payment confirmed via polling:", data);
    },
    onFailure: (data) => {
      console.log("Payment failed:", data);
    },
  });

  if (loading) {
    return (
      <div className="max-w-lg mx-auto p-6 text-center">
        <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-lg">Confirmation du paiement en cours...</p>
        <p className="text-sm text-gray-500 mt-2">
          {attempts > 5 && "Cela prend un peu plus de temps que prévu..."}
        </p>
      </div>
    );
  }

  if (status === "succeeded") {
    return (
      <div className="max-w-lg mx-auto p-6 text-center">
        <div className="text-green-500 text-6xl mb-4">✓</div>
        <h1 className="text-2xl font-bold text-green-600 mb-4">
          Paiement Confirmé !
        </h1>
        <p className="mb-6">Votre réservation #{bookingId} est confirmée.</p>
        <button
          onClick={() => navigate(`/bookings/${bookingId}`)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
        >
          Voir ma réservation
        </button>
      </div>
    );
  }

  if (status === "failed" || error) {
    return (
      <div className="max-w-lg mx-auto p-6 text-center">
        <div className="text-red-500 text-6xl mb-4">✗</div>
        <h1 className="text-2xl font-bold text-red-600 mb-4">
          Paiement Échoué
        </h1>
        <p className="mb-6">
          {error || "Une erreur est survenue lors du paiement."}
        </p>
        <button
          onClick={() => navigate(`/bookings/${bookingId}/payment`)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg"
        >
          Réessayer le paiement
        </button>
      </div>
    );
  }

  // Status pending après max attempts
  return (
    <div className="max-w-lg mx-auto p-6 text-center">
      <div className="text-yellow-500 text-6xl mb-4">⏳</div>
      <h1 className="text-2xl font-bold text-yellow-600 mb-4">
        Paiement en Traitement
      </h1>
      <p className="mb-6">
        Votre paiement est en cours de traitement. Vous recevrez un email de
        confirmation sous peu.
      </p>
    </div>
  );
};

export default PaymentSuccess;
```

---

## 6. Communication Inter-Services

Le Service de Passerelle de Paiement doit communiquer avec le Service de Réservation pour mettre à jour le statut des réservations.

### 6.1 Client HTTP pour le Service de Réservation

```javascript
// payment-gateway-service/src/clients/BookingClient.js

import axios from "axios";

/**
 * Client pour communiquer avec le Booking Management Service
 * En production, utiliser un circuit breaker (resilience4j pattern)
 */
class BookingClient {
  constructor({ logger }) {
    this.logger = logger;
    this.baseUrl = process.env.BOOKING_SERVICE_URL || "http://localhost:3002";
    this.timeout = 5000; // 5 secondes

    // Token interne pour communication inter-services
    this.serviceToken = process.env.INTERNAL_SERVICE_TOKEN;
  }

  /**
   * Met à jour le statut d'une réservation
   */
  async updateBookingStatus(bookingId, updateData) {
    const url = `${this.baseUrl}/api/v1/bookings/${bookingId}/payment-status`;

    try {
      this.logger.info("Updating booking status", {
        bookingId,
        status: updateData.status,
      });

      const response = await axios.put(url, updateData, {
        timeout: this.timeout,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.serviceToken}`,
          "X-Service-Name": "payment-gateway-service",
          "X-Request-Id": this._generateRequestId(),
        },
      });

      this.logger.info("Booking status updated successfully", { bookingId });
      return response.data;
    } catch (error) {
      this.logger.error("Failed to update booking status", {
        bookingId,
        error: error.message,
        status: error.response?.status,
      });

      // Gérer les erreurs spécifiques
      if (error.code === "ECONNREFUSED") {
        throw new Error("Booking Service unavailable");
      }

      if (error.response?.status === 404) {
        throw new Error(`Booking ${bookingId} not found`);
      }

      throw error;
    }
  }

  /**
   * Récupère les détails d'une réservation
   */
  async getBooking(bookingId) {
    const url = `${this.baseUrl}/api/v1/bookings/${bookingId}`;

    try {
      const response = await axios.get(url, {
        timeout: this.timeout,
        headers: {
          Authorization: `Bearer ${this.serviceToken}`,
          "X-Service-Name": "payment-gateway-service",
        },
      });

      return response.data.data;
    } catch (error) {
      this.logger.error("Failed to get booking", {
        bookingId,
        error: error.message,
      });
      throw error;
    }
  }

  _generateRequestId() {
    return `pg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default BookingClient;
```

### 6.2 Endpoint Côté Service de Réservation

```javascript
// booking-management-service/src/controllers/booking.controller.js

/**
 * Met à jour le statut de paiement d'une réservation
 * Appelé par le Payment Gateway Service via webhook
 *
 * @route PUT /api/v1/bookings/:id/payment-status
 * @access Internal (service-to-service)
 */
export const updatePaymentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, paymentIntentId, paidAt, refundedAt } = req.body;

    // Vérifier que l'appel vient d'un service interne
    const serviceName = req.headers["x-service-name"];
    if (serviceName !== "payment-gateway-service") {
      return res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Service not authorized" },
      });
    }

    const booking = await bookingRepository.findById(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Booking not found" },
      });
    }

    // Mettre à jour selon le statut
    const updateData = {};

    switch (status) {
      case "confirmed":
        updateData.status = "confirmed";
        updateData.paymentIntentId = paymentIntentId;
        updateData.paidAt = paidAt || new Date();
        break;
      case "cancelled":
      case "refunded":
        updateData.status = "cancelled";
        updateData.refundedAt = refundedAt || new Date();
        break;
      case "partially_refunded":
        updateData.status = "partially_refunded";
        break;
      default:
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_STATUS",
            message: `Invalid status: ${status}`,
          },
        });
    }

    const updatedBooking = await bookingRepository.update(id, updateData);

    res.status(200).json({
      success: true,
      data: updatedBooking,
    });
  } catch (error) {
    next(error);
  }
};
```

---

## Exercices Pratiques

### Exercice 1 : Webhook Handler Basique

Créez un endpoint webhook simple qui log les événements reçus. Simulez l'envoi d'un webhook avec curl ou Postman.

### Exercice 2 : Vérification de Signature Stripe

Intégrez la vérification de signature Stripe dans votre webhook handler. Testez avec `stripe listen --forward-to`.

### Exercice 3 : Simulation de Mise à Jour du Booking Service

Créez un mock du Booking Service et implémentez la communication depuis le Payment Gateway Service lors de la réception d'un webhook.

---

## Points Clés à Retenir

| Aspect          | Callback                   | Webhook               |
| --------------- | -------------------------- | --------------------- |
| **Initiation**  | Par le navigateur          | Par Stripe (serveur)  |
| **Fiabilité**   | ❌ Dépend de l'utilisateur | ✅ Fiable             |
| **Sécurité**    | ⚠️ Données manipulables    | ✅ Signature vérifiée |
| **Cas d'usage** | UX, redirection            | Confirmation, état    |
| **Idempotence** | Difficile                  | Essentielle           |

---

## Prochaine Étape

Nous avons établi le Service de Passerelle de Paiement comme point de contact unique pour les webhooks Stripe. La communication actuelle entre services utilise des appels HTTP directs.

Dans les prochaines leçons, nous aborderons :

- **[Leçon 4.4](lecon-4-auth-strategies.md)** : Stratégies d'authentification et d'autorisation des utilisateurs (JWT, OAuth2)
- **[Leçon 4.5](lecon-5-user-auth-microservice.md)** : Mise en œuvre du microservice d'authentification des utilisateurs
- **[Leçon 4.6](lecon-6-secure-communication.md)** : Communication sécurisée entre microservices (Passerelle API, HTTPS)

L'intégration avec des queues de messages pour une communication asynchrone et découplée sera couverte dans le **Module 5 : Architecture orientée événements et communication asynchrone**.

---

## Navigation

- **⬅️ Précédent** : [Leçon 4.2 - Implémentation du Traitement Sécurisé des Paiements avec Stripe API](lecon-2-stripe-integration.md)
- **➡️ Suivant** : [Leçon 4.4 - Stratégies d'authentification et d'autorisation des utilisateurs (JWT, OAuth2)](lecon-4-auth-strategies.md)
- **🏠 Retour** : [Sommaire du Module 4](README.md)
