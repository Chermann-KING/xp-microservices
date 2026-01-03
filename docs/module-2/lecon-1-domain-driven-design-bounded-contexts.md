# Leçon 2.1 - Domain-Driven Design pour les Microservices : Bounded Contexts

**Module 2** : Conception et Implémentation des Microservices Principaux

---

## Objectifs pédagogiques

- Comprendre les principes fondamentaux du Domain-Driven Design (DDD)
- Maîtriser le concept de Bounded Context et son application aux microservices
- Identifier les frontières de domaine dans notre application de réservation touristique
- Appliquer le langage ubiquitaire pour une communication claire entre équipes

## Prérequis

- [Leçon 1.5 : Introduction à l'architecture microservices](../module-1/lecon-5-microservices-intro.md)
- [Leçon 1.6 : Monolithe vs Microservices](../module-1/lecon-6-monolithe-vs-microservices.md)
- Compréhension de base des concepts de modélisation de domaine

## Durée estimée

2 heures

---

## Introduction

Le Domain-Driven Design (DDD) offre des principes puissants pour développer des systèmes logiciels complexes en alignant la conception logicielle avec le domaine métier sous-jacent. Un concept central du DDD, particulièrement crucial pour l'architecture microservices, est le **Bounded Context** (Contexte Délimité). Un Bounded Context définit une frontière logique autour d'une partie spécifique du domaine, où un langage ubiquitaire particulier (termes et définitions) est appliqué de manière cohérente, et où existent des modèles du domaine. Cette frontière aide à prévenir la corruption du modèle et les malentendus qui peuvent résulter de différentes interprétations du même terme à travers diverses parties d'un grand système. Dans une architecture microservices, chaque microservice correspond souvent à un seul Bounded Context, garantissant une propriété claire, une cohérence et un développement indépendant.

---

## Comprendre les Bounded Contexts

Un Bounded Context est une frontière conceptuelle au sein d'un domaine qui encapsule une partie spécifique du modèle métier. Il clarifie la portée et la signification des termes et concepts. Des termes qui peuvent sembler identiques peuvent avoir des significations complètement différentes dans différents contextes.

### Exemple : Le concept de "Produit"

Par exemple, un "Produit" dans un système de gestion d'inventaire peut faire référence à :

- L'unité de gestion de stock (SKU) d'un article
- Ses dimensions physiques
- Sa localisation dans l'entrepôt

Alors qu'un "Produit" dans un système de vente peut faire référence à :

- Un article de catalogue avec prix
- Des détails promotionnels
- Des recommandations associées

**Ce sont des concepts distincts**, et les traiter comme le même "Produit" dans tout le système conduit à :

- De la confusion dans le code
- Des modèles complexes et enchevêtrés
- Des bugs subtils difficiles à déboguer

Le principe de Bounded Context vise à **isoler ces significations distinctes**. Chaque Bounded Context a :

- Son propre modèle de domaine explicite
- Sa propre équipe (idéalement)
- Souvent sa propre base de code et couche de persistance

Cette isolation est critique pour les microservices, car elle permet à chaque service de se concentrer sur un domaine problématique spécifique et bien défini sans être alourdi par les complexités d'autres parties du système.

---

## Caractéristiques clés d'un Bounded Context

### 1. Langage Ubiquitaire (Ubiquitous Language)

Chaque Bounded Context définit son propre **langage ubiquitaire** – un vocabulaire partagé entre les experts du domaine et les développeurs au sein de ce contexte. Ce langage aide à éviter l'ambiguïté.

**Exemple** : Dans le contexte "Catalogue de Visites"

```
Langage ubiquitaire :
- Tour (Visite) = Offre commercialisable
- Destination = Lieu géographique
- Itinéraire = Programme jour par jour
- Activité = Événement durant la visite
- Modèle de Prix = Structure tarifaire
- Plage de dates de départ = Périodes disponibles
```

### 2. Frontières Explicites

Les frontières d'un Bounded Context sont explicites. Vous savez ce qui est **dedans** et ce qui est **dehors**. Les interactions à travers ces frontières se font via des interfaces bien définies (comme des APIs).

**Exemple visuel** :

```
┌─────────────────────────────────┐
│  Tour Catalog Context           │
│  ┌───────────────────────────┐  │
│  │ Tours, Destinations,      │  │
│  │ Itinéraires, Prix         │  │
│  └───────────────────────────┘  │
│                                 │
│  API Publique: GET /tours       │
└─────────────────────────────────┘
         ↓ API Call
┌─────────────────────────────────┐
│  Booking Context                │
│  ┌───────────────────────────┐  │
│  │ Réservations, Voyageurs,  │  │
│  │ Disponibilités, Statuts   │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

### 3. Modèle Autonome

Chaque Bounded Context a son propre modèle de domaine **internement cohérent**. Ce modèle est optimisé pour les préoccupations spécifiques de ce contexte et ne tente pas d'être un modèle universel pour toute l'entreprise.

**Exemple** :

```javascript
// Dans Tour Catalog Context
class Tour {
  constructor(id, name, description, basePrice, imageUrls) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.basePrice = basePrice;
    this.imageUrls = imageUrls;
  }
}

