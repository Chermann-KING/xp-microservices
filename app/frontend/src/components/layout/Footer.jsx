/**
 * Footer - Layout Component
 */

function Footer() {
  return (
    <footer className="footer">
      <div className="footer__container">
        <p>
          © 2024 Application de Réservation Touristique - Module 3 XP
          Microservices
        </p>
      </div>

      <style>{`
        .footer {
          background: var(--surface);
          border-top: 1px solid var(--border);
          padding: 1.5rem 2rem;
          margin-top: auto;
        }
        .footer__container {
          max-width: 1200px;
          margin: 0 auto;
          text-align: center;
        }
        .footer p {
          color: var(--text-secondary);
          font-size: 0.875rem;
          margin: 0;
        }
      `}</style>
    </footer>
  );
}

export default Footer;
