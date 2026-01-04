# Solutions des Exercices - Leçon 3.4 : Interface Segregation Principle (ISP)

**Module 3** : Principes SOLID, Design Patterns et React Avancé

---

## Exercice 1 : Refactorer l'API Booking Management

### Analyse des Violations de l'ISP

L'API actuelle du microservice BookingManagement du Module 2 présente plusieurs violations potentielles :

**Structure actuelle (problématique) :**

```
POST   /bookings                    → Créer une réservation
GET    /bookings                    → Lister les réservations
GET    /bookings/{id}               → Détails d'une réservation
PUT    /bookings/{id}               → Mise à jour complète
PATCH  /bookings/{id}/status        → Mettre à jour le statut
DELETE /bookings/{id}               → Supprimer
```

**Violations identifiées :**

| Client                      | Besoins réels                         | Exposition inutile             |
| --------------------------- | ------------------------------------- | ------------------------------ |
| **Utilisateur final**       | Créer, voir ses réservations, annuler | PUT, DELETE, statuts admin     |
| **Passerelle de paiement**  | Mettre à jour le statut de paiement   | Création, suppression, listing |
| **Administrateur**          | Tout gérer                            | Aucune violation               |
| **Service de notification** | Lire les détails pour notifier        | Modifications                  |

### Plan de Refactoring : APIs Ségrégées

#### 1. UserBookingAPI - Pour les utilisateurs finaux

```javascript
// user-booking-api/routes.js
const express = require("express");
const router = express.Router();
const userBookingController = require("../controllers/userBookingController");
const { requireAuth } = require("../middleware/authMiddleware");

router.use(requireAuth); // Authentification utilisateur requise

/**
 * POST /api/v1/user/bookings
 * Créer une nouvelle réservation
 * Client: Application mobile, site web utilisateur
 */
router.post("/bookings", userBookingController.createBooking);

/**
 * GET /api/v1/user/bookings
 * Lister mes réservations
 * Paramètres: status, page, limit
 */
router.get("/bookings", userBookingController.getMyBookings);

/**
 * GET /api/v1/user/bookings/:id
 * Détails d'une de mes réservations
 */
router.get("/bookings/:id", userBookingController.getMyBookingDetails);

/**
 * POST /api/v1/user/bookings/:id/cancel
 * Annuler ma réservation (si politique d'annulation le permet)
 */
router.post("/bookings/:id/cancel", userBookingController.cancelMyBooking);

/**
 * PATCH /api/v1/user/bookings/:id/participants
 * Modifier les participants (avant la date de voyage)
 */
router.patch(
  "/bookings/:id/participants",
  userBookingController.updateParticipants
);

module.exports = router;
```

**Contrôleur UserBooking :**

