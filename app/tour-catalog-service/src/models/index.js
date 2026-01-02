/**
 * Initialisation de Sequelize et chargement des modèles
 * Tour Catalog Service - Leçon 2.6
 *
 * Ce fichier centralise la configuration de la base de données
 * et l'initialisation de tous les modèles ORM.
 */

import { Sequelize } from "sequelize";
import databaseConfig from "../config/database.js";

// Import des modèles
import TourModel from "./Tour.js";
import CategoryModel from "./Category.js";
import DestinationModel from "./Destination.js";

const env = process.env.NODE_ENV || "development";
const config = databaseConfig[env];

// Créer l'instance Sequelize
const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    port: config.port,
    dialect: config.dialect,
    logging: config.logging,
    define: config.define,
    pool: config.pool,
  }
);

// Initialiser les modèles
const Tour = TourModel(sequelize);
const Category = CategoryModel(sequelize);
const Destination = DestinationModel(sequelize);

// Définir les associations

// Une catégorie a plusieurs tours
Category.hasMany(Tour, {
  foreignKey: "categoryId",
  as: "tours",
});
Tour.belongsTo(Category, {
  foreignKey: "categoryId",
  as: "category",
});

// Une destination a plusieurs tours
Destination.hasMany(Tour, {
  foreignKey: "destinationId",
  as: "tours",
});
Tour.belongsTo(Destination, {
  foreignKey: "destinationId",
  as: "destination",
});

// Objet db pour l'export
const db = {
  sequelize,
  Sequelize,
  Tour,
  Category,
  Destination,
};

export default db;
export { sequelize, Tour, Category, Destination };
