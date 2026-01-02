/**
 * Routes Bookings - Version Sequelize ORM
 * Booking Management Service - Leçon 2.6
 */

import { Router } from "express";
import * as bookingController from "../controllers/booking.controller.js";

const router = Router();

/**
 * @route   GET /api/v1/booking-management/bookings
 * @desc    Récupère toutes les réservations avec filtres et pagination
 * @query   page, limit, status, tourId, customerEmail, fromDate, toDate, sort, order
 * @access  Private (Admin)
 */
router.get("/", bookingController.getAllBookings);

/**
 * @route   POST /api/v1/booking-management/bookings
 * @desc    Crée une nouvelle réservation
 * @body    { tourId, customerName, customerEmail, customerPhone, tourDate, numberOfParticipants, specialRequests }
 * @access  Public
 */
router.post("/", bookingController.createBooking);

/**
 * @route   GET /api/v1/booking-management/bookings/stats
 * @desc    Statistiques des réservations
 * @access  Private (Admin)
 */
router.get("/stats", bookingController.getBookingStats);

/**
 * @route   GET /api/v1/booking-management/bookings/customer/:email
 * @desc    Récupère les réservations d'un client par email
 * @param   email - Email du client
 * @query   page, limit
 * @access  Private
 */
router.get("/customer/:email", bookingController.getBookingsByCustomerEmail);

/**
 * @route   GET /api/v1/booking-management/bookings/:bookingId
 * @desc    Récupère une réservation par son ID
 * @param   bookingId - UUID de la réservation
 * @access  Private
 */
router.get("/:bookingId", bookingController.getBookingById);

/**
 * @route   PATCH /api/v1/booking-management/bookings/:bookingId/status
 * @desc    Met à jour le statut d'une réservation (machine à états)
 * @param   bookingId - UUID de la réservation
 * @body    { status, reason? }
 * @access  Private (Admin)
 */
router.patch("/:bookingId/status", bookingController.updateBookingStatus);

/**
 * @route   POST /api/v1/booking-management/bookings/:bookingId/cancel
 * @desc    Annule une réservation
 * @param   bookingId - UUID de la réservation
 * @body    { reason? }
 * @access  Private
 */
router.post("/:bookingId/cancel", bookingController.cancelBooking);

/**
 * @route   DELETE /api/v1/booking-management/bookings/:bookingId
 * @desc    Supprime une réservation annulée
 * @param   bookingId - UUID de la réservation
 * @access  Private (Admin)
 */
router.delete("/:bookingId", bookingController.deleteBooking);

export default router;
