import * as TourModel from '../models/tourModel.js';
import { sendSuccess, sendError, createPagination } from '../utils/response.js';
import { NotFoundError } from '../middleware/errorHandler.js';

/**
 * Récupère toutes les visites avec filtres et pagination
 */
export const getAllTours = (req, res, next) => {
  try {
    const { page, limit, category, destination, minPrice, maxPrice, difficulty, sort, order } = req.query;

    const filters = { page, limit, category, destination, minPrice, maxPrice, difficulty, sort, order };
    const { tours, totalItems } = TourModel.findAll(filters);

    const pagination = createPagination(page, limit, totalItems);

    sendSuccess(res, { tours, pagination });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupère une visite par ID
 */
export const getTourById = (req, res, next) => {
  try {
    const { tourId } = req.params;
    const tour = TourModel.findById(tourId);

    if (!tour) {
      throw new NotFoundError(
        'The requested tour does not exist',
        'TOUR_NOT_FOUND',
        { tourId }
      );
    }

    sendSuccess(res, { tour });
  } catch (error) {
    next(error);
  }
};

/**
 * Crée une nouvelle visite
 */
export const createTour = (req, res, next) => {
  try {
    const tourData = req.body;

    // Validation basique
    if (!tourData.title || !tourData.price || !tourData.categoryId || !tourData.destinationId) {
      return sendError(
        res,
        'VALIDATION_ERROR',
        'Missing required fields',
        {
          required: ['title', 'price', 'categoryId', 'destinationId']
        },
        400
      );
    }

    const newTour = TourModel.create(tourData);
    sendSuccess(res, { tour: newTour }, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Met à jour complètement une visite
 */
export const updateTour = (req, res, next) => {
  try {
    const { tourId } = req.params;
    const tourData = req.body;

    const updatedTour = TourModel.update(tourId, tourData);

    if (!updatedTour) {
      throw new NotFoundError(
        'The requested tour does not exist',
        'TOUR_NOT_FOUND',
        { tourId }
      );
    }

    sendSuccess(res, { tour: updatedTour });
  } catch (error) {
    next(error);
  }
};

/**
 * Met à jour partiellement une visite
 */
export const patchTour = (req, res, next) => {
  try {
    const { tourId } = req.params;
    const updates = req.body;

    const updatedTour = TourModel.partialUpdate(tourId, updates);

    if (!updatedTour) {
      throw new NotFoundError(
        'The requested tour does not exist',
        'TOUR_NOT_FOUND',
        { tourId }
      );
    }

    sendSuccess(res, { tour: updatedTour });
  } catch (error) {
    next(error);
  }
};

/**
 * Supprime une visite
 */
export const deleteTour = (req, res, next) => {
  try {
    const { tourId } = req.params;
    const deleted = TourModel.remove(tourId);

    if (!deleted) {
      throw new NotFoundError(
        'The requested tour does not exist',
        'TOUR_NOT_FOUND',
        { tourId }
      );
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
