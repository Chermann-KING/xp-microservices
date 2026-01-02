/**
 * Routes Categories - Version Sequelize ORM
 * Tour Catalog Service - Leçon 2.6
 */

import { Router } from "express";
import * as categoryController from "../controllers/category.controller.js";

const router = Router();

/**
 * @route   GET /api/v1/tours-catalog/categories
 * @desc    Récupère toutes les catégories
 * @query   page, limit, includeCount
 * @access  Public
 */
router.get("/", categoryController.getAllCategories);

/**
 * @route   POST /api/v1/tours-catalog/categories
 * @desc    Crée une nouvelle catégorie
 * @body    { name, description, icon }
 * @access  Private (Admin)
 */
router.post("/", categoryController.createCategory);

/**
 * @route   GET /api/v1/tours-catalog/categories/slug/:slug
 * @desc    Récupère une catégorie par son slug
 * @param   slug - Slug de la catégorie
 * @access  Public
 */
router.get("/slug/:slug", categoryController.getCategoryBySlug);

/**
 * @route   GET /api/v1/tours-catalog/categories/:categoryId
 * @desc    Récupère une catégorie par son ID
 * @param   categoryId - UUID de la catégorie
 * @access  Public
 */
router.get("/:categoryId", categoryController.getCategoryById);

/**
 * @route   GET /api/v1/tours-catalog/categories/:categoryId/tours
 * @desc    Récupère les tours d'une catégorie
 * @param   categoryId - UUID de la catégorie
 * @query   page, limit
 * @access  Public
 */
router.get("/:categoryId/tours", categoryController.getCategoryTours);

/**
 * @route   PUT /api/v1/tours-catalog/categories/:categoryId
 * @desc    Met à jour une catégorie
 * @param   categoryId - UUID de la catégorie
 * @body    Champs à mettre à jour
 * @access  Private (Admin)
 */
router.put("/:categoryId", categoryController.updateCategory);

/**
 * @route   PATCH /api/v1/tours-catalog/categories/:categoryId
 * @desc    Met à jour partiellement une catégorie
 * @param   categoryId - UUID de la catégorie
 * @body    Champs à mettre à jour
 * @access  Private (Admin)
 */
router.patch("/:categoryId", categoryController.updateCategory);

/**
 * @route   DELETE /api/v1/tours-catalog/categories/:categoryId
 * @desc    Supprime une catégorie (soft delete)
 * @param   categoryId - UUID de la catégorie
 * @access  Private (Admin)
 */
router.delete("/:categoryId", categoryController.deleteCategory);

export default router;
