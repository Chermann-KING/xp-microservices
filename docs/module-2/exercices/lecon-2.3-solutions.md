# Solutions des Exercices - Leçon 2.3 : Implémentation du Tour Catalog Service

## Exercice 1 : Ajouter un Endpoint de Recherche de Visites

**Objectif :** Implémenter un endpoint de recherche permettant de filtrer les visites par mot-clé dans le titre ou la description.

### Solution Complète

#### 1. Mise à Jour du Modèle (`tourModel.js`)

```javascript
// src/models/tourModel.js
import { v4 as uuidv4 } from 'uuid';

// Base de données en mémoire (simulée)
let tours = [
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    title: 'Visite de la Tour Eiffel et Croisière sur la Seine',
    description: 'Découvrez les monuments emblématiques de Paris avec un guide expert. Cette visite complète inclut un accès prioritaire à la Tour Eiffel et une croisière d\'une heure sur la Seine.',
    categoryId: 'c1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    destinationId: 'd7e8f9a0-b1c2-3d4e-5f6a-7b8c9d0e1f2a',
    price: 89.99,
    currency: 'EUR',
    duration: 4,
    durationUnit: 'hours',
    maxGroupSize: 20,
    rating: 4.7,
    ratingsCount: 342,
    images: [
      'https://cdn.example.com/tours/eiffel-tower-1.jpg',
      'https://cdn.example.com/tours/seine-cruise-1.jpg'
    ],
    createdAt: '2026-02-10T10:30:00Z',
    updatedAt: '2026-12-15T14:22:00Z'
  },
  {
    id: '661f9511-f30c-52e5-b827-557766551111',
    title: 'Visite Guidée du Musée du Louvre',
    description: 'Explorez les trésors du plus grand musée d\'art au monde. Admirez la Joconde, la Vénus de Milo et des milliers d\'œuvres d\'art exceptionnelles.',
    categoryId: 'c1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    destinationId: 'd7e8f9a0-b1c2-3d4e-5f6a-7b8c9d0e1f2a',
    price: 65.00,
    currency: 'EUR',
    duration: 3,
    durationUnit: 'hours',
    maxGroupSize: 15,
    rating: 4.9,
    ratingsCount: 521,
    images: ['https://cdn.example.com/tours/louvre-1.jpg'],
    createdAt: '2026-01-15T08:00:00Z',
    updatedAt: '2026-11-10T12:00:00Z'
  },
  {
    id: '772g0622-g41d-63f6-c938-668877662222',
    title: 'Aventure Alpine : Randonnée et Escalade',
    description: 'Partez à l\'aventure dans les Alpes suisses. Randonnée en montagne, escalade sur rocher et vues panoramiques spectaculaires.',
    categoryId: 'a9b8c7d6-e5f4-3a2b-1c0d-9e8f7a6b5c4d',
    destinationId: 'e8f9a0b1-c2d3-4e5f-6a7b-8c9d0e1f2a3b',
    price: 150.00,
    currency: 'EUR',
    duration: 8,
    durationUnit: 'hours',
    maxGroupSize: 10,
    rating: 4.8,
    ratingsCount: 87,
    images: ['https://cdn.example.com/tours/alpine-adventure-1.jpg'],
    createdAt: '2026-03-20T07:30:00Z',
    updatedAt: '2026-10-05T10:15:00Z'
  }
];

// Fonction de recherche avec filtres
export const search = (keyword, filters = {}) => {
  const lowerKeyword = keyword.toLowerCase().trim();

  // Étape 1 : Filtrer par mot-clé dans title ou description
  let result = tours.filter(tour => {
    const titleMatch = tour.title.toLowerCase().includes(lowerKeyword);
    const descriptionMatch = tour.description.toLowerCase().includes(lowerKeyword);
    return titleMatch || descriptionMatch;
  });

  // Étape 2 : Appliquer les filtres supplémentaires
  if (filters.category) {
    result = result.filter(tour => tour.categoryId === filters.category);
  }

  if (filters.destination) {
    result = result.filter(tour => tour.destinationId === filters.destination);
  }

  if (filters.minPrice !== undefined) {
    result = result.filter(tour => tour.price >= parseFloat(filters.minPrice));
  }

  if (filters.maxPrice !== undefined) {
    result = result.filter(tour => tour.price <= parseFloat(filters.maxPrice));
  }

  if (filters.minRating !== undefined) {
    result = result.filter(tour => tour.rating >= parseFloat(filters.minRating));
  }

  // Étape 3 : Tri
  if (filters.sort) {
    const sortField = filters.sort;
    const order = filters.order === 'desc' ? -1 : 1;

    result.sort((a, b) => {
      if (a[sortField] < b[sortField]) return -1 * order;
      if (a[sortField] > b[sortField]) return 1 * order;
      return 0;
    });
  }

  // Étape 4 : Pagination
  const page = parseInt(filters.page) || 1;
  const limit = parseInt(filters.limit) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  const paginatedResult = result.slice(startIndex, endIndex);

  return {
    tours: paginatedResult,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(result.length / limit),
      totalItems: result.length,
      itemsPerPage: limit,
      hasNextPage: endIndex < result.length,
      hasPreviousPage: page > 1
    }
  };
};

// Garder les autres fonctions existantes
export const findAll = (page = 1, limit = 10) => {
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const paginatedTours = tours.slice(startIndex, endIndex);

  return {
    tours: paginatedTours,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(tours.length / limit),
      totalItems: tours.length,
      itemsPerPage: limit
    }
  };
};

export const findById = (id) => {
  return tours.find(tour => tour.id === id);
};

export const create = (tourData) => {
  const newTour = {
    id: uuidv4(),
    ...tourData,
    rating: 0,
    ratingsCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  tours.push(newTour);
  return newTour;
};

export const update = (id, tourData) => {
  const index = tours.findIndex(tour => tour.id === id);
  if (index === -1) return null;

  tours[index] = {
    ...tours[index],
    ...tourData,
    updatedAt: new Date().toISOString()
  };
  return tours[index];
};

export const remove = (id) => {
  const index = tours.findIndex(tour => tour.id === id);
  if (index === -1) return false;

  tours.splice(index, 1);
  return true;
};
```