// Dans Booking Context (même "Tour" mais modèle différent)
class BookableTourOffering {
  constructor(tourId, departureDate, availableSeats, calculatedPrice) {
    this.tourId = tourId;
    this.departureDate = departureDate;
    this.availableSeats = availableSeats;
    this.calculatedPrice = calculatedPrice; // Prix incluant taxes, remises
  }
}
```

### 4. Propriété par l'Équipe

Idéalement, une **seule équipe** est responsable d'un seul Bounded Context, favorisant :

- Une expertise approfondie du domaine
- Une responsabilité claire
- Une communication efficace

### 5. Évolution Indépendante

Les changements au sein d'un Bounded Context doivent avoir un **impact minimal** sur les autres, permettant :

- Un développement indépendant
- Un déploiement indépendant
- Une mise à l'échelle indépendante

---

## Exemples de Bounded Contexts

Considérons notre application de réservation touristique. Une grande application touristique englobe diverses fonctionnalités complexes.

### 1. Contexte Catalogue de Visites (Tour Catalog Context)

**Responsabilité** : Gérer les visites, leurs descriptions, itinéraires, images, modèles de prix et métadonnées de disponibilité.

**Langage Ubiquitaire** :

- Tour (Visite)
- Destination
- Itinéraire
- Activité
- Modèle de Prix
- Plage de dates de départ

**Focus du Modèle** : Détails sur les visites pour affichage et sélection

**Microservice** : Tour Catalog Service

**Exemple de modèle** :

```javascript
class TourDisplayItem {
  id: string;
  name: string;
  description: string;
  destination: string;
  images: string[];
  basePrice: number;
  duration: string;
  difficulty: "easy" | "moderate" | "hard";
  highlights: string[];
}
```

---

### 2. Contexte Gestion de Réservations (Booking Management Context)

**Responsabilité** : Gérer le processus de réservation réel. Prend une visite sélectionnée, vérifie la disponibilité en temps réel, crée une réservation, gère les détails du client associés à la réservation, et suit le statut de la réservation.

**Langage Ubiquitaire** :

- Booking (Réservation)
- Reservation
- Traveler (Voyageur)
- Payment Status (Statut de Paiement)
- Booking Status (Statut de Réservation)
- Tour Instance (instance spécifique : date et heure)

**Focus du Modèle** : Le cycle de vie d'une réservation

**Microservice** : Booking Management Service

**Exemple de modèle** :

```javascript
class Booking {
  id: string;
  tourId: string;
  userId: string;
  departureDate: Date;
  numberOfTravelers: number;
  travelers: Traveler[];
  totalPrice: number;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  paymentStatus: "pending" | "paid" | "refunded" | "failed";
  specialRequests: string;

