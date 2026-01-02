/**
 * Modèle Destination - Sequelize ORM
 * Tour Catalog Service - Leçon 2.6
 *
 * Représente une destination touristique (Paris, Tokyo, etc.)
 */

import { DataTypes, Model } from "sequelize";

export default (sequelize) => {
  class Destination extends Model {
    /**
     * Convertit le modèle en format API
     */
    toAPIFormat() {
      return {
        id: this.id,
        name: this.name,
        slug: this.slug,
        country: this.country,
        region: this.region,
        description: this.description,
        image: this.image,
        coordinates: this.coordinates,
        isActive: this.isActive,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
      };
    }
  }

  Destination.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(200),
        allowNull: false,
        validate: {
          notEmpty: { msg: "Le nom de la destination est requis" },
          len: {
            args: [2, 200],
            msg: "Le nom doit contenir entre 2 et 200 caractères",
          },
        },
      },
      slug: {
        type: DataTypes.STRING(200),
        allowNull: false,
        unique: true,
      },
      country: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
          notEmpty: { msg: "Le pays est requis" },
        },
      },
      region: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: "Région ou état (ex: Île-de-France, California)",
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      image: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      coordinates: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: "Format: { lat: number, lng: number }",
        validate: {
          isValidCoordinates(value) {
            if (value) {
              if (
                typeof value.lat !== "number" ||
                typeof value.lng !== "number"
              ) {
                throw new Error(
                  "Les coordonnées doivent contenir lat et lng numériques"
                );
              }
              if (value.lat < -90 || value.lat > 90) {
                throw new Error("Latitude invalide");
              }
              if (value.lng < -180 || value.lng > 180) {
                throw new Error("Longitude invalide");
              }
            }
          },
        },
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "Destination",
      tableName: "destinations",
      underscored: true,
      timestamps: true,
      indexes: [
        { fields: ["slug"], unique: true },
        { fields: ["country"] },
        { fields: ["is_active"] },
      ],
      hooks: {
        beforeValidate: (destination) => {
          // Générer le slug à partir du nom si non fourni
          if (destination.name && !destination.slug) {
            destination.slug = destination.name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/(^-|-$)/g, "");
          }
        },
      },
    }
  );

  return Destination;
};
