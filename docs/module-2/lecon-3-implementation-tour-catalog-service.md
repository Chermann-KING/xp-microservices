# Leçon 2.3 - Implémentation du Microservice Tour Catalog

**Module 2** : Conception et Implémentation des Microservices Principaux

---

## Vue d'ensemble

Après avoir conçu l'API du microservice Tour Catalog dans la leçon précédente, nous allons maintenant transformer cette conception en code fonctionnel. Cette leçon couvre l'implémentation pratique en utilisant Node.js 24.x et Express 4.21.x, en construisant chaque composant du service étape par étape.

Nous commencerons par configurer le projet, puis nous implémenterons les routes, les contrôleurs, les modèles et la logique métier pour gérer les visites, catégories et destinations.

---

## Configuration du Projet

### 1. Initialisation du Projet Node.js

Créez un nouveau répertoire pour le microservice et initialisez un projet Node.js :

```bash
mkdir tour-catalog-service
cd tour-catalog-service
npm init -y
```

### 2. Installation des Dépendances

Installez les packages nécessaires :

```bash
# Dépendances de production
npm install express@4.21.1 dotenv@16.4.7 uuid@11.0.3 cors@2.8.5

# Dépendances de développement
npm install --save-dev nodemon@3.1.9 @types/express@4.17.21 @types/node@24.0.0
```

**Explication des packages :**

- **express** : Framework web pour construire l'API
- **dotenv** : Charge les variables d'environnement depuis un fichier `.env`
- **uuid** : Génère des identifiants uniques universels pour les ressources
- **cors** : Middleware pour gérer les politiques CORS (Cross-Origin Resource Sharing)
- **nodemon** : Outil de développement qui redémarre automatiquement le serveur lors des modifications

### 3. Structure du Projet

Organisez votre projet selon cette structure :

```
tour-catalog-service/
├── src/
│   ├── config/
│   │   └── database.js
│   ├── controllers/
│   │   ├── tourController.js
│   │   ├── categoryController.js
│   │   └── destinationController.js
│   ├── models/
│   │   ├── tourModel.js
│   │   ├── categoryModel.js
│   │   └── destinationModel.js
│   ├── routes/
│   │   ├── tourRoutes.js
│   │   ├── categoryRoutes.js
│   │   └── destinationRoutes.js
│   ├── middleware/
│   │   ├── errorHandler.js
│   │   └── validator.js
│   ├── utils/
│   │   └── response.js
│   └── app.js
├── .env
├── .gitignore
├── package.json
└── server.js
```

### 4. Configuration de package.json

Modifiez votre `package.json` pour ajouter les scripts suivants :

```json
{
  "name": "tour-catalog-service",
  "version": "1.0.0",
  "description": "Tour Catalog Microservice for Tourism Booking Application",
  "main": "server.js",
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "keywords": ["microservice", "tour", "catalog", "rest-api"],
  "author": "",
  "license": "ISC"
}
```

**Note importante :** L'ajout de `"type": "module"` permet d'utiliser la syntaxe ES6 modules (`import`/`export`) au lieu de CommonJS (`require`/`module.exports`).

---

## Configuration de l'Environnement

### Fichier .env

Créez un fichier `.env` à la racine du projet :

```env
NODE_ENV=development
PORT=3001
API_VERSION=v1
API_BASE_PATH=/api
```

### Fichier .gitignore

Créez un fichier `.gitignore` pour exclure les fichiers sensibles :

```
node_modules/
.env
*.log
.DS_Store
```

---

## Implémentation du Serveur Principal

### server.js

```javascript
import dotenv from 'dotenv';
import app from './src/app.js';

// Charger les variables d'environnement
dotenv.config();

const PORT = process.env.PORT || 3001;

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`🚀 Tour Catalog Service running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}${process.env.API_BASE_PATH}/${process.env.API_VERSION}`);
});
```

---

## Configuration de l'Application Express

### src/app.js

