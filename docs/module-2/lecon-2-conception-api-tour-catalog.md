# Leçon 2.2 - Conception de l'API du Microservice Tour Catalog

**Module 2** : Conception et Implémentation des Microservices Principaux

---

## Vue d'ensemble

La conception de l'API pour le microservice Tour Catalog nécessite une compréhension claire de son Bounded Context et des ressources spécifiques qu'il gère. Ce microservice est responsable de maintenir toutes les informations relatives aux visites disponibles, y compris leurs descriptions, itinéraires, prix, disponibilités et médias associés. L'API sert d'interface principale pour que d'autres microservices et clients externes interagissent avec ces données.

---

## Comprendre le Bounded Context et la Portée de l'API

Dans le Domain-Driven Design (DDD), un Bounded Context définit les limites à l'intérieur desquelles un modèle particulier est applicable. Pour le microservice Tour Catalog, son Bounded Context englobe tout ce qui concerne la définition et la présentation des visites. Cela signifie que l'API doit exposer des opérations alignées avec la gestion des données de visites, sans empiéter sur les préoccupations d'autres domaines comme la gestion des réservations ou le traitement des paiements.

### Responsabilités du Tour Catalog

Par exemple, l'API du Tour Catalog devrait fournir des endpoints pour récupérer les détails des visites. Elle ne devrait **pas**, cependant, offrir des endpoints pour effectuer une réservation ou traiter un paiement. Ces actions appartiennent aux Bounded Contexts de Booking Management et Payment Gateway, respectivement. La portée de l'API est strictement limitée au catalogage et à l'interrogation des informations de visites.

### Exemple de Séparation des Préoccupations

```javascript
// ✅ Correct : Dans le Bounded Context Tour Catalog
GET /api/v1/tours-catalog/tours/{tourId}
// Récupère les détails d'une visite spécifique

// ❌ Incorrect : En dehors du Bounded Context Tour Catalog
POST /api/v1/tours-catalog/tours/{tourId}/book
// Cela devrait appartenir au microservice Booking Management
```

En adhérant à ces limites, nous assurons que chaque microservice reste concentré, maintenable et découplé des autres services.

---

## Principes de Conception d'API RESTful

Lors de la conception d'une API RESTful pour le microservice Tour Catalog, plusieurs principes clés doivent être suivis pour garantir cohérence, prévisibilité et facilité d'utilisation.

### 1. Les Ressources comme Noms

Dans REST, tout est une ressource. Les ressources doivent être représentées par des noms (généralement des noms au pluriel) plutôt que par des verbes. Pour le Tour Catalog, les ressources principales incluent :

- **Tours** : Représente les visites individuelles disponibles
- **Categories** : Regroupe les visites par type (par exemple, Aventure, Culturel, Gastronomique)
- **Destinations** : Emplacements où les visites sont disponibles
- **Reviews** : Avis et évaluations des clients pour les visites

**Exemple de Structure d'URI :**

```
/api/v1/tours-catalog/tours
/api/v1/tours-catalog/categories
/api/v1/tours-catalog/destinations
/api/v1/tours-catalog/tours/{tourId}/reviews
```

### 2. Méthodes HTTP pour les Actions

Les méthodes HTTP définissent l'action à effectuer sur une ressource :

- **GET** : Récupérer une ressource ou une collection de ressources (opération en lecture seule)
- **POST** : Créer une nouvelle ressource
- **PUT** : Remplacer complètement une ressource existante
- **PATCH** : Mettre à jour partiellement une ressource existante
- **DELETE** : Supprimer une ressource

**Exemple d'Application :**

```javascript
// Récupérer toutes les visites
GET /api/v1/tours-catalog/tours

// Récupérer une visite spécifique
GET /api/v1/tours-catalog/tours/{tourId}

// Créer une nouvelle visite
POST /api/v1/tours-catalog/tours

// Remplacer complètement une visite
PUT /api/v1/tours-catalog/tours/{tourId}

// Mettre à jour partiellement une visite (par exemple, changer uniquement le prix)
PATCH /api/v1/tours-catalog/tours/{tourId}

// Supprimer une visite
DELETE /api/v1/tours-catalog/tours/{tourId}
```

