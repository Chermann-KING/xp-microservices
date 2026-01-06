# Leçon 4.2 - Implémentation du Traitement Sécurisé des Paiements avec Stripe API

**Module 4** : Intégration et sécurité du traitement des paiements

---

## Objectifs pédagogiques

À la fin de cette leçon, vous serez capable de :

- ✅ Configurer un compte Stripe et comprendre la différence entre les clés API
- ✅ Créer des PaymentIntent côté serveur avec gestion des métadonnées
- ✅ Intégrer Stripe Elements dans une application React
- ✅ Implémenter un flux de paiement complet et sécurisé
- ✅ Appliquer les bonnes pratiques de sécurité et conformité PCI DSS

## Prérequis

- Avoir complété la [Leçon 4.1 - Conception du Microservice d'Intégration de la Passerelle de Paiement](lecon-1-payment-gateway-design.md)
- Comprendre l'architecture du Service de Passerelle de Paiement (Port 3003)
- Connaissances de base en React et Node.js/Express

## Durée estimée

2h30

---

## Introduction

L'intégration d'une passerelle de paiement sécurisée est critique pour gérer les transactions financières. Cette leçon se concentre sur l'implémentation du traitement sécurisé des paiements avec l'API Stripe, une plateforme robuste et populaire pour les paiements en ligne.

Nous couvrirons les étapes essentielles depuis la configuration du compte Stripe et l'obtention des clés API jusqu'à la création d'un PaymentIntent côté backend et la confirmation des paiements côté frontend, le tout dans le contexte de notre application microservices de tourisme.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FLUX DE PAIEMENT STRIPE                              │
└─────────────────────────────────────────────────────────────────────────────┘

  FRONTEND (React)                    BACKEND (Node.js)                 STRIPE
  ================                    ================                  ======

  1. User clicks "Pay"
         │
         ▼
  ┌─────────────────┐
  │ Request Payment │─────────────────────►┌─────────────────┐
  │     Intent      │                      │ Create Payment  │
  └─────────────────┘                      │     Intent      │
                                           └────────┬────────┘
                                                    │
                                                    ▼
                                           ┌─────────────────┐
                                           │  Stripe API     │────────►
                                           │  (Secret Key)   │
                                           └────────┬────────┘
                                                    │
                                                    │ client_secret
  ┌─────────────────┐◄──────────────────────────────┘
  │ Receive client  │
  │    secret       │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ Stripe Elements │  (Card Input - PCI Compliant)
  │   CardElement   │
  └────────┬────────┘
           │
           ▼
  ┌─────────────────┐
  │ confirmCard     │────────────────────────────────────────►┌──────────┐
  │   Payment()     │                                         │  STRIPE  │
  └────────┬────────┘◄────────────────────────────────────────│  SERVER  │
           │                    Payment Result                └──────────┘
           ▼
  ┌─────────────────┐
  │ Update UI       │
  │ (Success/Error) │
  └─────────────────┘
```

---

## 1. Configuration du Compte Stripe et Clés API

Avant d'intégrer Stripe, un compte développeur est nécessaire. Cela donne accès au **Stripe Dashboard**, où les clés API et autres configurations sont gérées. Stripe offre deux types de clés API : une **clé publiable** et une **clé secrète**.

### 1.1 Clé Publiable (Publishable Key)

```
pk_test_51abc...    (mode test)
pk_live_51abc...    (mode production)
```

La clé publiable est utilisée **côté client** (frontend) pour collecter les informations de paiement de manière sécurisée.

**Caractéristiques :**

- ✅ Sûre à exposer dans le code client
- ✅ Identifie votre compte auprès de Stripe
- ✅ Permet de créer des tokens de paiement
- ❌ Ne donne pas accès aux opérations sensibles

### 1.2 Clé Secrète (Secret Key)

```
sk_test_51abc...    (mode test)
sk_live_51abc...    (mode production)
```

La clé secrète est utilisée **côté serveur** (backend) pour effectuer des opérations privilégiées.

**Caractéristiques :**

- ✅ Créer des charges, gérer les clients, effectuer des remboursements
- ✅ Accès complet à l'API de votre compte
- ❌ **JAMAIS** exposer dans le code client
- ❌ Toujours stocker dans les variables d'environnement

### 1.3 Obtention des Clés

1. Connectez-vous à votre [Stripe Dashboard](https://dashboard.stripe.com)
2. Naviguez vers **"Developers"** > **"API keys"**
3. Vous verrez vos clés publiable et secrète

```bash
# .env du Payment Gateway Service
STRIPE_SECRET_KEY=sk_test_51abc...
STRIPE_PUBLISHABLE_KEY=pk_test_51abc...
STRIPE_WEBHOOK_SECRET=whsec_...
```

> ⚠️ **Important** : En mode test, les clés commencent par `pk_test_` et `sk_test_`. N'utilisez jamais les clés `live` en développement !

---

## 2. Création du PaymentIntent Côté Serveur

Le cœur du traitement sécurisé des paiements avec Stripe implique la création d'un **PaymentIntent** côté serveur. Un PaymentIntent suit le cycle de vie d'une tentative de paiement du client, de sa création à sa complétion.

### 2.1 Pourquoi Créer le PaymentIntent Côté Serveur ?

| Aspect                | Client-side     | Server-side ✅ |
| --------------------- | --------------- | -------------- |
| Contrôle du montant   | ❌ Manipulable  | ✅ Sécurisé    |
| Contrôle de la devise | ❌ Manipulable  | ✅ Sécurisé    |
| Validation métier     | ❌ Contournable | ✅ Garanti     |
| Idempotence           | ❌ Difficile    | ✅ Natif       |

### 2.2 Intégration avec Notre Architecture

Rappelons l'architecture définie dans la [Leçon 4.1](lecon-1-payment-gateway-design.md). Notre `PaymentService` utilise l'abstraction `PaymentGateway` :

```javascript
// payment-gateway-service/src/gateways/StripeGateway.js

import Stripe from "stripe";
import PaymentGateway from "./PaymentGateway.interface.js";

/**
 * Implémentation Stripe de la passerelle de paiement
 * Respecte l'interface PaymentGateway (DIP)
 */
class StripeGateway extends PaymentGateway {
  constructor() {
    super();
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16", // Toujours spécifier la version de l'API
    });
  }

  get name() {
    return "stripe";
  }

  /**
   * Crée un PaymentIntent pour une nouvelle charge
   *
   * @param {Object} params - Paramètres de la charge
   * @param {number} params.amount - Montant en unité monétaire (pas en centimes)
   * @param {string} params.currency - Code devise ISO 4217 (EUR, USD)
   * @param {string} params.token - Token de méthode de paiement (optionnel pour intent)
   * @param {string} params.idempotencyKey - Clé d'idempotence
   * @param {Object} params.metadata - Métadonnées additionnelles
   * @returns {Promise<Object>} Résultat de la charge
   */
  async charge({ amount, currency, token, idempotencyKey, metadata }) {
    try {
      // Convertir le montant en centimes (Stripe attend la plus petite unité)
      const amountInCents = Math.round(amount * 100);

      const paymentIntentParams = {
        amount: amountInCents,
        currency: currency.toLowerCase(),
        metadata: {
          bookingId: metadata.bookingId,
          transactionId: metadata.transactionId,
          tourName: metadata.tourName || "Tour",
          // Métadonnées additionnelles pour le dashboard Stripe
          source: "tourism-app",
          environment: process.env.NODE_ENV,
        },
        // Configuration automatique des méthodes de paiement
        automatic_payment_methods: {
          enabled: true,
        },
      };

      // Si un token de méthode de paiement est fourni, l'attacher
      if (token) {
        paymentIntentParams.payment_method = token;
        paymentIntentParams.confirm = true; // Confirmer immédiatement
      }

      const paymentIntent = await this.stripe.paymentIntents.create(
        paymentIntentParams,
        {
          idempotencyKey: idempotencyKey, // Prévention des doubles charges
        }
      );

      return {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        status: this._mapStatus(paymentIntent.status),
        cardLast4: paymentIntent.payment_method?.card?.last4 || null,
        cardBrand: paymentIntent.payment_method?.card?.brand || null,
        raw: paymentIntent,
      };
    } catch (error) {
      throw this._transformError(error);
    }
  }

  /**
   * Effectue un remboursement
   */
  async refund({ externalTransactionId, amount }) {
    try {
      const refundParams = {
        payment_intent: externalTransactionId,
      };

      // Remboursement partiel si montant spécifié
      if (amount) {
        refundParams.amount = Math.round(amount * 100);
      }

      const refund = await this.stripe.refunds.create(refundParams);

      return {
        id: refund.id,
        status: refund.status === "succeeded" ? "succeeded" : "pending",
        amount: refund.amount / 100,
        raw: refund,
      };
    } catch (error) {
      throw this._transformError(error);
    }
  }

  /**
   * Vérifie la signature d'un webhook Stripe
   */
  verifyWebhook(payload, signature) {
    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
      return event;
    } catch (error) {
      throw new Error(
        `Webhook signature verification failed: ${error.message}`
      );
    }
  }

  /**
   * Mappe les statuts Stripe vers nos statuts internes
   * @private
   */
  _mapStatus(stripeStatus) {
    const statusMap = {
      succeeded: "succeeded",
      processing: "pending",
      requires_payment_method: "pending",
      requires_confirmation: "pending",
      requires_action: "pending", // 3D Secure, etc.
      canceled: "failed",
      requires_capture: "pending",
    };
    return statusMap[stripeStatus] || "pending";
  }

  /**
   * Transforme les erreurs Stripe en erreurs génériques
   * @private
   */
  _transformError(stripeError) {
    const error = new Error(stripeError.message);
    error.type = "StripeError";
    error.code = stripeError.code;
    error.statusCode = stripeError.statusCode || 500;
    error.raw = stripeError;

    // Messages utilisateur pour les erreurs courantes
    const userMessages = {
      card_declined:
        "Votre carte a été refusée. Veuillez utiliser une autre carte.",
      insufficient_funds:
        "Fonds insuffisants. Veuillez utiliser une autre carte.",
      expired_card: "Votre carte a expiré. Veuillez utiliser une autre carte.",
      incorrect_cvc:
        "Le code CVC est incorrect. Veuillez vérifier et réessayer.",
      processing_error:
        "Une erreur est survenue lors du traitement. Veuillez réessayer.",
    };

    error.userMessage =
      userMessages[stripeError.code] ||
      "Une erreur est survenue lors du paiement. Veuillez réessayer.";

    return error;
  }
}

