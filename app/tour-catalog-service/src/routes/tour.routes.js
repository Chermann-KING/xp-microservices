/**
 * Routes Tours - Version Sequelize ORM
 * Tour Catalog Service - Leçon 2.6
 */

import { Router } from 'express';
import * as tourController from '../controllers/tour.controller.js';

const router = Router();

/**
 * @route   GET /api/v1/tours-catalog/tours
 * @desc    Récupère toutes les visites avec filtres et pagination
 * @query   page, limit, category, destination, minPrice, maxPrice, difficulty, sort, order, search
 * @access  Public
 */
router.get('/', tourController.getAllTours);

/**
 * @route   POST /api/v1/tours-catalog/tours
 * @desc    Crée une nouvelle visite
 * @body    { title, description, price, categoryId, destinationId, ... }
 * @access  Private (Admin)
 */
router.post('/', tourController.createTour);

/**
 * @route   GET /api/v1/tours-catalog/tours/slug/:slug
 * @desc    Récupère une visite par son slug
 * @param   slug - Slug de la visite
 * @access  Public
 */
router.get('/slug/:slug', tourController.getTourBySlug);

/**
 * @route   GET /api/v1/tours-catalog/tours/:tourId
 * @desc    Récupère une visite par son ID
 * @param   tourId - UUID de la visite
 * @access  Public
 */
router.get('/:tourId', tourController.getTourById);

/**
 * @route   PUT /api/v1/tours-catalog/tours/:tourId
 * @desc    Met à jour complètement une visite
 * @param   tourId - UUID de la visite
 * @body    Tous les champs de la visite
 * @access  Private (Admin)
 */
router.put('/:tourId', tourController.updateTour);

/**
 * @route   PATCH /api/v1/tours-catalog/tours/:tourId
 * @desc    Met à jour partiellement une visite
 * @param   tourId - UUID de la visite
 * @body    Champs à mettre à jour
 * @access  Private (Admin)
 */
router.patch('/:tourId', tourController.patchTour);

/**
 * @route   DELETE /api/v1/tours-catalog/tours/:tourId
 * @desc    Supprime une visite (soft delete)
 * @param   tourId - UUID de la visite
 * @access  Private (Admin)
 */
router.delete('/:tourId', tourController.deleteTour);

export default router;
