import * as CategoryModel from "../models/categoryModel.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { NotFoundError } from "../middleware/errorHandler.js";

export const getAllCategories = (req, res, next) => {
  try {
    const categories = CategoryModel.findAll();
    sendSuccess(res, { categories });
  } catch (error) {
    next(error);
  }
};

export const getCategoryById = (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const category = CategoryModel.findById(categoryId);

    if (!category) {
      throw new NotFoundError(
        "The requested category does not exist",
        "CATEGORY_NOT_FOUND",
        { categoryId }
      );
    }

    sendSuccess(res, { category });
  } catch (error) {
    next(error);
  }
};

export const createCategory = (req, res, next) => {
  try {
    const categoryData = req.body;

    if (!categoryData.name || !categoryData.description) {
      return sendError(
        res,
        "VALIDATION_ERROR",
        "Missing required fields",
        { required: ["name", "description"] },
        400
      );
    }

    const newCategory = CategoryModel.create(categoryData);
    sendSuccess(res, { category: newCategory }, 201);
  } catch (error) {
    next(error);
  }
};

export const updateCategory = (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const categoryData = req.body;

    const updatedCategory = CategoryModel.update(categoryId, categoryData);

    if (!updatedCategory) {
      throw new NotFoundError(
        "The requested category does not exist",
        "CATEGORY_NOT_FOUND",
        { categoryId }
      );
    }

    sendSuccess(res, { category: updatedCategory });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const deleted = CategoryModel.remove(categoryId);

    if (!deleted) {
      throw new NotFoundError(
        "The requested category does not exist",
        "CATEGORY_NOT_FOUND",
        { categoryId }
      );
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
