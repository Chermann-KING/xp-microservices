# Solutions - Leçon 3.1 : Single Responsibility Principle (SRP)

## Exercice 1 : Décomposition du microservice "UserAccount"

### Identification des responsabilités distinctes

Le `UserAccountService` actuel gère **4 responsabilités distinctes** :

| #   | Responsabilité        | Endpoints concernés                                                              |
| --- | --------------------- | -------------------------------------------------------------------------------- |
| 1   | **Authentification**  | `POST /users/register`, `POST /users/login`                                      |
| 2   | **Gestion du profil** | `GET /users/{id}/profile`, `PUT /users/{id}/profile`, `PUT /users/{id}/password` |
| 3   | **Vérification OTP**  | `POST /users/{id}/send-otp`, `POST /users/{id}/verify-otp`                       |
| 4   | **Gestion des rôles** | `GET /admin/users/{id}/roles`, `PUT /admin/users/{id}/roles`                     |

### Architecture microservices proposée

#### 1. Authentication Microservice (Port 3003)

**Responsabilité principale :** Gérer l'authentification des utilisateurs, l'émission et la validation des tokens JWT.

**Raison de changer :** Modifications des protocoles de sécurité, ajout de nouvelles méthodes d'authentification (OAuth2, SSO), changements des politiques de tokens.

**Endpoints API :**

```
POST /auth/register          # Créer un nouveau compte utilisateur
POST /auth/login             # Authentifier et obtenir un JWT
POST /auth/logout            # Invalider le token (si blacklist)
POST /auth/refresh           # Rafraîchir un token expiré
POST /auth/forgot-password   # Initier la réinitialisation du mot de passe
POST /auth/reset-password    # Réinitialiser le mot de passe avec token
GET  /auth/validate          # Valider un token JWT (pour autres services)
```

**Modèle de données :**

```javascript
// models/AuthCredential.js
{
  id: UUID,
  userId: UUID,           // Référence logique vers User Profile
  email: String,          // Identifiant unique pour login
  passwordHash: String,   // Mot de passe hashé (bcrypt)
  lastLogin: DateTime,
  failedAttempts: Integer,
  lockedUntil: DateTime,
  createdAt: DateTime,
  updatedAt: DateTime
}
```

---

#### 2. User Profile Microservice (Port 3004)

**Responsabilité principale :** Stocker et gérer les informations personnelles, coordonnées et préférences des utilisateurs.

**Raison de changer :** Nouveaux champs de profil requis, changements des règles de validation, intégration avec des systèmes CRM externes.

**Endpoints API :**

```
GET    /users/{id}           # Récupérer le profil complet
PUT    /users/{id}           # Mettre à jour le profil
PATCH  /users/{id}           # Mise à jour partielle
DELETE /users/{id}           # Supprimer le profil (RGPD)
GET    /users/{id}/preferences  # Récupérer les préférences
PUT    /users/{id}/preferences  # Mettre à jour les préférences
GET    /users/search         # Rechercher des utilisateurs (admin)
```

**Modèle de données :**

```javascript
// models/UserProfile.js
{
  id: UUID,
  firstName: String,
  lastName: String,
  email: String,           // Synchronisé avec Auth Service
  phone: String,
  address: {
    street: String,
    city: String,
    postalCode: String,
    country: String
  },
  preferences: {
    language: String,      // 'fr', 'en', etc.
    currency: String,      // 'EUR', 'USD', etc.
    notifications: {
      email: Boolean,
      sms: Boolean,
      push: Boolean
    }
  },
  avatarUrl: String,
  createdAt: DateTime,
  updatedAt: DateTime
}
```

---

#### 3. OTP Verification Microservice (Port 3005)

**Responsabilité principale :** Générer, envoyer et vérifier les codes OTP pour la validation d'identité (2FA, vérification email/téléphone).

**Raison de changer :** Changements des algorithmes OTP (TOTP, HOTP), nouveaux canaux d'envoi, modifications des délais d'expiration.

**Endpoints API :**

```
POST /otp/send              # Générer et envoyer un OTP
POST /otp/verify            # Vérifier un OTP
POST /otp/resend            # Renvoyer un OTP
GET  /otp/status/{token}    # Vérifier le statut d'un OTP (admin)
```

**Modèle de données :**

```javascript
// models/OTPRecord.js
{
  id: UUID,
  userId: UUID,
  code: String,            // Code OTP hashé
  channel: String,         // 'email', 'sms', 'authenticator'
  purpose: String,         // 'login', 'password_reset', 'email_verify'
  expiresAt: DateTime,
  attempts: Integer,
  verified: Boolean,
  createdAt: DateTime
}
```

---

#### 4. Authorization Microservice (Port 3006)

**Responsabilité principale :** Gérer les rôles, permissions et contrôle d'accès des utilisateurs.

**Raison de changer :** Nouveaux rôles métier, exigences de contrôle d'accès granulaire (RBAC, ABAC), changements des politiques de sécurité.

**Endpoints API :**