export default StripeGateway;
```

### 2.3 Controller pour Créer un PaymentIntent

```javascript
// payment-gateway-service/src/controllers/payment.controller.js

import { getContainer } from "../config/container.js";

/**
 * @desc    Crée un PaymentIntent pour une nouvelle réservation
 * @route   POST /api/v1/payment-gateway/payments/create-intent
 * @access  Private (nécessite authentification)
 */
export const createPaymentIntent = async (req, res, next) => {
  try {
    const { paymentService, logger } = getContainer();

    const {
      amount,
      currency,
      bookingId,
      tourDetails,
      customerEmail,
      idempotencyKey,
    } = req.body;

    // Validation des champs requis
    if (!amount || !currency || !bookingId) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "amount, currency et bookingId sont requis",
        },
      });
    }

    // Validation du montant (doit être positif)
    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_AMOUNT",
          message: "Le montant doit être supérieur à 0",
        },
      });
    }

    logger.info("Creating PaymentIntent", { bookingId, amount, currency });

    // Générer une clé d'idempotence si non fournie
    const finalIdempotencyKey =
      idempotencyKey || `intent-${bookingId}-${Date.now()}`;

    const result = await paymentService.createPaymentIntent({
      amount,
      currency,
      bookingId,
      tourDetails,
      customerEmail,
      idempotencyKey: finalIdempotencyKey,
    });

    res.status(200).json({
      success: true,
      data: {
        clientSecret: result.clientSecret,
        transactionId: result.transactionId,
      },
    });
  } catch (error) {
    next(error);
  }
};
```

### 2.4 PaymentService avec Création d'Intent

```javascript
// payment-gateway-service/src/services/PaymentService.js

