# Solutions des Exercices - Leçon 2.5 : Implémentation du Booking Management Service

## Exercice 1 : Implémenter la Politique d'Annulation avec Remboursement

**Objectif :** Ajouter une logique de calcul de remboursement basée sur la date d'annulation.

### Solution Complète

#### 1. Création du Service de Remboursement

```javascript
// src/services/refundService.js

/**
 * Service de gestion des remboursements selon la politique d'annulation
 */

/**
 * Calcule le montant du remboursement basé sur la date d'annulation
 * @param {Object} booking - L'objet réservation
 * @param {string} cancellationDate - Date d'annulation (ISO 8601)
 * @returns {Object} - Détails du remboursement
 */
export function calculateRefundAmount(booking, cancellationDate = new Date().toISOString()) {
  const tourDate = new Date(booking.date);
  const cancelDate = new Date(cancellationDate);
  const totalAmount = booking.totalPrice;

  // Validation : on ne peut pas annuler après la date de la visite
  if (cancelDate > tourDate) {
    return {
      eligible: false,
      originalAmount: totalAmount,
      refundAmount: 0,
      refundPercentage: 0,
      cancellationFee: totalAmount,
      reason: 'Cannot cancel after tour date has passed',
      policy: 'no_refund_after_tour',
      status: 'not_applicable'
    };
  }

  // Calcul du nombre de jours avant la visite
  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  const daysUntilTour = Math.ceil((tourDate - cancelDate) / millisecondsPerDay);

  let refundPercentage = 0;
  let policy = '';
  let reason = '';

  // Application de la politique d'annulation
  if (daysUntilTour > 7) {
    refundPercentage = 100;
    policy = 'full_refund';
    reason = `Cancelled ${daysUntilTour} days before departure (more than 7 days - full refund)`;
  } else if (daysUntilTour >= 3 && daysUntilTour <= 7) {
    refundPercentage = 50;
    policy = 'partial_refund';
    reason = `Cancelled ${daysUntilTour} days before departure (between 3-7 days - 50% refund)`;
  } else if (daysUntilTour >= 0 && daysUntilTour < 3) {
    refundPercentage = 0;
    policy = 'no_refund';
    reason = `Cancelled ${daysUntilTour} days before departure (less than 3 days - no refund)`;
  }

  const refundAmount = (totalAmount * refundPercentage) / 100;
  const cancellationFee = totalAmount - refundAmount;

  return {
    eligible: refundPercentage > 0,
    originalAmount: parseFloat(totalAmount.toFixed(2)),
    refundAmount: parseFloat(refundAmount.toFixed(2)),
    refundPercentage,
    cancellationFee: parseFloat(cancellationFee.toFixed(2)),
    reason,
    policy,
    status: refundPercentage > 0 ? 'pending' : 'not_applicable',
    estimatedRefundDate: refundPercentage > 0 ? getEstimatedRefundDate() : null,
    refundMethod: 'original_payment_method',
    daysUntilTour
  };
}

/**
 * Calcule la date estimée du remboursement (5 jours ouvrables)
 */
function getEstimatedRefundDate() {
  const date = new Date();
  date.setDate(date.getDate() + 5);
  return date.toISOString();
}

/**
 * Valide si une annulation est autorisée
 */
export function canCancelBooking(booking) {
  const now = new Date();
  const tourDate = new Date(booking.date);

  // Ne peut pas annuler si la visite a déjà eu lieu
  if (now > tourDate) {
    return {
      allowed: false,
      reason: 'Cannot cancel a tour that has already taken place'
    };
  }

  // Ne peut annuler que si le statut est 'pending' ou 'confirmed'
  const allowedStatuses = ['pending', 'confirmed'];
  if (!allowedStatuses.includes(booking.status)) {
    return {
      allowed: false,
      reason: `Cannot cancel a booking with status '${booking.status}'. Only 'pending' or 'confirmed' bookings can be cancelled.`
    };
  }

  return {
    allowed: true
  };
}
```

---

