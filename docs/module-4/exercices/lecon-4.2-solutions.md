# Exercices - Leçon 4.2 Implémentation du Traitement Sécurisé des Paiements avec Stripe API

## Exercice 1 : Métadonnées Enrichies

### Énoncé

Modifiez la fonction `createPaymentIntent` pour inclure des métadonnées additionnelles : `userId`, `numberOfGuests`, et `tourDate`. Expliquez pourquoi ces informations sont utiles pour le suivi et l'analytics dans le Dashboard Stripe.

### Solution

#### Code Backend Modifié

```javascript
// payment-gateway-service/src/services/PaymentService.js

class PaymentService {
  async createPaymentIntent({
    amount,
    currency,
    bookingId,
    tourDetails,
    customerEmail,
    userId, // Nouveau
    numberOfGuests, // Nouveau
    tourDate, // Nouveau
    idempotencyKey,
    gatewayType,
  }) {
    this.logger.info("PaymentService.createPaymentIntent", {
      bookingId,
      userId,
      numberOfGuests,
    });

    // Validation enrichie
    if (!userId) {
      throw new Error("userId est requis pour la traçabilité");
    }

    const transaction = await this.paymentRepository.create({
      bookingId,
      userId,
      idempotencyKey,
      amount,
      currency,
      customerEmail,
      numberOfGuests,
      tourDate,
      status: "pending",
      paymentGateway: gatewayType || "stripe",
    });

    const gateway = GatewayFactory.create(gatewayType || "stripe");

    const intentResult = await gateway.charge({
      amount,
      currency,
      idempotencyKey,
      metadata: {
        // Métadonnées existantes
        bookingId,
        transactionId: transaction.id,
        tourName: tourDetails?.name,

        // Nouvelles métadonnées enrichies
        userId: userId,
        numberOfGuests: numberOfGuests.toString(), // Stripe attend des strings
        tourDate: tourDate, // Format ISO: "2026-02-15"
        customerEmail: customerEmail,

        // Métadonnées analytiques
        bookingSource: "web", // ou 'mobile', 'api'
        tourCategory: tourDetails?.category || "general",
        tourLocation: tourDetails?.location || "unknown",

        // Métadonnées business
        pricePerPerson: (amount / numberOfGuests).toFixed(2),
        currency: currency.toUpperCase(),

        // Métadonnées techniques
        environment: process.env.NODE_ENV,
        serviceVersion: process.env.APP_VERSION || "1.0.0",
      },
    });

    await this.paymentRepository.update(transaction.id, {
      externalTransactionId: intentResult.id,
      clientSecret: intentResult.clientSecret,
    });

    return {
      clientSecret: intentResult.clientSecret,
      transactionId: transaction.id,
    };
  }
}
```

#### Mise à jour du StripeGateway

```javascript
// payment-gateway-service/src/gateways/StripeGateway.js

async charge({ amount, currency, token, idempotencyKey, metadata }) {
  try {
    const amountInCents = Math.round(amount * 100);

    const paymentIntentParams = {
      amount: amountInCents,
      currency: currency.toLowerCase(),
      metadata: {
        // Toutes les métadonnées sont passées à Stripe
        // Stripe limite à 50 clés, max 500 chars par valeur
        ...metadata,

        // Ajouter timestamp pour audit
        createdAt: new Date().toISOString(),
      },
      automatic_payment_methods: {
        enabled: true,
      },
      // Description visible dans le Dashboard
      description: `Réservation ${metadata.tourName} - ${metadata.numberOfGuests} participant(s) - ${metadata.tourDate}`,
    };

    // ... reste du code
  }
}
```

#### Pourquoi ces métadonnées sont utiles ?

| Métadonnée       | Utilité Dashboard Stripe              | Utilité Analytics         |
| ---------------- | ------------------------------------- | ------------------------- |
| `userId`         | Identifier les clients récurrents     | Segmentation utilisateurs |
| `numberOfGuests` | Comprendre la taille des réservations | Revenus par tête          |
| `tourDate`       | Filtrer par période                   | Saisonnalité des ventes   |
| `tourCategory`   | Analyse par type de produit           | Performance catégories    |
| `pricePerPerson` | Pricing analysis                      | Optimisation tarifaire    |
| `bookingSource`  | Attribution canal                     | ROI marketing             |
| `environment`    | Debug                                 | Isoler prod/test          |

