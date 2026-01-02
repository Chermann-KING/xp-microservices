# Solutions des Exercices - Leçon 2.4 : Conception de l'API Booking Management

## Exercice 1 : Concevoir un Endpoint pour Modifier une Réservation

**Objectif :** Concevoir un endpoint permettant à un client de modifier les détails d'une réservation existante (date, participants).

### Solution Complète

#### 1. URI de l'Endpoint

```
PATCH /api/v1/booking-management/bookings/{bookingId}
```

**Justification du choix de PATCH (vs PUT) :**
- `PATCH` permet une mise à jour **partielle** (modifier uniquement la date OU les participants)
- `PUT` nécessiterait d'envoyer l'objet réservation complet
- Pour modifier une réservation, le client ne veut souvent modifier qu'un ou deux champs

**Alternative avec PUT :**
```
PUT /api/v1/booking-management/bookings/{bookingId}
```
Nécessiterait d'envoyer tous les champs de la réservation, même ceux non modifiés.

---

#### 2. Méthode HTTP

**Méthode : PATCH**

**Caractéristiques :**
- Opération idempotente (appliquer la même modification plusieurs fois produit le même résultat)
- Permet de modifier un sous-ensemble de champs
- Code de statut attendu : `200 OK` (avec corps de réponse) ou `204 No Content`

---

#### 3. Structure du Corps de Requête

**Champs modifiables :**

```json
{
  "date": "2026-08-15",
  "participants": [
    {
      "name": "Tony Stark",
      "age": 45,
      "type": "adult"
    },
    {
      "name": "Peter Parker",
      "age": 16,
      "type": "child"
    }
  ],
  "specialRequests": "Vegetarian meal preferences"
}
```

**Validation des champs :**

| Champ             | Type     | Contraintes                                          | Obligatoire |
| ----------------- | -------- | ---------------------------------------------------- | ----------- |
| `date`            | String   | Format ISO 8601 (YYYY-MM-DD), dans le futur         | ❌ Non      |
| `participants`    | Array    | Longueur > 0, chaque objet valide                    | ❌ Non      |
| `specialRequests` | String   | Longueur max 500 caractères                          | ❌ Non      |

**Exemple de requêtes valides :**

```bash
# Modifier uniquement la date
PATCH /api/v1/booking-management/bookings/b1o2o3k4-i5n6-7g8i-9d0e-1a2b3c4d5e6f
Content-Type: application/json

{
  "date": "2026-08-20"
}
```

```bash
# Modifier uniquement les participants
PATCH /api/v1/booking-management/bookings/b1o2o3k4-i5n6-7g8i-9d0e-1a2b3c4d5e6f
Content-Type: application/json

{
  "participants": [
    {
      "name": "Bruce Wayne",
      "age": 40,
      "type": "adult"
    }
  ]
}
```

```bash
# Modifier date et participants
PATCH /api/v1/booking-management/bookings/b1o2o3k4-i5n6-7g8i-9d0e-1a2b3c4d5e6f
Content-Type: application/json

{
  "date": "2026-08-25",
  "participants": [
    {
      "name": "Diana Prince",
      "age": 30,
      "type": "adult"
    },
    {
      "name": "Clark Kent",
      "age": 35,
      "type": "adult"
    }
  ]
}
```

---

#### 4. Exemple de Réponse (Succès)

**Requête :**
```
PATCH /api/v1/booking-management/bookings/b1o2o3k4-i5n6-7g8i-9d0e-1a2b3c4d5e6f
```

**Corps :**
```json
{
  "date": "2026-08-25",
  "participants": [
    {
      "name": "Diana Prince",
      "age": 30,
      "type": "adult"
    }
  ]
}
```

**Réponse (200 OK) :**

```json
{
  "status": "success",
  "data": {
    "booking": {
      "id": "b1o2o3k4-i5n6-7g8i-9d0e-1a2b3c4d5e6f",
      "tourId": "550e8400-e29b-41d4-a716-446655440000",
      "userId": "u9s8e7r6-5i4d-3a2b-1c0d-9e8f7a6b5c4d",
      "status": "confirmed",
      "date": "2026-08-25",
      "participants": [
        {
          "name": "Diana Prince",
          "age": 30,
          "type": "adult"
        }
      ],
      "totalPrice": 89.99,
      "currency": "EUR",
      "specialRequests": null,
      "createdAt": "2026-07-10T14:30:00Z",
      "updatedAt": "2026-07-16T10:15:00Z",
      "modificationHistory": [
        {
          "modifiedAt": "2026-07-16T10:15:00Z",
          "modifiedFields": ["date", "participants"],
          "previousValues": {
            "date": "2026-08-15",
            "participants": [
              { "name": "Tony Stark", "age": 45, "type": "adult" },
              { "name": "Peter Parker", "age": 16, "type": "child" }
            ]
          }
        }
      ]
    }
  }
}
```

