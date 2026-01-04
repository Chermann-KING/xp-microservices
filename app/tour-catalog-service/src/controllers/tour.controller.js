/**
 * Tour Controller (Refactorisé) - Module 3 - SRP
 *
 * Responsabilité unique : Gérer les requêtes/réponses HTTP
 * Ce controller ne contient AUCUNE logique métier ni accès aux données.
 * Il délègue tout au TourService injecté via le container DI.
 *
 * Principes SOLID appliqués :
 * - SRP : Gère uniquement le HTTP (request/response)
 * - DIP : Dépend du service injecté, pas de l'implémentation
 *
 * Comparaison avec l'ancien controller :
 * - AVANT : 348 lignes avec Sequelize directement dans le controller
 * - APRÈS : ~150 lignes, délègue au service
 */

import container from "../config/container.js";

/**
 * Factory pour créer les handlers du controller
 * Permet l'injection de dépendances pour les tests
 */
class TourController {
  constructor(tourService = null) {
    // Injection de dépendance : utilise le container si non fourni
    this.tourService = tourService || container.resolve("tourService");
  }

  /**
   * GET /api/v1/tours
   * Liste tous les tours avec filtres et pagination
   */
  getAllTours = async (req, res) => {
    try {
      const {
        destination,
        minPrice,
        maxPrice,
        difficulty,
        categoryId,
        search,
        isActive,
        page,
        limit,
        sortBy,
        sortOrder,
      } = req.query;

      const filters = {
        destination,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        difficulty,
        categoryId,
        search,
        isActive: isActive !== undefined ? isActive === "true" : undefined,
      };

      const pagination = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        sortBy: sortBy || "createdAt",
        sortOrder: sortOrder || "DESC",
      };

      const result = await this.tourService.getAllTours(filters, pagination);

      res.status(200).json(result);
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * GET /api/v1/tours/:id
   * Récupère un tour par ID
   */
  getTourById = async (req, res) => {
    try {
      const { id } = req.params;
      const result = await this.tourService.getTourById(id);

      res.status(200).json(result);
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * GET /api/v1/tours/slug/:slug
   * Récupère un tour par slug
   */
  getTourBySlug = async (req, res) => {
    try {
      const { slug } = req.params;
      const result = await this.tourService.getTourBySlug(slug);

      res.status(200).json(result);
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * POST /api/v1/tours
   * Crée un nouveau tour
   */
  createTour = async (req, res) => {
    try {
      const tourData = req.body;
      const result = await this.tourService.createTour(tourData);

      res.status(201).json(result);
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * PUT /api/v1/tours/:id
   * Met à jour un tour
   */
  updateTour = async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const result = await this.tourService.updateTour(id, updateData);

      res.status(200).json(result);
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * DELETE /api/v1/tours/:id
   * Supprime un tour
   */
  deleteTour = async (req, res) => {
    try {
      const { id } = req.params;
      const result = await this.tourService.deleteTour(id);

      res.status(200).json(result);
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * GET /api/v1/tours/popular
   * Récupère les tours populaires
   */
  getPopularTours = async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 5;
      const result = await this.tourService.getPopularTours(limit);

      res.status(200).json(result);
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * POST /api/v1/tours/:id/calculate-price
   * Calcule le prix pour un nombre de participants
   */
  calculatePrice = async (req, res) => {
    try {
      const { id } = req.params;
      const { participants, promoCode } = req.body;

      if (!participants || participants < 1) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_PARTICIPANTS",
            message: "Le nombre de participants doit être au moins 1",
          },
        });
      }

      const result = await this.tourService.calculatePrice(
        id,
        participants,
        promoCode
      );

      res.status(200).json(result);
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * Gestion centralisée des erreurs
   * @private
   */
  _handleError(res, error) {
    console.error("TourController Error:", error);

    // Erreurs métier (TourServiceError)
    if (error.code && error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }

    // Erreurs Sequelize de validation
    if (error.name === "SequelizeValidationError") {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: error.errors.map((e) => e.message).join(", "),
        },
      });
    }

    // Erreurs génériques
    res.status(500).json({
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "Une erreur interne est survenue",
      },
    });
  }
}

// Export d'une instance par défaut
const tourController = new TourController();

export { TourController };
export default tourController;