---

#### 2. Création du Contrôleur de Recherche (`tourController.js`)

```javascript
// src/controllers/tourController.js
import * as tourModel from '../models/tourModel.js';

// Nouveau contrôleur pour la recherche
export const searchTours = (req, res) => {
  try {
    // Récupération du paramètre de recherche
    const keyword = req.query.q || req.query.query;

    // Validation : le mot-clé est obligatoire
    if (!keyword || keyword.trim() === '') {
      return res.status(400).json({
        status: 'error',
        error: {
          code: 'MISSING_SEARCH_KEYWORD',
          message: 'Search keyword is required',
          details: {
            parameter: 'q or query',
            example: '/tours/search?q=eiffel'
          }
        }
      });
    }

    // Validation : mot-clé trop court
    if (keyword.trim().length < 2) {
      return res.status(400).json({
        status: 'error',
        error: {
          code: 'SEARCH_KEYWORD_TOO_SHORT',
          message: 'Search keyword must be at least 2 characters long',
          details: {
            providedKeyword: keyword,
            minimumLength: 2
          }
        }
      });
    }

    // Extraction des filtres optionnels
    const filters = {
      category: req.query.category,
      destination: req.query.destination,
      minPrice: req.query.minPrice,
      maxPrice: req.query.maxPrice,
      minRating: req.query.minRating,
      sort: req.query.sort,
      order: req.query.order,
      page: req.query.page,
      limit: req.query.limit
    };

    // Validation : minPrice <= maxPrice
    if (filters.minPrice && filters.maxPrice) {
      const min = parseFloat(filters.minPrice);
      const max = parseFloat(filters.maxPrice);
      if (min > max) {
        return res.status(422).json({
          status: 'error',
          error: {
            code: 'INVALID_PRICE_RANGE',
            message: 'Minimum price cannot exceed maximum price',
            details: {
              minPrice: min,
              maxPrice: max
            }
          }
        });
      }
    }

    // Exécution de la recherche
    const result = tourModel.search(keyword, filters);

    // Métadonnées de recherche
    const searchMetadata = {
      query: keyword,
      resultsFound: result.pagination.totalItems,
      executionTimeMs: Math.floor(Math.random() * 100) // Simulation
    };

    // Suggestions si aucun résultat
    if (result.tours.length === 0) {
      searchMetadata.suggestions = [
        'Try removing some filters',
        'Try a broader search term',
        'Check spelling'
      ];
    }

    return res.status(200).json({
      status: 'success',
      data: {
        tours: result.tours,
        pagination: result.pagination,
        searchMetadata
      }
    });

  } catch (error) {
    console.error('Error in searchTours:', error);
    return res.status(500).json({
      status: 'error',
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred while searching tours'
      }
    });
  }
};

// Contrôleurs existants...
export const getAllTours = (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const result = tourModel.findAll(page, limit);

  return res.status(200).json({
    status: 'success',
    data: result
  });
};

export const getTourById = (req, res) => {
  const tour = tourModel.findById(req.params.tourId);

  if (!tour) {
    return res.status(404).json({
      status: 'error',
      error: {
        code: 'TOUR_NOT_FOUND',
        message: 'The requested tour does not exist',
        details: { tourId: req.params.tourId }
      }
    });
  }

  return res.status(200).json({
    status: 'success',
    data: { tour }
  });
};

export const createTour = (req, res) => {
  const newTour = tourModel.create(req.body);
  return res.status(201).json({
    status: 'success',
    data: { tour: newTour }
  });
};

export const updateTour = (req, res) => {
  const updatedTour = tourModel.update(req.params.tourId, req.body);

  if (!updatedTour) {
    return res.status(404).json({
      status: 'error',
      error: {
        code: 'TOUR_NOT_FOUND',
        message: 'The requested tour does not exist'
      }
    });
  }

  return res.status(200).json({
    status: 'success',
    data: { tour: updatedTour }
  });
};

export const deleteTour = (req, res) => {
  const success = tourModel.remove(req.params.tourId);

  if (!success) {
    return res.status(404).json({
      status: 'error',
      error: {
        code: 'TOUR_NOT_FOUND',
        message: 'The requested tour does not exist'
      }
    });
  }

  return res.status(204).send();
};
```

