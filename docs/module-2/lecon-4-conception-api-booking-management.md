# Leçon 2.4 - Conception de l'API du Microservice Booking Management

**Module 2** : Conception et Implémentation des Microservices Principaux

---

## Vue d'ensemble

Le microservice Booking Management est responsable de la gestion complète du cycle de vie des réservations dans notre application de tourisme. Contrairement au microservice Tour Catalog qui se concentre sur la présentation et la gestion des informations des visites, le Booking Management gère les transactions de réservation, le suivi des statuts et la coordination avec d'autres microservices comme Payment Gateway et Notification Service.

Dans cette leçon, nous concevrons l'API RESTful pour ce microservice en définissant ses ressources, endpoints, structures de données et flux de travail.

---

## Comprendre le Bounded Context de Booking Management

### Responsabilités du Microservice

Le microservice Booking Management se situe dans son propre Bounded Context et gère :

1. **Création de Réservations** : Enregistrer de nouvelles réservations pour les visites
2. **Gestion du Cycle de Vie** : Suivre les transitions de statut (pending → confirmed → completed → cancelled)
3. **Disponibilité** : Vérifier et réserver les places disponibles pour les visites
4. **Historique** : Maintenir l'historique des réservations pour les clients
5. **Orchestration** : Coordonner avec d'autres microservices (Tour Catalog, Payment, Notification)

### Ce que le Booking Management NE fait PAS

Il est important de comprendre les limites de ce Bounded Context :

- **Ne gère PAS les paiements** : Le traitement des paiements appartient au microservice Payment Gateway
- **Ne gère PAS les détails des visites** : Les informations sur les visites proviennent du Tour Catalog
- **Ne gère PAS l'authentification** : L'authentification des utilisateurs est gérée par le microservice Auth
- **Ne gère PAS les notifications** : L'envoi d'emails ou SMS est géré par le Notification Service

### Exemple de Séparation des Préoccupations

```javascript
// ✅ Correct : Dans le Bounded Context Booking Management
POST /api/v1/booking-management/bookings
// Crée une nouvelle réservation

PATCH /api/v1/booking-management/bookings/{bookingId}/status
// Met à jour le statut d'une réservation

// ❌ Incorrect : En dehors du Bounded Context
POST /api/v1/booking-management/process-payment
// Le traitement des paiements appartient au Payment Gateway

GET /api/v1/booking-management/tours/{tourId}
// Les détails des visites appartiennent au Tour Catalog
```

---

## Modèle de Données de Réservation

### Entité Booking

Une réservation représente l'engagement d'un client à participer à une visite spécifique à une date donnée.

**Attributs principaux :**

| Attribut | Type | Description |
|----------|------|-------------|
| `id` | UUID | Identifiant unique de la réservation |
| `customerId` | UUID | Identifiant du client (référence externe) |
| `tourId` | UUID | Identifiant de la visite (référence au Tour Catalog) |
| `travelDate` | Date | Date de départ de la visite |
| `participants` | Object | Détails des participants (adultes, enfants) |
| `totalPrice` | Decimal | Prix total de la réservation |
| `status` | Enum | Statut actuel (pending, confirmed, completed, cancelled) |
| `paymentStatus` | Enum | Statut du paiement (pending, paid, refunded) |
| `specialRequests` | String | Demandes spéciales du client |
| `createdAt` | DateTime | Date de création de la réservation |
| `updatedAt` | DateTime | Date de dernière modification |
| `confirmedAt` | DateTime | Date de confirmation |
| `cancelledAt` | DateTime | Date d'annulation (si applicable) |

**Structure des Participants :**

```json
{
  "adults": 2,
  "children": 1,
  "infants": 0,
  "details": [
    {
      "name": "Jean Dupont",
      "age": 35,
      "type": "adult"
    },
    {
      "name": "Marie Dupont",
      "age": 32,
      "type": "adult"
    },
    {
      "name": "Pierre Dupont",
      "age": 8,
      "type": "child"
    }
  ]
}
```

