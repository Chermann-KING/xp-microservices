/**
 * Server Entry Point - Tour Catalog Service
 * Leçon 2.6 - Intégration PostgreSQL/Sequelize
 * Module 5 - Event-Driven Architecture avec RabbitMQ
 */

import dotenv from "dotenv";
import app from "./src/app.js";
import db from "./src/models/index.js";
import container from "./src/config/container.js";

// Charger les variables d'environnement
dotenv.config();

const PORT = process.env.PORT || 3001;

/**
 * Démarre le serveur après avoir initialisé la base de données
 */
async function startServer() {
  try {
    // Tester la connexion à la base de données
    await db.sequelize.authenticate();
    console.log("✅ Connexion PostgreSQL établie avec succès.");

    // Synchroniser les modèles (en développement uniquement)
    if (
      process.env.NODE_ENV === "development" &&
      process.env.DB_SYNC === "true"
    ) {
      await db.sequelize.sync({ alter: true });
      console.log("✅ Modèles synchronisés avec la base de données.");
    }

    // MODULE 5 - Initialiser RabbitMQ Producer
    try {
      const rabbitmqProducer = container.resolve("rabbitmqProducer");
      await rabbitmqProducer.connect();
      console.log("✅ RabbitMQ Producer connecté");
    } catch (error) {
      console.warn("⚠️  RabbitMQ Producer non disponible:", error.message);
      console.warn("   Le service continuera sans publication d'événements");
    }

    // MODULE 5 - Initialiser RabbitMQ Consumer
    try {
      const consumer = container.resolve("tourCatalogConsumer");
      await consumer.connect();
      console.log("✅ RabbitMQ Consumer démarré");
    } catch (error) {
      console.warn("⚠️  RabbitMQ Consumer non disponible:", error.message);
      console.warn("   Le service continuera sans écoute d'événements");
    }

    // Démarrer le serveur Express
    app.listen(PORT, () => {
      console.log(`🚀 Tour Catalog Service running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV}`);
      console.log(
        `🔗 API Base URL: http://localhost:${PORT}${process.env.API_BASE_PATH}/${process.env.API_VERSION}/tours-catalog`
      );
      console.log(`🗄️  Database: ${process.env.DB_NAME || "tour_catalog_dev"}`);
    });
  } catch (error) {
    console.error("❌ Impossible de démarrer le serveur:", error.message);

    if (error.message.includes("connect ECONNREFUSED")) {
      console.error(
        "💡 Assurez-vous que PostgreSQL est démarré et accessible."
      );
      console.error(
        "   Vérifiez les variables d'environnement DB_HOST, DB_PORT, DB_USER, DB_PASSWORD."
      );
    }

    process.exit(1);
  }
}

// Gestion des arrêts propres
process.on("SIGINT", async () => {
  console.log("\n🛑 Arrêt du serveur...");

  // Fermer RabbitMQ Producer
  try {
    const rabbitmqProducer = container.resolve("rabbitmqProducer");
    await rabbitmqProducer.disconnect();
    console.log("✅ RabbitMQ Producer fermé");
  } catch (error) {
    // Silencieux si non connecté
  }

  // Fermer RabbitMQ Consumer
  try {
    const consumer = container.resolve("tourCatalogConsumer");
    await consumer.disconnect();
    console.log("✅ RabbitMQ Consumer fermé");
  } catch (error) {
    // Silencieux si non connecté
  }

  await db.sequelize.close();
  console.log("✅ Connexion à la base de données fermée.");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Signal SIGTERM reçu...");

  // Fermer RabbitMQ Producer
  try {
    const rabbitmqProducer = container.resolve("rabbitmqProducer");
    await rabbitmqProducer.disconnect();
  } catch (error) {
    // Silencieux
  }

  // Fermer RabbitMQ Consumer
  try {
    const consumer = container.resolve("tourCatalogConsumer");
    await consumer.disconnect();
  } catch (error) {
    // Silencieux
  }

  await db.sequelize.close();
  process.exit(0);
});

// Démarrer le serveur
startServer();