  confirm() {
    /* logique de confirmation */
  }
  cancel() {
    /* logique d'annulation */
  }
  addTraveler(traveler) {
    /* logique d'ajout */
  }
}
```

---

### 3. Contexte Traitement des Paiements (Payment Processing Context)

**Responsabilité** : Gérer les transactions financières, s'intégrer avec les passerelles de paiement, gérer les autorisations de paiement, captures et remboursements.

**Langage Ubiquitaire** :

- Payment (Paiement)
- Transaction
- Credit Card (Carte de Crédit)
- Invoice (Facture)
- Refund (Remboursement)

**Focus du Modèle** : Aspects financiers d'une réservation

**Microservice** : Payment Service

**Exemple de modèle** :

```javascript
class Payment {
  id: string;
  bookingId: string;
  amount: number;
  currency: string;
  paymentMethod: "credit_card" | "paypal" | "bank_transfer";
  status: "pending" | "authorized" | "captured" | "failed" | "refunded";
  transactionId: string; // ID de la passerelle externe
  gatewayProvider: "stripe" | "paypal";

  authorize() {
    /* intégration passerelle */
  }
  capture() {
    /* capture le paiement */
  }
  refund(amount) {
    /* remboursement */
  }
}
```

---

### 4. Contexte Authentification et Autorisation Utilisateur (User Authentication Context)

**Responsabilité** : Gérer les comptes utilisateurs, connexion, inscription et permissions.

**Langage Ubiquitaire** :

- User (Utilisateur)
- Account (Compte)
- Role (Rôle)
- Permission
- Session
- Credential (Identifiant)

**Focus du Modèle** : Identité utilisateur et contrôle d'accès

**Microservice** : User Service

**Exemple de modèle** :

```javascript
class User {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  role: "customer" | "admin" | "tour_operator";
  permissions: Permission[];

  authenticate(password) {
    /* vérification */
  }
  hasPermission(permission) {
    /* check autorisation */
  }
}
```

---

## Contre-exemple : Le "Produit" Monolithique

Imaginons un système **sans** Bounded Contexts où une seule entité "Product" tente de représenter tout concernant une visite. Cette entité Product unique aurait des champs pour :

```javascript
// ❌ MAUVAISE PRATIQUE : Modèle monolithique surchargé
class MonolithicProduct {
  // Pour l'inventaire
  sku: string;
  warehouseLocation: string;

  // Pour le catalogue
  name: string;
  description: string;
  images: string[];

  // Pour les ventes
  basePrice: number;
  discountRate: number;

  // Pour la finance
  taxCategory: string;
  accountingCode: string;

  // Pour l'approvisionnement
  supplierId: string;

  // Pour la logistique
  estimatedDeliveryTime: number;

  // ... et encore plus de champs
}
```

### Problèmes de cette approche

1. **Entité surchargée** : Difficile à maintenir et sujette aux changements cassants
2. **Couplage fort** : Un changement dans la gestion d'inventaire peut affecter les calculs de prix
3. **Interprétations divergentes** : Chaque équipe interprète les champs différemment
4. **Bugs subtils** : Communication rompue entre équipes

### Solution avec Bounded Contexts

Avec les Bounded Contexts, le "Product" (ou "Tour") serait modélisé différemment dans chaque contexte :

```javascript
// ✅ BONNE PRATIQUE : Modèles spécifiques par contexte

// Contexte Catalogue
class TourDisplayItem {
  id: string;
  name: string;
  description: string;
  images: string[];
  basePrice: number;
}

// Contexte Réservation
class BookableTourOffering {
  tourId: string;
  specificDepartureDate: Date;
  availableSeats: number;
  calculatedPrice: number;
}