#### Exemple de recherche dans Stripe Dashboard

```
# Rechercher tous les paiements d'un utilisateur
metadata['userId']:'user-123'

# Paiements pour un tour spécifique
metadata['tourName']:'Safari Kenya'

# Réservations de plus de 4 personnes
metadata['numberOfGuests']:'5' OR metadata['numberOfGuests']:'6'
```

---

## Exercice 2 : Gestion Dynamique de la Devise

### Énoncé

Mettez à jour le backend et le frontend pour accepter une devise dynamique provenant des détails du tour.

### Solution

#### Backend - Controller avec devise dynamique

```javascript
// payment-gateway-service/src/controllers/payment.controller.js

export const createPaymentIntent = async (req, res, next) => {
  try {
    const { paymentService, logger, bookingClient } = getContainer();

    const { bookingId } = req.body;

    // Récupérer les détails de la réservation depuis le Booking Service
    const booking = await bookingClient.getBooking(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        error: {
          code: "BOOKING_NOT_FOUND",
          message: "Réservation non trouvée",
        },
      });
    }

    // Récupérer le tour pour obtenir la devise correcte
    const tour = await bookingClient.getTour(booking.tourId);
    if (!tour) {
      return res.status(404).json({
        success: false,
        error: { code: "TOUR_NOT_FOUND", message: "Tour non trouvé" },
      });
    }

    // Utiliser la devise du tour (définie par l'opérateur)
    const currency = tour.currency || "EUR";

    // Recalculer le montant côté serveur (SÉCURITÉ!)
    const calculatedAmount = tour.pricePerPerson * booking.numberOfGuests;

    // Validation de la devise
    const supportedCurrencies = ["EUR", "USD", "GBP", "CHF", "CAD"];
    if (!supportedCurrencies.includes(currency.toUpperCase())) {
      return res.status(400).json({
        success: false,
        error: {
          code: "UNSUPPORTED_CURRENCY",
          message: `Devise ${currency} non supportée. Devises acceptées: ${supportedCurrencies.join(
            ", "
          )}`,
        },
      });
    }

    logger.info("Creating PaymentIntent with dynamic currency", {
      bookingId,
      currency,
      amount: calculatedAmount,
    });

    const result = await paymentService.createPaymentIntent({
      amount: calculatedAmount,
      currency: currency.toLowerCase(),
      bookingId,
      tourDetails: {
        name: tour.name,
        category: tour.category,
        location: tour.location,
      },
      customerEmail: booking.customerEmail,
      userId: booking.userId,
      numberOfGuests: booking.numberOfGuests,
      tourDate: booking.tourDate,
      idempotencyKey: `intent-${bookingId}-v1`,
    });

    res.status(200).json({
      success: true,
      data: {
        clientSecret: result.clientSecret,
        transactionId: result.transactionId,
        amount: calculatedAmount,
        currency: currency.toUpperCase(),
        // Inclure le symbole pour l'affichage frontend
        currencySymbol: getCurrencySymbol(currency),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Helper pour les symboles de devise
function getCurrencySymbol(currency) {
  const symbols = {
    EUR: "€",
    USD: "$",
    GBP: "£",
    CHF: "CHF",
    CAD: "CA$",
  };
  return symbols[currency.toUpperCase()] || currency;
}
```