### États de Réservation (State Machine)

Le cycle de vie d'une réservation suit une machine à états :

```
pending → confirmed → completed
   ↓
cancelled
```

**États possibles :**

1. **pending** : Réservation créée, en attente de confirmation/paiement
2. **confirmed** : Réservation confirmée, paiement validé
3. **completed** : Visite terminée avec succès
4. **cancelled** : Réservation annulée par le client ou le système

---

## Principes de Conception d'API RESTful

### 1. Ressources Principales

- **Bookings** : Représente les réservations de visites
- **Availability** : Représente la disponibilité des visites pour des dates spécifiques

### 2. Endpoints de Base

```
/api/v1/booking-management/bookings
/api/v1/booking-management/bookings/{bookingId}
/api/v1/booking-management/availability
```

---

## Endpoints de l'API Booking Management

### 1. Gestion des Réservations

#### 1.1 Créer une Nouvelle Réservation

**Endpoint :**

```
POST /api/v1/booking-management/bookings
```

**Description :** Crée une nouvelle réservation pour une visite.

**Corps de Requête :**

```json
{
  "customerId": "u1s2e3r4-i5d6-7h8e-9r0e-1a2b3c4d5e6f",
  "tourId": "550e8400-e29b-41d4-a716-446655440000",
  "travelDate": "2025-06-15T09:00:00Z",
  "participants": {
    "adults": 2,
    "children": 1,
    "infants": 0,
    "details": [
      {
        "name": "Jean Dupont",
        "age": 35,
        "type": "adult"
      },
      {
        "name": "Marie Dupont",
        "age": 32,
        "type": "adult"
      },
      {
        "name": "Pierre Dupont",
        "age": 8,
        "type": "child"
      }
    ]
  },
  "specialRequests": "Régime végétarien pour le déjeuner"
}
```

**Réponse (201 Created) :**

```json
{
  "status": "success",
  "data": {
    "booking": {
      "id": "b1o2o3k4-i5n6-7g8i-9d0e-1a2b3c4d5e6f",
      "customerId": "u1s2e3r4-i5d6-7h8e-9r0e-1a2b3c4d5e6f",
      "tourId": "550e8400-e29b-41d4-a716-446655440000",
      "travelDate": "2025-06-15T09:00:00Z",
      "participants": {
        "adults": 2,
        "children": 1,
        "infants": 0,
        "totalCount": 3
      },
      "totalPrice": 224.97,
      "status": "pending",
      "paymentStatus": "pending",
      "specialRequests": "Régime végétarien pour le déjeuner",
      "createdAt": "2025-12-30T14:30:00Z",
      "updatedAt": "2025-12-30T14:30:00Z",
      "links": {
        "self": "/api/v1/booking-management/bookings/b1o2o3k4-i5n6-7g8i-9d0e-1a2b3c4d5e6f",
        "tour": "/api/v1/tours-catalog/tours/550e8400-e29b-41d4-a716-446655440000",
        "payment": "/api/v1/payment-gateway/payments/create?bookingId=b1o2o3k4-i5n6-7g8i-9d0e-1a2b3c4d5e6f",
        "cancel": "/api/v1/booking-management/bookings/b1o2o3k4-i5n6-7g8i-9d0e-1a2b3c4d5e6f/cancel"
      }
    }
  }
}
```

**Codes de Statut :**

- `201 Created` : Réservation créée avec succès
- `400 Bad Request` : Données de requête invalides
- `404 Not Found` : Visite non trouvée
- `409 Conflict` : Places insuffisantes disponibles

**Flux de Travail :**

1. Valider les données de la requête
2. Vérifier l'existence de la visite dans le Tour Catalog (appel API)
3. Vérifier la disponibilité pour la date demandée
4. Calculer le prix total
5. Créer la réservation avec le statut `pending`
6. Retourner la réponse avec les liens HATEOAS