// Contexte Inventaire
class TourInventoryUnit {
  tourTemplateId: string;
  departureDate: Date;
  allocatedSeats: number;
  bookedSeats: number;
}
```

**Avantages** :

- ✅ Chaque modèle est **simple** et **focalisé**
- ✅ Code plus clair et plus facile à maintenir
- ✅ Équipes peuvent travailler indépendamment

---

## Application Pratique dans les Microservices

Dans une architecture microservices, chaque Bounded Context se traduit généralement en un ou plusieurs microservices. Cela signifie :

### 1. Développement Indépendant

Les équipes peuvent travailler sur leur microservice (et son Bounded Context correspondant) sans marcher sur les pieds des autres.

```
Équipe Tour Catalog    → Travaille sur Tour Catalog Service
Équipe Booking         → Travaille sur Booking Service
Équipe Payment         → Travaille sur Payment Service
```

### 2. Hétérogénéité Technologique

Différents microservices peuvent utiliser différentes technologies (bases de données, langages de programmation) les mieux adaptées à leur problème de domaine spécifique.

**Exemple** :

```
Tour Catalog Service    → Node.js + MongoDB (données flexibles, lecture intensive)
Booking Service         → Node.js + PostgreSQL (transactions ACID, cohérence)
Payment Service         → Java + PostgreSQL (sécurité entreprise, compliance)
Recommendation Service  → Python + Neo4j (ML, graph database)
```

### 3. Scalabilité

Les services peuvent être mis à l'échelle indépendamment selon leurs patterns de charge spécifiques.

**Exemple** :

```
Tour Catalog Service     → 10 instances (nombreuses lectures)
Booking Service          → 3 instances (écritures transactionnelles modérées)
Payment Service          → 2 instances (faible volume, haute sécurité)
Notification Service     → 5 instances (pics lors de confirmations)
```

### 4. Propriété Claire

Chaque microservice a un propriétaire clair, améliorant la responsabilité et l'expertise du domaine.

---

## Identifier les Bounded Contexts pour l'Application Touristique

Affinons l'identification des Bounded Contexts pour notre application touristique.

### Zones du Domaine Principal

1. **Informations sur les Visites** : Quelles visites sont disponibles ? Quels sont leurs détails ?
   → **Tour Catalog Context**

2. **Processus de Réservation** : Comment les utilisateurs réservent-ils une visite ?
   → **Booking Management Context**

3. **Gestion des Utilisateurs** : Qui sont les utilisateurs ? Comment se connectent-ils ?
   → **User Authentication/Profile Context**

4. **Paiements** : Comment les paiements sont-ils traités ?
   → **Payment Processing Context**

5. **Notifications** : Comment les utilisateurs sont-ils informés des réservations, paiements, etc. ?
   → **Notification Context**

6. **Avis/Notations** : Comment les utilisateurs fournissent-ils des retours ?
   → **Review Management Context**

### Différences de Langage Ubiquitaire

Cherchez des termes qui signifient des choses différentes dans différentes parties du métier :

| Terme        | Tour Catalog Context          | Booking Context                          |
| ------------ | ----------------------------- | ---------------------------------------- |
| **Tour**     | Article de catalogue statique | Instance réservable dynamique            |
| **Customer** | Compte de connexion           | Historique de réservations + préférences |
| **Price**    | Prix de base du catalogue     | Prix calculé avec taxes + remises        |

### Capacités Autonomes

Quelles parties du système pourraient fonctionner largement indépendamment ?

- ✅ Le catalogue de visites peut être mis à jour sans affecter les réservations en cours
- ✅ Le traitement des paiements est une opération financière distincte
- ✅ Les notifications peuvent être envoyées de manière asynchrone

### Ensemble Initial de Microservices

Basé sur cette analyse, notre ensemble initial de microservices s'alignera directement avec ces Bounded Contexts :

```
1. Tour Catalog Service
   - Gère les détails des visites, images, itinéraires, prix
   - Fournit une API publique pour rechercher et voir les visites

2. Booking Service
   - Gère le cycle de vie des réservations (création, modification, annulation)
   - Vérifications de disponibilité en temps réel
   - Détails des voyageurs pour des réservations spécifiques

3. User Service
   - Gère l'inscription, connexion, gestion de profil
   - Tokens d'authentification

4. Payment Service
   - S'intègre avec les passerelles de paiement tierces
   - Traite les transactions
   - Gère les remboursements

5. Notification Service
   - Envoie emails, SMS ou notifications in-app
   - Liés aux réservations, paiements ou activité de compte

6. Review Service
   - Gère les avis et notations de visites
```

Cette approche garantit que chaque service a :

- ✅ Une responsabilité claire
- ✅ Un modèle de domaine focalisé
- ✅ La capacité d'évoluer indépendamment

---

## Context Mapping (Cartographie des Contextes)

Une fois les Bounded Contexts identifiés, l'étape suivante est de comprendre comment ils interagissent. C'est là qu'intervient le **Context Mapping**. Le Context Mapping décrit les relations entre différents Bounded Contexts. Ces relations définissent comment les services vont s'intégrer et partager des données.

### Patterns Communs de Context Mapping

#### 1. Customer/Supplier (Client/Fournisseur)

Un contexte (le Fournisseur) fournit des données ou services à un autre contexte (le Client). Le Client dépend du Fournisseur.

**Exemple** :

```
Tour Catalog Context (Supplier)
          ↓
  API: GET /tours/{id}
          ↓
