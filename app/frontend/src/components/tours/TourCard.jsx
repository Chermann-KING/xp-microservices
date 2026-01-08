/**
 * TourCard - Module 3 - Composant Presentational
 * Module 5 - Ajout badge disponibilité temps réel
 *
 * Composant de présentation pure (stateless).
 * Reçoit les données via props, aucune logique métier.
 * Pattern: Presentational Component
 */

import { useCurrency } from "../../hooks/index.js";
import TourAvailabilityBadge from "./TourAvailabilityBadge.jsx";

function TourCard({ tour, onAddToCart, onViewDetails }) {
  const { format } = useCurrency();

  return (
    <article className="card tour-card">
      <div className="tour-card__image">
        <img
          src={tour.imageCover || "/placeholder-tour.jpg"}
          alt={tour.title}
          loading="lazy"
        />
        {tour.difficulty && (
          <span className={`tour-card__badge badge--${tour.difficulty}`}>
            {tour.difficulty}
          </span>
        )}
      </div>

      <div className="tour-card__content">
        <h3 className="tour-card__title">{tour.title}</h3>

        {tour.destination && (
          <p className="tour-card__location">
            📍 {tour.destination.name || tour.destination}
          </p>
        )}

        <p className="tour-card__summary">
          {tour.summary || tour.description?.substring(0, 100)}...
        </p>

        {/* Badge disponibilité temps réel - Module 5 */}
        {tour.availableSeats !== undefined && tour.maxGroupSize && (
          <div className="tour-card__availability">
            <TourAvailabilityBadge
              tourId={tour.id}
              initialAvailableSeats={tour.availableSeats}
              maxGroupSize={tour.maxGroupSize}
            />
          </div>
        )}

        <div className="tour-card__meta">
          {tour.duration && (
            <span className="tour-card__duration">
              ⏱️ {tour.duration} {tour.durationUnit || "jours"}
            </span>
          )}
          {tour.ratingsAverage > 0 && (
            <span className="tour-card__rating">
              ⭐ {tour.ratingsAverage.toFixed(1)} ({tour.ratingsQuantity})
            </span>
          )}
        </div>

        <div className="tour-card__footer">
          <span className="tour-card__price">
            {format(tour.price)}
            <small>/pers.</small>
          </span>

          <div className="tour-card__actions">
            <button
              className="btn btn-outline"
              onClick={() => onViewDetails(tour.id)}
            >
              Détails
            </button>
            <button
              className="btn btn-primary"
              onClick={() => onAddToCart(tour)}
            >
              Réserver
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .tour-card {
          display: flex;
          flex-direction: column;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .tour-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .tour-card__image {
          position: relative;
          height: 200px;
          overflow: hidden;
        }
        .tour-card__image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .tour-card__badge {
          position: absolute;
          top: 12px;
          right: 12px;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }
        .badge--easy { background: #22c55e; color: white; }
        .badge--medium { background: #f59e0b; color: white; }
        .badge--difficult { background: #ef4444; color: white; }
        .tour-card__content {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        .tour-card__title {
          font-size: 1.125rem;
          margin-bottom: 0.5rem;
        }
        .tour-card__location {
          color: var(--text-secondary);
          font-size: 0.875rem;
          margin-bottom: 0.5rem;
        }
        .tour-card__summary {
          color: var(--text-secondary);
          font-size: 0.875rem;
          flex: 1;
          margin-bottom: 1rem;
        }
        .tour-card__meta {
          display: flex;
          gap: 1rem;
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin-bottom: 1rem;
        }
        .tour-card__footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 1rem;
          border-top: 1px solid var(--border);
        }
        .tour-card__price {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--primary-color);
        }
        .tour-card__price small {
          font-size: 0.75rem;
          font-weight: 400;
          color: var(--text-secondary);
        }
        .tour-card__actions {
          display: flex;
          gap: 0.5rem;
        }
      `}</style>
    </article>
  );
}

export default TourCard;
