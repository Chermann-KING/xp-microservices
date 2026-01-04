# Solutions - Leçon 3.2 : Open/Closed Principle (OCP)

## Exercice 1 : Service de recommandation de visites

### Interface ITourRecommendationStrategy

```javascript
// interfaces/ITourRecommendationStrategy.js

/**
 * Interface pour les stratégies de recommandation de visites.
 * Toutes les stratégies de recommandation doivent implémenter cette interface.
 */
class ITourRecommendationStrategy {
  /**
   * Génère une liste de recommandations de visites
   * @param {Array} tours - Liste de toutes les visites disponibles
   * @param {object} userContext - Contexte de l'utilisateur (préférences, historique, localisation)
   * @param {number} limit - Nombre maximum de recommandations à retourner
   * @returns {Array} Liste des visites recommandées
   */
  getRecommendations(tours, userContext, limit = 5) {
    throw new Error(
      "getRecommendations doit être implémentée par les sous-classes."
    );
  }

  /**
   * Retourne le nom de la stratégie
   * @returns {string}
   */
  getName() {
    throw new Error("getName doit être implémentée par les sous-classes.");
  }

  /**
   * Retourne une description de la stratégie
   * @returns {string}
   */
  getDescription() {
    throw new Error(
      "getDescription doit être implémentée par les sous-classes."
    );
  }
}

export default ITourRecommendationStrategy;
```

---

### Implémentation : PopularityRecommendationStrategy

```javascript
// strategies/PopularityRecommendationStrategy.js
import ITourRecommendationStrategy from "../interfaces/ITourRecommendationStrategy.js";

/**
 * Stratégie de recommandation basée sur la popularité des visites.
 * Recommande les visites les mieux notées et les plus réservées.
 */
class PopularityRecommendationStrategy extends ITourRecommendationStrategy {
  constructor(options = {}) {
    super();
    this.ratingWeight = options.ratingWeight || 0.6; // Poids de la note
    this.bookingsWeight = options.bookingsWeight || 0.4; // Poids des réservations
  }

  getRecommendations(tours, userContext, limit = 5) {
    if (!tours || tours.length === 0) {
      return [];
    }

    // Calculer un score de popularité pour chaque visite
    const toursWithScores = tours.map((tour) => ({
      ...tour,
      popularityScore: this._calculatePopularityScore(tour),
    }));

    // Trier par score de popularité décroissant
    const sortedTours = toursWithScores.sort(
      (a, b) => b.popularityScore - a.popularityScore
    );

    // Retourner les N premières
    return sortedTours.slice(0, limit);
  }

  _calculatePopularityScore(tour) {
    const normalizedRating = (tour.rating || 0) / 5; // Note sur 5 -> 0-1
    const normalizedBookings = Math.min((tour.bookingsCount || 0) / 1000, 1); // Max 1000

    return (
      normalizedRating * this.ratingWeight +
      normalizedBookings * this.bookingsWeight
    );
  }

  getName() {
    return "Recommandations par Popularité";
  }

  getDescription() {
    return "Recommande les visites les mieux notées et les plus réservées.";
  }
}

export default PopularityRecommendationStrategy;
```

---

### Implémentation : UserPreferenceRecommendationStrategy

```javascript
// strategies/UserPreferenceRecommendationStrategy.js
import ITourRecommendationStrategy from "../interfaces/ITourRecommendationStrategy.js";

/**
 * Stratégie de recommandation basée sur les préférences utilisateur.
 * Recommande les visites correspondant aux catégories et destinations préférées.
 */
class UserPreferenceRecommendationStrategy extends ITourRecommendationStrategy {
  constructor(options = {}) {
    super();
    this.categoryMatchWeight = options.categoryMatchWeight || 0.5;
    this.destinationMatchWeight = options.destinationMatchWeight || 0.3;
    this.priceRangeWeight = options.priceRangeWeight || 0.2;
  }

  getRecommendations(tours, userContext, limit = 5) {
    if (!tours || tours.length === 0) {
      return [];
    }

    const { preferences } = userContext || {};

    if (!preferences) {
      // Si pas de préférences, retourner les premières visites
      return tours.slice(0, limit);
    }

    // Calculer un score de correspondance pour chaque visite
    const toursWithScores = tours.map((tour) => ({
      ...tour,
      matchScore: this._calculateMatchScore(tour, preferences),
    }));

    // Trier par score de correspondance décroissant
    const sortedTours = toursWithScores.sort(
      (a, b) => b.matchScore - a.matchScore
    );

    // Retourner les N premières
    return sortedTours.slice(0, limit);
  }

  _calculateMatchScore(tour, preferences) {
    let score = 0;

    // Correspondance de catégorie
    if (preferences.favoriteCategories?.includes(tour.categoryId)) {
      score += this.categoryMatchWeight;
    }

    // Correspondance de destination
    if (preferences.favoriteDestinations?.includes(tour.destinationId)) {
      score += this.destinationMatchWeight;
    }

    // Correspondance de budget
    if (preferences.maxBudget && preferences.minBudget) {
      if (
        tour.price >= preferences.minBudget &&
        tour.price <= preferences.maxBudget
      ) {
        score += this.priceRangeWeight;
      }
    }

    return score;
  }

  getName() {
    return "Recommandations Personnalisées";
  }

  getDescription() {
    return "Recommande les visites correspondant à vos préférences de catégories, destinations et budget.";
  }
}

export default UserPreferenceRecommendationStrategy;
```