#### Frontend - CheckoutForm avec devise dynamique

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

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const CheckoutForm = ({ bookingId, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();

  const [clientSecret, setClientSecret] = useState("");
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Récupérer le client_secret ET les détails de paiement (montant, devise)
  useEffect(() => {
    const initializePayment = async () => {
      try {
        setLoading(true);

        // Le backend calcule tout depuis le bookingId
        const response = await axios.post(
          `${
            import.meta.env.VITE_API_URL
          }/api/v1/payment-gateway/payments/create-intent`,
          { bookingId },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        const {
          clientSecret,
          amount,
          currency,
          currencySymbol,
          transactionId,
        } = response.data.data;

        setClientSecret(clientSecret);
        setPaymentDetails({
          amount,
          currency,
          currencySymbol,
          transactionId,
        });
        setError(null);
      } catch (err) {
        console.error("Error initializing payment:", err);
        setError(
          err.response?.data?.error?.message ||
            "Impossible d'initialiser le paiement"
        );
      } finally {
        setLoading(false);
      }
    };

    if (bookingId) {
      initializePayment();
    }
  }, [bookingId]);

  // Formatage du montant avec la devise dynamique
  const formatAmount = () => {
    if (!paymentDetails) return "...";

    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: paymentDetails.currency,
    }).format(paymentDetails.amount);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements || !clientSecret) return;

    setLoading(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);

    const { error: stripeError, paymentIntent } =
      await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

    if (stripeError) {
      setError(stripeError.message);
      setLoading(false);
    } else if (paymentIntent.status === "succeeded") {
      setPaymentSuccess(true);
      setLoading(false);

      if (onSuccess) {
        onSuccess({
          paymentIntentId: paymentIntent.id,
          transactionId: paymentDetails.transactionId,
          amount: paymentDetails.amount,
          currency: paymentDetails.currency,
        });
      }
    }
  };

  if (loading && !paymentDetails) {
    return <div className="p-4 text-center">Chargement du paiement...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="payment-form">
      <h3 className="text-xl font-bold mb-4">Paiement</h3>

      {/* Affichage du montant avec devise dynamique */}
      <div className="order-summary mb-4 p-4 bg-gray-50 rounded">
        <p className="text-2xl font-bold text-center">{formatAmount()}</p>
        <p className="text-sm text-gray-500 text-center mt-1">
          Devise: {paymentDetails?.currency}
        </p>
      </div>

      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">
          Carte bancaire
        </label>
        <div className="p-3 border rounded shadow-sm bg-white">
          <CardElement />
        </div>
      </div>

      {error && (
        <div className="text-red-600 text-sm mb-4 p-3 bg-red-50 rounded">
          ⚠️ {error}
        </div>
      )}

      {paymentSuccess && (
        <div className="text-green-600 text-sm mb-4 p-3 bg-green-50 rounded">
          ✅ Paiement de {formatAmount()} réussi !
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || loading || paymentSuccess || !clientSecret}
        className={`
          w-full py-3 px-4 rounded font-bold text-white
          ${
            loading || paymentSuccess
              ? "bg-gray-400"
              : "bg-blue-600 hover:bg-blue-700"
          }
        `}
      >
        {loading
          ? "Traitement..."
          : paymentSuccess
          ? "✓ Payé"
          : `Payer ${formatAmount()}`}
      </button>
    </form>
  );
};

// Wrapper avec Elements Provider
const PaymentSection = ({ bookingId, onSuccess }) => (
  <Elements stripe={stripePromise}>
    <CheckoutForm bookingId={bookingId} onSuccess={onSuccess} />
  </Elements>
);

export default PaymentSection;
```

---

## Exercice 3 : Validation Frontend

### Énoncé

Ajoutez une validation côté client au `CheckoutForm` avant de soumettre à Stripe.

### Solution

```jsx
// frontend/src/components/PaymentForm.jsx

import React, { useState, useEffect, useCallback } from "react";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