---

#### 3. Ajout de la Route (`tourRoutes.js`)

```javascript
// src/routes/tourRoutes.js
import express from 'express';
import * as tourController from '../controllers/tourController.js';

const router = express.Router();

// IMPORTANT : La route /search doit être AVANT /tours/:tourId
// Sinon, Express interprétera "search" comme un :tourId
router.get('/search', tourController.searchTours);

// Routes CRUD standards
router.get('/', tourController.getAllTours);
router.get('/:tourId', tourController.getTourById);
router.post('/', tourController.createTour);
router.patch('/:tourId', tourController.updateTour);
router.delete('/:tourId', tourController.deleteTour);

export default router;
```

**Note critique :** L'ordre des routes est important ! La route `/search` doit être déclarée **avant** `/:tourId`, sinon Express interprétera "search" comme une valeur de `tourId`.

---

#### 4. Tests avec cURL

**Test 1 : Recherche simple par mot-clé**

```bash
curl "http://localhost:3001/api/v1/tours-catalog/tours/search?q=eiffel"
```

**Réponse attendue :**

```json
{
  "status": "success",
  "data": {
    "tours": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "title": "Visite de la Tour Eiffel et Croisière sur la Seine",
        "description": "Découvrez les monuments emblématiques de Paris...",
        "price": 89.99,
        ...
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 1,
      "itemsPerPage": 10,
      "hasNextPage": false,
      "hasPreviousPage": false
    },
    "searchMetadata": {
      "query": "eiffel",
      "resultsFound": 1,
      "executionTimeMs": 42
    }
  }
}
```

---

**Test 2 : Recherche avec filtres de prix**

```bash
curl "http://localhost:3001/api/v1/tours-catalog/tours/search?q=visite&minPrice=50&maxPrice=100"
```

---

**Test 3 : Recherche avec tri par prix**

```bash
curl "http://localhost:3001/api/v1/tours-catalog/tours/search?q=paris&sort=price&order=asc"
```

---

**Test 4 : Recherche sans résultat**

```bash
curl "http://localhost:3001/api/v1/tours-catalog/tours/search?q=antarctica"
```

**Réponse attendue :**

```json
{
  "status": "success",
  "data": {
    "tours": [],
    "pagination": {
      "currentPage": 1,
      "totalPages": 0,
      "totalItems": 0,
      "itemsPerPage": 10
    },
    "searchMetadata": {
      "query": "antarctica",
      "resultsFound": 0,
      "executionTimeMs": 18,
      "suggestions": [
        "Try removing some filters",
        "Try a broader search term",
        "Check spelling"
      ]
    }
  }
}
```

---

**Test 5 : Erreur - mot-clé manquant**

```bash
curl "http://localhost:3001/api/v1/tours-catalog/tours/search"
```

**Réponse attendue (400 Bad Request) :**

```json
{
  "status": "error",
  "error": {
    "code": "MISSING_SEARCH_KEYWORD",
    "message": "Search keyword is required",
    "details": {
      "parameter": "q or query",
      "example": "/tours/search?q=eiffel"
    }
  }
}
```

---

**Test 6 : Erreur - fourchette de prix invalide**

```bash
curl "http://localhost:3001/api/v1/tours-catalog/tours/search?q=tour&minPrice=100&maxPrice=50"
```

**Réponse attendue (422 Unprocessable Entity) :**

```json
{
  "status": "error",
  "error": {
    "code": "INVALID_PRICE_RANGE",
    "message": "Minimum price cannot exceed maximum price",
    "details": {
      "minPrice": 100,
      "maxPrice": 50
    }
  }
}
```

---

## Exercice 2 : Implémenter la Validation des Données d'Entrée

**Objectif :** Créer un middleware de validation pour vérifier que les données de création de visite sont complètes et valides.