#### 2. Modification du Contrôleur d'Annulation

```javascript
// src/controllers/bookingController.js
import * as bookingModel from '../models/bookingModel.js';
import * as refundService from '../services/refundService.js';
import { isTransitionAllowed } from '../utils/statusTransitions.js';

/**
 * Annuler une réservation
 */
export const cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { reason, cancellationDate } = req.body;

    // 1. Récupérer la réservation
    const booking = bookingModel.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        error: {
          code: 'BOOKING_NOT_FOUND',
          message: 'The requested booking does not exist',
          details: { bookingId }
        }
      });
    }

    // 2. Vérifier si l'annulation est autorisée
    const canCancel = refundService.canCancelBooking(booking);
    if (!canCancel.allowed) {
      return res.status(422).json({
        status: 'error',
        error: {
          code: 'CANCELLATION_NOT_ALLOWED',
          message: canCancel.reason,
          details: {
            bookingId,
            currentStatus: booking.status,
            tourDate: booking.date
          }
        }
      });
    }

    // 3. Valider la transition de statut
    if (!isTransitionAllowed(booking.status, 'cancelled')) {
      return res.status(422).json({
        status: 'error',
        error: {
          code: 'INVALID_STATUS_TRANSITION',
          message: `Cannot cancel a booking with status '${booking.status}'`,
          details: {
            currentStatus: booking.status,
            requestedStatus: 'cancelled'
          }
        }
      });
    }

    // 4. Calculer le remboursement
    const refundDetails = refundService.calculateRefundAmount(
      booking,
      cancellationDate || new Date().toISOString()
    );

    // 5. Mettre à jour la réservation
    const cancelledAt = cancellationDate || new Date().toISOString();
    const updatedBooking = bookingModel.update(bookingId, {
      status: 'cancelled',
      cancelledAt,
      cancellationReason: reason || 'No reason provided',
      refund: refundDetails
    });

    // 6. TODO: Libérer les places dans le Tour Catalog (appel API)
    // await tourCatalogClient.releaseSeats(booking.tourId, booking.participants.length);

    // 7. TODO: Déclencher le processus de remboursement si applicable
    // if (refundDetails.eligible) {
    //   await paymentClient.processRefund(booking.paymentId, refundDetails.refundAmount);
    // }

    // 8. TODO: Envoyer une notification
    // await notificationService.sendCancellationEmail(booking.userId, updatedBooking);

    return res.status(200).json({
      status: 'success',
      data: {
        booking: updatedBooking,
        message: refundDetails.eligible
          ? `Your booking has been cancelled. You will receive a ${refundDetails.refundPercentage}% refund (${refundDetails.refundAmount} ${booking.currency}).`
          : 'Your booking has been cancelled. No refund is applicable based on our cancellation policy.'
      }
    });

  } catch (error) {
    console.error('Error in cancelBooking:', error);
    return res.status(500).json({
      status: 'error',
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred while cancelling the booking'
      }
    });
  }
};
```

---

#### 3. Tests avec cURL

**Test 1 : Annulation 10 jours avant (100% de remboursement)**

```bash
curl -X POST http://localhost:3002/api/v1/booking-management/bookings/b1o2o3k4-i5n6-7g8i-9d0e-1a2b3c4d5e6f/cancel \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Change of plans",
    "cancellationDate": "2026-08-05T14:30:00Z"
  }'
```

**Réponse attendue (200 OK) :**

```json
{
  "status": "success",
  "data": {
    "booking": {
      "id": "b1o2o3k4-i5n6-7g8i-9d0e-1a2b3c4d5e6f",
      "status": "cancelled",
      "cancelledAt": "2026-08-05T14:30:00Z",
      "cancellationReason": "Change of plans",
      "refund": {
        "eligible": true,
        "originalAmount": 224.98,
        "refundAmount": 224.98,
        "refundPercentage": 100,
        "cancellationFee": 0,
        "reason": "Cancelled 10 days before departure (more than 7 days - full refund)",
        "policy": "full_refund",
        "status": "pending",
        "estimatedRefundDate": "2026-08-10T14:30:00Z",
        "daysUntilTour": 10
      }
    },
    "message": "Your booking has been cancelled. You will receive a 100% refund (224.98 EUR)."
  }
}
```

