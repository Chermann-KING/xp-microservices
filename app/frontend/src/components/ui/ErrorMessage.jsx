/**
 * ErrorMessage - UI Component
 */

function ErrorMessage({ message, onRetry }) {
  return (
    <div className="error-message">
      <span className="error-message__icon">⚠️</span>
      <h3>Une erreur est survenue</h3>
      <p>{message}</p>
      {onRetry && (
        <button className="btn btn-primary" onClick={onRetry}>
          Réessayer
        </button>
      )}

      <style>{`
        .error-message {
          text-align: center;
          padding: 3rem;
          background: var(--surface);
          border-radius: 0.5rem;
          border: 1px solid var(--error-color);
        }
        .error-message__icon {
          font-size: 3rem;
          display: block;
          margin-bottom: 1rem;
        }
        .error-message h3 {
          color: var(--error-color);
          margin-bottom: 0.5rem;
        }
        .error-message p {
          color: var(--text-secondary);
          margin-bottom: 1.5rem;
        }
      `}</style>
    </div>
  );
}

export default ErrorMessage;