```javascript
import express from 'express';
import cors from 'cors';
import tourRoutes from './routes/tourRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import destinationRoutes from './routes/destinationRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Middleware global
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware pour le développement
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Tour Catalog Service is healthy',
    timestamp: new Date().toISOString()
  });
});

// API Routes
const API_BASE = `${process.env.API_BASE_PATH}/${process.env.API_VERSION}/tours-catalog`;

app.use(`${API_BASE}/tours`, tourRoutes);
app.use(`${API_BASE}/categories`, categoryRoutes);
app.use(`${API_BASE}/destinations`, destinationRoutes);

// Route 404 pour les endpoints non trouvés
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    error: {
      code: 'ENDPOINT_NOT_FOUND',
      message: 'The requested endpoint does not exist',
      path: req.path
    }
  });
});

// Middleware de gestion des erreurs (doit être en dernier)
app.use(errorHandler);

export default app;
```

---

## Utilitaires de Réponse

### src/utils/response.js

```javascript
/**
 * Envoie une réponse de succès standardisée
 */
export const sendSuccess = (res, data, statusCode = 200) => {
  res.status(statusCode).json({
    status: 'success',
    data
  });
};

/**
 * Envoie une réponse d'erreur standardisée
 */
export const sendError = (res, code, message, details = null, statusCode = 400) => {
  const errorResponse = {
    status: 'error',
    error: {
      code,
      message
    }
  };

  if (details) {
    errorResponse.error.details = details;
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * Crée un objet de pagination
 */
export const createPagination = (page, limit, totalItems) => {
  const currentPage = parseInt(page) || 1;
  const itemsPerPage = parseInt(limit) || 10;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return {
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage
  };
};
```

---

## Middleware de Gestion des Erreurs

### src/middleware/errorHandler.js

```javascript
/**
 * Middleware de gestion centralisée des erreurs
 */
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Erreurs de validation
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      status: 'error',
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message,
        details: err.details || null
      }
    });
  }

  // Erreurs de ressource non trouvée
  if (err.name === 'NotFoundError') {
    return res.status(404).json({
      status: 'error',
      error: {
        code: err.code || 'RESOURCE_NOT_FOUND',
        message: err.message,
        details: err.details || null
      }
    });
  }

  // Erreur par défaut (500 Internal Server Error)
  res.status(err.statusCode || 500).json({
    status: 'error',
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'development'
        ? err.message
        : 'An unexpected error occurred'
    }
  });
};

/**
 * Classe d'erreur personnalisée pour les ressources non trouvées
 */
export class NotFoundError extends Error {
  constructor(message, code, details = null) {
    super(message);
    this.name = 'NotFoundError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Classe d'erreur personnalisée pour la validation
 */
export class ValidationError extends Error {
  constructor(message, details = null) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}
```

---

## Modèles de Données (In-Memory)

Pour cette première implémentation, nous utiliserons un stockage en mémoire. Dans une leçon ultérieure, nous intégrerons PostgreSQL avec Sequelize.

### src/models/tourModel.js