---

**Test 2 : Annulation 5 jours avant (50% de remboursement)**

```bash
curl -X POST http://localhost:3002/api/v1/booking-management/bookings/b1o2o3k4-i5n6-7g8i-9d0e-1a2b3c4d5e6f/cancel \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Emergency",
    "cancellationDate": "2026-08-10T14:30:00Z"
  }'
```

**Réponse attendue :**

```json
{
  "data": {
    "booking": {
      "refund": {
        "refundAmount": 112.49,
        "refundPercentage": 50,
        "cancellationFee": 112.49,
        "reason": "Cancelled 5 days before departure (between 3-7 days - 50% refund)",
        "policy": "partial_refund"
      }
    },
    "message": "Your booking has been cancelled. You will receive a 50% refund (112.49 EUR)."
  }
}
```

---

**Test 3 : Annulation 1 jour avant (pas de remboursement)**

```bash
curl -X POST http://localhost:3002/api/v1/booking-management/bookings/b1o2o3k4-i5n6-7g8i-9d0e-1a2b3c4d5e6f/cancel \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Unable to attend",
    "cancellationDate": "2026-08-14T14:30:00Z"
  }'
```

**Réponse attendue :**

```json
{
  "data": {
    "booking": {
      "refund": {
        "eligible": false,
        "refundAmount": 0,
        "refundPercentage": 0,
        "cancellationFee": 224.98,
        "reason": "Cancelled 1 days before departure (less than 3 days - no refund)",
        "policy": "no_refund",
        "status": "not_applicable"
      }
    },
    "message": "Your booking has been cancelled. No refund is applicable based on our cancellation policy."
  }
}
```

---

**Test 4 : Tentative d'annulation d'une réservation déjà annulée (erreur)**

```bash
curl -X POST http://localhost:3002/api/v1/booking-management/bookings/b1o2o3k4-i5n6-7g8i-9d0e-1a2b3c4d5e6f/cancel \
  -H "Content-Type: application/json" \
  -d '{"reason": "Test"}'
```

**Réponse attendue (422 Unprocessable Entity) :**

```json
{
  "status": "error",
  "error": {
    "code": "INVALID_STATUS_TRANSITION",
    "message": "Cannot cancel a booking with status 'cancelled'",
    "details": {
      "currentStatus": "cancelled",
      "requestedStatus": "cancelled"
    }
  }
}
```

---

## Exercice 2 : Implémenter un Endpoint de Modification de Réservation

**Objectif :** Permettre aux clients de modifier la date ou le nombre de participants.

### Solution Complète

#### 1. Création du Contrôleur de Modification

