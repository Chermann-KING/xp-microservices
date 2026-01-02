import * as AvailabilityService from "../services/availabilityService.js";
import * as TourCatalogService from "../services/tourCatalogService.js";
import { sendSuccess } from "../utils/response.js";
import { NotFoundError, ValidationError } from "../middleware/errorHandler.js";

/**
 * Vérifie la disponibilité d'une visite
 */
export const checkAvailability = async (req, res, next) => {
  try {
    const { tourId, date } = req.query;

    // Validation
    if (!tourId || !date) {
      throw new ValidationError("Missing required parameters", {
        required: ["tourId", "date"],
      });
    }

    // Vérifier l'existence de la visite
    const tour = await TourCatalogService.getTourDetails(tourId);

    if (!tour) {
      throw new NotFoundError(
        "The requested tour does not exist",
        "TOUR_NOT_FOUND",
        { tourId }
      );
    }

    // Récupérer la disponibilité
    const availability = AvailabilityService.getAvailability(
      tourId,
      date,
      tour.maxGroupSize
    );

    // Ajouter les prix
    const enrichedAvailability = {
      ...availability,
      pricePerAdult: tour.price,
      pricePerChild: tour.price * 0.5,
      pricePerInfant: 0.0,
    };

    sendSuccess(res, { availability: enrichedAvailability });
  } catch (error) {
    next(error);
  }
};