```javascript
// user-booking-api/controllers/userBookingController.js
const Booking = require("../models/Booking");
const {
  validateCancellationPolicy,
} = require("../services/cancellationService");

exports.createBooking = async (req, res) => {
  const { tourId, travelDate, participants, specialRequests } = req.body;
  const userId = req.user.id;

  try {
    const booking = new Booking({
      customer: {
        userId,
        name: req.user.name,
        email: req.user.email,
      },
      tourId,
      travelDate,
      participants,
      specialRequests,
      status: "pending",
      paymentStatus: "pending",
    });

    const savedBooking = await booking.save();

    // Réponse limitée aux informations pertinentes pour l'utilisateur
    res.status(201).json({
      status: "success",
      data: {
        booking: {
          id: savedBooking._id,
          tourId: savedBooking.tourId,
          travelDate: savedBooking.travelDate,
          participants: savedBooking.participants,
          totalPrice: savedBooking.totalPrice,
          status: savedBooking.status,
          paymentUrl: `/payments/${savedBooking._id}`,
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

exports.getMyBookings = async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  const userId = req.user.id;

  try {
    const query = { "customer.userId": userId };
    if (status) query.status = status;

    const bookings = await Booking.find(
      query,
      // Projection : uniquement les champs utiles pour l'utilisateur
      "tourId tourName travelDate status totalPrice participants.totalCount createdAt"
    )
      .sort({ travelDate: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      status: "success",
      data: { bookings },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      error: { message: error.message },
    });
  }
};

exports.getMyBookingDetails = async (req, res) => {
  const userId = req.user.id;

  try {
    const booking = await Booking.findOne(
      { _id: req.params.id, "customer.userId": userId },
      // Exclure les champs internes/admin
      "-internalNotes -lastUpdatedBy -paymentDetails.gatewayResponse"
    );

    if (!booking) {
      return res.status(404).json({
        status: "error",
        error: {
          code: "BOOKING_NOT_FOUND",
          message: "Réservation non trouvée",
        },
      });
    }

    res.json({
      status: "success",
      data: { booking },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      error: { message: error.message },
    });
  }
};

exports.cancelMyBooking = async (req, res) => {
  const userId = req.user.id;

  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      "customer.userId": userId,
    });

    if (!booking) {
      return res.status(404).json({
        status: "error",
        error: {
          code: "BOOKING_NOT_FOUND",
          message: "Réservation non trouvée",
        },
      });
    }

    // Vérifier la politique d'annulation
    const cancellationResult = await validateCancellationPolicy(booking);

    if (!cancellationResult.canCancel) {
      return res.status(400).json({
        status: "error",
        error: {
          code: "CANCELLATION_NOT_ALLOWED",
          message: cancellationResult.reason,
        },
      });
    }

    booking.status = "cancelled";
    booking.cancellation = {
      cancelledAt: new Date(),
      reason: req.body.reason || "Annulé par le client",
      refundAmount: cancellationResult.refundAmount,
    };

    await booking.save();

    res.json({
      status: "success",
      data: {
        message: "Réservation annulée avec succès",
        refundAmount: cancellationResult.refundAmount,
        refundDelay: "5-7 jours ouvrés",
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      error: { message: error.message },
    });
  }
};

exports.updateParticipants = async (req, res) => {
  const userId = req.user.id;
  const { participants } = req.body;

  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      "customer.userId": userId,
      status: { $in: ["pending", "confirmed"] },
    });

    if (!booking) {
      return res.status(404).json({
        status: "error",
        error: {
          code: "BOOKING_NOT_FOUND",
          message: "Réservation non trouvée ou non modifiable",
        },
      });
    }

    // Vérifier que la modification est possible (avant la date de voyage)
    const today = new Date();
    const travelDate = new Date(booking.travelDate);
    const daysUntilTravel = Math.ceil(
      (travelDate - today) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilTravel < 2) {
      return res.status(400).json({
        status: "error",
        error: {
          code: "MODIFICATION_NOT_ALLOWED",
          message:
            "Les modifications ne sont plus possibles moins de 48h avant le voyage",
        },
      });
    }

    booking.participants = participants;
    // Recalculer le prix si nécessaire
    await booking.save();

    res.json({
      status: "success",
      data: {
        participants: booking.participants,
        totalPrice: booking.totalPrice,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      error: { message: error.message },
    });
  }
};
```

#### 2. PaymentCallbackAPI - Pour les passerelles de paiement

```javascript
// payment-callback-api/routes.js
const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const {
  verifyPaymentGatewaySignature,
} = require("../middleware/webhookMiddleware");

/**
 * POST /api/v1/webhooks/payment
 * Webhook pour les notifications de paiement
 * Client: Stripe, PayPal, ou autre passerelle de paiement
 * Sécurité: Vérification de signature du webhook
 */
router.post(
  "/payment",
  verifyPaymentGatewaySignature,
  paymentController.handlePaymentWebhook
);

/**
 * POST /api/v1/webhooks/refund
 * Webhook pour les notifications de remboursement
 */
router.post(
  "/refund",
  verifyPaymentGatewaySignature,
  paymentController.handleRefundWebhook
);

module.exports = router;
```

**Contrôleur Payment :**

```javascript
// payment-callback-api/controllers/paymentController.js
const Booking = require("../models/Booking");
const { publishEvent } = require("../services/eventPublisher");

exports.handlePaymentWebhook = async (req, res) => {
  const {
    bookingId,
    transactionId,
    status,
    amount,
    currency,
    gatewayResponse,
  } = req.body;

  try {
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      // Retourner 200 pour éviter que la passerelle réessaye
      return res.status(200).json({
        status: "ignored",
        message: "Booking not found",
      });
    }

    // Mise à jour uniquement des champs de paiement
    booking.paymentStatus = status;
    booking.paymentDetails = {
      transactionId,
      amount,
      currency,
      paidAt: status === "paid" ? new Date() : null,
      gatewayResponse, // Données internes, jamais exposées à l'utilisateur
    };

    // Si paiement réussi, confirmer la réservation
    if (status === "paid" && booking.status === "pending") {
      booking.status = "confirmed";
    }

    await booking.save();

    // Publier un événement pour déclencher les notifications
    await publishEvent("booking.payment.updated", {
      bookingId: booking._id,
      status: booking.status,
      paymentStatus: status,
    });

    res.status(200).json({
      status: "success",
      message: "Payment status updated",
    });
  } catch (error) {
    // Logger l'erreur mais retourner 200 pour éviter les retry loops
    console.error("Payment webhook error:", error);
    res.status(200).json({
      status: "error",
      message: "Internal processing error",
    });
  }
};

exports.handleRefundWebhook = async (req, res) => {
  const { bookingId, refundId, status, amount } = req.body;

  try {
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(200).json({
        status: "ignored",
        message: "Booking not found",
      });
    }

    // Mise à jour des détails de remboursement
    booking.refund = {
      refundId,
      status,
      amount,
      processedAt: status === "completed" ? new Date() : null,
    };

    if (status === "completed") {
      booking.paymentStatus = "refunded";
    }

    await booking.save();

    await publishEvent("booking.refund.updated", {
      bookingId: booking._id,
      refundStatus: status,
    });

    res.status(200).json({
      status: "success",
      message: "Refund status updated",
    });
  } catch (error) {
    console.error("Refund webhook error:", error);
    res.status(200).json({
      status: "error",
      message: "Internal processing error",
    });
  }
};
```