### Solution Complète

#### 1. Création du Middleware de Validation

```javascript
// src/middleware/validator.js

/**
 * Middleware de validation pour la création de visites
 */
export const validateTourCreation = (req, res, next) => {
  const errors = [];
  const {
    title,
    description,
    price,
    currency,
    duration,
    durationUnit,
    maxGroupSize,
    categoryId,
    destinationId,
    images
  } = req.body;

  // 1. Validation du titre
  if (!title || typeof title !== 'string' || title.trim() === '') {
    errors.push({
      field: 'title',
      message: 'Title must be a non-empty string',
      providedValue: title
    });
  } else if (title.length < 5) {
    errors.push({
      field: 'title',
      message: 'Title must be at least 5 characters long',
      providedValue: title
    });
  } else if (title.length > 200) {
    errors.push({
      field: 'title',
      message: 'Title must not exceed 200 characters',
      providedValue: title
    });
  }

  // 2. Validation de la description
  if (!description || typeof description !== 'string' || description.trim() === '') {
    errors.push({
      field: 'description',
      message: 'Description must be a non-empty string',
      providedValue: description
    });
  } else if (description.length < 20) {
    errors.push({
      field: 'description',
      message: 'Description must be at least 20 characters long',
      providedValue: description
    });
  }

  // 3. Validation du prix
  if (price === undefined || price === null) {
    errors.push({
      field: 'price',
      message: 'Price is required',
      providedValue: price
    });
  } else if (typeof price !== 'number' || isNaN(price)) {
    errors.push({
      field: 'price',
      message: 'Price must be a valid number',
      providedValue: price
    });
  } else if (price <= 0) {
    errors.push({
      field: 'price',
      message: 'Price must be a positive number',
      providedValue: price
    });
  } else if (price > 100000) {
    errors.push({
      field: 'price',
      message: 'Price seems unrealistically high (max: 100,000)',
      providedValue: price
    });
  }

  // 4. Validation de la devise
  const validCurrencies = ['EUR', 'USD', 'GBP', 'JPY', 'CHF'];
  if (!currency || typeof currency !== 'string') {
    errors.push({
      field: 'currency',
      message: 'Currency is required and must be a string',
      providedValue: currency
    });
  } else if (!validCurrencies.includes(currency.toUpperCase())) {
    errors.push({
      field: 'currency',
      message: `Currency must be one of: ${validCurrencies.join(', ')}`,
      providedValue: currency
    });
  }

  // 5. Validation de la durée
  if (duration === undefined || duration === null) {
    errors.push({
      field: 'duration',
      message: 'Duration is required',
      providedValue: duration
    });
  } else if (typeof duration !== 'number' || isNaN(duration)) {
    errors.push({
      field: 'duration',
      message: 'Duration must be a valid number',
      providedValue: duration
    });
  } else if (duration <= 0) {
    errors.push({
      field: 'duration',
      message: 'Duration must be a positive number',
      providedValue: duration
    });
  }

  // 6. Validation de l'unité de durée
  const validDurationUnits = ['hours', 'days', 'weeks'];
  if (!durationUnit || typeof durationUnit !== 'string') {
    errors.push({
      field: 'durationUnit',
      message: 'Duration unit is required and must be a string',
      providedValue: durationUnit
    });
  } else if (!validDurationUnits.includes(durationUnit.toLowerCase())) {
    errors.push({
      field: 'durationUnit',
      message: `Duration unit must be one of: ${validDurationUnits.join(', ')}`,
      providedValue: durationUnit
    });
  }

  // 7. Validation de la taille maximale du groupe
  if (maxGroupSize === undefined || maxGroupSize === null) {
    errors.push({
      field: 'maxGroupSize',
      message: 'Max group size is required',
      providedValue: maxGroupSize
    });
  } else if (typeof maxGroupSize !== 'number' || isNaN(maxGroupSize)) {
    errors.push({
      field: 'maxGroupSize',
      message: 'Max group size must be a valid number',
      providedValue: maxGroupSize
    });
  } else if (!Number.isInteger(maxGroupSize)) {
    errors.push({
      field: 'maxGroupSize',
      message: 'Max group size must be an integer',
      providedValue: maxGroupSize
    });
  } else if (maxGroupSize <= 0) {
    errors.push({
      field: 'maxGroupSize',
      message: 'Max group size must be a positive integer',
      providedValue: maxGroupSize
    });
  } else if (maxGroupSize > 200) {
    errors.push({
      field: 'maxGroupSize',
      message: 'Max group size seems unrealistically high (max: 200)',
      providedValue: maxGroupSize
    });
  }

  // 8. Validation de l'ID de catégorie (UUID v4)
  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!categoryId || typeof categoryId !== 'string') {
    errors.push({
      field: 'categoryId',
      message: 'Category ID is required and must be a string',
      providedValue: categoryId
    });
  } else if (!uuidV4Regex.test(categoryId)) {
    errors.push({
      field: 'categoryId',
      message: 'Category ID must be a valid UUID v4',
      providedValue: categoryId
    });
  }

  // 9. Validation de l'ID de destination (UUID v4)
  if (!destinationId || typeof destinationId !== 'string') {
    errors.push({
      field: 'destinationId',
      message: 'Destination ID is required and must be a string',
      providedValue: destinationId
    });
  } else if (!uuidV4Regex.test(destinationId)) {
    errors.push({
      field: 'destinationId',
      message: 'Destination ID must be a valid UUID v4',
      providedValue: destinationId
    });
  }

  // 10. Validation des images (optionnel mais si fourni, doit être valide)
  if (images !== undefined) {
    if (!Array.isArray(images)) {
      errors.push({
        field: 'images',
        message: 'Images must be an array of URLs',
        providedValue: images
      });
    } else if (images.length > 10) {
      errors.push({
        field: 'images',
        message: 'Cannot upload more than 10 images',
        providedValue: images
      });
    } else {
      // Validation de chaque URL
      const urlRegex = /^https?:\/\/.+\..+/;
      images.forEach((url, index) => {
        if (typeof url !== 'string' || !urlRegex.test(url)) {
          errors.push({
            field: `images[${index}]`,
            message: 'Each image must be a valid HTTP(S) URL',
            providedValue: url
          });
        }
      });
    }
  }

  // Si des erreurs ont été détectées, retourner une réponse 400
  if (errors.length > 0) {
    return res.status(400).json({
      status: 'error',
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: {
          fields: errors,
          errorCount: errors.length
        }
      }
    });
  }

  // Aucune erreur, passer au middleware/contrôleur suivant
  next();
};

/**
 * Middleware de validation pour la mise à jour de visites
 * (Plus souple que la validation de création)
 */
export const validateTourUpdate = (req, res, next) => {
  const errors = [];
  const {
    title,
    description,
    price,
    duration,
    maxGroupSize
  } = req.body;

  // Pour les mises à jour, les champs sont optionnels
  // Mais s'ils sont fournis, ils doivent être valides

  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim() === '') {
      errors.push({
        field: 'title',
        message: 'Title must be a non-empty string',
        providedValue: title
      });
    } else if (title.length < 5 || title.length > 200) {
      errors.push({
        field: 'title',
        message: 'Title must be between 5 and 200 characters',
        providedValue: title
      });
    }
  }

  if (description !== undefined) {
    if (typeof description !== 'string' || description.trim() === '') {
      errors.push({
        field: 'description',
        message: 'Description must be a non-empty string',
        providedValue: description
      });
    }
  }

  if (price !== undefined) {
    if (typeof price !== 'number' || price <= 0) {
      errors.push({
        field: 'price',
        message: 'Price must be a positive number',
        providedValue: price
      });
    }
  }

  if (duration !== undefined) {
    if (typeof duration !== 'number' || duration <= 0) {
      errors.push({
        field: 'duration',
        message: 'Duration must be a positive number',
        providedValue: duration
      });
    }
  }

  if (maxGroupSize !== undefined) {
    if (typeof maxGroupSize !== 'number' || !Number.isInteger(maxGroupSize) || maxGroupSize <= 0) {
      errors.push({
        field: 'maxGroupSize',
        message: 'Max group size must be a positive integer',
        providedValue: maxGroupSize
      });
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      status: 'error',
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: {
          fields: errors
        }
      }
    });
  }

  next();
};
```