Booking Management Context (Customer)
```

Le contexte Booking Management (Client) a besoin des détails de visite du contexte Tour Catalog (Fournisseur). Le service Booking Management appellerait l'API du service Tour Catalog.

```javascript
// Dans Booking Service (Customer)
async function createBooking(tourId, userId, date, travelers) {
  // Appel au Tour Catalog Service (Supplier)
  const tourDetails = await tourCatalogAPI.getTour(tourId);

  if (!tourDetails.available) {
    throw new Error("Tour not available");
  }

  // Créer la réservation avec les détails récupérés
  const booking = new Booking({
    tourId,
    tourName: tourDetails.name,
    basePrice: tourDetails.price,
    // ...
  });

  return booking.save();
}
```

#### 2. Shared Kernel (Noyau Partagé)

Deux contextes ou plus partagent une petite partie commune de leur modèle de domaine ou code. Cela nécessite une forte collaboration et un accord entre les équipes.

**Exemple** :

```javascript
// shared/types/Currency.js
class Currency {
  constructor(code, symbol) {
    this.code = code; // 'EUR', 'USD', 'GBP'
    this.symbol = symbol; // '€', '$', '£'
  }
}

// Utilisé dans Booking Service ET Payment Service
```

Une définition commune de `Currency` ou `Country` pourrait être partagée entre Booking Management et Payment Processing.

#### 3. Conformist

Le contexte en aval (Conformist) adopte complètement le modèle et le langage du contexte en amont. Souvent utilisé lors de l'intégration avec un système legacy dominant ou un service tiers.

**Exemple** :

```javascript
// Payment Service se conforme au format Stripe
class StripePaymentAdapter {
  async processPayment(booking) {
    // Convertit notre modèle interne vers le format Stripe
    const stripePayment = {
      amount: booking.totalPrice * 100, // Stripe utilise centimes
      currency: booking.currency.toLowerCase(),
      source: booking.paymentMethod.token,
      description: `Booking ${booking.id}`,
      metadata: {
        bookingId: booking.id,
      },
    };

    return stripe.charges.create(stripePayment);
  }
}
```

Le contexte Payment Processing se conforme aux structures de données requises par une passerelle de paiement tierce comme Stripe.

#### 4. Anticorruption Layer (ACL - Couche Anticorruption)

Lors de l'intégration avec un système legacy ou un système avec un modèle fondamentalement différent, une ACL agit comme une couche de traduction. Elle traduit le modèle du système en amont dans le langage ubiquitaire du système en aval et vice versa, protégeant le modèle du système en aval des influences externes.

**Exemple** :

```javascript
// Anticorruption Layer pour un vieux système d'inventaire
class LegacyInventoryAdapter {
  constructor(legacyInventoryAPI) {
    this.legacyAPI = legacyInventoryAPI;
  }

  // Traduit notre modèle vers le format legacy
  async checkAvailability(tourId, departureDate, seats) {
    // Notre modèle interne
    const tourOffering = {
      tourId,
      departureDate,
      requestedSeats: seats,
    };

    // Traduction vers format legacy (différent)
    const legacyRequest = {
      product_code: `TOUR_${tourId}`,
      departure_timestamp: departureDate.getTime(),
      quantity: seats,
      check_type: "AVAILABILITY",
    };

    const legacyResponse = await this.legacyAPI.checkStock(legacyRequest);

    // Traduction de la réponse legacy vers notre modèle
    return {
      available: legacyResponse.stock_status === "IN_STOCK",
      availableSeats: legacyResponse.quantity_available,
    };
  }
}
```

Le contexte Booking Management utilise une ACL pour traduire des IDs de tour simplifiés de son modèle interne vers les objets TourTemplate plus riches attendus par un ancien système d'inventaire interne.

#### 5. Separate Ways (Chemins Séparés)

Lorsque deux contextes ont peu ou pas de relation, ils suivent simplement leurs "chemins séparés". Aucune intégration directe n'est nécessaire.

**Exemple** :

- Le contexte Review Management stocke des avis
- Le contexte Payment Processing n'a aucun besoin direct de données d'avis
- **→ Pas d'intégration entre ces deux services**

### Context Map de notre Application Touristique

Pour notre application touristique, la plupart des interactions seront probablement des relations **Customer/Supplier**, où un microservice appelle l'API d'un autre.

**Diagramme de Context Map** :

```
┌─────────────────────┐
│  User Service       │ (Supplier)
└──────────┬──────────┘
           │ provides user data
           ↓
