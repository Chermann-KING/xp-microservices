/**
 * Booking Repository - Module 3 - SRP & DIP
 *
 * Responsabilité unique : Accès aux données des réservations
 * Ce repository abstrait les opérations de base de données.
 *
 * Principes SOLID appliqués :
 * - SRP : Cette classe ne fait QUE l'accès aux données
 * - DIP : Le service dépend d'une abstraction, pas de Sequelize
 */

import { Op } from "sequelize";

/**
 * @typedef {Object} BookingFilters
 * @property {string} [status] - Statut de la réservation
 * @property {string} [tourId] - ID du tour
 * @property {string} [customerId] - ID du client
 * @property {string} [customerEmail] - Email du client (recherche partielle)
 * @property {string} [fromDate] - Date de début
 * @property {string} [toDate] - Date de fin
 */

/**
 * @typedef {Object} PaginationOptions
 * @property {number} [page=1] - Numéro de page
 * @property {number} [limit=10] - Nombre d'éléments par page
 * @property {string} [sortBy='createdAt'] - Champ de tri
 * @property {string} [sortOrder='DESC'] - Ordre de tri
 */

class BookingRepository {
  /**
   * @param {Object} models - Les modèles Sequelize injectés
   * @param {Object} models.Booking - Modèle Booking
   */
  constructor({ Booking }) {
    this.Booking = Booking;
  }

  /**
   * Construit les conditions WHERE à partir des filtres
   * @private
   */
  _buildWhereClause(filters = {}) {
    const where = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.tourId) {
      where.tourId = filters.tourId;
    }

    if (filters.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters.customerEmail) {
      where.customerEmail = { [Op.iLike]: `%${filters.customerEmail}%` };
    }

    if (filters.fromDate || filters.toDate) {
      where.tourDate = {};
      if (filters.fromDate) {
        where.tourDate[Op.gte] = filters.fromDate;
      }
      if (filters.toDate) {
        where.tourDate[Op.lte] = filters.toDate;
      }
    }

    return where;
  }

  /**
   * Récupère toutes les réservations avec filtres et pagination
   * @param {BookingFilters} filters
   * @param {PaginationOptions} pagination
   */
  async findAll(filters = {}, pagination = {}) {
    const {
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = pagination;

    const where = this._buildWhereClause(filters);
    const offset = (page - 1) * limit;

    const { rows: bookings, count: total } = await this.Booking.findAndCountAll(
      {
        where,
        order: [[sortBy, sortOrder.toUpperCase()]],
        limit: parseInt(limit),
        offset: parseInt(offset),
      }
    );

    return {
      bookings: bookings.map((b) => b.toAPIFormat()),
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Trouve une réservation par son ID
   * @param {string} id - UUID de la réservation
   */
  async findById(id) {
    const booking = await this.Booking.findByPk(id);
    return booking ? booking.toAPIFormat() : null;
  }

  /**
   * Trouve une réservation par ID (retourne l'instance Sequelize pour les mutations)
   * @param {string} id
   * @returns {Promise<Model|null>}
   */
  async findInstanceById(id) {
    return this.Booking.findByPk(id);
  }

  /**
   * Trouve les réservations d'un client
   * @param {string} customerId
   */
  async findByCustomerId(customerId) {
    const bookings = await this.Booking.findAll({
      where: { customerId },
      order: [["createdAt", "DESC"]],
    });

    return bookings.map((b) => b.toAPIFormat());
  }

  /**
   * Trouve les réservations d'un tour
   * @param {string} tourId
   */
  async findByTourId(tourId) {
    const bookings = await this.Booking.findAll({
      where: { tourId },
      order: [["tourDate", "ASC"]],
    });

    return bookings.map((b) => b.toAPIFormat());
  }

  /**
   * Crée une nouvelle réservation
   * @param {Object} bookingData
   */
  async create(bookingData) {
    const booking = await this.Booking.create(bookingData);
    return booking.toAPIFormat();
  }

  /**
   * Met à jour une réservation
   * @param {string} id
   * @param {Object} updateData
   */
  async update(id, updateData) {
    const [affectedRows] = await this.Booking.update(updateData, {
      where: { id },
    });

    if (affectedRows === 0) {
      return null;
    }

    return this.findById(id);
  }

  /**
   * Supprime une réservation
   * @param {string} id
   */
  async delete(id) {
    const affectedRows = await this.Booking.destroy({
      where: { id },
    });

    return affectedRows > 0;
  }

  /**
   * Vérifie si une réservation existe
   * @param {string} id
   */
  async exists(id) {
    const count = await this.Booking.count({ where: { id } });
    return count > 0;
  }

  /**
   * Compte les réservations selon les filtres
   * @param {BookingFilters} filters
   */
  async count(filters = {}) {
    const where = this._buildWhereClause(filters);
    return this.Booking.count({ where });
  }

  /**
   * Compte les participants pour un tour à une date donnée
   * @param {string} tourId
   * @param {string} tourDate
   * @param {string[]} excludeStatuses - Statuts à exclure (ex: ['cancelled'])
   */
  async countParticipantsForTourDate(
    tourId,
    tourDate,
    excludeStatuses = ["cancelled"]
  ) {
    const result = await this.Booking.sum("numberOfParticipants", {
      where: {
        tourId,
        tourDate,
        status: { [Op.notIn]: excludeStatuses },
      },
    });

    return result || 0;
  }

  /**
   * Récupère les statistiques des réservations
   */
  async getStatistics() {
    const [total, pending, confirmed, completed, cancelled] = await Promise.all(
      [
        this.Booking.count(),
        this.Booking.count({ where: { status: "pending" } }),
        this.Booking.count({ where: { status: "confirmed" } }),
        this.Booking.count({ where: { status: "completed" } }),
        this.Booking.count({ where: { status: "cancelled" } }),
      ]
    );

    const totalRevenue = await this.Booking.sum("totalAmount", {
      where: { status: { [Op.in]: ["confirmed", "completed"] } },
    });

    return {
      total,
      byStatus: { pending, confirmed, completed, cancelled },
      totalRevenue: totalRevenue || 0,
    };
  }
}

export default BookingRepository;
