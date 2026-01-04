/**
 * Tour Service - Module 3 - SRP
 *
 * Responsabilité unique : Logique métier des tours
 * Ce service contient TOUTE la logique métier liée aux tours,
 * séparée de l'accès aux données (Repository) et du HTTP (Controller).
 *
 * Principes SOLID appliqués :
 * - SRP : Cette classe ne fait QUE la logique métier
 * - DIP : Dépend de l'abstraction TourRepository, pas de Sequelize
 * - OCP : Extensible via des stratégies (prix, validation)
 */

import slugify from "slugify";

/**
 * Classe de gestion des erreurs métier
 */
class TourServiceError extends Error {
  constructor(message, code, statusCode = 400) {
    super(message);
    this.name = "TourServiceError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

class TourService {
  /**
   * @param {Object} dependencies - Dépendances injectées (DIP)
   * @param {TourRepository} dependencies.tourRepository
   * @param {Object} dependencies.logger - Service de logging (optionnel)
   */
  constructor({ tourRepository, logger = console }) {
    this.tourRepository = tourRepository;
    this.logger = logger;
  }

  /**
   * Génère un slug unique à partir du titre
   * @private
   * @param {string} title
   * @returns {string}
   */
  _generateSlug(title) {
    const baseSlug = slugify(title, {
      lower: true,
      strict: true,
      locale: "fr",
    });

    // Ajouter un timestamp pour garantir l'unicité
    const timestamp = Date.now().toString(36);
    return `${baseSlug}-${timestamp}`;
  }

  /**
   * Valide les données d'un tour
   * @private
   * @param {Object} tourData
   * @throws {TourServiceError}
   */
  _validateTourData(tourData) {
    const errors = [];

    if (!tourData.title || tourData.title.length < 3) {
      errors.push("Le titre doit contenir au moins 3 caractères");
    }

    if (!tourData.description) {
      errors.push("La description est requise");
    }

    if (tourData.price === undefined || tourData.price < 0) {
      errors.push("Le prix doit être un nombre positif");
    }

    if (tourData.duration && tourData.duration < 1) {
      errors.push("La durée doit être d'au moins 1");
    }

    if (tourData.maxGroupSize && tourData.maxGroupSize < 1) {
      errors.push("La taille maximale du groupe doit être d'au moins 1");
    }

    const validDifficulties = ["easy", "medium", "difficult"];
    if (
      tourData.difficulty &&
      !validDifficulties.includes(tourData.difficulty)
    ) {
      errors.push(`La difficulté doit être: ${validDifficulties.join(", ")}`);
    }

    if (errors.length > 0) {
      throw new TourServiceError(errors.join(". "), "VALIDATION_ERROR", 400);
    }
  }

  /**
   * Récupère la liste des tours avec filtres et pagination
   * @param {Object} filters - Filtres de recherche
   * @param {Object} pagination - Options de pagination
   * @returns {Promise<Object>}
   */
  async getAllTours(filters = {}, pagination = {}) {
    this.logger.info("TourService.getAllTours", { filters, pagination });

    // Valeurs par défaut pour les filtres métier
    const processedFilters = {
      ...filters,
      isActive: filters.isActive ?? true, // Par défaut, seulement les tours actifs
    };

    const result = await this.tourRepository.findAll(
      processedFilters,
      pagination
    );

    return {
      success: true,
      data: result.tours,
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
   * Récupère un tour par son ID
   * @param {string} id - UUID du tour
   * @returns {Promise<Object>}
   */
  async getTourById(id) {
    this.logger.info("TourService.getTourById", { id });

    const tour = await this.tourRepository.findById(id);

    if (!tour) {
      throw new TourServiceError(
        `Tour avec l'ID ${id} introuvable`,
        "TOUR_NOT_FOUND",
        404
      );
    }

    return {
      success: true,
      data: tour,
    };
  }

  /**
   * Récupère un tour par son slug
   * @param {string} slug
   * @returns {Promise<Object>}
   */
  async getTourBySlug(slug) {
    this.logger.info("TourService.getTourBySlug", { slug });

    const tour = await this.tourRepository.findBySlug(slug);

    if (!tour) {
      throw new TourServiceError(
        `Tour "${slug}" introuvable`,
        "TOUR_NOT_FOUND",
        404
      );
    }

    return {
      success: true,
      data: tour,
    };
  }

  /**
   * Crée un nouveau tour
   * @param {Object} tourData
   * @returns {Promise<Object>}
   */
  async createTour(tourData) {
    this.logger.info("TourService.createTour", { title: tourData.title });

    // Validation métier
    this._validateTourData(tourData);

    // Génération automatique du slug
    const slug = tourData.slug || this._generateSlug(tourData.title);

    // Vérifier si le slug existe déjà
    const existingTour = await this.tourRepository.findBySlug(slug);
    if (existingTour) {
      throw new TourServiceError(
        "Un tour avec ce slug existe déjà",
        "DUPLICATE_SLUG",
        409
      );
    }

    // Préparer les données avec valeurs par défaut
    const processedData = {
      ...tourData,
      slug,
      isActive: tourData.isActive ?? true,
      currency: tourData.currency || "EUR",
      durationUnit: tourData.durationUnit || "days",
      ratingsAverage: 0,
      ratingsQuantity: 0,
    };

    const tour = await this.tourRepository.create(processedData);

    return {
      success: true,
      message: "Tour créé avec succès",
      data: tour,
    };
  }

  /**
   * Met à jour un tour existant
   * @param {string} id - UUID du tour
   * @param {Object} updateData
   * @returns {Promise<Object>}
   */
  async updateTour(id, updateData) {
    this.logger.info("TourService.updateTour", { id });

    // Vérifier que le tour existe
    const existingTour = await this.tourRepository.findById(id);
    if (!existingTour) {
      throw new TourServiceError(
        `Tour avec l'ID ${id} introuvable`,
        "TOUR_NOT_FOUND",
        404
      );
    }

    // Validation partielle (seulement les champs fournis)
    if (updateData.title !== undefined || updateData.price !== undefined) {
      this._validateTourData({
        ...existingTour,
        ...updateData,
      });
    }

    // Si le titre change, régénérer le slug
    if (updateData.title && updateData.title !== existingTour.title) {
      updateData.slug = this._generateSlug(updateData.title);
    }

    const updatedTour = await this.tourRepository.update(id, updateData);

    return {
      success: true,
      message: "Tour mis à jour avec succès",
      data: updatedTour,
    };
  }

  /**
   * Supprime un tour
   * @param {string} id - UUID du tour
   * @returns {Promise<Object>}
   */
  async deleteTour(id) {
    this.logger.info("TourService.deleteTour", { id });

    const exists = await this.tourRepository.exists(id);
    if (!exists) {
      throw new TourServiceError(
        `Tour avec l'ID ${id} introuvable`,
        "TOUR_NOT_FOUND",
        404
      );
    }

    await this.tourRepository.delete(id);

    return {
      success: true,
      message: "Tour supprimé avec succès",
    };
  }

  /**
   * Récupère les tours populaires
   * @param {number} limit
   * @returns {Promise<Object>}
   */
  async getPopularTours(limit = 5) {
    this.logger.info("TourService.getPopularTours", { limit });

    const tours = await this.tourRepository.findPopular(limit);

    return {
      success: true,
      data: tours,
    };
  }

  /**
   * Calcule le prix avec réduction (exemple de logique métier)
   * @param {string} tourId
   * @param {number} participants
   * @param {string} [promoCode]
   * @returns {Promise<Object>}
   */
  async calculatePrice(tourId, participants, promoCode = null) {
    const { data: tour } = await this.getTourById(tourId);

    let basePrice = tour.price * participants;
    let discount = 0;
    let discountReason = null;

    // Réduction groupe (5+ personnes = 10%)
    if (participants >= 5) {
      discount = basePrice * 0.1;
      discountReason = "Réduction groupe (10%)";
    }

    // Réduction code promo (simulation)
    if (promoCode === "SUMMER2024") {
      const promoDiscount = basePrice * 0.15;
      if (promoDiscount > discount) {
        discount = promoDiscount;
        discountReason = "Code promo SUMMER2024 (15%)";
      }
    }

    return {
      success: true,
      data: {
        tourId,
        tourTitle: tour.title,
        unitPrice: tour.price,
        participants,
        basePrice,
        discount,
        discountReason,
        finalPrice: basePrice - discount,
        currency: tour.currency,
      },
    };
  }
}

export { TourService, TourServiceError };
export default TourService;