import GatewayFactory from "../gateways/GatewayFactory.js";

class PaymentService {
  constructor({ paymentRepository, logger }) {
    this.paymentRepository = paymentRepository;
    this.logger = logger;
  }

  /**
   * Crée un PaymentIntent et enregistre la transaction en pending
   */
  async createPaymentIntent({
    amount,
    currency,
    bookingId,
    tourDetails,
    customerEmail,
    idempotencyKey,
    gatewayType,
  }) {
    this.logger.info("PaymentService.createPaymentIntent", { bookingId });

    // Vérifier si un intent existe déjà pour cette clé d'idempotence
    const existingTransaction =
      await this.paymentRepository.findByIdempotencyKey(idempotencyKey);
    if (existingTransaction && existingTransaction.clientSecret) {
      this.logger.info("Returning existing PaymentIntent", { bookingId });
      return {
        clientSecret: existingTransaction.clientSecret,
        transactionId: existingTransaction.id,
        cached: true,
      };
    }

    // Créer la transaction en base avec statut 'pending'
    const transaction = await this.paymentRepository.create({
      bookingId,
      idempotencyKey,
      amount,
      currency,
      customerEmail,
      status: "pending",
      paymentGateway: gatewayType || "stripe",
    });

    // Obtenir la passerelle appropriée
    const gateway = GatewayFactory.create(gatewayType || "stripe");

    // Créer le PaymentIntent via Stripe
    const intentResult = await gateway.charge({
      amount,
      currency,
      idempotencyKey,
      metadata: {
        bookingId,
        transactionId: transaction.id,
        tourName: tourDetails?.name,
      },
    });

    // Mettre à jour la transaction avec les infos Stripe
    await this.paymentRepository.update(transaction.id, {
      externalTransactionId: intentResult.id,
      clientSecret: intentResult.clientSecret,
    });

    return {
      clientSecret: intentResult.clientSecret,
      transactionId: transaction.id,
    };
  }

