/**
 * PaymentSuccessPage - Page de confirmation de paiement
 * Module 4
 */

import { useLocation, useNavigate, Link } from "react-router-dom";
import { useEffect } from "react";

export default function PaymentSuccessPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const paymentData = location.state;

  // Rediriger si accès direct sans données
  useEffect(() => {
    if (!paymentData) {
      // Vérifier si c'est un retour de Stripe (avec payment_intent dans l'URL)
      const params = new URLSearchParams(window.location.search);
      if (!params.get("payment_intent")) {
        navigate("/");
      }
    }
  }, [paymentData, navigate]);

  return (
    <div className="success-page">
      <div className="success-container card">
        {/* Icône de succès */}
        <div className="success-icon">
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        </div>

        {/* Titre */}
        <h1>Paiement confirmé !</h1>
        <p className="success-message">
          Votre réservation a été confirmée avec succès.
        </p>

        {/* Détails de la réservation */}
        {paymentData?.booking && (
          <div className="booking-details">
            <h2>Détails de votre réservation</h2>
            <div className="detail-item">
              <span className="label">Tour :</span>
              <span className="value">{paymentData.booking.tourName}</span>
            </div>
            <div className="detail-item">
              <span className="label">Date :</span>
              <span className="value">
                {new Date(paymentData.booking.date).toLocaleDateString(
                  "fr-FR",
                  {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  }
                )}
              </span>
            </div>
            <div className="detail-item">
              <span className="label">Participants :</span>
              <span className="value">{paymentData.booking.participants}</span>
            </div>
            <div className="detail-item total">
              <span className="label">Montant payé :</span>
              <span className="value">
                {new Intl.NumberFormat("fr-FR", {
                  style: "currency",
                  currency: "EUR",
                }).format(paymentData.booking.totalPrice)}
              </span>
            </div>
          </div>
        )}

        {/* Email de confirmation */}
        <div className="email-notice">
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
          </svg>
          <p>
            Un email de confirmation a été envoyé à votre adresse email avec
            tous les détails de votre réservation.
          </p>
        </div>

        {/* Actions */}
        <div className="success-actions">
          <Link to="/tours" className="btn btn-primary">
            Découvrir d'autres tours
          </Link>
          <Link to="/" className="btn btn-secondary">
            Retour à l'accueil
          </Link>
        </div>
      </div>

      <style>{`
        .success-page {
          padding: 3rem 1rem;
          min-height: 60vh;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        
        .success-container {
          max-width: 500px;
          width: 100%;
          padding: 2.5rem;
          text-align: center;
        }
        
        .success-icon {
          width: 4rem;
          height: 4rem;
          color: #22c55e;
          margin: 0 auto 1.5rem;
        }
        
        .success-icon svg {
          width: 100%;
          height: 100%;
        }
        
        .success-container h1 {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
          color: #166534;
        }
        
        .success-message {
          color: var(--text-secondary);
          margin-bottom: 2rem;
        }
        
        .booking-details {
          text-align: left;
          padding: 1.5rem;
          background: #f9fafb;
          border-radius: 0.5rem;
          margin-bottom: 1.5rem;
        }
        
        .booking-details h2 {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 1rem;
        }
        
        .detail-item {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          font-size: 0.875rem;
        }
        
        .detail-item .label {
          color: var(--text-secondary);
        }
        
        .detail-item .value {
          font-weight: 500;
        }
        
        .detail-item.total {
          border-top: 1px solid #e5e7eb;
          margin-top: 0.5rem;
          padding-top: 1rem;
          font-weight: 600;
        }
        
        .detail-item.total .value {
          color: var(--primary-color);
        }
        
        .email-notice {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 1rem;
          background: #eff6ff;
          border-radius: 0.5rem;
          margin-bottom: 1.5rem;
          text-align: left;
        }
        
        .email-notice svg {
          width: 1.5rem;
          height: 1.5rem;
          color: #3b82f6;
          flex-shrink: 0;
          margin-top: 0.125rem;
        }
        
        .email-notice p {
          font-size: 0.875rem;
          color: #1e40af;
          margin: 0;
        }
        
        .success-actions {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        
        .success-actions .btn {
          width: 100%;
          padding: 0.75rem 1.5rem;
        }
      `}</style>
    </div>
  );
}
