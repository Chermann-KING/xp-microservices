/**
 * Header - Layout Component
 * Module 5 - Ajout indicateur WebSocket
 */

import { Link } from "react-router-dom";
import { useAuth, useCart, useCurrency } from "../../hooks/index.js";
import WebSocketStatus from "../ui/WebSocketStatus.jsx";

function Header() {
  const { isAuthenticated, user, logout } = useAuth();
  const { itemCount } = useCart();
  const { currency, availableCurrencies, changeCurrency } = useCurrency();

  return (
    <header className="header">
      <div className="header__container">
        <Link to="/" className="header__logo">
          🌍 Réservation Touristique
        </Link>

        <nav className="header__nav">
          <Link to="/tours">Tours</Link>
        </nav>

        <div className="header__actions">
          {/* WebSocket Status - Module 5 */}
          <WebSocketStatus />

          {/* Sélecteur de devise */}
          <select
            className="currency-select"
            value={currency}
            onChange={(e) => changeCurrency(e.target.value)}
          >
            {availableCurrencies.map((c) => (
              <option key={c.code} value={c.code}>
                {c.symbol} {c.code}
              </option>
            ))}
          </select>

          {/* Panier */}
          <Link to="/cart" className="header__cart">
            🛒
            {itemCount > 0 && (
              <span className="header__cart-badge">{itemCount}</span>
            )}
          </Link>

          {/* Auth */}
          {isAuthenticated ? (
            <div className="header__user">
              <span>Bonjour, {user.firstName}</span>
              <button className="btn btn-outline" onClick={logout}>
                Déconnexion
              </button>
            </div>
          ) : (
            <Link to="/login" className="btn btn-primary">
              Connexion
            </Link>
          )}
        </div>
      </div>

      <style>{`
        .header {
          background: var(--surface);
          border-bottom: 1px solid var(--border);
          padding: 1rem 2rem;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .header__container {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 2rem;
        }
        .header__logo {
          font-size: 1.25rem;
          font-weight: 700;
          text-decoration: none;
          color: var(--text-primary);
        }
        .header__nav {
          display: flex;
          gap: 1.5rem;
        }
        .header__nav a {
          text-decoration: none;
          color: var(--text-secondary);
          font-weight: 500;
          transition: color 0.2s;
        }
        .header__nav a:hover {
          color: var(--primary-color);
        }
        .header__actions {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .currency-select {
          padding: 0.375rem 0.5rem;
          border: 1px solid var(--border);
          border-radius: 0.25rem;
          background: white;
          cursor: pointer;
        }
        .header__cart {
          position: relative;
          font-size: 1.5rem;
          text-decoration: none;
        }
        .header__cart-badge {
          position: absolute;
          top: -8px;
          right: -8px;
          background: var(--primary-color);
          color: white;
          font-size: 0.75rem;
          padding: 2px 6px;
          border-radius: 10px;
          font-weight: 600;
        }
        .header__user {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .header__user span {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }
      `}</style>
    </header>
  );
}

export default Header;