  // ... autres méthodes (processCharge, processRefund, etc.)
}

export default PaymentService;
```

---

## 3. Confirmation du Paiement Côté Client avec Stripe Elements

Côté client (notre frontend React), nous utilisons **Stripe.js** et **Stripe Elements** pour collecter les détails de paiement de manière sécurisée, sans jamais toucher aux informations sensibles de carte sur nos serveurs.

### 3.1 Installation des Dépendances

```bash
# Dans le répertoire frontend
npm install @stripe/stripe-js @stripe/react-stripe-js
```

### 3.2 Chargement de Stripe.js

```html
<!-- public/index.html - Optionnel si vous utilisez loadStripe -->
<script src="https://js.stripe.com/v3/"></script>
```

### 3.3 Composant PaymentForm Complet

```jsx
// frontend/src/components/PaymentForm.jsx

import React, { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  useStripe,
  useElements,
  CardElement,
} from "@stripe/react-stripe-js";
import axios from "axios";

// Charger Stripe en dehors du composant pour éviter les re-créations
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// Styles pour CardElement
const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: "16px",
      color: "#424770",
      fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
      fontSmoothing: "antialiased",
      "::placeholder": {
        color: "#aab7c4",
      },
    },
    invalid: {
      color: "#9e2146",
      iconColor: "#9e2146",
    },
  },
  hidePostalCode: true, // Masquer le code postal si non nécessaire
};

/**
 * Formulaire de paiement interne
 * Utilise les hooks Stripe pour accéder au contexte Elements
 */
