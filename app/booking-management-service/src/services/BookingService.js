/**
 * Booking Service - Module 3 - SRP
 *
 * Responsabilité unique : Logique métier des réservations
 * Ce service orchestre les opérations de réservation,
 * incluant la validation, la machine à états, et la communication inter-services.
 *
 * Principes SOLID appliqués :
 * - SRP : Cette classe ne fait QUE la logique métier
 * - DIP : Dépend des abstractions (Repository, TourCatalogService)
 */

/**
 * Classe de gestion des erreurs métier
 */
class BookingServiceError extends Error {
  constructor(message, code, statusCode = 400) {
    super(message);
    this.name = "BookingServiceError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

// États valides et transitions
const BOOKING_STATES = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

const STATE_TRANSITIONS = {
  [BOOKING_STATES.PENDING]: [
    BOOKING_STATES.CONFIRMED,
    BOOKING_STATES.CANCELLED,
  ],
  [BOOKING_STATES.CONFIRMED]: [
    BOOKING_STATES.COMPLETED,
    BOOKING_STATES.CANCELLED,
  ],
  [BOOKING_STATES.COMPLETED]: [],
  [BOOKING_STATES.CANCELLED]: [],
};

class BookingService {
  /**
   * @param {Object} dependencies - Dépendances injectées (DIP)
   * @param {BookingRepository} dependencies.bookingRepository
   * @param {Object} dependencies.tourCatalogService - Service de communication avec Tour Catalog
   * @param {Object} dependencies.eventPublisher - Publisher RabbitMQ (Module 5)
   * @param {Object} dependencies.logger
   */
  constructor({
    bookingRepository,
    tourCatalogService,
    eventPublisher = null,
    logger = console,
  }) {
    this.bookingRepository = bookingRepository;
    this.tourCatalogService = tourCatalogService;
    this.eventPublisher = eventPublisher;
    this.logger = logger;
  }

  /**
   * Valide les données d'une réservation
   * @private
   */
  _validateBookingData(data) {
    const errors = [];

    if (!data.tourId) {
      errors.push("L'ID du tour est requis");
    }

    if (!data.customerName || data.customerName.length < 2) {
      errors.push("Le nom du client doit contenir au moins 2 caractères");
    }

    if (!data.customerEmail || !this._isValidEmail(data.customerEmail)) {
      errors.push("Email client invalide");
    }

    if (!data.tourDate) {
      errors.push("La date du tour est requise");
    } else {
      const tourDate = new Date(data.tourDate);
      if (tourDate < new Date()) {
        errors.push("La date du tour doit être dans le futur");
      }
    }

    if (!data.numberOfParticipants || data.numberOfParticipants < 1) {
      errors.push("Le nombre de participants doit être au moins 1");
    }

    if (errors.length > 0) {
      throw new BookingServiceError(errors.join(". "), "VALIDATION_ERROR", 400);
    }
  }

  /**
   * @private
   */
  _isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /**
   * Vérifie si une transition d'état est valide
   * @private
   */
  _canTransition(currentStatus, newStatus) {
    const allowed = STATE_TRANSITIONS[currentStatus] || [];
    return allowed.includes(newStatus);
  }

  /**
   * Récupère toutes les réservations avec filtres et pagination
   */
  async getAllBookings(filters = {}, pagination = {}) {
    this.logger.info("BookingService.getAllBookings", { filters, pagination });

    const result = await this.bookingRepository.findAll(filters, pagination);

    return {
      success: true,
      data: result.bookings,
      pagination: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        hasNextPage: result.page < result.totalPages,
        hasPrevPage: result.page > 1,
      },
    };
  }

  /**
   * Récupère une réservation par son ID
   */
  async getBookingById(id) {
    this.logger.info("BookingService.getBookingById", { id });

    const booking = await this.bookingRepository.findById(id);

    if (!booking) {
      throw new BookingServiceError(
        `Réservation avec l'ID ${id} introuvable`,
        "BOOKING_NOT_FOUND",
        404
      );
    }

    return {
      success: true,
      data: booking,
    };
  }

  /**
   * Crée une nouvelle réservation
   */
  async createBooking(bookingData) {
    this.logger.info("BookingService.createBooking", {
      tourId: bookingData.tourId,
    });

    // Validation des données
    this._validateBookingData(bookingData);

    // Vérifier que le tour existe et récupérer ses infos
    let tourInfo;
    try {
      tourInfo = await this.tourCatalogService.getTourById(bookingData.tourId);
    } catch (error) {
      throw new BookingServiceError(
        `Tour avec l'ID ${bookingData.tourId} introuvable`,
        "TOUR_NOT_FOUND",
        404
      );
    }

    // Vérifier la disponibilité
    const existingParticipants =
      await this.bookingRepository.countParticipantsForTourDate(
        bookingData.tourId,
        bookingData.tourDate
      );

    const maxGroupSize = tourInfo.maxGroupSize || 20;
    const availableSpots = maxGroupSize - existingParticipants;

    if (bookingData.numberOfParticipants > availableSpots) {
      throw new BookingServiceError(
        `Seulement ${availableSpots} place(s) disponible(s) pour cette date`,
        "INSUFFICIENT_AVAILABILITY",
        400
      );
    }

    // Calculer le montant total
    const totalAmount = tourInfo.price * bookingData.numberOfParticipants;

    // Préparer les données
    const preparedData = {
      ...bookingData,
      totalAmount,
      currency: tourInfo.currency || "EUR",
      status: BOOKING_STATES.PENDING,
    };

    const booking = await this.bookingRepository.create(preparedData);

    return {
      success: true,
      message: "Réservation créée avec succès",
      data: booking,
    };
  }

  /**
   * Met à jour une réservation
   */
  async updateBooking(id, updateData) {
    this.logger.info("BookingService.updateBooking", { id });

    const existingBooking = await this.bookingRepository.findById(id);
    if (!existingBooking) {
      throw new BookingServiceError(
        `Réservation avec l'ID ${id} introuvable`,
        "BOOKING_NOT_FOUND",
        404
      );
    }

    // Ne pas permettre la mise à jour de certains champs
    const { status, totalAmount, ...allowedUpdates } = updateData;

    // Si le nombre de participants change, recalculer le montant
    if (
      allowedUpdates.numberOfParticipants &&
      allowedUpdates.numberOfParticipants !==
        existingBooking.numberOfParticipants
    ) {
      const pricePerPerson =
        existingBooking.totalAmount / existingBooking.numberOfParticipants;
      allowedUpdates.totalAmount =
        pricePerPerson * allowedUpdates.numberOfParticipants;
    }

    const updatedBooking = await this.bookingRepository.update(
      id,
      allowedUpdates
    );

    return {
      success: true,
      message: "Réservation mise à jour avec succès",
      data: updatedBooking,
    };
  }

  /**
   * Change le statut d'une réservation (machine à états)
   */
  async changeBookingStatus(id, newStatus, reason = null) {
    this.logger.info("BookingService.changeBookingStatus", { id, newStatus });

    // Récupérer l'instance Sequelize pour utiliser la méthode transitionTo
    const bookingInstance = await this.bookingRepository.findInstanceById(id);

    if (!bookingInstance) {
      throw new BookingServiceError(
        `Réservation avec l'ID ${id} introuvable`,
        "BOOKING_NOT_FOUND",
        404
      );
    }

    // Vérifier la transition
    if (!this._canTransition(bookingInstance.status, newStatus)) {
      throw new BookingServiceError(
        `Transition invalide de '${bookingInstance.status}' vers '${newStatus}'. ` +
          `Transitions autorisées: ${
            STATE_TRANSITIONS[bookingInstance.status].join(", ") || "aucune"
          }`,
        "INVALID_TRANSITION",
        400
      );
    }

    // Effectuer la transition
    await bookingInstance.transitionTo(newStatus);

    // Ajouter la raison si annulation
    if (newStatus === BOOKING_STATES.CANCELLED && reason) {
      await bookingInstance.update({ cancellationReason: reason });
    }

    // MODULE 5: Publier événement RabbitMQ
    await this._publishBookingEvent(bookingInstance, newStatus, reason);

    return {
      success: true,
      message: `Réservation ${
        newStatus === BOOKING_STATES.CONFIRMED
          ? "confirmée"
          : newStatus === BOOKING_STATES.CANCELLED
          ? "annulée"
          : newStatus === BOOKING_STATES.COMPLETED
          ? "complétée"
          : "mise à jour"
      }`,
      data: bookingInstance.toAPIFormat(),
    };
  }

  /**
   * MODULE 5: Publie un événement RabbitMQ pour un changement de statut
   * @private
   */
  async _publishBookingEvent(bookingInstance, newStatus, reason) {
    if (!this.eventPublisher) {
      this.logger.warn(
        "⚠️  Event publisher non configuré - événement non publié"
      );
      return;
    }

    const { v4: uuidv4 } = await import("uuid");

    let routingKey;
    let eventType;

    if (newStatus === BOOKING_STATES.CONFIRMED) {
      routingKey = "booking.confirmed";
      eventType = "booking.confirmed";
    } else if (newStatus === BOOKING_STATES.CANCELLED) {
      routingKey = "booking.cancelled";
      eventType = "booking.cancelled";
    } else if (newStatus === BOOKING_STATES.COMPLETED) {
      routingKey = "booking.completed";
      eventType = "booking.completed";
    } else {
      return; // Pas d'événement pour les autres transitions
    }

    const eventData = {
      eventId: uuidv4(),
      eventType,
      eventVersion: "1.0",
      timestamp: new Date().toISOString(),
      data: {
        bookingId: bookingInstance.id,
        tourId: bookingInstance.tourId,
        userId: bookingInstance.customerId,
        userName: bookingInstance.customerName,
        userEmail: bookingInstance.customerEmail,
        tourName: bookingInstance.tourName || "Tour",
        tourDate: bookingInstance.tourDate,
        participants: bookingInstance.numberOfParticipants,
        totalPrice: parseFloat(bookingInstance.totalAmount),
        currency: bookingInstance.currency,
        status: newStatus,
        canceledAt:
          newStatus === BOOKING_STATES.CANCELLED
            ? new Date().toISOString()
            : null,
        cancellationReason: reason || null,
      },
    };

    try {
      await this.eventPublisher.publishEvent(routingKey, eventData);
      this.logger.info(
        `✅ Événement [${routingKey}] publié pour booking ${bookingInstance.id}`
      );
    } catch (error) {
      this.logger.error(
        `❌ Échec publication événement [${routingKey}]:`,
        error
      );
      // Ne pas bloquer la transaction - l'événement peut être republié
    }
  }

  /**
   * Confirme une réservation
   */
  async confirmBooking(id) {
    return this.changeBookingStatus(id, BOOKING_STATES.CONFIRMED);
  }

  /**
   * Annule une réservation
   */
  async cancelBooking(id, reason = null) {
    return this.changeBookingStatus(id, BOOKING_STATES.CANCELLED, reason);
  }

  /**
   * Marque une réservation comme complétée
   */
  async completeBooking(id) {
    return this.changeBookingStatus(id, BOOKING_STATES.COMPLETED);
  }

  /**
   * Supprime une réservation
   */
  async deleteBooking(id) {
    this.logger.info("BookingService.deleteBooking", { id });

    const exists = await this.bookingRepository.exists(id);
    if (!exists) {
      throw new BookingServiceError(
        `Réservation avec l'ID ${id} introuvable`,
        "BOOKING_NOT_FOUND",
        404
      );
    }

    await this.bookingRepository.delete(id);

    return {
      success: true,
      message: "Réservation supprimée avec succès",
    };
  }

  /**
   * Récupère les statistiques des réservations
   */
  async getStatistics() {
    this.logger.info("BookingService.getStatistics");

    const stats = await this.bookingRepository.getStatistics();

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Récupère les réservations d'un client
   */
  async getBookingsByCustomer(customerId) {
    this.logger.info("BookingService.getBookingsByCustomer", { customerId });

    const bookings = await this.bookingRepository.findByCustomerId(customerId);

    return {
      success: true,
      data: bookings,
    };
  }

  /**
   * Met à jour le statut de paiement d'une réservation
   * Appelé par le payment-service via webhook
   * @param {string} id - ID de la réservation
   * @param {string} paymentStatus - Nouveau statut de paiement
   */
  async updatePaymentStatus(id, paymentStatus) {
    this.logger.info("BookingService.updatePaymentStatus", {
      id,
      paymentStatus,
    });

    const bookingInstance = await this.bookingRepository.findInstanceById(id);

    if (!bookingInstance) {
      throw new BookingServiceError(
        `Réservation avec l'ID ${id} introuvable`,
        "BOOKING_NOT_FOUND",
        404
      );
    }

    // Mettre à jour le statut de paiement via la méthode du modèle
    await bookingInstance.updatePaymentStatus(paymentStatus);

    return {
      success: true,
      message: `Statut de paiement mis à jour: ${paymentStatus}`,
      data: bookingInstance.toAPIFormat(),
    };
  }
}

export { BookingService, BookingServiceError, BOOKING_STATES };
export default BookingService;
