/**
 * TourListContainer - Module 3 - Composant Container
 *
 * Gère la logique métier et l'état pour la liste des tours.
 * Pattern: Container Component
 *
 * Responsabilités:
 * - Fetch des données (via useTours hook)
 * - Gestion des filtres
 * - Actions (ajout au panier, navigation)
 * - Composition des composants presentational
 */

import { useNavigate } from "react-router-dom";
import { useTours, useCart, useNotifications } from "../../hooks/index.js";
import TourCard from "./TourCard.jsx";
import TourFilters from "./TourFilters.jsx";
import Pagination from "../ui/Pagination.jsx";
import LoadingSpinner from "../ui/LoadingSpinner.jsx";
import ErrorMessage from "../ui/ErrorMessage.jsx";

function TourListContainer() {
  const navigate = useNavigate();
  const {
    tours,
    isLoading,
    error,
    filters,
    pagination,
    setFilters,
    resetFilters,
    setPage,
    refetch,
  } = useTours();

  const { addToCart } = useCart();
  const { success } = useNotifications();

  // Handlers
  const handleAddToCart = (tour) => {
    addToCart(tour, 1);
    success(`"${tour.title}" ajouté au panier`);
  };

  const handleViewDetails = (tourId) => {
    navigate(`/tours/${tourId}`);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handlePageChange = (page) => {
    setPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Render states
  if (error) {
    return <ErrorMessage message={error} onRetry={refetch} />;
  }

  return (
    <div className="tour-list-container">
      <div className="tour-list-container__sidebar">
        <TourFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onReset={resetFilters}
        />
      </div>

      <div className="tour-list-container__main">
        <div className="tour-list-container__header">
          <h2>Nos Tours</h2>
          <p>
            {pagination.total} tour{pagination.total > 1 ? "s" : ""} disponible
            {pagination.total > 1 ? "s" : ""}
          </p>
        </div>

        {isLoading ? (
          <LoadingSpinner message="Chargement des tours..." />
        ) : tours.length === 0 ? (
          <div className="tour-list-container__empty">
            <p>Aucun tour ne correspond à vos critères.</p>
            <button className="btn btn-primary" onClick={resetFilters}>
              Voir tous les tours
            </button>
          </div>
        ) : (
          <>
            <div className="tour-list-container__grid">
              {tours.map((tour) => (
                <TourCard
                  key={tour.id}
                  tour={tour}
                  onAddToCart={handleAddToCart}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </div>

            {pagination.totalPages > 1 && (
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
              />
            )}
          </>
        )}
      </div>

      <style>{`
        .tour-list-container {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 2rem;
        }
        @media (max-width: 1024px) {
          .tour-list-container {
            grid-template-columns: 1fr;
          }
          .tour-list-container__sidebar {
            order: 1;
          }
        }
        .tour-list-container__header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 1.5rem;
        }
        .tour-list-container__header h2 {
          margin: 0;
        }
        .tour-list-container__header p {
          color: var(--text-secondary);
        }
        .tour-list-container__grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }
        .tour-list-container__empty {
          text-align: center;
          padding: 3rem;
          background: var(--surface);
          border-radius: 0.5rem;
        }
        .tour-list-container__empty p {
          margin-bottom: 1rem;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
}

export default TourListContainer;
