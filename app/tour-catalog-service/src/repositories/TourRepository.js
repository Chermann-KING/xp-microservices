/**
 * Tour Repository - Module 3 - SRP & DIP
 *
 * Responsabilité unique : Accès aux données des tours
 * Ce repository abstrait les opérations de base de données,
 * permettant au service de ne pas dépendre directement de Sequelize.
 *
 * Principes SOLID appliqués :
 * - SRP : Cette classe ne fait QUE l'accès aux données
 * - DIP : Le controller dépend d'une abstraction (ITourRepository), pas de Sequelize
 */

import { Op } from "sequelize";

/**
 * @typedef {Object} TourFilters
 * @property {string} [destination] - Filtre par destination
 * @property {number} [minPrice] - Prix minimum
 * @property {number} [maxPrice] - Prix maximum
 * @property {string} [difficulty] - Niveau de difficulté
 * @property {string} [categoryId] - ID de la catégorie
 * @property {boolean} [isActive] - Tours actifs uniquement
 */

/**
 * @typedef {Object} PaginationOptions
 * @property {number} [page=1] - Numéro de page
 * @property {number} [limit=10] - Nombre d'éléments par page
 * @property {string} [sortBy='createdAt'] - Champ de tri
 * @property {string} [sortOrder='DESC'] - Ordre de tri (ASC/DESC)
 */

class TourRepository {
  /**
   * @param {Object} models - Les modèles Sequelize injectés
   * @param {Object} models.Tour - Modèle Tour
   * @param {Object} models.Category - Modèle Category
   * @param {Object} models.Destination - Modèle Destination
   */
  constructor({ Tour, Category, Destination }) {
    this.Tour = Tour;
    this.Category = Category;
    this.Destination = Destination;
  }

  /**
   * Construit les conditions WHERE à partir des filtres
   * @private
   * @param {TourFilters} filters
   * @returns {Object} Conditions Sequelize
   */
  _buildWhereClause(filters = {}) {
    const where = {};

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.difficulty) {
      where.difficulty = filters.difficulty;
    }

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters.destinationId) {
      where.destinationId = filters.destinationId;
    }

    if (filters.minPrice || filters.maxPrice) {
      where.price = {};
      if (filters.minPrice) {
        where.price[Op.gte] = filters.minPrice;
      }
      if (filters.maxPrice) {
        where.price[Op.lte] = filters.maxPrice;
      }
    }

    if (filters.search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${filters.search}%` } },
        { description: { [Op.iLike]: `%${filters.search}%` } },
      ];
    }

    return where;
  }

  /**
   * Récupère tous les tours avec filtres et pagination
   * @param {TourFilters} filters - Filtres de recherche
   * @param {PaginationOptions} pagination - Options de pagination
   * @returns {Promise<{tours: Array, total: number, page: number, totalPages: number}>}
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

    const { rows: tours, count: total } = await this.Tour.findAndCountAll({
      where,
      include: [
        {
          model: this.Category,
          as: "category",
          attributes: ["id", "name", "slug"],
        },
        {
          model: this.Destination,
          as: "destination",
          attributes: ["id", "name", "country", "slug"],
        },
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    return {
      tours: tours.map((tour) => tour.toAPIFormat()),
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Trouve un tour par son ID
   * @param {string} id - UUID du tour
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    const tour = await this.Tour.findByPk(id, {
      include: [
        {
          model: this.Category,
          as: "category",
          attributes: ["id", "name", "slug", "description"],
        },
        {
          model: this.Destination,
          as: "destination",
          attributes: ["id", "name", "country", "description", "slug"],
        },
      ],
    });

    return tour ? tour.toAPIFormat() : null;
  }

  /**
   * Trouve un tour par son slug
   * @param {string} slug - Slug unique du tour
   * @returns {Promise<Object|null>}
   */
  async findBySlug(slug) {
    const tour = await this.Tour.findOne({
      where: { slug },
      include: [
        { model: this.Category, as: "category" },
        { model: this.Destination, as: "destination" },
      ],
    });

    return tour ? tour.toAPIFormat() : null;
  }

  /**
   * Crée un nouveau tour
   * @param {Object} tourData - Données du tour
   * @returns {Promise<Object>} Tour créé
   */
  async create(tourData) {
    const tour = await this.Tour.create(tourData);
    return this.findById(tour.id);
  }

  /**
   * Met à jour un tour existant
   * @param {string} id - UUID du tour
   * @param {Object} updateData - Données à mettre à jour
   * @returns {Promise<Object|null>}
   */
  async update(id, updateData) {
    const [affectedRows] = await this.Tour.update(updateData, {
      where: { id },
    });

    if (affectedRows === 0) {
      return null;
    }

    return this.findById(id);
  }

  /**
   * Supprime un tour (soft delete via isActive)
   * @param {string} id - UUID du tour
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    const affectedRows = await this.Tour.destroy({
      where: { id },
    });

    return affectedRows > 0;
  }

  /**
   * Vérifie si un tour existe
   * @param {string} id - UUID du tour
   * @returns {Promise<boolean>}
   */
  async exists(id) {
    const count = await this.Tour.count({ where: { id } });
    return count > 0;
  }

  /**
   * Compte les tours selon les filtres
   * @param {TourFilters} filters
   * @returns {Promise<number>}
   */
  async count(filters = {}) {
    const where = this._buildWhereClause(filters);
    return this.Tour.count({ where });
  }

  /**
   * Récupère les tours populaires (par note)
   * @param {number} limit - Nombre de tours à retourner
   * @returns {Promise<Array>}
   */
  async findPopular(limit = 5) {
    const tours = await this.Tour.findAll({
      where: { isActive: true },
      order: [
        ["ratingsAverage", "DESC"],
        ["ratingsQuantity", "DESC"],
      ],
      limit,
      include: [
        { model: this.Category, as: "category" },
        { model: this.Destination, as: "destination" },
      ],
    });

    return tours.map((tour) => tour.toAPIFormat());
  }
}

export default TourRepository;
