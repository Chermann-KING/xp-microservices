# Leçon 3.1 - Le Principe de Responsabilité Unique (SRP) dans les Microservices et les Composants React

**Module 3** : Principes SOLID, Design Patterns et React Avancé

---

## Vue d'ensemble

Le **Principe de Responsabilité Unique** (Single Responsibility Principle - SRP) est un principe fondamental de conception stipulant qu'un module, une classe ou une fonction doit avoir **une seule raison de changer**. Dans le contexte des microservices, cela signifie que chaque microservice doit encapsuler une **capacité métier unique**. Pour les composants React, cela implique qu'un composant doit être responsable d'**une seule partie de l'interface** ou d'**un seul aspect de la fonctionnalité**.

L'application du SRP conduit à des systèmes plus **maintenables**, plus **testables** et plus **évolutifs**.

---

## Comprendre le Principe de Responsabilité Unique

### L'idée centrale

L'idée fondamentale du SRP est d'**empêcher une seule unité de code d'accumuler plusieurs responsabilités non liées**. Lorsqu'un morceau de code a plus d'une responsabilité, les modifications apportées à l'une peuvent affecter involontairement les autres, entraînant des bugs et un effort de maintenance accru.

Une **"responsabilité"** peut être définie comme une **raison de changer**. S'il existe plusieurs raisons indépendantes pour lesquelles un composant ou un service pourrait nécessiter une modification, il viole probablement le SRP.

### Exemple : Violation du SRP dans un monolithe

Considérons une application monolithique traditionnelle où une seule classe `User` gère l'authentification, la gestion du profil et l'envoi de notifications :

```
Classe User (Violation SRP)
├── Authentification (login, logout, génération JWT)
├── Gestion du profil (mise à jour nom, email, préférences)
└── Envoi de notifications (emails de bienvenue, réinitialisation mot de passe)
```

**Raisons de changer multiples :**