```javascript
import { v4 as uuidv4 } from 'uuid';

// Stockage en mémoire des visites
let tours = [
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    title: 'Visite de la Tour Eiffel et Croisière sur la Seine',
    description: 'Découvrez les monuments emblématiques de Paris',
    longDescription: 'Cette visite complète vous emmène à travers les sites les plus célèbres de Paris.',
    categoryId: 'c1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    destinationId: 'd7e8f9a0-b1c2-3d4e-5f6a-7b8c9d0e1f2a',
    price: 89.99,
    duration: 4,
    maxGroupSize: 20,
    difficulty: 'easy',
    rating: 4.7,
    ratingsCount: 342,
    images: [
      'https://cdn.example.com/tours/eiffel-tower-1.jpg',
      'https://cdn.example.com/tours/seine-cruise-1.jpg'
    ],
    itinerary: [
      {
        day: 1,
        activities: ['Visite de la Tour Eiffel', 'Croisière sur la Seine']
      }
    ],
    includedItems: ['Guide professionnel', 'Billets d\'entrée', 'Boissons'],
    excludedItems: ['Repas', 'Pourboires'],
    meetingPoint: 'Place du Trocadéro, 75016 Paris',
    createdAt: new Date('2026-02-10T10:30:00Z'),
    updatedAt: new Date('2026-12-15T14:22:00Z')
  }
];

/**
 * Récupère toutes les visites avec filtrage, tri et pagination
 */
export const findAll = (filters = {}) => {
  let result = [...tours];

  // Filtrage par catégorie
  if (filters.category) {
    result = result.filter(tour => tour.categoryId === filters.category);
  }

  // Filtrage par destination
  if (filters.destination) {
    result = result.filter(tour => tour.destinationId === filters.destination);
  }

  // Filtrage par prix
  if (filters.minPrice) {
    result = result.filter(tour => tour.price >= parseFloat(filters.minPrice));
  }
  if (filters.maxPrice) {
    result = result.filter(tour => tour.price <= parseFloat(filters.maxPrice));
  }

  // Tri
  if (filters.sort) {
    const order = filters.order === 'desc' ? -1 : 1;
    result.sort((a, b) => {
      if (a[filters.sort] < b[filters.sort]) return -1 * order;
      if (a[filters.sort] > b[filters.sort]) return 1 * order;
      return 0;
    });
  }

  // Pagination
  const page = parseInt(filters.page) || 1;
  const limit = parseInt(filters.limit) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  const paginatedResult = result.slice(startIndex, endIndex);

  return {
    tours: paginatedResult,
    totalItems: result.length
  };
};

/**
 * Récupère une visite par ID
 */
export const findById = (id) => {
  return tours.find(tour => tour.id === id);
};

/**
 * Crée une nouvelle visite
 */
export const create = (tourData) => {
  const newTour = {
    id: uuidv4(),
    ...tourData,
    rating: 0,
    ratingsCount: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  tours.push(newTour);
  return newTour;
};

/**
 * Met à jour complètement une visite
 */
export const update = (id, tourData) => {
  const index = tours.findIndex(tour => tour.id === id);

  if (index === -1) {
    return null;
  }

  tours[index] = {
    ...tourData,
    id,
    rating: tours[index].rating,
    ratingsCount: tours[index].ratingsCount,
    createdAt: tours[index].createdAt,
    updatedAt: new Date()
  };

  return tours[index];
};

/**
 * Met à jour partiellement une visite
 */
export const partialUpdate = (id, updates) => {
  const index = tours.findIndex(tour => tour.id === id);

  if (index === -1) {
    return null;
  }

  tours[index] = {
    ...tours[index],
    ...updates,
    id,
    updatedAt: new Date()
  };

  return tours[index];
};

/**
 * Supprime une visite
 */
export const remove = (id) => {
  const index = tours.findIndex(tour => tour.id === id);

  if (index === -1) {
    return false;
  }

  tours.splice(index, 1);
  return true;
};
```

### src/models/categoryModel.js