#### 3. AdminBookingAPI - Pour les administrateurs

```javascript
// admin-booking-api/routes.js
const express = require("express");
const router = express.Router();
const adminBookingController = require("../controllers/adminBookingController");
const { requireAdmin } = require("../middleware/authMiddleware");

router.use(requireAdmin); // Protection de toutes les routes admin

/**
 * GET /api/v1/admin/bookings
 * Lister toutes les réservations avec filtres avancés
 * Client: Dashboard administrateur
 */
router.get("/bookings", adminBookingController.getAllBookings);

/**
 * GET /api/v1/admin/bookings/:id
 * Détails complets d'une réservation (y compris données internes)
 */
router.get("/bookings/:id", adminBookingController.getBookingDetails);

/**
 * PATCH /api/v1/admin/bookings/:id/status
 * Modifier le statut d'une réservation
 */
router.patch(
  "/bookings/:id/status",
  adminBookingController.updateBookingStatus
);

/**
 * PATCH /api/v1/admin/bookings/:id/notes
 * Ajouter/modifier les notes internes
 */
router.patch("/bookings/:id/notes", adminBookingController.updateInternalNotes);

/**
 * POST /api/v1/admin/bookings/:id/refund
 * Initier un remboursement
 */
router.post("/bookings/:id/refund", adminBookingController.initiateRefund);

/**
 * DELETE /api/v1/admin/bookings/:id
 * Supprimer une réservation (soft delete)
 */
router.delete("/bookings/:id", adminBookingController.deleteBooking);

/**
 * GET /api/v1/admin/bookings/stats
 * Statistiques des réservations
 */
router.get("/stats", adminBookingController.getBookingStats);

module.exports = router;
```

**Contrôleur AdminBooking :**

