/**
 * @fileoverview Routes webhook Stripe
 * Note: Ces routes doivent être avant express.json() pour recevoir le raw body
 */

import { Router } from "express";
import express from "express";
import { webhookController } from "../controllers/webhookController.js";

const router = Router();

/**
 * @route POST /webhooks/stripe
 * @desc Réception des événements webhook Stripe
 * @access Public (vérifié par signature Stripe)
 */
router.post(
  "/stripe",
  express.raw({ type: "application/json" }),
  webhookController.handleStripeWebhook.bind(webhookController)
);

export default router;
