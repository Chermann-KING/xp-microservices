/**
 * Server Entry Point - Booking Management Service
 * Module 5 - Event-Driven Architecture avec RabbitMQ
 */

import dotenv from "dotenv";
import app from "./src/app.js";
import db from "./src/models/index.js";
import { getContainer } from "./src/config/container.js"; // Module 5

dotenv.config();

const PORT = process.env.PORT || 3002;

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

    // MODULE 5: Connexion RabbitMQ Producer
    const container = getContainer();
    if (container.eventPublisher && process.env.RABBITMQ_URL) {
      try {
        await container.eventPublisher.connect();
        console.log("✅ RabbitMQ Producer connecté (Module 5)");
      } catch (error) {
        console.warn(
          "⚠️  RabbitMQ non disponible - mode dégradé (pas d'événements)"
        );
      }
    }

    // Démarrer le serveur Express
    const server = app.listen(PORT, () => {
      console.log(`🚀 Booking Management Service running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV}`);
      console.log(
        `🔗 API Base URL: http://localhost:${PORT}${process.env.API_BASE_PATH}/${process.env.API_VERSION}/booking-management`
      );
      console.log(
        `🗄️  Database: ${process.env.DB_NAME || "booking_management_dev"}`
      );
    });

    return { server, container };
  } catch (error) {
    console.error("❌ Impossible de démarrer le serveur:", error.message);

    if (error.message.includes("connect ECONNREFUSED")) {
      console.error(
        "💡 Assurez-vous que PostgreSQL est démarré et accessible."
      );
    }

    process.exit(1);
  }
}

// Gestion des arrêts propres
let appContainer;

process.on("SIGINT", async () => {
  console.log("\n🛑 Arrêt du serveur...");

  // MODULE 5: Fermer connexion RabbitMQ
  if (appContainer?.eventPublisher) {
    await appContainer.eventPublisher.disconnect();
  }

  await db.sequelize.close();
  console.log("✅ Connexion à la base de données fermée.");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Signal SIGTERM reçu...");

  // MODULE 5: Fermer connexion RabbitMQ
  if (appContainer?.eventPublisher) {
    await appContainer.eventPublisher.disconnect();
  }

  await db.sequelize.close();
  process.exit(0);
});

// Démarrer le serveur
startServer().then(({ server, container }) => {
  appContainer = container;
});
