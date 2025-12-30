/**
 * Serveur Express principal - Application de Réservation Touristique
 * Module 1 : Fondements du Développement Web Moderne et des Microservices
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { testConnection } = require('./config/db');

// Importer les routes
const toursRoutes = require('./routes/tours.routes');
const bookingsRoutes = require('./routes/bookings.routes');

// Initialiser l'application Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware de sécurité
app.use(helmet());

// Configuration CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));

// Parser JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger HTTP
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Route de santé
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Route racine
app.get('/', (req, res) => {
  res.json({
    message: 'Bienvenue sur l\'API Tourism Booking App',
    version: '1.0.0',
    module: 'Module 1 - Fondements',
    endpoints: {
      health: '/health',
      tours: '/api/v1/tours',
      bookings: '/api/v1/bookings',
      documentation: '/api/v1/docs'
    }
  });
});

// Routes API v1
app.use('/api/v1/tours', toursRoutes);
app.use('/api/v1/bookings', bookingsRoutes);

// Route 404 - Non trouvé
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} non trouvée`,
      timestamp: new Date().toISOString()
    }
  });
});

// Gestionnaire d'erreurs global
app.use((err, req, res, next) => {
  console.error('Erreur globale:', err.stack);

  res.status(err.status || 500).json({
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'Une erreur interne est survenue',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// Fonction de démarrage du serveur
async function startServer() {
  try {
    // Tester la connexion à la base de données
    console.log('🔌 Connexion à la base de données...');
    await testConnection();

    // Démarrer le serveur
    app.listen(PORT, () => {
      console.log('\n🚀 Serveur démarré avec succès!');
      console.log(`📍 URL: http://localhost:${PORT}`);
      console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);
      console.log(`\n📚 Documentation API:`);
      console.log(`   - Tours: http://localhost:${PORT}/api/v1/tours`);
      console.log(`   - Bookings: http://localhost:${PORT}/api/v1/bookings`);
      console.log(`   - Health: http://localhost:${PORT}/health`);
      console.log('\n✨ Prêt à accepter des requêtes!\n');
    });

  } catch (error) {
    console.error('❌ Erreur lors du démarrage du serveur:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Démarrer le serveur si ce fichier est exécuté directement
if (require.main === module) {
  startServer();
}

// Export pour les tests
module.exports = app;