#### 1.2 Récupérer Toutes les Réservations

**Endpoint :**

```
GET /api/v1/booking-management/bookings
```

**Description :** Récupère toutes les réservations avec filtrage et pagination.

**Paramètres de Requête :**

- `customerId` (optionnel) : Filtrer par ID client
- `tourId` (optionnel) : Filtrer par ID de visite
- `status` (optionnel) : Filtrer par statut (pending, confirmed, completed, cancelled)
- `dateFrom` (optionnel) : Date de départ minimum
- `dateTo` (optionnel) : Date de départ maximum
- `page` (optionnel) : Numéro de page (défaut : 1)
- `limit` (optionnel) : Résultats par page (défaut : 10)

**Exemple de Requête :**

```
GET /api/v1/booking-management/bookings?customerId=u1s2e3r4-i5d6-7h8e-9r0e-1a2b3c4d5e6f&status=confirmed&page=1&limit=10
```

**Réponse (200 OK) :**

```json
{
  "status": "success",
  "data": {
    "bookings": [
      {
        "id": "b1o2o3k4-i5n6-7g8i-9d0e-1a2b3c4d5e6f",
        "customerId": "u1s2e3r4-i5d6-7h8e-9r0e-1a2b3c4d5e6f",
        "tourId": "550e8400-e29b-41d4-a716-446655440000",
        "tourTitle": "Visite de la Tour Eiffel et Croisière sur la Seine",
        "travelDate": "2025-06-15T09:00:00Z",
        "participants": {
          "adults": 2,
          "children": 1,
          "totalCount": 3
        },
        "totalPrice": 224.97,
        "status": "confirmed",
        "paymentStatus": "paid",
        "createdAt": "2025-12-30T14:30:00Z",
        "confirmedAt": "2025-12-30T14:35:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalItems": 28,
      "itemsPerPage": 10
    }
  }
}
```

**Codes de Statut :**

- `200 OK` : Succès
- `400 Bad Request` : Paramètres de requête invalides

#### 1.3 Récupérer une Réservation Spécifique

**Endpoint :**

```
GET /api/v1/booking-management/bookings/{bookingId}
```

**Description :** Récupère les détails complets d'une réservation par son ID.

**Réponse (200 OK) :**

```json
{
  "status": "success",
  "data": {
    "booking": {
      "id": "b1o2o3k4-i5n6-7g8i-9d0e-1a2b3c4d5e6f",
      "customerId": "u1s2e3r4-i5d6-7h8e-9r0e-1a2b3c4d5e6f",
      "tourId": "550e8400-e29b-41d4-a716-446655440000",
      "tourDetails": {
        "title": "Visite de la Tour Eiffel et Croisière sur la Seine",
        "duration": 4,
        "meetingPoint": "Place du Trocadéro, 75016 Paris"
      },
      "travelDate": "2025-06-15T09:00:00Z",
      "participants": {
        "adults": 2,
        "children": 1,
        "infants": 0,
        "totalCount": 3,
        "details": [
          {
            "name": "Jean Dupont",
            "age": 35,
            "type": "adult"
          },
          {
            "name": "Marie Dupont",
            "age": 32,
            "type": "adult"
          },
          {
            "name": "Pierre Dupont",
            "age": 8,
            "type": "child"
          }
        ]
      },
      "totalPrice": 224.97,
      "status": "confirmed",
      "paymentStatus": "paid",
      "specialRequests": "Régime végétarien pour le déjeuner",
      "createdAt": "2025-12-30T14:30:00Z",
      "updatedAt": "2025-12-30T14:35:00Z",
      "confirmedAt": "2025-12-30T14:35:00Z",
      "links": {
        "self": "/api/v1/booking-management/bookings/b1o2o3k4-i5n6-7g8i-9d0e-1a2b3c4d5e6f",
        "tour": "/api/v1/tours-catalog/tours/550e8400-e29b-41d4-a716-446655440000",
        "cancel": "/api/v1/booking-management/bookings/b1o2o3k4-i5n6-7g8i-9d0e-1a2b3c4d5e6f/cancel"
      }
    }
  }
}
```

