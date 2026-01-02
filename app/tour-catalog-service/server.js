import dotenv from "dotenv";
import app from "./src/app.js";

// Charger les variables d'environnement
dotenv.config();

const PORT = process.env.PORT || 3001;

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`🚀 Tour Catalog Service running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV}`);
  console.log(
    `🔗 API Base URL: http://localhost:${PORT}${process.env.API_BASE_PATH}/${process.env.API_VERSION}`
  );
});