```javascript
// admin-booking-api/controllers/adminBookingController.js
const Booking = require("../models/Booking");
const { initiateRefundWithGateway } = require("../services/paymentGateway");

exports.getAllBookings = async (req, res) => {
  const {
    status,
    paymentStatus,
    tourId,
    customerId,
    startDate,
    endDate,
    page = 1,
    limit = 20,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = req.query;

  try {
    const query = {};

    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (tourId) query.tourId = tourId;
    if (customerId) query["customer.userId"] = customerId;
    if (startDate || endDate) {
      query.travelDate = {};
      if (startDate) query.travelDate.$gte = new Date(startDate);
      if (endDate) query.travelDate.$lte = new Date(endDate);
    }

    const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      Booking.countDocuments(query),
    ]);

    res.json({
      status: "success",
      data: {
        bookings,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      error: { message: error.message },
    });
  }
};

exports.getBookingDetails = async (req, res) => {
  try {
    // Admin voit TOUT, y compris les données internes
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        status: "error",
        error: {
          code: "BOOKING_NOT_FOUND",
          message: "Réservation non trouvée",
        },
      });
    }

    res.json({
      status: "success",
      data: { booking },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      error: { message: error.message },
    });
  }
};

exports.updateBookingStatus = async (req, res) => {
  const { status, reason } = req.body;

  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        status: "error",
        error: {
          code: "BOOKING_NOT_FOUND",
          message: "Réservation non trouvée",
        },
      });
    }

    const previousStatus = booking.status;
    booking.status = status;
    booking.statusHistory = booking.statusHistory || [];
    booking.statusHistory.push({
      from: previousStatus,
      to: status,
      changedBy: req.user.id,
      changedAt: new Date(),
      reason,
    });
    booking.lastUpdatedBy = {
      adminId: req.user.id,
      name: req.user.name,
    };

    await booking.save();

    res.json({
      status: "success",
      data: {
        bookingId: booking._id,
        previousStatus,
        newStatus: status,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      error: { message: error.message },
    });
  }
};

exports.updateInternalNotes = async (req, res) => {
  const { notes } = req.body;

  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      {
        internalNotes: notes,
        lastUpdatedBy: { adminId: req.user.id, name: req.user.name },
      },
      { new: true, select: "internalNotes lastUpdatedBy" }
    );

    if (!booking) {
      return res.status(404).json({
        status: "error",
        error: {
          code: "BOOKING_NOT_FOUND",
          message: "Réservation non trouvée",
        },
      });
    }

    res.json({
      status: "success",
      data: { booking },
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      error: { message: error.message },
    });
  }
};

exports.initiateRefund = async (req, res) => {
  const { amount, reason } = req.body;

  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        status: "error",
        error: {
          code: "BOOKING_NOT_FOUND",
          message: "Réservation non trouvée",
        },
      });
    }

    if (booking.paymentStatus !== "paid") {
      return res.status(400).json({
        status: "error",
        error: {
          code: "INVALID_PAYMENT_STATUS",
          message: "Cette réservation ne peut pas être remboursée",
        },
      });
    }

    // Initier le remboursement via la passerelle de paiement
    const refundResult = await initiateRefundWithGateway({
      transactionId: booking.paymentDetails.transactionId,
      amount: amount || booking.totalPrice,
      reason,
    });

    booking.refund = {
      refundId: refundResult.refundId,
      status: "pending",
      amount: amount || booking.totalPrice,
      initiatedBy: req.user.id,
      initiatedAt: new Date(),
      reason,
    };

    await booking.save();

    res.json({
      status: "success",
      data: {
        refundId: refundResult.refundId,
        amount: booking.refund.amount,
        status: "pending",
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      error: { message: error.message },
    });
  }
};

exports.deleteBooking = async (req, res) => {
  try {
    // Soft delete - marquer comme supprimé
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: req.user.id,
      },
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({
        status: "error",
        error: {
          code: "BOOKING_NOT_FOUND",
          message: "Réservation non trouvée",
        },
      });
    }

    res.json({
      status: "success",
      message: "Réservation supprimée avec succès",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      error: { message: error.message },
    });
  }
};

exports.getBookingStats = async (req, res) => {
  const { startDate, endDate, groupBy = "day" } = req.query;

  try {
    const matchStage = {};
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    const stats = await Booking.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            status: "$status",
            paymentStatus: "$paymentStatus",
          },
          count: { $sum: 1 },
          totalRevenue: { $sum: "$totalPrice" },
        },
      },
    ]);

    res.json({
      status: "success",
      data: { stats },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      error: { message: error.message },
    });
  }
};
```

### Récapitulatif de la Ségrégation