**Codes de Statut :**

- `200 OK` : Succès
- `404 Not Found` : Réservation non trouvée

#### 1.4 Mettre à Jour le Statut d'une Réservation

**Endpoint :**

```
PATCH /api/v1/booking-management/bookings/{bookingId}/status
```

**Description :** Met à jour le statut d'une réservation (utilisé pour les transitions d'état).

**Corps de Requête :**

```json
{
  "status": "confirmed",
  "reason": "Payment received and verified"
}
```

**Réponse (200 OK) :**

```json
{
  "status": "success",
  "data": {
    "booking": {
      "id": "b1o2o3k4-i5n6-7g8i-9d0e-1a2b3c4d5e6f",
      "status": "confirmed",
      "confirmedAt": "2025-12-30T14:35:00Z",
      "updatedAt": "2025-12-30T14:35:00Z"
    }
  }
}
```

**Codes de Statut :**

- `200 OK` : Statut mis à jour avec succès
- `400 Bad Request` : Transition de statut invalide
- `404 Not Found` : Réservation non trouvée

**Transitions de Statut Valides :**

- `pending` → `confirmed`
- `pending` → `cancelled`
- `confirmed` → `completed`
- `confirmed` → `cancelled`

#### 1.5 Annuler une Réservation

**Endpoint :**

```
POST /api/v1/booking-management/bookings/{bookingId}/cancel
```

**Description :** Annule une réservation existante.

**Corps de Requête :**

```json
{
  "reason": "Change of travel plans",
  "requestRefund": true
}
```

**Réponse (200 OK) :**

```json
{
  "status": "success",
  "data": {
    "booking": {
      "id": "b1o2o3k4-i5n6-7g8i-9d0e-1a2b3c4d5e6f",
      "status": "cancelled",
      "cancelledAt": "2025-12-30T16:00:00Z",
      "cancellationReason": "Change of travel plans",
      "refundStatus": "pending"
    }
  },
  "message": "Booking cancelled successfully. Refund will be processed within 5-7 business days."
}
```

**Codes de Statut :**

- `200 OK` : Réservation annulée avec succès
- `404 Not Found` : Réservation non trouvée
- `409 Conflict` : Réservation ne peut pas être annulée (déjà complétée ou annulée)

#### 1.6 Supprimer une Réservation

**Endpoint :**

```
DELETE /api/v1/booking-management/bookings/{bookingId}
```

**Description :** Supprime définitivement une réservation (généralement réservé aux administrateurs).

**Réponse (204 No Content) :**

```json
{
  "status": "success",
  "message": "Booking deleted successfully"
}
```

**Codes de Statut :**

- `204 No Content` : Réservation supprimée avec succès
- `404 Not Found` : Réservation non trouvée
- `403 Forbidden` : Opération non autorisée

### 2. Gestion de la Disponibilité

#### 2.1 Vérifier la Disponibilité

**Endpoint :**

```
GET /api/v1/booking-management/availability
```

**Description :** Vérifie la disponibilité d'une visite pour une date spécifique.

**Paramètres de Requête :**

- `tourId` (requis) : ID de la visite
- `date` (requis) : Date de départ (format ISO 8601)

**Exemple de Requête :**

```
GET /api/v1/booking-management/availability?tourId=550e8400-e29b-41d4-a716-446655440000&date=2025-06-15
```

**Réponse (200 OK) :**

```json
{
  "status": "success",
  "data": {
    "availability": {
      "tourId": "550e8400-e29b-41d4-a716-446655440000",
      "date": "2025-06-15T00:00:00Z",
      "maxCapacity": 20,
      "bookedSeats": 12,
      "availableSeats": 8,
      "isAvailable": true,
      "pricePerAdult": 89.99,
      "pricePerChild": 44.99,
      "pricePerInfant": 0.00
    }
  }
}
```