**Champs ajoutés :**
- `updatedAt` : Horodatage de la dernière modification
- `modificationHistory` : Historique des modifications (audit trail)

---

#### 5. Règles de Modification

**Règle 1 : Délai de Modification (48h avant le départ)**

Les modifications ne sont plus autorisées si la visite a lieu dans moins de 48 heures.

**Erreur (422 Unprocessable Entity) :**

```json
{
  "status": "error",
  "error": {
    "code": "MODIFICATION_DEADLINE_PASSED",
    "message": "Modifications are not allowed less than 48 hours before departure",
    "details": {
      "bookingId": "b1o2o3k4-i5n6-7g8i-9d0e-1a2b3c4d5e6f",
      "tourDate": "2026-07-17T09:00:00Z",
      "currentTime": "2026-07-16T10:00:00Z",
      "hoursRemaining": 23,
      "minimumHoursRequired": 48,
      "suggestion": "Please contact customer support for emergency modifications"
    }
  }
}
```

---

**Règle 2 : Statut de la Réservation**

Seules les réservations avec statut `pending` ou `confirmed` peuvent être modifiées.

**Statuts autorisés :**
- ✅ `pending` : Réservation en attente (paiement en cours)
- ✅ `confirmed` : Réservation confirmée (paiement effectué)

**Statuts interdits :**
- ❌ `cancelled` : Réservation annulée
- ❌ `completed` : Visite terminée
- ❌ `refunded` : Remboursée

**Erreur (422 Unprocessable Entity) :**

```json
{
  "status": "error",
  "error": {
    "code": "INVALID_BOOKING_STATUS_FOR_MODIFICATION",
    "message": "Cannot modify a booking with status 'cancelled'",
    "details": {
      "bookingId": "b1o2o3k4-i5n6-7g8i-9d0e-1a2b3c4d5e6f",
      "currentStatus": "cancelled",
      "allowedStatuses": ["pending", "confirmed"],
      "cancelledAt": "2026-07-10T12:00:00Z"
    }
  }
}
```

---

**Règle 3 : Disponibilité de la Nouvelle Date**

Si la date est modifiée, vérifier la disponibilité auprès du Tour Catalog Service.

**Erreur (409 Conflict) :**

```json
{
  "status": "error",
  "error": {
    "code": "DATE_NOT_AVAILABLE",
    "message": "The requested date is not available for this tour",
    "details": {
      "bookingId": "b1o2o3k4-i5n6-7g8i-9d0e-1a2b3c4d5e6f",
      "requestedDate": "2026-08-25",
      "tourId": "550e8400-e29b-41d4-a716-446655440000",
      "reason": "Tour is fully booked on this date",
      "alternativeDates": [
        "2026-08-26",
        "2026-08-27",
        "2026-09-01"
      ]
    }
  }
}
```

---

**Règle 4 : Modification du Nombre de Participants**

Si le nombre de participants change, le prix total doit être recalculé et un paiement supplémentaire ou un remboursement partiel peut être nécessaire.

**Exemple : Ajout d'un participant**

```json
{
  "status": "success",
  "data": {
    "booking": {
      "id": "b1o2o3k4-i5n6-7g8i-9d0e-1a2b3c4d5e6f",
      "participants": [
        { "name": "Diana Prince", "age": 30, "type": "adult" },
        { "name": "Clark Kent", "age": 35, "type": "adult" }
      ],
      "totalPrice": 179.98,
      "pricingDetails": {
        "previousPrice": 89.99,
        "newPrice": 179.98,
        "additionalCharge": 89.99,
        "paymentStatus": "pending_additional_payment"
      },
      "paymentLink": "https://payment.example.com/pay/additional/abc123"
    }
  }
}
```

**Exemple : Retrait d'un participant**

```json
{
  "status": "success",
  "data": {
    "booking": {
      "id": "b1o2o3k4-i5n6-7g8i-9d0e-1a2b3c4d5e6f",
      "participants": [
        { "name": "Diana Prince", "age": 30, "type": "adult" }
      ],
      "totalPrice": 89.99,
      "pricingDetails": {
        "previousPrice": 179.98,
        "newPrice": 89.99,
        "refundAmount": 89.99,
        "refundStatus": "pending"
      }
    }
  }
}
```