---

#### 2. Application du Middleware aux Routes

```javascript
// src/routes/tourRoutes.js
import express from 'express';
import * as tourController from '../controllers/tourController.js';
import { validateTourCreation, validateTourUpdate } from '../middleware/validator.js';

const router = express.Router();

router.get('/search', tourController.searchTours);
router.get('/', tourController.getAllTours);
router.get('/:tourId', tourController.getTourById);

// Appliquer le middleware de validation AVANT le contrôleur
router.post('/', validateTourCreation, tourController.createTour);
router.patch('/:tourId', validateTourUpdate, tourController.updateTour);

router.delete('/:tourId', tourController.deleteTour);

export default router;
```

---

#### 3. Tests avec cURL (Données Invalides)

**Test 1 : Titre manquant**

```bash
curl -X POST http://localhost:3001/api/v1/tours-catalog/tours \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Une belle visite",
    "price": 50,
    "currency": "EUR",
    "duration": 3,
    "durationUnit": "hours",
    "maxGroupSize": 15,
    "categoryId": "c1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "destinationId": "d7e8f9a0-b1c2-3d4e-5f6a-7b8c9d0e1f2a"
  }'
```

**Réponse attendue (400 Bad Request) :**

```json
{
  "status": "error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "fields": [
        {
          "field": "title",
          "message": "Title must be a non-empty string",
          "providedValue": undefined
        }
      ],
      "errorCount": 1
    }
  }
}
```

