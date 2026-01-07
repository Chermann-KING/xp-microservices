/**
 * @fileoverview Middleware de gestion des erreurs
 */

/**
 * Middleware de gestion centralisée des erreurs
 */
export function errorHandler(err, req, res, next) {
  console.error("Error:", {
    message: err.message,
    code: err.code,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });

  // Erreur de validation Sequelize
  if (err.name === "SequelizeValidationError") {
    return res.status(400).json({
      success: false,
      error: "Erreur de validation",
      code: "VALIDATION_ERROR",
      details: err.errors.map((e) => ({
        field: e.path,
        message: e.message,
      })),
    });
  }

  // Erreur de contrainte unique Sequelize
  if (err.name === "SequelizeUniqueConstraintError") {
    return res.status(409).json({
      success: false,
      error: "Cette ressource existe déjà",
      code: "DUPLICATE_ENTRY",
      details: err.errors.map((e) => ({
        field: e.path,
        message: e.message,
      })),
    });
  }

  // Erreur métier personnalisée
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code || "BUSINESS_ERROR",
    });
  }

  // Erreur serveur générique
  return res.status(500).json({
    success: false,
    error:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Erreur interne du serveur",
    code: "INTERNAL_ERROR",
  });
}

export default errorHandler;
