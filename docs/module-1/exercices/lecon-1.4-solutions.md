# Solutions - Leçon 1.4 : Design d'API RESTful

**Module 1** : Fondements du Développement Web Moderne et des Microservices

---

## Vue d'ensemble

Ces exercices vous permettent de mettre en pratique les principes de conception d'API RESTful en concevant des URIs, des réponses d'erreur et des stratégies de versionnement appropriées.

---

## Exercice 1 : Mapping URI et Méthode HTTP

### Objectif

Identifier les URIs et méthodes HTTP appropriées pour différentes opérations sur les avis de visites.

---

### a) Récupérer tous les avis pour un tour spécifique

**URI** : `/v1/tours/tropical-paradise-getaway/reviews`

**Méthode HTTP** : `GET`

**Explication** :
- L'URI suit une structure hiérarchique : `/tours/{tour-id}/reviews`
- La ressource parente est le tour, la ressource enfant est les avis
- `GET` est utilisé pour récupérer des ressources sans modification

**Exemple de requête** :
```http
GET /v1/tours/tropical-paradise-getaway/reviews HTTP/1.1
Host: api.tourism-app.com
Accept: application/json
```

**Exemple de réponse (200 OK)** :
```json
{
  "data": [
    {
      "id": "review-123",
      "tour_id": "tropical-paradise-getaway",
      "user": {
        "id": "user-456",
        "name": "Hermione Granger",
        "avatar_url": "https://..."
      },
      "rating": 5,
      "title": "Expérience inoubliable !",
      "comment": "Une visite absolument magnifique. Les paysages étaient à couper le souffle.",
      "created_at": "2026-10-15T10:30:00Z",
      "verified_booking": true
    },
    {
      "id": "review-789",
      "tour_id": "tropical-paradise-getaway",
      "user": {
        "id": "user-321",
        "name": "Harry Potter"
      },
      "rating": 4,
      "title": "Très bonne expérience",
      "comment": "Guide très compétent, quelques imprévus mais globalement excellent.",
      "created_at": "2026-10-10T14:20:00Z",
      "verified_booking": true
    }
  ],
  "pagination": {
    "total": 47,
    "count": 2,
    "per_page": 10,
    "current_page": 1,
    "total_pages": 5
  },
  "links": {
    "self": "/v1/tours/tropical-paradise-getaway/reviews?page=1",
    "next": "/v1/tours/tropical-paradise-getaway/reviews?page=2"
  }
}
```

**Query parameters optionnels** :
```
GET /v1/tours/tropical-paradise-getaway/reviews?rating=5&sort=-created_at&limit=10&page=1
```

---

### b) Ajouter un nouvel avis pour le tour

**URI** : `/v1/tours/tropical-paradise-getaway/reviews`

**Méthode HTTP** : `POST`

**Explication** :
- `POST` est utilisé pour créer une nouvelle ressource
- L'URI de la collection (`/reviews`) est utilisée, pas d'ID spécifique
- Le serveur générera l'ID de l'avis et le retournera

**Exemple de requête** :
```http
POST /v1/tours/tropical-paradise-getaway/reviews HTTP/1.1
Host: api.tourism-app.com
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "rating": 5,
  "title": "Tour exceptionnel !",
  "comment": "J'ai adoré chaque moment de ce tour. Le guide était très professionnel et les lieux visités étaient magnifiques. Je recommande vivement !",
  "photos": [
    "https://cdn.tourism-app.com/uploads/photo1.jpg",
    "https://cdn.tourism-app.com/uploads/photo2.jpg"
  ]
}
```

**Exemple de réponse (201 Created)** :
```http
HTTP/1.1 201 Created
Location: /v1/tours/tropical-paradise-getaway/reviews/review-999
Content-Type: application/json

{
  "id": "review-999",
  "tour_id": "tropical-paradise-getaway",
  "user": {
    "id": "user-456",
    "name": "Katniss Everdeen"
  },
  "rating": 5,
  "title": "Tour exceptionnel !",
  "comment": "J'ai adoré chaque moment de ce tour...",
  "photos": [
    "https://cdn.tourism-app.com/uploads/photo1.jpg",
    "https://cdn.tourism-app.com/uploads/photo2.jpg"
  ],
  "created_at": "2026-10-20T09:15:00Z",
  "verified_booking": true,
  "helpful_count": 0
}
```

