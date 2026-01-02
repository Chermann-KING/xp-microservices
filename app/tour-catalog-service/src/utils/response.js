/**
 * Envoie une réponse de succès standardisée
 */
export const sendSuccess = (res, data, statusCode = 200) => {
  res.status(statusCode).json({
    status: "success",
    data,
  });
};

/**
 * Envoie une réponse d'erreur standardisée
 */
export const sendError = (
  res,
  code,
  message,
  details = null,
  statusCode = 400
) => {
  const errorResponse = {
    status: "error",
    error: {
      code,
      message,
    },
  };

  if (details) {
    errorResponse.error.details = details;
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * Crée un objet de pagination
 */
export const createPagination = (page, limit, totalItems) => {
  const currentPage = parseInt(page) || 1;
  const itemsPerPage = parseInt(limit) || 10;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return {
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
  };
};
