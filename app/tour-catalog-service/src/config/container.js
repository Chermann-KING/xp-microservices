/**
 * Dependency Injection Container - Module 3 - DIP
 * 
 * Ce container centralise la création et l'injection des dépendances.
 * Il implémente le principe DIP (Dependency Inversion Principle) en 
 * permettant aux modules de haut niveau de dépendre d'abstractions.
 * 
 * Principes SOLID appliqués :
 * - DIP : Les dépendances sont injectées, pas instanciées directement
 * - SRP : Ce fichier ne fait QUE la gestion des dépendances
 * 
 * Pattern utilisé : Service Locator / Simple DI Container
 */

import { Tour, Category, Destination, sequelize } from '../models/index.js';
import TourRepository from '../repositories/TourRepository.js';
import TourService from '../services/TourService.js';

/**
 * Container simple pour l'injection de dépendances
 * Utilise le pattern Factory pour créer les instances
 */
class Container {
  constructor() {
    this.services = new Map();
    this.factories = new Map();
    this.singletons = new Map();
  }

  /**
   * Enregistre une factory pour créer une instance à la demande
   * @param {string} name - Nom du service
   * @param {Function} factory - Fonction factory
   * @param {Object} options - Options (singleton: true/false)
   */
  register(name, factory, options = {}) {
    this.factories.set(name, { factory, options });
  }

  /**
   * Enregistre une instance directement (singleton)
   * @param {string} name - Nom du service
   * @param {*} instance - Instance du service
   */
  registerInstance(name, instance) {
    this.singletons.set(name, instance);
  }

  /**
   * Récupère une instance du service
   * @param {string} name - Nom du service
   * @returns {*} Instance du service
   */
  resolve(name) {
    // Vérifier les singletons d'abord
    if (this.singletons.has(name)) {
      return this.singletons.get(name);
    }

    // Vérifier les factories
    const registration = this.factories.get(name);
    if (!registration) {
      throw new Error(`Service '${name}' non enregistré dans le container`);
    }

    const { factory, options } = registration;

    // Si singleton, créer une seule fois
    if (options.singleton) {
      if (!this.services.has(name)) {
        this.services.set(name, factory(this));
      }
      return this.services.get(name);
    }

    // Sinon, créer une nouvelle instance
    return factory(this);
  }

  /**
   * Vérifie si un service est enregistré
   * @param {string} name
   * @returns {boolean}
   */
  has(name) {
    return this.factories.has(name) || this.singletons.has(name);
  }

  /**
   * Réinitialise le container (utile pour les tests)
   */
  reset() {
    this.services.clear();
  }
}

/**
 * Crée et configure le container avec toutes les dépendances
 * @returns {Container}
 */
function createContainer() {
  const container = new Container();

  // ===== INFRASTRUCTURE =====
  
  // Modèles Sequelize (singletons)
  container.registerInstance('models', { Tour, Category, Destination });
  container.registerInstance('sequelize', sequelize);

  // Logger (peut être remplacé par Winston, Pino, etc.)
  container.registerInstance('logger', {
    info: (message, meta) => console.log(`[INFO] ${message}`, meta || ''),
    warn: (message, meta) => console.warn(`[WARN] ${message}`, meta || ''),
    error: (message, meta) => console.error(`[ERROR] ${message}`, meta || ''),
    debug: (message, meta) => console.debug(`[DEBUG] ${message}`, meta || '')
  });

  // ===== REPOSITORIES (Data Access Layer) =====
  
  container.register('tourRepository', (c) => {
    const models = c.resolve('models');
    return new TourRepository({
      Tour: models.Tour,
      Category: models.Category,
      Destination: models.Destination
    });
  }, { singleton: true });

  // ===== SERVICES (Business Logic Layer) =====
  
  container.register('tourService', (c) => {
    return new TourService({
      tourRepository: c.resolve('tourRepository'),
      logger: c.resolve('logger')
    });
  }, { singleton: true });

  return container;
}

// Export d'une instance singleton du container
const container = createContainer();

export { Container, createContainer };
export default container;