| Raison       | Exemple de changement                                                                              |
| ------------ | -------------------------------------------------------------------------------------------------- |
| **Raison 1** | Les exigences métier pour l'authentification changent (ajout de l'authentification multi-facteurs) |
| **Raison 2** | La structure des données du profil évolue (ajout d'un champ "langue préférée")                     |
| **Raison 3** | Le mode d'envoi des notifications change (passage des emails aux notifications push)               |

Parce que la classe `User` a **trois raisons distinctes de changer**, elle viole le SRP.

---

## Le SRP dans les Microservices

Dans une architecture microservices, le SRP guide la **décomposition du système** en services plus petits et indépendants. Chaque microservice doit se concentrer sur une **capacité métier unique et bien définie**, possédant ses propres données et sa logique.

### Exemple 1 : Microservice Tour Catalog

Dans notre application touristique TourCraft, le **Tour Catalog Microservice** est responsable uniquement de la gestion des informations sur les visites.

| Aspect                | Description                                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Responsabilité**    | Gestion des données de visite (création, récupération, mise à jour, suppression)                                         |
| **Raison de changer** | Modifications du stockage des données, nouveaux champs ajoutés à une visite, ou changements de l'algorithme de recherche |

**⚠️ Violation potentielle :**

Si ce même microservice gérait également les réservations ou le traitement des paiements, il violerait le SRP :

- **Raison supplémentaire 1** : Changements dans le workflow de réservation
- **Raison supplémentaire 2** : Changements dans l'intégration de la passerelle de paiement

En séparant ces responsabilités, le Tour Catalog Microservice **reste focalisé** sur sa mission unique.

### Exemple 2 : Microservice Booking Management

Le **Booking Management Microservice** a la seule responsabilité de gérer les réservations des clients.

| Aspect                | Description                                                                                                                      |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Responsabilité**    | Création, confirmation, annulation et récupération des détails de réservation                                                    |
| **Raison de changer** | Changements des règles de réservation, mises à jour des workflows de statut, ou modifications de la génération des confirmations |

**⚠️ Violation potentielle :**

Si le Booking Management Microservice gérait également l'authentification des utilisateurs ou l'envoi d'emails promotionnels, il aurait **plusieurs raisons de changer**. Ces tâches doivent être déléguées à des services dédiés :

- **User Authentication Microservice** pour l'authentification
- **Notification Microservice** pour les communications

---

## Le SRP dans les Composants React

Pour les composants React, le SRP signifie qu'un composant doit gérer **une seule partie de l'interface** ou **une logique spécifique**. Cela ne veut pas dire que chaque élément HTML a besoin de son propre composant, mais plutôt que les composants doivent avoir un **objectif focalisé**.

Les composants peuvent être catégorisés par leur rôle :

| Type                | Responsabilité                     |
| ------------------- | ---------------------------------- |
| **Présentationnel** | Affichage pur (UI)                 |
| **Container**       | Gestion de l'état et de la logique |
| **Utilitaire**      | Fonctionnalités réutilisables      |

### Exemple 1 : Composant TourCard

Considérons un composant `TourCard` qui affiche les informations d'une visite dans notre application touristique :

```jsx
// components/TourCard.jsx
import React from "react";

const TourCard = ({ tour, onSelectTour }) => {
  // Responsabilité : Afficher les informations d'une visite en format carte
  // et notifier le parent lors de la sélection.
  // Raison de changer : Modifications de la mise en page visuelle de la carte,
  // ou changements des champs de données affichés.

  return (
    <div className="tour-card" onClick={() => onSelectTour(tour.id)}>
      <img src={tour.imageUrl} alt={tour.title} className="tour-card-image" />
      <div className="tour-card-content">
        <h3>{tour.title}</h3>
        <p>{tour.description}</p>
        <div className="tour-card-footer">
          <span>{tour.price} €</span>
          <span>Durée : {tour.durationDays} jours</span>
        </div>
      </div>
    </div>
  );
};

export default TourCard;
```

La responsabilité principale de ce composant `TourCard` est de **présenter les détails d'une visite** et d'**émettre un événement au clic**. Ses raisons de changer sont strictement liées à sa **représentation visuelle** ou aux **données qu'il affiche**.

Il ne gère PAS :

- ❌ La récupération des données depuis l'API
- ❌ La gestion d'état complexe pour plusieurs visites
- ❌ Le routage

**⚠️ Exemple de violation : TourCard qui récupère aussi les données et gère un formulaire de réservation**

Si le composant `TourCard` était également responsable de :

1. Récupérer les détails de la visite depuis une API
2. Gérer l'état d'un formulaire de réservation qui apparaît au clic
3. Soumettre le formulaire de réservation au backend

Il violerait le SRP :

| Raison de changer | Domaine concerné                                                             |
| ----------------- | ---------------------------------------------------------------------------- |
| **Raison 1**      | La mise en page visuelle de la carte change                                  |
| **Raison 2**      | L'endpoint API ou la logique de récupération des données change              |
| **Raison 3**      | Les champs du formulaire de réservation ou la logique de soumission changent |

Ces préoccupations sont **distinctes**. Le `TourCard` doit se concentrer sur l'affichage, tandis qu'un composant parent ou un composant de réservation dédié gère la récupération des données et la logique du formulaire.

### Exemple 2 : Composant BookingConfirmationDisplay

Ce composant a pour responsabilité d'**afficher les détails d'une réservation confirmée** :

```jsx
// components/BookingConfirmationDisplay.jsx
import React from "react";

const BookingConfirmationDisplay = ({ bookingDetails }) => {
  // Responsabilité : Afficher les détails d'une réservation confirmée.
  // Raison de changer : Modifications de la mise en page de la confirmation,
  // ou changements des champs spécifiques à afficher.

  if (!bookingDetails) {
    return <p>Aucun détail de réservation à afficher.</p>;
  }

  return (
    <div className="booking-confirmation">
      <h2>Réservation Confirmée ! ✅</h2>
      <p>
        <strong>ID de confirmation :</strong> {bookingDetails.confirmationId}
      </p>
      <p>
        <strong>Nom de la visite :</strong> {bookingDetails.tourTitle}
      </p>
      <p>
        <strong>Date de début :</strong>{" "}
        {new Date(bookingDetails.startDate).toLocaleDateString("fr-FR")}
      </p>
      <p>
        <strong>Nombre de participants :</strong>{" "}
        {bookingDetails.numberOfGuests}
      </p>
      <p>
        <strong>Prix total :</strong> {bookingDetails.totalPrice} €
      </p>
      <p className="booking-status">Statut : {bookingDetails.status}</p>
    </div>
  );
};

export default BookingConfirmationDisplay;
```

Ce composant se concentre **uniquement** sur la présentation des informations de réservation. Il ne :

- ❌ Récupère les `bookingDetails`
- ❌ Gère la logique de confirmation d'une réservation
- ❌ Traite les paiements

Ces responsabilités appartiennent à d'autres composants ou services.

---

## Exemples pratiques et démonstrations

Illustrons le SRP avec des exemples plus concrets de notre application touristique TourCraft.

### Microservices : Séparation des préoccupations pour la gestion des utilisateurs

Imaginons un seul **User Microservice** qui gère toutes les fonctions liées aux utilisateurs. S'il était mal conçu, il ressemblerait à ceci :

#### ❌ Anti-Pattern : User Microservice avec responsabilités multiples

```
User Microservice (Violation SRP)
├── Authentifier l'utilisateur (login, logout, génération de tokens JWT)
├── Gérer le profil utilisateur (mise à jour nom, email, adresse, préférences)
├── Gérer les rôles/permissions (attribuer rôles admin, user, modérateur)
└── Envoyer emails de bienvenue/notifications (après inscription, reset mot de passe)
```

Ce microservice a **au moins quatre raisons distinctes de changer** :

| #   | Raison de changer                            | Exemple                             |
| --- | -------------------------------------------- | ----------------------------------- |
| 1   | Changements de la logique d'authentification | Ajout d'OAuth2                      |
| 2   | Changements du modèle de données du profil   | Nouvelles règles de validation      |
| 3   | Changements des schémas de permissions       | Contrôle d'accès granulaire         |
| 4   | Changements des mécanismes de notification   | Nouveaux templates, nouveaux canaux |

#### ✅ Application du SRP : Décomposition en microservices focalisés

Pour appliquer le SRP, nous décomposons en services plus petits et focalisés :

**1. Authentication Microservice**

| Aspect                | Description                                                                                                                        |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Responsabilité**    | Gérer le login, logout, réinitialisation de mot de passe, émission/validation de tokens JWT                                        |
| **Raison de changer** | Mises à jour des protocoles de sécurité, nouvelles méthodes d'authentification, changements des politiques d'expiration des tokens |

**2. User Profile Microservice**

| Aspect                | Description                                                                                    |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| **Responsabilité**    | Stocker et gérer les données démographiques, coordonnées et préférences                        |
| **Raison de changer** | Nouveaux champs de profil, changements des règles de validation, intégration avec systèmes CRM |

**3. Authorization Microservice** (peut être combiné avec Authentication dans des cas simples)

| Aspect                | Description                                                                                         |
| --------------------- | --------------------------------------------------------------------------------------------------- |
| **Responsabilité**    | Gérer les rôles, permissions et déterminer les actions autorisées                                   |
| **Raison de changer** | Nouveaux rôles, exigences de contrôle d'accès granulaire, changements des politiques d'autorisation |

**4. Notification Microservice**

| Aspect                | Description                                                                                         |
| --------------------- | --------------------------------------------------------------------------------------------------- |
| **Responsabilité**    | Envoyer différents types de notifications (email, SMS, push) aux utilisateurs                       |
| **Raison de changer** | Intégration de nouveaux canaux, changements des templates d'email, mises à jour de la planification |

Cette décomposition assure que **chaque service a une seule raison spécifique de changer**, les rendant plus faciles à développer, tester et déployer indépendamment.

```
Architecture SRP respectée
├── Authentication Microservice (Port 3003)
│   └── login, logout, JWT, reset password
├── User Profile Microservice (Port 3004)
│   └── CRUD profil, préférences, coordonnées
├── Authorization Microservice (Port 3005)
│   └── rôles, permissions, ACL
└── Notification Microservice (Port 3006)
    └── emails, SMS, push notifications
```

---

### Composants React : Refactoring d'un formulaire de réservation

Considérons une page où un utilisateur peut voir une visite et la réserver. Initialement, un seul composant pourrait tout gérer :

#### ❌ Anti-Pattern : TourDetailPage violant le SRP

```jsx
// pages/TourDetailPage.jsx (Exemple de violation SRP)
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import api from "../utils/api"; // Utilitaire API hypothétique

const TourDetailPage = () => {
  const { tourId } = useParams();
  const [tour, setTour] = useState(null);
  const [numberOfGuests, setNumberOfGuests] = useState(1);
  const [bookingDate, setBookingDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bookingMessage, setBookingMessage] = useState("");

  // Responsabilité 1 : Récupération des données de la visite
  useEffect(() => {
    const fetchTour = async () => {
      try {
        const response = await api.get(`/tours/${tourId}`);
        setTour(response.data);
      } catch (err) {
        setError("Échec du chargement des détails de la visite.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTour();
  }, [tourId]);

  // Responsabilité 2 : Soumission de la réservation
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setBookingMessage("Réservation en cours...");
    try {
      const response = await api.post("/bookings", {
        tourId,
        numberOfGuests,
        bookingDate,
      });
      setBookingMessage(
        `Réservation réussie ! ID de confirmation : ${response.data.confirmationId}`
      );
      // Potentiellement envoyer un email ici aussi (autre responsabilité !)
    } catch (err) {
      setBookingMessage(
        "Échec de la réservation : " +
          (err.response?.data?.message || err.message)
      );
    }
  };

  if (loading) return <p>Chargement des détails...</p>;
  if (error) return <p className="error">{error}</p>;
  if (!tour) return <p>Visite non trouvée.</p>;

  // Responsabilité 3 : Affichage des détails de la visite
  // Responsabilité 4 : Affichage et gestion du formulaire de réservation
  return (
    <div className="tour-detail-page">
      <h1>{tour.title}</h1>
      <img src={tour.imageUrl} alt={tour.title} />
      <p>{tour.description}</p>
      {/* ... plus de détails de la visite */}

      <h2>Réserver cette visite</h2>
      <form onSubmit={handleBookingSubmit}>
        <label>
          Nombre de participants :
          <input
            type="number"
            value={numberOfGuests}
            onChange={(e) => setNumberOfGuests(Number(e.target.value))}
            min="1"
          />
        </label>
        <label>
          Date de réservation :
          <input
            type="date"
            value={bookingDate}
            onChange={(e) => setBookingDate(e.target.value)}
          />
        </label>
        <button type="submit">Confirmer la réservation</button>
      </form>
      {bookingMessage && <p className="booking-message">{bookingMessage}</p>}
    </div>
  );
};

export default TourDetailPage;
```

Ce composant `TourDetailPage` a **plusieurs raisons de changer** :

| #   | Raison de changer                                     | Impact                         |
| --- | ----------------------------------------------------- | ------------------------------ |
| 1   | Changements de la logique de récupération des données | useEffect, gestion des erreurs |
| 2   | Changements de l'affichage des détails de la visite   | Structure JSX                  |
| 3   | Changements des champs du formulaire ou validation    | État local, JSX du formulaire  |
| 4   | Changements de la logique de soumission ou de l'API   | handleBookingSubmit            |

#### ✅ Application du SRP : Décomposition de TourDetailPage

Nous pouvons décomposer ce composant en plusieurs composants, chacun avec une **responsabilité unique** :

**1. TourDetailsContainer (Composant Container)**

```jsx
// components/TourDetailsContainer.jsx
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import api from "../utils/api";
import TourDetailsDisplay from "./TourDetailsDisplay";
import BookingForm from "./BookingForm";

const TourDetailsContainer = () => {
  // Responsabilité : Récupérer les données de la visite, gérer les états
  // de chargement/erreur. Gère le "comment" de la récupération des données.
  // Raison de changer : Changements de l'endpoint API, stratégies de cache,
  // ou gestion d'erreurs spécifique à la récupération des données.

  const { tourId } = useParams();
  const [tour, setTour] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTour = async () => {
      try {
        const response = await api.get(`/tours/${tourId}`);
        setTour(response.data);
      } catch (err) {
        setError("Échec du chargement des détails de la visite.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTour();
  }, [tourId]);

  if (loading) return <p>Chargement des détails...</p>;
  if (error) return <p className="error">{error}</p>;
  if (!tour) return <p>Visite non trouvée.</p>;

  return (
    <div className="tour-detail-page">
      <TourDetailsDisplay tour={tour} />
      <BookingForm tourId={tour.id} tourPrice={tour.price} />
    </div>
  );
};

export default TourDetailsContainer;
```

**2. TourDetailsDisplay (Composant Présentationnel)**

```jsx
// components/TourDetailsDisplay.jsx
import React from "react";

const TourDetailsDisplay = ({ tour }) => {
  // Responsabilité : Rendre visuellement les informations de la visite.
  // Gère le "quoi" afficher.
  // Raison de changer : Mises à jour UI/UX des détails de la visite,
  // nouveaux champs à afficher, ou changements de formatage.

  return (
    <div className="tour-details-display">
      <h1>{tour.title}</h1>
      <img src={tour.imageUrl} alt={tour.title} className="tour-detail-image" />
      <p>{tour.description}</p>
      <div className="tour-meta">
        <span>Prix : {tour.price} €</span>
        <span>Durée : {tour.durationDays} jours</span>
        <span>Lieu : {tour.location}</span>
      </div>
      {/* ... autres éléments de présentation */}
    </div>
  );
};

export default TourDetailsDisplay;
```

**3. BookingForm (Composant focalisé sur la logique du formulaire)**

```jsx
// components/BookingForm.jsx
import React, { useState } from "react";
import api from "../utils/api";

const BookingForm = ({ tourId, tourPrice }) => {
  // Responsabilité : Gérer l'état local du formulaire de réservation,
  // la validation, et soumettre la demande de réservation à l'API.
  // Gère l'interaction pour la réservation.
  // Raison de changer : Changements des champs du formulaire, règles
  // de validation, ou structure de l'endpoint/requête API de réservation.

  const [numberOfGuests, setNumberOfGuests] = useState(1);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingMessage, setBookingMessage] = useState("");
  const [isLoadingBooking, setIsLoadingBooking] = useState(false);

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setIsLoadingBooking(true);
    setBookingMessage(""); // Effacer les messages précédents

    if (!bookingDate) {
      setBookingMessage("Veuillez sélectionner une date de réservation.");
      setIsLoadingBooking(false);
      return;
    }

    try {
      const response = await api.post("/bookings", {
        tourId,
        numberOfGuests,
        bookingDate,
        totalPrice: numberOfGuests * tourPrice,
      });
      setBookingMessage(
        `Réservation réussie ! ID de confirmation : ${response.data.confirmationId}`
      );
      // Réinitialiser le formulaire
      setNumberOfGuests(1);
      setBookingDate("");
    } catch (err) {
      setBookingMessage(
        "Échec de la réservation : " +
          (err.response?.data?.message || err.message)
      );
      console.error("Erreur de réservation :", err);
    } finally {
      setIsLoadingBooking(false);
    }
  };

  return (
    <div className="booking-section">
      <h2>Réserver cette visite</h2>
      <form onSubmit={handleBookingSubmit}>
        <label>
          Nombre de participants :
          <input
            type="number"
            value={numberOfGuests}
            onChange={(e) => setNumberOfGuests(Number(e.target.value))}
            min="1"
            disabled={isLoadingBooking}
          />
        </label>
        <label>
          Date de réservation :
          <input
            type="date"
            value={bookingDate}
            onChange={(e) => setBookingDate(e.target.value)}
            disabled={isLoadingBooking}
          />
        </label>
        <button type="submit" disabled={isLoadingBooking}>
          {isLoadingBooking ? "Réservation..." : "Confirmer la réservation"}
        </button>
      </form>
      {bookingMessage && (
        <p className={bookingMessage.includes("réussie") ? "success" : "error"}>
          {bookingMessage}
        </p>
      )}
    </div>
  );
};

export default BookingForm;
```

### Récapitulatif de la décomposition

En appliquant le SRP, chaque composant a un **objectif plus clair**, les rendant plus faciles à comprendre, tester et maintenir :

| Composant              | Responsabilité unique                   | Raison de changer               |
| ---------------------- | --------------------------------------- | ------------------------------- |
| `TourDetailsContainer` | Récupération des données, orchestration | API, stratégie de cache         |
| `TourDetailsDisplay`   | Affichage visuel de la visite           | UI/UX, mise en page             |
| `BookingForm`          | Formulaire et soumission de réservation | Champs, validation, API booking |

Une modification de l'affichage des détails (`TourDetailsDisplay`) **n'affectera pas** la logique de réservation (`BookingForm`), et vice versa.

---

## Exercices et activités pratiques

Pour consolider votre compréhension du SRP dans les microservices et les composants React, essayez les exercices suivants.

### Exercice 1 : Décomposition d'un microservice "UserAccount" hypothétique

Imaginez que vous avez un seul microservice appelé `UserAccountService` qui gère actuellement les fonctionnalités suivantes :

| Endpoint                      | Description                                                  |
| ----------------------------- | ------------------------------------------------------------ |
| `POST /users/register`        | Crée un nouvel utilisateur dans la base de données           |
| `POST /users/login`           | Authentifie un utilisateur et émet un JWT                    |
| `GET /users/{id}/profile`     | Récupère les informations du profil utilisateur              |
| `PUT /users/{id}/profile`     | Met à jour les informations du profil utilisateur            |
| `PUT /users/{id}/password`    | Change le mot de passe d'un utilisateur                      |
| `POST /users/{id}/send-otp`   | Envoie un mot de passe à usage unique (OTP) par email ou SMS |
| `POST /users/{id}/verify-otp` | Vérifie un OTP                                               |
| `GET /admin/users/{id}/roles` | Récupère les rôles utilisateur (admin, customer, etc.)       |
| `PUT /admin/users/{id}/roles` | Met à jour les rôles utilisateur                             |

**Tâche :**

1. **Identifiez les responsabilités distinctes** au sein de ce `UserAccountService`
2. **Proposez une nouvelle architecture microservices** où chaque nouveau service respecte le Principe de Responsabilité Unique
3. Pour chaque nouveau microservice, spécifiez :
   - Sa **responsabilité principale**
   - Les **endpoints API** qu'il exposerait probablement

---

### Exercice 2 : Refactoring d'un composant React TourList

Considérons un composant `TourList` qui affiche une liste de visites et possède également une barre de recherche et un filtre par fourchette de prix :

```jsx
// components/TourList.jsx (Exemple initial de violation SRP)
import React, { useState, useEffect } from "react";
import api from "../utils/api"; // Utilitaire API hypothétique

const TourList = () => {
  const [tours, setTours] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTours = async () => {
      setLoading(true);
      try {
        const response = await api.get("/tours");
        setTours(response.data);
      } catch (err) {
        setError("Échec de la récupération des visites.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTours();
  }, []);

  const filteredTours = tours.filter((tour) => {
    const matchesSearch = tour.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesMinPrice =
      minPrice === "" || tour.price >= parseFloat(minPrice);
    const matchesMaxPrice =
      maxPrice === "" || tour.price <= parseFloat(maxPrice);
    return matchesSearch && matchesMinPrice && matchesMaxPrice;
  });

  if (loading) return <p>Chargement des visites...</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <div className="tour-list-page">
      <h1>Visites Disponibles</h1>
      <div className="filters">
        <input
          type="text"
          placeholder="Rechercher des visites..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <input
          type="number"
          placeholder="Prix min"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
        />
        <input
          type="number"
          placeholder="Prix max"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
        />
      </div>
      <div className="tours-grid">
        {filteredTours.length > 0 ? (
          filteredTours.map((tour) => (
            <div key={tour.id} className="tour-card">
              <h3>{tour.title}</h3>
              <p>{tour.description}</p>
              <span>{tour.price} €</span>
            </div>
          ))
        ) : (
          <p>Aucune visite ne correspond à vos critères.</p>
        )}
      </div>
    </div>
  );
};

export default TourList;
```

**Tâche :**

1. **Identifiez les responsabilités** qui violent le SRP dans le composant `TourList`
2. **Refactorez** le composant `TourList` en plusieurs composants plus petits, chacun respectant le SRP
3. Vous devez créer **au moins trois composants distincts** :
   - Un **composant container** pour la récupération et la gestion de l'état global des visites
   - Un **composant** pour les contrôles de recherche et filtrage
   - Un **composant** responsable uniquement de l'affichage d'une liste de composants `TourCard` (vous pouvez supposer que `TourCard` existe déjà d'après les exemples précédents)
4. **Fournissez le code** de vos composants refactorisés

---

## Points clés à retenir

| Concept                 | Description                                                                  |
| ----------------------- | ---------------------------------------------------------------------------- |
| **SRP**                 | Un module/classe/fonction doit avoir **une seule raison de changer**         |
| **Microservices**       | Chaque service encapsule une **capacité métier unique**                      |
| **React**               | Chaque composant gère **une seule partie de l'UI** ou une logique spécifique |
| **Avantages**           | Maintenabilité, testabilité, évolutivité accrues                             |
| **Signal de violation** | Plusieurs raisons indépendantes de modification                              |

---

## Conclusion

Le Principe de Responsabilité Unique est une **pierre angulaire** de la bonne conception logicielle, favorisant la **modularité** et réduisant la **complexité**.

### Dans les microservices

Le SRP guide la **décomposition en capacités métier bien définies**, conduisant à des services indépendants plus faciles à :

- Développer
- Déployer
- Mettre à l'échelle

### Dans les composants React

Le SRP assure que chaque composant a un **objectif clair**, rendant l'interface utilisateur plus :

- Maintenable
- Testable
- Réutilisable

En appliquant systématiquement le SRP, vous construisez des systèmes **robustes** et **adaptables au changement**.

---

## Prochaine leçon

Dans la prochaine leçon, nous explorerons le **Principe Ouvert/Fermé (OCP)**, qui complète le SRP en se concentrant sur la manière de rendre votre code **extensible sans nécessiter de modifications** aux composants existants et testés.

Ce principe s'appuie sur la base solide fournie par le SRP, permettant une évolution robuste et flexible du système.

**➡️ [Leçon 3.2 - Le Principe Ouvert/Fermé (OCP)](lecon-2-open-closed-principle.md)**

---

## Ressources complémentaires

- [Clean Code - Robert C. Martin](https://www.amazon.fr/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882) - Le livre de référence sur les principes SOLID
- [Patterns of Enterprise Application Architecture - Martin Fowler](https://martinfowler.com/books/eaa.html)
- [React Documentation - Thinking in React](https://react.dev/learn/thinking-in-react) - Comment décomposer une UI en composants
