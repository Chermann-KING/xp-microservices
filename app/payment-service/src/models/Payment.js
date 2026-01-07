/**
 * @fileoverview Modèle Payment pour le suivi des transactions
 */

import { DataTypes } from "sequelize";
import { sequelize } from "../config/database.js";

const Payment = sequelize.define(
  "Payment",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    bookingId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "booking_id",
      comment: "ID de la réservation associée",
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "user_id",
      comment: "ID de l'utilisateur",
    },
    stripePaymentIntentId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true,
      field: "stripe_payment_intent_id",
      comment: "ID du PaymentIntent Stripe",
    },
    stripeCustomerId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "stripe_customer_id",
      comment: "ID du Customer Stripe",
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: "Montant en devise principale",
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: "eur",
      comment: "Code devise ISO",
    },
    status: {
      type: DataTypes.ENUM(
        "pending",
        "processing",
        "succeeded",
        "failed",
        "canceled",
        "refunded",
        "partially_refunded"
      ),
      defaultValue: "pending",
      allowNull: false,
    },
    paymentMethod: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: "payment_method",
      comment: "Type de moyen de paiement (card, bank_transfer, etc.)",
    },
    cardLast4: {
      type: DataTypes.STRING(4),
      allowNull: true,
      field: "card_last4",
      comment: "Derniers 4 chiffres de la carte",
    },
    cardBrand: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: "card_brand",
      comment: "Marque de la carte (visa, mastercard, etc.)",
    },
    receiptUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "receipt_url",
      comment: "URL du reçu Stripe",
    },
    refundedAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      field: "refunded_amount",
      comment: "Montant remboursé",
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: "Métadonnées additionnelles",
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "error_message",
      comment: "Message d'erreur en cas d'échec",
    },
  },
  {
    tableName: "payments",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      { fields: ["booking_id"] },
      { fields: ["user_id"] },
      { fields: ["stripe_payment_intent_id"] },
      { fields: ["status"] },
    ],
  }
);

export { Payment };
export default Payment;
