/**
 * Booking Controller - Version SOLID Refactorisée - Module 3
 *
 * Ce contrôleur suit le principe SRP (Single Responsibility Principle) :
 * Sa SEULE responsabilité est de gérer le protocole HTTP.
 *
 * Responsabilités:
 * - Extraire les données des requêtes HTTP
 * - Déléguer le traitement au BookingService
 * - Formater les réponses HTTP
 * - Gérer les erreurs HTTP
 *
 * Ce qu'il ne fait PAS :
 * - Logique métier (déléguée au BookingService)
 * - Accès aux données (délégué au BookingRepository)
 * - Validation métier (déléguée au BookingService)
 */

import { getContainer } from "../config/container.js";
import { sendSuccess, sendError, createPagination } from "../utils/response.js";

/**
 * Récupère toutes les réservations avec filtres et pagination
 * @route GET /api/v1/bookings
 */
export const getAllBookings = async (req, res, next) => {
  try {
    const { bookingService } = getContainer();

    // Extraire les paramètres de requête
    const {
      page = 1,
      limit = 10,
      status,
      tourId,
      customerEmail,
      fromDate,
      toDate,
      sort = "createdAt",
      order = "DESC",
    } = req.query;

    // Construire les filtres
    const filters = {
      status,
      tourId,
      customerEmail,
      fromDate,
      toDate,
      sort,
      order,
    };

    // Pagination
    const pagination = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    };

    // Déléguer au service
    const result = await bookingService.getAllBookings(filters, pagination);

    sendSuccess(res, {
      bookings: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupère une réservation par ID
 * @route GET /api/v1/bookings/:bookingId
 */
export const getBookingById = async (req, res, next) => {
  try {
    const { bookingService, tourCatalogService } = getContainer();
    const { bookingId } = req.params;

    const result = await bookingService.getBookingById(bookingId);

    // Enrichir avec les informations du tour (optionnel)
    let tourInfo = null;
    try {
      tourInfo = await tourCatalogService.getTourById(result.data.tourId);
    } catch (err) {
      // Log mais continue sans les infos du tour
      console.warn(
        `Impossible de récupérer les infos du tour ${result.data.tourId}`
      );
    }

    const response = {
      booking: result.data,
    };

    if (tourInfo) {
      response.tour = {
        id: tourInfo.id,
        title: tourInfo.title,
        destination: tourInfo.destination,
      };
    }

    sendSuccess(res, response);
  } catch (error) {
    if (error.code === "BOOKING_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }
    next(error);
  }
};

/**
 * Récupère les réservations d'un client par email
 * @route GET /api/v1/bookings/customer/:email
 */
export const getBookingsByCustomerEmail = async (req, res, next) => {
  try {
    const { bookingService } = getContainer();
    const { email } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const result = await bookingService.getBookingsByCustomer(email);

    // Pagination côté contrôleur pour ce cas simple
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    const paginatedData = result.data.slice(offset, offset + limitNum);
    const pagination = createPagination(pageNum, limitNum, result.data.length);

    sendSuccess(res, {
      bookings: paginatedData,
      pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Crée une nouvelle réservation
 * @route POST /api/v1/bookings
 */
export const createBooking = async (req, res, next) => {
  try {
    const { bookingService, tourCatalogService } = getContainer();

    const bookingData = {
      tourId: req.body.tourId,
      customerName: req.body.customerName,
      customerEmail: req.body.customerEmail,
      customerPhone: req.body.customerPhone,
      tourDate: req.body.tourDate,
      numberOfParticipants: req.body.numberOfParticipants || 1,
      specialRequests: req.body.specialRequests,
    };

    const result = await bookingService.createBooking(bookingData);

    // Enrichir avec les infos du tour pour la réponse
    let tourInfo = null;
    try {
      tourInfo = await tourCatalogService.getTourById(bookingData.tourId);
    } catch (err) {
      // Continue sans les infos
    }

    const response = {
      booking: result.data,
    };

    if (tourInfo) {
      response.tour = {
        id: tourInfo.id,
        title: tourInfo.title,
        price: tourInfo.price,
      };
    }

    sendSuccess(res, response, 201);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }
    next(error);
  }
};

/**
 * Met à jour le statut d'une réservation (machine à états)
 * @route PATCH /api/v1/bookings/:bookingId/status
 */
export const updateBookingStatus = async (req, res, next) => {
  try {
    const { bookingService } = getContainer();
    const { bookingId } = req.params;
    const { status, reason } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Status is required",
        },
      });
    }

    const result = await bookingService.changeBookingStatus(
      bookingId,
      status,
      reason
    );

    sendSuccess(res, { booking: result.data });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }
    next(error);
  }
};

/**
 * Annule une réservation
 * @route POST /api/v1/bookings/:bookingId/cancel
 */
export const cancelBooking = async (req, res, next) => {
  try {
    const { bookingService } = getContainer();
    const { bookingId } = req.params;
    const { reason } = req.body;

    const result = await bookingService.cancelBooking(
      bookingId,
      reason || "Annulée par le client"
    );

    sendSuccess(res, {
      booking: result.data,
      message: result.message,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }
    next(error);
  }
};

/**
 * Supprime une réservation
 * @route DELETE /api/v1/bookings/:bookingId
 */
export const deleteBooking = async (req, res, next) => {
  try {
    const { bookingService } = getContainer();
    const { bookingId } = req.params;

    await bookingService.deleteBooking(bookingId);

    res.status(204).send();
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }
    next(error);
  }
};

/**
 * Statistiques des réservations
 * @route GET /api/v1/bookings/stats
 */
export const getBookingStats = async (req, res, next) => {
  try {
    const { bookingService } = getContainer();

    const result = await bookingService.getStatistics();

    sendSuccess(res, { stats: result.data });
  } catch (error) {
    next(error);
  }
};
