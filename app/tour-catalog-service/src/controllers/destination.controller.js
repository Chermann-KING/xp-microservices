/**
 * Destination Controller - Version Sequelize ORM
 * Tour Catalog Service - Leçon 2.6
 */

import { Destination, Tour } from "../models/index.js";
import { sendSuccess, sendError, createPagination } from "../utils/response.js";
import { NotFoundError, ValidationError } from "../middleware/errorHandler.js";
import { Op } from "sequelize";

/**
 * Récupère toutes les destinations
 */
export const getAllDestinations = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      country,
      search,
      includeCount = "false",
    } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    const where = { isActive: true };

    if (country) {
      where.country = { [Op.iLike]: country };
    }

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { country: { [Op.iLike]: `%${search}%` } },
        { region: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const queryOptions = {
      where,
      order: [["name", "ASC"]],
      limit: limitNum,
      offset,
    };

    // Inclure le nombre de tours par destination si demandé
    if (includeCount === "true") {
      queryOptions.attributes = {
        include: [
          [
            Destination.sequelize.literal(
              '(SELECT COUNT(*) FROM tours WHERE tours.destination_id = "Destination".id AND tours.is_active = true)'
            ),
            "tourCount",
          ],
        ],
      };
    }

    const { count, rows: destinations } = await Destination.findAndCountAll(
      queryOptions
    );

    const pagination = createPagination(pageNum, limitNum, count);

    sendSuccess(res, {
      destinations: destinations.map((d) =>
        d.toAPIFormat ? d.toAPIFormat() : d.toJSON()
      ),
      pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupère une destination par ID
 */
export const getDestinationById = async (req, res, next) => {
  try {
    const { destinationId } = req.params;

    const destination = await Destination.findByPk(destinationId);

    if (!destination) {
      throw new NotFoundError(
        "The requested destination does not exist",
        "DESTINATION_NOT_FOUND",
        { destinationId }
      );
    }

    sendSuccess(res, { destination: destination.toAPIFormat() });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupère une destination par slug
 */
export const getDestinationBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const destination = await Destination.findOne({
      where: { slug, isActive: true },
    });

    if (!destination) {
      throw new NotFoundError(
        "The requested destination does not exist",
        "DESTINATION_NOT_FOUND",
        { slug }
      );
    }

    sendSuccess(res, { destination: destination.toAPIFormat() });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupère les tours d'une destination
 */
export const getDestinationTours = async (req, res, next) => {
  try {
    const { destinationId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    // Vérifier que la destination existe
    const destination = await Destination.findByPk(destinationId);
    if (!destination) {
      throw new NotFoundError(
        "The requested destination does not exist",
        "DESTINATION_NOT_FOUND",
        { destinationId }
      );
    }

    const { count, rows: tours } = await Tour.findAndCountAll({
      where: { destinationId, isActive: true },
      order: [["createdAt", "DESC"]],
      limit: limitNum,
      offset,
    });

    const pagination = createPagination(pageNum, limitNum, count);

    sendSuccess(res, {
      destination: destination.toAPIFormat(),
      tours: tours.map((t) => t.toAPIFormat()),
      pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Liste des pays disponibles
 */
export const getCountries = async (req, res, next) => {
  try {
    const countries = await Destination.findAll({
      attributes: [
        [
          Destination.sequelize.fn(
            "DISTINCT",
            Destination.sequelize.col("country")
          ),
          "country",
        ],
      ],
      where: { isActive: true },
      order: [["country", "ASC"]],
      raw: true,
    });

    sendSuccess(res, {
      countries: countries.map((c) => c.country),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Crée une nouvelle destination
 */
export const createDestination = async (req, res, next) => {
  try {
    const { name, country, region, description, image, coordinates } = req.body;

    if (!name || !country) {
      throw new ValidationError(
        "Name and country are required",
        "VALIDATION_ERROR",
        { required: ["name", "country"] }
      );
    }

    const newDestination = await Destination.create({
      name,
      country,
      region,
      description,
      image,
      coordinates,
    });

    sendSuccess(res, { destination: newDestination.toAPIFormat() }, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Met à jour une destination
 */
export const updateDestination = async (req, res, next) => {
  try {
    const { destinationId } = req.params;
    const updates = req.body;

    const destination = await Destination.findByPk(destinationId);

    if (!destination) {
      throw new NotFoundError(
        "The requested destination does not exist",
        "DESTINATION_NOT_FOUND",
        { destinationId }
      );
    }

    await destination.update(updates);

    sendSuccess(res, { destination: destination.toAPIFormat() });
  } catch (error) {
    next(error);
  }
};

/**
 * Supprime une destination (soft delete)
 */
export const deleteDestination = async (req, res, next) => {
  try {
    const { destinationId } = req.params;

    const destination = await Destination.findByPk(destinationId);

    if (!destination) {
      throw new NotFoundError(
        "The requested destination does not exist",
        "DESTINATION_NOT_FOUND",
        { destinationId }
      );
    }

    // Vérifier s'il y a des tours liés
    const tourCount = await Tour.count({
      where: { destinationId, isActive: true },
    });
    if (tourCount > 0) {
      throw new ValidationError(
        "Cannot delete destination with associated tours",
        "DESTINATION_HAS_TOURS",
        { tourCount }
      );
    }

    await destination.update({ isActive: false });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