```
┌─────────────────────────────────────────────────────────────────────┐
│                    BOOKING MANAGEMENT APIs                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  📱 UserBookingAPI (/api/v1/user)                                  │
│  ├── POST   /bookings                → Créer réservation           │
│  ├── GET    /bookings                → Mes réservations            │
│  ├── GET    /bookings/:id            → Détails (sans data admin)   │
│  ├── POST   /bookings/:id/cancel     → Annuler                     │
│  └── PATCH  /bookings/:id/participants → Modifier participants     │
│                                                                     │
│  💳 PaymentCallbackAPI (/api/v1/webhooks)                          │
│  ├── POST   /payment                 → Webhook paiement            │
│  └── POST   /refund                  → Webhook remboursement       │
│                                                                     │
│  🔧 AdminBookingAPI (/api/v1/admin)                                │
│  ├── GET    /bookings                → Toutes les réservations     │
│  ├── GET    /bookings/:id            → Détails complets            │
│  ├── PATCH  /bookings/:id/status     → Modifier statut             │
│  ├── PATCH  /bookings/:id/notes      → Notes internes              │
│  ├── POST   /bookings/:id/refund     → Initier remboursement       │
│  ├── DELETE /bookings/:id            → Supprimer                   │
│  └── GET    /stats                   → Statistiques                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Exercice 2 : Système de Traitement de Commandes E-commerce

### Application de l'ISP

**API Actuelle (Monolithique) :**

```
POST   /orders                    → Créer une commande
GET    /orders/{id}               → Détails commande
PATCH  /orders/{id}/status        → Modifier statut
PATCH  /orders/{id}/items         → Modifier articles
POST   /orders/{id}/refund        → Remboursement
```

### APIs Ségrégées

#### 1. CustomerOrderAPI

**Client** : Application mobile/web pour les clients finaux

```javascript
// Routes
POST   /api/v1/customer/orders              → Créer une commande
GET    /api/v1/customer/orders              → Mes commandes
GET    /api/v1/customer/orders/:id          → Détails de ma commande
GET    /api/v1/customer/orders/:id/tracking → Suivi de livraison
POST   /api/v1/customer/orders/:id/cancel   → Annuler (si possible)
```

**Données exposées** :

- Informations de base de la commande
- Statut simplifié (préparation, expédié, livré)
- Articles commandés avec prix
- Informations de livraison
- **Exclut** : Marges, données fournisseur, notes internes

```javascript
// Exemple de réponse GET /api/v1/customer/orders/:id
{
  "status": "success",
  "data": {
    "order": {
      "id": "ORD-2026-001234",
      "status": "shipped",
      "statusLabel": "En cours de livraison",
      "items": [
        {
          "name": "Arc de Hawkeye - Édition Collector",
          "quantity": 1,
          "unitPrice": 299.99,
          "imageUrl": "https://cdn.example.com/products/hawkeye-bow.jpg"
        }
      ],
      "subtotal": 299.99,
      "shipping": 9.99,
      "total": 309.98,
      "deliveryAddress": {
        "name": "Clint Barton",
        "street": "123 Farm Road",
        "city": "Iowa",
        "zipCode": "50001"
      },
      "estimatedDelivery": "2026-01-08",
      "createdAt": "2026-01-03T10:30:00Z"
    }
  }
}
```

#### 2. WarehouseAPI

**Client** : Système d'entrepôt pour la préparation et l'expédition

```javascript
// Routes
GET    /api/v1/warehouse/orders/pending      → Commandes à préparer
GET    /api/v1/warehouse/orders/:id          → Détails pour préparation
PATCH  /api/v1/warehouse/orders/:id/picking  → Marquer articles prélevés
PATCH  /api/v1/warehouse/orders/:id/packing  → Marquer emballé
PATCH  /api/v1/warehouse/orders/:id/shipping → Enregistrer expédition
```

**Données exposées** :

- Informations de préparation (articles, quantités, emplacements)
- Adresse de livraison
- Poids et dimensions pour l'expédition
- **Exclut** : Prix, informations client détaillées, historique de paiement

```javascript
// Exemple de réponse GET /api/v1/warehouse/orders/:id
{
  "status": "success",
  "data": {
    "order": {
      "id": "ORD-2026-001234",
      "status": "pending_picking",
      "priority": "standard",
      "items": [
        {
          "sku": "HWK-BOW-COL-001",
          "name": "Arc de Hawkeye - Édition Collector",
          "quantity": 1,
          "location": "A-12-3",
          "weight": 2.5,
          "dimensions": { "l": 120, "w": 30, "h": 15 }
        }
      ],
      "shippingAddress": {
        "name": "Clint Barton",
        "street": "123 Farm Road",
        "city": "Iowa",
        "state": "IA",
        "zipCode": "50001",
        "country": "US"
      },
      "totalWeight": 2.5,
      "packagingNotes": "Produit fragile - emballer avec protection"
    }
  }
}
```

```javascript
// PATCH /api/v1/warehouse/orders/:id/shipping
// Enregistrer l'expédition avec numéro de suivi
{
  "carrier": "UPS",
  "trackingNumber": "1Z999AA10123456784",
  "weight": 3.2,
  "packageCount": 1
}
```

#### 3. CustomerServiceAPI

**Client** : Interface du service client

```javascript
// Routes
GET    /api/v1/cs/orders                     → Rechercher commandes
GET    /api/v1/cs/orders/:id                 → Détails complets
GET    /api/v1/cs/orders/:id/history         → Historique complet
PATCH  /api/v1/cs/orders/:id/status          → Modifier statut
PATCH  /api/v1/cs/orders/:id/items           → Modifier articles
POST   /api/v1/cs/orders/:id/refund          → Traiter remboursement
POST   /api/v1/cs/orders/:id/notes           → Ajouter note interne
GET    /api/v1/cs/customers/:id/orders       → Commandes d'un client
```

**Données exposées** :

- Toutes les informations de la commande
- Historique des interactions
- Informations de paiement
- Détails client complets
- Notes internes
- Capacité de modification

```javascript
// Exemple de réponse GET /api/v1/cs/orders/:id
{
  "status": "success",
  "data": {
    "order": {
      "id": "ORD-2026-001234",
      "status": "shipped",
      "customer": {
        "id": "USR-789",
        "name": "Clint Barton",
        "email": "clint@avengers.com",
        "phone": "+1-555-0123",
        "totalOrders": 15,
        "memberSince": "2023-06-15"
      },
      "items": [
        {
          "sku": "HWK-BOW-COL-001",
          "name": "Arc de Hawkeye - Édition Collector",
          "quantity": 1,
          "unitPrice": 299.99,
          "costPrice": 180.00,
          "margin": 119.99
        }
      ],
      "payment": {
        "method": "credit_card",
        "last4": "4242",
        "transactionId": "pi_3abc123",
        "paidAt": "2026-01-03T10:32:00Z"
      },
      "shipping": {
        "carrier": "UPS",
        "trackingNumber": "1Z999AA10123456784",
        "shippedAt": "2026-01-04T14:00:00Z"
      },
      "statusHistory": [
        { "status": "pending", "at": "2026-01-03T10:30:00Z" },
        { "status": "paid", "at": "2026-01-03T10:32:00Z" },
        { "status": "processing", "at": "2026-01-04T09:00:00Z" },
        { "status": "shipped", "at": "2026-01-04T14:00:00Z" }
      ],
      "internalNotes": [
        {
          "agent": "Nick Fury",
          "note": "Client VIP - priorité haute",
          "at": "2026-01-03T10:35:00Z"
        }
      ]
    }
  }
}
```

### Diagramme Récapitulatif

```
┌─────────────────────────────────────────────────────────────────────┐
│                       ORDER MICROSERVICE APIs                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  👤 CustomerOrderAPI                                                │
│  Données: Base + Statut simplifié + Tracking                       │
│  Actions: Créer, Consulter, Annuler                                │
│                                                                     │
│  🏭 WarehouseAPI                                                    │
│  Données: SKU, Locations, Poids, Adresse livraison                 │
│  Actions: Picking, Packing, Shipping                               │
│                                                                     │
│  🎧 CustomerServiceAPI                                              │
│  Données: TOUT (incluant marges, paiement, historique)             │
│  Actions: Modifier, Rembourser, Notes internes                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Exercice 3 : ISP pour un Microservice d'Authentification

