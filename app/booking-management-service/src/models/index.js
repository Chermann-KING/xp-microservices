/**
 * Initialisation de Sequelize et chargement des modèles
 * Booking Management Service - Leçon 2.6
 *
 * Ce service possède sa propre base de données (Database per Service pattern).
 * Il ne partage PAS de tables avec le Tour Catalog Service.
 */

import { Sequelize } from "sequelize";
import databaseConfig from "../config/database.js";

// Import des modèles
import BookingModel from "./Booking.js";

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
const Booking = BookingModel(sequelize);

// Objet db pour l'export
const db = {
  sequelize,
  Sequelize,
  Booking,
};

export default db;
export { sequelize, Booking };