### 3. Codes de Statut HTTP

Les codes de statut HTTP appropriés doivent être retournés pour indiquer le résultat d'une requête API :

- **200 OK** : La requête a réussi (utilisé pour GET, PUT, PATCH réussis)
- **201 Created** : Une nouvelle ressource a été créée avec succès (utilisé pour POST)
- **204 No Content** : La requête a réussi mais aucun contenu n'est retourné (utilisé pour DELETE)
- **400 Bad Request** : La requête client était invalide
- **404 Not Found** : La ressource demandée n'existe pas
- **500 Internal Server Error** : Une erreur s'est produite côté serveur

### 4. Pagination, Filtrage et Tri

Pour les collections de ressources, fournir des mécanismes pour la pagination, le filtrage et le tri améliore l'utilisabilité de l'API :

**Pagination :**

```javascript
GET /api/v1/tours-catalog/tours?page=2&limit=20
```

**Filtrage :**

```javascript
GET /api/v1/tours-catalog/tours?category=adventure&destination=paris
```

**Tri :**

```javascript
GET /api/v1/tours-catalog/tours?sort=price&order=asc
```

---

## Endpoints de l'API Tour Catalog

Maintenant que nous avons établi les principes de base, définissons les endpoints spécifiques pour le microservice Tour Catalog.

### 1. Gestion des Tours

#### 1.1 Récupérer Toutes les Visites

**Endpoint :**

```
GET /api/v1/tours-catalog/tours
```

**Description :** Récupère une liste paginée de toutes les visites disponibles.

**Paramètres de Requête :**

- `page` (optionnel) : Numéro de page (par défaut : 1)
- `limit` (optionnel) : Nombre de résultats par page (par défaut : 10)
- `category` (optionnel) : Filtrer par ID de catégorie
- `destination` (optionnel) : Filtrer par ID de destination
- `minPrice` (optionnel) : Prix minimum
- `maxPrice` (optionnel) : Prix maximum
- `sort` (optionnel) : Champ de tri (par exemple, `price`, `rating`, `createdAt`)
- `order` (optionnel) : Ordre de tri (`asc` ou `desc`)

**Réponse :**

```json
{
  "status": "success",
  "data": {
    "tours": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "title": "Visite de la Tour Eiffel et Croisière sur la Seine",
        "description": "Découvrez les monuments emblématiques de Paris",
        "categoryId": "c1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "destinationId": "d7e8f9a0-b1c2-3d4e-5f6a-7b8c9d0e1f2a",
        "price": 89.99,
        "duration": 4,
        "maxGroupSize": 20,
        "rating": 4.7,
        "ratingsCount": 342,
        "images": [
          "https://cdn.example.com/tours/eiffel-tower-1.jpg",
          "https://cdn.example.com/tours/seine-cruise-1.jpg"
        ],
        "createdAt": "2024-01-15T10:30:00Z",
        "updatedAt": "2024-12-20T14:22:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 15,
      "totalItems": 147,
      "itemsPerPage": 10
    }
  }
}
```

**Codes de Statut :**

- `200 OK` : Succès
- `400 Bad Request` : Paramètres de requête invalides

#### 1.2 Récupérer une Visite Spécifique

**Endpoint :**

```
GET /api/v1/tours-catalog/tours/{tourId}
```

**Description :** Récupère les détails complets d'une visite spécifique par son ID.

**Paramètres de Chemin :**

- `tourId` : L'identifiant unique de la visite (UUID)

**Réponse :**

