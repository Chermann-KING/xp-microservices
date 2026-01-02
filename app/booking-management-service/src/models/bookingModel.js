import { v4 as uuidv4 } from "uuid";
import { BookingStatus } from "../services/bookingStateMachine.js";

// Stockage en mémoire des réservations
let bookings = [];

/**
 * Calcule le nombre total de participants
 */
const calculateTotalParticipants = (participants) => {
  return (
    (participants.adults || 0) +
    (participants.children || 0) +
    (participants.infants || 0)
  );
};

/**
 * Récupère toutes les réservations avec filtres
 */
export const findAll = (filters = {}) => {
  let result = [...bookings];

  // Filtrage par client
  if (filters.customerId) {
    result = result.filter((b) => b.customerId === filters.customerId);
  }

  // Filtrage par visite
  if (filters.tourId) {
    result = result.filter((b) => b.tourId === filters.tourId);
  }

  // Filtrage par statut
  if (filters.status) {
    result = result.filter((b) => b.status === filters.status);
  }

  // Filtrage par date
  if (filters.dateFrom) {
    result = result.filter(
      (b) => new Date(b.travelDate) >= new Date(filters.dateFrom)
    );
  }
  if (filters.dateTo) {
    result = result.filter(
      (b) => new Date(b.travelDate) <= new Date(filters.dateTo)
    );
  }

  // Pagination
  const page = parseInt(filters.page) || 1;
  const limit = parseInt(filters.limit) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  const paginatedResult = result.slice(startIndex, endIndex);

  return {
    bookings: paginatedResult,
    totalItems: result.length,
  };
};

/**
 * Récupère une réservation par ID
 */
export const findById = (id) => {
  return bookings.find((b) => b.id === id);
};

/**
 * Crée une nouvelle réservation
 */
export const create = (bookingData) => {
  const totalParticipants = calculateTotalParticipants(
    bookingData.participants
  );

  const newBooking = {
    id: uuidv4(),
    customerId: bookingData.customerId,
    tourId: bookingData.tourId,
    travelDate: bookingData.travelDate,
    participants: {
      ...bookingData.participants,
      totalCount: totalParticipants,
    },
    totalPrice: bookingData.totalPrice,
    status: BookingStatus.PENDING,
    paymentStatus: "pending",
    specialRequests: bookingData.specialRequests || null,
    createdAt: new Date(),
    updatedAt: new Date(),
    confirmedAt: null,
    cancelledAt: null,
    cancellationReason: null,
  };

  bookings.push(newBooking);
  return newBooking;
};

/**
 * Met à jour le statut d'une réservation
 */
export const updateStatus = (id, newStatus, additionalData = {}) => {
  const index = bookings.findIndex((b) => b.id === id);

  if (index === -1) {
    return null;
  }

  const updates = {
    status: newStatus,
    updatedAt: new Date(),
    ...additionalData,
  };

  // Ajouter le timestamp approprié
  if (newStatus === BookingStatus.CONFIRMED) {
    updates.confirmedAt = new Date();
  } else if (newStatus === BookingStatus.CANCELLED) {
    updates.cancelledAt = new Date();
  }

  bookings[index] = {
    ...bookings[index],
    ...updates,
  };

  return bookings[index];
};

/**
 * Met à jour partiellement une réservation
 */
export const partialUpdate = (id, updates) => {
  const index = bookings.findIndex((b) => b.id === id);

  if (index === -1) {
    return null;
  }

  bookings[index] = {
    ...bookings[index],
    ...updates,
    updatedAt: new Date(),
  };

  return bookings[index];
};

/**
 * Supprime une réservation
 */
export const remove = (id) => {
  const index = bookings.findIndex((b) => b.id === id);

  if (index === -1) {
    return false;
  }

  bookings.splice(index, 1);
  return true;
};