```javascript
// src/controllers/bookingController.js

/**
 * Modifier une réservation existante
 */
export const updateBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { date, participants, specialRequests } = req.body;

    // 1. Récupérer la réservation existante
    const booking = bookingModel.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        status: 'error',
        error: {
          code: 'BOOKING_NOT_FOUND',
          message: 'The requested booking does not exist',
          details: { bookingId }
        }
      });
    }

    // 2. Vérifier le statut de la réservation
    const allowedStatuses = ['pending', 'confirmed'];
    if (!allowedStatuses.includes(booking.status)) {
      return res.status(422).json({
        status: 'error',
        error: {
          code: 'MODIFICATION_NOT_ALLOWED',
          message: `Cannot modify a booking with status '${booking.status}'`,
          details: {
            bookingId,
            currentStatus: booking.status,
            allowedStatuses
          }
        }
      });
    }

    // 3. Vérifier le délai de modification (48h avant)
    const tourDate = new Date(booking.date);
    const now = new Date();
    const hoursUntilTour = (tourDate - now) / (1000 * 60 * 60);

    if (hoursUntilTour < 48) {
      return res.status(422).json({
        status: 'error',
        error: {
          code: 'MODIFICATION_DEADLINE_PASSED',
          message: 'Modifications are not allowed less than 48 hours before departure',
          details: {
            tourDate: booking.date,
            hoursRemaining: Math.floor(hoursUntilTour),
            minimumRequired: 48
          }
        }
      });
    }

    // 4. Si la date change, vérifier la disponibilité
    if (date && date !== booking.date) {
      // TODO: Appeler le Tour Catalog pour vérifier la disponibilité
      // const isAvailable = await tourCatalogClient.checkAvailability(
      //   booking.tourId,
      //   date,
      //   participants?.length || booking.participants.length
      // );

      // Simulation de vérification
      const isAvailable = true; // Remplacer par l'appel API réel

      if (!isAvailable) {
        return res.status(409).json({
          status: 'error',
          error: {
            code: 'DATE_NOT_AVAILABLE',
            message: 'The requested date is not available for this tour',
            details: {
              tourId: booking.tourId,
              requestedDate: date
            }
          }
        });
      }

      // TODO: Libérer l'ancienne date et bloquer la nouvelle
      // await tourCatalogClient.releaseSeats(booking.tourId, booking.date);
      // await tourCatalogClient.reserveSeats(booking.tourId, date);
    }

    // 5. Si le nombre de participants change, recalculer le prix
    let newTotalPrice = booking.totalPrice;
    let pricingDetails = null;

    if (participants && participants.length !== booking.participants.length) {
      // TODO: Appeler le Tour Catalog pour obtenir le prix
      // const tourDetails = await tourCatalogClient.getTour(booking.tourId);
      // const pricePerPerson = tourDetails.price;

      // Simulation (prix fixe de 89.99 par adulte)
      const pricePerPerson = 89.99;
      newTotalPrice = pricePerPerson * participants.length;

      pricingDetails = {
        previousPrice: booking.totalPrice,
        newPrice: newTotalPrice,
        pricePerPerson,
        participantsChange: participants.length - booking.participants.length,
        additionalCharge: newTotalPrice > booking.totalPrice ? newTotalPrice - booking.totalPrice : 0,
        refundAmount: newTotalPrice < booking.totalPrice ? booking.totalPrice - newTotalPrice : 0
      };
    }

    // 6. Préparer les données de mise à jour
    const updateData = {
      updatedAt: new Date().toISOString()
    };

    if (date) {
      updateData.date = date;
    }

    if (participants) {
      updateData.participants = participants;
    }

    if (specialRequests !== undefined) {
      updateData.specialRequests = specialRequests;
    }

    if (newTotalPrice !== booking.totalPrice) {
      updateData.totalPrice = newTotalPrice;
    }

    // 7. Ajouter l'historique de modification
    const modificationRecord = {
      modifiedAt: new Date().toISOString(),
      modifiedFields: Object.keys(updateData).filter(key => key !== 'updatedAt'),
      previousValues: {
        date: booking.date,
        participants: booking.participants,
        totalPrice: booking.totalPrice
      }
    };

    if (!booking.modificationHistory) {
      booking.modificationHistory = [];
    }
    updateData.modificationHistory = [...booking.modificationHistory, modificationRecord];

    // 8. Mettre à jour la réservation
    const updatedBooking = bookingModel.update(bookingId, updateData);

    // 9. Construire la réponse
    const response = {
      status: 'success',
      data: {
        booking: updatedBooking
      }
    };

    if (pricingDetails) {
      response.data.pricingDetails = pricingDetails;

      if (pricingDetails.additionalCharge > 0) {
        response.data.message = `Your booking has been updated. An additional payment of ${pricingDetails.additionalCharge} ${booking.currency} is required.`;
        response.data.paymentLink = `https://payment.example.com/pay/additional/${bookingId}`;
      } else if (pricingDetails.refundAmount > 0) {
        response.data.message = `Your booking has been updated. A refund of ${pricingDetails.refundAmount} ${booking.currency} will be processed.`;
      }
    } else {
      response.data.message = 'Your booking has been successfully updated.';
    }

    return res.status(200).json(response);

  } catch (error) {
    console.error('Error in updateBooking:', error);
    return res.status(500).json({
      status: 'error',
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred while updating the booking'
      }
    });
  }
};
```

---

#### 2. Ajout de la Route

```javascript
// src/routes/bookingRoutes.js
import express from 'express';
import * as bookingController from '../controllers/bookingController.js';