---

**Règle 5 : Frais de Modification (Optionnel)**

Certaines agences appliquent des frais de modification.

```json
{
  "status": "success",
  "data": {
    "booking": {
      "id": "b1o2o3k4-i5n6-7g8i-9d0e-1a2b3c4d5e6f",
      "date": "2026-08-25",
      "totalPrice": 89.99,
      "modificationFee": 15.00,
      "newTotalPrice": 104.99,
      "pricingDetails": {
        "basePrice": 89.99,
        "modificationFee": 15.00,
        "totalDue": 15.00,
        "paymentLink": "https://payment.example.com/pay/modification/xyz789"
      }
    }
  }
}
```

---

## Exercice 2 : Implémenter la Validation des Transitions de Statut

**Objectif :** Définir les règles de validation pour les transitions de statut de réservation.

### Solution Complète

#### 1. Diagramme de Machine à États

```
                        ┌──────────┐
                        │  PENDING │ (État Initial)
                        └────┬─────┘
                             │
                             │ Paiement Réussi
                             ▼
                        ┌──────────┐
                   ┌───►│CONFIRMED │
                   │    └────┬─────┘
                   │         │
                   │         │ Visite Terminée
                   │         ▼
                   │    ┌──────────┐
                   │    │COMPLETED │ (État Final)
                   │    └──────────┘
                   │
                   │         ┌──────────┐
Annulation Client  │    ┌───►│CANCELLED │ (État Final)
                   │    │    └────┬─────┘
                   └────┤         │
                        │         │ Remboursement Effectué
                        │         ▼
                        │    ┌──────────┐
                        │    │ REFUNDED │ (État Final)
                        │    └──────────┘
                        │
                   ┌────┴─────┐
                   │  PENDING │
                   └────┬─────┘
                        │
                        │ Paiement Échoué / Timeout
                        ▼
                   ┌──────────┐
                   │ EXPIRED  │ (État Final)
                   └──────────┘
```

---

#### 2. Liste des Transitions Valides

**Transition 1 : PENDING → CONFIRMED**

- **Déclencheur :** Paiement réussi
- **Conditions :**
  - Le paiement a été validé par le Payment Gateway
  - La visite est toujours disponible
- **Actions automatiques :**
  - Envoyer email de confirmation au client
  - Réduire la disponibilité dans le Tour Catalog
  - Créer une notification

```json
{
  "transition": {
    "from": "pending",
    "to": "confirmed",
    "triggeredBy": "payment_successful",
    "timestamp": "2026-07-10T14:35:00Z"
  }
}
```

---

**Transition 2 : PENDING → EXPIRED**

- **Déclencheur :** Timeout de paiement (15 minutes sans paiement)
- **Conditions :**
  - Aucun paiement reçu dans le délai imparti
- **Actions automatiques :**
  - Libérer les places réservées temporairement
  - Envoyer email d'expiration

```json
{
  "transition": {
    "from": "pending",
    "to": "expired",
    "triggeredBy": "payment_timeout",
    "timestamp": "2026-07-10T14:45:00Z",
    "reason": "Payment not received within 15 minutes"
  }
}
```

---

**Transition 3 : PENDING → CANCELLED**

- **Déclencheur :** Annulation par le client avant le paiement
- **Conditions :**
  - Le client demande l'annulation
- **Actions automatiques :**
  - Libérer les places
  - Envoyer email d'annulation

```json
{
  "transition": {
    "from": "pending",
    "to": "cancelled",
    "triggeredBy": "customer_cancellation",
    "timestamp": "2026-07-10T14:40:00Z"
  }
}
```

---

**Transition 4 : CONFIRMED → CANCELLED**

- **Déclencheur :** Annulation par le client après le paiement
- **Conditions :**
  - Politique d'annulation respectée (voir Exercice 3)
  - La visite n'a pas encore eu lieu
- **Actions automatiques :**
  - Calculer le remboursement selon la politique
  - Libérer les places
  - Envoyer email d'annulation

```json
{
  "transition": {
    "from": "confirmed",
    "to": "cancelled",
    "triggeredBy": "customer_cancellation",
    "timestamp": "2026-07-20T10:00:00Z",
    "refundPolicy": {
      "percentage": 50,
      "reason": "Cancelled 5 days before departure"
    }
  }
}
```

---