**Validations côté serveur** :
- L'utilisateur doit être authentifié (vérification du token JWT)
- L'utilisateur doit avoir effectivement réservé ce tour (verified_booking)
- Rating doit être entre 1 et 5
- Title et comment doivent respecter les limites de longueur

---

### c) Mettre à jour uniquement la note d'un avis existant

**URI** : `/v1/tours/tropical-paradise-getaway/reviews/review-123`

**Méthode HTTP** : `PATCH`

**Explication** :
- `PATCH` est utilisé pour les mises à jour partielles (modification d'un seul champ)
- `PUT` nécessiterait d'envoyer toute la représentation complète de la ressource
- L'URI pointe vers la ressource spécifique à modifier

**Exemple de requête** :
```http
PATCH /v1/tours/tropical-paradise-getaway/reviews/review-123 HTTP/1.1
Host: api.tourism-app.com
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "rating": 4
}
```

**Exemple de réponse (200 OK)** :
```json
{
  "id": "review-123",
  "tour_id": "tropical-paradise-getaway",
  "user": {
    "id": "user-456",
    "name": "Katniss Everdeen"
  },
  "rating": 4,
  "title": "Expérience inoubliable !",
  "comment": "Une visite absolument magnifique...",
  "created_at": "2026-10-15T10:30:00Z",
  "updated_at": "2026-10-20T09:20:00Z",
  "verified_booking": true
}
```

**Alternative avec PUT (mise à jour complète)** :
```http
PUT /v1/tours/tropical-paradise-getaway/reviews/review-123 HTTP/1.1

{
  "rating": 4,
  "title": "Expérience inoubliable !",
  "comment": "Une visite absolument magnifique. Les paysages étaient à couper le souffle.",
  "photos": ["https://..."]
}
```

**Différence clé** :
- **PATCH** : Seul `rating` est envoyé, les autres champs restent inchangés
- **PUT** : Tous les champs doivent être envoyés, remplacement complet de la ressource

---

### d) Supprimer un avis utilisateur

**URI** : `/v1/tours/tropical-paradise-getaway/reviews/review-456`

**Méthode HTTP** : `DELETE`

**Explication** :
- `DELETE` est utilisé pour supprimer une ressource spécifique
- L'URI pointe vers la ressource exacte à supprimer
- Opération idempotente : plusieurs DELETE du même avis donnent le même résultat

**Exemple de requête** :
```http
DELETE /v1/tours/tropical-paradise-getaway/reviews/review-456 HTTP/1.1
Host: api.tourism-app.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Exemple de réponse (204 No Content)** :
```http
HTTP/1.1 204 No Content
```

**Alternative avec confirmation (200 OK)** :
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "message": "Avis supprimé avec succès",
  "deleted_review_id": "review-456"
}
```

**Cas d'erreur - Avis déjà supprimé ou inexistant (404)** :
```http
HTTP/1.1 404 Not Found
Content-Type: application/json

{
  "error": {
    "code": "REVIEW_NOT_FOUND",
    "message": "L'avis avec l'ID 'review-456' n'existe pas ou a déjà été supprimé",
    "timestamp": "2026-10-20T09:25:00Z"
  }
}
```

**Cas d'erreur - Utilisateur non autorisé (403)** :
```http
HTTP/1.1 403 Forbidden
Content-Type: application/json

{
  "error": {
    "code": "FORBIDDEN",
    "message": "Vous n'êtes pas autorisé à supprimer cet avis. Seul l'auteur peut supprimer son propre avis.",
    "timestamp": "2026-10-20T09:25:00Z"
  }
}
```

---

### e) Requête complexe avec filtrage, tri et pagination

**URI** : `/v1/tours?price_max=500&sort=-destination&limit=10&page=2`

**Méthode HTTP** : `GET`

**Décomposition des query parameters** :

| Paramètre | Valeur | Signification |
|-----------|--------|---------------|
| `price_max` | `500` | Filtrer les tours avec price ≤ 500$ |
| `sort` | `-destination` | Trier par destination en ordre décroissant (le `-` indique DESC) |
| `limit` | `10` | 10 résultats par page |
| `page` | `2` | Deuxième page (résultats 11-20) |

**URI complète** :
```
GET /v1/tours?price_max=500&sort=-destination&limit=10&page=2
```

**Explication détaillée** :

**1. Filtrage** : `price_max=500`
- Seuls les tours avec `price <= 500` sont inclus
- Alternative : `price_min=100&price_max=500` pour une fourchette

**2. Tri** : `sort=-destination`
- Tri par le champ `destination` en ordre décroissant (Z à A)
- Le préfixe `-` indique l'ordre descendant
- Sans `-`, ce serait ascendant : `sort=destination` (A à Z)

**3. Pagination** :
- `limit=10` : 10 tours par page
- `page=2` : Deuxième page
- Offset calculé : `(page - 1) * limit = (2 - 1) * 10 = 10`
- Résultats : tours 11 à 20

**Exemple de requête HTTP** :
```http
GET /v1/tours?price_max=500&sort=-destination&limit=10&page=2 HTTP/1.1
Host: api.tourism-app.com
Accept: application/json
```

**Exemple de réponse (200 OK)** :
```json
{
  "data": [
    {
      "id": "tour-456",
      "name": "Visite de Tokyo",
      "destination": "Tokyo, Japon",
      "price": 450.00,
      "duration": "5 jours",
      "rating": 4.8
    },
    {
      "id": "tour-789",
      "name": "Safari au Kenya",
      "destination": "Nairobi, Kenya",
      "price": 480.00,
      "duration": "7 jours",
      "rating": 4.9
    },
    {
      "id": "tour-321",
      "name": "Tour Gastronomique",
      "destination": "Lyon, France",
      "price": 250.00,
      "duration": "3 jours",
      "rating": 4.6
    }
    // ... 7 autres tours
  ],
  "pagination": {
    "total": 87,
    "count": 10,
    "per_page": 10,
    "current_page": 2,
    "total_pages": 9,
    "has_previous": true,
    "has_next": true
  },
  "filters": {
    "price_max": 500
  },
  "sort": {
    "field": "destination",
    "order": "desc"
  },
  "links": {
    "self": "/v1/tours?price_max=500&sort=-destination&limit=10&page=2",
    "first": "/v1/tours?price_max=500&sort=-destination&limit=10&page=1",
    "previous": "/v1/tours?price_max=500&sort=-destination&limit=10&page=1",
    "next": "/v1/tours?price_max=500&sort=-destination&limit=10&page=3",
    "last": "/v1/tours?price_max=500&sort=-destination&limit=10&page=9"
  }
}
```

**Implémentation SQL (PostgreSQL)** :
```sql
SELECT * FROM tours
WHERE price <= $1
ORDER BY destination DESC
LIMIT $2 OFFSET $3;

-- Paramètres : [500, 10, 10]
```

**Implémentation Node.js/Express** :
```javascript
app.get('/v1/tours', async (req, res) => {
  const {
    price_max,
    sort = 'name',
    limit = 10,
    page = 1
  } = req.query;

  const offset = (page - 1) * limit;

  // Parsing du tri
  const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
  const sortOrder = sort.startsWith('-') ? 'DESC' : 'ASC';

  // Construction de la requête
  let query = 'SELECT * FROM tours WHERE 1=1';
  const params = [];
  let paramCount = 1;

  if (price_max) {
    query += ` AND price <= $${paramCount}`;
    params.push(parseFloat(price_max));
    paramCount++;
  }

  query += ` ORDER BY ${sortField} ${sortOrder}`;
  query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
  params.push(parseInt(limit), parseInt(offset));

  const result = await executeQuery(query, params);

  // Compter le total
  const countQuery = price_max
    ? 'SELECT COUNT(*) FROM tours WHERE price <= $1'
    : 'SELECT COUNT(*) FROM tours';
  const countParams = price_max ? [parseFloat(price_max)] : [];
  const countResult = await executeQuery(countQuery, countParams);
  const total = parseInt(countResult.rows[0].count);

  res.json({
    data: result.rows,
    pagination: {
      total,
      count: result.rows.length,
      per_page: parseInt(limit),
      current_page: parseInt(page),
      total_pages: Math.ceil(total / limit)
    }
  });
});
```

---

## Exercice 2 : Conception d'une réponse d'erreur

### Scénario

Un client tente de réserver un tour, mais :
1. Les dates demandées ne sont pas disponibles
2. Le nombre de voyageurs dépasse la capacité maximale du groupe

### Solution : Réponse 422 Unprocessable Entity

**Choix du code de statut** :

- **400 Bad Request** : Erreur de syntaxe ou requête malformée
- **422 Unprocessable Entity** : **Recommandé ici** - La requête est bien formée mais contient des erreurs de validation sémantique

**Réponse JSON structurée** :

```http
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/json

{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "La réservation ne peut pas être traitée en raison d'erreurs de validation",
    "timestamp": "2026-10-20T10:45:00Z",
    "request_id": "req_7d8f9a2b3c4e5f6g"
  },
  "validation_errors": [
    {
      "field": "booking_date",
      "code": "DATE_NOT_AVAILABLE",
      "message": "La date sélectionnée (2026-10-25) n'est pas disponible pour ce tour",
      "details": {
        "requested_date": "2026-10-25",
        "next_available_dates": [
          "2026-10-27",
          "2026-10-29",
          "2026-01-03"
        ]
      }
    },
    {
      "field": "number_of_travelers",
      "code": "EXCEEDS_MAX_CAPACITY",
      "message": "Le nombre de voyageurs (15) dépasse la capacité maximale du groupe",
      "details": {
        "requested": 15,
        "maximum_allowed": 12,
        "currently_available_seats": 8
      }
    }
  ],
  "help": {
    "documentation": "https://docs.tourism-app.com/api/errors/validation",
    "contact_support": "support@tourism-app.com"
  }
}
```

### Explication de la structure

#### 1. Objet `error` principal

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Description lisible par l'humain",
  "timestamp": "ISO 8601 timestamp",
  "request_id": "Identifiant unique pour le débogage"
}
```

**Avantages** :
- `code` : Permet aux clients de traiter programmatiquement l'erreur
- `message` : Contexte général pour l'utilisateur final
- `timestamp` : Pour l'audit et le débogage
- `request_id` : Permet de tracer la requête dans les logs serveur

#### 2. Tableau `validation_errors`

Chaque erreur de validation contient :

```json
{
  "field": "nom_du_champ",
  "code": "CODE_ERREUR_SPECIFIQUE",
  "message": "Message explicatif",
  "details": {
    // Informations contextuelles spécifiques
  }
}
```

**Avantages** :
- Plusieurs erreurs peuvent être retournées en une seule réponse
- Le champ `field` permet d'identifier précisément le champ en erreur (utile pour surligner dans l'UI)
- `details` fournit des informations actionnables (alternatives, limites, etc.)

#### 3. Objet `help`

```json
{
  "documentation": "URL vers la doc",
  "contact_support": "Email ou lien de contact"
}
```

**Avantages** :
- Guide l'utilisateur vers des ressources utiles
- Facilite le débogage et le support

### Comparaison avec une mauvaise réponse

**❌ Mauvaise pratique** :
```json
{
  "error": "Invalid booking"
}
```

**Problèmes** :
- Message vague et non actionnable
- Pas de détails sur ce qui est invalide
- Pas d'alternative proposée
- Impossible de traiter programmatiquement

**✅ Bonne pratique** (notre solution) :
- Identifie précisément chaque problème
- Fournit des alternatives (dates disponibles)
- Indique les limites (capacité maximale)
- Structure permettant un traitement automatique

### Implémentation Node.js/Express

```javascript
app.post('/v1/bookings', async (req, res) => {
  const { tour_id, booking_date, number_of_travelers } = req.body;

  const errors = [];

  // Vérifier la disponibilité de la date
  const tour = await getTourById(tour_id);
  if (!tour.available_dates.includes(booking_date)) {
    errors.push({
      field: 'booking_date',
      code: 'DATE_NOT_AVAILABLE',
      message: `La date sélectionnée (${booking_date}) n'est pas disponible pour ce tour`,
      details: {
        requested_date: booking_date,
        next_available_dates: tour.available_dates.slice(0, 3)
      }
    });
  }

  // Vérifier la capacité
  if (number_of_travelers > tour.max_group_size) {
    errors.push({
      field: 'number_of_travelers',
      code: 'EXCEEDS_MAX_CAPACITY',
      message: `Le nombre de voyageurs (${number_of_travelers}) dépasse la capacité maximale du groupe`,
      details: {
        requested: number_of_travelers,
        maximum_allowed: tour.max_group_size,
        currently_available_seats: tour.available_seats
      }
    });
  }

  // Si des erreurs existent, retourner 422
  if (errors.length > 0) {
    return res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'La réservation ne peut pas être traitée en raison d\'erreurs de validation',
        timestamp: new Date().toISOString(),
        request_id: req.id
      },
      validation_errors: errors,
      help: {
        documentation: 'https://docs.tourism-app.com/api/errors/validation',
        contact_support: 'support@tourism-app.com'
      }
    });
  }

  // Sinon, procéder à la réservation
  const booking = await createBooking({tour_id, booking_date, number_of_travelers});
  res.status(201).json(booking);
});
```

---

## Exercice 3 : Décision de versionnement d'API

### Scénario

- **v1** : Champ unique `price`
- **v2** : Introduction de `adultPrice` et `childPrice`, suppression potentielle de `price`

### Pourquoi le versionnement par URI est un bon choix

#### Exemple concret

**v1** :
```json
GET /v1/tours/tropical-paradise-getaway