### Analyse des Clients

Un microservice Auth sert différents types de clients avec des besoins très différents :

| Client                      | Besoins                             |
| --------------------------- | ----------------------------------- |
| **Formulaires utilisateur** | Login, inscription, reset password  |
| **Microservices internes**  | Valider tokens, obtenir permissions |
| **Outils admin**            | Gérer utilisateurs, rôles, audit    |

### APIs Ségrégées

#### 1. PublicAuthAPI - Pour les formulaires utilisateur

**Client** : Frontend web/mobile, pages de connexion

```javascript
// Routes publiques (pas d'authentification requise)
POST   /api/v1/auth/register           → Inscription
POST   /api/v1/auth/login              → Connexion
POST   /api/v1/auth/logout             → Déconnexion
POST   /api/v1/auth/refresh            → Rafraîchir le token
POST   /api/v1/auth/forgot-password    → Demander reset password
POST   /api/v1/auth/reset-password     → Réinitialiser mot de passe
POST   /api/v1/auth/verify-email       → Vérifier email

// Routes authentifiées utilisateur
GET    /api/v1/auth/me                 → Profil utilisateur
PATCH  /api/v1/auth/me                 → Modifier profil
PATCH  /api/v1/auth/me/password        → Changer mot de passe
DELETE /api/v1/auth/me                 → Supprimer compte
```

**Exemple d'implémentation :**

```javascript
// public-auth-api/routes.js
const express = require("express");
const router = express.Router();
const authController = require("../controllers/publicAuthController");
const { requireAuth } = require("../middleware/authMiddleware");
const { rateLimiter } = require("../middleware/rateLimiter");

// Routes publiques avec rate limiting
router.post("/register", rateLimiter("register"), authController.register);
router.post("/login", rateLimiter("login"), authController.login);
router.post("/logout", authController.logout);
router.post("/refresh", authController.refreshToken);
router.post(
  "/forgot-password",
  rateLimiter("forgot"),
  authController.forgotPassword
);
router.post("/reset-password", authController.resetPassword);
router.post("/verify-email", authController.verifyEmail);

// Routes authentifiées
router.get("/me", requireAuth, authController.getProfile);
router.patch("/me", requireAuth, authController.updateProfile);
router.patch("/me/password", requireAuth, authController.changePassword);
router.delete("/me", requireAuth, authController.deleteAccount);

module.exports = router;
```

