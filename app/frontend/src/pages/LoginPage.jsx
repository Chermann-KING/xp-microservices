/**
 * LoginPage - Page de connexion
 * Module 3 - Utilise AuthContext
 */

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth, useNotifications } from "../hooks/index.js";

function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, error } = useAuth();
  const { success } = useNotifications();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(formData.email, formData.password);

    if (result.success) {
      success("Connexion réussie !");
      navigate("/");
    }
  };

  return (
    <div className="login-page">
      <div className="login-card card">
        <h1>Connexion</h1>

        <form onSubmit={handleSubmit}>
          {error && <div className="error-banner">{error}</div>}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              className="input"
              value={formData.email}
              onChange={handleChange}
              placeholder="votre@email.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Mot de passe</label>
            <input
              type="password"
              id="password"
              name="password"
              className="input"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={isLoading}
          >
            {isLoading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <p className="login-hint">💡 Test: test@example.com / password</p>

        <p className="login-footer">
          <Link to="/">Retour à l'accueil</Link>
        </p>
      </div>

      <style>{`
        .login-page {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 60vh;
        }
        .login-card {
          width: 100%;
          max-width: 400px;
          padding: 2rem;
        }
        .login-card h1 {
          text-align: center;
          margin-bottom: 2rem;
        }
        .form-group {
          margin-bottom: 1.25rem;
        }
        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
        }
        .error-banner {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 0.75rem 1rem;
          border-radius: 0.375rem;
          margin-bottom: 1rem;
          font-size: 0.875rem;
        }
        .btn-lg {
          width: 100%;
          padding: 0.75rem;
          font-size: 1rem;
          margin-top: 0.5rem;
        }
        .login-hint {
          text-align: center;
          margin-top: 1.5rem;
          padding: 0.75rem;
          background: #f0f9ff;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }
        .login-footer {
          text-align: center;
          margin-top: 1.5rem;
        }
        .login-footer a {
          color: var(--primary-color);
        }
      `}</style>
    </div>
  );
}

export default LoginPage;
