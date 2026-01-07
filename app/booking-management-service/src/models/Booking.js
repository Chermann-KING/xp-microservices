/**
 * Modèle Booking - Sequelize ORM
 * Booking Management Service - Leçon 2.6
 *
 * Représente une réservation touristique.
 * Intègre la machine à états pour le cycle de vie des réservations.
 *
 * États possibles :
 * - pending: Réservation en attente de confirmation
 * - confirmed: Réservation confirmée
 * - completed: Visite terminée
 * - cancelled: Réservation annulée
 *
 * États de paiement :
 * - pending: En attente de paiement
 * - paid: Paiement réussi
 * - failed: Paiement échoué
 * - refunded: Remboursé
 */

import { DataTypes, Model } from "sequelize";

// Transitions d'état valides
const STATE_TRANSITIONS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled"],
  completed: [], // État final
  cancelled: [], // État final
};

// États de paiement valides
const PAYMENT_STATUS_VALUES = [
  "pending",
  "paid",
  "failed",
  "refunded",
  "partially_refunded",
];

export default (sequelize) => {
  class Booking extends Model {
    /**
     * Vérifie si une transition d'état est valide
     */
    canTransitionTo(newStatus) {
      const allowedTransitions = STATE_TRANSITIONS[this.status] || [];
      return allowedTransitions.includes(newStatus);
    }

    /**
     * Effectue une transition d'état si valide
     */
    async transitionTo(newStatus) {
      if (!this.canTransitionTo(newStatus)) {
        throw new Error(
          `Transition invalide de '${this.status}' vers '${newStatus}'. ` +
            `Transitions autorisées: ${
              STATE_TRANSITIONS[this.status].join(", ") || "aucune"
            }`
        );
      }

      this.status = newStatus;

      // Mettre à jour les timestamps selon l'état
      if (newStatus === "confirmed") {
        this.confirmedAt = new Date();
      } else if (newStatus === "cancelled") {
        this.cancelledAt = new Date();
      } else if (newStatus === "completed") {
        this.completedAt = new Date();
      }

      await this.save();
      return this;
    }

    /**
     * Convertit le modèle en format API
     */
    toAPIFormat() {
      return {
        id: this.id,
        tourId: this.tourId,
        customerId: this.customerId,
        customerName: this.customerName,
        customerEmail: this.customerEmail,
        tourDate: this.tourDate,
        numberOfParticipants: this.numberOfParticipants,
        totalAmount: parseFloat(this.totalAmount),
        currency: this.currency,
        status: this.status,
        paymentStatus: this.paymentStatus,
        specialRequests: this.specialRequests,
        confirmedAt: this.confirmedAt,
        cancelledAt: this.cancelledAt,
        completedAt: this.completedAt,
        cancellationReason: this.cancellationReason,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
        // Métadonnées de la machine à états
        _stateMachine: {
          currentState: this.status,
          allowedTransitions: STATE_TRANSITIONS[this.status] || [],
        },
      };
    }

    /**
     * Met à jour le statut de paiement
     */
    async updatePaymentStatus(paymentStatus) {
      if (!PAYMENT_STATUS_VALUES.includes(paymentStatus)) {
        throw new Error(`Statut de paiement invalide: ${paymentStatus}`);
      }
      this.paymentStatus = paymentStatus;

      // Auto-confirmer si le paiement est réussi et la réservation est pending
      if (paymentStatus === "paid" && this.status === "pending") {
        await this.transitionTo("confirmed");
      } else {
        await this.save();
      }

      return this;
    }
  }

  Booking.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      tourId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment:
          "Référence logique vers Tour Catalog Service (pas de FK réelle - microservices)",
      },
      customerId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: "Référence vers un futur User Service",
      },
      customerName: {
        type: DataTypes.STRING(200),
        allowNull: false,
        validate: {
          notEmpty: { msg: "Le nom du client est requis" },
        },
      },
      customerEmail: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          isEmail: { msg: "Email invalide" },
        },
      },
      customerPhone: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      tourDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: {
          isDate: { msg: "Date invalide" },
          isAfterToday(value) {
            if (new Date(value) < new Date().setHours(0, 0, 0, 0)) {
              throw new Error("La date de la visite doit être dans le futur");
            }
          },
        },
      },
      numberOfParticipants: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: {
          min: {
            args: [1],
            msg: "Au moins 1 participant requis",
          },
          max: {
            args: [50],
            msg: "Maximum 50 participants par réservation",
          },
        },
      },
      totalAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          min: {
            args: [0],
            msg: "Le montant doit être positif",
          },
        },
      },
      currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: "EUR",
      },
      status: {
        type: DataTypes.ENUM("pending", "confirmed", "completed", "cancelled"),
        allowNull: false,
        defaultValue: "pending",
      },
      specialRequests: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Demandes spéciales du client",
      },
      confirmedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      cancelledAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      completedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      cancellationReason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      paymentStatus: {
        type: DataTypes.ENUM(
          "pending",
          "paid",
          "failed",
          "refunded",
          "partially_refunded"
        ),
        allowNull: false,
        defaultValue: "pending",
        comment: "Statut du paiement (synchronisé via payment-service)",
      },
    },
    {
      sequelize,
      modelName: "Booking",
      tableName: "bookings",
      underscored: true,
      timestamps: true,
      indexes: [
        { fields: ["tour_id"] },
        { fields: ["customer_id"] },
        { fields: ["customer_email"] },
        { fields: ["status"] },
        { fields: ["payment_status"] },
        { fields: ["tour_date"] },
        { fields: ["created_at"] },
      ],
    }
  );

  // Exposer les transitions pour utilisation externe
  Booking.STATE_TRANSITIONS = STATE_TRANSITIONS;
  Booking.PAYMENT_STATUS_VALUES = PAYMENT_STATUS_VALUES;

  return Booking;
};
