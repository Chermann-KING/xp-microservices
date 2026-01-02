# Solutions des Exercices - Leçon 2.1 : Domain-Driven Design

## Exercice 1 : Identifier le Langage Ubiquitaire

**Objectif :** Analyser les termes métier "Customer", "Tour", et "Price" dans différents contextes.

### Solution

#### 1. Customer (Client)

**Dans le contexte "Catalog" (Catalogue de Visites)**

- **Signification :** Utilisateur qui recherche et consulte des visites disponibles
- **Attributs pertinents :**
  - `userId` : Identifiant de l'utilisateur
  - `preferences` : Préférences de voyage (destinations favorites, types d'activités)
  - `searchHistory` : Historique de recherche
  - `viewedTours` : Visites consultées
- **Comportements :**
  - Rechercher des visites
  - Filtrer par critères
  - Consulter les détails d'une visite
  - Ajouter aux favoris

**Dans le contexte "Booking" (Réservation)**

- **Signification :** Personne qui effectue une réservation et paie
- **Attributs pertinents :**
  - `userId` : Identifiant de l'utilisateur
  - `fullName` : Nom complet (Tony Stark, Hermione Granger)
  - `email` : Email de contact
  - `phone` : Téléphone
  - `paymentMethods` : Moyens de paiement enregistrés
  - `bookingHistory` : Historique des réservations
- **Comportements :**
  - Créer une réservation
  - Modifier une réservation
  - Annuler une réservation
  - Ajouter des participants

**Dans le contexte "Payment" (Paiement)**

- **Signification :** Entité facturable avec moyens de paiement
- **Attributs pertinents :**
  - `userId` : Identifiant de l'utilisateur
  - `billingAddress` : Adresse de facturation
  - `paymentMethodId` : ID du moyen de paiement (carte, PayPal)
  - `stripeCustomerId` : ID client Stripe
  - `invoiceEmail` : Email pour les factures
- **Comportements :**
  - Autoriser un paiement
  - Enregistrer un moyen de paiement
  - Consulter l'historique de paiements
  - Recevoir des factures

**Analyse :** Le terme "Customer" a des responsabilités très différentes selon le contexte. Dans Catalog, il s'agit d'un simple utilisateur anonyme ou connecté qui explore. Dans Booking, c'est une personne identifiée qui réserve. Dans Payment, c'est une entité facturable avec des moyens de paiement validés.

---

#### 2. Tour (Visite Touristique)

**Dans le contexte "Catalog" (Catalogue de Visites)**

- **Signification :** Produit consultable avec description marketing
- **Attributs pertinents :**
  - `tourId` : Identifiant de la visite
  - `title` : Titre marketing
  - `description` : Description détaillée
  - `images` : Photos de la visite
  - `duration` : Durée (ex: "3 jours")
  - `destination` : Destination (ex: "Paris", "Tokyo")
  - `activities` : Liste des activités incluses
  - `rating` : Note moyenne (4.5/5)
  - `reviewsCount` : Nombre d'avis
  - `basePrice` : Prix de base affiché
- **Comportements :**
  - Afficher les détails
  - Lister les avis
  - Rechercher par critères
  - Comparer avec d'autres visites

**Dans le contexte "Booking" (Réservation)**

- **Signification :** Ressource réservable avec disponibilité et capacité
- **Attributs pertinents :**
  - `tourId` : Identifiant de la visite
  - `title` : Titre de la visite
  - `availability` : Disponibilité par date
  - `maxCapacity` : Capacité maximale (ex: 20 personnes)
  - `currentCapacity` : Places restantes par date
  - `bookingRules` : Règles de réservation (annulation, modification)
  - `minimumParticipants` : Nombre minimum de participants
- **Comportements :**
  - Vérifier la disponibilité
  - Réserver des places
  - Bloquer temporairement des places
  - Libérer des places (annulation)

**Dans le contexte "Pricing" (Tarification)**

- **Signification :** Produit avec grille tarifaire et règles de prix
- **Attributs pertinents :**
  - `tourId` : Identifiant de la visite
  - `basePriceAdult` : Prix de base adulte
  - `basePriceChild` : Prix de base enfant
  - `seasonalPricing` : Tarifs saisonniers (haute/basse saison)
  - `groupDiscounts` : Remises de groupe (ex: -10% à partir de 5 personnes)
  - `earlyBirdDiscount` : Remise réservation anticipée
  - `lastMinuteDiscount` : Remise dernière minute
- **Comportements :**
  - Calculer le prix pour une date donnée
  - Appliquer les remises
  - Gérer les promotions

**Analyse :** "Tour" représente trois facettes distinctes : un produit marketing (Catalog), une ressource avec contraintes de capacité (Booking), et un élément tarifaire avec règles de prix complexes (Pricing). Chaque contexte a ses propres attributs et règles métier.

---

#### 3. Price (Prix)

**Dans le contexte "Catalog" (Catalogue)**

- **Signification :** Information de prix affichée pour aider à la décision
- **Attributs pertinents :**
  - `displayPrice` : Prix affiché (ex: "À partir de 99€")
  - `currency` : Devise (EUR, USD)
  - `priceRange` : Fourchette de prix (min-max)
- **Comportements :**
  - Afficher le prix de base
  - Indiquer "À partir de..."
  - Comparer les prix entre visites

**Dans le contexte "Booking" (Réservation)**

- **Signification :** Montant calculé pour une réservation spécifique
- **Attributs pertinents :**
  - `totalPrice` : Prix total de la réservation
  - `breakdown` : Détail du prix (adultes, enfants, taxes)
  - `discountsApplied` : Remises appliquées
  - `finalPrice` : Prix final après remises
  - `currency` : Devise
- **Comportements :**
  - Calculer le prix total
  - Appliquer les remises
  - Détailler les composants du prix

**Dans le contexte "Payment" (Paiement)**

- **Signification :** Montant à facturer et à encaisser
- **Attributs pertinents :**
  - `amountToPay` : Montant à payer
  - `currency` : Devise
  - `paymentStatus` : Statut du paiement (pending, completed, failed)
  - `paidAmount` : Montant payé
  - `refundedAmount` : Montant remboursé
  - `transactionFees` : Frais de transaction (Stripe)
- **Comportements :**
  - Autoriser un paiement
  - Capturer un paiement
  - Rembourser un paiement

**Analyse :** "Price" varie du simple prix d'affichage (Catalog) à un montant calculé avec détails (Booking) puis à une transaction financière avec statuts et frais (Payment). Chaque contexte ajoute une couche de complexité.

---

### Tableau Récapitulatif

| Terme      | Contexte Catalog       | Contexte Booking          | Contexte Payment/Pricing    |
| ---------- | ---------------------- | ------------------------- | --------------------------- |
| **Customer** | Utilisateur explorant  | Personne réservant        | Entité facturable           |
| **Tour**     | Produit marketing      | Ressource à disponibilité | Produit tarifé              |
| **Price**    | Prix d'affichage       | Montant calculé           | Transaction financière      |

---

## Exercice 2 : Context Mapping - Fonctionnalité "Recommandations Personnalisées"

**Objectif :** Analyser les interactions entre Bounded Contexts pour une fonctionnalité de recommandations.

### Solution

#### 1. Contextes impliqués

**a) User Profile Context (Contexte Profil Utilisateur)**