---

### Implémentation : LocationBasedRecommendationStrategy (EXTENSION)

```javascript
// strategies/LocationBasedRecommendationStrategy.js
import ITourRecommendationStrategy from "../interfaces/ITourRecommendationStrategy.js";

/**
 * Stratégie de recommandation basée sur la localisation.
 * Recommande les visites proches de la position de l'utilisateur.
 *
 * CETTE CLASSE EST UNE EXTENSION - AUCUNE MODIFICATION DES CLASSES EXISTANTES
 */
class LocationBasedRecommendationStrategy extends ITourRecommendationStrategy {
  constructor(options = {}) {
    super();
    this.maxDistanceKm = options.maxDistanceKm || 100; // Distance max en km
  }

  getRecommendations(tours, userContext, limit = 5) {
    if (!tours || tours.length === 0) {
      return [];
    }

    const { location } = userContext || {};

    if (!location || !location.latitude || !location.longitude) {
      // Si pas de localisation, retourner les premières visites
      console.warn("Localisation utilisateur non disponible.");
      return tours.slice(0, limit);
    }

    // Calculer la distance pour chaque visite
    const toursWithDistance = tours
      .map((tour) => ({
        ...tour,
        distanceKm: this._calculateDistance(
          location.latitude,
          location.longitude,
          tour.latitude,
          tour.longitude
        ),
      }))
      .filter(
        (tour) =>
          tour.distanceKm !== null && tour.distanceKm <= this.maxDistanceKm
      );

    // Trier par distance croissante
    const sortedTours = toursWithDistance.sort(
      (a, b) => a.distanceKm - b.distanceKm
    );

    // Retourner les N premières
    return sortedTours.slice(0, limit);
  }

  /**
   * Calcule la distance entre deux points GPS (formule de Haversine)
   */
  _calculateDistance(lat1, lon1, lat2, lon2) {
    if (!lat2 || !lon2) return null;

    const R = 6371; // Rayon de la Terre en km
    const dLat = this._toRad(lat2 - lat1);
    const dLon = this._toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this._toRad(lat1)) *
        Math.cos(this._toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c * 10) / 10; // Arrondi à 1 décimale
  }

  _toRad(deg) {
    return deg * (Math.PI / 180);
  }

  getName() {
    return "Recommandations par Proximité";
  }

  getDescription() {
    return `Recommande les visites dans un rayon de ${this.maxDistanceKm} km.`;
  }
}

export default LocationBasedRecommendationStrategy;
```

---

### TourRecommender (Fermé à la modification)