```json
{
  "status": "success",
  "data": {
    "tour": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Visite de la Tour Eiffel et Croisière sur la Seine",
      "description": "Découvrez les monuments emblématiques de Paris avec un guide expert",
      "longDescription": "Cette visite complète vous emmène...",
      "categoryId": "c1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "destinationId": "d7e8f9a0-b1c2-3d4e-5f6a-7b8c9d0e1f2a",
      "price": 89.99,
      "duration": 4,
      "maxGroupSize": 20,
      "difficulty": "easy",
      "rating": 4.7,
      "ratingsCount": 342,
      "images": [
        "https://cdn.example.com/tours/eiffel-tower-1.jpg",
        "https://cdn.example.com/tours/seine-cruise-1.jpg"
      ],
      "itinerary": [
        {
          "day": 1,
          "activities": ["Visite de la Tour Eiffel", "Croisière sur la Seine"]
        }
      ],
      "includedItems": ["Guide professionnel", "Billets d'entrée", "Boissons"],
      "excludedItems": ["Repas", "Pourboires"],
      "meetingPoint": "Place du Trocadéro, 75016 Paris",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-12-20T14:22:00Z"
    }
  }
}
```

**Codes de Statut :**

- `200 OK` : Succès
- `404 Not Found` : Visite non trouvée

#### 1.3 Créer une Nouvelle Visite

**Endpoint :**

```
POST /api/v1/tours-catalog/tours
```

**Description :** Crée une nouvelle visite dans le catalogue.

**Corps de Requête :**

```json
{
  "title": "Visite du Louvre et des Champs-Élysées",
  "description": "Explorez le célèbre musée du Louvre",
  "longDescription": "Cette visite guidée vous emmène...",
  "categoryId": "c1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
  "destinationId": "d7e8f9a0-b1c2-3d4e-5f6a-7b8c9d0e1f2a",
  "price": 75.00,
  "duration": 3,
  "maxGroupSize": 15,
  "difficulty": "moderate",
  "images": [
    "https://cdn.example.com/tours/louvre-1.jpg"
  ],
  "itinerary": [
    {
      "day": 1,
      "activities": ["Visite du Louvre", "Promenade sur les Champs-Élysées"]
    }
  ],
  "includedItems": ["Guide professionnel", "Billets d'entrée"],
  "excludedItems": ["Repas", "Transport"],
  "meetingPoint": "Pyramide du Louvre, 75001 Paris"
}
```

**Réponse :**

```json
{
  "status": "success",
  "data": {
    "tour": {
      "id": "660f9511-f3ac-52e5-b827-557766551111",
      "title": "Visite du Louvre et des Champs-Élysées",
      "description": "Explorez le célèbre musée du Louvre",
      "categoryId": "c1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "destinationId": "d7e8f9a0-b1c2-3d4e-5f6a-7b8c9d0e1f2a",
      "price": 75.00,
      "duration": 3,
      "maxGroupSize": 15,
      "rating": 0,
      "ratingsCount": 0,
      "createdAt": "2025-12-30T10:15:00Z",
      "updatedAt": "2025-12-30T10:15:00Z"
    }
  }
}
```

**Codes de Statut :**

- `201 Created` : Visite créée avec succès
- `400 Bad Request` : Données de requête invalides

#### 1.4 Mettre à Jour Complètement une Visite

**Endpoint :**

```
PUT /api/v1/tours-catalog/tours/{tourId}
```

**Description :** Remplace complètement une visite existante.

**Corps de Requête :** Même structure que POST (tous les champs requis)

**Codes de Statut :**

- `200 OK` : Visite mise à jour avec succès
- `404 Not Found` : Visite non trouvée
- `400 Bad Request` : Données de requête invalides

#### 1.5 Mettre à Jour Partiellement une Visite

**Endpoint :**

```
PATCH /api/v1/tours-catalog/tours/{tourId}
```

**Description :** Met à jour partiellement les champs spécifiques d'une visite.

**Corps de Requête :**

```json
{
  "price": 79.99,
  "maxGroupSize": 18
}
```

**Réponse :**

```json
{
  "status": "success",
  "data": {
    "tour": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "price": 79.99,
      "maxGroupSize": 18,
      "updatedAt": "2025-12-30T11:20:00Z"
    }
  }
}
```

**Codes de Statut :**

