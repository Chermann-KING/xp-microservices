/**
 * Middleware de gestion centralisée des erreurs
 */
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Erreurs de validation
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      status: 'error',
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message,
        details: err.details || null
      }
    });
  }

  // Erreurs de ressource non trouvée
  if (err.name === 'NotFoundError') {
    return res.status(404).json({
      status: 'error',
      error: {
        code: err.code || 'RESOURCE_NOT_FOUND',
        message: err.message,
        details: err.details || null
      }
    });
  }

  // Erreur par défaut (500 Internal Server Error)
  res.status(err.statusCode || 500).json({
    status: 'error',
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'development'
        ? err.message
        : 'An unexpected error occurred'
    }
  });
};

/**
 * Classe d'erreur personnalisée pour les ressources non trouvées
 */
export class NotFoundError extends Error {
  constructor(message, code, details = null) {
    super(message);
    this.name = 'NotFoundError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Classe d'erreur personnalisée pour la validation
 */
export class ValidationError extends Error {
  constructor(message, details = null) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}
