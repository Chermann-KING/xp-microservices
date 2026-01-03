# Leçon 3.4 - Le Principe de Ségrégation des Interfaces (ISP) dans la Conception d'API

**Module 3** : Principes SOLID, Design Patterns et React Avancé

---

## Objectifs pédagogiques

- Comprendre le Principe de Ségrégation des Interfaces et son importance
- Identifier les violations de l'ISP dans la conception d'API
- Concevoir des API granulaires adaptées aux besoins spécifiques des clients
- Appliquer l'ISP aux microservices de notre application de réservation touristique

## Prérequis

- [Leçon 3.3 : Principe de Substitution de Liskov (LSP)](lecon-3-liskov-substitution-principle.md)
- [Leçon 2.2 : Conception de l'API Tour Catalog](../module-2/lecon-2-conception-api-tour-catalog.md)
- [Leçon 2.4 : Conception de l'API Booking Management](../module-2/lecon-4-conception-api-booking-management.md)

## Durée estimée

2 heures 30 minutes

---

## Introduction

Le **Principe de Ségrégation des Interfaces** (Interface Segregation Principle - ISP) stipule que **les clients ne doivent pas être forcés de dépendre d'interfaces qu'ils n'utilisent pas**. Dans le contexte de la conception d'API, cela signifie concevoir des API avec **plusieurs interfaces granulaires** plutôt qu'une seule interface monolithique.

Cette approche garantit que les consommateurs d'une API n'interagissent qu'avec les parties de l'API pertinentes pour leurs besoins spécifiques, **réduisant le couplage** et **améliorant la maintenabilité**.

---

## Comprendre le Principe de Ségrégation des Interfaces

### L'idée centrale

L'ISP met l'accent sur la création d'**interfaces spécifiques** plutôt que d'interfaces à usage général. Le principe vise à décomposer les grandes interfaces en **interfaces plus petites et plus ciblées**, où chaque petite interface sert un groupe distinct de clients.

> **Règle d'or** : Si un client n'a besoin que d'un sous-ensemble des méthodes d'une interface, il ne devrait pas être forcé d'implémenter ou d'être conscient des méthodes qu'il n'utilise pas.

### Analogie : L'imprimante multifonction

Considérons une **imprimante multifonction** dans le monde réel. Si vous avez seulement besoin d'imprimer, vous ne devriez pas être forcé de gérer les fonctionnalités de fax, scan et copie dans l'interface utilisateur si elles sont sans rapport avec votre tâche.

Un système bien conçu vous permettrait d'interagir **uniquement avec l'interface d'impression**.

```
┌─────────────────────────────────────────────────────────────────┐
│                    IMPRIMANTE MULTIFONCTION                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ❌ Interface Monolithique (Violation ISP)                      │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  • Imprimer    • Scanner    • Fax    • Copier              │ │
│  │  → Tous les utilisateurs voient toutes les options          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ✅ Interfaces Ségrégées (Respecte ISP)                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │  Interface   │ │  Interface   │ │  Interface   │            │
│  │  Impression  │ │    Scan      │ │     Fax      │            │
│  │              │ │              │ │              │            │
│  │  • Imprimer  │ │  • Scanner   │ │  • Envoyer   │            │
│  │  • Config    │ │  • Format    │ │  • Recevoir  │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Exemple : L'interface UserManager problématique

Imaginons une interface `UserManager` dans une application :

```javascript
// ❌ Violation de l'ISP - Interface trop large
class UserManager {
  createUser(userData) {
    /* ... */
  }
  deleteUser(userId) {
    /* ... */
  }
  updateUserProfile(userId, profileData) {
    /* ... */
  }
  assignRole(userId, role) {
    /* ... */
  }
  viewUserReports(userId) {
    /* ... */
  }
  resetPassword(userId) {
    /* ... */
  }
  exportUserData(userId) {
    /* ... */
  }
}
```

**Problèmes identifiés :**

| Client                | Méthodes nécessaires | Méthodes imposées inutilement |
| --------------------- | -------------------- | ----------------------------- |
| Service d'inscription | `createUser`         | 6 autres méthodes             |
| Service de reporting  | `viewUserReports`    | 6 autres méthodes             |
| Service admin         | Toutes               | Aucune                        |

**Conséquences :**

- Un simple service d'inscription dépend de fonctionnalités qu'il n'utilise jamais
- Des modifications sur `assignRole` peuvent impacter le service d'inscription
- Le couplage inutile rend les tests plus complexes

### Solution : Ségrégation des interfaces

```javascript
// ✅ Respect de l'ISP - Interfaces spécialisées

// Interface pour la création d'utilisateurs
class UserCreationService {
  createUser(userData) {
    /* ... */
  }
}

// Interface pour la gestion des profils
class UserProfileService {
  updateUserProfile(userId, profileData) {
    /* ... */
  }
  resetPassword(userId) {
    /* ... */
  }
}

// Interface pour l'administration
class UserAdminService {
  deleteUser(userId) {
    /* ... */
  }
  assignRole(userId, role) {
    /* ... */
  }
}

// Interface pour le reporting
class UserReportingService {
  viewUserReports(userId) {
    /* ... */
  }
  exportUserData(userId) {
    /* ... */
  }
}
```

Chaque client n'interagit désormais qu'avec l'interface dont il a besoin.

---

## L'ISP dans la Conception d'API

Appliquer l'ISP à la conception d'API signifie créer des **endpoints distincts** ou des **groupes d'endpoints** qui répondent aux besoins spécifiques des clients.

Au lieu d'une seule grande API qui expose toutes les opérations possibles pour une ressource, on conçoit **plusieurs APIs plus petites**, chacune servant un objectif spécifique.

### API Monolithique vs APIs Ségrégées

#### ❌ Exemple d'API Monolithique (Violation de l'ISP)

Imaginons que notre microservice `BookingManagement` ait un seul endpoint `/bookings` qui gère tout :

- Création de réservations
- Consultation des réservations
- Mise à jour et suppression
- Gestion du statut de paiement
- Vérification de disponibilité des visites
- Envoi de notifications aux utilisateurs

```
/api/v1/booking-management/bookings
├── POST   → Créer une réservation
├── GET    → Lister les réservations
├── GET    /{id} → Détails d'une réservation
├── PUT    /{id} → Mise à jour complète
├── PATCH  /{id}/status → Mettre à jour le statut
├── PATCH  /{id}/payment → Mettre à jour le paiement
├── DELETE /{id} → Supprimer
└── POST   /{id}/notify → Envoyer notification
```

**Problème** : Une application cliente qui a seulement besoin de créer une réservation est exposée à des opérations comme `updatePaymentStatus` ou `sendNotification`, même si elle ne les appelle jamais. Cela crée des **dépendances inutiles**.

#### ✅ Exemple d'APIs Ségrégées (Respect de l'ISP)

À la place, nous pouvons ségréguer l'API du microservice `BookingManagement` :

```
┌─────────────────────────────────────────────────────────────────┐
│                   BOOKING MANAGEMENT APIs                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📱 UserBookingAPI (Clients: App mobile, Site web)              │
│  ├── POST /bookings              → Créer une réservation        │
│  ├── GET  /bookings/{id}         → Voir sa réservation          │
│  └── POST /bookings/{id}/cancel  → Annuler sa réservation       │
│                                                                  │
│  💳 PaymentCallbackAPI (Clients: Passerelle de paiement)        │
│  └── POST /bookings/{id}/payment-webhook → Callback paiement    │
│                                                                  │
│  🔧 AdminBookingAPI (Clients: Dashboard administrateur)         │
│  ├── GET    /admin/bookings      → Lister toutes les réserv.    │
│  ├── PATCH  /admin/bookings/{id}/status → Modifier statut       │
│  └── DELETE /admin/bookings/{id} → Supprimer réservation        │
│                                                                  │
│  📊 ReportingAPI (Clients: Service de reporting)                │
│  ├── GET /reports/bookings/daily    → Rapport journalier        │
│  └── GET /reports/bookings/revenue  → Rapport des revenus       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

Chaque client (interface utilisateur frontend, dashboard admin, service de passerelle de paiement) n'interagit qu'avec les endpoints spécifiques pertinents pour sa fonctionnalité.

---

## Avantages de l'ISP dans la Conception d'API

| Avantage                                  | Description                                                                                                                                              |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Couplage réduit**                       | Les clients dépendent uniquement des contrats qu'ils utilisent. Les modifications sur une partie non utilisée n'affectent pas les clients non concernés. |
| **Maintenabilité améliorée**              | Des contrats d'API plus petits et ciblés sont plus faciles à comprendre, tester et maintenir.                                                            |
| **Sécurité renforcée**                    | En n'exposant que les fonctionnalités nécessaires à chaque client, la surface d'attaque est réduite.                                                     |
| **Évolution facilitée**                   | Il est plus simple de faire évoluer ou déprécier des parties d'une API sans impacter tous les consommateurs.                                             |
| **Performance potentiellement meilleure** | Les clients ne reçoivent pas de données ou options inutiles, menant à des requêtes et réponses plus efficaces.                                           |

---

## Application Pratique : Microservice Tour Catalog

Revisitions notre microservice **Tour Catalog**. Ce service gère les informations sur les visites, incluant les détails, la disponibilité, les prix et les avis.

### Conception Initiale (Violation potentielle de l'ISP)

Un seul endpoint `GET /tours` pourrait retourner toutes les informations possibles sur une visite :

- Détails de base (nom, description, durée)
- Informations de prix
- Calendrier de disponibilité
- Scores et commentaires des avis
- Liste des visites associées
- Flags de gestion interne (`isArchived`, `lastUpdatedByAdmin`)

**Problèmes par type de client :**

| Client                | Données nécessaires          | Données reçues inutilement      |
| --------------------- | ---------------------------- | ------------------------------- |
| Site web public       | Nom, prix, note moyenne      | Flags admin, calendrier complet |
| Widget de réservation | Disponibilité, prix par date | Description complète, avis      |
| Dashboard admin       | Toutes les données           | Aucune                          |

### Application de l'ISP au Tour Catalog

Pour appliquer l'ISP, nous concevons des endpoints plus spécifiques :

#### 1. API Publique de Listing des Visites

**Clients** : Site web public, crawlers SEO

```javascript
// Endpoint pour la liste des visites (vue publique)
GET /api/v1/tours-catalog/tours/public

// Réponse
{
  "status": "success",
  "data": {
    "tours": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Visite de la Tour Eiffel et Croisière sur la Seine",
        "descriptionSummary": "Découvrez les monuments emblématiques de Paris...",
        "mainImage": "https://cdn.example.com/tours/paris-eiffel.jpg",
        "avgRating": 4.8,
        "startingPrice": 89.99,
        "currency": "EUR"
      }
    ]
  }
}
```

```javascript
// Endpoint pour les détails d'une visite (vue publique)
GET /api/v1/tours-catalog/tours/public/{id}

// Réponse - Plus de détails mais toujours publics
{
  "status": "success",
  "data": {
    "tour": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Visite de la Tour Eiffel et Croisière sur la Seine",
      "description": "Description complète de la visite...",
      "images": ["url1", "url2", "url3"],
      "inclusions": ["Guide bilingue", "Billets coupe-file", "Croisière"],
      "exclusions": ["Repas", "Transport vers le point de rencontre"],
      "avgRating": 4.8,
      "reviewsSummary": {
        "totalReviews": 1250,
        "distribution": { "5": 850, "4": 300, "3": 70, "2": 20, "1": 10 }
      }
    }
  }
}
```

#### 2. API de Disponibilité pour Réservation

**Clients** : Microservice Booking Management, widget de réservation frontend

```javascript
// Endpoint spécialisé - uniquement disponibilité et prix
GET /api/v1/tours-catalog/tours/{id}/availability?startDate=2026-06-01&endDate=2026-06-30

// Réponse - Données minimales nécessaires pour la réservation
{
  "status": "success",
  "data": {
    "tourId": "550e8400-e29b-41d4-a716-446655440000",
    "tourName": "Visite de la Tour Eiffel et Croisière sur la Seine",
    "availability": [
      {
        "date": "2026-06-15",
        "availableSpots": 12,
        "pricePerAdult": 89.99,
        "pricePerChild": 44.99,
        "pricePerInfant": 0
      },
      {
        "date": "2026-06-16",
        "availableSpots": 8,
        "pricePerAdult": 94.99,
        "pricePerChild": 47.49,
        "pricePerInfant": 0
      }
    ]
  }
}
```

#### 3. API Administration des Visites

**Clients** : Dashboard administrateur interne

```javascript
// Endpoint admin - TOUTES les données y compris internes
GET /api/v1/tours-catalog/admin/tours/{id}

// Réponse - Données complètes pour administration
{
  "status": "success",
  "data": {
    "tour": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Visite de la Tour Eiffel et Croisière sur la Seine",
      "description": "...",
      "images": [...],
      "pricing": {...},
      "availability": [...],
      "reviews": [...],
      // Données internes - uniquement pour admins
      "internalNotes": "Partenariat avec Bateaux Mouches renouvelé jusqu'en 2027",
      "status": "active",
      "isArchived": false,
      "isFeatured": true,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2026-01-03T14:22:00Z",
      "lastUpdatedBy": {
        "adminId": "admin-001",
        "name": "Nick Fury"
      },
      "analytics": {
        "totalViews": 45230,
        "conversionRate": 0.032,
        "lastMonthBookings": 156
      }
    }
  }
}
```

---

## Implémentation Node.js/Express

Voici l'implémentation complète avec ségrégation des routes :

### Structure des Routes

```javascript
// tour-catalog-service/src/routes/index.js
const express = require("express");
const router = express.Router();

const publicRoutes = require("./publicTourRoutes");
const availabilityRoutes = require("./availabilityRoutes");
const adminRoutes = require("./adminTourRoutes");

// 1. API Publique - Aucune authentification requise
router.use("/tours/public", publicRoutes);

// 2. API Disponibilité - Accessible aux services internes
router.use("/tours", availabilityRoutes);

// 3. API Admin - Authentification admin requise
router.use("/admin/tours", adminRoutes);

module.exports = router;
```

### Routes Publiques

```javascript
// tour-catalog-service/src/routes/publicTourRoutes.js
const express = require("express");
const router = express.Router();
const tourController = require("../controllers/tourController");

// GET /api/v1/tours-catalog/tours/public
router.get("/", tourController.getPublicTours);

// GET /api/v1/tours-catalog/tours/public/:id
router.get("/:id", tourController.getPublicTourDetails);

module.exports = router;
```

### Routes de Disponibilité

```javascript
// tour-catalog-service/src/routes/availabilityRoutes.js
const express = require("express");
const router = express.Router();
const tourController = require("../controllers/tourController");

// GET /api/v1/tours-catalog/tours/:id/availability
router.get("/:id/availability", tourController.getTourAvailability);

module.exports = router;
```

### Routes Admin

```javascript
// tour-catalog-service/src/routes/adminTourRoutes.js
const express = require("express");
const router = express.Router();
const tourController = require("../controllers/tourController");
const { requireAdmin } = require("../middleware/authMiddleware");

// Protection de toutes les routes admin
router.use(requireAdmin);

// GET /api/v1/tours-catalog/admin/tours/:id
router.get("/:id", tourController.getAdminTourDetails);

// POST /api/v1/tours-catalog/admin/tours
router.post("/", tourController.createTour);

// PUT /api/v1/tours-catalog/admin/tours/:id
router.put("/:id", tourController.updateTour);

// PATCH /api/v1/tours-catalog/admin/tours/:id/status
router.patch("/:id/status", tourController.updateTourStatus);

// DELETE /api/v1/tours-catalog/admin/tours/:id
router.delete("/:id", tourController.deleteTour);

module.exports = router;
```

### Contrôleur avec Projections Spécifiques

```javascript
// tour-catalog-service/src/controllers/tourController.js
const Tour = require("../models/Tour");

/**
 * API Publique - Listing des visites
 * Clients: Site web public, SEO crawlers
 * Retourne uniquement les champs publics essentiels
 */
exports.getPublicTours = async (req, res) => {
  try {
    // Projection limitée aux champs publics
    const tours = await Tour.find(
      { status: "active", isArchived: false },
      "name descriptionSummary mainImage avgRating startingPrice currency"
    );

    res.json({
      status: "success",
      data: { tours },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      error: { message: error.message },
    });
  }
};

/**
 * API Publique - Détails d'une visite
 * Retourne les détails publics complets (sans données internes)
 */
exports.getPublicTourDetails = async (req, res) => {
  try {
    const tour = await Tour.findOne(
      { _id: req.params.id, status: "active", isArchived: false },
      "name description images inclusions exclusions avgRating reviewsSummary duration meetingPoint"
    );

    if (!tour) {
      return res.status(404).json({
        status: "error",
        error: { code: "TOUR_NOT_FOUND", message: "Visite non trouvée" },
      });
    }

    res.json({
      status: "success",
      data: { tour },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      error: { message: error.message },
    });
  }
};

/**
 * API Disponibilité - Pour le service de réservation
 * Clients: Booking Management Service, widget de réservation
 * Retourne UNIQUEMENT la disponibilité et les prix
 */
exports.getTourAvailability = async (req, res) => {
  const { startDate, endDate } = req.query;

  try {
    const tour = await Tour.findById(
      req.params.id,
      "name availability pricing"
    );

    if (!tour) {
      return res.status(404).json({
        status: "error",
        error: { code: "TOUR_NOT_FOUND", message: "Visite non trouvée" },
      });
    }

    // Filtrer la disponibilité pour la période demandée
    const filteredAvailability = tour.availability.filter((slot) => {
      const slotDate = new Date(slot.date);
      return slotDate >= new Date(startDate) && slotDate <= new Date(endDate);
    });

    res.json({
      status: "success",
      data: {
        tourId: tour._id,
        tourName: tour.name,
        availability: filteredAvailability.map((slot) => ({
          date: slot.date,
          availableSpots: slot.availableSpots,
          pricePerAdult: slot.pricePerAdult || tour.pricing.adult,
          pricePerChild: slot.pricePerChild || tour.pricing.child,
          pricePerInfant: slot.pricePerInfant || tour.pricing.infant,
        })),
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      error: { message: error.message },
    });
  }
};

/**
 * API Admin - Détails complets d'une visite
 * Clients: Dashboard administrateur
 * Retourne TOUTES les données y compris internes
 */
exports.getAdminTourDetails = async (req, res) => {
  try {
    // Pas de projection - retourne tout
    const tour = await Tour.findById(req.params.id);

    if (!tour) {
      return res.status(404).json({
        status: "error",
        error: { code: "TOUR_NOT_FOUND", message: "Visite non trouvée" },
      });
    }

    res.json({
      status: "success",
      data: { tour },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      error: { message: error.message },
    });
  }
};

/**
 * API Admin - Créer une visite
 */
exports.createTour = async (req, res) => {
  try {
    const tour = new Tour({
      ...req.body,
      createdBy: req.user.id,
      lastUpdatedBy: { adminId: req.user.id, name: req.user.name },
    });

    const newTour = await tour.save();

    res.status(201).json({
      status: "success",
      data: { tour: newTour },
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      error: { message: error.message },
    });
  }
};

/**
 * API Admin - Mise à jour complète d'une visite
 */
exports.updateTour = async (req, res) => {
  try {
    const updatedTour = await Tour.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        lastUpdatedBy: { adminId: req.user.id, name: req.user.name },
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    );

    if (!updatedTour) {
      return res.status(404).json({
        status: "error",
        error: { code: "TOUR_NOT_FOUND", message: "Visite non trouvée" },
      });
    }

    res.json({
      status: "success",
      data: { tour: updatedTour },
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      error: { message: error.message },
    });
  }
};

/**
 * API Admin - Mise à jour du statut uniquement
 * Endpoint spécifique pour les modifications de statut
 */
exports.updateTourStatus = async (req, res) => {
  const { status, isArchived, isFeatured } = req.body;

  try {
    const tour = await Tour.findById(req.params.id);

    if (!tour) {
      return res.status(404).json({
        status: "error",
        error: { code: "TOUR_NOT_FOUND", message: "Visite non trouvée" },
      });
    }

    // Mise à jour sélective des champs de statut
    if (status) tour.status = status;
    if (typeof isArchived === "boolean") tour.isArchived = isArchived;
    if (typeof isFeatured === "boolean") tour.isFeatured = isFeatured;

    tour.lastUpdatedBy = { adminId: req.user.id, name: req.user.name };
    tour.updatedAt = new Date();

    const updatedTour = await tour.save();

    res.json({
      status: "success",
      data: {
        tour: {
          id: updatedTour._id,
          status: updatedTour.status,
          isArchived: updatedTour.isArchived,
          isFeatured: updatedTour.isFeatured,
          updatedAt: updatedTour.updatedAt,
        },
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      error: { message: error.message },
    });
  }
};

/**
 * API Admin - Supprimer une visite
 */
exports.deleteTour = async (req, res) => {
  try {
    const tour = await Tour.findByIdAndDelete(req.params.id);

    if (!tour) {
      return res.status(404).json({
        status: "error",
        error: { code: "TOUR_NOT_FOUND", message: "Visite non trouvée" },
      });
    }

    res.json({
      status: "success",
      message: "Visite supprimée avec succès",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      error: { message: error.message },
    });
  }
};
```

### Points Clés de l'Implémentation

Dans cet exemple :

1. **`getPublicTours` et `getPublicTourDetails`** sélectionnent (projettent) uniquement les champs pertinents pour la consommation publique. Les clients appelant ces endpoints ne reçoivent et ne dépendent que des données dont ils ont besoin.

2. **`getTourAvailability`** est hautement spécialisé, retournant uniquement la disponibilité et les prix pour une période donnée.

3. **`getAdminTourDetails`, `createTour`, `updateTour`, `updateTourStatus`, et `deleteTour`** opèrent sur l'objet visite complet, mais sont protégés et uniquement accessibles aux clients administrateurs.

Cette ségrégation garantit que chaque client (site web public, service de réservation, dashboard admin) interagit avec une **interface spécifique et minimale** qui répond directement à ses besoins, réduisant les dépendances inutiles et améliorant la robustesse et la sécurité globale de l'API.

---

## ISP dans les Composants React

Le principe ISP s'applique également aux composants React. Un composant ne devrait pas recevoir des props qu'il n'utilise pas.

### ❌ Violation : Props trop larges

```jsx
// Composant qui reçoit trop de données
function TourCard({ tour }) {
  // Le composant n'utilise que name, image et price
  // mais reçoit tout l'objet tour avec 20+ propriétés
  return (
    <div className="tour-card">
      <img src={tour.mainImage} alt={tour.name} />
      <h3>{tour.name}</h3>
      <p className="price">{tour.startingPrice} €</p>
    </div>
  );
}

// Utilisation - passe tout l'objet
<TourCard tour={fullTourObject} />;
```

### ✅ Respect de l'ISP : Props ciblées

```jsx
// Interface spécifique pour le composant TourCard
function TourCard({ name, mainImage, startingPrice, currency = "EUR" }) {
  return (
    <div className="tour-card">
      <img src={mainImage} alt={name} />
      <h3>{name}</h3>
      <p className="price">
        {startingPrice} {currency}
      </p>
    </div>
  );
}

// Utilisation - passe uniquement les props nécessaires
<TourCard
  name={tour.name}
  mainImage={tour.mainImage}
  startingPrice={tour.startingPrice}
  currency={tour.currency}
/>;
```

### Exemple : Composants d'affichage de réservation

```jsx
// Interfaces ségrégées pour différents contextes d'affichage

/**
 * Interface minimale pour la liste des réservations
 */
function BookingListItem({ id, tourName, travelDate, status }) {
  return (
    <li className={`booking-item status-${status}`}>
      <span className="tour-name">{tourName}</span>
      <span className="date">
        {new Date(travelDate).toLocaleDateString("fr-FR")}
      </span>
      <span className="status">{status}</span>
    </li>
  );
}

/**
 * Interface étendue pour les détails de réservation
 */
function BookingDetails({
  id,
  tourName,
  travelDate,
  status,
  participants,
  totalPrice,
  specialRequests,
}) {
  return (
    <div className="booking-details">
      <h2>{tourName}</h2>
      <p>Date: {new Date(travelDate).toLocaleDateString("fr-FR")}</p>
      <p>Statut: {status}</p>
      <p>Participants: {participants.totalCount}</p>
      <p>Prix total: {totalPrice} €</p>
      {specialRequests && <p>Demandes spéciales: {specialRequests}</p>}
    </div>
  );
}

/**
 * Interface admin avec toutes les données
 */
function AdminBookingView({
  id,
  tourName,
  travelDate,
  status,
  participants,
  totalPrice,
  customer,
  paymentStatus,
  createdAt,
  internalNotes,
  onStatusChange,
  onDelete,
}) {
  return (
    <div className="admin-booking-view">
      {/* Affiche toutes les données + actions admin */}
    </div>
  );
}
```

---

## Exercices Pratiques

### Exercice 1 : Refactorer l'API Booking Management

**Objectif** : Revoir l'API du microservice BookingManagement conçue dans le Module 2 et identifier les violations potentielles de l'ISP.

**Tâches** :

1. Identifiez où un seul endpoint ou ressource pourrait exposer trop d'opérations à différents types de clients (utilisateurs, passerelles de paiement, administrateurs)

2. Proposez un plan de refactoring pour ségréguer l'API en au moins **trois interfaces distinctes orientées client** :

   - `UserBookingAPI`
   - `PaymentCallbackAPI`
   - `AdminBookingAPI`

3. Décrivez quels endpoints appartiendraient à chaque API ségrégée et quelles données ils exposeraient/accepteraient

### Exercice 2 : Scénario Système de Traitement de Commandes

**Contexte** : Imaginez un microservice `Order` d'une plateforme e-commerce. Il a actuellement un seul endpoint `/orders` qui permet :

- Créer de nouvelles commandes (`POST /orders`)
- Récupérer les détails d'une commande (`GET /orders/{id}`)
- Mettre à jour le statut d'une commande (`PATCH /orders/{id}/status`)
- Ajouter/supprimer des articles d'une commande (`PATCH /orders/{id}/items`)
- Traiter les remboursements (`POST /orders/{id}/refund`)

**Clients** :

- **Application client** : Besoin de créer et voir ses propres commandes
- **Système d'entrepôt** : Besoin de récupérer les commandes pour expédition et mettre à jour le statut d'expédition
- **Service client** : Besoin de voir tous les détails, mettre à jour les statuts et traiter les remboursements

**Tâches** :

1. Expliquez comment vous appliqueriez le Principe de Ségrégation des Interfaces à cette API
2. Définissez les nouveaux endpoints ségrégués
3. Spécifiez quel type de client consommerait chaque API

### Exercice 3 : Authentification et Autorisation

**Contexte** : Le middleware `authMiddleware.requireAdmin` dans l'exemple de code est une représentation basique.

**Tâches** :

1. Discutez comment l'ISP pourrait être davantage appliqué à l'API d'un système d'authentification et d'autorisation

2. Si vous avez un microservice Auth, quelles "interfaces" distinctes (groupes d'endpoints) pourrait-il offrir pour différents clients ?

   - Formulaires de connexion utilisateur
   - Microservices internes nécessitant la validation de tokens
   - Outils admin pour la gestion des utilisateurs

3. Fournissez au moins **deux exemples d'endpoints distincts** pour un tel microservice Auth, en indiquant clairement leur client et leur objectif

---

## Conclusion

Le **Principe de Ségrégation des Interfaces** est une directive cruciale pour concevoir des APIs robustes et maintenables, particulièrement dans une architecture microservices. En créant des **interfaces API spécifiques et ciblées** pour différents groupes de clients, nous :

- ✅ Minimisons le couplage
- ✅ Renforçons la sécurité
- ✅ Facilitons l'évolution indépendante des services

Ce principe supporte directement la **modularité** et l'**indépendance** que les microservices visent à atteindre.

### Points clés à retenir

| Aspect                     | Application de l'ISP                             |
| -------------------------- | ------------------------------------------------ |
| **Conception d'API**       | Créer des groupes d'endpoints par type de client |
| **Projections de données** | Retourner uniquement les champs nécessaires      |
| **Authentification**       | Différents niveaux d'accès par interface         |
| **Composants React**       | Props spécifiques plutôt qu'objets complets      |
| **Microservices**          | APIs internes vs externes séparées               |

---

## Navigation

- **⬅️ Précédent** : [Leçon 3.3 - Le Principe de Substitution de Liskov (LSP)](lecon-3-liskov-substitution-principle.md)
- **➡️ Suivant** : [Leçon 3.5 - Le Principe d'Inversion des Dépendances (DIP)](lecon-5-dependency-inversion-principle.md)
- **🏠 Retour** : [Sommaire du Module 3](README.md)

---

## Ressources supplémentaires

- [Interface Segregation Principle - Robert C. Martin](https://web.archive.org/web/20150905081110/http://www.objectmentor.com/resources/articles/isp.pdf)
- [API Design Patterns - JJ Geewax](https://www.manning.com/books/api-design-patterns)
- [REST API Design Best Practices](https://restfulapi.net/)
- [Microservices API Gateway Pattern](https://microservices.io/patterns/apigateway.html)

---

**Leçon complétée** ✅