{
  "id": "tropical-paradise-getaway",
  "name": "Escapade au Paradis Tropical",
  "price": 1200.00,
  "duration": "7 jours"
}
```

**v2** :
```json
GET /v2/tours/tropical-paradise-getaway

{
  "id": "tropical-paradise-getaway",
  "name": "Escapade au Paradis Tropical",
  "adultPrice": 1200.00,
  "childPrice": 600.00,
  "duration": "7 jours"
}
```

### Avantages du versionnement par URI (`/v1/` vs `/v2/`)

#### 1. Clarté et visibilité immédiate

**✅ Avantage** :
- La version est visible directement dans l'URL
- Les développeurs savent immédiatement quelle version ils utilisent
- Facilite la documentation et les exemples

**Exemple** :
```javascript
// Client ancien (ne nécessite aucun changement)
fetch('https://api.tourism-app.com/v1/tours')
  .then(res => res.json())
  .then(data => {
    console.log(data[0].price); // Fonctionne toujours
  });

// Nouveau client (opt-in vers v2)
fetch('https://api.tourism-app.com/v2/tours')
  .then(res => res.json())
  .then(data => {
    console.log(data[0].adultPrice, data[0].childPrice); // Nouvelles fonctionnalités
  });
```

#### 2. Support simultané facile

**✅ Avantage** :
- v1 et v2 peuvent coexister indéfiniment
- Pas de rupture pour les clients existants
- Migration progressive et contrôlée

**Implémentation serveur** :
```javascript
// Routes v1 (anciennes, maintenues pour compatibilité)
app.get('/v1/tours/:id', async (req, res) => {
  const tour = await getTourById(req.params.id);
  res.json({
    id: tour.id,
    name: tour.name,
    price: tour.adultPrice, // Mapping depuis la nouvelle structure
    duration: tour.duration
  });
});