- **Responsabilité :** Gérer les préférences et l'historique de l'utilisateur
- **Données :**
  - Destinations favorites (ex: Europe, Asie)
  - Types d'activités préférées (aventure, culture, gastronomie)
  - Budget moyen
  - Historique de recherches
  - Visites consultées
- **Événements émis :**
  - `UserPreferencesUpdated`
  - `UserSearchPerformed`
  - `TourViewed`

**b) Catalog Context (Contexte Catalogue)**

- **Responsabilité :** Fournir les visites disponibles avec métadonnées
- **Données :**
  - Liste des visites
  - Tags et catégories
  - Destinations
  - Prix de base
  - Note moyenne et avis
- **Événements émis :**
  - `TourPublished`
  - `TourUpdated`

**c) Recommendation Engine Context (Contexte Moteur de Recommandation)**

- **Responsabilité :** Générer des recommandations personnalisées
- **Données :**
  - Algorithmes de recommandation (collaborative filtering, content-based)
  - Score de pertinence par visite/utilisateur
  - Historique des recommandations affichées
- **Événements émis :**
  - `RecommendationsGenerated`

**d) Booking Context (Contexte Réservation)** *(optionnel)*

- **Responsabilité :** Historique des réservations pour affiner les recommandations
- **Données :**
  - Visites réservées par le passé
  - Réservations annulées
- **Événements émis :**
  - `BookingCompleted`
  - `BookingCancelled`

---

#### 2. Type de relation entre contextes

**User Profile → Recommendation Engine : Partnership (Partenariat)**