```javascript
// Contrôleur - Login
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        status: "error",
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Email ou mot de passe incorrect",
        },
      });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        status: "error",
        error: {
          code: "EMAIL_NOT_VERIFIED",
          message: "Veuillez vérifier votre email",
        },
      });
    }

    const { accessToken, refreshToken } = await generateTokens(user);

    // Réponse simplifiée pour le frontend
    res.json({
      status: "success",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: 3600,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      error: { message: "Erreur interne du serveur" },
    });
  }
};
```

#### 2. InternalAuthAPI - Pour les microservices

**Client** : Autres microservices internes (Booking, Tour Catalog, etc.)

```javascript
// Routes internes (authentification service-to-service)
POST   /api/v1/internal/auth/validate-token    → Valider un token
POST   /api/v1/internal/auth/introspect        → Obtenir infos utilisateur
GET    /api/v1/internal/auth/permissions/:id   → Obtenir permissions
POST   /api/v1/internal/auth/service-token     → Obtenir token service
```

**Exemple d'implémentation :**

```javascript
// internal-auth-api/routes.js
const express = require("express");
const router = express.Router();
const internalAuthController = require("../controllers/internalAuthController");
const { requireServiceAuth } = require("../middleware/serviceAuthMiddleware");

// Authentification service-to-service requise
router.use(requireServiceAuth);

/**
 * POST /api/v1/internal/auth/validate-token
 * Valide un JWT et retourne les informations de base
 * Client: API Gateway, autres microservices
 */
router.post("/validate-token", internalAuthController.validateToken);

/**
 * POST /api/v1/internal/auth/introspect
 * Introspection détaillée d'un token
 * Client: Microservices nécessitant des infos utilisateur
 */
router.post("/introspect", internalAuthController.introspectToken);

/**
 * GET /api/v1/internal/auth/permissions/:userId
 * Obtenir les permissions d'un utilisateur
 * Client: Services nécessitant l'autorisation fine
 */
router.get("/permissions/:userId", internalAuthController.getPermissions);

/**
 * POST /api/v1/internal/auth/service-token
 * Générer un token pour communication service-to-service
 * Client: Microservices initiateurs
 */
router.post("/service-token", internalAuthController.generateServiceToken);

module.exports = router;
```

```javascript
// Contrôleur - Validation de token
exports.validateToken = async (req, res) => {
  const { token } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Vérifier que l'utilisateur existe toujours
    const userExists = await User.exists({ _id: decoded.sub, isActive: true });

    if (!userExists) {
      return res.json({
        valid: false,
        reason: "user_not_found",
      });
    }

    // Réponse minimale mais suffisante pour les microservices
    res.json({
      valid: true,
      userId: decoded.sub,
      roles: decoded.roles,
      exp: decoded.exp,
    });
  } catch (error) {
    res.json({
      valid: false,
      reason:
        error.name === "TokenExpiredError" ? "token_expired" : "invalid_token",
    });
  }
};

// Contrôleur - Introspection détaillée
exports.introspectToken = async (req, res) => {
  const { token } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(
      decoded.sub,
      "name email roles permissions"
    );

    if (!user) {
      return res.json({
        active: false,
      });
    }

    // Informations détaillées pour les microservices
    res.json({
      active: true,
      sub: user._id,
      name: user.name,
      email: user.email,
      roles: user.roles,
      permissions: user.permissions,
      exp: decoded.exp,
      iat: decoded.iat,
    });
  } catch (error) {
    res.json({ active: false });
  }
};
```

#### 3. AdminAuthAPI - Pour les outils d'administration

**Client** : Dashboard d'administration des utilisateurs

```javascript
// Routes admin (authentification admin requise)
GET    /api/v1/admin/auth/users              → Lister utilisateurs
GET    /api/v1/admin/auth/users/:id          → Détails utilisateur
POST   /api/v1/admin/auth/users              → Créer utilisateur
PATCH  /api/v1/admin/auth/users/:id          → Modifier utilisateur
PATCH  /api/v1/admin/auth/users/:id/status   → Activer/désactiver
PATCH  /api/v1/admin/auth/users/:id/roles    → Modifier rôles
DELETE /api/v1/admin/auth/users/:id          → Supprimer utilisateur
POST   /api/v1/admin/auth/users/:id/reset    → Forcer reset password

// Gestion des rôles et permissions
GET    /api/v1/admin/auth/roles              → Lister rôles
POST   /api/v1/admin/auth/roles              → Créer rôle
PATCH  /api/v1/admin/auth/roles/:id          → Modifier rôle
DELETE /api/v1/admin/auth/roles/:id          → Supprimer rôle

// Audit
GET    /api/v1/admin/auth/audit-logs         → Logs d'authentification
GET    /api/v1/admin/auth/sessions           → Sessions actives
DELETE /api/v1/admin/auth/sessions/:id       → Révoquer session
```