```javascript
import { v4 as uuidv4 } from 'uuid';

// Stockage en mémoire des catégories
let categories = [
  {
    id: 'c1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    name: 'Aventure',
    description: 'Visites riches en adrénaline et activités de plein air',
    imageUrl: 'https://cdn.example.com/categories/adventure.jpg',
    tourCount: 47,
    createdAt: new Date('2026-01-15T08:00:00Z'),
    updatedAt: new Date('2026-01-15T08:00:00Z')
  },
  {
    id: 'e2f3a4b5-c6d7-8e9f-0a1b-2c3d4e5f6a7b',
    name: 'Culturel',
    description: 'Explorez l\'histoire, l\'art et les traditions locales',
    imageUrl: 'https://cdn.example.com/categories/cultural.jpg',
    tourCount: 62,
    createdAt: new Date('2026-01-15T08:00:00Z'),
    updatedAt: new Date('2026-01-15T08:00:00Z')
  }
];

export const findAll = () => categories;

export const findById = (id) => {
  return categories.find(cat => cat.id === id);
};

export const create = (categoryData) => {
  const newCategory = {
    id: uuidv4(),
    ...categoryData,
    tourCount: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  categories.push(newCategory);
  return newCategory;
};

export const update = (id, categoryData) => {
  const index = categories.findIndex(cat => cat.id === id);

  if (index === -1) {
    return null;
  }

  categories[index] = {
    ...categoryData,
    id,
    tourCount: categories[index].tourCount,
    createdAt: categories[index].createdAt,
    updatedAt: new Date()
  };

  return categories[index];
};

export const remove = (id) => {
  const index = categories.findIndex(cat => cat.id === id);

  if (index === -1) {
    return false;
  }

  categories.splice(index, 1);
  return true;
};
```

### src/models/destinationModel.js

```javascript
import { v4 as uuidv4 } from 'uuid';

// Stockage en mémoire des destinations
let destinations = [
  {
    id: 'd7e8f9a0-b1c2-3d4e-5f6a-7b8c9d0e1f2a',
    name: 'Paris',
    country: 'France',
    description: 'La Ville Lumière',
    imageUrl: 'https://cdn.example.com/destinations/paris.jpg',
    tourCount: 89,
    createdAt: new Date('2026-01-15T08:00:00Z'),
    updatedAt: new Date('2026-01-15T08:00:00Z')
  }
];

export const findAll = () => destinations;

export const findById = (id) => {
  return destinations.find(dest => dest.id === id);
};

export const create = (destinationData) => {
  const newDestination = {
    id: uuidv4(),
    ...destinationData,
    tourCount: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  destinations.push(newDestination);
  return newDestination;
};

export const update = (id, destinationData) => {
  const index = destinations.findIndex(dest => dest.id === id);

  if (index === -1) {
    return null;
  }

  destinations[index] = {
    ...destinationData,
    id,
    tourCount: destinations[index].tourCount,
    createdAt: destinations[index].createdAt,
    updatedAt: new Date()
  };

  return destinations[index];
};

export const remove = (id) => {
  const index = destinations.findIndex(dest => dest.id === id);

  if (index === -1) {
    return false;
  }

  destinations.splice(index, 1);
  return true;
};
```

---

## Contrôleurs

### src/controllers/tourController.js

```javascript
import * as TourModel from '../models/tourModel.js';
import { sendSuccess, sendError, createPagination } from '../utils/response.js';
import { NotFoundError } from '../middleware/errorHandler.js';

/**
 * Récupère toutes les visites avec filtres et pagination
 */
export const getAllTours = (req, res, next) => {
  try {
    const { page, limit, category, destination, minPrice, maxPrice, sort, order } = req.query;

    const filters = { page, limit, category, destination, minPrice, maxPrice, sort, order };
    const { tours, totalItems } = TourModel.findAll(filters);

    const pagination = createPagination(page, limit, totalItems);

    sendSuccess(res, { tours, pagination });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupère une visite par ID
 */
export const getTourById = (req, res, next) => {
  try {
    const { tourId } = req.params;
    const tour = TourModel.findById(tourId);

    if (!tour) {
      throw new NotFoundError(
        'The requested tour does not exist',
        'TOUR_NOT_FOUND',
        { tourId }
      );
    }

    sendSuccess(res, { tour });
  } catch (error) {
    next(error);
  }
};

/**
 * Crée une nouvelle visite
 */
export const createTour = (req, res, next) => {
  try {
    const tourData = req.body;

    // Validation basique
    if (!tourData.title || !tourData.price || !tourData.categoryId || !tourData.destinationId) {
      return sendError(
        res,
        'VALIDATION_ERROR',
        'Missing required fields',
        {
          required: ['title', 'price', 'categoryId', 'destinationId']
        },
        400
      );
    }

    const newTour = TourModel.create(tourData);
    sendSuccess(res, { tour: newTour }, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Met à jour complètement une visite
 */
export const updateTour = (req, res, next) => {
  try {
    const { tourId } = req.params;
    const tourData = req.body;

    const updatedTour = TourModel.update(tourId, tourData);

    if (!updatedTour) {
      throw new NotFoundError(
        'The requested tour does not exist',
        'TOUR_NOT_FOUND',
        { tourId }
      );
    }

    sendSuccess(res, { tour: updatedTour });
  } catch (error) {
    next(error);
  }
};

/**
 * Met à jour partiellement une visite
 */
export const patchTour = (req, res, next) => {
  try {
    const { tourId } = req.params;
    const updates = req.body;

    const updatedTour = TourModel.partialUpdate(tourId, updates);

    if (!updatedTour) {
      throw new NotFoundError(
        'The requested tour does not exist',
        'TOUR_NOT_FOUND',
        { tourId }
      );
    }

    sendSuccess(res, { tour: updatedTour });
  } catch (error) {
    next(error);
  }
};

/**
 * Supprime une visite
 */
export const deleteTour = (req, res, next) => {
  try {
    const { tourId } = req.params;
    const deleted = TourModel.remove(tourId);

    if (!deleted) {
      throw new NotFoundError(
        'The requested tour does not exist',
        'TOUR_NOT_FOUND',
        { tourId }
      );
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
```