const CheckoutForm = ({
  bookingId,
  tourDetails,
  totalAmount,
  currency,
  onSuccess,
}) => {
  const stripe = useStripe();
  const elements = useElements();

  const [clientSecret, setClientSecret] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // États de validation
  const [cardComplete, setCardComplete] = useState(false);
  const [cardError, setCardError] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);

  /**
   * Validation complète avant soumission
   */
  const validatePayment = useCallback(() => {
    const errors = [];

    // 1. Validation du montant
    if (!totalAmount || totalAmount <= 0) {
      errors.push("Le montant doit être supérieur à 0");
    }

    if (totalAmount < 0.5) {
      errors.push("Le montant minimum est de 0,50 €");
    }

    if (totalAmount > 999999.99) {
      errors.push("Le montant dépasse la limite autorisée");
    }

    // 2. Validation de la devise
    const supportedCurrencies = ["EUR", "USD", "GBP", "CHF", "CAD"];
    if (!currency || !supportedCurrencies.includes(currency.toUpperCase())) {
      errors.push(
        `Devise non supportée. Acceptées: ${supportedCurrencies.join(", ")}`
      );
    }

    // 3. Validation du bookingId
    if (!bookingId || bookingId.trim() === "") {
      errors.push("Identifiant de réservation manquant");
    }

    // 4. Validation des détails du tour
    if (!tourDetails?.name) {
      errors.push("Détails du tour manquants");
    }

    // 5. Validation de la carte (via Stripe Elements)
    if (!cardComplete) {
      errors.push("Veuillez compléter les informations de carte");
    }

    if (cardError) {
      errors.push(cardError);
    }

    // 6. Validation de Stripe.js chargé
    if (!stripe || !elements) {
      errors.push("Le système de paiement n'est pas encore prêt");
    }

    // 7. Validation du client secret
    if (!clientSecret) {
      errors.push("Paiement non initialisé. Veuillez rafraîchir la page.");
    }

    setValidationErrors(errors);
    return errors.length === 0;
  }, [
    totalAmount,
    currency,
    bookingId,
    tourDetails,
    cardComplete,
    cardError,
    stripe,
    elements,
    clientSecret,
  ]);

  /**
   * Gestion des changements sur CardElement
   */
  const handleCardChange = (event) => {
    setCardComplete(event.complete);

    if (event.error) {
      setCardError(translateStripeError(event.error.code));
    } else {
      setCardError(null);
    }

    // Re-valider à chaque changement
    if (event.complete) {
      setError(null);
    }
  };

  /**
   * Traduire les erreurs Stripe en français
   */
  const translateStripeError = (code) => {
    const translations = {
      incomplete_number: "Numéro de carte incomplet",
      incomplete_expiry: "Date d'expiration incomplète",
      incomplete_cvc: "Code CVC incomplet",
      invalid_number: "Numéro de carte invalide",
      invalid_expiry_month: "Mois d'expiration invalide",
      invalid_expiry_year: "Année d'expiration invalide",
      invalid_cvc: "Code CVC invalide",
      expired_card: "Carte expirée",
    };
    return translations[code] || "Erreur de carte";
  };

  /**
   * Soumission avec validation préalable
   */
  const handleSubmit = async (event) => {
    event.preventDefault();

    // Validation complète
    if (!validatePayment()) {
      setError(validationErrors[0]); // Afficher la première erreur
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const cardElement = elements.getElement(CardElement);

      const { error: stripeError, paymentIntent } =
        await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: tourDetails?.customerName || "Client",
            },
          },
        });

      if (stripeError) {
        setError(translateStripeError(stripeError.code) || stripeError.message);
      } else if (paymentIntent.status === "succeeded") {
        setPaymentSuccess(true);
        onSuccess?.({
          paymentIntentId: paymentIntent.id,
          status: "succeeded",
        });
      } else if (paymentIntent.status === "requires_action") {
        setError(
          "Authentification 3D Secure requise. Veuillez suivre les instructions."
        );
      }
    } catch (err) {
      setError("Une erreur inattendue est survenue. Veuillez réessayer.");
      console.error("Payment error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Validation en temps réel
  useEffect(() => {
    if (cardComplete && totalAmount > 0) {
      validatePayment();
    }
  }, [cardComplete, totalAmount, validatePayment]);

  return (
    <form onSubmit={handleSubmit} className="payment-form">
      <h3 className="text-xl font-bold mb-4">Détails du Paiement</h3>

      {/* Affichage des erreurs de validation */}
      {validationErrors.length > 0 && !error && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm font-medium text-yellow-800 mb-1">
            Vérifications requises :
          </p>
          <ul className="text-sm text-yellow-700 list-disc pl-5">
            {validationErrors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Résumé avec validation visuelle */}
      <div className="order-summary mb-4 p-4 bg-gray-50 rounded">
        <div className="flex justify-between items-center">
          <span>Tour:</span>
          <span
            className={tourDetails?.name ? "text-green-600" : "text-red-600"}
          >
            {tourDetails?.name || "⚠️ Non défini"}
          </span>
        </div>
        <div className="flex justify-between items-center mt-2">
          <span>Montant:</span>
          <span
            className={
              totalAmount > 0 ? "text-green-600 font-bold" : "text-red-600"
            }
          >
            {totalAmount > 0
              ? `${totalAmount.toFixed(2)} ${currency}`
              : "⚠️ Invalid"}
          </span>
        </div>
      </div>

      {/* Champ de carte avec indicateur de validation */}
      <div className="mb-4">
        <label className="block text-gray-700 text-sm font-bold mb-2">
          Carte bancaire
          {cardComplete && <span className="ml-2 text-green-600">✓</span>}
        </label>
        <div
          className={`
          p-3 border rounded shadow-sm bg-white
          ${
            cardError
              ? "border-red-500"
              : cardComplete
              ? "border-green-500"
              : "border-gray-300"
          }
        `}
        >
          <CardElement onChange={handleCardChange} />
        </div>
        {cardError && <p className="text-red-600 text-xs mt-1">{cardError}</p>}
      </div>

      {/* Message d'erreur principal */}
      {error && (
        <div className="text-red-600 text-sm mb-4 p-3 bg-red-50 rounded">
          ⚠️ {error}
        </div>
      )}

      {/* Bouton avec états */}
      <button
        type="submit"
        disabled={
          !stripe ||
          loading ||
          paymentSuccess ||
          !clientSecret ||
          !cardComplete ||
          totalAmount <= 0
        }
        className={`
          w-full py-3 px-4 rounded font-bold text-white transition-all
          ${
            !cardComplete || totalAmount <= 0
              ? "bg-gray-300 cursor-not-allowed"
              : loading
              ? "bg-gray-400 cursor-wait"
              : paymentSuccess
              ? "bg-green-500"
              : "bg-blue-600 hover:bg-blue-700"
          }
        `}
      >
        {loading
          ? "Validation en cours..."
          : paymentSuccess
          ? "✓ Paiement confirmé"
          : !cardComplete
          ? "Complétez la carte"
          : `Payer ${totalAmount?.toFixed(2) || "0.00"} ${currency || "EUR"}`}
      </button>
    </form>
  );
};

export default CheckoutForm;
```

---

## Exercice 4 : Simulation de Scénarios de Paiement

### Énoncé

Utilisez les cartes de test Stripe pour simuler différents scénarios et documentez les comportements.

### Solution

#### Tests à effectuer

```javascript
// tests/integration/payment.scenarios.test.js

describe("Payment Scenarios", () => {
  describe("Successful Payment", () => {
    it("should complete payment with valid card", async () => {
      // Carte: 4242 4242 4242 4242
      const result = await processTestPayment({
        cardNumber: "4242424242424242",
        expMonth: 12,
        expYear: 2028,
        cvc: "123",
      });

      expect(result.status).toBe("succeeded");
      expect(result.paymentIntent.status).toBe("succeeded");
    });
  });

  describe("Declined Card", () => {
    it("should handle card declined error", async () => {
      // Carte: 4000 0000 0000 0002
      try {
        await processTestPayment({
          cardNumber: "4000000000000002",
          expMonth: 12,
          expYear: 2028,
          cvc: "123",
        });
        fail("Should have thrown error");
      } catch (error) {
        expect(error.code).toBe("card_declined");
        expect(error.userMessage).toContain("refusée");
      }
    });
  });

  describe("3D Secure Required", () => {
    it("should handle 3D Secure authentication", async () => {
      // Carte: 4000 0025 0000 3155
      const result = await processTestPayment({
        cardNumber: "4000002500003155",
        expMonth: 12,
        expYear: 2028,
        cvc: "123",
      });

      // Le statut initial est 'requires_action'
      expect(result.paymentIntent.status).toBe("requires_action");
      expect(result.paymentIntent.next_action.type).toBe("use_stripe_sdk");
    });
  });

  describe("Insufficient Funds", () => {
    it("should handle insufficient funds error", async () => {
      // Carte: 4000 0000 0000 9995
      try {
        await processTestPayment({
          cardNumber: "4000000000009995",
          expMonth: 12,
          expYear: 2028,
          cvc: "123",
        });
        fail("Should have thrown error");
      } catch (error) {
        expect(error.code).toBe("card_declined");
        expect(error.decline_code).toBe("insufficient_funds");
      }
    });
  });
});
```

#### Documentation des Comportements

| Carte                 | Comportement Backend              | Comportement Frontend                      |
| --------------------- | --------------------------------- | ------------------------------------------ |
| `4242 4242 4242 4242` | PaymentIntent status: `succeeded` | Message succès, redirection                |
| `4000 0000 0000 0002` | Exception `card_declined`         | Message "Carte refusée", bouton retry      |
| `4000 0025 0000 3155` | Status: `requires_action`         | Modal 3D Secure s'ouvre, puis succès/échec |
| `4000 0000 0000 9995` | Exception `insufficient_funds`    | Message "Fonds insuffisants"               |
| `4000 0000 0000 0077` | Status: `processing` puis webhook | Spinner, attente confirmation              |

#### Gestion Frontend des Scénarios

```jsx
// frontend/src/components/PaymentForm.jsx - handleSubmit amélioré

const handleSubmit = async (event) => {
  event.preventDefault();
  setLoading(true);
  setError(null);

  const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
    clientSecret,
    { payment_method: { card: elements.getElement(CardElement) } }
  );

  if (stripeError) {
    // Gérer les différents types d'erreurs
    switch (stripeError.code) {
      case "card_declined":
        if (stripeError.decline_code === "insufficient_funds") {
          setError("Fonds insuffisants sur votre carte.");
        } else {
          setError("Votre carte a été refusée. Essayez une autre carte.");
        }
        break;
      case "expired_card":
        setError("Votre carte a expiré.");
        break;
      case "incorrect_cvc":
        setError("Le code CVC est incorrect.");
        break;
      case "processing_error":
        setError("Erreur de traitement. Veuillez réessayer.");
        break;
      default:
        setError(stripeError.message);
    }
    setLoading(false);
    return;
  }

  // Gérer les différents statuts
  switch (paymentIntent.status) {
    case "succeeded":
      setPaymentSuccess(true);
      onSuccess?.({ paymentIntentId: paymentIntent.id, status: "succeeded" });
      break;

    case "processing":
      setError(
        "Votre paiement est en cours de traitement. Vous recevrez une confirmation par email."
      );
      // Ne pas bloquer l'UI, le webhook confirmera
      break;

    case "requires_action":
      // Stripe gère automatiquement le popup 3D Secure
      // Si on arrive ici, c'est que l'authentification a échoué
      setError("L'authentification 3D Secure a échoué. Veuillez réessayer.");
      break;

    case "requires_payment_method":
      setError(
        "Le paiement a échoué. Veuillez utiliser une autre méthode de paiement."
      );
      break;

    default:
      setError(`Statut inattendu: ${paymentIntent.status}`);
  }

  setLoading(false);
};
```

---

## Exercice 5 : Mise à Jour du Statut de Réservation

### Énoncé

Après un paiement réussi, implémentez un appel API pour mettre à jour le statut de la réservation à `'paid'`.

### Solution

#### Endpoint dans le Booking Service

```javascript
// booking-management-service/src/controllers/booking.controller.js

/**
 * @desc    Confirmer le paiement d'une réservation
 * @route   POST /api/v1/bookings/:id/confirm-payment
 * @access  Private
 */
export const confirmBookingPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { paymentIntentId, transactionId } = req.body;
    const userId = req.user.id;

    // Récupérer la réservation
    const booking = await bookingRepository.findById(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: {
          code: "BOOKING_NOT_FOUND",
          message: "Réservation non trouvée",
        },
      });
    }

    // Vérifier que l'utilisateur est propriétaire de la réservation
    if (booking.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: { code: "FORBIDDEN", message: "Accès non autorisé" },
      });
    }

    // Vérifier le statut actuel
    if (booking.status === "paid") {
      return res.status(200).json({
        success: true,
        data: booking,
        message: "Réservation déjà payée",
      });
    }

    if (booking.status === "cancelled") {
      return res.status(400).json({
        success: false,
        error: {
          code: "BOOKING_CANCELLED",
          message: "Impossible de payer une réservation annulée",
        },
      });
    }

    // Optionnel: Vérifier le paiement avec le Payment Gateway Service
    // const paymentVerification = await paymentGatewayClient.verifyPayment(paymentIntentId);
    // if (!paymentVerification.valid) { ... }

    // Mettre à jour le statut
    const updatedBooking = await bookingRepository.update(id, {
      status: "paid",
      paymentIntentId,
      transactionId,
      paidAt: new Date(),
    });

    // Émettre un événement (pour notifications, etc.)
    eventEmitter.emit("booking.paid", {
      bookingId: id,
      paymentIntentId,
      userId,
      amount: booking.totalAmount,
      currency: booking.currency,
    });

    res.status(200).json({
      success: true,
      data: updatedBooking,
      message: "Paiement confirmé avec succès",
    });
  } catch (error) {
    next(error);
  }
};
```

#### Route

```javascript
// booking-management-service/src/routes/booking.routes.js

