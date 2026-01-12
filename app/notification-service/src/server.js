import express from "express";
import config from "./config/index.js";
import NotificationConsumer from "./consumers/notificationConsumer.js";

const app = express();
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "notification-service",
    timestamp: new Date().toISOString(),
  });
});

// Démarrage du serveur HTTP
const server = app.listen(config.service.port, () => {
  console.log(
    `🚀 Notification Service démarré sur le port ${config.service.port}`
  );
  console.log(`📊 Environnement: ${config.service.env}`);
});

// Démarrage du consumer RabbitMQ
const consumer = new NotificationConsumer();
consumer.connect();

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n⚠️  Arrêt du service...");
  await consumer.disconnect();
  server.close(() => {
    console.log("✅ Service arrêté");
    process.exit(0);
  });
});

process.on("SIGTERM", async () => {
  await consumer.disconnect();
  server.close();
});