---

**Test 2 : Prix négatif**

```bash
curl -X POST http://localhost:3001/api/v1/tours-catalog/tours \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Visite Test",
    "description": "Une description de test suffisamment longue",
    "price": -50,
    "currency": "EUR",
    "duration": 3,
    "durationUnit": "hours",
    "maxGroupSize": 15,
    "categoryId": "c1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "destinationId": "d7e8f9a0-b1c2-3d4e-5f6a-7b8c9d0e1f2a"
  }'
```

**Réponse attendue :**

```json
{
  "status": "error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "fields": [
        {
          "field": "price",
          "message": "Price must be a positive number",
          "providedValue": -50
        }
      ],
      "errorCount": 1
    }
  }
}
```

---

**Test 3 : UUID invalide**

```bash
curl -X POST http://localhost:3001/api/v1/tours-catalog/tours \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Visite Test",
    "description": "Une description de test suffisamment longue",
    "price": 50,
    "currency": "EUR",
    "duration": 3,
    "durationUnit": "hours",
    "maxGroupSize": 15,
    "categoryId": "invalid-uuid",
    "destinationId": "d7e8f9a0-b1c2-3d4e-5f6a-7b8c9d0e1f2a"
  }'
```

**Réponse attendue :**

```json
{
  "status": "error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "fields": [
        {
          "field": "categoryId",
          "message": "Category ID must be a valid UUID v4",
          "providedValue": "invalid-uuid"
        }
      ]
    }
  }
}
```

---

**Test 4 : Données valides (devrait réussir)**

```bash
curl -X POST http://localhost:3001/api/v1/tours-catalog/tours \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Nouvelle Visite de Test",
    "description": "Une description suffisamment détaillée pour cette nouvelle visite de test",
    "price": 75.50,
    "currency": "EUR",
    "duration": 5,
    "durationUnit": "hours",
    "maxGroupSize": 20,
    "categoryId": "c1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    "destinationId": "d7e8f9a0-b1c2-3d4e-5f6a-7b8c9d0e1f2a",
    "images": [
      "https://cdn.example.com/tours/test-1.jpg",
      "https://cdn.example.com/tours/test-2.jpg"
    ]
  }'
```

**Réponse attendue (201 Created) :**

```json
{
  "status": "success",
  "data": {
    "tour": {
      "id": "883h1733-h52e-74g7-d049-779988773333",
      "title": "Nouvelle Visite de Test",
      "description": "Une description suffisamment détaillée...",
      "price": 75.50,
      "currency": "EUR",
      "duration": 5,
      "durationUnit": "hours",
      "maxGroupSize": 20,
      "rating": 0,
      "ratingsCount": 0,
      "createdAt": "2026-07-15T15:30:00Z",
      "updatedAt": "2026-07-15T15:30:00Z"
    }
  }
}
```

---

## Exercice 3 : Ajouter des Liens HATEOAS aux Réponses

**Objectif :** Enrichir les réponses de l'endpoint GET `/tours/:tourId` avec des liens HATEOAS.

### Solution Complète

#### 1. Création de l'Utilitaire de Réponse

