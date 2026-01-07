/**
 * CheckoutPage - Page de paiement
 * Module 4 - Paiements sécurisés
 */

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { PaymentWrapper } from "../components/payment";

export default function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Récupérer les infos de réservation depuis le state
  const bookingData = location.state?.booking;
  const [paymentStatus, setPaymentStatus] = useState("pending"); // pending, processing, success, error

  // Rediriger si non authentifié
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login", { state: { from: location } });
    }
  }, [authLoading, isAuthenticated, navigate, location]);

  // Rediriger si pas de données de réservation
  useEffect(() => {
    if (!bookingData) {
      navigate("/cart");
    }
  }, [bookingData, navigate]);

  const handlePaymentSuccess = (paymentIntent) => {
    setPaymentStatus("success");
    // Rediriger vers la page de confirmation après un délai
    setTimeout(() => {
      navigate("/payment/success", {
        state: {
          paymentIntentId: paymentIntent.id,
          booking: bookingData,
        },
      });
    }, 1500);
  };

  const handlePaymentError = (error) => {
    setPaymentStatus("error");
    console.error("Erreur de paiement:", error);
  };

  const handleCancel = () => {
    navigate("/cart");
  };

  // Chargement auth
  if (authLoading) {
    return (
      <div className="checkout-page loading">
        <p>Chargement...</p>
      </div>
    );
  }

  // Pas de données de réservation
  if (!bookingData) {
    return null;
  }

  return (
    <div className="checkout-page">
      <div className="checkout-container">
        {/* Header */}
        <div className="checkout-header">
          <h1>Finaliser votre réservation</h1>
          <p>Paiement sécurisé par Stripe</p>
        </div>

        <div className="checkout-content">
          {/* Récapitulatif de la réservation */}
          <div className="booking-summary card">
            <h2>Récapitulatif</h2>
            <div className="summary-item">
              <span className="label">Tour :</span>
              <span className="value">{bookingData.tourName}</span>
            </div>
            <div className="summary-item">
              <span className="label">Date :</span>
              <span className="value">
                {new Date(bookingData.date).toLocaleDateString("fr-FR", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
            <div className="summary-item">
              <span className="label">Participants :</span>
              <span className="value">{bookingData.participants}</span>
            </div>
            <div className="summary-total">
              <span className="label">Total :</span>
              <span className="value">
                {new Intl.NumberFormat("fr-FR", {
                  style: "currency",
                  currency: "EUR",
                }).format(bookingData.totalPrice)}
              </span>
            </div>
          </div>

          {/* État du paiement */}
          {paymentStatus === "success" && (
            <div className="payment-success card">
              <div className="success-icon">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <h3>Paiement réussi !</h3>
              <p>Redirection en cours...</p>
            </div>
          )}

          {/* Formulaire de paiement */}
          {paymentStatus !== "success" && (
            <div className="payment-section card">
              <PaymentWrapper
                bookingId={bookingData.id}
                amount={Math.round(bookingData.totalPrice * 100)} // Convertir en centimes
                currency="eur"
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                onCancel={handleCancel}
              />
            </div>
          )}
        </div>
      </div>

      <style>{`
        .checkout-page {
          padding: 2rem 1rem;
          min-height: 60vh;
        }
        
        .checkout-page.loading {
          display: flex;
          justify-content: center;
          align-items: center;
        }
        
        .checkout-container {
          max-width: 800px;
          margin: 0 auto;
        }
        
        .checkout-header {
          text-align: center;
          margin-bottom: 2rem;
        }
        
        .checkout-header h1 {
          margin-bottom: 0.5rem;
        }
        
        .checkout-header p {
          color: var(--text-secondary);
        }
        
        .checkout-content {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }
        
        @media (min-width: 768px) {
          .checkout-content {
            grid-template-columns: 1fr 1.5fr;
          }
        }
        
        .booking-summary {
          padding: 1.5rem;
        }
        
        .booking-summary h2 {
          font-size: 1.125rem;
          margin-bottom: 1rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .summary-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.75rem;
          font-size: 0.875rem;
        }
        
        .summary-item .label {
          color: var(--text-secondary);
        }
        
        .summary-item .value {
          font-weight: 500;
        }
        
        .summary-total {
          display: flex;
          justify-content: space-between;
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #e5e7eb;
          font-size: 1.125rem;
          font-weight: 600;
        }
        
        .summary-total .value {
          color: var(--primary-color);
        }
        
        .payment-section {
          padding: 1.5rem;
        }
        
        .payment-success {
          padding: 2rem;
          text-align: center;
          background: #f0fdf4;
          border: 1px solid #86efac;
        }
        
        .payment-success .success-icon {
          width: 3rem;
          height: 3rem;
          color: #22c55e;
          margin: 0 auto 1rem;
        }
        
        .payment-success .success-icon svg {
          width: 100%;
          height: 100%;
        }
        
        .payment-success h3 {
          color: #166534;
          margin-bottom: 0.5rem;
        }
        
        .payment-success p {
          color: #15803d;
        }
      `}</style>
    </div>
  );
}