**Transition 5 : CANCELLED → REFUNDED**

- **Déclencheur :** Remboursement effectué
- **Conditions :**
  - Le remboursement a été traité par le Payment Gateway
- **Actions automatiques :**
  - Envoyer email de confirmation de remboursement

```json
{
  "transition": {
    "from": "cancelled",
    "to": "refunded",
    "triggeredBy": "refund_completed",
    "timestamp": "2026-07-22T16:00:00Z",
    "refundAmount": 112.49
  }
}
```

---

**Transition 6 : CONFIRMED → COMPLETED**

- **Déclencheur :** Date de la visite passée
- **Conditions :**
  - La date de la visite est dans le passé
  - Le client a participé à la visite
- **Actions automatiques :**
  - Envoyer email de demande d'avis
  - Archiver la réservation

```json
{
  "transition": {
    "from": "confirmed",
    "to": "completed",
    "triggeredBy": "tour_date_passed",
    "timestamp": "2026-08-15T20:00:00Z"
  }
}
```

---

#### 3. Liste des Transitions Invalides

**Transition Invalide 1 : COMPLETED → PENDING**

```json
{
  "status": "error",
  "error": {
    "code": "INVALID_STATUS_TRANSITION",
    "message": "Cannot transition from 'completed' to 'pending'",
    "details": {
      "bookingId": "b1o2o3k4-i5n6-7g8i-9d0e-1a2b3c4d5e6f",
      "currentStatus": "completed",
      "requestedStatus": "pending",
      "reason": "A completed booking cannot be reverted to pending",
      "allowedTransitionsFrom": {
        "completed": []
      }
    }
  }
}
```

---

**Transition Invalide 2 : CONFIRMED → PENDING**

```json
{
  "status": "error",
  "error": {
    "code": "INVALID_STATUS_TRANSITION",
    "message": "Cannot transition from 'confirmed' to 'pending'",
    "details": {
      "currentStatus": "confirmed",
      "requestedStatus": "pending",
      "reason": "A confirmed booking cannot go back to pending. To cancel, use status 'cancelled'",
      "allowedTransitionsFrom": {
        "confirmed": ["cancelled", "completed"]
      }
    }
  }
}
```

---

**Transition Invalide 3 : CANCELLED → CONFIRMED**

```json
{
  "status": "error",
  "error": {
    "code": "INVALID_STATUS_TRANSITION",
    "message": "Cannot transition from 'cancelled' to 'confirmed'",
    "details": {
      "currentStatus": "cancelled",
      "requestedStatus": "confirmed",
      "reason": "A cancelled booking cannot be reactivated. Please create a new booking",
      "allowedTransitionsFrom": {
        "cancelled": ["refunded"]
      }
    }
  }
}
```

---

**Transition Invalide 4 : EXPIRED → CONFIRMED**

```json
{
  "status": "error",
  "error": {
    "code": "INVALID_STATUS_TRANSITION",
    "message": "Cannot transition from 'expired' to 'confirmed'",
    "details": {
      "currentStatus": "expired",
      "requestedStatus": "confirmed",
      "reason": "An expired booking cannot be confirmed. Please create a new booking",
      "allowedTransitionsFrom": {
        "expired": []
      }
    }
  }
}
```

---

#### 4. Matrice de Validation des Transitions

| **De / À**  | PENDING | CONFIRMED | CANCELLED | COMPLETED | REFUNDED | EXPIRED |
| ----------- | ------- | --------- | --------- | --------- | -------- | ------- |
| **PENDING** | -       | ✅        | ✅        | ❌        | ❌       | ✅      |
| **CONFIRMED** | ❌      | -         | ✅        | ✅        | ❌       | ❌      |
| **CANCELLED** | ❌      | ❌        | -         | ❌        | ✅       | ❌      |
| **COMPLETED** | ❌      | ❌        | ❌        | -         | ❌       | ❌      |
| **REFUNDED** | ❌      | ❌        | ❌        | ❌        | -        | ❌      |
| **EXPIRED** | ❌      | ❌        | ❌        | ❌        | ❌       | -       |

**Légende :**
- ✅ Transition autorisée
- ❌ Transition interdite
- `-` Même statut (pas de transition)

---

#### 5. Implémentation Côté Serveur