**Exemple d'implémentation :**

```javascript
// admin-auth-api/routes.js
const express = require("express");
const router = express.Router();
const adminAuthController = require("../controllers/adminAuthController");
const {
  requireAdmin,
  requireSuperAdmin,
} = require("../middleware/authMiddleware");

// Authentification admin requise
router.use(requireAdmin);

// Gestion des utilisateurs
router.get("/users", adminAuthController.listUsers);
router.get("/users/:id", adminAuthController.getUserDetails);
router.post("/users", adminAuthController.createUser);
router.patch("/users/:id", adminAuthController.updateUser);
router.patch("/users/:id/status", adminAuthController.updateUserStatus);
router.patch("/users/:id/roles", adminAuthController.updateUserRoles);
router.delete("/users/:id", adminAuthController.deleteUser);
router.post("/users/:id/reset", adminAuthController.forcePasswordReset);

// Gestion des rôles (super admin uniquement)
router.use("/roles", requireSuperAdmin);
router.get("/roles", adminAuthController.listRoles);
router.post("/roles", adminAuthController.createRole);
router.patch("/roles/:id", adminAuthController.updateRole);
router.delete("/roles/:id", adminAuthController.deleteRole);

// Audit
router.get("/audit-logs", adminAuthController.getAuditLogs);
router.get("/sessions", adminAuthController.getActiveSessions);
router.delete("/sessions/:id", adminAuthController.revokeSession);

module.exports = router;
```

```javascript
// Contrôleur - Liste des utilisateurs (vue admin)
exports.listUsers = async (req, res) => {
  const {
    search,
    role,
    status,
    sortBy = "createdAt",
    sortOrder = "desc",
    page = 1,
    limit = 20,
  } = req.query;

  try {
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    if (role) query.roles = role;
    if (status === "active") query.isActive = true;
    if (status === "inactive") query.isActive = false;

    const [users, total] = await Promise.all([
      User.find(query)
        .select("-password -refreshTokens")
        .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      User.countDocuments(query),
    ]);

    // Informations complètes pour l'administration
    res.json({
      status: "success",
      data: {
        users: users.map((user) => ({
          id: user._id,
          name: user.name,
          email: user.email,
          roles: user.roles,
          isActive: user.isActive,
          isEmailVerified: user.isEmailVerified,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          loginAttempts: user.loginAttempts,
          lockedUntil: user.lockedUntil,
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      error: { message: error.message },
    });
  }
};
```

### Récapitulatif des Interfaces Auth

```
┌─────────────────────────────────────────────────────────────────────┐
│                      AUTH MICROSERVICE APIs                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  👤 PublicAuthAPI (/api/v1/auth)                                   │
│  Client: Frontend utilisateur                                      │
│  ├── POST /register, /login, /logout                              │
│  ├── POST /forgot-password, /reset-password                        │
│  └── GET/PATCH /me                                                 │
│                                                                     │
│  🔗 InternalAuthAPI (/api/v1/internal/auth)                        │
│  Client: Microservices internes                                    │
│  ├── POST /validate-token     → Validation rapide                  │
│  ├── POST /introspect         → Détails utilisateur                │
│  ├── GET /permissions/:id     → Permissions                        │
│  └── POST /service-token      → Token service                      │
│                                                                     │
│  🔧 AdminAuthAPI (/api/v1/admin/auth)                              │
│  Client: Dashboard admin                                           │
│  ├── CRUD /users              → Gestion utilisateurs               │
│  ├── CRUD /roles              → Gestion rôles                      │
│  └── GET /audit-logs, /sessions → Audit et sécurité               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Résumé

L'application du **Principe de Ségrégation des Interfaces** (ISP) dans la conception d'API permet de :

1. **Réduire le couplage** : Chaque client n'interagit qu'avec les endpoints dont il a besoin
2. **Améliorer la sécurité** : Limiter l'exposition des données et des actions
3. **Faciliter la maintenance** : Des APIs plus petites et ciblées sont plus faciles à gérer
4. **Permettre l'évolution indépendante** : Modifier une interface n'impacte pas les autres clients

Ces solutions démontrent comment appliquer l'ISP aux microservices de notre application touristique et à des systèmes similaires.
