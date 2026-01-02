/**
 * Routes Destinations - Version Sequelize ORM
 * Tour Catalog Service - Leçon 2.6
 */

import { Router } from "express";
import * as destinationController from "../controllers/destination.controller.js";

const router = Router();

/**
 * @route   GET /api/v1/tours-catalog/destinations
 * @desc    Récupère toutes les destinations
 * @query   page, limit, country, search, includeCount
 * @access  Public
 */
router.get("/", destinationController.getAllDestinations);

/**
 * @route   POST /api/v1/tours-catalog/destinations
 * @desc    Crée une nouvelle destination
 * @body    { name, country, region, description, image, coordinates }
 * @access  Private (Admin)
 */
router.post("/", destinationController.createDestination);

/**
 * @route   GET /api/v1/tours-catalog/destinations/countries
 * @desc    Liste des pays disponibles
 * @access  Public
 */
router.get("/countries", destinationController.getCountries);

/**
 * @route   GET /api/v1/tours-catalog/destinations/slug/:slug
 * @desc    Récupère une destination par son slug
 * @param   slug - Slug de la destination
 * @access  Public
 */
router.get("/slug/:slug", destinationController.getDestinationBySlug);

/**
 * @route   GET /api/v1/tours-catalog/destinations/:destinationId
 * @desc    Récupère une destination par son ID
 * @param   destinationId - UUID de la destination
 * @access  Public
 */
router.get("/:destinationId", destinationController.getDestinationById);

/**
 * @route   GET /api/v1/tours-catalog/destinations/:destinationId/tours
 * @desc    Récupère les tours d'une destination
 * @param   destinationId - UUID de la destination
 * @query   page, limit
 * @access  Public
 */
router.get("/:destinationId/tours", destinationController.getDestinationTours);

/**
 * @route   PUT /api/v1/tours-catalog/destinations/:destinationId
 * @desc    Met à jour une destination
 * @param   destinationId - UUID de la destination
 * @body    Champs à mettre à jour
 * @access  Private (Admin)
 */
router.put("/:destinationId", destinationController.updateDestination);

/**
 * @route   PATCH /api/v1/tours-catalog/destinations/:destinationId
 * @desc    Met à jour partiellement une destination
 * @param   destinationId - UUID de la destination
 * @body    Champs à mettre à jour
 * @access  Private (Admin)
 */
router.patch("/:destinationId", destinationController.updateDestination);

/**
 * @route   DELETE /api/v1/tours-catalog/destinations/:destinationId
 * @desc    Supprime une destination (soft delete)
 * @param   destinationId - UUID de la destination
 * @access  Private (Admin)
 */
router.delete("/:destinationId", destinationController.deleteDestination);

export default router;
