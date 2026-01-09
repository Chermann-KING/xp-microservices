/**
 * Modèle Tour - Sequelize ORM
 * Tour Catalog Service - Leçon 2.6
 *
 * Représente une visite touristique dans le catalogue.
 * Propriété exclusive de ce microservice (Database per Service pattern).
 */

import { DataTypes, Model } from "sequelize";

export default (sequelize) => {
  class Tour extends Model {
    /**
     * Méthode helper pour les associations
     * Appelée automatiquement par models/index.js
     */
    static associate(models) {
      // Associations définies dans models/index.js
    }

    /**
     * Convertit le modèle en format API
     */
    toAPIFormat() {
      return {
        id: this.id,
        title: this.title,
        slug: this.slug,
        description: this.description,
        summary: this.summary,
        price: parseFloat(this.price),
        currency: this.currency,
        duration: this.duration,
        durationUnit: this.durationUnit,
        difficulty: this.difficulty,
        maxGroupSize: this.maxGroupSize,
        bookedSeats: this.bookedSeats,
        availableSeats: this.maxGroupSize - this.bookedSeats,
        ratingsAverage: this.ratingsAverage,
        ratingsQuantity: this.ratingsQuantity,
        imageCover: this.imageCover,
        images: this.images,
        startDates: this.startDates,
        isActive: this.isActive,
        categoryId: this.categoryId,
        destinationId: this.destinationId,
        optimisticLockVersion: this.optimisticLockVersion,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
      };
    }
  }

  Tour.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          notEmpty: { msg: "Le titre est requis" },
          len: {
            args: [3, 255],
            msg: "Le titre doit contenir entre 3 et 255 caractères",
          },
        },
      },
      slug: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: { msg: "La description est requise" },
        },
      },
      summary: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          min: {
            args: [0],
            msg: "Le prix doit être positif",
          },
        },
      },
      currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: "EUR",
        validate: {
          isIn: {
            args: [["EUR", "USD", "GBP"]],
            msg: "Devise non supportée",
          },
        },
      },
      duration: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: {
            args: [1],
            msg: "La durée doit être au moins 1",
          },
        },
      },
      durationUnit: {
        type: DataTypes.ENUM("hours", "days", "weeks"),
        allowNull: false,
        defaultValue: "days",
      },
      difficulty: {
        type: DataTypes.ENUM("easy", "medium", "difficult"),
        allowNull: false,
        defaultValue: "medium",
      },
      maxGroupSize: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 15,
        validate: {
          min: {
            args: [1],
            msg: "La taille du groupe doit être au moins 1",
          },
        },
      },
      ratingsAverage: {
        type: DataTypes.FLOAT,
        defaultValue: 4.5,
        validate: {
          min: {
            args: [1],
            msg: "La note doit être au moins 1",
          },
          max: {
            args: [5],
            msg: "La note ne peut pas dépasser 5",
          },
        },
      },
      ratingsQuantity: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      imageCover: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      images: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: [],
      },
      startDates: {
        type: DataTypes.ARRAY(DataTypes.DATE),
        defaultValue: [],
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      categoryId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "categories",
          key: "id",
        },
      },
      destinationId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: "destinations",
          key: "id",
        },
      },
      bookedSeats: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "Nombre de places réservées (Module 5)",
      },
      optimisticLockVersion: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: "optimistic_lock_version",
        comment: "Version pour optimistic locking (Module 5)",
      },
    },
    {
      sequelize,
      modelName: "Tour",
      tableName: "tours",
      underscored: true,
      timestamps: true,
      indexes: [
        { fields: ["slug"], unique: true },
        { fields: ["category_id"] },
        { fields: ["destination_id"] },
        { fields: ["price"] },
        { fields: ["difficulty"] },
        { fields: ["is_active"] },
      ],
      hooks: {
        beforeValidate: (tour) => {
          // Générer le slug à partir du titre si non fourni
          if (tour.title && !tour.slug) {
            tour.slug = tour.title
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/(^-|-$)/g, "");
          }
        },
      },
    }
  );

  return Tour;
};