### src/controllers/categoryController.js

```javascript
import * as CategoryModel from '../models/categoryModel.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { NotFoundError } from '../middleware/errorHandler.js';

export const getAllCategories = (req, res, next) => {
  try {
    const categories = CategoryModel.findAll();
    sendSuccess(res, { categories });
  } catch (error) {
    next(error);
  }
};

export const getCategoryById = (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const category = CategoryModel.findById(categoryId);

    if (!category) {
      throw new NotFoundError(
        'The requested category does not exist',
        'CATEGORY_NOT_FOUND',
        { categoryId }
      );
    }

    sendSuccess(res, { category });
  } catch (error) {
    next(error);
  }
};

export const createCategory = (req, res, next) => {
  try {
    const categoryData = req.body;

    if (!categoryData.name || !categoryData.description) {
      return sendError(
        res,
        'VALIDATION_ERROR',
        'Missing required fields',
        { required: ['name', 'description'] },
        400
      );
    }

    const newCategory = CategoryModel.create(categoryData);
    sendSuccess(res, { category: newCategory }, 201);
  } catch (error) {
    next(error);
  }
};

export const updateCategory = (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const categoryData = req.body;

    const updatedCategory = CategoryModel.update(categoryId, categoryData);

    if (!updatedCategory) {
      throw new NotFoundError(
        'The requested category does not exist',
        'CATEGORY_NOT_FOUND',
        { categoryId }
      );
    }

    sendSuccess(res, { category: updatedCategory });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const deleted = CategoryModel.remove(categoryId);

    if (!deleted) {
      throw new NotFoundError(
        'The requested category does not exist',
        'CATEGORY_NOT_FOUND',
        { categoryId }
      );
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
```

### src/controllers/destinationController.js