**Codes de Statut :**

- `200 OK` : Succès
- `400 Bad Request` : Paramètres manquants ou invalides
- `404 Not Found` : Visite non trouvée

---

## Gestion des Erreurs

### Structure de Réponse d'Erreur

```json
{
  "status": "error",
  "error": {
    "code": "ERROR_CODE",
    "message": "Description de l'erreur",
    "details": {
      "additionalInfo": "Informations supplémentaires"
    }
  }
}
```

### Codes d'Erreur Courants

| Code de Statut HTTP | Code d'Erreur | Message |
|---------------------|---------------|---------|
| 400 | INVALID_REQUEST | The request body contains invalid data |
| 400 | INVALID_STATUS_TRANSITION | Cannot transition from current status to requested status |
| 404 | BOOKING_NOT_FOUND | The requested booking does not exist |
| 404 | TOUR_NOT_FOUND | The requested tour does not exist |
| 409 | INSUFFICIENT_CAPACITY | Not enough available seats for the requested date |
| 409 | ALREADY_CANCELLED | The booking has already been cancelled |
| 409 | CANNOT_CANCEL | The booking cannot be cancelled at this stage |
| 500 | INTERNAL_SERVER_ERROR | An unexpected error occurred |

### Exemple de Validation d'Erreur

**Requête avec capacité insuffisante :**

```json
{
  "customerId": "u1s2e3r4-i5d6-7h8e-9r0e-1a2b3c4d5e6f",
  "tourId": "550e8400-e29b-41d4-a716-446655440000",
  "travelDate": "2025-06-15T09:00:00Z",
  "participants": {
    "adults": 15,
    "children": 0
  }
}
```

**Réponse (409 Conflict) :**

```json
{
  "status": "error",
  "error": {
    "code": "INSUFFICIENT_CAPACITY",
    "message": "Not enough available seats for the requested date",
    "details": {
      "requestedSeats": 15,
      "availableSeats": 8,
      "tourId": "550e8400-e29b-41d4-a716-446655440000",
      "date": "2025-06-15T09:00:00Z"
    }
  }
}
```

---

## Communication Inter-Microservices

### 1. Récupération des Détails de Visite (Tour Catalog)

Lorsqu'une réservation est créée, le service Booking Management doit récupérer les détails de la visite depuis le Tour Catalog.

**Appel HTTP :**

```javascript
GET http://tour-catalog-service:3001/api/v1/tours-catalog/tours/{tourId}
```

**Utilisation des Données :**

- Vérifier que la visite existe
- Récupérer le prix et les détails
- Calculer le prix total de la réservation

### 2. Orchestration avec Payment Gateway

Après la création d'une réservation, un lien de paiement est fourni dans la réponse HATEOAS.

**Flux de Paiement :**

1. Client crée une réservation → statut `pending`
2. Client suit le lien de paiement
3. Payment Gateway traite le paiement
4. Payment Gateway appelle Booking Management pour mettre à jour le statut
5. Booking Management passe la réservation à `confirmed`
6. Notification Service envoie une confirmation par email

**Webhook de Paiement :**

```
POST /api/v1/booking-management/webhooks/payment-confirmation
```

**Payload du Webhook :**

```json
{
  "bookingId": "b1o2o3k4-i5n6-7g8i-9d0e-1a2b3c4d5e6f",
  "paymentId": "pay_1A2B3C4D5E6F",
  "status": "paid",
  "amount": 224.97,
  "currency": "EUR",
  "paidAt": "2025-12-30T14:35:00Z"
}
```

---

## Exercices Pratiques

### Exercice 1 : Concevoir un Endpoint pour Modifier une Réservation

**Objectif :** Concevoir un endpoint permettant à un client de modifier les détails d'une réservation existante (date, participants).