import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { confirmBookingPayment } from "../controllers/booking.controller.js";

const router = express.Router();

router.post("/:id/confirm-payment", protect, confirmBookingPayment);

export default router;
```

#### Appel depuis le Frontend

```jsx
// frontend/src/components/PaymentForm.jsx

const handlePaymentSuccess = async (paymentIntent) => {
  setPaymentSuccess(true);

  try {
    // Mettre à jour le statut de la réservation
    const response = await axios.post(
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

    console.log("Booking status updated:", response.data);

    // Callback vers le parent
    if (onSuccess) {
      onSuccess({
        paymentIntentId: paymentIntent.id,
        transactionId: transactionId,
        booking: response.data.data,
      });
    }
  } catch (err) {
    // Non bloquant - le webhook Stripe mettra à jour le statut
    console.warn("Could not update booking status immediately:", err.message);
    console.log("The webhook will handle the status update");

    // Quand même notifier le succès du paiement
    if (onSuccess) {
      onSuccess({
        paymentIntentId: paymentIntent.id,
        transactionId: transactionId,
        webhookPending: true,
      });
    }
  }
};

// Dans handleSubmit:
if (paymentIntent.status === "succeeded") {
  await handlePaymentSuccess(paymentIntent);
  setLoading(false);
}
```

#### Diagramme de séquence

```
┌─────────┐     ┌─────────────┐     ┌─────────────────┐     ┌────────┐
│ Frontend│     │Payment Svc  │     │  Booking Svc    │     │ Stripe │
└────┬────┘     └──────┬──────┘     └────────┬────────┘     └───┬────┘
     │                 │                      │                  │
     │ confirmCardPayment()                   │                  │
     │────────────────────────────────────────│─────────────────►│
     │                 │                      │                  │
     │◄────────────────│──────────────────────│──────────────────│
     │  paymentIntent.succeeded               │                  │
     │                 │                      │                  │
     │ POST /bookings/:id/confirm-payment     │                  │
     │─────────────────│─────────────────────►│                  │
     │                 │                      │                  │
     │                 │                      │ update status    │
     │                 │                      │ to 'paid'        │
     │                 │                      │                  │
     │◄────────────────│──────────────────────│                  │
     │  { booking: { status: 'paid' } }       │                  │
     │                 │                      │                  │
     │                 │                      │  Webhook         │
     │                 │◄─────────────────────│──────────────────│
     │                 │ payment_intent.      │                  │
     │                 │ succeeded            │                  │
     │                 │                      │                  │
     │                 │ Confirm/Reconcile    │                  │
     │                 │─────────────────────►│                  │
     │                 │                      │                  │
```

---

## Points Clés à Retenir

| Exercice  | Concept Clé         | Bonnes Pratiques                                         |
| --------- | ------------------- | -------------------------------------------------------- |
| **Ex. 1** | Métadonnées Stripe  | Traçabilité, analytics, debugging                        |
| **Ex. 2** | Devise dynamique    | Calculer côté serveur, valider les devises supportées    |
| **Ex. 3** | Validation frontend | UX améliorée, mais ne remplace pas la validation backend |
| **Ex. 4** | Tests de scénarios  | Couvrir succès, échecs, et cas limites                   |
| **Ex. 5** | Mise à jour booking | Double confirmation (frontend + webhook)                 |