┌─────────────────────┐      ┌──────────────────────┐
│  Booking Service    │ ←────│ Tour Catalog Service │
│     (Customer)      │      │     (Supplier)       │
└──────────┬──────────┘      └──────────────────────┘
           │ triggers payment
           ↓
┌─────────────────────┐
│  Payment Service    │
│     (Customer)      │
└──────────┬──────────┘
           │ triggers notification
           ↓
┌─────────────────────┐
│ Notification Service│
│     (Customer)      │
└─────────────────────┘
```

---

## Exercices et Activités Pratiques

### Exercice 1 : Identifier le Langage Ubiquitaire

Pour chacun des termes suivants, décrivez comment sa signification et ses données associées pourraient différer à travers les contextes Tour Catalog, Booking Management et User Profile dans notre application touristique.

**Termes à analyser** :

- Customer (Client)
- Tour (Visite)
- Price (Prix)

**Indice d'auto-correction** : Considérez quels attributs et comportements spécifiques sont pertinents pour ce terme au sein de chaque fonction métier distincte.

---

### Exercice 2 : Context Mapping pour une Nouvelle Fonctionnalité

Notre application touristique veut ajouter une fonctionnalité de **"Recommandations Personnalisées de Visites"**.

**Questions** :

a) Identifiez un nouveau Bounded Context pour cette fonctionnalité. Quelle serait sa responsabilité principale ?

b) Quel serait le langage ubiquitaire au sein de ce nouveau contexte ?

c) Décrivez les relations de Context Mapping entre le nouveau contexte "Recommendation" et les contextes existants Tour Catalog, Booking Management et User Profile. Pour chaque relation, spécifiez s'il s'agit de Customer/Supplier, Shared Kernel, Conformist ou Anticorruption Layer, et expliquez brièvement pourquoi.

**Indice d'auto-correction** : Réfléchissez aux données dont le moteur de recommandation a besoin et quels services existants les fourniraient. Comment le service de recommandation fournirait-il de la valeur en retour ?

---

### Exercice 3 : Monolithe vs. Bounded Context pour une Agence de Voyage

Imaginez un système logiciel monolithique traditionnel utilisé par une agence de voyage. Il a une seule base de données massive et une base de code unique.

**Questions** :

a) Listez **trois problèmes ou limitations spécifiques** qui pourraient surgir en traitant "Traveler" (Voyageur) comme un concept unique et universel à travers toutes les parties de ce système monolithique (par exemple, réservation, marketing, support client, comptabilité).

b) Expliquez comment définir des Bounded Contexts distincts pour :

- **Booking Traveler** (Voyageur Réservation)
- **Marketing Prospect** (Prospect Marketing)
- **Customer Support Contact** (Contact Support Client)

pourrait atténuer ces problèmes.

**Indice d'auto-correction** : Concentrez-vous sur les problèmes d'intégrité des données, de complexité de développement et de communication d'équipe.

---

## Application Réelle

### Plateforme E-commerce : Microservices

Considérons une grande plateforme e-commerce comme **Amazon**. Le concept de "Product" est incroyablement complexe. Une seule entité Product serait insoutenable. Au lieu de cela, Amazon utilise probablement de nombreux Bounded Contexts :

#### Contextes Amazon

**1. Product Catalog Context**

- Gère les informations produit statiques (description, images, catégories, spécifications)
- Un "Product" ici est principalement pour l'affichage

**2. Inventory Context**

- Gère les niveaux de stock, emplacements d'entrepôt, disponibilité à travers diverses régions
- Un "Product" ici est un article qui peut être compté et localisé

**3. Order Fulfillment Context**

- Gère le picking, packing et shipping des articles
- Un "Product" ici est un article à déplacer physiquement

**4. Pricing Context**

- Détermine le prix final d'un produit, incluant remises, promotions et taxes
- Un "Product" ici est un article avec une valeur calculable

**5. Recommendation Context**

- Analyse le comportement utilisateur et les attributs produit pour suggérer d'autres produits
- Un "Product" ici est un article qui peut être recommandé

**6. Review Context**

- Gère les avis et notations clients pour les produits
- Un "Product" ici est un article qui peut être évalué

#### Avantages

Chacun de ces contextes a sa propre définition et modèle spécifiques d'un "Product", optimisé pour sa préoccupation métier particulière. Ils interagissent via des APIs bien définies (Context Mapping), garantissant que les changements dans la gestion de l'inventaire ne cassent pas directement la génération de recommandations de produits.

Cela permet à Amazon de :

- ✅ Scaler massivement
- ✅ Itérer rapidement sur différentes parties de sa plateforme

---

### Modernisation du Système de Santé

Un grand fournisseur de soins de santé pourrait entreprendre la modernisation de son système monolithique de Dossier Médical Électronique (DME). Les Bounded Contexts clés pourraient inclure :

#### Contextes Healthcare

**1. Patient Demographics Context**

- Gère les données d'identification de base du patient (nom, date de naissance, adresse, ID unique)
- Le "Patient" ici est principalement un identifiant

**2. Clinical Records Context**

- Gère l'historique médical, diagnostics, traitements et résultats de laboratoire
- Le "Patient" ici est quelqu'un avec un parcours médical

**3. Billing Context**

- Gère les réclamations d'assurance, factures et traitement des paiements pour les services médicaux
- Le "Patient" ici est un payeur ou bénéficiaire

**4. Appointment Scheduling Context**

- Gère les horaires des médecins, créneaux disponibles et rendez-vous patients
- Le "Patient" ici est un participant à un rendez-vous

**5. Prescription Management Context**

- Gère la prescription, le suivi et la distribution de médicaments
- Le "Patient" ici est un destinataire de médication

#### Avantages de la Séparation

Séparer ces préoccupations en Bounded Contexts, chacun potentiellement supporté par un microservice, adresse plusieurs défis :

**Cohérence des Données** : Empêche différentes parties du DME monolithique d'avoir des données patient conflictuelles ou ambiguës

**Conformité Réglementaire** : Permet à des services spécifiques d'être optimisés pour différentes exigences réglementaires (ex: facturation vs données cliniques)

**Évolution du Système** : Facilite le développement et déploiement indépendants de nouvelles fonctionnalités sans impacter les parties critiques et stables du système

Par exemple, mettre à jour l'UI pour la planification de rendez-vous ne nécessite pas de redéployer l'ensemble du système de facturation.

---

## Conclusion

Le Domain-Driven Design, et spécifiquement le concept de **Bounded Contexts**, fournit une approche structurée pour décomposer des domaines complexes en parties gérables et cohésives.

**Points clés** :

✅ Ce principe est fondamental pour concevoir des microservices robustes, scalables et maintenables

✅ Chaque service encapsule une capacité métier spécifique avec son langage ubiquitaire et modèle de domaine associés

✅ En comprenant et appliquant les Bounded Contexts, vous créez des frontières claires qui favorisent :

- Le développement indépendant
- La prévention de la contamination du modèle
- La base d'une implémentation efficace de microservices

---

## Navigation

- **🏠 Retour** : [Sommaire du Module 2](README.md)
- **➡️ Suivant** : [Leçon 2.2 - Conception de l'API Tour Catalog](lecon-2-conception-api-tour-catalog.md)

---

## Ressources complémentaires

- [Domain-Driven Design - Eric Evans](https://www.domainlanguage.com/ddd/)
- [Implementing Domain-Driven Design - Vaughn Vernon](https://vaughnvernon.com/)
- [Microservices Patterns - Chris Richardson](https://microservices.io/patterns/index.html)
- [Microsoft: DDD et Microservices](https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/)

---

**Leçon complétée** ✅