**Tâches :**

1. Définir l'URI de l'endpoint
2. Spécifier la méthode HTTP (PATCH ou PUT)
3. Définir la structure du corps de requête
4. Créer un exemple de réponse
5. Documenter les règles de modification (par exemple, pas de modification 48h avant le départ)

### Exercice 2 : Implémenter la Validation des Transitions de Statut

**Objectif :** Définir les règles de validation pour les transitions de statut de réservation.

**Tâches :**

1. Créer un diagramme de machine à états
2. Lister toutes les transitions valides et invalides
3. Définir les réponses d'erreur pour les transitions invalides
4. Exemple : Empêcher la transition `completed` → `pending`

### Exercice 3 : Concevoir un Système de Politique d'Annulation

**Objectif :** Ajouter un système de politiques d'annulation avec remboursements variables.

**Tâches :**

1. Définir les règles d'annulation :
   - Plus de 7 jours avant : remboursement à 100%
   - 3-7 jours avant : remboursement à 50%
   - Moins de 3 jours : pas de remboursement
2. Modifier l'endpoint d'annulation pour inclure le calcul du remboursement
3. Créer un exemple de réponse incluant le montant du remboursement

**Exemple de Réponse :**

```json
{
  "status": "success",
  "data": {
    "booking": {
      "id": "b1o2o3k4-i5n6-7g8i-9d0e-1a2b3c4d5e6f",
      "status": "cancelled",
      "cancelledAt": "2025-12-30T16:00:00Z",
      "refund": {
        "amount": 112.49,
        "percentage": 50,
        "reason": "Cancelled 5 days before departure",
        "status": "pending"
      }
    }
  }
}
```

---

## Applications Réelles

### Exemple 1 : Système de Réservation Airbnb

Le microservice de réservation d'Airbnb gère :

- Création de réservations pour des propriétés
- Vérification de disponibilité en temps réel
- Gestion des demandes d'annulation avec politiques flexibles
- Communication avec le service de paiement pour traiter les transactions
- Notifications automatiques aux hôtes et invités

### Exemple 2 : Système de Réservation Booking.com

Le système de Booking.com utilise :

- Orchestration complexe entre disponibilité, tarification et inventaire
- Gestion des réservations instantanées et avec confirmation
- Système de garantie de meilleur prix
- Intégration avec des milliers d'hôtels via API
- Gestion des modifications et annulations avec règles variables

---

## Ressources Complémentaires

- **RESTful API Design** : [https://restfulapi.net/](https://restfulapi.net/)
- **State Machine Patterns** : [https://refactoring.guru/design-patterns/state](https://refactoring.guru/design-patterns/state)
- **Microservices Communication** : [https://microservices.io/patterns/communication-style/messaging.html](https://microservices.io/patterns/communication-style/messaging.html)
- **HATEOAS Specification** : [https://en.wikipedia.org/wiki/HATEOAS](https://en.wikipedia.org/wiki/HATEOAS)
- **HTTP Status Codes** : [https://developer.mozilla.org/fr/docs/Web/HTTP/Status](https://developer.mozilla.org/fr/docs/Web/HTTP/Status)

---

## Conclusion

Dans cette leçon, nous avons conçu une API RESTful complète pour le microservice Booking Management. Nous avons défini :

- Les responsabilités du Bounded Context Booking Management
- Le modèle de données de réservation avec machine à états
- Les endpoints pour créer, récupérer, mettre à jour et annuler des réservations
- Les mécanismes de vérification de disponibilité
- La gestion des erreurs et les codes de statut appropriés
- La communication inter-microservices avec Tour Catalog et Payment Gateway
- Les liens HATEOAS pour guider les clients API

Dans la prochaine leçon, nous implémenterons ce microservice en utilisant Node.js 24.x et Express 4.21.x, en intégrant la logique métier, la validation et l'orchestration avec d'autres services.