// Routes v2 (nouvelles)
app.get('/v2/tours/:id', async (req, res) => {
  const tour = await getTourById(req.params.id);
  res.json({
    id: tour.id,
    name: tour.name,
    adultPrice: tour.adultPrice,
    childPrice: tour.childPrice,
    duration: tour.duration
  });
});
```

#### 3. Facilité de test et de débogage

**✅ Avantage** :
- Tests A/B simples entre versions
- Débogage facilité (logs montrent clairement la version utilisée)
- Monitoring séparé par version

**Exemple de logs** :
```
[INFO] GET /v1/tours/123 - 200 OK - 45ms
[INFO] GET /v2/tours/456 - 200 OK - 52ms
[ERROR] GET /v1/tours/789 - 404 Not Found
```

#### 4. Compatibilité ascendante garantie

**✅ Avantage** :
- Les intégrations existantes continuent de fonctionner sans modification
- Donne du temps aux clients pour migrer
- Évite les ruptures brutales de service

**Scénario réel** :
```
Janvier 2025  : Lancement de v2 avec adultPrice/childPrice
              : v1 reste disponible et maintenue
              : Communication aux clients : "v1 sera deprecated en décembre 2026"

Mars 2025     : 80% des clients utilisent encore v1
Septembre 2025: 40% v1, 60% v2
Janvier 2026  : 10% v1, 90% v2
Décembre 2026 : Dépréciation de v1 (après 2 ans de notice)
```

#### 5. Simplicité pour les clients REST

**✅ Avantage** :
- Pas besoin de configurer des en-têtes HTTP personnalisés
- Fonctionne avec n'importe quel client HTTP (browser, curl, Postman)
- Copier-coller d'URL fonctionne directement

**Exemple curl** :
```bash
# v1 - Simple et direct
curl https://api.tourism-app.com/v1/tours