```javascript
import * as DestinationModel from '../models/destinationModel.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { NotFoundError } from '../middleware/errorHandler.js';

export const getAllDestinations = (req, res, next) => {
  try {
    const destinations = DestinationModel.findAll();
    sendSuccess(res, { destinations });
  } catch (error) {
    next(error);
  }
};

export const getDestinationById = (req, res, next) => {
  try {
    const { destinationId } = req.params;
    const destination = DestinationModel.findById(destinationId);

    if (!destination) {
      throw new NotFoundError(
        'The requested destination does not exist',
        'DESTINATION_NOT_FOUND',
        { destinationId }
      );
    }

    sendSuccess(res, { destination });
  } catch (error) {
    next(error);
  }
};

export const createDestination = (req, res, next) => {
  try {
    const destinationData = req.body;

    if (!destinationData.name || !destinationData.country) {
      return sendError(
        res,
        'VALIDATION_ERROR',
        'Missing required fields',
        { required: ['name', 'country'] },
        400
      );
    }

    const newDestination = DestinationModel.create(destinationData);
    sendSuccess(res, { destination: newDestination }, 201);
  } catch (error) {
    next(error);
  }
};

export const updateDestination = (req, res, next) => {
  try {
    const { destinationId } = req.params;
    const destinationData = req.body;

    const updatedDestination = DestinationModel.update(destinationId, destinationData);

    if (!updatedDestination) {
      throw new NotFoundError(
        'The requested destination does not exist',
        'DESTINATION_NOT_FOUND',
        { destinationId }
      );
    }

    sendSuccess(res, { destination: updatedDestination });
  } catch (error) {
    next(error);
  }
};

export const deleteDestination = (req, res, next) => {
  try {
    const { destinationId } = req.params;
    const deleted = DestinationModel.remove(destinationId);

    if (!deleted) {
      throw new NotFoundError(
        'The requested destination does not exist',
        'DESTINATION_NOT_FOUND',
        { destinationId }
      );
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
```

---

## Routes

### src/routes/tourRoutes.js

```javascript
import express from 'express';
import {
  getAllTours,
  getTourById,
  createTour,
  updateTour,
  patchTour,
  deleteTour
} from '../controllers/tourController.js';

const router = express.Router();

router.get('/', getAllTours);
router.get('/:tourId', getTourById);
router.post('/', createTour);
router.put('/:tourId', updateTour);
router.patch('/:tourId', patchTour);
router.delete('/:tourId', deleteTour);

export default router;
```

### src/routes/categoryRoutes.js

```javascript
import express from 'express';
import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
} from '../controllers/categoryController.js';

const router = express.Router();

router.get('/', getAllCategories);
router.get('/:categoryId', getCategoryById);
router.post('/', createCategory);
router.put('/:categoryId', updateCategory);
router.delete('/:categoryId', deleteCategory);

export default router;
```

### src/routes/destinationRoutes.js

```javascript
import express from 'express';
import {
  getAllDestinations,
  getDestinationById,
  createDestination,
  updateDestination,
  deleteDestination
} from '../controllers/destinationController.js';

const router = express.Router();

router.get('/', getAllDestinations);
router.get('/:destinationId', getDestinationById);
router.post('/', createDestination);
router.put('/:destinationId', updateDestination);
router.delete('/:destinationId', deleteDestination);

export default router;
```

---

## Test du Microservice

### Démarrer le Serveur

```bash
npm run dev
```

Vous devriez voir :

```
🚀 Tour Catalog Service running on port 3001
📍 Environment: development
🔗 API Base URL: http://localhost:3001/api/v1
```

### Tests avec cURL

#### 1. Health Check

```bash
curl http://localhost:3001/health
```

**Réponse :**

```json
{
  "status": "success",
  "message": "Tour Catalog Service is healthy",
  "timestamp": "2026-08-15T12:00:00.000Z"
}
```

#### 2. Récupérer Toutes les Visites

```bash
curl http://localhost:3001/api/v1/tours-catalog/tours
```

#### 3. Récupérer une Visite Spécifique

```bash
curl http://localhost:3001/api/v1/tours-catalog/tours/550e8400-e29b-41d4-a716-446655440000
```

#### 4. Créer une Nouvelle Visite

```bash
curl -X POST http://localhost:3001/api/v1/tours-catalog/tours \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Visite du Louvre",
    "description": "Explorez le musée du Louvre",
    "categoryId": "e2f3a4b5-c6d7-8e9f-0a1b-2c3d4e5f6a7b",
    "destinationId": "d7e8f9a0-b1c2-3d4e-5f6a-7b8c9d0e1f2a",
    "price": 65.00,
    "duration": 3,
    "maxGroupSize": 15
  }'
```

