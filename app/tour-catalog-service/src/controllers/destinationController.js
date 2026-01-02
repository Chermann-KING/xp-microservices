import * as DestinationModel from "../models/destinationModel.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { NotFoundError } from "../middleware/errorHandler.js";

export const getAllDestinations = (req, res, next) => {
  try {
    const destinations = DestinationModel.findAll();
    sendSuccess(res, { destinations });
  } catch (error) {
    next(error);
  }
};

export const getDestinationById = (req, res, next) => {
  try {
    const { destinationId } = req.params;
    const destination = DestinationModel.findById(destinationId);

    if (!destination) {
      throw new NotFoundError(
        "The requested destination does not exist",
        "DESTINATION_NOT_FOUND",
        { destinationId }
      );
    }

    sendSuccess(res, { destination });
  } catch (error) {
    next(error);
  }
};

export const createDestination = (req, res, next) => {
  try {
    const destinationData = req.body;

    if (!destinationData.name || !destinationData.country) {
      return sendError(
        res,
        "VALIDATION_ERROR",
        "Missing required fields",
        { required: ["name", "country"] },
        400
      );
    }

    const newDestination = DestinationModel.create(destinationData);
    sendSuccess(res, { destination: newDestination }, 201);
  } catch (error) {
    next(error);
  }
};

export const updateDestination = (req, res, next) => {
  try {
    const { destinationId } = req.params;
    const destinationData = req.body;

    const updatedDestination = DestinationModel.update(
      destinationId,
      destinationData
    );

    if (!updatedDestination) {
      throw new NotFoundError(
        "The requested destination does not exist",
        "DESTINATION_NOT_FOUND",
        { destinationId }
      );
    }

    sendSuccess(res, { destination: updatedDestination });
  } catch (error) {
    next(error);
  }
};

export const deleteDestination = (req, res, next) => {
  try {
    const { destinationId } = req.params;
    const deleted = DestinationModel.remove(destinationId);

    if (!deleted) {
      throw new NotFoundError(
        "The requested destination does not exist",
        "DESTINATION_NOT_FOUND",
        { destinationId }
      );
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