```javascript
// src/utils/response.js

/**
 * Ajoute des liens HATEOAS à un objet tour
 * @param {Object} tour - L'objet tour
 * @param {Object} user - L'utilisateur authentifié (optionnel)
 * @returns {Object} - L'objet tour enrichi avec des liens HATEOAS
 */
export const addHateoasLinks = (tour, user = null) => {
  const baseUrl = `${process.env.API_BASE_PATH || '/api/v1'}/tours-catalog`;
  const bookingBaseUrl = `${process.env.API_BASE_PATH || '/api/v1'}/booking-management`;

  const links = {
    self: {
      href: `${baseUrl}/tours/${tour.id}`,
      method: 'GET',
      description: "Get this tour's details"
    },
    category: {
      href: `${baseUrl}/categories/${tour.categoryId}`,
      method: 'GET',
      description: 'Get category details'
    },
    destination: {
      href: `${baseUrl}/destinations/${tour.destinationId}`,
      method: 'GET',
      description: 'Get destination details'
    },
    reviews: {
      href: `${baseUrl}/tours/${tour.id}/reviews`,
      method: 'GET',
      description: 'Get all reviews for this tour'
    },
    book: {
      href: `${bookingBaseUrl}/bookings`,
      method: 'POST',
      description: 'Create a booking for this tour',
      body: {
        tourId: tour.id,
        date: 'YYYY-MM-DD',
        participants: []
      }
    },
    checkAvailability: {
      href: `${bookingBaseUrl}/tours/${tour.id}/availability`,
      method: 'GET',
      description: 'Check availability for this tour'
    },
    relatedTours: {
      href: `${baseUrl}/tours?category=${tour.categoryId}&destination=${tour.destinationId}`,
      method: 'GET',
      description: 'Find similar tours'
    }
  };

  // Liens conditionnels basés sur l'authentification
  if (user && user.isAuthenticated) {
    links.createReview = {
      href: `${baseUrl}/tours/${tour.id}/reviews`,
      method: 'POST',
      description: 'Submit a review for this tour'
    };
  }

  // Liens conditionnels basés sur le rôle admin
  if (user && user.role === 'admin') {
    links.update = {
      href: `${baseUrl}/tours/${tour.id}`,
      method: 'PATCH',
      description: 'Update this tour'
    };
    links.delete = {
      href: `${baseUrl}/tours/${tour.id}`,
      method: 'DELETE',
      description: 'Delete this tour'
    };
  }

  return {
    ...tour,
    links
  };
};

/**
 * Ajoute des liens HATEOAS à une collection de tours
 * @param {Array} tours - Liste de tours
 * @param {Object} pagination - Informations de pagination
 * @param {Object} user - L'utilisateur authentifié (optionnel)
 * @returns {Object} - Collection enrichie avec liens
 */
export const addCollectionHateoasLinks = (tours, pagination, user = null) => {
  const baseUrl = `${process.env.API_BASE_PATH || '/api/v1'}/tours-catalog`;

  const links = {
    self: {
      href: `${baseUrl}/tours?page=${pagination.currentPage}&limit=${pagination.itemsPerPage}`,
      method: 'GET',
      description: 'Current page'
    }
  };

  if (pagination.hasNextPage) {
    links.next = {
      href: `${baseUrl}/tours?page=${pagination.currentPage + 1}&limit=${pagination.itemsPerPage}`,
      method: 'GET',
      description: 'Next page'
    };
  }

  if (pagination.hasPreviousPage) {
    links.previous = {
      href: `${baseUrl}/tours?page=${pagination.currentPage - 1}&limit=${pagination.itemsPerPage}`,
      method: 'GET',
      description: 'Previous page'
    };
  }

  links.first = {
    href: `${baseUrl}/tours?page=1&limit=${pagination.itemsPerPage}`,
    method: 'GET',
    description: 'First page'
  };

  links.last = {
    href: `${baseUrl}/tours?page=${pagination.totalPages}&limit=${pagination.itemsPerPage}`,
    method: 'GET',
    description: 'Last page'
  };

  if (user && user.role === 'admin') {
    links.create = {
      href: `${baseUrl}/tours`,
      method: 'POST',
      description: 'Create a new tour'
    };
  }

  return {
    tours: tours.map(tour => addHateoasLinks(tour, user)),
    pagination,
    links
  };
};
```

---

#### 2. Modification du Contrôleur

```javascript
// src/controllers/tourController.js
import * as tourModel from '../models/tourModel.js';
import { addHateoasLinks, addCollectionHateoasLinks } from '../utils/response.js';

export const getTourById = (req, res) => {
  try {
    const tour = tourModel.findById(req.params.tourId);

    if (!tour) {
      return res.status(404).json({
        status: 'error',
        error: {
          code: 'TOUR_NOT_FOUND',
          message: 'The requested tour does not exist',
          details: { tourId: req.params.tourId }
        }
      });
    }

    // Ajouter les liens HATEOAS
    // Note : req.user serait disponible si un middleware d'authentification était en place
    const enrichedTour = addHateoasLinks(tour, req.user);

    return res.status(200).json({
      status: 'success',
      data: { tour: enrichedTour }
    });

  } catch (error) {
    console.error('Error in getTourById:', error);
    return res.status(500).json({
      status: 'error',
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred'
      }
    });
  }
};

export const getAllTours = (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const result = tourModel.findAll(page, limit);

    // Ajouter les liens HATEOAS à la collection
    const enrichedData = addCollectionHateoasLinks(
      result.tours,
      result.pagination,
      req.user
    );

    return res.status(200).json({
      status: 'success',
      data: enrichedData
    });

  } catch (error) {
    console.error('Error in getAllTours:', error);
    return res.status(500).json({
      status: 'error',
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred'
      }
    });
  }
};

// Autres contrôleurs inchangés...
```

---

#### 3. Test avec cURL

**Test : Récupérer une visite avec liens HATEOAS**

