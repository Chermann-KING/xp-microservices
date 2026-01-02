export const sendSuccess = (res, data, statusCode = 200) => {
  res.status(statusCode).json({
    status: "success",
    data,
  });
};

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

/**
 * Crée des liens HATEOAS pour une réservation
 */
export const addBookingHateoasLinks = (booking) => {
  const baseUrl = `${process.env.API_BASE_PATH}/${process.env.API_VERSION}`;

  return {
    ...booking,
    links: {
      self: `${baseUrl}/booking-management/bookings/${booking.id}`,
      tour: `${baseUrl}/tours-catalog/tours/${booking.tourId}`,
      cancel: `${baseUrl}/booking-management/bookings/${booking.id}/cancel`,
      payment:
        booking.paymentStatus === "pending"
          ? `${baseUrl}/payment-gateway/payments/create?bookingId=${booking.id}`
          : undefined,
    },
  };
};