const CheckoutForm = ({
  bookingId,
  tourDetails,
  totalAmount,
  currency = "EUR",
  onSuccess,
}) => {
  const stripe = useStripe();
  const elements = useElements();

  const [clientSecret, setClientSecret] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);

  // 1. Récupérer le client_secret du backend au montage
  useEffect(() => {
    const fetchClientSecret = async () => {
      try {
        setLoading(true);
        const response = await axios.post(
          `${
            import.meta.env.VITE_API_URL
          }/api/v1/payment-gateway/payments/create-intent`,
          {
            amount: totalAmount,
            currency: currency.toLowerCase(),
            bookingId: bookingId,
            tourDetails: tourDetails,
            // Clé d'idempotence basée sur le booking
            idempotencyKey: `intent-${bookingId}-v1`,
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        setClientSecret(response.data.data.clientSecret);
        setTransactionId(response.data.data.transactionId);
        setError(null);
      } catch (err) {
        console.error("Error fetching client secret:", err);
        setError("Impossible d'initialiser le paiement. Veuillez réessayer.");
      } finally {
        setLoading(false);
      }
    };

    if (bookingId && totalAmount > 0) {
      fetchClientSecret();
    }
  }, [bookingId, totalAmount, currency, tourDetails]);

  // Gérer les changements sur CardElement
  const handleCardChange = (event) => {
    setCardComplete(event.complete);
    if (event.error) {
      setError(event.error.message);
    } else {
      setError(null);
    }
  };

  // 2. Soumettre le paiement
  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    // Vérifications préalables
    if (!stripe || !elements) {
      setError("Stripe n'est pas encore chargé.");
      setLoading(false);
      return;
    }

    if (!clientSecret) {
      setError("Le paiement n'a pas été initialisé correctement.");
      setLoading(false);
      return;
    }

    const cardElement = elements.getElement(CardElement);

    // 3. Confirmer le paiement avec Stripe
    const { error: stripeError, paymentIntent } =
      await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            // Ces informations pourraient venir d'un formulaire utilisateur
            name: tourDetails?.customerName || "Client",
            email: tourDetails?.customerEmail,
          },
        },
      });

    if (stripeError) {
      // Erreur lors de la confirmation
      console.error("Payment error:", stripeError);
      setError(stripeError.message);
      setLoading(false);
    } else if (paymentIntent.status === "succeeded") {
      // 4. Paiement réussi !
      setPaymentSuccess(true);
      setLoading(false);

      console.log("Payment successful:", paymentIntent);

      // Notifier le parent du succès
      if (onSuccess) {
        onSuccess({
          paymentIntentId: paymentIntent.id,
          transactionId: transactionId,
          status: "succeeded",
        });
      }

      // Optionnel: Notifier le backend (le webhook le fera aussi)
      try {
        await axios.post(
          `${
            import.meta.env.VITE_API_URL
          }/api/v1/bookings/${bookingId}/confirm-payment`,
          {
            paymentIntentId: paymentIntent.id,
            transactionId: transactionId,
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
      } catch (confirmError) {
        // Non bloquant - le webhook s'en chargera
        console.warn("Could not confirm payment with backend:", confirmError);
      }
    } else if (paymentIntent.status === "requires_action") {
      // 3D Secure ou autre action requise
      setError("Une authentification supplémentaire est requise.");
      setLoading(false);
    } else {
      // Autre statut
      setError(`Statut de paiement inattendu: ${paymentIntent.status}`);
      setLoading(false);
    }
  };

  // Formatage du montant pour l'affichage
  const formatAmount = (amount, curr) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: curr.toUpperCase(),
    }).format(amount);
  };

  return (
    <form onSubmit={handleSubmit} className="payment-form">
      <h3 className="text-xl font-bold mb-4">Détails du Paiement</h3>

      {/* Résumé de la commande */}
      <div className="order-summary mb-4 p-4 bg-gray-50 rounded">
        <p className="text-sm text-gray-600">
          Réservation: <strong>{tourDetails?.name || "Tour"}</strong>
        </p>
        <p className="text-lg font-bold text-gray-800">
          Total: {formatAmount(totalAmount, currency)}
        </p>
      </div>

      {/* Champ de carte Stripe */}
      <div className="mb-4">
        <label
          className="block text-gray-700 text-sm font-bold mb-2"
          htmlFor="card-element"
        >
          Carte de crédit ou débit
        </label>
        <div className="p-3 border rounded shadow-sm bg-white focus-within:ring-2 focus-within:ring-blue-500">
          <CardElement
            id="card-element"
            options={CARD_ELEMENT_OPTIONS}
            onChange={handleCardChange}
          />
        </div>
      </div>

      {/* Messages d'erreur */}
      {error && (
        <div className="text-red-600 text-sm mb-4 p-3 bg-red-50 rounded">
          ⚠️ {error}
        </div>
      )}

      {/* Message de succès */}
      {paymentSuccess && (
        <div className="text-green-600 text-sm mb-4 p-3 bg-green-50 rounded">
          ✅ Paiement réussi ! Votre réservation est confirmée.
        </div>
      )}

      {/* Bouton de soumission */}
      <button
        type="submit"
        disabled={
          !stripe || loading || paymentSuccess || !clientSecret || !cardComplete
        }
        className={`
          w-full py-3 px-4 rounded font-bold text-white
          transition-colors duration-200
          ${
            loading || !stripe || paymentSuccess || !cardComplete
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }
        `}
      >
        {loading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Traitement en cours...
          </span>
        ) : paymentSuccess ? (
          "✓ Payé"
        ) : (
          `Payer ${formatAmount(totalAmount, currency)}`
        )}
      </button>

      {/* Note de sécurité */}
      <p className="text-xs text-gray-500 mt-4 text-center">
        🔒 Paiement sécurisé par Stripe. Vos données bancaires ne transitent
        jamais par nos serveurs.
      </p>
    </form>
  );
};

