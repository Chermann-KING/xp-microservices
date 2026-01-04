/**
 * HomePage - Page d'accueil
 */

import { Link } from "react-router-dom";

function HomePage() {
  return (
    <div className="home-page">
      <section className="hero">
        <h1>Découvrez le monde</h1>
        <p>Réservez votre prochaine aventure parmi nos tours exceptionnels</p>
        <Link to="/tours" className="btn btn-primary btn-lg">
          Explorer les tours
        </Link>
      </section>

      <style>{`
        .home-page {
          text-align: center;
        }
        .hero {
          padding: 4rem 2rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 1rem;
          margin-bottom: 3rem;
        }
        .hero h1 {
          font-size: 3rem;
          margin-bottom: 1rem;
        }
        .hero p {
          font-size: 1.25rem;
          margin-bottom: 2rem;
          opacity: 0.9;
        }
        .btn-lg {
          padding: 1rem 2rem;
          font-size: 1.125rem;
        }
      `}</style>
    </div>
  );
}

export default HomePage;
