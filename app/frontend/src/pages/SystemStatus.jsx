/**
 * Page System Status - Monitoring des services
 * Module 6 - Leçon 6.4 : API Gateway & Circuit Breaker
 */

import { useState, useEffect } from "react";
import "./SystemStatus.css";

const SystemStatus = () => {
  const [servicesStatus, setServicesStatus] = useState(null);
  const [circuitBreakers, setCircuitBreakers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchSystemStatus = async () => {
    try {
      setLoading(true);

      // Récupérer le statut de l'API Gateway
      const healthResponse = await fetch(
        `${import.meta.env.VITE_API_URL}/health`
      );
      const healthData = await healthResponse.json();

      // Récupérer l'état des circuit breakers
      const circuitResponse = await fetch(
        `${import.meta.env.VITE_API_URL}/circuit-breaker/status`
      );
      const circuitData = await circuitResponse.json();

      setServicesStatus(healthData);
      setCircuitBreakers(circuitData);
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Erreur lors de la récupération du statut:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemStatus();

    // Rafraîchir toutes les 10 secondes
    const interval = setInterval(fetchSystemStatus, 10000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status) => {
    if (status === "ok" || status === "CLOSED") return "green";
    if (status === "HALF_OPEN") return "orange";
    if (status === "OPEN") return "red";
    return "gray";
  };

  const getStatusIcon = (status) => {
    if (status === "ok" || status === "CLOSED") return "✅";
    if (status === "HALF_OPEN") return "⚠️";
    if (status === "OPEN") return "🚫";
    return "❓";
  };

  if (loading && !servicesStatus) {
    return (
      <div className="system-status">
        <div className="loading">
          <div className="spinner"></div>
          <p>Chargement du statut système...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="system-status">
      <header className="status-header">
        <h1>📊 Statut du Système</h1>
        {lastUpdate && (
          <p className="last-update">
            Dernière mise à jour : {lastUpdate.toLocaleTimeString()}
          </p>
        )}
        <button onClick={fetchSystemStatus} className="refresh-btn">
          🔄 Rafraîchir
        </button>
      </header>

      {/* Services Health */}
      <section className="status-section">
        <h2>Services Backend</h2>
        {servicesStatus?.services ? (
          <div className="services-grid">
            {Object.entries(servicesStatus.services).map(([name, service]) => (
              <div
                key={name}
                className={`service-card status-${getStatusColor(service.status)}`}
              >
                <div className="service-icon">
                  {getStatusIcon(service.status)}
                </div>
                <div className="service-info">
                  <h3>{name}</h3>
                  <p className="service-url">{service.url}</p>
                  <span className={`status-badge ${service.status}`}>
                    {service.status?.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="no-data">Aucune donnée disponible</p>
        )}
      </section>

      {/* Circuit Breakers */}
      <section className="status-section">
        <h2>Circuit Breakers</h2>
        {circuitBreakers?.circuitBreakers ? (
          <>
            <div className="circuit-summary">
              <div className="summary-item">
                <span className="summary-label">Total:</span>
                <span className="summary-value">
                  {circuitBreakers.summary?.total || 0}
                </span>
              </div>
              <div className="summary-item green">
                <span className="summary-label">Fermés (OK):</span>
                <span className="summary-value">
                  {circuitBreakers.summary?.closed || 0}
                </span>
              </div>
              <div className="summary-item orange">
                <span className="summary-label">Semi-ouverts:</span>
                <span className="summary-value">
                  {circuitBreakers.summary?.halfOpen || 0}
                </span>
              </div>
              <div className="summary-item red">
                <span className="summary-label">Ouverts (Erreur):</span>
                <span className="summary-value">
                  {circuitBreakers.summary?.open || 0}
                </span>
              </div>
            </div>

            <div className="circuits-grid">
              {Object.entries(circuitBreakers.circuitBreakers).map(
                ([name, circuit]) => (
                  <div
                    key={name}
                    className={`circuit-card status-${getStatusColor(circuit.state)}`}
                  >
                    <div className="circuit-header">
                      <h3>{name}</h3>
                      <span className={`circuit-state ${circuit.state}`}>
                        {circuit.state}
                      </span>
                    </div>
                    <div className="circuit-metrics">
                      <div className="metric">
                        <span className="metric-label">Succès:</span>
                        <span className="metric-value success">
                          {circuit.successes}
                        </span>
                      </div>
                      <div className="metric">
                        <span className="metric-label">Échecs:</span>
                        <span className="metric-value error">
                          {circuit.failures}
                        </span>
                      </div>
                      <div className="metric">
                        <span className="metric-label">Rejets:</span>
                        <span className="metric-value warning">
                          {circuit.rejects}
                        </span>
                      </div>
                      <div className="metric">
                        <span className="metric-label">Timeouts:</span>
                        <span className="metric-value warning">
                          {circuit.timeouts}
                        </span>
                      </div>
                      <div className="metric">
                        <span className="metric-label">Latence moy.:</span>
                        <span className="metric-value">
                          {circuit.latencyMean?.toFixed(2) || 0} ms
                        </span>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </>
        ) : (
          <p className="no-data">Aucun circuit breaker configuré</p>
        )}
      </section>

      {/* Légende */}
      <section className="status-section legend">
        <h3>Légende</h3>
        <div className="legend-items">
          <div className="legend-item">
            <span className="legend-icon green">✅</span>
            <span>CLOSED - Service opérationnel</span>
          </div>
          <div className="legend-item">
            <span className="legend-icon orange">⚠️</span>
            <span>HALF_OPEN - Service en test de récupération</span>
          </div>
          <div className="legend-item">
            <span className="legend-icon red">🚫</span>
            <span>OPEN - Service indisponible (protection activée)</span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SystemStatus;
