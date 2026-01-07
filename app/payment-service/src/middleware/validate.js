/**
 * @fileoverview Middleware de validation des requêtes
 */

/**
 * Crée un middleware de validation avec un schéma Joi
 * @param {Joi.Schema} schema - Schéma de validation
 * @param {string} property - Propriété de la requête à valider ('body', 'query', 'params')
 * @returns {Function} Middleware Express
 */
export function validate(schema, property = "body") {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));

      return res.status(400).json({
        success: false,
        error: "Données de validation invalides",
        code: "VALIDATION_ERROR",
        details: errors,
      });
    }

    // Remplacer par les valeurs validées et nettoyées
    req[property] = value;
    next();
  };
}

export default validate;
