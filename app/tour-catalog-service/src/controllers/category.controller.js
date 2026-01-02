/**
 * Category Controller - Version Sequelize ORM
 * Tour Catalog Service - Leçon 2.6
 */

import { Category, Tour } from "../models/index.js";
import { sendSuccess, sendError, createPagination } from "../utils/response.js";
import { NotFoundError, ValidationError } from "../middleware/errorHandler.js";
import { Op } from "sequelize";

/**
 * Récupère toutes les catégories
 */
export const getAllCategories = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, includeCount = "false" } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    const queryOptions = {
      where: { isActive: true },
      order: [["name", "ASC"]],
      limit: limitNum,
      offset,
    };

    // Inclure le nombre de tours par catégorie si demandé
    if (includeCount === "true") {
      queryOptions.attributes = {
        include: [
          [
            Category.sequelize.literal(
              '(SELECT COUNT(*) FROM tours WHERE tours.category_id = "Category".id AND tours.is_active = true)'
            ),
            "tourCount",
          ],
        ],
      };
    }

    const { count, rows: categories } = await Category.findAndCountAll(
      queryOptions
    );

    const pagination = createPagination(pageNum, limitNum, count);

    sendSuccess(res, {
      categories: categories.map((c) =>
        c.toAPIFormat ? c.toAPIFormat() : c.toJSON()
      ),
      pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupère une catégorie par ID
 */
export const getCategoryById = async (req, res, next) => {
  try {
    const { categoryId } = req.params;

    const category = await Category.findByPk(categoryId);

    if (!category) {
      throw new NotFoundError(
        "The requested category does not exist",
        "CATEGORY_NOT_FOUND",
        { categoryId }
      );
    }

    sendSuccess(res, { category: category.toAPIFormat() });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupère une catégorie par slug
 */
export const getCategoryBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const category = await Category.findOne({
      where: { slug, isActive: true },
    });

    if (!category) {
      throw new NotFoundError(
        "The requested category does not exist",
        "CATEGORY_NOT_FOUND",
        { slug }
      );
    }

    sendSuccess(res, { category: category.toAPIFormat() });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupère les tours d'une catégorie
 */
export const getCategoryTours = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    // Vérifier que la catégorie existe
    const category = await Category.findByPk(categoryId);
    if (!category) {
      throw new NotFoundError(
        "The requested category does not exist",
        "CATEGORY_NOT_FOUND",
        { categoryId }
      );
    }

    const { count, rows: tours } = await Tour.findAndCountAll({
      where: { categoryId, isActive: true },
      order: [["createdAt", "DESC"]],
      limit: limitNum,
      offset,
    });

    const pagination = createPagination(pageNum, limitNum, count);

    sendSuccess(res, {
      category: category.toAPIFormat(),
      tours: tours.map((t) => t.toAPIFormat()),
      pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Crée une nouvelle catégorie
 */
export const createCategory = async (req, res, next) => {
  try {
    const { name, description, icon } = req.body;

    if (!name) {
      throw new ValidationError(
        "Category name is required",
        "VALIDATION_ERROR",
        { required: ["name"] }
      );
    }

    // Vérifier l'unicité du nom
    const existingCategory = await Category.findOne({
      where: { name: { [Op.iLike]: name } },
    });

    if (existingCategory) {
      throw new ValidationError(
        "A category with this name already exists",
        "DUPLICATE_CATEGORY",
        { name }
      );
    }

    const newCategory = await Category.create({
      name,
      description,
      icon,
    });

    sendSuccess(res, { category: newCategory.toAPIFormat() }, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Met à jour une catégorie
 */
export const updateCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const updates = req.body;

    const category = await Category.findByPk(categoryId);

    if (!category) {
      throw new NotFoundError(
        "The requested category does not exist",
        "CATEGORY_NOT_FOUND",
        { categoryId }
      );
    }

    await category.update(updates);

    sendSuccess(res, { category: category.toAPIFormat() });
  } catch (error) {
    next(error);
  }
};

/**
 * Supprime une catégorie (soft delete)
 */
export const deleteCategory = async (req, res, next) => {
  try {
    const { categoryId } = req.params;

    const category = await Category.findByPk(categoryId);

    if (!category) {
      throw new NotFoundError(
        "The requested category does not exist",
        "CATEGORY_NOT_FOUND",
        { categoryId }
      );
    }

    // Vérifier s'il y a des tours liés
    const tourCount = await Tour.count({
      where: { categoryId, isActive: true },
    });
    if (tourCount > 0) {
      throw new ValidationError(
        "Cannot delete category with associated tours",
        "CATEGORY_HAS_TOURS",
        { tourCount }
      );
    }

    await category.update({ isActive: false });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
