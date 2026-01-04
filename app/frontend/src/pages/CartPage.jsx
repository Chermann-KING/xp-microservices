/**
 * CartPage - Panier de réservation
 * Module 3 - Utilise CartContext avec useReducer
 */

import { Link } from "react-router-dom";
import { useCart, useCurrency } from "../hooks/index.js";

function CartPage() {
  const {
    items,
    savedItems,
    cartTotal,
    removeFromCart,
    updateQuantity,
    saveForLater,
    moveToCart,
    clearCart,
  } = useCart();
  const { format } = useCurrency();

  if (items.length === 0 && savedItems.length === 0) {
    return (
      <div className="cart-page cart-page--empty">
        <h1>Votre panier est vide</h1>
        <p>Découvrez nos tours et commencez à planifier votre aventure !</p>
        <Link to="/tours" className="btn btn-primary">
          Explorer les tours
        </Link>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <h1>Votre panier</h1>

      {items.length > 0 && (
        <section className="cart-section">
          <div className="cart-section__header">
            <h2>Articles ({items.length})</h2>
            <button className="btn btn-outline" onClick={clearCart}>
              Vider le panier
            </button>
          </div>

          <div className="cart-items">
            {items.map((item) => (
              <div key={item.id} className="cart-item card">
                <div className="cart-item__image">
                  <img
                    src={item.imageCover || "/placeholder-tour.jpg"}
                    alt={item.title}
                  />
                </div>

                <div className="cart-item__info">
                  <h3>{item.title}</h3>
                  <p>
                    {item.duration} {item.durationUnit || "jours"}
                  </p>
                  {item.selectedDate && (
                    <p className="cart-item__date">
                      📅{" "}
                      {new Date(item.selectedDate).toLocaleDateString("fr-FR")}
                    </p>
                  )}
                </div>

                <div className="cart-item__quantity">
                  <button
                    onClick={() =>
                      updateQuantity(item.id, item.participants - 1)
                    }
                  >
                    -
                  </button>
                  <span>{item.participants}</span>
                  <button
                    onClick={() =>
                      updateQuantity(item.id, item.participants + 1)
                    }
                  >
                    +
                  </button>
                </div>

                <div className="cart-item__price">
                  {format(item.price * item.participants)}
                </div>

                <div className="cart-item__actions">
                  <button
                    className="btn btn-outline"
                    onClick={() => saveForLater(item.id)}
                  >
                    Sauvegarder
                  </button>
                  <button
                    className="btn-icon"
                    onClick={() => removeFromCart(item.id)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="cart-summary card">
            <div className="cart-summary__row">
              <span>Total</span>
              <strong>{format(cartTotal)}</strong>
            </div>
            <button className="btn btn-primary btn-lg">
              Procéder au paiement
            </button>
          </div>
        </section>
      )}

      {savedItems.length > 0 && (
        <section className="cart-section cart-section--saved">
          <h2>Sauvegardés pour plus tard ({savedItems.length})</h2>
          <div className="cart-items">
            {savedItems.map((item) => (
              <div key={item.id} className="cart-item cart-item--saved card">
                <div className="cart-item__image">
                  <img
                    src={item.imageCover || "/placeholder-tour.jpg"}
                    alt={item.title}
                  />
                </div>
                <div className="cart-item__info">
                  <h3>{item.title}</h3>
                  <p>{format(item.price)} / pers.</p>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => moveToCart(item.id)}
                >
                  Ajouter au panier
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <style>{`
        .cart-page {
          max-width: 900px;
          margin: 0 auto;
        }
        .cart-page--empty {
          text-align: center;
          padding: 4rem 2rem;
        }
        .cart-page--empty p {
          color: var(--text-secondary);
          margin: 1rem 0 2rem;
        }
        .cart-section {
          margin-bottom: 3rem;
        }
        .cart-section__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .cart-items {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .cart-item {
          display: grid;
          grid-template-columns: 100px 1fr auto auto auto;
          gap: 1rem;
          align-items: center;
          padding: 1rem;
        }
        @media (max-width: 768px) {
          .cart-item {
            grid-template-columns: 80px 1fr;
          }
        }
        .cart-item__image img {
          width: 100%;
          border-radius: 0.25rem;
        }
        .cart-item__info h3 {
          margin: 0 0 0.25rem;
          font-size: 1rem;
        }
        .cart-item__info p {
          margin: 0;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }
        .cart-item__quantity {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .cart-item__quantity button {
          width: 28px;
          height: 28px;
          border: 1px solid var(--border);
          background: white;
          border-radius: 4px;
          cursor: pointer;
        }
        .cart-item__price {
          font-weight: 600;
          font-size: 1.125rem;
        }
        .cart-item__actions {
          display: flex;
          gap: 0.5rem;
        }
        .btn-icon {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1.25rem;
        }
        .cart-summary {
          padding: 1.5rem;
          margin-top: 1.5rem;
        }
        .cart-summary__row {
          display: flex;
          justify-content: space-between;
          font-size: 1.25rem;
          margin-bottom: 1rem;
        }
        .cart-summary .btn-lg {
          width: 100%;
          padding: 1rem;
        }
        .cart-section--saved {
          opacity: 0.8;
        }
        .cart-item--saved {
          grid-template-columns: 80px 1fr auto;
        }
      `}</style>
    </div>
  );
}

export default CartPage;
