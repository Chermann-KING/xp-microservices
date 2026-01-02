/**
 * Modèle Category - Sequelize ORM
 * Tour Catalog Service - Leçon 2.6
 *
 * Représente une catégorie de visites (Aventure, Culture, etc.)
 */

import { DataTypes, Model } from "sequelize";

export default (sequelize) => {
  class Category extends Model {
    /**
     * Convertit le modèle en format API
     */
    toAPIFormat() {
      return {
        id: this.id,
        name: this.name,
        slug: this.slug,
        description: this.description,
        icon: this.icon,
        isActive: this.isActive,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
      };
    }
  }

  Category.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: { msg: "Le nom de la catégorie est requis" },
          len: {
            args: [2, 100],
            msg: "Le nom doit contenir entre 2 et 100 caractères",
          },
        },
      },
      slug: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      icon: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: "Nom de l'icône (ex: hiking, camera, etc.)",
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "Category",
      tableName: "categories",
      underscored: true,
      timestamps: true,
      indexes: [
        { fields: ["slug"], unique: true },
        { fields: ["name"], unique: true },
        { fields: ["is_active"] },
      ],
      hooks: {
        beforeValidate: (category) => {
          // Générer le slug à partir du nom si non fourni
          if (category.name && !category.slug) {
            category.slug = category.name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/(^-|-$)/g, "");
          }
        },
      },
    }
  );

  return Category;
};
