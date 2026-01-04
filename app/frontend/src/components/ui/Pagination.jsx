/**
 * Pagination - UI Component
 */

function Pagination({ currentPage, totalPages, onPageChange }) {
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  };

  return (
    <nav className="pagination">
      <button
        className="pagination__btn"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        ← Précédent
      </button>

      <div className="pagination__pages">
        {getPageNumbers().map((page) => (
          <button
            key={page}
            className={`pagination__page ${
              page === currentPage ? "active" : ""
            }`}
            onClick={() => onPageChange(page)}
          >
            {page}
          </button>
        ))}
      </div>

      <button
        className="pagination__btn"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        Suivant →
      </button>

      <style>{`
        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1rem;
          margin-top: 2rem;
          padding: 1rem;
        }
        .pagination__btn {
          padding: 0.5rem 1rem;
          border: 1px solid var(--border);
          background: white;
          border-radius: 0.375rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .pagination__btn:hover:not(:disabled) {
          background: var(--background);
        }
        .pagination__btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .pagination__pages {
          display: flex;
          gap: 0.25rem;
        }
        .pagination__page {
          width: 40px;
          height: 40px;
          border: 1px solid var(--border);
          background: white;
          border-radius: 0.375rem;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }
        .pagination__page:hover {
          background: var(--background);
        }
        .pagination__page.active {
          background: var(--primary-color);
          border-color: var(--primary-color);
          color: white;
        }
      `}</style>
    </nav>
  );
}

export default Pagination;
