/**
 * @fileoverview Schémas de validation pour les paiements
 */

import Joi from "joi";

export const createPaymentIntentSchema = Joi.object({
  bookingId: Joi.string().uuid().required().messages({
    "string.guid": "bookingId doit être un UUID valide",
    "any.required": "bookingId est requis",
  }),
  amount: Joi.number().positive().precision(2).required().messages({
    "number.positive": "Le montant doit être positif",
    "any.required": "Le montant est requis",
  }),
  currency: Joi.string().length(3).lowercase().default("eur").messages({
    "string.length": "La devise doit être un code ISO à 3 caractères",
  }),
  metadata: Joi.object().default({}),
});

export const refundSchema = Joi.object({
  amount: Joi.number().positive().precision(2).allow(null).messages({
    "number.positive": "Le montant doit être positif",
  }),
  reason: Joi.string().max(500).allow("").default(""),
});

export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});

export default {
  createPaymentIntentSchema,
  refundSchema,
  paginationSchema,
};