```javascript
// services/TourRecommender.js
import ITourRecommendationStrategy from "../interfaces/ITourRecommendationStrategy.js";

/**
 * Service de recommandation de visites.
 * Ce service est FERMÉ à la modification - il ne change jamais
 * quand de nouvelles stratégies de recommandation sont ajoutées.
 */
class TourRecommender {
  constructor(strategy) {
    this.setStrategy(strategy);
  }

  /**
   * Change la stratégie de recommandation
   * Permet d'étendre le comportement sans modifier la classe
   */
  setStrategy(strategy) {
    if (!(strategy instanceof ITourRecommendationStrategy)) {
      throw new Error(
        "La stratégie doit être une instance de ITourRecommendationStrategy."
      );
    }
    this.strategy = strategy;
  }

  /**
   * Obtient des recommandations en utilisant la stratégie actuelle
   * Cette méthode est FERMÉE à la modification
   */
  recommend(tours, userContext, limit = 5) {
    console.log(`Utilisation de la stratégie: ${this.strategy.getName()}`);
    console.log(`Description: ${this.strategy.getDescription()}`);

    const recommendations = this.strategy.getRecommendations(
      tours,
      userContext,
      limit
    );

    return {
      strategy: this.strategy.getName(),
      count: recommendations.length,
      tours: recommendations,
    };
  }

  /**
   * Obtient des recommandations de plusieurs stratégies (fusion)
   */
  recommendWithMultipleStrategies(
    strategies,
    tours,
    userContext,
    limitPerStrategy = 3
  ) {
    const allRecommendations = [];
    const seenTourIds = new Set();

    for (const strategy of strategies) {
      if (!(strategy instanceof ITourRecommendationStrategy)) {
        continue;
      }

      const recommendations = strategy.getRecommendations(
        tours,
        userContext,
        limitPerStrategy
      );

      for (const tour of recommendations) {
        if (!seenTourIds.has(tour.id)) {
          seenTourIds.add(tour.id);
          allRecommendations.push({
            ...tour,
            recommendedBy: strategy.getName(),
          });
        }
      }
    }

    return {
      strategies: strategies.map((s) => s.getName()),
      count: allRecommendations.length,
      tours: allRecommendations,
    };
  }
}

export default TourRecommender;
```

---

### Démonstration d'utilisation

```javascript
// demo/recommendationDemo.js
import TourRecommender from "../services/TourRecommender.js";
import PopularityRecommendationStrategy from "../strategies/PopularityRecommendationStrategy.js";
import UserPreferenceRecommendationStrategy from "../strategies/UserPreferenceRecommendationStrategy.js";
import LocationBasedRecommendationStrategy from "../strategies/LocationBasedRecommendationStrategy.js";

// Données de test
const tours = [
  {
    id: "t1",
    name: "Visite de Paris",
    categoryId: "culture",
    destinationId: "paris",
    price: 150,
    rating: 4.8,
    bookingsCount: 500,
    latitude: 48.8566,
    longitude: 2.3522,
  },
  {
    id: "t2",
    name: "Randonnée Alpine",
    categoryId: "nature",
    destinationId: "alps",
    price: 250,
    rating: 4.5,
    bookingsCount: 300,
    latitude: 45.8326,
    longitude: 6.8652,
  },
  {
    id: "t3",
    name: "Dégustation Bordeaux",
    categoryId: "gastronomie",
    destinationId: "bordeaux",
    price: 180,
    rating: 4.9,
    bookingsCount: 800,
    latitude: 44.8378,
    longitude: -0.5792,
  },
  {
    id: "t4",
    name: "Château de la Loire",
    categoryId: "culture",
    destinationId: "loire",
    price: 120,
    rating: 4.3,
    bookingsCount: 200,
    latitude: 47.4133,
    longitude: 0.9936,
  },
];

// Contexte utilisateur
const userContext = {
  preferences: {
    favoriteCategories: ["culture", "gastronomie"],
    favoriteDestinations: ["paris", "bordeaux"],
    minBudget: 100,
    maxBudget: 200,
  },
  location: {
    latitude: 48.8566, // Paris
    longitude: 2.3522,
  },
};

// === 1. Recommandations par popularité ===
console.log("\n=== Recommandations par Popularité ===");
const popularityStrategy = new PopularityRecommendationStrategy();
const recommender = new TourRecommender(popularityStrategy);
const popularRecommendations = recommender.recommend(tours, userContext, 3);
console.log(popularRecommendations);

// === 2. Recommandations par préférences ===
console.log("\n=== Recommandations par Préférences ===");
const preferenceStrategy = new UserPreferenceRecommendationStrategy();
recommender.setStrategy(preferenceStrategy);
const preferenceRecommendations = recommender.recommend(tours, userContext, 3);
console.log(preferenceRecommendations);

// === 3. EXTENSION : Recommandations par localisation ===
// AUCUNE MODIFICATION de TourRecommender ou des stratégies existantes !
console.log("\n=== Recommandations par Proximité (EXTENSION) ===");
const locationStrategy = new LocationBasedRecommendationStrategy({
  maxDistanceKm: 500,
});
recommender.setStrategy(locationStrategy);
const locationRecommendations = recommender.recommend(tours, userContext, 3);
console.log(locationRecommendations);

// === 4. Fusion de plusieurs stratégies ===
console.log("\n=== Recommandations Multi-Stratégies ===");
const multiRecommendations = recommender.recommendWithMultipleStrategies(
  [popularityStrategy, preferenceStrategy, locationStrategy],
  tours,
  userContext,
  2
);
console.log(multiRecommendations);
```

