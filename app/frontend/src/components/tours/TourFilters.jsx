/**
 * TourFilters - Module 3 - Composant Presentational
 *
 * Composant de filtres pour la liste des tours.
 * Pattern: Controlled Component (état géré par le parent)
 */

function TourFilters({ filters, onFilterChange, onReset }) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    onFilterChange({ [name]: value });
  };

  return (
    <aside className="tour-filters card">
      <div className="tour-filters__header">
        <h3>Filtres</h3>
        <button className="btn btn-outline" onClick={onReset}>
          Réinitialiser
        </button>
      </div>

      <div className="tour-filters__body">
        {/* Recherche */}
        <div className="filter-group">
          <label htmlFor="search">Rechercher</label>
          <input
            type="text"
            id="search"
            name="search"
            className="input"
            placeholder="Nom du tour..."
            value={filters.search}
            onChange={handleChange}
          />
        </div>

        {/* Destination */}
        <div className="filter-group">
          <label htmlFor="destination">Destination</label>
          <input
            type="text"
            id="destination"
            name="destination"
            className="input"
            placeholder="Pays, ville..."
            value={filters.destination}
            onChange={handleChange}
          />
        </div>

        {/* Prix */}
        <div className="filter-group">
          <label>Prix (€)</label>
          <div className="filter-group__row">
            <input
              type="number"
              name="minPrice"
              className="input"
              placeholder="Min"
              value={filters.minPrice}
              onChange={handleChange}
              min="0"
            />
            <span>-</span>
            <input
              type="number"
              name="maxPrice"
              className="input"
              placeholder="Max"
              value={filters.maxPrice}
              onChange={handleChange}
              min="0"
            />
          </div>
        </div>

        {/* Difficulté */}
        <div className="filter-group">
          <label htmlFor="difficulty">Difficulté</label>
          <select
            id="difficulty"
            name="difficulty"
            className="input"
            value={filters.difficulty}
            onChange={handleChange}
          >
            <option value="">Toutes</option>
            <option value="easy">Facile</option>
            <option value="medium">Moyen</option>
            <option value="difficult">Difficile</option>
          </select>
        </div>

        {/* Tri */}
        <div className="filter-group">
          <label htmlFor="sortBy">Trier par</label>
          <select
            id="sortBy"
            name="sortBy"
            className="input"
            value={filters.sortBy}
            onChange={handleChange}
          >
            <option value="createdAt">Plus récents</option>
            <option value="price">Prix</option>
            <option value="ratingsAverage">Note</option>
            <option value="title">Nom</option>
          </select>
        </div>
      </div>

      <style>{`
        .tour-filters {
          padding: 1.5rem;
        }
        .tour-filters__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--border);
        }
        .tour-filters__header h3 {
          margin: 0;
        }
        .tour-filters__body {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .filter-group label {
          font-weight: 500;
          font-size: 0.875rem;
        }
        .filter-group__row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .filter-group__row input {
          flex: 1;
        }
      `}</style>
    </aside>
  );
}

export default TourFilters;
