/**
 * Error Boundary - Gestion globale des erreurs
 * Module 6 - Leçon 6.4 : Circuit Breaker & Résilience
 */

import { Component } from "react";
import "./ErrorBoundary.css";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isCircuitOpen: false,
    };
  }

  static getDerivedStateFromError(error) {
    // Détecter si c'est une erreur de circuit breaker
    const isCircuitOpen =
      error.message?.includes("CIRCUIT_OPEN") ||
      error.message?.includes("Service") ||
      error.message?.includes("indisponible");

    return {
      hasError: true,
      isCircuitOpen,
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Logger l'erreur (vers Logstash si configuré)
    this.logErrorToService(error, errorInfo);
  }

  logErrorToService = (error, errorInfo) => {
    // Envoyer les erreurs vers Logstash (Module 6.5)
    if (import.meta.env.VITE_LOGSTASH_URL) {
      fetch(import.meta.env.VITE_LOGSTASH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          level: "error",
          service: "frontend",
          message: error.toString(),
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
        }),
      }).catch((err) => console.error("Failed to log error:", err));
    }
  };

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      isCircuitOpen: false,
    });
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-container">
            {this.state.isCircuitOpen ? (
              // Erreur Circuit Breaker
              <>
                <div className="error-icon circuit-open">🚫</div>
                <h1>Service Temporairement Indisponible</h1>
                <p className="error-message">
                  Un de nos services rencontre des difficultés. Le circuit de
                  protection est activé.
                </p>
                <div className="error-details">
                  <p>
                    <strong>Que se passe-t-il ?</strong>
                  </p>
                  <p>
                    Notre système a détecté des problèmes avec un service
                    backend et l'a temporairement isolé pour protéger
                    l'application.
                  </p>
                  <p>
                    <strong>Que faire ?</strong>
                  </p>
                  <ul>
                    <li>Réessayez dans quelques instants (30 secondes)</li>
                    <li>
                      Vérifiez le{" "}
                      <a href="/status" className="status-link">
                        statut du système
                      </a>
                    </li>
                    <li>
                      Contactez le support si le problème persiste
                    </li>
                  </ul>
                </div>
                <div className="error-actions">
                  <button onClick={this.handleRetry} className="btn-primary">
                    🔄 Réessayer
                  </button>
                  <button onClick={this.handleGoHome} className="btn-secondary">
                    🏠 Retour à l'accueil
                  </button>
                </div>
              </>
            ) : (
              // Erreur générale
              <>
                <div className="error-icon">⚠️</div>
                <h1>Une Erreur s'est Produite</h1>
                <p className="error-message">
                  {this.state.error?.toString() ||
                    "Une erreur inattendue s'est produite"}
                </p>

                {import.meta.env.DEV && (
                  <details className="error-details-dev">
                    <summary>Détails techniques (Dev Mode)</summary>
                    <pre className="error-stack">
                      {this.state.error?.stack}
                    </pre>
                    {this.state.errorInfo && (
                      <pre className="error-component-stack">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    )}
                  </details>
                )}

                <div className="error-actions">
                  <button onClick={this.handleRetry} className="btn-primary">
                    🔄 Réessayer
                  </button>
                  <button onClick={this.handleGoHome} className="btn-secondary">
                    🏠 Retour à l'accueil
                  </button>
                </div>
              </>
            )}

            <div className="error-footer">
              <p>
                Si le problème persiste, consultez le{" "}
                <a href="/status">statut du système</a> ou contactez le support.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
