# Solutions des Exercices - Leçon 2.2 : Conception de l'API Tour Catalog

## Exercice 1 : Concevoir un Endpoint pour la Recherche de Visites

**Objectif :** Concevoir un endpoint permettant aux utilisateurs de rechercher des visites par mot-clé.

### Solution Complète

#### 1. URI de l'Endpoint

```
GET /api/v1/tours-catalog/tours/search
```

**Justification du choix :**
- Utilisation du verbe HTTP `GET` (opération en lecture seule)
- Ressource `tours` suivie de l'action de recherche `search`
- Préfixe `/api/v1/tours-catalog` pour le versioning et l'identification du contexte

**Alternative possible :**
```
GET /api/v1/tours-catalog/tours?search=query
```
Cette approche utilise un paramètre de requête sur l'endpoint principal. Les deux approches sont valides, mais `/tours/search` rend l'intention plus explicite.

---

#### 2. Méthode HTTP

**Méthode : GET**

**Justification :**
- L'opération de recherche ne modifie aucune donnée côté serveur
- Respect des principes REST (GET pour les opérations idempotentes en lecture seule)
- Permet le caching des résultats de recherche par les navigateurs et CDN

**Anti-pattern à éviter :**
```
❌ POST /api/v1/tours-catalog/tours/search
```
POST ne devrait être utilisé que si la recherche implique une création de ressource (ex: sauvegarder l'historique de recherche).

---

#### 3. Paramètres de Requête

| Paramètre    | Type    | Obligatoire | Description                                    | Exemple                |
| ------------ | ------- | ----------- | ---------------------------------------------- | ---------------------- |
| `query`      | String  | ✅ Oui      | Mot-clé de recherche (titre, description)      | `eiffel`, `louvre`     |
| `category`   | String  | ❌ Non      | Filtrer par ID de catégorie                    | `adventure`, `culture` |
| `destination`| String  | ❌ Non      | Filtrer par destination                        | `paris`, `london`      |
| `minPrice`   | Number  | ❌ Non      | Prix minimum (en EUR)                          | `50`                   |
| `maxPrice`   | Number  | ❌ Non      | Prix maximum (en EUR)                          | `100`                  |
| `minRating`  | Number  | ❌ Non      | Note minimale (0-5)                            | `4.0`                  |
| `page`       | Number  | ❌ Non      | Numéro de page (défaut: 1)                     | `2`                    |
| `limit`      | Number  | ❌ Non      | Résultats par page (défaut: 10, max: 100)      | `20`                   |
| `sort`       | String  | ❌ Non      | Champ de tri (`price`, `rating`, `popularity`) | `rating`               |
| `order`      | String  | ❌ Non      | Ordre de tri (`asc`, `desc`)                   | `desc`                 |

**Exemples de requêtes valides :**

```bash
# Recherche simple
GET /api/v1/tours-catalog/tours/search?query=eiffel

# Recherche avec filtres de prix
GET /api/v1/tours-catalog/tours/search?query=paris&minPrice=50&maxPrice=100

# Recherche avec catégorie et tri
GET /api/v1/tours-catalog/tours/search?query=museum&category=culture&sort=rating&order=desc

# Recherche avec pagination
GET /api/v1/tours-catalog/tours/search?query=adventure&page=2&limit=20

# Recherche combinée complète
GET /api/v1/tours-catalog/tours/search?query=seine&destination=paris&minPrice=30&maxPrice=150&minRating=4.5&sort=price&order=asc&page=1&limit=10
```

---

#### 4. Exemple de Réponse (Succès avec 2+ Résultats)

**Requête :**
```
GET /api/v1/tours-catalog/tours/search?query=eiffel&minPrice=50&maxPrice=100
```

**Réponse (200 OK) :**

```json
{
  "status": "success",
  "data": {
    "tours": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "title": "Visite de la Tour Eiffel et Croisière sur la Seine",
        "description": "Découvrez les monuments emblématiques de Paris avec un guide expert",
        "categoryId": "c1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "categoryName": "Culture",
        "destinationId": "d7e8f9a0-b1c2-3d4e-5f6a-7b8c9d0e1f2a",
        "destinationName": "Paris",
        "price": 89.99,
        "currency": "EUR",
        "duration": 4,
        "durationUnit": "hours",
        "maxGroupSize": 20,
        "rating": 4.7,
        "ratingsCount": 342,
        "images": [
          "https://cdn.example.com/tours/eiffel-tower-1.jpg",
          "https://cdn.example.com/tours/seine-cruise-1.jpg"
        ],
        "availableDates": [
          "2026-07-15",
          "2026-07-22",
          "2026-07-29"
        ],
        "highlights": [
          "Accès prioritaire à la Tour Eiffel",
          "Croisière d'une heure sur la Seine",
          "Guide francophone certifié"
        ],
        "createdAt": "2026-02-10T10:30:00Z",
        "updatedAt": "2026-12-15T14:22:00Z"
      },
      {
        "id": "661f9511-f30c-52e5-b827-557766551111",
        "title": "Paris by Night: Tour Eiffel Illuminée",
        "description": "Admirez la Tour Eiffel et Paris illuminés de nuit",
        "categoryId": "c1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "categoryName": "Culture",
        "destinationId": "d7e8f9a0-b1c2-3d4e-5f6a-7b8c9d0e1f2a",
        "destinationName": "Paris",
        "price": 75.00,
        "currency": "EUR",
        "duration": 3,
        "durationUnit": "hours",
        "maxGroupSize": 15,
        "rating": 4.9,
        "ratingsCount": 128,
        "images": [
          "https://cdn.example.com/tours/eiffel-night-1.jpg",
          "https://cdn.example.com/tours/paris-lights-1.jpg"
        ],
        "availableDates": [
          "2026-07-20",
          "2026-07-27",
          "2026-08-03"
        ],
        "highlights": [
          "Visite nocturne exclusive",
          "Spectacle des lumières de la Tour Eiffel",
          "Verre de champagne offert"
        ],
        "createdAt": "2026-03-05T09:15:00Z",
        "updatedAt": "2026-11-20T16:45:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 2,
      "itemsPerPage": 10,
      "hasNextPage": false,
      "hasPreviousPage": false
    },
    "filters": {
      "appliedFilters": {
        "query": "eiffel",
        "minPrice": 50,
        "maxPrice": 100
      },
      "availableCategories": [
        { "id": "c1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d", "name": "Culture", "count": 2 }
      ],
      "priceRange": {
        "min": 75.00,
        "max": 89.99
      }
    },
    "searchMetadata": {
      "query": "eiffel",
      "executionTimeMs": 42,
      "resultsFound": 2
    }
  }
}
```

**Enrichissements par rapport à l'exemple de base :**
- ✅ Noms de catégorie et destination (dénormalisés pour éviter des appels supplémentaires)
- ✅ Informations de pagination enrichies (`hasNextPage`, `hasPreviousPage`)
- ✅ Section `filters` montrant les filtres appliqués et les options disponibles
- ✅ Métadonnées de recherche (temps d'exécution, nombre de résultats)

---

#### 5. Codes de Statut HTTP Possibles

| Code  | Nom                  | Cas d'usage                                                         | Exemple de réponse                                    |
| ----- | -------------------- | ------------------------------------------------------------------- | ----------------------------------------------------- |
| `200` | OK                   | Recherche réussie (même si aucun résultat trouvé)                   | Liste de visites (peut être vide)                    |
| `400` | Bad Request          | Paramètres de requête invalides                                     | `{ "error": "minPrice must be a positive number" }`  |
| `422` | Unprocessable Entity | Paramètres syntaxiquement valides mais logiquement incohérents      | `{ "error": "minPrice cannot exceed maxPrice" }`     |
| `429` | Too Many Requests    | Rate limiting dépassé (trop de recherches en peu de temps)          | `{ "error": "Rate limit exceeded. Retry after 60s" }`|
| `500` | Internal Server Error| Erreur serveur (base de données inaccessible, crash du service)     | `{ "error": "Internal server error" }`               |
| `503` | Service Unavailable  | Service temporairement indisponible (maintenance, surcharge)        | `{ "error": "Service temporarily unavailable" }`     |

---

#### Exemple de Réponse d'Erreur (400 Bad Request)

**Requête invalide :**
```
GET /api/v1/tours-catalog/tours/search?query=&minPrice=abc
```

**Réponse (400 Bad Request) :**

```json
{
  "status": "error",
  "error": {
    "code": "INVALID_REQUEST_PARAMETERS",
    "message": "The request contains invalid parameters",
    "details": [
      {
        "field": "query",
        "issue": "Query parameter cannot be empty",
        "providedValue": ""
      },
      {
        "field": "minPrice",
        "issue": "Must be a positive number",
        "providedValue": "abc"
      }
    ]
  }
}
```

---

#### Exemple de Réponse sans Résultats (200 OK)

**Requête :**
```
GET /api/v1/tours-catalog/tours/search?query=antarctica&minPrice=10000
```

**Réponse (200 OK) :**

```json
{
  "status": "success",
  "data": {
    "tours": [],
    "pagination": {
      "currentPage": 1,
      "totalPages": 0,
      "totalItems": 0,
      "itemsPerPage": 10,
      "hasNextPage": false,
      "hasPreviousPage": false
    },
    "filters": {
      "appliedFilters": {
        "query": "antarctica",
        "minPrice": 10000
      },
      "availableCategories": [],
      "priceRange": null
    },
    "searchMetadata": {
      "query": "antarctica",
      "executionTimeMs": 18,
      "resultsFound": 0,
      "suggestions": [
        "Try removing some filters",
        "Try a broader search term",
        "Check back later for new tours"
      ]
    }
  }
}
```

**Note :** Aucun résultat retourne quand même `200 OK` (pas `404`), car la requête a été traitée avec succès. Le `404` est réservé aux ressources spécifiques qui n'existent pas (ex: `GET /tours/invalid-id`).

---

## Exercice 2 : Implémenter la Gestion des Erreurs pour les Ressources Non Trouvées

**Objectif :** Définir la structure de réponse d'erreur lorsqu'une visite demandée n'existe pas.

### Solution Complète

#### 1. Code de Statut HTTP

**Code : `404 Not Found`**

**Justification :**
- La ressource demandée (visite avec un ID spécifique) n'existe pas dans la base de données
- Standard HTTP pour indiquer qu'une ressource n'a pas été trouvée
- Le client peut comprendre immédiatement que l'ID fourni est invalide ou que la visite a été supprimée

**Cas d'usage :**
```
GET /api/v1/tours-catalog/tours/999e9999-e99b-99d9-a999-999999999999
```

Si cet ID n'existe pas dans la base de données, retourner `404 Not Found`.

---

#### 2. Structure JSON de Réponse d'Erreur

**Format standardisé pour toutes les erreurs :**

```json
{
  "status": "error",
  "error": {
    "code": "ERROR_CODE_CONSTANT",
    "message": "Human-readable error message",
    "details": {
      // Contexte additionnel spécifique à l'erreur
    },
    "timestamp": "2026-07-15T14:30:00Z",
    "path": "/api/v1/tours-catalog/tours/999e9999-e99b-99d9-a999-999999999999",
    "requestId": "req_abc123xyz789"
  }
}
```

**Champs :**
- `status` : Toujours `"error"` pour les réponses d'erreur (vs. `"success"` pour les réponses valides)
- `error.code` : Code d'erreur machine-readable (constante en majuscules)
- `error.message` : Message humain-readable expliquant l'erreur
- `error.details` : Objet contenant le contexte spécifique (ID demandé, champs invalides, etc.)
- `error.timestamp` : Horodatage ISO 8601 de l'erreur (utile pour le debugging)
- `error.path` : Chemin de la requête qui a causé l'erreur (utile pour les logs)
- `error.requestId` : Identifiant unique de la requête (utile pour tracer les logs côté serveur)

---

#### 3. Exemple de Réponse pour Visite Non Trouvée

**Requête :**
```
GET /api/v1/tours-catalog/tours/999e9999-e99b-99d9-a999-999999999999
```

**Réponse (404 Not Found) :**

```json
{
  "status": "error",
  "error": {
    "code": "TOUR_NOT_FOUND",
    "message": "The requested tour does not exist",
    "details": {
      "tourId": "999e9999-e99b-99d9-a999-999999999999",
      "reason": "No tour found with this ID in the database"
    },
    "timestamp": "2026-07-15T14:30:00Z",
    "path": "/api/v1/tours-catalog/tours/999e9999-e99b-99d9-a999-999999999999",
    "requestId": "req_abc123xyz789"
  }
}
```

---

#### 4. Autres Exemples de Réponses d'Erreur

##### Exemple 1 : ID au Mauvais Format (400 Bad Request)

**Requête :**
```
GET /api/v1/tours-catalog/tours/invalid-uuid-format
```

**Réponse (400 Bad Request) :**

```json
{
  "status": "error",
  "error": {
    "code": "INVALID_TOUR_ID_FORMAT",
    "message": "The provided tour ID has an invalid format",
    "details": {
      "tourId": "invalid-uuid-format",
      "expectedFormat": "UUID v4 (ex: 550e8400-e29b-41d4-a716-446655440000)",
      "reason": "Tour IDs must be valid UUIDs"
    },
    "timestamp": "2026-07-15T14:35:00Z",
    "path": "/api/v1/tours-catalog/tours/invalid-uuid-format",
    "requestId": "req_def456uvw012"
  }
}
```

**Justification du 400 :** Le format de l'ID est invalide syntaxiquement (pas un UUID), donc c'est une erreur de requête client (400) plutôt qu'une ressource non trouvée (404).

---

##### Exemple 2 : Visite Supprimée/Archivée (410 Gone)

**Requête :**
```
GET /api/v1/tours-catalog/tours/550e8400-e29b-41d4-a716-446655440000
```

**Réponse (410 Gone) :**

```json
{
  "status": "error",
  "error": {
    "code": "TOUR_NO_LONGER_AVAILABLE",
    "message": "This tour is no longer available",
    "details": {
      "tourId": "550e8400-e29b-41d4-a716-446655440000",
      "reason": "This tour has been permanently removed from the catalog",
      "removedAt": "2026-06-01T10:00:00Z",
      "alternativeTours": [
        {
          "id": "661f9511-f30c-52e5-b827-557766551111",
          "title": "Paris by Night: Tour Eiffel Illuminée"
        }
      ]
    },
    "timestamp": "2026-07-15T14:40:00Z",
    "path": "/api/v1/tours-catalog/tours/550e8400-e29b-41d4-a716-446655440000",
    "requestId": "req_ghi789rst345"
  }
}
```

**Justification du 410 :** Le code `410 Gone` indique que la ressource existait auparavant mais a été intentionnellement supprimée. C'est plus précis que `404` pour indiquer qu'il ne s'agit pas d'une simple erreur de saisie d'ID.

---

#### 5. Implémentation Côté Serveur (Exemple Node.js/Express)

```javascript
// tours.controller.js
const tourService = require('../services/tour.service');
const { v4: isUUID } = require('uuid');

exports.getTourById = async (req, res) => {
  const { tourId } = req.params;

  // 1. Validation du format UUID
  if (!isUUID(tourId)) {
    return res.status(400).json({
      status: 'error',
      error: {
        code: 'INVALID_TOUR_ID_FORMAT',
        message: 'The provided tour ID has an invalid format',
        details: {
          tourId,
          expectedFormat: 'UUID v4 (ex: 550e8400-e29b-41d4-a716-446655440000)',
          reason: 'Tour IDs must be valid UUIDs'
        },
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
        requestId: req.id // Assumant un middleware qui génère req.id
      }
    });
  }

  try {
    // 2. Récupération de la visite depuis la base de données
    const tour = await tourService.findById(tourId);

    // 3. Gestion du cas "non trouvé"
    if (!tour) {
      return res.status(404).json({
        status: 'error',
        error: {
          code: 'TOUR_NOT_FOUND',
          message: 'The requested tour does not exist',
          details: {
            tourId,
            reason: 'No tour found with this ID in the database'
          },
          timestamp: new Date().toISOString(),
          path: req.originalUrl,
          requestId: req.id
        }
      });
    }

    // 4. Gestion du cas "archivé/supprimé"
    if (tour.status === 'archived' || tour.deletedAt !== null) {
      const alternativeTours = await tourService.findAlternatives(tour.categoryId, 3);

      return res.status(410).json({
        status: 'error',
        error: {
          code: 'TOUR_NO_LONGER_AVAILABLE',
          message: 'This tour is no longer available',
          details: {
            tourId,
            reason: 'This tour has been permanently removed from the catalog',
            removedAt: tour.deletedAt,
            alternativeTours: alternativeTours.map(t => ({
              id: t.id,
              title: t.title
            }))
          },
          timestamp: new Date().toISOString(),
          path: req.originalUrl,
          requestId: req.id
        }
      });
    }

    // 5. Succès : retourner la visite
    return res.status(200).json({
      status: 'success',
      data: {
        tour
      }
    });

  } catch (error) {
    // 6. Erreur serveur inattendue
    console.error('Error fetching tour:', error);
    return res.status(500).json({
      status: 'error',
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred while fetching the tour',
        details: {
          // Ne pas exposer les détails internes de l'erreur en production
        },
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
        requestId: req.id
      }
    });
  }
};
```

---

#### 6. Tests Unitaires pour la Gestion d'Erreurs

```javascript
// tours.controller.test.js
const request = require('supertest');
const app = require('../app');

describe('GET /api/v1/tours-catalog/tours/:tourId', () => {
  describe('Error Handling', () => {
    it('should return 400 if tourId format is invalid', async () => {
      const response = await request(app)
        .get('/api/v1/tours-catalog/tours/invalid-uuid')
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.error.code).toBe('INVALID_TOUR_ID_FORMAT');
      expect(response.body.error.details.tourId).toBe('invalid-uuid');
    });

    it('should return 404 if tour does not exist', async () => {
      const nonExistentId = '999e9999-e99b-99d9-a999-999999999999';
      const response = await request(app)
        .get(`/api/v1/tours-catalog/tours/${nonExistentId}`)
        .expect(404);

      expect(response.body.status).toBe('error');
      expect(response.body.error.code).toBe('TOUR_NOT_FOUND');
      expect(response.body.error.details.tourId).toBe(nonExistentId);
    });

    it('should return 410 if tour is archived', async () => {
      const archivedTourId = '550e8400-e29b-41d4-a716-446655440000';
      // Assuming this tour is marked as archived in test database
      const response = await request(app)
        .get(`/api/v1/tours-catalog/tours/${archivedTourId}`)
        .expect(410);

      expect(response.body.status).toBe('error');
      expect(response.body.error.code).toBe('TOUR_NO_LONGER_AVAILABLE');
      expect(response.body.error.details.alternativeTours).toBeDefined();
    });
  });
});
```

---

## Exercice 3 : Ajouter les Liens HATEOAS à une Réponse de Visite

**Objectif :** Améliorer une réponse d'endpoint de visite avec des liens HATEOAS pour la navigation.

### Solution Complète

#### 1. Qu'est-ce que HATEOAS ?

**HATEOAS** (Hypermedia As The Engine Of Application State) est un principe de l'architecture REST qui stipule que :

- **Les réponses API doivent contenir des liens hypertextes** permettant au client de découvrir les actions disponibles
- **Le client ne doit pas avoir besoin de connaître toutes les URLs à l'avance** - il les découvre dynamiquement
- **L'API guide le client** dans la navigation et les transitions d'état possibles

**Avantages :**
- ✅ Découvrabilité : Le client apprend les endpoints disponibles depuis les réponses
- ✅ Évolutivité : Les URLs peuvent changer sans casser les clients (tant que les relations restent les mêmes)
- ✅ Auto-documentation : Les liens révèlent les actions possibles sur une ressource

---

#### 2. Réponse de Base (Sans HATEOAS)

**Requête :**
```
GET /api/v1/tours-catalog/tours/550e8400-e29b-41d4-a716-446655440000
```

**Réponse sans HATEOAS :**

```json
{
  "status": "success",
  "data": {
    "tour": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Visite de la Tour Eiffel et Croisière sur la Seine",
      "description": "Découvrez les monuments emblématiques de Paris",
      "price": 89.99,
      "categoryId": "c1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "destinationId": "d7e8f9a0-b1c2-3d4e-5f6a-7b8c9d0e1f2a"
    }
  }
}
```

**Problème :** Le client doit connaître à l'avance comment construire les URLs pour :
- Voir la catégorie de la visite
- Voir la destination
- Consulter les avis
- Réserver la visite

---

#### 3. Réponse Améliorée avec HATEOAS

**Réponse avec HATEOAS :**

```json
{
  "status": "success",
  "data": {
    "tour": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Visite de la Tour Eiffel et Croisière sur la Seine",
      "description": "Découvrez les monuments emblématiques de Paris avec un guide expert",
      "price": 89.99,
      "currency": "EUR",
      "categoryId": "c1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "destinationId": "d7e8f9a0-b1c2-3d4e-5f6a-7b8c9d0e1f2a",
      "rating": 4.7,
      "ratingsCount": 342,
      "duration": 4,
      "maxGroupSize": 20,
      "links": {
        "self": {
          "href": "/api/v1/tours-catalog/tours/550e8400-e29b-41d4-a716-446655440000",
          "method": "GET",
          "description": "Get this tour's details"
        },
        "update": {
          "href": "/api/v1/tours-catalog/tours/550e8400-e29b-41d4-a716-446655440000",
          "method": "PATCH",
          "description": "Update this tour (requires admin privileges)"
        },
        "delete": {
          "href": "/api/v1/tours-catalog/tours/550e8400-e29b-41d4-a716-446655440000",
          "method": "DELETE",
          "description": "Delete this tour (requires admin privileges)"
        },
        "category": {
          "href": "/api/v1/tours-catalog/categories/c1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
          "method": "GET",
          "description": "Get category details (Culture)"
        },
        "destination": {
          "href": "/api/v1/tours-catalog/destinations/d7e8f9a0-b1c2-3d4e-5f6a-7b8c9d0e1f2a",
          "method": "GET",
          "description": "Get destination details (Paris)"
        },
        "reviews": {
          "href": "/api/v1/tours-catalog/tours/550e8400-e29b-41d4-a716-446655440000/reviews",
          "method": "GET",
          "description": "Get all reviews for this tour"
        },
        "createReview": {
          "href": "/api/v1/tours-catalog/tours/550e8400-e29b-41d4-a716-446655440000/reviews",
          "method": "POST",
          "description": "Submit a review for this tour (requires authentication)"
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
          "description": "Find similar tours in the same category and destination"
        }
      }
    }
  }
}
```

---

#### 4. Explication des Liens

| Relation            | Description                                                      | Bounded Context     |
| ------------------- | ---------------------------------------------------------------- | ------------------- |
| `self`              | Lien vers la ressource elle-même (idempotent)                    | Tour Catalog        |
| `update`            | Mise à jour de la visite (admin seulement)                       | Tour Catalog        |
| `delete`            | Suppression de la visite (admin seulement)                       | Tour Catalog        |
| `category`          | Détails de la catégorie associée                                 | Tour Catalog        |
| `destination`       | Détails de la destination associée                               | Tour Catalog        |
| `reviews`           | Liste des avis pour cette visite                                 | Tour Catalog        |
| `createReview`      | Soumettre un nouvel avis                                         | Tour Catalog        |
| `book`              | **Créer une réservation** (contexte différent !)                 | Booking Management  |
| `checkAvailability` | Vérifier la disponibilité des dates                              | Booking Management  |
| `relatedTours`      | Trouver des visites similaires                                   | Tour Catalog        |

**Note importante :** Les liens `book` et `checkAvailability` pointent vers le microservice **Booking Management**, pas Tour Catalog. Cela illustre comment HATEOAS peut guider le client à travers plusieurs microservices.

---

#### 5. Variation : Liens Conditionnels (Basés sur les Permissions)

Les liens HATEOAS peuvent être **conditionnels** selon le rôle de l'utilisateur authentifié.

**Exemple : Utilisateur anonyme**

```json
{
  "links": {
    "self": { ... },
    "category": { ... },
    "destination": { ... },
    "reviews": { ... },
    "book": { ... }
    // ❌ Pas de lien "update" ou "delete" (non autorisé)
    // ❌ Pas de lien "createReview" (doit se connecter)
  }
}
```

**Exemple : Utilisateur authentifié**

```json
{
  "links": {
    "self": { ... },
    "category": { ... },
    "reviews": { ... },
    "createReview": { ... }, // ✅ Peut créer un avis
    "book": { ... }
    // ❌ Toujours pas de lien "update" ou "delete" (pas admin)
  }
}
```

**Exemple : Administrateur**

```json
{
  "links": {
    "self": { ... },
    "update": { ... }, // ✅ Peut modifier
    "delete": { ... }, // ✅ Peut supprimer
    "category": { ... },
    "reviews": { ... },
    "book": { ... }
  }
}
```

**Implémentation côté serveur :**

```javascript
// tours.controller.js
function buildHATEOASLinks(tour, user) {
  const baseUrl = '/api/v1/tours-catalog';
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
      href: '/api/v1/booking-management/bookings',
      method: 'POST',
      description: 'Create a booking for this tour'
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

  return links;
}

exports.getTourById = async (req, res) => {
  const tour = await tourService.findById(req.params.tourId);
  const links = buildHATEOASLinks(tour, req.user);

  return res.status(200).json({
    status: 'success',
    data: {
      tour: {
        ...tour,
        links
      }
    }
  });
};
```

---

#### 6. Format Alternatif : HAL (Hypertext Application Language)

**HAL** est un standard pour structurer les liens HATEOAS.

**Exemple HAL :**

```json
{
  "status": "success",
  "data": {
    "tour": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Visite de la Tour Eiffel et Croisière sur la Seine",
      "price": 89.99,
      "_links": {
        "self": { "href": "/api/v1/tours-catalog/tours/550e8400-e29b-41d4-a716-446655440000" },
        "category": { "href": "/api/v1/tours-catalog/categories/c1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d" },
        "destination": { "href": "/api/v1/tours-catalog/destinations/d7e8f9a0-b1c2-3d4e-5f6a-7b8c9d0e1f2a" },
        "reviews": { "href": "/api/v1/tours-catalog/tours/550e8400-e29b-41d4-a716-446655440000/reviews" },
        "book": { "href": "/api/v1/booking-management/bookings" }
      },
      "_embedded": {
        "category": {
          "id": "c1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
          "name": "Culture"
        },
        "destination": {
          "id": "d7e8f9a0-b1c2-3d4e-5f6a-7b8c9d0e1f2a",
          "name": "Paris",
          "country": "France"
        }
      }
    }
  }
}
```

**Avantage du HAL :** Le champ `_embedded` permet d'inclure directement les ressources liées (category, destination) sans que le client ait besoin de faire des requêtes supplémentaires.

---

## Conclusion

Ces exercices ont permis de maîtriser :

1. **La conception d'endpoints de recherche** avec filtres, pagination et tri
2. **La gestion d'erreurs standardisée** avec codes HTTP appropriés et détails contextuels
3. **L'implémentation de HATEOAS** pour rendre l'API auto-découvrable et évolutive

**Prochaine étape :** Leçon 2.3 - Implémentation du Tour Catalog Microservice avec Node.js/Express, routes, controllers et validation.
