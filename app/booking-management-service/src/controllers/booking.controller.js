/**
 * Booking Controller - Version Sequelize ORM
 * Booking Management Service - Leçon 2.6
 *
 * Ce contrôleur utilise Sequelize pour la persistance PostgreSQL.
 * La communication avec Tour Catalog Service reste via HTTP (Axios).
 */

import { Booking } from "../models/index.js";
import { sendSuccess, sendError, createPagination } from "../utils/response.js";
import { NotFoundError, ValidationError } from "../middleware/errorHandler.js";
import * as tourCatalogService from "../services/tourCatalogService.js";
import { Op } from "sequelize";

/**
 * Récupère toutes les réservations avec filtres et pagination
 */
export const getAllBookings = async (req, res, next) => {
  try {
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

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    // Construction des filtres
    const where = {};

    if (status) {
      where.status = status;
    }

    if (tourId) {
      where.tourId = tourId;
    }

    if (customerEmail) {
      where.customerEmail = { [Op.iLike]: `%${customerEmail}%` };
    }

    if (fromDate || toDate) {
      where.tourDate = {};
      if (fromDate) where.tourDate[Op.gte] = fromDate;
      if (toDate) where.tourDate[Op.lte] = toDate;
    }

    // Requête avec pagination
    const { count, rows: bookings } = await Booking.findAndCountAll({
      where,
      order: [[sort, order.toUpperCase()]],
      limit: limitNum,
      offset,
    });

    const pagination = createPagination(pageNum, limitNum, count);

    sendSuccess(res, {
      bookings: bookings.map((b) => b.toAPIFormat()),
      pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupère une réservation par ID
 */
export const getBookingById = async (req, res, next) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findByPk(bookingId);

    if (!booking) {
      throw new NotFoundError(
        "The requested booking does not exist",
        "BOOKING_NOT_FOUND",
        { bookingId }
      );
    }

    // Enrichir avec les informations du tour (depuis Tour Catalog Service)
    let tourInfo = null;
    try {
      tourInfo = await tourCatalogService.getTourById(booking.tourId);
    } catch (err) {
      // Log l'erreur mais continuer sans les infos du tour
      console.warn(
        `Impossible de récupérer les infos du tour ${booking.tourId}:`,
        err.message
      );
    }

    const response = {
      booking: booking.toAPIFormat(),
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
    next(error);
  }
};

/**
 * Récupère les réservations d'un client par email
 */
export const getBookingsByCustomerEmail = async (req, res, next) => {
  try {
    const { email } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    const { count, rows: bookings } = await Booking.findAndCountAll({
      where: { customerEmail: email },
      order: [["createdAt", "DESC"]],
      limit: limitNum,
      offset,
    });

    const pagination = createPagination(pageNum, limitNum, count);

    sendSuccess(res, {
      bookings: bookings.map((b) => b.toAPIFormat()),
      pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Crée une nouvelle réservation
 */
export const createBooking = async (req, res, next) => {
  try {
    const {
      tourId,
      customerName,
      customerEmail,
      customerPhone,
      tourDate,
      numberOfParticipants = 1,
      specialRequests,
    } = req.body;

    // Validation basique
    if (!tourId || !customerName || !customerEmail || !tourDate) {
      throw new ValidationError("Missing required fields", "VALIDATION_ERROR", {
        required: ["tourId", "customerName", "customerEmail", "tourDate"],
      });
    }

    // Vérifier que le tour existe et récupérer son prix
    let tourInfo;
    try {
      tourInfo = await tourCatalogService.getTourById(tourId);
    } catch (err) {
      throw new NotFoundError("Tour not found in catalog", "TOUR_NOT_FOUND", {
        tourId,
      });
    }

    // Vérifier la disponibilité
    const availability = await tourCatalogService.checkAvailability(
      tourId,
      tourDate,
      numberOfParticipants
    );

    if (!availability.available) {
      throw new ValidationError(
        "Tour is not available for the selected date and number of participants",
        "NOT_AVAILABLE",
        {
          tourId,
          tourDate,
          numberOfParticipants,
          availableSlots: availability.availableSlots,
        }
      );
    }

    // Calculer le montant total
    const totalAmount = tourInfo.price * numberOfParticipants;

    // Créer la réservation
    const newBooking = await Booking.create({
      tourId,
      customerName,
      customerEmail,
      customerPhone,
      tourDate,
      numberOfParticipants,
      totalAmount,
      currency: tourInfo.currency || "EUR",
      specialRequests,
      status: "pending",
    });

    sendSuccess(
      res,
      {
        booking: newBooking.toAPIFormat(),
        tour: {
          id: tourInfo.id,
          title: tourInfo.title,
          price: tourInfo.price,
        },
      },
      201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Met à jour le statut d'une réservation (machine à états)
 */
export const updateBookingStatus = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { status, reason } = req.body;

    if (!status) {
      throw new ValidationError("Status is required", "VALIDATION_ERROR", {
        required: ["status"],
      });
    }

    const booking = await Booking.findByPk(bookingId);

    if (!booking) {
      throw new NotFoundError(
        "The requested booking does not exist",
        "BOOKING_NOT_FOUND",
        { bookingId }
      );
    }

    // Vérifier si la transition est valide
    if (!booking.canTransitionTo(status)) {
      throw new ValidationError(
        `Invalid status transition from '${booking.status}' to '${status}'`,
        "INVALID_STATUS_TRANSITION",
        {
          currentStatus: booking.status,
          requestedStatus: status,
          allowedTransitions: Booking.STATE_TRANSITIONS[booking.status],
        }
      );
    }

    // Si annulation, enregistrer la raison
    if (status === "cancelled" && reason) {
      booking.cancellationReason = reason;
    }

    // Effectuer la transition
    await booking.transitionTo(status);

    sendSuccess(res, { booking: booking.toAPIFormat() });
  } catch (error) {
    next(error);
  }
};

/**
 * Annule une réservation
 */
export const cancelBooking = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { reason } = req.body;

    const booking = await Booking.findByPk(bookingId);

    if (!booking) {
      throw new NotFoundError(
        "The requested booking does not exist",
        "BOOKING_NOT_FOUND",
        { bookingId }
      );
    }

    if (!booking.canTransitionTo("cancelled")) {
      throw new ValidationError(
        `Cannot cancel a booking with status '${booking.status}'`,
        "CANNOT_CANCEL",
        {
          currentStatus: booking.status,
          allowedTransitions: Booking.STATE_TRANSITIONS[booking.status],
        }
      );
    }

    booking.cancellationReason = reason || "Annulée par le client";
    await booking.transitionTo("cancelled");

    sendSuccess(res, {
      booking: booking.toAPIFormat(),
      message: "Booking cancelled successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Supprime une réservation (admin only, pour les réservations annulées)
 */
export const deleteBooking = async (req, res, next) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findByPk(bookingId);

    if (!booking) {
      throw new NotFoundError(
        "The requested booking does not exist",
        "BOOKING_NOT_FOUND",
        { bookingId }
      );
    }

    // Seules les réservations annulées peuvent être supprimées
    if (booking.status !== "cancelled") {
      throw new ValidationError(
        "Only cancelled bookings can be deleted",
        "CANNOT_DELETE",
        { currentStatus: booking.status }
      );
    }

    await booking.destroy();

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

/**
 * Statistiques des réservations
 */
export const getBookingStats = async (req, res, next) => {
  try {
    const { sequelize } = Booking;

    const stats = await Booking.findAll({
      attributes: [
        "status",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
        [sequelize.fn("SUM", sequelize.col("total_amount")), "totalRevenue"],
      ],
      group: ["status"],
      raw: true,
    });

    const totalBookings = await Booking.count();
    const totalRevenue = await Booking.sum("totalAmount", {
      where: { status: { [Op.in]: ["confirmed", "completed"] } },
    });

    sendSuccess(res, {
      stats: {
        total: totalBookings,
        totalRevenue: totalRevenue || 0,
        byStatus: stats.reduce((acc, s) => {
          acc[s.status] = {
            count: parseInt(s.count, 10),
            revenue: parseFloat(s.totalRevenue) || 0,
          };
          return acc;
        }, {}),
      },
    });
  } catch (error) {
    next(error);
  }
};
