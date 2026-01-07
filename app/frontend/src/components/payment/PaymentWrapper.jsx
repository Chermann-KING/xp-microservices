/**
 * PaymentWrapper - Wrapper pour Stripe Elements
 * Module 4 - Gère le chargement de Stripe et du PaymentIntent
 */

import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import CheckoutForm from "./CheckoutForm";
import { paymentService } from "../../services/paymentService";

// Charger Stripe une seule fois (singleton)
let stripePromise = null;

const getStripe = async () => {
  if (!stripePromise) {
    try {
      const config = await paymentService.getConfig();
      stripePromise = loadStripe(config.publishableKey);
    } catch (error) {
      console.error("Erreur chargement Stripe:", error);
      throw error;
    }
  }
  return stripePromise;
};

export default function PaymentWrapper({
  bookingId,
  amount,
  currency = "eur",
  onSuccess,
  onError,
  onCancel,
}) {
  const [stripe, setStripe] = useState(null);
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initializePayment = async () => {
      try {
        setLoading(true);
        setError(null);

        // Charger Stripe
        const stripeInstance = await getStripe();
        setStripe(stripeInstance);

        // Créer le PaymentIntent
        const { clientSecret: secret } =
          await paymentService.createPaymentIntent({
            bookingId,
            amount,
            currency,
          });
        setClientSecret(secret);
      } catch (err) {
        console.error("Erreur initialisation paiement:", err);
        setError(
          err.response?.data?.error ||
            err.message ||
            "Erreur lors de l'initialisation du paiement"
        );
        onError?.(err);
      } finally {
        setLoading(false);
      }
    };

    if (bookingId && amount) {
      initializePayment();
    }
  }, [bookingId, amount, currency, onError]);

  // État de chargement
  if (loading) {
    return (
      <div className="payment-loading">
        <div className="loading-spinner">
          <svg
            className="spinner"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="spinner-track"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="spinner-fill"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
        <p>Préparation du paiement...</p>

        <style>{`
          .payment-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 3rem;
            text-align: center;
          }
          .loading-spinner {
            margin-bottom: 1rem;
          }
          .spinner {
            width: 2.5rem;
            height: 2.5rem;
            animation: spin 1s linear infinite;
            color: var(--primary-color);
          }
          .spinner-track {
            opacity: 0.25;
          }
          .spinner-fill {
            opacity: 0.75;
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // État d'erreur
  if (error) {
    return (
      <div className="payment-error">
        <div className="error-icon">
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <h3>Erreur de paiement</h3>
        <p>{error}</p>
        <button onClick={onCancel} className="btn btn-secondary">
          Retour
        </button>

        <style>{`
          .payment-error {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 3rem;
            text-align: center;
          }
          .payment-error .error-icon {
            width: 3rem;
            height: 3rem;
            color: #dc2626;
            margin-bottom: 1rem;
          }
          .payment-error .error-icon svg {
            width: 100%;
            height: 100%;
          }
          .payment-error h3 {
            margin-bottom: 0.5rem;
            color: #dc2626;
          }
          .payment-error p {
            color: var(--text-secondary);
            margin-bottom: 1.5rem;
          }
        `}</style>
      </div>
    );
  }

  // Pas de clientSecret
  if (!clientSecret || !stripe) {
    return null;
  }

  // Options pour Stripe Elements
  const options = {
    clientSecret,
    appearance: {
      theme: "stripe",
      variables: {
        colorPrimary: "#0f766e",
        colorBackground: "#ffffff",
        colorText: "#1f2937",
        colorDanger: "#dc2626",
        fontFamily: "system-ui, sans-serif",
        spacingUnit: "4px",
        borderRadius: "6px",
      },
    },
    locale: "fr",
  };

  return (
    <div className="payment-wrapper">
      <Elements stripe={stripe} options={options}>
        <CheckoutForm amount={amount} onSuccess={onSuccess} onError={onError} />
      </Elements>

      {onCancel && (
        <div className="cancel-wrapper">
          <button onClick={onCancel} className="btn btn-link">
            Annuler le paiement
          </button>
        </div>
      )}

      <style>{`
        .payment-wrapper {
          max-width: 500px;
          margin: 0 auto;
          padding: 1.5rem;
        }
        .cancel-wrapper {
          text-align: center;
          margin-top: 1rem;
        }
        .btn-link {
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 0.875rem;
          padding: 0.5rem 1rem;
        }
        .btn-link:hover {
          color: var(--text-primary);
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