/**
 * Wrapper avec Elements Provider
 * Nécessaire pour que les hooks Stripe fonctionnent
 */
const PaymentSection = ({
  bookingId,
  tourDetails,
  totalAmount,
  currency = "EUR",
  onSuccess,
}) => {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm
        bookingId={bookingId}
        tourDetails={tourDetails}
        totalAmount={totalAmount}
        currency={currency}
        onSuccess={onSuccess}
      />
    </Elements>
  );
};

export default PaymentSection;
```

### 3.4 Utilisation dans une Page de Réservation

```jsx
// frontend/src/pages/BookingConfirmation.jsx

import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import PaymentSection from "../components/PaymentForm";
import { useBooking } from "../hooks/useBooking";

const BookingConfirmation = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { booking, loading, error } = useBooking(bookingId);

  const handlePaymentSuccess = (paymentDetails) => {
    console.log("Payment completed:", paymentDetails);
    // Rediriger vers la page de confirmation
    navigate(`/booking/${bookingId}/success`, {
      state: { paymentDetails },
    });
  };

  if (loading) return <div>Chargement...</div>;
  if (error) return <div>Erreur: {error}</div>;
  if (!booking) return <div>Réservation non trouvée</div>;

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Confirmer votre réservation</h1>

      {/* Détails de la réservation */}
      <div className="mb-8 p-4 border rounded">
        <h2 className="font-bold">{booking.tour.name}</h2>
        <p>Date: {new Date(booking.date).toLocaleDateString("fr-FR")}</p>
        <p>Participants: {booking.numberOfGuests}</p>
        <p className="text-xl font-bold mt-2">
          Total: {booking.totalAmount} {booking.currency}
        </p>
      </div>

      {/* Section paiement */}
      <PaymentSection
        bookingId={bookingId}
        tourDetails={{
          name: booking.tour.name,
          customerName: booking.customerName,
          customerEmail: booking.customerEmail,
        }}
        totalAmount={booking.totalAmount}
        currency={booking.currency}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
};