- `200 OK` : Visite mise à jour avec succès
- `404 Not Found` : Visite non trouvée
- `400 Bad Request` : Données de requête invalides

#### 1.6 Supprimer une Visite

**Endpoint :**

```
DELETE /api/v1/tours-catalog/tours/{tourId}
```

**Description :** Supprime une visite du catalogue.

**Réponse :**

```json
{
  "status": "success",
  "message": "Tour deleted successfully"
}
```

**Codes de Statut :**

- `204 No Content` : Visite supprimée avec succès
- `404 Not Found` : Visite non trouvée

### 2. Gestion des Catégories

#### 2.1 Récupérer Toutes les Catégories

**Endpoint :**

```
GET /api/v1/tours-catalog/categories
```

**Réponse :**

```json
{
  "status": "success",
  "data": {
    "categories": [
      {
        "id": "c1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "name": "Aventure",
        "description": "Visites riches en adrénaline et activités de plein air",
        "imageUrl": "https://cdn.example.com/categories/adventure.jpg",
        "tourCount": 47
      },
      {
        "id": "e2f3a4b5-c6d7-8e9f-0a1b-2c3d4e5f6a7b",
        "name": "Culturel",
        "description": "Explorez l'histoire, l'art et les traditions locales",
        "imageUrl": "https://cdn.example.com/categories/cultural.jpg",
        "tourCount": 62
      }
    ]
  }
}
```

**Codes de Statut :**

- `200 OK` : Succès

#### 2.2 Créer une Nouvelle Catégorie

**Endpoint :**

```
POST /api/v1/tours-catalog/categories
```

**Corps de Requête :**

```json
{
  "name": "Gastronomique",
  "description": "Expériences culinaires et visites gastronomiques",
  "imageUrl": "https://cdn.example.com/categories/food.jpg"
}
```

**Codes de Statut :**

- `201 Created` : Catégorie créée avec succès
- `400 Bad Request` : Données invalides

### 3. Gestion des Destinations

#### 3.1 Récupérer Toutes les Destinations

**Endpoint :**

```
GET /api/v1/tours-catalog/destinations
```

**Réponse :**

```json
{
  "status": "success",
  "data": {
    "destinations": [
      {
        "id": "d7e8f9a0-b1c2-3d4e-5f6a-7b8c9d0e1f2a",
        "name": "Paris",
        "country": "France",
        "description": "La Ville Lumière",
        "imageUrl": "https://cdn.example.com/destinations/paris.jpg",
        "tourCount": 89
      }
    ]
  }
}
```

**Codes de Statut :**

- `200 OK` : Succès

#### 3.2 Créer une Nouvelle Destination

**Endpoint :**

```
POST /api/v1/tours-catalog/destinations
```

**Corps de Requête :**

```json
{
  "name": "Lyon",
  "country": "France",
  "description": "Capitale gastronomique de la France",
  "imageUrl": "https://cdn.example.com/destinations/lyon.jpg"
}
```

**Codes de Statut :**

- `201 Created` : Destination créée avec succès
- `400 Bad Request` : Données invalides

### 4. Gestion des Avis (Lecture Seule)

Le microservice Tour Catalog expose les avis en lecture seule. La création et la modification des avis sont gérées par le microservice Review Management.

#### 4.1 Récupérer les Avis d'une Visite

**Endpoint :**

```
GET /api/v1/tours-catalog/tours/{tourId}/reviews
```

**Paramètres de Requête :**

- `page` (optionnel) : Numéro de page
- `limit` (optionnel) : Résultats par page

**Réponse :**

```json
{
  "status": "success",
  "data": {
    "reviews": [
      {
        "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "tourId": "550e8400-e29b-41d4-a716-446655440000",
        "userId": "u1s2e3r4-i5d6-7h8e-9r0e-1a2b3c4d5e6f",
        "rating": 5,
        "comment": "Expérience incroyable ! Guide très compétent.",
        "createdAt": "2024-11-20T15:30:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 12,
      "totalItems": 342,
      "itemsPerPage": 30
    }
  }
}
```