---

## Exercice 2 : Variations de TourCard React

### Composant TourCard de base (OCP)

```jsx
// components/TourCard.jsx
import React from "react";
import "./TourCard.css";

/**
 * Composant TourCard de base - FERMÉ à la modification.
 * Les badges et actions sont injectés via props pour l'extension.
 */
function TourCard({
  tour,
  onSelect,
  badge, // Composant badge optionnel
  actions, // Composant actions optionnel
  children, // Zone d'extension libre
}) {
  const handleClick = () => {
    if (onSelect) {
      onSelect(tour);
    }
  };

  return (
    <div className="tour-card" onClick={handleClick}>
      {/* Zone de badge - Point d'extension */}
      {badge && <div className="tour-card-badge-container">{badge}</div>}

      <img
        src={tour.imageUrl || "/placeholder-tour.jpg"}
        alt={tour.name}
        className="tour-card-image"
      />

      <div className="tour-card-content">
        <h3 className="tour-card-title">{tour.name}</h3>
        <p className="tour-card-description">{tour.description}</p>

        <div className="tour-card-meta">
          <span className="tour-card-price">{tour.price} €</span>
          <span className="tour-card-duration">{tour.duration} jours</span>
          {tour.rating && (
            <span className="tour-card-rating">⭐ {tour.rating}</span>
          )}
        </div>
      </div>

      {/* Zone d'actions - Point d'extension */}
      {actions && <div className="tour-card-actions">{actions}</div>}

      {/* Zone libre pour extensions via children */}
      {children && <div className="tour-card-extension">{children}</div>}
    </div>
  );
}

export default TourCard;
```

---

### Composants Badge (Extensions)

```jsx
// components/badges/OnSaleBadge.jsx
import React from "react";
import "./Badge.css";

function OnSaleBadge({ discount }) {
  return <span className="badge badge-sale">🏷️ -{discount}%</span>;
}

export default OnSaleBadge;
```

```jsx
// components/badges/SoldOutBadge.jsx
import React from "react";
import "./Badge.css";

function SoldOutBadge() {
  return <span className="badge badge-sold-out">❌ Complet</span>;
}

export default SoldOutBadge;
```

```jsx
// components/badges/NewTourBadge.jsx
import React from "react";
import "./Badge.css";

function NewTourBadge() {
  return <span className="badge badge-new">✨ Nouveau</span>;
}

export default NewTourBadge;
```

```jsx
// components/badges/PopularBadge.jsx (EXTENSION sans modifier TourCard)
import React from "react";
import "./Badge.css";

function PopularBadge({ bookingsCount }) {
  return (
    <span className="badge badge-popular">
      🔥 Populaire ({bookingsCount}+ réservations)
    </span>
  );
}

export default PopularBadge;
```

---

### Styles des badges

```css
/* components/badges/Badge.css */
.badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: bold;
  text-transform: uppercase;
}

.badge-sale {
  background-color: #ff4444;
  color: white;
}

.badge-sold-out {
  background-color: #666;
  color: white;
}

.badge-new {
  background-color: #4caf50;
  color: white;
}

.badge-popular {
  background-color: #ff9800;
  color: white;
}
```

---

### Utilitaire pour déterminer le badge

```jsx
// utils/getBadgeForTour.jsx
import React from "react";
import OnSaleBadge from "../components/badges/OnSaleBadge";
import SoldOutBadge from "../components/badges/SoldOutBadge";
import NewTourBadge from "../components/badges/NewTourBadge";
import PopularBadge from "../components/badges/PopularBadge";

/**
 * Détermine le badge approprié pour une visite.
 * Cette fonction est une EXTENSION - elle ne modifie pas TourCard.
 */
function getBadgeForTour(tour) {
  // Priorité : Complet > Promo > Populaire > Nouveau

  if (tour.isSoldOut) {
    return <SoldOutBadge />;
  }

  if (tour.discount && tour.discount > 0) {
    return <OnSaleBadge discount={tour.discount} />;
  }

  if (tour.bookingsCount && tour.bookingsCount >= 500) {
    return <PopularBadge bookingsCount={tour.bookingsCount} />;
  }

  // Nouveau si créé il y a moins de 30 jours
  if (tour.createdAt) {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    if (new Date(tour.createdAt).getTime() > thirtyDaysAgo) {
      return <NewTourBadge />;
    }
  }

  return null; // Pas de badge
}

export default getBadgeForTour;
```