export default BookingConfirmation;
```

---

## 4. Résumé du Flux de Paiement

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FLUX COMPLET DE PAIEMENT                              │
└─────────────────────────────────────────────────────────────────────────────┘

1. L'utilisateur initie le paiement
   └─► React Frontend affiche le formulaire

2. Le Frontend demande un PaymentIntent
   └─► POST /api/v1/payment-gateway/payments/create-intent
       Body: { amount, currency, bookingId, tourDetails }

3. Le Payment Gateway Service crée le PaymentIntent
   └─► Utilise la clé secrète Stripe (sk_...)
   └─► Spécifie montant, devise, métadonnées
   └─► Enregistre la transaction en base (status: pending)

4. Le client_secret est retourné au Frontend
   └─► Clé unique liée au PaymentIntent
   └─► Sûre à exposer côté client

5. L'utilisateur entre ses informations de carte
   └─► Stripe Elements (CardElement)
   └─► Conforme PCI DSS
   └─► Données carte JAMAIS sur nos serveurs

6. Le Frontend confirme le paiement
   └─► stripe.confirmCardPayment(clientSecret, { payment_method: {...} })
   └─► Communication directe avec Stripe

7. Stripe traite le paiement
   └─► Validation, autorisation, capture
   └─► Gestion 3D Secure si nécessaire

8. Le résultat est retourné au Frontend
   └─► succeeded, failed, requires_action, etc.
   └─► Mise à jour de l'UI

9. (Optionnel) Le Frontend notifie le Backend
   └─► POST /api/v1/bookings/{id}/confirm-payment
   └─► Pour mise à jour immédiate

10. (Recommandé) Webhook Stripe notifie le Backend
    └─► POST /api/v1/payment-gateway/webhooks/stripe
    └─► Confirmation fiable et asynchrone
    └─► Voir Leçon 4.3
```

---

## 5. Gestion des Cas Limites et Sécurité

### 5.1 Vérification du Montant

**CRITIQUE** : Le montant doit toujours être calculé et contrôlé côté serveur !

```javascript
// ❌ MAUVAIS - Ne jamais faire confiance au montant client
app.post("/create-intent", async (req, res) => {
  const { amount } = req.body; // Un attaquant pourrait envoyer 0.01
  // ...
});

// ✅ BON - Recalculer le montant depuis les données de confiance
app.post("/create-intent", async (req, res) => {
  const { bookingId } = req.body;

  // Récupérer la réservation depuis la base de données
  const booking = await bookingRepository.findById(bookingId);
  if (!booking) {
    return res.status(404).json({ error: "Réservation non trouvée" });
  }

  // Recalculer le montant depuis le tour et les options
  const tour = await tourRepository.findById(booking.tourId);
  const calculatedAmount = tour.price * booking.numberOfGuests;

  // Créer le PaymentIntent avec le montant calculé
  const intent = await stripe.paymentIntents.create({
    amount: Math.round(calculatedAmount * 100),
    currency: tour.currency,
    // ...
  });
});
```

### 5.2 Idempotence

Utilisez une `idempotency_key` pour prévenir les opérations en double en cas de retry réseau :

```javascript
// Le bookingId est un excellent candidat pour l'idempotence
const paymentIntent = await stripe.paymentIntents.create(
  {
    amount: amount,
    currency: currency,
    // ...
  },
  {
    idempotencyKey: `booking-${bookingId}-intent-v1`,
  }
);
```

### 5.3 Conformité PCI DSS

L'utilisation de Stripe Elements garantit la conformité PCI DSS car :

- ✅ Les données de carte ne transitent jamais par vos serveurs
- ✅ Stripe gère la transmission et le stockage sécurisé
- ✅ Les iframes isolent les champs sensibles
- ✅ Tokenisation automatique

### 5.4 Stockage des Informations de Paiement

**Ne jamais stocker** les numéros de carte complets !

```javascript
// ✅ Ce qu'on peut stocker
const transactionData = {
  stripePaymentIntentId: "pi_1abc...", // ID Stripe
  cardLast4: "4242", // 4 derniers chiffres
  cardBrand: "visa", // Marque
  amount: 299.99,
  currency: "EUR",
  status: "succeeded",
};

// ❌ JAMAIS stocker
// - Numéro de carte complet
// - CVC/CVV
// - Date d'expiration complète
```

Pour les paiements récurrents, utilisez `setup_future_usage` ou `SetupIntent` :