**Codes de Statut :**

- `200 OK` : Succès
- `404 Not Found` : Visite non trouvée

---

## Requêtes et Réponses

### Structure des Payloads de Requête

Lors de la création ou de la mise à jour de ressources, les clients doivent envoyer des données au format JSON. Les champs requis doivent toujours être inclus, tandis que les champs optionnels peuvent être omis.

**Exemple de Requête POST pour Créer une Visite :**

```json
{
  "title": "Visite de Montmartre et du Sacré-Cœur",
  "description": "Découvrez le quartier artistique de Paris",
  "longDescription": "Explorez les rues pavées de Montmartre...",
  "categoryId": "e2f3a4b5-c6d7-8e9f-0a1b-2c3d4e5f6a7b",
  "destinationId": "d7e8f9a0-b1c2-3d4e-5f6a-7b8c9d0e1f2a",
  "price": 45.00,
  "duration": 2.5,
  "maxGroupSize": 12,
  "difficulty": "easy",
  "images": ["https://cdn.example.com/tours/montmartre-1.jpg"],
  "itinerary": [
    {
      "day": 1,
      "activities": ["Place du Tertre", "Sacré-Cœur", "Moulin Rouge"]
    }
  ],
  "includedItems": ["Guide local", "Dégustation de fromage"],
  "excludedItems": ["Transport"],
  "meetingPoint": "Métro Abbesses, 75018 Paris"
}
```

### Structure des Payloads de Réponse

Toutes les réponses suivent une structure cohérente avec un champ `status` et un champ `data` contenant la ressource ou la collection demandée.

**Réponse Réussie (200 OK) :**

```json
{
  "status": "success",
  "data": {
    "tour": { /* objet visite */ }
  }
}
```

**Réponse de Liste avec Pagination :**

```json
{
  "status": "success",
  "data": {
    "tours": [ /* tableau d'objets visites */ ],
    "pagination": {
      "currentPage": 2,
      "totalPages": 15,
      "totalItems": 147,
      "itemsPerPage": 10
    }
  }
}
```

### HATEOAS (Hypermedia as the Engine of Application State)

Pour améliorer la découvrabilité de l'API, nous pouvons inclure des liens hypertexte dans les réponses qui guident les clients vers les actions ou ressources connexes.

**Exemple avec Liens HATEOAS :**

```json
{
  "status": "success",
  "data": {
    "tour": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Visite de la Tour Eiffel et Croisière sur la Seine",
      "price": 89.99,
      "links": {
        "self": "/api/v1/tours-catalog/tours/550e8400-e29b-41d4-a716-446655440000",
        "category": "/api/v1/tours-catalog/categories/c1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "destination": "/api/v1/tours-catalog/destinations/d7e8f9a0-b1c2-3d4e-5f6a-7b8c9d0e1f2a",
        "reviews": "/api/v1/tours-catalog/tours/550e8400-e29b-41d4-a716-446655440000/reviews",
        "book": "/api/v1/booking-management/bookings"
      }
    }
  }
}
```

Les liens HATEOAS permettent aux clients de naviguer dynamiquement dans l'API sans coder en dur les URLs.

---

## Gestion des Erreurs

Une gestion cohérente des erreurs est essentielle pour une bonne expérience développeur. Toutes les réponses d'erreur doivent suivre un format standardisé.

### Structure de Réponse d'Erreur

```json
{
  "status": "error",
  "error": {
    "code": "TOUR_NOT_FOUND",
    "message": "The requested tour does not exist",
    "details": {
      "tourId": "550e8400-e29b-41d4-a716-446655440000"
    }
  }
}
```

### Codes d'Erreur Courants

| Code de Statut HTTP | Code d'Erreur | Message |
|---------------------|---------------|---------|
| 400 | INVALID_REQUEST | The request body contains invalid data |
| 404 | TOUR_NOT_FOUND | The requested tour does not exist |
| 404 | CATEGORY_NOT_FOUND | The requested category does not exist |
| 404 | DESTINATION_NOT_FOUND | The requested destination does not exist |
| 409 | DUPLICATE_ENTRY | A tour with this title already exists |
| 500 | INTERNAL_SERVER_ERROR | An unexpected error occurred |