# v2 - Tout aussi simple
curl https://api.tourism-app.com/v2/tours
```

---

### Inconvénients du versionnement par URI

#### 1. Duplication de code potentielle

**❌ Inconvénient** :
- Risque de dupliquer la logique métier entre v1 et v2
- Maintenance de plusieurs versions peut devenir coûteuse

**Mitigation** :
```javascript
// Mauvais : Duplication complète
app.get('/v1/tours/:id', async (req, res) => {
  // Toute la logique dupliquée
});

app.get('/v2/tours/:id', async (req, res) => {
  // Toute la logique dupliquée avec modifications
});

// Bon : Logique partagée avec adaptateurs
async function getTourData(id) {
  // Logique métier commune
  return await db.tours.findById(id);
}

app.get('/v1/tours/:id', async (req, res) => {
  const tour = await getTourData(req.params.id);
  res.json(adaptToV1(tour)); // Adaptateur spécifique
});

app.get('/v2/tours/:id', async (req, res) => {
  const tour = await getTourData(req.params.id);
  res.json(adaptToV2(tour)); // Adaptateur spécifique
});
```

#### 2. URLs plus longues

**❌ Inconvénient** :
- `/v1/` ajoute des caractères à chaque URL
- Impact minime mais existant sur la taille des payloads

#### 3. Gestion de multiples versions simultanées

**❌ Inconvénient** :
- Nécessite de maintenir plusieurs versions en production
- Tests doivent couvrir toutes les versions
- Documentation multiple

---

### Comparaison : Versionnement par en-tête Accept

#### Alternative : Content Negotiation via Accept Header

**Requête v1** :
```http
GET /tours/tropical-paradise-getaway HTTP/1.1
Host: api.tourism-app.com
Accept: application/vnd.tourism-app.v1+json
```

**Requête v2** :
```http
GET /tours/tropical-paradise-getaway HTTP/1.1
Host: api.tourism-app.com
Accept: application/vnd.tourism-app.v2+json
```

#### Avantages du versionnement par header

**✅ URLs propres et stables** :
- L'URI `/tours/123` reste la même quelle que soit la version
- Respecte davantage le principe REST (la ressource reste la même, seule sa représentation change)

**✅ Conforme aux standards HTTP** :
- Utilise le mécanisme de content negotiation prévu par HTTP
- Plus "RESTful" théoriquement

#### Inconvénients du versionnement par header (dans notre contexte)

**❌ Moins visible et plus complexe** :
- La version n'est pas visible dans l'URL
- Nécessite de configurer les en-têtes HTTP dans chaque client
- Plus difficile à tester rapidement (curl, browser)

**Exemple de complexité** :
```bash
# Versionnement URI (simple)
curl https://api.tourism-app.com/v2/tours

