/**
 * Conteneur d'Injection de Dépendances - Module 3 - DIP
 *
 * Ce module implémente le principe d'Inversion de Dépendances (DIP).
 * Les dépendances sont injectées plutôt que créées directement,
 * permettant :
 * - Testabilité (injection de mocks)
 * - Découplage (changement d'implémentation facile)
 * - Configuration centralisée
 */

import Booking from "../models/Booking.js";
import BookingRepository from "../repositories/BookingRepository.js";
import { BookingService } from "../services/BookingService.js";
import tourCatalogService from "../services/tourCatalogService.js";
import rabbitmqProducer from "../services/rabbitmqProducer.js"; // Module 5

/**
 * Logger simple avec horodatage
 */
const logger = {
  info: (message, meta = {}) => {
    console.log(
      `[${new Date().toISOString()}] INFO: ${message}`,
      JSON.stringify(meta)
    );
  },
  error: (message, meta = {}) => {
    console.error(
      `[${new Date().toISOString()}] ERROR: ${message}`,
      JSON.stringify(meta)
    );
  },
  warn: (message, meta = {}) => {
    console.warn(
      `[${new Date().toISOString()}] WARN: ${message}`,
      JSON.stringify(meta)
    );
  },
  debug: (message, meta = {}) => {
    if (process.env.DEBUG === "true") {
      console.log(
        `[${new Date().toISOString()}] DEBUG: ${message}`,
        JSON.stringify(meta)
      );
    }
  },
};

/**
 * Crée et configure toutes les dépendances
 * @returns {Object} Conteneur avec toutes les instances
 */
function createContainer() {
  // Couche Repository - accès aux données
  const bookingRepository = new BookingRepository(Booking);

  // Couche Service - logique métier (avec event publisher - Module 5)
  const bookingService = new BookingService({
    bookingRepository,
    tourCatalogService,
    eventPublisher: rabbitmqProducer, // Module 5: Publication événements RabbitMQ
    logger,
  });

  return {
    // Instances
    bookingRepository,
    bookingService,
    tourCatalogService,
    eventPublisher: rabbitmqProducer, // Module 5
    logger,

    // Modèles (pour cas spéciaux)
    models: {
      Booking,
    },
  };
}

// Instance singleton du conteneur
let containerInstance = null;

/**
 * Obtient l'instance du conteneur (singleton)
 * @returns {Object} Conteneur avec toutes les instances
 */
function getContainer() {
  if (!containerInstance) {
    containerInstance = createContainer();
  }
  return containerInstance;
}

/**
 * Réinitialise le conteneur (utile pour les tests)
 */
function resetContainer() {
  containerInstance = null;
}

/**
 * Crée un conteneur avec des dépendances personnalisées (pour les tests)
 * @param {Object} customDependencies - Dépendances à substituer
 * @returns {Object} Conteneur avec dépendances personnalisées
 */
function createTestContainer(customDependencies = {}) {
  const defaultContainer = createContainer();

  // Fusionner avec les dépendances personnalisées
  const mergedContainer = {
    ...defaultContainer,
    ...customDependencies,
  };

  // Recréer le service avec les dépendances potentiellement mockées
  if (
    customDependencies.bookingRepository ||
    customDependencies.tourCatalogService
  ) {
    mergedContainer.bookingService = new BookingService({
      bookingRepository:
        customDependencies.bookingRepository ||
        defaultContainer.bookingRepository,
      tourCatalogService:
        customDependencies.tourCatalogService ||
        defaultContainer.tourCatalogService,
      logger: customDependencies.logger || logger,
    });
  }

  return mergedContainer;
}

export {
  createContainer,
  getContainer,
  resetContainer,
  createTestContainer,
  logger,
};

export default getContainer;