### Exemple de Validation de Requête

Si un client envoie une requête POST avec un prix manquant :

**Requête :**

```json
{
  "title": "Visite Invalide",
  "description": "Description de la visite"
  // Champ price manquant
}
```

**Réponse (400 Bad Request) :**

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
          "message": "price is required"
        },
        {
          "field": "categoryId",
          "message": "categoryId is required"
        }
      ]
    }
  }
}
```

---

## Versionnage de l'API

Le versionnage est crucial pour maintenir la compatibilité descendante lorsque l'API évolue. Il existe plusieurs stratégies de versionnage, mais pour ce microservice, nous utiliserons le **versionnage par URI**.

### Versionnage par URI

Le numéro de version est inclus dans le chemin de l'URL :

```
/api/v1/tours-catalog/tours
/api/v2/tours-catalog/tours
```

**Avantages :**

- Clair et explicite
- Facile à router et à gérer dans le code backend
- Les clients peuvent facilement basculer entre les versions

**Inconvénients :**

- Peut conduire à la duplication de code si plusieurs versions sont maintenues simultanément

### Cycle de Vie des Versions

Lorsqu'une nouvelle version de l'API est publiée :

1. **Dépréciation** : Annoncer que l'ancienne version sera dépréciée avec un délai (par exemple, 6 mois)
2. **Support Parallèle** : Maintenir à la fois l'ancienne et la nouvelle version pendant la période de transition
3. **Suppression** : Après le délai, retirer l'ancienne version

**Exemple d'En-tête de Dépréciation :**

```
Deprecation: Sun, 30 Jun 2026 23:59:59 GMT
Sunset: Sun, 31 Dec 2026 23:59:59 GMT
Link: </api/v2/tours-catalog/tours>; rel="successor-version"
```

---

## Exercices Pratiques

### Exercice 1 : Concevoir un Endpoint pour la Recherche de Visites

**Objectif :** Concevoir un endpoint permettant aux utilisateurs de rechercher des visites par mot-clé.

**Tâches :**

1. Définir l'URI de l'endpoint (par exemple, `/api/v1/tours-catalog/tours/search`)
2. Spécifier la méthode HTTP (GET)
3. Définir les paramètres de requête (par exemple, `query`, `category`, `minPrice`, `maxPrice`)
4. Créer un exemple de réponse avec au moins 2 résultats de visites
5. Documenter les codes de statut possibles

**Exemple de Solution :**

```
GET /api/v1/tours-catalog/tours/search?query=eiffel&minPrice=50&maxPrice=100
```

**Réponse :**

```json
{
  "status": "success",
  "data": {
    "tours": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "title": "Visite de la Tour Eiffel et Croisière sur la Seine",
        "price": 89.99
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 1
    }
  }
}
```

### Exercice 2 : Implémenter la Gestion des Erreurs pour les Ressources Non Trouvées

**Objectif :** Définir la structure de réponse d'erreur lorsqu'une visite demandée n'existe pas.

**Tâches :**

1. Définir le code de statut HTTP (404)
2. Créer la structure JSON de réponse d'erreur
3. Inclure un code d'erreur et un message descriptif
4. Ajouter des détails contextuels (par exemple, l'ID de la visite demandée)

**Exemple de Solution :**

```json
{
  "status": "error",
  "error": {
    "code": "TOUR_NOT_FOUND",
    "message": "The requested tour does not exist",
    "details": {
      "tourId": "999e9999-e99b-99d9-a999-999999999999"
    }
  }
}
```

### Exercice 3 : Ajouter les Liens HATEOAS à une Réponse de Visite

**Objectif :** Améliorer une réponse d'endpoint de visite avec des liens HATEOAS pour la navigation.

**Tâches :**

1. Prendre un objet de réponse de visite existant
2. Ajouter un champ `links` contenant :
   - `self` : Lien vers la ressource de la visite elle-même
   - `category` : Lien vers la catégorie de la visite
   - `destination` : Lien vers la destination de la visite
   - `reviews` : Lien vers les avis de la visite
   - `book` : Lien vers l'endpoint de réservation (dans le microservice Booking)

**Exemple de Solution :**

```json
{
  "status": "success",
  "data": {
    "tour": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Visite de la Tour Eiffel et Croisière sur la Seine",
      "price": 89.99,
      "categoryId": "c1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "destinationId": "d7e8f9a0-b1c2-3d4e-5f6a-7b8c9d0e1f2a",
      "links": {
        "self": "/api/v1/tours-catalog/tours/550e8400-e29b-41d4-a716-446655440000",
        "category": "/api/v1/tours-catalog/categories/c1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        "destination": "/api/v1/tours-catalog/destinations/d7e8f9a0-b1c2-3d4e-5f6a-7b8c9d0e1f2a",
        "reviews": "/api/v1/tours-catalog/tours/550e8400-e29b-41d4-a716-446655440000/reviews",
        "book": "/api/v1/booking-management/bookings"
      }
    }
  }
}
```

---

## Applications Réelles

### Exemple 1 : API du Service de Listage Airbnb

Le microservice de listage d'Airbnb gère toutes les propriétés disponibles (appartements, maisons, etc.). Son API expose des endpoints pour :

- Récupérer les listages avec filtrage (emplacement, prix, type de propriété)
- Créer de nouveaux listages (pour les hôtes)
- Mettre à jour les détails des listages
- Supprimer les listages

L'API ne gère **pas** les réservations ou les paiements, qui sont gérés par des microservices séparés, suivant les principes du Bounded Context.

### Exemple 2 : API du Service de Catalogue Spotify

Le microservice de catalogue de Spotify gère les informations sur les chansons, albums et artistes. Son API fournit des endpoints pour :

- Rechercher des chansons, albums et artistes
- Récupérer les métadonnées des pistes (durée, genre, date de sortie)
- Obtenir les listes de lecture organisées

Le service de catalogue ne gère **pas** la lecture des flux audio ou les abonnements utilisateurs, qui appartiennent à d'autres Bounded Contexts.

---

## Ressources Complémentaires

- **Documentation Express 4.21.x** : [https://expressjs.com/en/4x/api.html](https://expressjs.com/en/4x/api.html)
- **Guide des Codes de Statut HTTP** : [https://developer.mozilla.org/fr/docs/Web/HTTP/Status](https://developer.mozilla.org/fr/docs/Web/HTTP/Status)
- **Principes de Conception d'API RESTful** : [https://restfulapi.net/](https://restfulapi.net/)
- **Spécification HATEOAS** : [https://en.wikipedia.org/wiki/HATEOAS](https://en.wikipedia.org/wiki/HATEOAS)
- **Meilleures Pratiques de Versionnage d'API** : [https://www.baeldung.com/rest-versioning](https://www.baeldung.com/rest-versioning)
- **Documentation Node.js 24.x LTS** : [https://nodejs.org/docs/latest-v24.x/api/](https://nodejs.org/docs/latest-v24.x/api/)
- **Documentation PostgreSQL 18.x** : [https://www.postgresql.org/docs/18/](https://www.postgresql.org/docs/18/)

---

## Conclusion

Dans cette leçon, nous avons conçu une API RESTful complète pour le microservice Tour Catalog. Nous avons défini des endpoints clairs pour gérer les visites, catégories, destinations et avis, en respectant les limites du Bounded Context. En suivant les principes RESTful, en implémentant une gestion cohérente des erreurs et en adoptant une stratégie de versionnage, nous avons créé une API robuste, maintenable et évolutive.

Dans la prochaine leçon, nous passerons à l'implémentation de ce microservice en utilisant Node.js 24.x et Express 4.21.x, en transformant cette conception en code fonctionnel.