```
GET    /users/{id}/roles          # Récupérer les rôles d'un utilisateur
PUT    /users/{id}/roles          # Mettre à jour les rôles
GET    /users/{id}/permissions    # Récupérer les permissions effectives
POST   /authorize                 # Vérifier si action autorisée
GET    /roles                     # Lister tous les rôles disponibles
POST   /roles                     # Créer un nouveau rôle
GET    /roles/{roleId}/permissions # Permissions d'un rôle
PUT    /roles/{roleId}/permissions # Modifier permissions d'un rôle
```

**Modèle de données :**

```javascript
// models/UserRole.js
{
  id: UUID,
  userId: UUID,
  roleId: UUID,
  assignedBy: UUID,
  assignedAt: DateTime,
  expiresAt: DateTime       // Rôle temporaire optionnel
}

// models/Role.js
{
  id: UUID,
  name: String,             // 'admin', 'customer', 'tour_operator'
  description: String,
  permissions: [String],    // ['tours:read', 'tours:write', 'bookings:*']
  createdAt: DateTime
}
```

---

### Diagramme d'architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Gateway                               │
└─────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ Authentication │    │  User Profile  │    │ Authorization  │
│   Service      │    │    Service     │    │    Service     │
│   (3003)       │    │    (3004)      │    │    (3006)      │
└───────┬───────┘    └───────┬───────┘    └───────┬───────┘
        │                    │                    │
        │            ┌───────┴───────┐            │
        │            │               │            │
        ▼            ▼               ▼            ▼
┌───────────────┐ ┌─────────┐ ┌─────────┐ ┌───────────────┐
│  auth_db      │ │profile_db│ │  otp_db │ │   authz_db    │
└───────────────┘ └─────────┘ └─────────┘ └───────────────┘
                       │
                       ▼
              ┌───────────────┐
              │OTP Verification│
              │    Service     │
              │    (3005)      │
              └───────────────┘
```

---

## Exercice 2 : Refactoring du composant TourList

### Responsabilités identifiées qui violent le SRP

Le composant `TourList` original a **4 responsabilités distinctes** :

| #   | Responsabilité                    | Code concerné                        |
| --- | --------------------------------- | ------------------------------------ |
| 1   | **Récupération des données**      | `useEffect` avec `api.get('/tours')` |
| 2   | **Gestion de l'état de filtrage** | `searchTerm`, `minPrice`, `maxPrice` |
| 3   | **Logique de filtrage**           | `filteredTours.filter(...)`          |
| 4   | **Affichage de la liste**         | Rendu JSX avec `tours-grid`          |

### Composants refactorisés

#### 1. TourListContainer (Composant Container)

```jsx
// components/TourListContainer.jsx
import React, { useState, useEffect, useMemo } from "react";
import api from "../utils/api";
import TourFilters from "./TourFilters";
import TourGrid from "./TourGrid";

