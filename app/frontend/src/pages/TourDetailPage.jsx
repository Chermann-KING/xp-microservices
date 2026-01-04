/**
 * TourDetailPage - Détail d'un tour
 */

import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useCart, useCurrency, useNotifications } from "../hooks/index.js";
import api from "../services/api.js";
import LoadingSpinner from "../components/ui/LoadingSpinner.jsx";
import ErrorMessage from "../components/ui/ErrorMessage.jsx";

function TourDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { format } = useCurrency();
  const { addToCart } = useCart();
  const { success } = useNotifications();

  const [tour, setTour] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [participants, setParticipants] = useState(1);

  useEffect(() => {
    const fetchTour = async () => {
      try {
        setIsLoading(true);
        const response = await api.get(`/tours/${id}`);
        setTour(response.data.data);
      } catch (err) {
        setError(err.response?.data?.error?.message || "Tour introuvable");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTour();
  }, [id]);

  const handleAddToCart = () => {
    addToCart(tour, participants);
    success(`"${tour.title}" ajouté au panier`);
  };

  if (isLoading) return <LoadingSpinner message="Chargement du tour..." />;
  if (error)
    return <ErrorMessage message={error} onRetry={() => navigate("/tours")} />;
  if (!tour) return null;

  return (
    <div className="tour-detail">
      <button className="btn btn-outline" onClick={() => navigate(-1)}>
        ← Retour
      </button>

      <div className="tour-detail__content">
        <div className="tour-detail__image">
          <img
            src={tour.imageCover || "/placeholder-tour.jpg"}
            alt={tour.title}
          />
        </div>

        <div className="tour-detail__info">
          <h1>{tour.title}</h1>

          {tour.destination && (
            <p className="tour-detail__location">
              📍 {tour.destination.name || tour.destination}
            </p>
          )}

          <div className="tour-detail__meta">
            {tour.duration && (
              <span>
                ⏱️ {tour.duration} {tour.durationUnit || "jours"}
              </span>
            )}
            {tour.difficulty && (
              <span className={`badge--${tour.difficulty}`}>
                {tour.difficulty}
              </span>
            )}
            {tour.ratingsAverage > 0 && (
              <span>
                ⭐ {tour.ratingsAverage} ({tour.ratingsQuantity} avis)
              </span>
            )}
          </div>

          <p className="tour-detail__description">{tour.description}</p>

          <div className="tour-detail__booking">
            <div className="tour-detail__price">
              <span className="price">{format(tour.price)}</span>
              <span className="per-person">/ personne</span>
            </div>

            <div className="tour-detail__participants">
              <label>Participants:</label>
              <div className="quantity-selector">
                <button
                  onClick={() => setParticipants((p) => Math.max(1, p - 1))}
                >
                  -
                </button>
                <span>{participants}</span>
                <button onClick={() => setParticipants((p) => p + 1)}>+</button>
              </div>
            </div>

            <div className="tour-detail__total">
              Total: <strong>{format(tour.price * participants)}</strong>
            </div>

            <button
              className="btn btn-primary btn-lg"
              onClick={handleAddToCart}
            >
              Ajouter au panier
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .tour-detail {
          max-width: 1000px;
          margin: 0 auto;
        }
        .tour-detail__content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          margin-top: 1.5rem;
        }
        @media (max-width: 768px) {
          .tour-detail__content {
            grid-template-columns: 1fr;
          }
        }
        .tour-detail__image img {
          width: 100%;
          border-radius: 0.5rem;
        }
        .tour-detail__info h1 {
          margin-bottom: 0.5rem;
        }
        .tour-detail__location {
          color: var(--text-secondary);
          margin-bottom: 1rem;
        }
        .tour-detail__meta {
          display: flex;
          gap: 1rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }
        .tour-detail__description {
          margin-bottom: 2rem;
          line-height: 1.8;
        }
        .tour-detail__booking {
          background: var(--surface);
          padding: 1.5rem;
          border-radius: 0.5rem;
          border: 1px solid var(--border);
        }
        .tour-detail__price {
          margin-bottom: 1rem;
        }
        .tour-detail__price .price {
          font-size: 2rem;
          font-weight: 700;
          color: var(--primary-color);
        }
        .tour-detail__price .per-person {
          color: var(--text-secondary);
        }
        .tour-detail__participants {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        .quantity-selector {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .quantity-selector button {
          width: 32px;
          height: 32px;
          border: 1px solid var(--border);
          background: white;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1.25rem;
        }
        .quantity-selector span {
          min-width: 40px;
          text-align: center;
          font-weight: 600;
        }
        .tour-detail__total {
          margin-bottom: 1rem;
          font-size: 1.125rem;
        }
        .btn-lg {
          width: 100%;
          padding: 1rem;
          font-size: 1.125rem;
        }
      `}</style>
    </div>
  );
}

export default TourDetailPage;
