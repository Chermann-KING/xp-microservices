/**
 * LoadingSpinner - UI Component
 */

function LoadingSpinner({ message = "Chargement..." }) {
  return (
    <div className="loading-spinner">
      <div className="loading-spinner__circle"></div>
      <p>{message}</p>

      <style>{`
        .loading-spinner {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
        }
        .loading-spinner__circle {
          width: 48px;
          height: 48px;
          border: 4px solid var(--border);
          border-top-color: var(--primary-color);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .loading-spinner p {
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
}

export default LoadingSpinner;