const router = express.Router();

router.get('/', bookingController.getAllBookings);
router.get('/:bookingId', bookingController.getBookingById);
router.post('/', bookingController.createBooking);

// Nouvelle route de modification
router.patch('/:bookingId', bookingController.updateBooking);

router.post('/:bookingId/cancel', bookingController.cancelBooking);
router.delete('/:bookingId', bookingController.deleteBooking);

export default router;
```

---

#### 3. Tests avec cURL

**Test 1 : Modifier uniquement la date**

```bash
curl -X PATCH http://localhost:3002/api/v1/booking-management/bookings/b1o2o3k4-i5n6-7g8i-9d0e-1a2b3c4d5e6f \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-08-20"
  }'
```

**Réponse attendue (200 OK) :**

```json
{
  "status": "success",
  "data": {
    "booking": {
      "id": "b1o2o3k4-i5n6-7g8i-9d0e-1a2b3c4d5e6f",
      "date": "2026-08-20",
      "updatedAt": "2026-07-16T10:15:00Z",
      "modificationHistory": [
        {
          "modifiedAt": "2026-07-16T10:15:00Z",
          "modifiedFields": ["date"],
          "previousValues": {
            "date": "2026-08-15"
          }
        }
      ]
    },
    "message": "Your booking has been successfully updated."
  }
}
```

---

**Test 2 : Modifier les participants (ajout d'une personne)**

```bash
curl -X PATCH http://localhost:3002/api/v1/booking-management/bookings/b1o2o3k4-i5n6-7g8i-9d0e-1a2b3c4d5e6f \
  -H "Content-Type: application/json" \
  -d '{
    "participants": [
      { "name": "Natasha Romanoff", "age": 30, "type": "adult" },
      { "name": "Clint Barton", "age": 35, "type": "adult" }
    ]
  }'
```

**Réponse attendue (200 OK) :**

```json
{
  "status": "success",
  "data": {
    "booking": {
      "id": "b1o2o3k4-i5n6-7g8i-9d0e-1a2b3c4d5e6f",
      "participants": [
        { "name": "Natasha Romanoff", "age": 30, "type": "adult" },
        { "name": "Clint Barton", "age": 35, "type": "adult" }
      ],
      "totalPrice": 179.98
    },
    "pricingDetails": {
      "previousPrice": 89.99,
      "newPrice": 179.98,
      "pricePerPerson": 89.99,
      "participantsChange": 1,
      "additionalCharge": 89.99,
      "refundAmount": 0
    },
    "message": "Your booking has been updated. An additional payment of 89.99 EUR is required.",
    "paymentLink": "https://payment.example.com/pay/additional/b1o2o3k4-i5n6-7g8i-9d0e-1a2b3c4d5e6f"
  }
}
```

---

## Exercice 3 : Ajouter des Webhooks pour la Confirmation de Paiement

**Objectif :** Implémenter un endpoint webhook pour recevoir les confirmations de paiement.

### Solution Complète

#### 1. Création des Routes Webhook

```javascript
// src/routes/webhookRoutes.js
import express from 'express';
import * as webhookController from '../controllers/webhookController.js';

const router = express.Router();

// Webhook pour les confirmations de paiement
router.post('/payment-confirmation', webhookController.handlePaymentConfirmation);

export default router;
```

---

#### 2. Création du Contrôleur Webhook

```javascript
// src/controllers/webhookController.js
import * as bookingModel from '../models/bookingModel.js';
import { isTransitionAllowed } from '../utils/statusTransitions.js';

