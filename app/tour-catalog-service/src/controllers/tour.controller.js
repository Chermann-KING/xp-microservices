/**
 * Tour Controller - Version Sequelize ORM
 * Tour Catalog Service - Leçon 2.6
 *
 * Ce contrôleur utilise Sequelize pour la persistance PostgreSQL.
 */

import { Tour, Category, Destination } from "../models/index.js";
import { sendSuccess, sendError, createPagination } from "../utils/response.js";
import { NotFoundError, ValidationError } from "../middleware/errorHandler.js";
import { Op } from "sequelize";

/**
 * Récupère toutes les visites avec filtres et pagination
 */
export const getAllTours = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      destination,
      minPrice,
      maxPrice,
      difficulty,
      sort = "createdAt",
      order = "DESC",
      search,
    } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    // Construction des filtres
    const where = { isActive: true };

    if (category) {
      where.categoryId = category;
    }

    if (destination) {
      where.destinationId = destination;
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price[Op.gte] = parseFloat(minPrice);
      if (maxPrice) where.price[Op.lte] = parseFloat(maxPrice);
    }

    if (difficulty) {
      where.difficulty = difficulty;
    }

    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
      ];
    }

    // Requête avec pagination
    const { count, rows: tours } = await Tour.findAndCountAll({
      where,
      include: [
        {
          model: Category,
          as: "category",
          attributes: ["id", "name", "slug"],
        },
        {
          model: Destination,
          as: "destination",
          attributes: ["id", "name", "slug", "country"],
        },
      ],
      order: [[sort, order.toUpperCase()]],
      limit: limitNum,
      offset,
    });

    const pagination = createPagination(pageNum, limitNum, count);

    sendSuccess(res, {
      tours: tours.map((t) => (t.toAPIFormat ? t.toAPIFormat() : t.toJSON())),
      pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupère une visite par ID
 */
export const getTourById = async (req, res, next) => {
  try {
    const { tourId } = req.params;

    const tour = await Tour.findByPk(tourId, {
      include: [
        {
          model: Category,
          as: "category",
          attributes: ["id", "name", "slug", "description"],
        },
        {
          model: Destination,
          as: "destination",
          attributes: [
            "id",
            "name",
            "slug",
            "country",
            "region",
            "coordinates",
          ],
        },
      ],
    });

    if (!tour) {
      throw new NotFoundError(
        "The requested tour does not exist",
        "TOUR_NOT_FOUND",
        { tourId }
      );
    }

    sendSuccess(res, {
      tour: tour.toAPIFormat ? tour.toAPIFormat() : tour.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupère une visite par slug
 */
export const getTourBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const tour = await Tour.findOne({
      where: { slug, isActive: true },
      include: [
        {
          model: Category,
          as: "category",
        },
        {
          model: Destination,
          as: "destination",
        },
      ],
    });

    if (!tour) {
      throw new NotFoundError(
        "The requested tour does not exist",
        "TOUR_NOT_FOUND",
        { slug }
      );
    }

    sendSuccess(res, {
      tour: tour.toAPIFormat ? tour.toAPIFormat() : tour.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Crée une nouvelle visite
 */
export const createTour = async (req, res, next) => {
  try {
    const tourData = req.body;

    // Validation basique
    if (!tourData.title || !tourData.description || !tourData.price) {
      throw new ValidationError("Missing required fields", "VALIDATION_ERROR", {
        required: ["title", "description", "price"],
      });
    }

    // Vérifier que la catégorie existe si fournie
    if (tourData.categoryId) {
      const category = await Category.findByPk(tourData.categoryId);
      if (!category) {
        throw new NotFoundError("Category not found", "CATEGORY_NOT_FOUND", {
          categoryId: tourData.categoryId,
        });
      }
    }

    // Vérifier que la destination existe si fournie
    if (tourData.destinationId) {
      const destination = await Destination.findByPk(tourData.destinationId);
      if (!destination) {
        throw new NotFoundError(
          "Destination not found",
          "DESTINATION_NOT_FOUND",
          { destinationId: tourData.destinationId }
        );
      }
    }

    const newTour = await Tour.create(tourData);

    // Recharger avec les associations
    const tourWithAssociations = await Tour.findByPk(newTour.id, {
      include: [
        { model: Category, as: "category" },
        { model: Destination, as: "destination" },
      ],
    });

    sendSuccess(res, { tour: tourWithAssociations.toAPIFormat() }, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Met à jour complètement une visite
 */
export const updateTour = async (req, res, next) => {
  try {
    const { tourId } = req.params;
    const tourData = req.body;

    const tour = await Tour.findByPk(tourId);

    if (!tour) {
      throw new NotFoundError(
        "The requested tour does not exist",
        "TOUR_NOT_FOUND",
        { tourId }
      );
    }

    // Mettre à jour tous les champs
    await tour.update(tourData);

    // Recharger avec les associations
    const updatedTour = await Tour.findByPk(tourId, {
      include: [
        { model: Category, as: "category" },
        { model: Destination, as: "destination" },
      ],
    });

    sendSuccess(res, { tour: updatedTour.toAPIFormat() });
  } catch (error) {
    next(error);
  }
};

/**
 * Met à jour partiellement une visite
 */
export const patchTour = async (req, res, next) => {
  try {
    const { tourId } = req.params;
    const updates = req.body;

    const tour = await Tour.findByPk(tourId);

    if (!tour) {
      throw new NotFoundError(
        "The requested tour does not exist",
        "TOUR_NOT_FOUND",
        { tourId }
      );
    }

    // Mettre à jour uniquement les champs fournis
    await tour.update(updates);

    // Recharger avec les associations
    const updatedTour = await Tour.findByPk(tourId, {
      include: [
        { model: Category, as: "category" },
        { model: Destination, as: "destination" },
      ],
    });

    sendSuccess(res, { tour: updatedTour.toAPIFormat() });
  } catch (error) {
    next(error);
  }
};

/**
 * Supprime une visite (soft delete - désactivation)
 */
export const deleteTour = async (req, res, next) => {
  try {
    const { tourId } = req.params;

    const tour = await Tour.findByPk(tourId);

    if (!tour) {
      throw new NotFoundError(
        "The requested tour does not exist",
        "TOUR_NOT_FOUND",
        { tourId }
      );
    }

    // Soft delete : désactiver plutôt que supprimer
    await tour.update({ isActive: false });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

/**
 * Supprime définitivement une visite (hard delete)
 */
export const hardDeleteTour = async (req, res, next) => {
  try {
    const { tourId } = req.params;

    const tour = await Tour.findByPk(tourId);

    if (!tour) {
      throw new NotFoundError(
        "The requested tour does not exist",
        "TOUR_NOT_FOUND",
        { tourId }
      );
    }

    await tour.destroy();

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