# Versionnement header (plus complexe)
curl -H "Accept: application/vnd.tourism-app.v2+json" https://api.tourism-app.com/tours
```

**❌ Moins adapté aux applications web frontend** :
- Nécessite de configurer fetch/axios avec des headers personnalisés
- Plus complexe pour les débutants

**❌ Caching plus complexe** :
- Les CDNs et proxies doivent être configurés pour prendre en compte l'en-tête Accept
- Risque de servir la mauvaise version si le cache n'est pas correctement configuré

---

### Recommandation finale pour notre application

**Utiliser le versionnement par URI (`/v1/`, `/v2/`)** car :

1. **Simplicité pour les développeurs** : Visibilité immédiate, facile à utiliser
2. **Compatibilité maximale** : Fonctionne avec tous les outils sans configuration
3. **Migration progressive** : Les clients peuvent migrer à leur rythme
4. **Clarté** : Documentation et support simplifiés

**Plan de migration** :
```
Phase 1 (T0)        : Lancer /v2/ en parallèle de /v1/
Phase 2 (T+3 mois)  : Communication de dépréciation de /v1/
Phase 3 (T+12 mois) : Majority des clients migrés vers /v2/
Phase 4 (T+24 mois) : Shutdown de /v1/ après période de grâce
```

---

## Conclusion

Ces exercices ont couvert :

1. **Mapping URI/Méthode** : Conception d'URIs RESTful hiérarchiques et sémantiques
2. **Réponses d'erreur** : Structuration de réponses d'erreur riches et actionnables
3. **Versionnement** : Choix stratégique entre versionnement URI et header

**Principes clés à retenir** :
- Les URIs doivent être intuitives et hiérarchiques
- Les réponses d'erreur doivent être riches en contexte et actionnables
- Le versionnement doit privilégier la simplicité et la compatibilité pour les clients

---

**Retour à la leçon** : [Leçon 1.4 - Design d'API RESTful](../lecon-4-restful-api-design.md)

**Prochains exercices** : [Leçon 1.5 - Introduction aux Microservices](lecon-1.5-solutions.md)