```javascript
// src/utils/statusTransitions.js

const BOOKING_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  REFUNDED: 'refunded',
  EXPIRED: 'expired'
};

// Définition des transitions autorisées
const ALLOWED_TRANSITIONS = {
  [BOOKING_STATUS.PENDING]: [
    BOOKING_STATUS.CONFIRMED,
    BOOKING_STATUS.CANCELLED,
    BOOKING_STATUS.EXPIRED
  ],
  [BOOKING_STATUS.CONFIRMED]: [
    BOOKING_STATUS.CANCELLED,
    BOOKING_STATUS.COMPLETED
  ],
  [BOOKING_STATUS.CANCELLED]: [
    BOOKING_STATUS.REFUNDED
  ],
  [BOOKING_STATUS.COMPLETED]: [],
  [BOOKING_STATUS.REFUNDED]: [],
  [BOOKING_STATUS.EXPIRED]: []
};

/**
 * Valide si une transition de statut est autorisée
 */
export function isTransitionAllowed(currentStatus, newStatus) {
  if (!ALLOWED_TRANSITIONS[currentStatus]) {
    return false;
  }
  return ALLOWED_TRANSITIONS[currentStatus].includes(newStatus);
}

/**
 * Obtient les transitions autorisées depuis un statut donné
 */
export function getAllowedTransitions(currentStatus) {
  return ALLOWED_TRANSITIONS[currentStatus] || [];
}

/**
 * Génère une erreur de transition invalide
 */
export function createInvalidTransitionError(bookingId, currentStatus, requestedStatus) {
  return {
    status: 'error',
    error: {
      code: 'INVALID_STATUS_TRANSITION',
      message: `Cannot transition from '${currentStatus}' to '${requestedStatus}'`,
      details: {
        bookingId,
        currentStatus,
        requestedStatus,
        reason: getTransitionErrorReason(currentStatus, requestedStatus),
        allowedTransitionsFrom: {
          [currentStatus]: ALLOWED_TRANSITIONS[currentStatus]
        }
      }
    }
  };
}

function getTransitionErrorReason(currentStatus, requestedStatus) {
  if (currentStatus === BOOKING_STATUS.COMPLETED) {
    return 'A completed booking cannot be modified';
  }
  if (currentStatus === BOOKING_STATUS.CANCELLED && requestedStatus === BOOKING_STATUS.CONFIRMED) {
    return 'A cancelled booking cannot be reactivated. Please create a new booking';
  }
  if (currentStatus === BOOKING_STATUS.CONFIRMED && requestedStatus === BOOKING_STATUS.PENDING) {
    return 'A confirmed booking cannot go back to pending. To cancel, use status "cancelled"';
  }
  return `Transition from ${currentStatus} to ${requestedStatus} is not allowed`;
}
```

---

## Exercice 3 : Concevoir un Système de Politique d'Annulation

**Objectif :** Ajouter un système de politiques d'annulation avec remboursements variables.

### Solution Complète

#### 1. Définition des Règles d'Annulation

**Politique Standard :**

| Délai avant la visite | Remboursement | Frais d'annulation |
| --------------------- | ------------- | ------------------ |
| Plus de 7 jours       | 100%          | 0%                 |
| 3-7 jours             | 50%           | 50%                |
| 1-3 jours             | 25%           | 75%                |
| Moins de 24 heures    | 0%            | 100%               |
| Après le départ       | 0%            | 100%               |

---

#### 2. Endpoint d'Annulation Modifié

**URI :**
```
POST /api/v1/booking-management/bookings/{bookingId}/cancel
```

**Corps de requête (optionnel) :**

```json
{
  "reason": "Change of plans",
  "requestRefund": true
}
```

---

#### 3. Exemple de Réponse avec Calcul du Remboursement

**Scénario 1 : Annulation 10 jours avant (remboursement à 100%)**

**Requête :**
```
POST /api/v1/booking-management/bookings/b1o2o3k4-i5n6-7g8i-9d0e-1a2b3c4d5e6f/cancel
```

**Réponse (200 OK) :**

```json
{
  "status": "success",
  "data": {
    "booking": {
      "id": "b1o2o3k4-i5n6-7g8i-9d0e-1a2b3c4d5e6f",
      "status": "cancelled",
      "tourDate": "2026-08-15T09:00:00Z",
      "cancelledAt": "2026-08-05T14:30:00Z",
      "cancellationReason": "Change of plans",
      "refund": {
        "eligible": true,
        "originalAmount": 224.98,
        "refundAmount": 224.98,
        "refundPercentage": 100,
        "cancellationFee": 0.00,
        "reason": "Cancelled 10 days before departure (more than 7 days)",
        "status": "pending",
        "estimatedRefundDate": "2026-08-10T00:00:00Z",
        "refundMethod": "original_payment_method"
      }
    }
  }
}
```