```javascript
const paymentIntent = await stripe.paymentIntents.create({
  amount: amount,
  currency: currency,
  setup_future_usage: "off_session", // Sauvegarder pour paiements futurs
  customer: customerId, // ID client Stripe
});
```

---

## 6. Cartes de Test Stripe

Pour tester différents scénarios, utilisez ces numéros de carte de test :

| Scénario              | Numéro de Carte       | CVC                       | Date        |
| --------------------- | --------------------- | ------------------------- | ----------- |
| ✅ Paiement réussi    | `4242 4242 4242 4242` | N'importe quel 3 chiffres | Date future |
| ❌ Carte refusée      | `4000 0000 0000 0002` | N'importe quel 3 chiffres | Date future |
| 🔐 3D Secure requis   | `4000 0025 0000 3155` | N'importe quel 3 chiffres | Date future |
| ⚠️ Fonds insuffisants | `4000 0000 0000 9995` | N'importe quel 3 chiffres | Date future |
| ⏳ Traitement retardé | `4000 0000 0000 0077` | N'importe quel 3 chiffres | Date future |

---

## Exercices Pratiques

### Exercice 1 : Métadonnées Enrichies

Modifiez la fonction `createPaymentIntent` pour inclure des métadonnées additionnelles : `userId`, `numberOfGuests`, et `tourDate`. Expliquez pourquoi ces informations sont utiles pour le suivi et l'analytics dans le Dashboard Stripe.

### Exercice 2 : Gestion Dynamique de la Devise

Actuellement, l'exemple utilise une devise codée en dur. Mettez à jour le backend et le frontend pour accepter une devise dynamique provenant des détails du tour.

### Exercice 3 : Validation Frontend

Ajoutez une validation côté client au `CheckoutForm` avant de soumettre à Stripe : vérifiez que le `totalAmount` est supérieur à zéro et que les champs obligatoires sont remplis.

### Exercice 4 : Simulation de Scénarios de Paiement

Utilisez les cartes de test Stripe pour simuler :

- Un paiement réussi
- Un paiement refusé
- Un paiement nécessitant 3D Secure

Documentez le comportement de votre frontend et backend pour chaque scénario.

### Exercice 5 : Mise à Jour du Statut de Réservation

Après un paiement réussi, implémentez un appel API du frontend vers le Booking Management Service pour mettre à jour le statut de la réservation à `'paid'`.

---

## Points Clés à Retenir

| Aspect               | Recommandation                              |
| -------------------- | ------------------------------------------- |
| **Clé secrète**      | Toujours côté serveur, jamais exposée       |
| **Clé publiable**    | Côté client pour Stripe.js/Elements         |
| **Montant**          | Toujours calculé côté serveur               |
| **PaymentIntent**    | Créé côté serveur, confirmé côté client     |
| **Données de carte** | Jamais sur vos serveurs (Stripe Elements)   |
| **Idempotence**      | Utiliser des clés basées sur le bookingId   |
| **Confirmation**     | Client pour l'UX, Webhook pour la fiabilité |

---

## Prochaine Étape

Le flux actuel repose sur le client pour signaler le succès du paiement. Bien que cela fonctionne pour un feedback immédiat, ce n'est pas la méthode la plus robuste pour garantir la synchronisation de l'état interne avec le statut réel de Stripe.

La [Leçon 4.3 - Gestion des Callbacks et Webhooks de Paiement](lecon-3-payment-webhooks.md) abordera les webhooks Stripe, qui fournissent une méthode asynchrone fiable pour que Stripe communique les mises à jour de statut de paiement à votre backend, renforçant ainsi la sécurité et la fiabilité de votre système de traitement des paiements.

---

## Navigation

- **⬅️ Précédent** : [Leçon 4.1 - Conception du Microservice d'Intégration de la Passerelle de Paiement](lecon-1-payment-gateway-design.md)
- **➡️ Suivant** : [Leçon 4.3 - Gestion des Callbacks et Webhooks de Paiement](lecon-3-payment-webhooks.md)
- **🏠 Retour** : [Sommaire du Module 4](README.md)
