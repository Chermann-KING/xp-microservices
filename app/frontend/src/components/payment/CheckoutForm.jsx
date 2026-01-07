/**
 * CheckoutForm - Formulaire de paiement Stripe Elements
 * Module 4 - Paiements sécurisés
 */

import { useState } from "react";
import {
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

export default function CheckoutForm({ amount, onSuccess, onError }) {
  const stripe = useStripe();
  const elements = useElements();

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const formatAmount = (cents) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(cents / 100);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js n'est pas encore chargé
      return;
    }

    setIsProcessing(true);
    setErrorMessage("");

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment/success`,
        },
        redirect: "if_required",
      });

      if (error) {
        // Erreur de paiement (carte refusée, etc.)
        setErrorMessage(error.message);
        onError?.(error);
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        // Paiement réussi
        onSuccess?.(paymentIntent);
      }
    } catch (err) {
      setErrorMessage("Une erreur inattendue s'est produite.");
      onError?.(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="checkout-form">
      <div className="checkout-header">
        <h3>Informations de paiement</h3>
        <p className="checkout-amount">
          Montant à payer : <strong>{formatAmount(amount)}</strong>
        </p>
      </div>

      {/* Stripe Payment Element - affiche automatiquement les champs de paiement */}
      <div className="payment-element-container">
        <PaymentElement
          options={{
            layout: "tabs",
          }}
        />
      </div>

      {/* Message d'erreur */}
      {errorMessage && (
        <div className="error-message">
          <svg className="error-icon" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          {errorMessage}
        </div>
      )}

      {/* Bouton de paiement */}
      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="btn btn-primary btn-pay"
      >
        {isProcessing ? (
          <span className="processing">
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
            Traitement en cours...
          </span>
        ) : (
          `Payer ${formatAmount(amount)}`
        )}
      </button>

      {/* Badges de sécurité */}
      <div className="security-badges">
        <span className="badge">
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
              clipRule="evenodd"
            />
          </svg>
          Paiement sécurisé SSL
        </span>
        <span className="badge">
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          Powered by Stripe
        </span>
      </div>

      <style>{`
        .checkout-form {
          max-width: 500px;
          margin: 0 auto;
        }
        
        .checkout-header {
          margin-bottom: 1.5rem;
          text-align: center;
        }
        
        .checkout-header h3 {
          margin-bottom: 0.5rem;
          font-size: 1.25rem;
          font-weight: 600;
        }
        
        .checkout-amount {
          color: var(--text-secondary);
        }
        
        .checkout-amount strong {
          color: var(--primary-color);
          font-size: 1.25rem;
        }
        
        .payment-element-container {
          padding: 1.5rem;
          background: #f9fafb;
          border-radius: 0.5rem;
          margin-bottom: 1.5rem;
        }
        
        .error-message {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 0.375rem;
          color: #dc2626;
          font-size: 0.875rem;
          margin-bottom: 1rem;
        }
        
        .error-icon {
          width: 1.25rem;
          height: 1.25rem;
          flex-shrink: 0;
        }
        
        .btn-pay {
          width: 100%;
          padding: 1rem 1.5rem;
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 1rem;
        }
        
        .btn-pay:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .processing {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }
        
        .spinner {
          width: 1.25rem;
          height: 1.25rem;
          animation: spin 1s linear infinite;
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
        
        .security-badges {
          display: flex;
          justify-content: center;
          gap: 1rem;
          flex-wrap: wrap;
        }
        
        .badge {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
          color: var(--text-secondary);
        }
        
        .badge svg {
          width: 1rem;
          height: 1rem;
          color: #059669;
        }
      `}</style>
    </form>
  );
}