---

**Scénario 2 : Annulation 5 jours avant (remboursement à 50%)**

**Réponse (200 OK) :**

```json
{
  "status": "success",
  "data": {
    "booking": {
      "id": "b1o2o3k4-i5n6-7g8i-9d0e-1a2b3c4d5e6f",
      "status": "cancelled",
      "tourDate": "2026-08-15T09:00:00Z",
      "cancelledAt": "2026-08-10T14:30:00Z",
      "refund": {
        "eligible": true,
        "originalAmount": 224.98,
        "refundAmount": 112.49,
        "refundPercentage": 50,
        "cancellationFee": 112.49,
        "reason": "Cancelled 5 days before departure (between 3-7 days)",
        "status": "pending",
        "estimatedRefundDate": "2026-08-15T00:00:00Z",
        "refundMethod": "original_payment_method"
      }
    }
  }
}
```

---

**Scénario 3 : Annulation 12 heures avant (pas de remboursement)**

**Réponse (200 OK) :**

```json
{
  "status": "success",
  "data": {
    "booking": {
      "id": "b1o2o3k4-i5n6-7g8i-9d0e-1a2b3c4d5e6f",
      "status": "cancelled",
      "tourDate": "2026-08-15T09:00:00Z",
      "cancelledAt": "2026-08-14T21:00:00Z",
      "refund": {
        "eligible": false,
        "originalAmount": 224.98,
        "refundAmount": 0.00,
        "refundPercentage": 0,
        "cancellationFee": 224.98,
        "reason": "Cancelled less than 24 hours before departure (no refund policy)",
        "status": "not_applicable"
      }
    }
  }
}
```

---

#### 4. Implémentation du Calcul de Remboursement

```javascript
// src/utils/cancellationPolicy.js
import { differenceInDays, differenceInHours } from 'date-fns';

/**
 * Calcule le remboursement selon la politique d'annulation
 */
export function calculateRefund(booking, cancellationDate) {
  const tourDate = new Date(booking.date);
  const cancelDate = new Date(cancellationDate);
  const originalAmount = booking.totalPrice;

  // Nombre de jours avant la visite
  const daysUntilTour = differenceInDays(tourDate, cancelDate);
  const hoursUntilTour = differenceInHours(tourDate, cancelDate);

  let refundPercentage = 0;
  let reason = '';

  if (daysUntilTour > 7) {
    refundPercentage = 100;
    reason = `Cancelled ${daysUntilTour} days before departure (more than 7 days)`;
  } else if (daysUntilTour >= 3 && daysUntilTour <= 7) {
    refundPercentage = 50;
    reason = `Cancelled ${daysUntilTour} days before departure (between 3-7 days)`;
  } else if (daysUntilTour >= 1 && daysUntilTour < 3) {
    refundPercentage = 25;
    reason = `Cancelled ${daysUntilTour} days before departure (between 1-3 days)`;
  } else if (hoursUntilTour >= 1) {
    refundPercentage = 0;
    reason = `Cancelled less than 24 hours before departure (no refund policy)`;
  } else {
    refundPercentage = 0;
    reason = 'Cancelled after tour departure time (no refund)';
  }

  const refundAmount = (originalAmount * refundPercentage) / 100;
  const cancellationFee = originalAmount - refundAmount;

  return {
    eligible: refundPercentage > 0,
    originalAmount,
    refundAmount: parseFloat(refundAmount.toFixed(2)),
    refundPercentage,
    cancellationFee: parseFloat(cancellationFee.toFixed(2)),
    reason,
    status: refundPercentage > 0 ? 'pending' : 'not_applicable',
    estimatedRefundDate: getEstimatedRefundDate(),
    refundMethod: 'original_payment_method'
  };
}

function getEstimatedRefundDate() {
  const date = new Date();
  date.setDate(date.getDate() + 5); // 5 jours ouvrables
  return date.toISOString();
}
```

---

## Conclusion

Ces exercices ont permis de maîtriser :

1. **Conception d'endpoints de modification** avec règles métier complexes (délais, disponibilité, recalcul de prix)
2. **Validation des transitions de statut** avec machine à états et matrice de transitions
3. **Système de politique d'annulation** avec calcul de remboursement dynamique selon le délai

**Prochaine étape :** Leçon 2.5 - Implémentation du Booking Management Service avec orchestration inter-services et logique métier.