- **Relation :** Shared Kernel (Noyau Partagé) ou Customer-Supplier
- **Explication :** User Profile fournit les préférences utilisateur au moteur de recommandation. Ils collaborent étroitement pour personnaliser l'expérience.
- **Communication :** API REST ou événements (`UserPreferencesUpdated`)

**Catalog → Recommendation Engine : Customer-Supplier**

- **Relation :** Customer-Supplier (Catalog est le fournisseur)
- **Explication :** Le moteur de recommandation consomme les données du catalogue (visites disponibles, métadonnées) pour générer des recommandations.
- **Communication :** API REST pour récupérer les visites ou événements (`TourPublished`)

**Recommendation Engine → User Profile : Conformist**

- **Relation :** Conformist (Le moteur se conforme au modèle de User Profile)
- **Explication :** Le moteur doit s'adapter au format des préférences utilisateur tel que défini par User Profile.

**Booking → Recommendation Engine : Customer-Supplier**

- **Relation :** Customer-Supplier (Booking fournit l'historique)
- **Explication :** L'historique des réservations améliore les recommandations (ex: ne pas recommander des visites déjà réservées).
- **Communication :** Événements (`BookingCompleted`)

---

#### 3. Diagramme de Context Mapping

```
┌─────────────────────┐
│   User Profile      │
│   Context           │
│                     │
│ - Préférences       │
│ - Historique        │
└──────────┬──────────┘
           │
           │ Customer-Supplier
           │ (fournit préférences)
           │
           ▼
┌─────────────────────────────┐
│   Recommendation Engine     │
│   Context                   │
│                             │
│ - Algorithmes ML            │
│ - Scores de pertinence      │
└──────────┬──────────────────┘
           │
           │ Customer-Supplier
           │ (consomme catalogue)
           │
           ▼
┌─────────────────────┐         ┌─────────────────────┐
│   Catalog Context   │         │   Booking Context   │
│                     │         │                     │
│ - Visites           │         │ - Historique        │
│ - Métadonnées       │         │   réservations      │
└─────────────────────┘         └──────────┬──────────┘
                                           │
                                           │ Customer-Supplier
                                           │ (fournit historique)
                                           │
                                           └─────────────────────┐
                                                                 │
                                                                 ▼
                                                  Recommendation Engine
```

---

#### 4. Flux de données

**Étape 1 : Collecte des préférences utilisateur**

```
User Profile Context
    │
    ├─ Événement : UserPreferencesUpdated
    │   {
    │     userId: "user123",
    │     preferences: {
    │       destinations: ["Paris", "Tokyo"],
    │       activities: ["culture", "gastronomie"],
    │       budgetRange: { min: 500, max: 2000 }
    │     }
    │   }
    │
    └─► Recommendation Engine (écoute l'événement)
```

**Étape 2 : Récupération du catalogue**

```
Recommendation Engine
    │
    ├─ Appel API : GET /api/v1/tours
    │   Paramètres : ?destination=Paris&activities=culture
    │
    └─► Catalog Context
            │
            └─► Retourne : Liste des visites correspondantes
                [
                  { tourId: "tour1", title: "Louvre et Musée d'Orsay", rating: 4.8 },
                  { tourId: "tour2", title: "Gastronomie Parisienne", rating: 4.6 }
                ]
```

**Étape 3 : Enrichissement avec l'historique de réservations**

```
Recommendation Engine
    │
    ├─ Écoute événement : BookingCompleted
    │   {
    │     userId: "user123",
    │     tourId: "tour1",
    │     completedAt: "2026-07-15"
    │   }
    │
    └─► Filtre les recommandations (ne pas recommander tour1)
```

**Étape 4 : Génération des recommandations**

```
Recommendation Engine
    │
    ├─ Algorithme de scoring :
    │   - Matching préférences (destinations, activités) : 60%
    │   - Popularité (rating, reviews) : 20%
    │   - Nouveauté : 10%
    │   - Budget : 10%
    │
    └─► Génère : Liste de recommandations triées
        [
          { tourId: "tour2", score: 0.92, reason: "Correspond à vos préférences" },
          { tourId: "tour5", score: 0.85, reason: "Très bien noté par des utilisateurs similaires" }
        ]
```

**Étape 5 : Affichage à l'utilisateur**

```
Recommendation Engine
    │
    └─► Événement : RecommendationsGenerated
            │
            └─► Frontend / User Profile Context
                    │
                    └─► Affiche les recommandations sur la page d'accueil
```

---

#### 5. Anti-Corruption Layer (ACL)

**Pourquoi ?** Le Recommendation Engine ne doit pas être couplé aux détails internes des autres contextes.

**Exemple ACL pour Catalog Context :**

```javascript
// Dans Recommendation Engine Context
class CatalogAdapter {
  async getToursForRecommendation(preferences) {
    // Appel externe au Catalog Context
    const catalogTours = await catalogClient.get('/api/v1/tours', {
      params: {
        destination: preferences.destinations.join(','),
        activities: preferences.activities.join(',')
      }
    });

    // Transformation vers le modèle interne du Recommendation Engine
    return catalogTours.map(tour => ({
      id: tour.tourId,
      name: tour.title,
      tags: tour.activities,
      popularity: tour.rating * tour.reviewsCount,
      basePrice: tour.price.amount
    }));
  }
}
```

**Avantage :** Si le Catalog Context change son modèle de données, seul l'adapter doit être modifié.

---

## Exercice 3 : Découpage Monolithe vs. Bounded Context

**Objectif :** Comparer l'architecture monolithique avec une approche Bounded Context pour une agence de voyage.

### Solution

#### Scénario : Agence de Voyage Traditionnelle

**Fonctionnalités :**
- Gestion du catalogue de visites
- Réservations
- Paiements
- Gestion des clients
- Notifications (email, SMS)

---

### Architecture Monolithique

#### Structure

```
┌──────────────────────────────────────────────────────┐
│             Application Monolithique                 │
│                                                      │
│  ┌────────────────────────────────────────────┐    │
│  │         Couche Présentation (UI)           │    │
│  │  - Pages web                               │    │
│  │  - Formulaires                             │    │
│  └────────────────────────────────────────────┘    │
│                       │                             │
│  ┌────────────────────────────────────────────┐    │
│  │         Couche Logique Métier              │    │
│  │  - TourService                             │    │
│  │  - BookingService                          │    │
│  │  - PaymentService                          │    │
│  │  - CustomerService                         │    │
│  │  - NotificationService                     │    │
│  └────────────────────────────────────────────┘    │
│                       │                             │
│  ┌────────────────────────────────────────────┐    │
│  │         Couche Accès aux Données           │    │
│  │  - TourRepository                          │    │
│  │  - BookingRepository                       │    │
│  │  - PaymentRepository                       │    │
│  │  - CustomerRepository                      │    │
│  └────────────────────────────────────────────┘    │
│                       │                             │
│  ┌────────────────────────────────────────────┐    │
│  │         Base de Données Unique             │    │
│  │  Tables:                                   │    │
│  │  - customers                               │    │
│  │  - tours                                   │    │
│  │  - bookings                                │    │
│  │  - payments                                │    │
│  │  - notifications                           │    │
│  └────────────────────────────────────────────┘    │
│                                                      │
└──────────────────────────────────────────────────────┘
```

#### Avantages

1. **Simplicité de déploiement :** Un seul artefact à déployer
2. **Développement initial rapide :** Pas de complexité de communication inter-services
3. **Transactions simples :** ACID garanti nativement avec une seule base de données
4. **Debugging facile :** Tout le code est au même endroit
5. **Pas de latence réseau :** Appels de méthodes directs

#### Inconvénients

1. **Couplage fort :** Tous les modules partagent le même code et la même base de données
   - Exemple : Changer le schéma de la table `customers` impacte TourService, BookingService, PaymentService
2. **Scalabilité limitée :** On ne peut pas scaler uniquement le module Booking (haute charge en été)
3. **Déploiement risqué :** Un bug dans NotificationService peut crasher toute l'application
4. **Équipes bloquées :** Difficile de faire travailler plusieurs équipes en parallèle (conflits de merge)
5. **Technologie unique :** Impossible d'utiliser des technologies différentes (ex: Python pour recommandations ML)

#### Exemple de Couplage Problématique

```javascript
// Dans BookingService (monolithe)
class BookingService {
  async createBooking(bookingData) {
    // 1. Vérifier la disponibilité de la visite
    const tour = await this.tourRepository.findById(bookingData.tourId);
    if (tour.availableSeats < bookingData.numberOfParticipants) {
      throw new Error('Not enough seats');
    }

    // 2. Créer la réservation
    const booking = await this.bookingRepository.create(bookingData);

    // 3. Traiter le paiement (COUPLAGE DIRECT)
    const payment = await this.paymentService.processPayment({
      bookingId: booking.id,
      amount: tour.price * bookingData.numberOfParticipants,
      customerId: bookingData.customerId
    });

    // 4. Mettre à jour la disponibilité (COUPLAGE DIRECT)
    await this.tourRepository.update(tour.id, {
      availableSeats: tour.availableSeats - bookingData.numberOfParticipants
    });

    // 5. Envoyer une notification (COUPLAGE DIRECT)
    await this.notificationService.sendEmail({
      to: bookingData.customerEmail,
      subject: 'Booking confirmed',
      template: 'booking-confirmation'
    });

    return booking;
  }
}
```

**Problème :** Si PaymentService ou NotificationService échoue, toute la transaction échoue. Pas de résilience.

---

### Architecture Bounded Context (Microservices)

#### Structure

```
┌─────────────────────┐   ┌─────────────────────┐   ┌─────────────────────┐
│   Catalog Context   │   │  Booking Context    │   │  Payment Context    │
│                     │   │                     │   │                     │
│ - Tour Catalog API  │   │ - Booking API       │   │ - Payment API       │
│ - Tour DB           │   │ - Booking DB        │   │ - Payment DB        │
│   (PostgreSQL)      │   │   (PostgreSQL)      │   │   (PostgreSQL)      │
└──────────┬──────────┘   └──────────┬──────────┘   └──────────┬──────────┘
           │                         │                         │
           │                         │                         │
           └─────────────────────────┴─────────────────────────┘
                                     │
                                     │ Message Bus (RabbitMQ/Kafka)
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           │                         │                         │
┌──────────┴──────────┐   ┌──────────┴──────────┐   ┌──────────┴──────────┐
│ Customer Context    │   │ Notification Context│   │   API Gateway       │
│                     │   │                     │   │                     │
│ - User Profile API  │   │ - Email Service     │   │ - Routing           │
│ - Customer DB       │   │ - SMS Service       │   │ - Authentication    │
│   (PostgreSQL)      │   │ - Queue (Redis)     │   │ - Rate Limiting     │
└─────────────────────┘   └─────────────────────┘   └─────────────────────┘
```

#### Avantages

1. **Découplage :** Chaque contexte évolue indépendamment
   - Exemple : On peut changer le modèle de données de Payment sans toucher à Booking
2. **Scalabilité indépendante :** Scaler uniquement Booking Context pendant l'été
3. **Résilience :** Si Notification Context tombe, Booking continue de fonctionner
4. **Équipes autonomes :** L'équipe Catalog peut déployer sans attendre l'équipe Booking
5. **Choix technologiques :** Utiliser Node.js pour Booking, Python pour Recommendation Engine

#### Inconvénients

1. **Complexité accrue :** Besoin de message bus, API Gateway, monitoring distribué
2. **Transactions distribuées :** Pas de ACID natif, besoin du Saga Pattern
3. **Latence réseau :** Appels HTTP entre services
4. **Duplication de données :** Chaque contexte peut avoir sa propre copie des données client
5. **Debugging difficile :** Les erreurs peuvent se propager à travers plusieurs services

#### Exemple de Découplage avec Événements

```javascript
// Dans Booking Context
class BookingService {
  async createBooking(bookingData) {
    // 1. Vérifier la disponibilité (appel HTTP au Catalog Context)
    const isAvailable = await this.catalogClient.checkAvailability(
      bookingData.tourId,
      bookingData.numberOfParticipants
    );
    if (!isAvailable) {
      throw new Error('Not enough seats');
    }

    // 2. Créer la réservation
    const booking = await this.bookingRepository.create({
      ...bookingData,
      status: 'pending'
    });

    // 3. Publier un événement (asynchrone, non bloquant)
    await this.eventBus.publish('BookingCreated', {
      bookingId: booking.id,
      tourId: bookingData.tourId,
      customerId: bookingData.customerId,
      amount: bookingData.totalPrice,
      numberOfParticipants: bookingData.numberOfParticipants
    });

    return booking;
  }
}
```

**Consommateurs de l'événement `BookingCreated` :**

```javascript
// Payment Context écoute l'événement
eventBus.subscribe('BookingCreated', async (event) => {
  const payment = await paymentService.processPayment({
    bookingId: event.bookingId,
    amount: event.amount,
    customerId: event.customerId
  });

  // Publier PaymentCompleted ou PaymentFailed
  if (payment.status === 'completed') {
    eventBus.publish('PaymentCompleted', { bookingId: event.bookingId });
  } else {
    eventBus.publish('PaymentFailed', { bookingId: event.bookingId });
  }
});

// Notification Context écoute l'événement
eventBus.subscribe('BookingCreated', async (event) => {
  await notificationService.sendEmail({
    customerId: event.customerId,
    template: 'booking-pending',
    data: { bookingId: event.bookingId }
  });
});

// Catalog Context écoute l'événement pour mettre à jour la disponibilité
eventBus.subscribe('PaymentCompleted', async (event) => {
  const booking = await bookingClient.getBooking(event.bookingId);
  await tourRepository.decrementSeats(booking.tourId, booking.numberOfParticipants);
});
```

**Avantage :** Si Notification Context est en panne, la réservation est quand même créée et le paiement traité. L'email sera envoyé plus tard (retry).

---

### Comparaison Détaillée

| Critère                      | Monolithe                              | Bounded Context (Microservices)         |
| ---------------------------- | -------------------------------------- | --------------------------------------- |
| **Complexité initiale**      | ⭐⭐ Faible                             | ⭐⭐⭐⭐ Élevée                           |
| **Scalabilité**              | ⭐⭐ Verticale uniquement               | ⭐⭐⭐⭐⭐ Horizontale et indépendante     |
| **Résilience**               | ⭐⭐ Faible (un bug = tout casse)       | ⭐⭐⭐⭐ Élevée (isolation des pannes)    |
| **Temps de déploiement**     | ⭐⭐⭐⭐ Rapide (un seul artefact)       | ⭐⭐ Lent (plusieurs services)           |
| **Autonomie des équipes**    | ⭐⭐ Faible (conflits de merge)         | ⭐⭐⭐⭐⭐ Élevée (équipes indépendantes)  |
| **Transactions**             | ⭐⭐⭐⭐⭐ ACID natif                    | ⭐⭐ Eventual consistency (Saga)         |
| **Debugging**                | ⭐⭐⭐⭐ Facile (stack trace complète)   | ⭐⭐ Difficile (traces distribuées)      |
| **Choix technologiques**     | ⭐⭐ Limité (une seule stack)           | ⭐⭐⭐⭐⭐ Libre (best tool for the job)   |
| **Coût infrastructure**      | ⭐⭐⭐⭐ Faible (un seul serveur)        | ⭐⭐ Élevé (plusieurs serveurs)          |

---

### Quand utiliser chaque approche ?

**Monolithe :**
- ✅ Startup en phase MVP (time-to-market prioritaire)
- ✅ Équipe < 10 développeurs
- ✅ Trafic prévisible et modéré
- ✅ Pas de besoin de scalabilité indépendante

**Bounded Context (Microservices) :**
- ✅ Application mature avec trafic élevé
- ✅ Plusieurs équipes (> 20 développeurs)
- ✅ Besoin de scaler certaines parties indépendamment (ex: Booking en été)
- ✅ Contextes métier très différents (ex: ML recommendations, paiements temps réel)

---

### Migration Progressive (Strangler Fig Pattern)

**Étape 1 :** Commencer par un monolithe bien structuré (bounded contexts logiques)

```
Monolithe avec modules bien séparés
├── /modules
│   ├── /catalog (contexte logique)
│   ├── /booking (contexte logique)
│   ├── /payment (contexte logique)
```

**Étape 2 :** Extraire le premier microservice (ex: Payment, car intégration Stripe)

```
Monolithe                        +    Payment Microservice
├── /modules                           (service externe)
│   ├── /catalog
│   ├── /booking → appelle Payment API
│   ├── /payment (DEPRECATED)
```

**Étape 3 :** Continuer l'extraction module par module selon les besoins

```
API Gateway
    ├─► Catalog Microservice
    ├─► Booking Microservice
    ├─► Payment Microservice
    └─► Notification Microservice
```

---

## Conclusion

Cette leçon a permis de comprendre :

1. **Le Langage Ubiquitaire varie selon le contexte** : Un même terme ("Customer", "Tour", "Price") a des significations et responsabilités différentes dans chaque Bounded Context.

2. **Le Context Mapping clarifie les relations** : Les patterns (Customer-Supplier, Partnership, Conformist) aident à structurer la communication entre contextes.

3. **Le découpage en Bounded Contexts a des trade-offs** : Le monolithe est simple mais couplé. Les microservices offrent scalabilité et résilience au prix de la complexité.

4. **La migration doit être progressive** : Utiliser le Strangler Fig Pattern pour extraire les contextes un par un, sans Big Bang Rewrite.

---

**Prochaine étape :** Leçon 2.2 - Conception de l'API du Tour Catalog Microservice avec RESTful best practices.