/**
 * Gérer les webhooks de confirmation de paiement
 */
export const handlePaymentConfirmation = async (req, res) => {
  try {
    const {
      bookingId,
      paymentId,
      status,
      amount,
      currency,
      signature
    } = req.body;

    console.log('[WEBHOOK] Payment confirmation received:', {
      bookingId,
      paymentId,
      status,
      amount,
      timestamp: new Date().toISOString()
    });

    // 1. Validation de la signature (simulée)
    const isValidSignature = validateWebhookSignature(req.body, signature);
    if (!isValidSignature) {
      console.error('[WEBHOOK] Invalid signature');
      return res.status(401).json({
        status: 'error',
        error: {
          code: 'INVALID_SIGNATURE',
          message: 'Webhook signature validation failed'
        }
      });
    }

    // 2. Récupérer la réservation
    const booking = bookingModel.findById(bookingId);

    if (!booking) {
      console.error('[WEBHOOK] Booking not found:', bookingId);
      return res.status(404).json({
        status: 'error',
        error: {
          code: 'BOOKING_NOT_FOUND',
          message: 'The requested booking does not exist'
        }
      });
    }

    // 3. Vérifier que le montant correspond
    if (amount !== booking.totalPrice) {
      console.error('[WEBHOOK] Amount mismatch:', {
        expected: booking.totalPrice,
        received: amount
      });
      return res.status(400).json({
        status: 'error',
        error: {
          code: 'AMOUNT_MISMATCH',
          message: 'Payment amount does not match booking total',
          details: {
            expectedAmount: booking.totalPrice,
            receivedAmount: amount
          }
        }
      });
    }

    // 4. Traiter selon le statut du paiement
    if (status === 'succeeded' || status === 'paid') {
      // Vérifier la transition de statut
      if (!isTransitionAllowed(booking.status, 'confirmed')) {
        console.error('[WEBHOOK] Invalid status transition:', {
          from: booking.status,
          to: 'confirmed'
        });
        return res.status(422).json({
          status: 'error',
          error: {
            code: 'INVALID_STATUS_TRANSITION',
            message: `Cannot confirm a booking with status '${booking.status}'`
          }
        });
      }

      // Mettre à jour la réservation
      const updatedBooking = bookingModel.update(bookingId, {
        status: 'confirmed',
        paymentStatus: 'paid',
        paymentId,
        confirmedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      console.log('[WEBHOOK] Booking confirmed:', bookingId);

      // TODO: Déclencher les actions post-paiement
      // - Envoyer email de confirmation
      // - Mettre à jour la disponibilité dans Tour Catalog
      // - Créer une notification

      return res.status(200).json({
        received: true,
        bookingId,
        status: 'confirmed',
        message: 'Payment confirmation processed successfully'
      });

    } else if (status === 'failed') {
      // Paiement échoué
      bookingModel.update(bookingId, {
        status: 'expired',
        paymentStatus: 'failed',
        paymentId,
        updatedAt: new Date().toISOString(),
        failureReason: req.body.failureReason || 'Payment failed'
      });

      console.log('[WEBHOOK] Payment failed for booking:', bookingId);

      // TODO: Libérer les places réservées
      // TODO: Envoyer email d'échec de paiement

      return res.status(200).json({
        received: true,
        bookingId,
        status: 'expired',
        message: 'Payment failure processed'
      });

    } else {
      // Statut inconnu
      console.warn('[WEBHOOK] Unknown payment status:', status);
      return res.status(400).json({
        status: 'error',
        error: {
          code: 'UNKNOWN_PAYMENT_STATUS',
          message: `Unknown payment status: ${status}`
        }
      });
    }

  } catch (error) {
    console.error('[WEBHOOK] Error processing payment confirmation:', error);
    return res.status(500).json({
      status: 'error',
      error: {
        code: 'WEBHOOK_PROCESSING_ERROR',
        message: 'Failed to process payment webhook'
      }
    });
  }
};

/**
 * Valider la signature du webhook (simulé)
 * En production, utiliser une vraie validation avec HMAC-SHA256
 */
function validateWebhookSignature(payload, signature) {
  // Simulation de validation
  // En production, faire quelque chose comme :
  // const expectedSignature = crypto
  //   .createHmac('sha256', process.env.WEBHOOK_SECRET)
  //   .update(JSON.stringify(payload))
  //   .digest('hex');
  // return signature === expectedSignature;

  // Pour les tests, accepter toutes les signatures
  return true;
}
```

---

#### 3. Mise à Jour du Serveur Principal

```javascript
// src/server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bookingRoutes from './routes/bookingRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'booking-management' });
});

