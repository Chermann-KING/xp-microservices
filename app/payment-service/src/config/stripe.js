/**
 * @fileoverview Configuration du client Stripe
 */

import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("⚠️  STRIPE_SECRET_KEY non définie - utilisation du mode test");
}

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY || "sk_test_placeholder",
  {
    apiVersion: "2023-10-16",
    typescript: false,
  }
);

export { stripe };
export default stripe;