```bash
curl http://localhost:3001/api/v1/tours-catalog/tours/550e8400-e29b-41d4-a716-446655440000
```

**Réponse attendue :**

```json
{
  "status": "success",
  "data": {
    "tour": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Visite de la Tour Eiffel et Croisière sur la Seine",
      "description": "Découvrez les monuments emblématiques de Paris...",
      "price": 89.99,
      "currency": "EUR",
      "categoryId": "c1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "destinationId": "d7e8f9a0-b1c2-3d4e-5f6a-7b8c9d0e1f2a",
      "duration": 4,
      "durationUnit": "hours",
      "maxGroupSize": 20,
      "rating": 4.7,
      "ratingsCount": 342,
      "images": [
        "https://cdn.example.com/tours/eiffel-tower-1.jpg",
        "https://cdn.example.com/tours/seine-cruise-1.jpg"
      ],
      "createdAt": "2026-02-10T10:30:00Z",
      "updatedAt": "2026-12-15T14:22:00Z",
      "links": {
        "self": {
          "href": "/api/v1/tours-catalog/tours/550e8400-e29b-41d4-a716-446655440000",
          "method": "GET",
          "description": "Get this tour's details"
        },
        "category": {
          "href": "/api/v1/tours-catalog/categories/c1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
          "method": "GET",
          "description": "Get category details"
        },
        "destination": {
          "href": "/api/v1/tours-catalog/destinations/d7e8f9a0-b1c2-3d4e-5f6a-7b8c9d0e1f2a",
          "method": "GET",
          "description": "Get destination details"
        },
        "reviews": {
          "href": "/api/v1/tours-catalog/tours/550e8400-e29b-41d4-a716-446655440000/reviews",
          "method": "GET",
          "description": "Get all reviews for this tour"
        },
        "book": {
          "href": "/api/v1/booking-management/bookings",
          "method": "POST",
          "description": "Create a booking for this tour",
          "body": {
            "tourId": "550e8400-e29b-41d4-a716-446655440000",
            "date": "YYYY-MM-DD",
            "participants": []
          }
        },
        "checkAvailability": {
          "href": "/api/v1/booking-management/tours/550e8400-e29b-41d4-a716-446655440000/availability",
          "method": "GET",
          "description": "Check availability for this tour"
        },
        "relatedTours": {
          "href": "/api/v1/tours-catalog/tours?category=c1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d&destination=d7e8f9a0-b1c2-3d4e-5f6a-7b8c9d0e1f2a",
          "method": "GET",
          "description": "Find similar tours"
        }
      }
    }
  }
}
```

---

**Test : Collection de visites avec liens de pagination**

```bash
curl "http://localhost:3001/api/v1/tours-catalog/tours?page=1&limit=2"
```

**Réponse attendue :**

```json
{
  "status": "success",
  "data": {
    "tours": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "title": "Visite de la Tour Eiffel et Croisière sur la Seine",
        ...
        "links": { ... }
      },
      {
        "id": "661f9511-f30c-52e5-b827-557766551111",
        "title": "Visite Guidée du Musée du Louvre",
        ...
        "links": { ... }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 2,
      "totalItems": 3,
      "itemsPerPage": 2,
      "hasNextPage": true,
      "hasPreviousPage": false
    },
    "links": {
      "self": {
        "href": "/api/v1/tours-catalog/tours?page=1&limit=2",
        "method": "GET",
        "description": "Current page"
      },
      "next": {
        "href": "/api/v1/tours-catalog/tours?page=2&limit=2",
        "method": "GET",
        "description": "Next page"
      },
      "first": {
        "href": "/api/v1/tours-catalog/tours?page=1&limit=2",
        "method": "GET",
        "description": "First page"
      },
      "last": {
        "href": "/api/v1/tours-catalog/tours?page=2&limit=2",
        "method": "GET",
        "description": "Last page"
      }
    }
  }
}
```

---

## Conclusion

Ces exercices ont permis de maîtriser :

1. **Implémentation d'un endpoint de recherche** avec filtres multiples (mot-clé, prix, catégorie, destination, tri, pagination)
2. **Validation robuste des données d'entrée** avec messages d'erreur détaillés et multiples validations (type, format, contraintes métier)
3. **Enrichissement des réponses avec HATEOAS** pour rendre l'API auto-découvrable et guider les clients à travers les actions disponibles

**Bonnes pratiques appliquées :**
- ✅ Séparation des préoccupations (Model, Controller, Middleware, Utils)
- ✅ Validation exhaustive des données
- ✅ Gestion d'erreurs standardisée
- ✅ Liens HATEOAS conditionnels selon les permissions
- ✅ Code testable et maintenable

**Prochaine étape :** Leçon 2.4 - Conception de l'API du Microservice Booking Management avec gestion des états de réservation.