const API_BASE_PATH = process.env.API_BASE_PATH || '/api/v1';
app.use(`${API_BASE_PATH}/booking-management/bookings`, bookingRoutes);
app.use(`${API_BASE_PATH}/booking-management/webhooks`, webhookRoutes);

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`Booking Management Service running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

export default app;
```

---

#### 4. Tests avec cURL

**Test 1 : Webhook de paiement réussi**

```bash
curl -X POST http://localhost:3002/api/v1/booking-management/webhooks/payment-confirmation \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": "b1o2o3k4-i5n6-7g8i-9d0e-1a2b3c4d5e6f",
    "paymentId": "pay_abc123xyz789",
    "status": "succeeded",
    "amount": 224.98,
    "currency": "EUR",
    "signature": "simulated_signature_12345"
  }'
```

**Réponse attendue (200 OK) :**

```json
{
  "received": true,
  "bookingId": "b1o2o3k4-i5n6-7g8i-9d0e-1a2b3c4d5e6f",
  "status": "confirmed",
  "message": "Payment confirmation processed successfully"
}
```

---

**Test 2 : Webhook de paiement échoué**

```bash
curl -X POST http://localhost:3002/api/v1/booking-management/webhooks/payment-confirmation \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": "b1o2o3k4-i5n6-7g8i-9d0e-1a2b3c4d5e6f",
    "paymentId": "pay_failed_xyz",
    "status": "failed",
    "amount": 224.98,
    "currency": "EUR",
    "failureReason": "Insufficient funds",
    "signature": "simulated_signature_67890"
  }'
```

**Réponse attendue (200 OK) :**

```json
{
  "received": true,
  "bookingId": "b1o2o3k4-i5n6-7g8i-9d0e-1a2b3c4d5e6f",
  "status": "expired",
  "message": "Payment failure processed"
}
```

---

**Test 3 : Webhook avec signature invalide (erreur)**

```bash
curl -X POST http://localhost:3002/api/v1/booking-management/webhooks/payment-confirmation \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": "b1o2o3k4-i5n6-7g8i-9d0e-1a2b3c4d5e6f",
    "paymentId": "pay_abc",
    "status": "succeeded",
    "amount": 224.98,
    "currency": "EUR"
  }'
```

**Réponse attendue (401 Unauthorized) si la validation de signature est activée :**

```json
{
  "status": "error",
  "error": {
    "code": "INVALID_SIGNATURE",
    "message": "Webhook signature validation failed"
  }
}
```

---

## Conclusion

Ces exercices ont permis de maîtriser :

1. **Implémentation de la politique d'annulation** avec calcul dynamique de remboursement selon le délai
2. **Endpoint de modification de réservation** avec validation de statut, vérification de disponibilité et recalcul de prix
3. **Webhooks de confirmation de paiement** avec validation de signature et mise à jour automatique du statut

**Bonnes pratiques appliquées :**
- ✅ Séparation des responsabilités (Service, Controller, Model)
- ✅ Validation exhaustive des règles métier
- ✅ Logging détaillé pour l'audit
- ✅ Gestion d'erreurs robuste
- ✅ Historique des modifications pour traçabilité

**Prochaine étape :** Leçon 2.6 - Conception de Base de Données et Intégration ORM pour persister les données.
