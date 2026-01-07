/**
 * @fileoverview Schémas de validation pour l'authentification
 */

import Joi from "joi";

export const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Email invalide",
    "any.required": "L'email est requis",
  }),
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      "string.min": "Le mot de passe doit contenir au moins 8 caractères",
      "string.max": "Le mot de passe ne peut pas dépasser 128 caractères",
      "string.pattern.base":
        "Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre",
      "any.required": "Le mot de passe est requis",
    }),
  firstName: Joi.string().min(2).max(100).required().messages({
    "string.min": "Le prénom doit contenir au moins 2 caractères",
    "string.max": "Le prénom ne peut pas dépasser 100 caractères",
    "any.required": "Le prénom est requis",
  }),
  lastName: Joi.string().min(2).max(100).required().messages({
    "string.min": "Le nom doit contenir au moins 2 caractères",
    "string.max": "Le nom ne peut pas dépasser 100 caractères",
    "any.required": "Le nom est requis",
  }),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Email invalide",
    "any.required": "L'email est requis",
  }),
  password: Joi.string().required().messages({
    "any.required": "Le mot de passe est requis",
  }),
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    "any.required": "Le refresh token est requis",
  }),
});

export const verifyTokenSchema = Joi.object({
  token: Joi.string().required().messages({
    "any.required": "Le token est requis",
  }),
});

export default {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  verifyTokenSchema,
};
