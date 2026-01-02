import * as BookingModel from "../models/bookingModel.js";
import * as TourCatalogService from "../services/tourCatalogService.js";
import * as AvailabilityService from "../services/availabilityService.js";
import {
  isValidTransition,
  canBeCancelled,
  getValidTransitions,
  BookingStatus,
} from "../services/bookingStateMachine.js";
import {
  sendSuccess,
  sendError,
  createPagination,
  addBookingHateoasLinks,
} from "../utils/response.js";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from "../middleware/errorHandler.js";

/**
 * Calcule le prix total de la réservation
 */
const calculateTotalPrice = (tour, participants) => {
  const adultPrice = tour.price;
  const childPrice = tour.price * 0.5; // 50% pour les enfants
  const infantPrice = 0; // Gratuit pour les bébés

  const total =
    (participants.adults || 0) * adultPrice +
    (participants.children || 0) * childPrice +
    (participants.infants || 0) * infantPrice;

  return parseFloat(total.toFixed(2));
};

/**
 * Récupère toutes les réservations
 */
export const getAllBookings = (req, res, next) => {
  try {
    const { customerId, tourId, status, dateFrom, dateTo, page, limit } =
      req.query;

    const filters = {
      customerId,
      tourId,
      status,
      dateFrom,
      dateTo,
      page,
      limit,
    };
    const { bookings, totalItems } = BookingModel.findAll(filters);

    const pagination = createPagination(page, limit, totalItems);

    sendSuccess(res, { bookings, pagination });
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
    const booking = BookingModel.findById(bookingId);

    if (!booking) {
      throw new NotFoundError(
        "The requested booking does not exist",
        "BOOKING_NOT_FOUND",
        { bookingId }
      );
    }

    // Récupérer les détails de la visite
    const tour = await TourCatalogService.getTourDetails(booking.tourId);

    const enrichedBooking = {
      ...booking,
      tourDetails: tour
        ? {
            title: tour.title,
            duration: tour.duration,
            meetingPoint: tour.meetingPoint,
          }
        : null,
    };

    const bookingWithLinks = addBookingHateoasLinks(enrichedBooking);

    sendSuccess(res, { booking: bookingWithLinks });
  } catch (error) {
    next(error);
  }
};

/**
 * Crée une nouvelle réservation
 */
export const createBooking = async (req, res, next) => {
  try {
    const { customerId, tourId, travelDate, participants, specialRequests } =
      req.body;

    // Validation
    if (!customerId || !tourId || !travelDate || !participants) {
      throw new ValidationError("Missing required fields", {
        required: ["customerId", "tourId", "travelDate", "participants"],
      });
    }

    // Vérifier l'existence de la visite
    const tour = await TourCatalogService.getTourDetails(tourId);
    if (!tour) {
      throw new NotFoundError(
        "The requested tour does not exist",
        "TOUR_NOT_FOUND",
        { tourId }
      );
    }

    // Calculer le nombre total de participants
    const totalParticipants =
      (participants.adults || 0) +
      (participants.children || 0) +
      (participants.infants || 0);

    // Vérifier la disponibilité
    const availability = AvailabilityService.getAvailability(
      tourId,
      travelDate,
      tour.maxGroupSize
    );

    if (availability.availableSeats < totalParticipants) {
      throw new ConflictError(
        "Not enough available seats for the requested date",
        "INSUFFICIENT_CAPACITY",
        {
          requestedSeats: totalParticipants,
          availableSeats: availability.availableSeats,
          tourId,
          date: travelDate,
        }
      );
    }

    // Réserver les places
    const reserved = AvailabilityService.reserveSeats(
      tourId,
      travelDate,
      totalParticipants
    );

    if (!reserved) {
      throw new ConflictError("Failed to reserve seats", "RESERVATION_FAILED");
    }

    // Calculer le prix total
    const totalPrice = calculateTotalPrice(tour, participants);

    // Créer la réservation
    const newBooking = BookingModel.create({
      customerId,
      tourId,
      travelDate,
      participants,
      totalPrice,
      specialRequests,
    });

    const bookingWithLinks = addBookingHateoasLinks(newBooking);

    sendSuccess(res, { booking: bookingWithLinks }, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Met à jour le statut d'une réservation
 */
export const updateBookingStatus = (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { status, reason } = req.body;

    const booking = BookingModel.findById(bookingId);

    if (!booking) {
      throw new NotFoundError(
        "The requested booking does not exist",
        "BOOKING_NOT_FOUND",
        { bookingId }
      );
    }

    // Vérifier la transition de statut
    if (!isValidTransition(booking.status, status)) {
      throw new ValidationError(
        `Cannot transition from ${booking.status} to ${status}`,
        {
          currentStatus: booking.status,
          requestedStatus: status,
          allowedTransitions: getValidTransitions(booking.status),
        }
      );
    }

    // Mettre à jour le statut
    const updatedBooking = BookingModel.updateStatus(bookingId, status, {
      reason,
    });

    sendSuccess(res, { booking: updatedBooking });
  } catch (error) {
    next(error);
  }
};

/**
 * Annule une réservation
 */
export const cancelBooking = (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { reason, requestRefund } = req.body;

    const booking = BookingModel.findById(bookingId);

    if (!booking) {
      throw new NotFoundError(
        "The requested booking does not exist",
        "BOOKING_NOT_FOUND",
        { bookingId }
      );
    }

    // Vérifier si la réservation peut être annulée
    if (!canBeCancelled(booking.status)) {
      throw new ConflictError(
        `Booking with status ${booking.status} cannot be cancelled`,
        "CANNOT_CANCEL",
        { status: booking.status }
      );
    }

    // Libérer les places
    const totalParticipants = booking.participants.totalCount;
    AvailabilityService.releaseSeats(
      booking.tourId,
      booking.travelDate,
      totalParticipants
    );

    // Mettre à jour le statut
    const updatedBooking = BookingModel.updateStatus(
      bookingId,
      BookingStatus.CANCELLED,
      {
        cancellationReason: reason,
        refundStatus: requestRefund ? "pending" : "not_requested",
      }
    );

    res.status(200).json({
      status: "success",
      data: {
        booking: updatedBooking,
      },
      message: requestRefund
        ? "Booking cancelled successfully. Refund will be processed within 5-7 business days."
        : "Booking cancelled successfully.",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Supprime une réservation
 */
export const deleteBooking = (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const deleted = BookingModel.remove(bookingId);

    if (!deleted) {
      throw new NotFoundError(
        "The requested booking does not exist",
        "BOOKING_NOT_FOUND",
        { bookingId }
      );
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