---

### Page d'affichage des visites

```jsx
// pages/ToursPage.jsx
import React from "react";
import TourCard from "../components/TourCard";
import getBadgeForTour from "../utils/getBadgeForTour";

function ToursPage() {
  // Données simulées
  const tours = [
    {
      id: "t1",
      name: "Visite de Paris",
      description: "Découvrez la Ville Lumière",
      price: 150,
      duration: 2,
      rating: 4.8,
      imageUrl: "/images/paris.jpg",
      discount: 20,
      isSoldOut: false,
      bookingsCount: 300,
      createdAt: "2025-12-01",
    },
    {
      id: "t2",
      name: "Randonnée Alpine",
      description: "Aventure en montagne",
      price: 250,
      duration: 3,
      rating: 4.5,
      imageUrl: "/images/alps.jpg",
      isSoldOut: true,
      bookingsCount: 600,
      createdAt: "2025-06-15",
    },
    {
      id: "t3",
      name: "Croisière Méditerranée",
      description: "Voguez sur les eaux bleues",
      price: 800,
      duration: 7,
      rating: 4.9,
      imageUrl: "/images/cruise.jpg",
      bookingsCount: 150,
      createdAt: "2025-12-28", // Nouveau !
    },
    {
      id: "t4",
      name: "Safari Africain",
      description: "Rencontrez la faune sauvage",
      price: 2500,
      duration: 10,
      rating: 5.0,
      imageUrl: "/images/safari.jpg",
      bookingsCount: 800, // Populaire !
      createdAt: "2025-01-01",
    },
  ];

  const handleSelectTour = (tour) => {
    console.log("Visite sélectionnée:", tour.name);
    // Navigation vers la page de détail
  };

  return (
    <div className="tours-page">
      <h1>Nos Visites</h1>

      <div className="tours-grid">
        {tours.map((tour) => (
          <TourCard
            key={tour.id}
            tour={tour}
            onSelect={handleSelectTour}
            badge={getBadgeForTour(tour)}
            actions={
              !tour.isSoldOut && <button className="btn-book">Réserver</button>
            }
          />
        ))}
      </div>
    </div>
  );
}

export default ToursPage;
```

---

### Résultat

Avec cette conception OCP :

| Visite                 | Badge affiché      |
| ---------------------- | ------------------ |
| Visite de Paris        | 🏷️ -20% (En promo) |
| Randonnée Alpine       | ❌ Complet         |
| Croisière Méditerranée | ✨ Nouveau         |
| Safari Africain        | 🔥 Populaire       |

**Points clés :**

- ✅ `TourCard` n'est **jamais modifié** pour ajouter de nouveaux badges
- ✅ Chaque badge est un **composant indépendant**
- ✅ La logique de sélection du badge est **externe** au composant
- ✅ Ajouter un nouveau badge (ex: "Recommandé", "Meilleure vente") ne nécessite que :
  1. Créer un nouveau composant badge
  2. Mettre à jour `getBadgeForTour`

---

## Points clés à retenir

### Pour les microservices (Stratégies)

```
┌─────────────────────────────────────┐
│         TourRecommender             │  ← FERMÉ à la modification
│  (dépend de l'abstraction)          │
└─────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│   ITourRecommendationStrategy       │  ← Interface/Abstraction
│   + getRecommendations()            │
│   + getName()                       │
└─────────────────────────────────────┘
         ▲           ▲           ▲
         │           │           │
    ┌────┴────┐ ┌────┴────┐ ┌────┴────┐
    │Popularity│ │Preference│ │Location │  ← OUVERT à l'extension
    │Strategy  │ │Strategy  │ │Strategy │    (nouvelles classes)
    └──────────┘ └──────────┘ └──────────┘
```

### Pour React (Composition)

```
┌─────────────────────────────────────┐
│           TourCard                  │  ← FERMÉ à la modification
│  props: { badge, actions, children }│    (accepte des extensions via props)
└─────────────────────────────────────┘
                 │
    ┌────────────┼────────────┐
    ▼            ▼            ▼
┌────────┐  ┌────────┐  ┌────────┐
│OnSale  │  │SoldOut │  │Popular │  ← OUVERT à l'extension
│Badge   │  │Badge   │  │Badge   │    (nouveaux composants)
└────────┘  └────────┘  └────────┘
```