const TourListContainer = () => {
  // Responsabilité : Récupérer les données, gérer l'état global,
  // orchestrer les composants enfants.
  // Raison de changer : Changements de l'API, stratégies de cache,
  // gestion d'erreurs, ou ajout de fonctionnalités de chargement.

  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // État des filtres remonté ici pour centraliser la logique
  const [filters, setFilters] = useState({
    searchTerm: "",
    minPrice: "",
    maxPrice: "",
  });

  useEffect(() => {
    const fetchTours = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get("/tours");
        setTours(response.data);
      } catch (err) {
        setError("Échec de la récupération des visites.");
        console.error("Erreur de chargement des visites:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTours();
  }, []);

  // Logique de filtrage avec useMemo pour optimisation
  const filteredTours = useMemo(() => {
    return tours.filter((tour) => {
      const matchesSearch = tour.title
        .toLowerCase()
        .includes(filters.searchTerm.toLowerCase());
      const matchesMinPrice =
        filters.minPrice === "" || tour.price >= parseFloat(filters.minPrice);
      const matchesMaxPrice =
        filters.maxPrice === "" || tour.price <= parseFloat(filters.maxPrice);
      return matchesSearch && matchesMinPrice && matchesMaxPrice;
    });
  }, [tours, filters]);

  // Gestionnaire de mise à jour des filtres
  const handleFilterChange = (newFilters) => {
    setFilters((prevFilters) => ({
      ...prevFilters,
      ...newFilters,
    }));
  };

  if (loading) {
    return (
      <div className="tour-list-loading">
        <p>Chargement des visites...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tour-list-error">
        <p className="error">{error}</p>
        <button onClick={() => window.location.reload()}>Réessayer</button>
      </div>
    );
  }

  return (
    <div className="tour-list-page">
      <h1>Visites Disponibles</h1>
      <TourFilters filters={filters} onFilterChange={handleFilterChange} />
      <TourGrid
        tours={filteredTours}
        emptyMessage="Aucune visite ne correspond à vos critères."
      />
    </div>
  );
};

export default TourListContainer;
```

---

#### 2. TourFilters (Composant de filtrage)

```jsx
// components/TourFilters.jsx
import React from "react";

const TourFilters = ({ filters, onFilterChange }) => {
  // Responsabilité : Afficher et gérer les contrôles de filtrage.
  // Raison de changer : Ajout de nouveaux filtres (destination, durée),
  // modifications de l'UI des filtres, validation des entrées.

  const handleSearchChange = (e) => {
    onFilterChange({ searchTerm: e.target.value });
  };

  const handleMinPriceChange = (e) => {
    onFilterChange({ minPrice: e.target.value });
  };

  const handleMaxPriceChange = (e) => {
    onFilterChange({ maxPrice: e.target.value });
  };

  const handleClearFilters = () => {
    onFilterChange({
      searchTerm: "",
      minPrice: "",
      maxPrice: "",
    });
  };

  const hasActiveFilters =
    filters.searchTerm || filters.minPrice || filters.maxPrice;

  return (
    <div className="tour-filters">
      <div className="filter-group">
        <label htmlFor="search">Rechercher</label>
        <input
          id="search"
          type="text"
          placeholder="Rechercher des visites..."
          value={filters.searchTerm}
          onChange={handleSearchChange}
          aria-label="Rechercher des visites"
        />
      </div>

      <div className="filter-group">
        <label htmlFor="minPrice">Prix minimum (€)</label>
        <input
          id="minPrice"
          type="number"
          placeholder="Min"
          value={filters.minPrice}
          onChange={handleMinPriceChange}
          min="0"
          aria-label="Prix minimum"
        />
      </div>

      <div className="filter-group">
        <label htmlFor="maxPrice">Prix maximum (€)</label>
        <input
          id="maxPrice"
          type="number"
          placeholder="Max"
          value={filters.maxPrice}
          onChange={handleMaxPriceChange}
          min="0"
          aria-label="Prix maximum"
        />
      </div>

      {hasActiveFilters && (
        <button
          className="clear-filters-btn"
          onClick={handleClearFilters}
          type="button"
        >
          Effacer les filtres
        </button>
      )}
    </div>
  );
};

export default TourFilters;
```

---

#### 3. TourGrid (Composant d'affichage de liste)

```jsx
// components/TourGrid.jsx
import React from "react";
import TourCard from "./TourCard";

const TourGrid = ({ tours, emptyMessage, onSelectTour }) => {
  // Responsabilité : Afficher une grille de cartes de visites.
  // Raison de changer : Modifications de la mise en page de la grille,
  // ajout de pagination, changements du comportement de sélection.

  if (!tours || tours.length === 0) {
    return (
      <div className="tour-grid-empty">
        <p>{emptyMessage || "Aucune visite à afficher."}</p>
      </div>
    );
  }

  return (
    <div className="tours-grid">
      {tours.map((tour) => (
        <TourCard key={tour.id} tour={tour} onSelectTour={onSelectTour} />
      ))}
    </div>
  );
};

export default TourGrid;
```

---

#### 4. TourCard (Composant existant - rappel)

```jsx
// components/TourCard.jsx
import React from "react";

const TourCard = ({ tour, onSelectTour }) => {
  // Responsabilité : Afficher les informations d'une seule visite.
  // Raison de changer : Modifications visuelles de la carte,
  // nouveaux champs à afficher.

  const handleClick = () => {
    if (onSelectTour) {
      onSelectTour(tour.id);
    }
  };

  return (
    <div
      className="tour-card"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyPress={(e) => e.key === "Enter" && handleClick()}
    >
      <img
        src={tour.imageUrl}
        alt={tour.title}
        className="tour-card-image"
        loading="lazy"
      />
      <div className="tour-card-content">
        <h3>{tour.title}</h3>
        <p className="tour-card-description">{tour.description}</p>
        <div className="tour-card-footer">
          <span className="tour-price">{tour.price} €</span>
          <span className="tour-duration">{tour.durationDays} jours</span>
        </div>
      </div>
    </div>
  );
};

export default TourCard;
```

---

### Récapitulatif de la décomposition

| Composant           | Responsabilité unique                                | Raison de changer                |
| ------------------- | ---------------------------------------------------- | -------------------------------- |
| `TourListContainer` | Récupération des données, état global, orchestration | API, cache, gestion d'erreurs    |
| `TourFilters`       | Interface de filtrage                                | Nouveaux filtres, UI des filtres |
| `TourGrid`          | Mise en page de la grille                            | Layout, pagination               |
| `TourCard`          | Affichage d'une visite                               | Design de la carte               |

### Avantages de cette refactorisation

1. **Testabilité** : Chaque composant peut être testé isolément
2. **Réutilisabilité** : `TourFilters` et `TourGrid` peuvent être utilisés ailleurs
3. **Maintenabilité** : Modifications localisées sans effets de bord
4. **Lisibilité** : Code plus clair avec des responsabilités évidentes
5. **Performance** : Optimisation possible avec `React.memo()` sur les composants présentationnels

---

## Points clés à retenir

### Pour les microservices

- ✅ **Une capacité métier = Un microservice**
- ✅ Chaque service possède **ses propres données**
- ✅ Les services communiquent via **API bien définies**
- ✅ Un changement métier n'affecte qu'**un seul service**

### Pour les composants React

- ✅ **Container** = Logique et état
- ✅ **Présentationnel** = Affichage pur
- ✅ Les props descendent, les événements remontent
- ✅ Un composant = Une raison de changer