#### 5. Mettre à Jour Partiellement une Visite

```bash
curl -X PATCH http://localhost:3001/api/v1/tours-catalog/tours/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -d '{
    "price": 79.99
  }'
```

#### 6. Supprimer une Visite

```bash
curl -X DELETE http://localhost:3001/api/v1/tours-catalog/tours/550e8400-e29b-41d4-a716-446655440000
```

#### 7. Récupérer Toutes les Catégories

```bash
curl http://localhost:3001/api/v1/tours-catalog/categories
```

#### 8. Récupérer Toutes les Destinations

```bash
curl http://localhost:3001/api/v1/tours-catalog/destinations
```

---

## Exercices Pratiques

### Exercice 1 : Ajouter un Endpoint de Recherche de Visites

**Objectif :** Implémenter un endpoint de recherche permettant de filtrer les visites par mot-clé dans le titre ou la description.

**Tâches :**

1. Ajouter une fonction `search` dans `tourModel.js` qui filtre par mot-clé
2. Créer un contrôleur `searchTours` dans `tourController.js`
3. Ajouter une route `GET /tours/search` dans `tourRoutes.js`
4. Tester avec cURL : `curl "http://localhost:3001/api/v1/tours-catalog/tours/search?q=eiffel"`

**Indice :**

```javascript
// Dans tourModel.js
export const search = (keyword, filters = {}) => {
  const lowerKeyword = keyword.toLowerCase();
  let result = tours.filter(tour =>
    tour.title.toLowerCase().includes(lowerKeyword) ||
    tour.description.toLowerCase().includes(lowerKeyword)
  );

  // Appliquer pagination...
  return { tours: result, totalItems: result.length };
};
```

### Exercice 2 : Implémenter la Validation des Données d'Entrée

**Objectif :** Créer un middleware de validation pour vérifier que les données de création de visite sont complètes et valides.

**Tâches :**

1. Créer un fichier `src/middleware/validator.js`
2. Implémenter une fonction `validateTourCreation` qui vérifie :
   - `title` est une chaîne non vide
   - `price` est un nombre positif
   - `duration` est un nombre positif
   - `maxGroupSize` est un entier positif
3. Appliquer ce middleware à la route POST `/tours`
4. Tester avec des données invalides pour vérifier les messages d'erreur

**Exemple de Structure :**

```javascript
// src/middleware/validator.js
export const validateTourCreation = (req, res, next) => {
  const errors = [];
  const { title, price, duration, maxGroupSize } = req.body;

  if (!title || typeof title !== 'string' || title.trim() === '') {
    errors.push({ field: 'title', message: 'Title must be a non-empty string' });
  }

  if (!price || typeof price !== 'number' || price <= 0) {
    errors.push({ field: 'price', message: 'Price must be a positive number' });
  }

  // Ajouter d'autres validations...

  if (errors.length > 0) {
    return res.status(400).json({
      status: 'error',
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: { fields: errors }
      }
    });
  }

  next();
};
```

### Exercice 3 : Ajouter des Liens HATEOAS aux Réponses

**Objectif :** Enrichir les réponses de l'endpoint GET `/tours/:tourId` avec des liens HATEOAS.

**Tâches :**

