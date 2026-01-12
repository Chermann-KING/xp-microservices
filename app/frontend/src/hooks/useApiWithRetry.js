/**
 * Hook personnalisé - API avec retry automatique
 * Module 6 - Leçon 6.4 : Résilience & Circuit Breaker
 */

import { useState, useCallback } from "react";

/**
 * Options de configuration pour le hook
 * @typedef {Object} UseApiOptions
 * @property {number} maxRetries - Nombre maximum de tentatives (défaut: 3)
 * @property {number} retryDelay - Délai entre les tentatives en ms (défaut: 1000)
 * @property {number} timeout - Timeout de la requête en ms (défaut: 5000)
 * @property {Function} onError - Callback en cas d'erreur
 * @property {Function} onRetry - Callback lors d'un retry
 */

const defaultOptions = {
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 5000,
  onError: null,
  onRetry: null,
};

/**
 * Hook pour faire des requêtes API avec retry automatique et gestion du circuit breaker
 */
const useApiWithRetry = (options = {}) => {
  const config = { ...defaultOptions, ...options };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  /**
   * Effectue une requête avec timeout
   */
  const fetchWithTimeout = async (url, fetchOptions, timeout) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      throw error;
    }
  };

  /**
   * Détermine si l'erreur est récupérable (doit retry)
   */
  const isRetryableError = (error, response) => {
    // Erreurs réseau (fetch failed)
    if (error.name === "TypeError") return true;

    // Timeout
    if (error.name === "AbortError") return true;

    // Status codes récupérables
    if (response) {
      const status = response.status;
      // 408 Request Timeout, 429 Too Many Requests, 5xx Server Errors
      if (status === 408 || status === 429 || (status >= 500 && status < 600)) {
        return true;
      }

      // Circuit Breaker ouvert (503 avec code CIRCUIT_OPEN)
      if (status === 503) {
        return true;
      }
    }

    return false;
  };

  /**
   * Fonction principale de requête avec retry
   */
  const request = useCallback(
    async (url, fetchOptions = {}) => {
      setLoading(true);
      setError(null);
      setRetryCount(0);

      let lastError = null;
      let lastResponse = null;

      for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
        try {
          // Attendre avant de retry (sauf au premier essai)
          if (attempt > 0) {
            const delay = config.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
            await new Promise((resolve) => setTimeout(resolve, delay));

            setRetryCount(attempt);

            if (config.onRetry) {
              config.onRetry(attempt, config.maxRetries);
            }

            console.log(
              `🔄 Retry ${attempt}/${config.maxRetries} pour ${url}`
            );
          }

          // Faire la requête avec timeout
          const response = await fetchWithTimeout(url, fetchOptions, config.timeout);

          // Vérifier si la réponse est OK
          if (!response.ok) {
            lastResponse = response;

            // Si l'erreur n'est pas récupérable, throw immédiatement
            if (!isRetryableError(null, response)) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(
                errorData.error || `HTTP Error ${response.status}`
              );
            }

            // Continuer le retry pour les erreurs récupérables
            throw new Error(`HTTP Error ${response.status}`);
          }

          // Succès !
          const responseData = await response.json();
          setData(responseData);
          setLoading(false);
          return responseData;
        } catch (err) {
          lastError = err;

          // Si c'est la dernière tentative ou si l'erreur n'est pas récupérable
          if (
            attempt === config.maxRetries ||
            !isRetryableError(err, lastResponse)
          ) {
            setError(err);
            setLoading(false);

            if (config.onError) {
              config.onError(err);
            }

            throw err;
          }
        }
      }

      // Ne devrait jamais arriver ici, mais au cas où
      setError(lastError);
      setLoading(false);
      throw lastError;
    },
    [config]
  );

  /**
   * Méthode GET avec retry
   */
  const get = useCallback(
    (url, options = {}) => {
      return request(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        ...options,
      });
    },
    [request]
  );

  /**
   * Méthode POST avec retry
   */
  const post = useCallback(
    (url, body, options = {}) => {
      return request(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        body: JSON.stringify(body),
        ...options,
      });
    },
    [request]
  );

  /**
   * Méthode PUT avec retry
   */
  const put = useCallback(
    (url, body, options = {}) => {
      return request(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        body: JSON.stringify(body),
        ...options,
      });
    },
    [request]
  );

  /**
   * Méthode DELETE avec retry
   */
  const del = useCallback(
    (url, options = {}) => {
      return request(url, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        ...options,
      });
    },
    [request]
  );

  /**
   * Reset de l'état
   */
  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
    setRetryCount(0);
  }, []);

  return {
    loading,
    error,
    data,
    retryCount,
    request,
    get,
    post,
    put,
    delete: del,
    reset,
  };
};

export default useApiWithRetry;