1. Créer une fonction utilitaire `addHateoasLinks` dans `src/utils/response.js`
2. Cette fonction doit ajouter un champ `links` à l'objet tour contenant :
   - `self` : Lien vers la visite
   - `category` : Lien vers la catégorie
   - `destination` : Lien vers la destination
   - `reviews` : Lien vers les avis (fictif pour l'instant)
3. Modifier le contrôleur `getTourById` pour utiliser cette fonction
4. Tester et vérifier que les liens sont présents dans la réponse

**Exemple :**

```javascript
// src/utils/response.js
export const addHateoasLinks = (tour) => {
  const baseUrl = `${process.env.API_BASE_PATH}/${process.env.API_VERSION}/tours-catalog`;

  return {
    ...tour,
    links: {
      self: `${baseUrl}/tours/${tour.id}`,
      category: `${baseUrl}/categories/${tour.categoryId}`,
      destination: `${baseUrl}/destinations/${tour.destinationId}`,
      reviews: `${baseUrl}/tours/${tour.id}/reviews`
    }
  };
};
```

---

## Bonnes Pratiques et Améliorations Futures

### 1. Validation Avancée

Utiliser une bibliothèque comme **Joi** ou **express-validator** pour une validation robuste des données d'entrée.

```bash
npm install joi
```

### 2. Logging Structuré

Implémenter un système de logging avec **Winston** ou **Pino** pour faciliter le débogage et le monitoring.

```bash
npm install winston
```

### 3. Gestion des Environnements

Créer des fichiers `.env.development`, `.env.production` et `.env.test` pour gérer différentes configurations.

### 4. Tests Automatisés

Ajouter des tests unitaires et d'intégration avec **Jest** ou **Mocha**.

```bash
npm install --save-dev jest supertest
```

### 5. Documentation API

Utiliser **Swagger/OpenAPI** pour documenter automatiquement votre API.

```bash
npm install swagger-ui-express swagger-jsdoc
```

### 6. Sécurité

Implémenter des mesures de sécurité :

- **Helmet** : Protège contre les vulnérabilités web courantes
- **Rate Limiting** : Prévient les abus d'API
- **JWT Authentication** : Sécurise les endpoints

```bash
npm install helmet express-rate-limit jsonwebtoken
```

---

## Ressources Complémentaires

- **Express.js Documentation** : [https://expressjs.com/en/4x/api.html](https://expressjs.com/en/4x/api.html)
- **Node.js 24.x Documentation** : [https://nodejs.org/docs/latest-v24.x/api/](https://nodejs.org/docs/latest-v24.x/api/)
- **UUID Package** : [https://www.npmjs.com/package/uuid](https://www.npmjs.com/package/uuid)
- **RESTful API Best Practices** : [https://restfulapi.net/](https://restfulapi.net/)
- **Error Handling in Express** : [https://expressjs.com/en/guide/error-handling.html](https://expressjs.com/en/guide/error-handling.html)

---

## Conclusion

Dans cette leçon, nous avons construit un microservice Tour Catalog fonctionnel utilisant Node.js 24.x et Express 4.21.x. Nous avons implémenté :

- Une structure de projet modulaire et maintenable
- Des routes RESTful pour gérer les visites, catégories et destinations
- Un système de gestion des erreurs centralisé
- Des contrôleurs suivant le principe de séparation des préoccupations
- Un stockage en mémoire pour les données (à remplacer par PostgreSQL dans les leçons suivantes)

Dans la prochaine leçon, nous concevrons l'API pour le microservice Booking Management, qui permettra aux utilisateurs de réserver des visites et de gérer leurs réservations.

---

## Note sur les Concepts Avancés

Cette leçon couvre l'implémentation de base d'un microservice. Les concepts suivants seront abordés dans les modules ultérieurs :

- **Logging Structuré** : Winston/Pino pour logs en production → **Module 6 (Leçon 6.5 - ELK Stack)**
- **Tests Unitaires et d'Intégration** : Jest, Supertest → **Module 7 (Leçons 7.1-7.2)**
- **Validation Avancée** : Joi, express-validator → **Module 3 (Leçon 3.4 - ISP)**
- **Sécurité** : Helmet, rate limiting, CORS configuré → **Module 4 (Leçons 4.4-4.6)**

---

## Navigation

- **⬅️ Précédent** : [Leçon 2.2 - Conception de l'API Tour Catalog](lecon-2-conception-api-tour-catalog.md)
- **➡️ Suivant** : [Leçon 2.4 - Conception de l'API Booking Management](lecon-4-conception-api-booking-management.md)
- **🏠 Retour** : [Sommaire du Module 2](README.md)
