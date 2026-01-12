# Exercices - Leçon 5.1 Introduction à l'Architecture Event-Driven des Microservices

## Exercice 1 : Identifier Événements et Services

### Énoncé

**Contexte** : Dans notre Application de Réservation Touristique, imaginez qu'un utilisateur souhaite **annuler une réservation de tour**.

**Questions** :

1. Quel microservice serait le **producteur principal** pour un événement `"Booking Canceled"` ?

2. Quelles données seraient logiquement incluses dans un événement `"Booking Canceled"` ?

3. Identifiez **au moins deux autres microservices** (en plus du producteur) qui auraient probablement besoin de s'abonner aux événements `"Booking Canceled"`. Pour chacun, expliquez quelle action ils prendraient en recevant l'événement.

---

### Solution

#### 1. Producteur Principal

Le **Booking Management Microservice** serait le producteur principal de l'événement `"Booking Canceled"`.

**Justification** : Ce service est responsable de la gestion du cycle de vie des réservations. Lorsqu'un utilisateur demande l'annulation d'une réservation, c'est ce service qui :

- Valide que la réservation peut être annulée (politique d'annulation, délais)
- Met à jour le statut de la réservation dans sa propre base de données
- Publie l'événement pour notifier les autres services du changement d'état

**Implémentation exemple** :

```javascript
// booking-management-service/controllers/bookingController.js

async function cancelBooking(req, res) {
  const { bookingId } = req.params;
  const { userId } = req.user; // Depuis le JWT

  try {
    // 1. Récupérer la réservation
    const booking = await BookingModel.findOne({
      where: { id: bookingId, userId },
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: "Réservation non trouvée",
      });
    }

    // 2. Vérifier si l'annulation est autorisée
    const tour = await TourService.getTour(booking.tourId);
    const daysUntilTour = calculateDaysUntil(booking.date);

    if (daysUntilTour < tour.cancellationPolicy.minDays) {
      return res.status(400).json({
        success: false,
        error: `Annulation impossible. Délai minimum: ${tour.cancellationPolicy.minDays} jours`,
      });
    }

    // 3. Mettre à jour le statut dans la base de données
    booking.status = "canceled";
    booking.canceledAt = new Date();
    booking.refundAmount = calculateRefund(booking, daysUntilTour);
    await booking.save();

    // 4. PUBLIER L'ÉVÉNEMENT "booking.canceled"
    await eventPublisher.publish("booking.canceled", {
      bookingId: booking.id,
      tourId: booking.tourId,
      userId: booking.userId,
      originalBookingDate: booking.date,
      participants: booking.participants,
      totalPrice: booking.totalPrice,
      refundAmount: booking.refundAmount,
      canceledAt: booking.canceledAt,
      cancellationReason: req.body.reason || "user_request",
    });

    res.status(200).json({
      success: true,
      message: "Réservation annulée avec succès",
      data: {
        bookingId: booking.id,
        refundAmount: booking.refundAmount,
      },
    });
  } catch (error) {
    console.error("Erreur lors de l'annulation:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de l'annulation de la réservation",
    });
  }
}
```

---

#### 2. Données Incluses dans l'Événement

Un événement `"Booking Canceled"` devrait inclure toutes les données nécessaires pour que les services consommateurs puissent réagir de manière autonome, **sans avoir à faire d'appels supplémentaires**.

**Schéma de l'événement** :

```typescript
interface BookingCanceledEvent {
  // Métadonnées de l'événement
  eventType: "booking.canceled";
  eventId: string; // Identifiant unique de l'événement (UUID)
  eventVersion: string; // Version du schéma (ex: "1.0")
  timestamp: string; // ISO 8601 format
  correlationId?: string; // Pour tracer les événements liés

  // Données métier
  data: {
    // Identifiants
    bookingId: string;
    tourId: string;
    userId: string;

    // Détails de la réservation originale
    originalBookingDate: string; // Date du tour (ISO 8601)
    participants: number;
    totalPrice: number;
    currency: string;

    // Détails de l'annulation
    canceledAt: string; // ISO 8601
    cancellationReason: string; // "user_request" | "admin_action" | "payment_failed"
    refundAmount: number;
    refundStatus: string; // "pending" | "processing" | "completed"

    // Informations contextuelles optionnelles
    daysBeforeTour?: number;
    cancellationFee?: number;
  };
}
```

**Exemple concret** :

```json
{
  "eventType": "booking.canceled",
  "eventId": "evt_9f8e7d6c5b4a",
  "eventVersion": "1.0",
  "timestamp": "2024-01-20T14:30:00Z",
  "correlationId": "req_abc123",
  "data": {
    "bookingId": "bkg_550e8400",
    "tourId": "tour_paris_city",
    "userId": "user_tony_stark",
    "originalBookingDate": "2024-02-15T09:00:00Z",
    "participants": 2,
    "totalPrice": 250.0,
    "currency": "USD",
    "canceledAt": "2024-01-20T14:30:00Z",
    "cancellationReason": "user_request",
    "refundAmount": 225.0,
    "refundStatus": "pending",
    "daysBeforeTour": 26,
    "cancellationFee": 25.0
  }
}
```

**Principes appliqués** :

- ✅ **Self-contained** : Toutes les données nécessaires sont présentes
- ✅ **Immutable** : L'événement est un fait historique qui ne changera jamais
- ✅ **Versioned** : `eventVersion` permet l'évolution du schéma
- ✅ **Traceable** : `correlationId` pour le suivi distribué

---

#### 3. Services Consommateurs et Actions

Voici **quatre microservices** qui devraient s'abonner à l'événement `"Booking Canceled"` :

---

##### A. Payment Gateway Microservice

**Action** : Traiter le remboursement du paiement

**Logique métier** :

```javascript
// payment-service/consumers/bookingCanceledConsumer.js

eventBroker.subscribe("booking.canceled", async (event) => {
  const { bookingId, refundAmount, currency, userId } = event.data;

  try {
    // 1. Récupérer la transaction de paiement originale
    const originalPayment = await PaymentModel.findOne({
      where: { bookingId },
    });

    if (!originalPayment) {
      console.error(`Aucun paiement trouvé pour la réservation ${bookingId}`);
      return;
    }

    // 2. Vérifier si un remboursement n'a pas déjà été effectué (idempotence)
    const existingRefund = await RefundModel.findOne({
      where: { originalPaymentId: originalPayment.id },
    });

    if (existingRefund) {
      console.log(`Remboursement déjà traité pour ${bookingId}`);
      return; // Idempotence
    }

    // 3. Créer un remboursement via Stripe
    const stripeRefund = await stripe.refunds.create({
      charge: originalPayment.stripeChargeId,
      amount: Math.round(refundAmount * 100), // Conversion en centimes
      reason: "requested_by_customer",
      metadata: {
        bookingId,
        userId,
        correlationId: event.correlationId,
      },
    });

    // 4. Enregistrer le remboursement dans la base de données
    await RefundModel.create({
      id: uuidv4(),
      originalPaymentId: originalPayment.id,
      bookingId,
      amount: refundAmount,
      currency,
      stripeRefundId: stripeRefund.id,
      status: "succeeded",
      createdAt: new Date(),
    });

    // 5. Publier un événement "refund.processed"
    await eventPublisher.publish("refund.processed", {
      bookingId,
      refundId: stripeRefund.id,
      amount: refundAmount,
      currency,
      processedAt: new Date().toISOString(),
    });

    console.log(
      `✅ Remboursement traité: ${refundAmount} ${currency} pour ${bookingId}`
    );
  } catch (error) {
    console.error("Erreur lors du traitement du remboursement:", error);
    // Publier un événement d'échec pour retry ultérieur
    await eventPublisher.publish("refund.failed", {
      bookingId,
      error: error.message,
    });
  }
});
```

**Bénéfice** : Découplage total - Le Booking Service n'a pas besoin de savoir comment les remboursements fonctionnent.

---

##### B. Tour Catalog Microservice

**Action** : Libérer les places du tour annulé et les rendre à nouveau disponibles

**Logique métier** :

```javascript
// tour-catalog-service/consumers/bookingCanceledConsumer.js

eventBroker.subscribe("booking.canceled", async (event) => {
  const { tourId, participants, bookingId } = event.data;

  try {
    // 1. Mettre à jour les places disponibles
    const tour = await TourModel.findByPk(tourId);

    if (!tour) {
      console.error(`Tour ${tourId} non trouvé`);
      return;
    }

    // 2. Incrémenter les places disponibles
    tour.availableSpots += participants;
    await tour.save();

    console.log(
      `✅ ${participants} place(s) libérée(s) pour le tour ${tourId} (disponible: ${tour.availableSpots})`
    );

    // 3. Si le tour était complet et ne l'est plus, publier un événement
    if (tour.availableSpots === participants && tour.status === "sold_out") {
      tour.status = "available";
      await tour.save();

      await eventPublisher.publish("tour.availability.restored", {
        tourId,
        availableSpots: tour.availableSpots,
        restoredAt: new Date().toISOString(),
      });
    }

    // 4. Si des utilisateurs sont en liste d'attente, les notifier
    if (tour.availableSpots > 0) {
      const waitingList = await WaitingListModel.findAll({
        where: { tourId, notified: false },
        limit: participants,
      });

      if (waitingList.length > 0) {
        await eventPublisher.publish("tour.spots.available", {
          tourId,
          availableSpots: tour.availableSpots,
          waitingListUserIds: waitingList.map((w) => w.userId),
        });
      }
    }
  } catch (error) {
    console.error("Erreur lors de la libération des places:", error);
  }
});
```

**Bénéfice** : La disponibilité est mise à jour automatiquement sans appel API synchrone.

---

##### C. Notification Microservice

**Action** : Envoyer un email de confirmation d'annulation à l'utilisateur

**Logique métier** :

```javascript
// notification-service/consumers/bookingCanceledConsumer.js

eventBroker.subscribe("booking.canceled", async (event) => {
  const { bookingId, userId, tourId, refundAmount, currency, canceledAt } =
    event.data;

  try {
    // 1. Récupérer les détails de l'utilisateur
    const user = await UserService.getUser(userId);
    const tour = await TourService.getTour(tourId);

    // 2. Préparer les données pour le template
    const emailData = {
      userName: user.name,
      tourName: tour.name,
      bookingId,
      refundAmount: refundAmount.toFixed(2),
      currency,
      canceledAt: new Date(canceledAt).toLocaleDateString("fr-FR"),
      refundMessage:
        refundAmount > 0
          ? `Un remboursement de ${refundAmount.toFixed(
              2
            )} ${currency} sera traité dans les 5-10 jours ouvrables.`
          : "Aucun remboursement n'est applicable pour cette annulation.",
    };

    // 3. Envoyer l'email de confirmation d'annulation
    await EmailService.send({
      to: user.email,
      subject: `Confirmation d'annulation - Réservation ${bookingId.slice(
        0,
        8
      )}`,
      template: "booking-cancellation",
      data: emailData,
    });

    console.log(
      `✅ Email de confirmation d'annulation envoyé à ${user.email} pour ${bookingId}`
    );

    // 4. Envoyer également une notification push si l'utilisateur a activé les notifications
    if (user.pushNotificationsEnabled && user.pushToken) {
      await PushNotificationService.send({
        to: user.pushToken,
        title: "Réservation annulée",
        body: `Votre réservation pour "${tour.name}" a été annulée. Remboursement: ${refundAmount} ${currency}`,
      });
    }
  } catch (error) {
    console.error("Erreur lors de l'envoi de la notification:", error);
  }
});
```

**Template Email** (`booking-cancellation.hbs`) :

```handlebars
<html>
  <head>
    <title>Confirmation d'annulation</title>
  </head>
  <body>
    <h1>Bonjour {{userName}},</h1>

    <p>Nous confirmons l'annulation de votre réservation :</p>

    <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px;">
      <p><strong>Tour :</strong> {{tourName}}</p>
      <p><strong>Numéro de réservation :</strong> {{bookingId}}</p>
      <p><strong>Date d'annulation :</strong> {{canceledAt}}</p>
    </div>

    <p>{{refundMessage}}</p>

    <p>Nous espérons vous revoir bientôt !</p>

    <p>Cordialement,<br />L'équipe Tourism App</p>
  </body>
</html>
```

---

##### D. Analytics Microservice (Bonus)

**Action** : Mettre à jour les statistiques d'annulation et les métriques métier

**Logique métier** :

```javascript
// analytics-service/consumers/bookingCanceledConsumer.js

eventBroker.subscribe("booking.canceled", async (event) => {
  const {
    bookingId,
    tourId,
    totalPrice,
    refundAmount,
    daysBeforeTour,
    cancellationReason,
  } = event.data;

  try {
    // 1. Incrémenter le compteur d'annulations
    await AnalyticsModel.increment("cancellations_count", {
      where: { metric: "bookings", period: "daily" },
    });

    // 2. Enregistrer les revenus perdus
    await RevenueModel.create({
      type: "cancellation",
      amount: -totalPrice,
      refundAmount: -refundAmount,
      date: new Date(),
      tourId,
    });

    // 3. Analyser les raisons d'annulation
    await CancellationReasonModel.increment("count", {
      where: { reason: cancellationReason },
    });

    // 4. Calculer le taux d'annulation par tour
    const tourStats = await calculateTourCancellationRate(tourId);

    // 5. Alerte si le taux d'annulation dépasse un seuil
    if (tourStats.cancellationRate > 0.3) {
      await eventPublisher.publish("analytics.high.cancellation.rate", {
        tourId,
        cancellationRate: tourStats.cancellationRate,
        alertLevel: "warning",
      });
    }

    console.log(`📊 Statistiques mises à jour pour l'annulation ${bookingId}`);
  } catch (error) {
    console.error("Erreur lors de la mise à jour des analytics:", error);
  }
});
```

---

### Résumé des Services Consommateurs

| Service             | Action                               | Événement Publié (si applicable)     |
| ------------------- | ------------------------------------ | ------------------------------------ |
| **Payment Gateway** | Traiter le remboursement via Stripe  | `refund.processed` / `refund.failed` |
| **Tour Catalog**    | Libérer les places du tour           | `tour.availability.restored`         |
| **Notification**    | Envoyer email et push notification   | -                                    |
| **Analytics**       | Mettre à jour métriques d'annulation | `analytics.high.cancellation.rate`   |

---

### Flux Complet Événementiel

```
┌────────────────────────────────────────────────────────────────┐
│              FLUX D'ANNULATION ÉVÉNEMENTIEL                     │
└────────────────────────────────────────────────────────────────┘

1. Utilisateur demande annulation
   └──> Frontend → Booking Service (POST /bookings/:id/cancel)

2. Booking Service
   ├──> Valide l'annulation (politique, délais)
   ├──> Met à jour statut → "canceled"
   └──> PUBLIE "booking.canceled" 📨

3. Event Broker (RabbitMQ)
   └──> Distribue aux 4 abonnés

4. Consommateurs (parallèle)
   ├──> Payment Service → Crée remboursement Stripe → PUBLIE "refund.processed"
   ├──> Tour Catalog Service → +2 places disponibles
   ├──> Notification Service → Envoie email de confirmation
   └──> Analytics Service → Met à jour métriques

5. Événements en cascade (optionnels)
   ├──> "refund.processed" → Notification → Email "Remboursement effectué"
   └──> "tour.availability.restored" → Notification → Alerte liste d'attente
```

**Avantages de cette approche** :

- ✅ **Découplage** : Chaque service fonctionne indépendamment
- ✅ **Résilience** : Si Notification Service est down, le remboursement continue
- ✅ **Extensibilité** : Ajouter un nouveau service (ex: Loyalty Points) = juste s'abonner
- ✅ **Auditabilité** : Tous les événements sont loggés et traçables

---

## Exercice 2 : Décisions Synchrone vs Asynchrone

### Énoncé

**Contexte** : Considérons une fonctionnalité dans notre Application Touristique où un utilisateur souhaite **"Voir les Tours Disponibles"**.

**Questions** :

1. Cette interaction serait-elle typiquement gérée avec une approche **synchrone** (request-driven) ou **asynchrone** (event-driven) ? Expliquez votre raisonnement.

2. Maintenant, considérons un scénario où le Tour Catalog Microservice doit intégrer avec un fournisseur tiers pour vérifier la disponibilité absolument la plus récente pour un tour très populaire. Cette vérification tierce peut parfois prendre plusieurs secondes.

   Comment un pattern event-driven pourrait-il encore être bénéfique pour gérer la mise à jour de nos données de disponibilité internes après que cet appel lent au tiers se termine, même si la requête initiale "Voir les Tours Disponibles" est synchrone ?

---

### Solution

#### 1. Approche pour "Voir les Tours Disponibles"

**Réponse : SYNCHRONE (Request-Driven)**

Cette interaction devrait être gérée avec une **communication synchrone** via une requête REST API directe.

##### Justification Détaillée

**A. Nature de la requête**

C'est une **requête de lecture (query)**, pas un **changement d'état** :

```javascript
// Frontend fait une requête GET synchrone
GET /api/tours?destination=Paris&date=2024-02-15&participants=2

// Réponse immédiate attendue
{
  "success": true,
  "data": {
    "tours": [
      {
        "id": "tour_paris_city",
        "name": "Paris City Tour",
        "availableSpots": 12,
        "price": 125.00,
        "date": "2024-02-15T09:00:00Z"
      },
      {
        "id": "tour_eiffel",
        "name": "Eiffel Tower Express",
        "availableSpots": 5,
        "price": 85.00,
        "date": "2024-02-15T14:00:00Z"
      }
    ],
    "total": 2
  }
}
```

**B. Attentes utilisateur**

L'utilisateur s'attend à une **réponse immédiate** :

- ❌ **Asynchrone serait inapproprié** : "Nous avons reçu votre demande de voir les tours. Un email vous sera envoyé avec la liste dans 5 minutes." → Expérience utilisateur terrible
- ✅ **Synchrone est naturel** : Cliquer → Voir les résultats instantanément

**C. Pattern Request-Response**

Cette interaction suit le pattern **question-réponse** classique :

```
Question : "Quels tours sont disponibles pour Paris le 15 février ?"
Réponse : "Voici 2 tours disponibles : Paris City Tour (12 places), Eiffel Tower Express (5 places)"
```

**D. Pas de propagation nécessaire**

Contrairement à "Réserver un tour" qui doit :

- ✅ Notifier l'utilisateur
- ✅ Mettre à jour l'inventaire
- ✅ Traiter le paiement
- ✅ Mettre à jour les analytics

"Voir les tours" n'a **aucun effet de bord** - c'est juste une lecture.

##### Implémentation Recommandée

```javascript
// Frontend - React Component
function TourSearchPage() {
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(false);

  const searchTours = async (filters) => {
    setLoading(true);
    try {
      // Requête synchrone REST API
      const response = await fetch(
        `/api/tours?destination=${filters.destination}&date=${filters.date}&participants=${filters.participants}`
      );
      const data = await response.json();
      setTours(data.tours);
    } catch (error) {
      console.error("Erreur lors de la recherche:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <TourSearchForm onSearch={searchTours} />
      {loading ? <Spinner /> : <TourList tours={tours} />}
    </div>
  );
}
```

```javascript
// Backend - Tour Catalog Service
// GET /api/tours
router.get("/tours", async (req, res) => {
  const { destination, date, participants } = req.query;

  try {
    const tours = await TourModel.findAll({
      where: {
        destination,
        date: {
          [Op.gte]: date,
        },
        availableSpots: {
          [Op.gte]: participants || 1,
        },
        status: "active",
      },
      order: [["date", "ASC"]],
    });

    res.status(200).json({
      success: true,
      data: { tours, total: tours.length },
    });
  } catch (error) {
    console.error("Erreur:", error);
    res.status(500).json({ success: false, error: "Erreur serveur" });
  }
});
```

##### Quand Utiliser Asynchrone ?

**Asynchrone serait approprié pour** :

- ✅ `booking.confirmed` - Changement d'état propagé à plusieurs services
- ✅ `tour.availability.updated` - Notification à d'autres services
- ✅ `payment.processed` - Workflow multi-étapes

**Synchrone est approprié pour** :

- ✅ `GET /tours` - Lecture simple
- ✅ `GET /tours/:id` - Détail d'un tour
- ✅ `GET /bookings/:id` - Statut d'une réservation

---

#### 2. Intégration avec Fournisseur Tiers (Approche Hybride)

**Scénario** : Le Tour Catalog Service doit vérifier la disponibilité en temps réel auprès d'un fournisseur tiers (ex: Viator, GetYourGuide) pour un tour très populaire. Cette vérification peut prendre 3-5 secondes.

##### Problème avec l'Approche 100% Synchrone

```javascript
// ❌ MAUVAISE APPROCHE - Tout synchrone
router.get("/tours/:id", async (req, res) => {
  const tour = await TourModel.findByPk(req.params.id);

  // Appel synchrone bloquant au fournisseur tiers (3-5 secondes!)
  const thirdPartyAvailability = await ThirdPartyAPI.checkAvailability(
    tour.externalId
  );

  tour.availableSpots = thirdPartyAvailability.spots;

  res.json({ tour }); // L'utilisateur attend 5 secondes pour voir la page!
});
```

**Problèmes** :

- ❌ Expérience utilisateur dégradée (5 secondes d'attente)
- ❌ Timeout potentiel si le tiers est lent (>30s)
- ❌ Pas de cache - chaque requête appelle le tiers
- ❌ Impossible de scaler (tiers = goulot d'étranglement)

##### Solution : Approche Hybride (Synchrone + Asynchrone)

**Architecture recommandée** :

```
┌────────────────────────────────────────────────────────────────┐
│           APPROCHE HYBRIDE - DISPONIBILITÉ TEMPS RÉEL           │
└────────────────────────────────────────────────────────────────┘

1. Requête Utilisateur (SYNCHRONE)
   Frontend → GET /api/tours/:id
   └──> Tour Catalog Service répond IMMÉDIATEMENT avec cache local
        Response: { availableSpots: 12, lastUpdated: "2 min ago" }

2. Mise à Jour en Arrière-Plan (ASYNCHRONE)
   ┌──> Background Job (toutes les 5 minutes)
   │    └──> Appel ThirdPartyAPI.checkAvailability() [lent, 3-5s]
   │    └──> PUBLIE "tour.availability.synced" 📨
   │
   └──> Event Consumer
        └──> Tour Catalog Service met à jour son cache local
        └──> WebSocket broadcast aux clients connectés (optionnel)
```

##### Implémentation Détaillée

**A. Endpoint Synchrone avec Cache**

```javascript
// tour-catalog-service/routes/tours.js

router.get("/tours/:id", async (req, res) => {
  try {
    // Récupérer depuis le cache local (RAPIDE - <50ms)
    const tour = await TourModel.findByPk(req.params.id);

    if (!tour) {
      return res.status(404).json({ error: "Tour non trouvé" });
    }

    // Réponse immédiate avec donnée cachée
    res.status(200).json({
      success: true,
      data: {
        tour: {
          id: tour.id,
          name: tour.name,
          availableSpots: tour.availableSpots, // Donnée cachée
          price: tour.price,
          lastSyncedAt: tour.lastSyncedAt, // Transparence
        },
        meta: {
          dataSource: "cache",
          cacheAge: calculateCacheAge(tour.lastSyncedAt),
          nextSyncIn: calculateNextSync(tour.lastSyncedAt),
        },
      },
    });

    // OPTIONNEL : Déclencher une synchronisation si le cache est ancien
    if (isCacheStale(tour.lastSyncedAt, 10)) {
      // > 10 minutes
      // Publier événement pour refresh asynchrone (fire-and-forget)
      await eventPublisher.publish("tour.sync.requested", {
        tourId: tour.id,
        priority: "high",
      });
    }
  } catch (error) {
    console.error("Erreur:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

function isCacheStale(lastSyncedAt, maxAgeMinutes) {
  const ageMinutes = (Date.now() - new Date(lastSyncedAt)) / 1000 / 60;
  return ageMinutes > maxAgeMinutes;
}
```

**B. Job de Synchronisation Asynchrone (Cron)**

```javascript
// tour-catalog-service/jobs/syncThirdPartyAvailability.js

const cron = require("node-cron");

// Exécuter toutes les 5 minutes
cron.schedule("*/5 * * * *", async () => {
  console.log("🔄 Début de la synchronisation avec le fournisseur tiers...");

  try {
    // 1. Récupérer tous les tours actifs avec externalId
    const tours = await TourModel.findAll({
      where: {
        status: "active",
        externalId: { [Op.ne]: null },
      },
    });

    console.log(`📋 ${tours.length} tours à synchroniser`);

    // 2. Synchroniser chaque tour (en parallèle avec limite)
    const results = await Promise.allSettled(
      tours.map((tour) => syncTourAvailability(tour))
    );

    // 3. Logger les résultats
    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    console.log(
      `✅ Synchronisation terminée: ${succeeded} succès, ${failed} échecs`
    );
  } catch (error) {
    console.error("Erreur lors de la synchronisation:", error);
  }
});

async function syncTourAvailability(tour) {
  try {
    // 1. Appel au fournisseur tiers (LENT - 3-5 secondes)
    const thirdPartyData = await ThirdPartyAPI.checkAvailability(
      tour.externalId,
      {
        timeout: 10000, // Timeout 10s
      }
    );

    // 2. Mettre à jour la base de données locale
    const previousSpots = tour.availableSpots;
    tour.availableSpots = thirdPartyData.availableSpots;
    tour.lastSyncedAt = new Date();
    tour.syncStatus = "success";
    await tour.save();

    // 3. PUBLIER ÉVÉNEMENT si changement significatif
    if (Math.abs(previousSpots - thirdPartyData.availableSpots) > 0) {
      await eventPublisher.publish("tour.availability.synced", {
        tourId: tour.id,
        previousSpots,
        currentSpots: thirdPartyData.availableSpots,
        syncedAt: tour.lastSyncedAt.toISOString(),
        source: "third_party_sync",
      });

      console.log(
        `📊 Tour ${tour.id}: ${previousSpots} → ${thirdPartyData.availableSpots} places`
      );
    }
  } catch (error) {
    console.error(`Erreur sync tour ${tour.id}:`, error.message);

    // Marquer comme échec mais ne pas crasher
    tour.syncStatus = "failed";
    tour.lastSyncError = error.message;
    await tour.save();

    throw error; // Pour Promise.allSettled
  }
}
```

**C. Consumer pour Notifications Temps Réel (Optionnel)**

```javascript
// notification-service/consumers/tourAvailabilityConsumer.js

eventBroker.subscribe("tour.availability.synced", async (event) => {
  const { tourId, previousSpots, currentSpots } = event.data;

  // Si le tour redevient disponible après avoir été complet
  if (previousSpots === 0 && currentSpots > 0) {
    // Notifier les utilisateurs en liste d'attente
    const waitingList = await WaitingListModel.findAll({
      where: { tourId, notified: false },
    });

    for (const waiting of waitingList) {
      const user = await UserService.getUser(waiting.userId);
      const tour = await TourService.getTour(tourId);

      await EmailService.send({
        to: user.email,
        subject: `🎉 Places disponibles pour "${tour.name}"`,
        template: "tour-available-alert",
        data: {
          userName: user.name,
          tourName: tour.name,
          availableSpots: currentSpots,
          bookingLink: `https://app.com/tours/${tourId}`,
        },
      });

      waiting.notified = true;
      await waiting.save();
    }

    console.log(
      `✉️ ${waitingList.length} notifications envoyées pour le tour ${tourId}`
    );
  }

  // Alerter si disponibilité critique (<5 places)
  if (currentSpots > 0 && currentSpots <= 5) {
    await eventPublisher.publish("tour.availability.low", {
      tourId,
      availableSpots: currentSpots,
      alertLevel: "warning",
    });
  }
});
```

**D. WebSocket pour Mise à Jour Temps Réel (Ultra-Moderne)**

```javascript
// websocket-server/handlers/tourAvailability.js

eventBroker.subscribe("tour.availability.synced", async (event) => {
  const { tourId, currentSpots } = event.data;

  // Broadcaster à tous les clients qui regardent cette page tour
  io.to(`tour_${tourId}`).emit("availability_updated", {
    tourId,
    availableSpots: currentSpots,
    timestamp: new Date().toISOString(),
  });

  console.log(
    `🔴 WebSocket broadcast: Tour ${tourId} → ${currentSpots} places`
  );
});

// Frontend - React useEffect
useEffect(() => {
  socket.on("availability_updated", (data) => {
    if (data.tourId === currentTourId) {
      setAvailableSpots(data.availableSpots);
      showToast(`Places mises à jour: ${data.availableSpots} disponibles`);
    }
  });

  return () => socket.off("availability_updated");
}, [currentTourId]);
```

##### Avantages de l'Approche Hybride

| Aspect                | Synchrone Pur ❌       | Hybride (Sync + Async) ✅      |
| --------------------- | ---------------------- | ------------------------------ |
| **Temps de réponse**  | 3-5 secondes (lent)    | <50ms (rapide)                 |
| **Expérience UX**     | Mauvaise (attente)     | Excellente (instantané)        |
| **Fraîcheur données** | Temps réel (mais lent) | Near real-time (5 min cache)   |
| **Résilience**        | Dépend du tiers        | Fonctionne même si tiers down  |
| **Scalabilité**       | Limitée par API tiers  | Excellente (cache local)       |
| **Coût API tiers**    | Élevé (chaque requête) | Faible (sync toutes les 5 min) |
| **Notifications**     | Impossibles            | Possibles (events + WebSocket) |

##### Résumé de la Solution

```
┌────────────────────────────────────────────────────────────────┐
│                    FLUX COMPLET HYBRIDE                        │
└────────────────────────────────────────────────────────────────┘

PARTIE SYNCHRONE (Lecture Utilisateur)
  Frontend → GET /tours/paris_city
  ├──> Tour Catalog Service (cache local) [<50ms]
  └──> Response: { availableSpots: 12, lastUpdated: "3 min" }

PARTIE ASYNCHRONE (Synchronisation Arrière-Plan)
  Cron Job (toutes les 5 min)
  ├──> Appel ThirdPartyAPI.checkAvailability() [3-5s]
  ├──> Mise à jour cache local
  └──> PUBLIE "tour.availability.synced" 📨
       │
       ├──> Notification Service
       │    └──> Email liste d'attente si disponible
       │
       └──> WebSocket Server
            └──> Broadcast temps réel aux clients connectés
```

**Cette approche combine le meilleur des deux mondes** :

- ✅ Réponse synchrone rapide pour l'utilisateur
- ✅ Mise à jour asynchrone pour la fraîcheur des données
- ✅ Découplage via événements pour les notifications
- ✅ Scalabilité et résilience

---

## Exercice 3 : Défi d'Extensibilité

### Énoncé

**Contexte** : Notre Application Touristique gère actuellement les réservations de tours de base. Une nouvelle exigence métier est d'implémenter un **"Programme de Fidélité"**.

Quand un utilisateur complète un tour (c'est-à-dire que la date du tour est passée et l'utilisateur a participé), il devrait gagner des points de fidélité.

**Questions** :

1. Décrivez comment vous intégreriez ce nouveau **"Loyalty Program Microservice"** en utilisant une approche event-driven **sans modifier** les services existants comme le Booking Management ou Tour Catalog services.

2. Quel nouvel événement (ou modification d'un événement existant) serait le plus approprié pour déclencher le gain de points ?

3. Quel service produirait cet événement, et quel service le consommerait ?

---

### Solution

#### 1. Architecture du Loyalty Program Microservice (Event-Driven)

##### Vue d'Ensemble

Le **Loyalty Program Microservice** sera intégré en tant que **consommateur pur** d'événements existants et nouveaux, sans nécessiter de modifications aux services existants.

**Principe clé** : **Open/Closed Principle (OCP)** - Le système est ouvert à l'extension (nouveau service de fidélité) mais fermé à la modification (pas de changement aux services existants).

##### Architecture Complète

```
┌────────────────────────────────────────────────────────────────┐
│          ARCHITECTURE LOYALTY PROGRAM (EVENT-DRIVEN)           │
└────────────────────────────────────────────────────────────────┘

Services Existants (AUCUNE MODIFICATION)
   │
   ├──> Booking Service
   │    └──> Publie déjà "booking.confirmed"
   │    └──> Publie déjà "booking.canceled"
   │
   ├──> Tour Completion Service (NOUVEAU producteur)
   │    └──> Cron job quotidien vérifie tours complétés
   │    └──> PUBLIE "tour.completed" 📨 (NOUVEAU)
   │
   └──> Payment Service
        └──> Publie déjà "payment.processed"

Event Broker (RabbitMQ)
   │
   └──> Distribue événements

Loyalty Program Service (NOUVEAU - Consumer uniquement)
   │
   ├──> S'abonne à "tour.completed" → Ajoute points
   ├──> S'abonne à "booking.canceled" → Retire points (si applicable)
   ├──> S'abonne à "user.registered" → Crée compte fidélité
   │
   └──> PUBLIE ses propres événements :
        ├──> "loyalty.points.earned"
        ├──> "loyalty.tier.upgraded"
        └──> "loyalty.reward.redeemed"

Notification Service (Consommateur existant)
   │
   └──> S'abonne aux nouveaux événements de fidélité
        └──> Envoie emails de félicitations
```

##### Base de Données du Loyalty Service

```sql
-- loyalty_db.sql

-- Compte de fidélité utilisateur
CREATE TABLE loyalty_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) UNIQUE NOT NULL,
  total_points INT DEFAULT 0,
  lifetime_points INT DEFAULT 0,
  current_tier VARCHAR(50) DEFAULT 'bronze', -- bronze, silver, gold, platinum
  tier_since TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Historique des transactions de points
CREATE TABLE loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES loyalty_accounts(id),
  type VARCHAR(50) NOT NULL, -- 'earned', 'redeemed', 'expired', 'canceled'
  points INT NOT NULL,
  reason VARCHAR(255),
  booking_id VARCHAR(255),
  tour_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  event_id VARCHAR(255) UNIQUE -- Pour idempotence
);

-- Niveaux et avantages
CREATE TABLE loyalty_tiers (
  tier VARCHAR(50) PRIMARY KEY,
  min_points INT NOT NULL,
  discount_percentage DECIMAL(5,2),
  perks JSONB
);

INSERT INTO loyalty_tiers VALUES
('bronze', 0, 0, '{"priority_support": false}'),
('silver', 500, 5, '{"priority_support": true, "free_cancellation": true}'),
('gold', 2000, 10, '{"priority_support": true, "free_cancellation": true, "early_access": true}'),
('platinum', 5000, 15, '{"priority_support": true, "free_cancellation": true, "early_access": true, "concierge": true}');
```

##### Service Implementation

```javascript
// loyalty-service/server.js

const express = require("express");
const { connectToRabbitMQ, subscribe, publish } = require("./eventBroker");
const { connectToDatabase } = require("./database");

const app = express();
app.use(express.json());

async function startLoyaltyService() {
  // 1. Connexion à la base de données
  await connectToDatabase();

  // 2. Connexion au broker d'événements
  await connectToRabbitMQ();

  // 3. S'abonner aux événements pertinents
  await subscribeToEvents();

  // 4. Exposer l'API REST (consultation uniquement)
  setupRoutes(app);

  // 5. Démarrer le serveur
  app.listen(3008, () => {
    console.log("✅ Loyalty Program Service démarré sur le port 3008");
  });
}

async function subscribeToEvents() {
  // S'abonner à tour.completed pour gagner des points
  subscribe("tour.completed", handleTourCompleted);

  // S'abonner à booking.canceled pour retirer des points
  subscribe("booking.canceled", handleBookingCanceled);

  // S'abonner à user.registered pour créer un compte
  subscribe("user.registered", handleUserRegistered);

  console.log("📬 Abonnements aux événements configurés");
}

startLoyaltyService();
```

---

#### 2. Événement Optimal : `tour.completed`

##### Pourquoi un Nouvel Événement ?

**Événement existant `booking.confirmed`** :

- ❌ Se déclenche quand la réservation est créée
- ❌ Le tour n'a pas encore eu lieu
- ❌ L'utilisateur pourrait annuler ou ne pas se présenter
- ❌ **Problème** : Gagner des points sans avoir participé = fraude

**Nouvel événement `tour.completed`** :

- ✅ Se déclenche quand le tour a effectivement eu lieu
- ✅ L'utilisateur a participé (date passée + confirmation de présence)
- ✅ Points gagnés uniquement pour participation réelle
- ✅ **Avantage** : Programme de fidélité légitime

##### Schéma de l'Événement `tour.completed`

```typescript
interface TourCompletedEvent {
  eventType: "tour.completed";
  eventId: string;
  eventVersion: "1.0";
  timestamp: string;
  correlationId?: string;

  data: {
    // Identifiants
    tourId: string;
    tourName: string;
    bookingId: string;
    userId: string;

    // Détails du tour
    tourDate: string; // Date du tour (passée)
    completedAt: string; // Timestamp de vérification
    participants: number;
    totalPrice: number;
    currency: string;

    // Informations pour calcul des points
    tourCategory: string; // "city_tour", "adventure", "cultural"
    tourDuration: number; // En heures
    tourRating?: number; // Si l'utilisateur a noté

    // Statut de participation
    attendance: "confirmed" | "no_show";
    attendanceVerifiedBy?: string; // "guide_confirmation" | "automatic"
  };
}
```

##### Exemple Concret

```json
{
  "eventType": "tour.completed",
  "eventId": "evt_tour_complete_abc123",
  "eventVersion": "1.0",
  "timestamp": "2024-02-15T18:00:00Z",
  "correlationId": "booking_bkg_550e8400",
  "data": {
    "tourId": "tour_paris_city",
    "tourName": "Paris City Tour",
    "bookingId": "bkg_550e8400",
    "userId": "user_tony_stark",
    "tourDate": "2024-02-15T09:00:00Z",
    "completedAt": "2024-02-15T18:00:00Z",
    "participants": 2,
    "totalPrice": 250.0,
    "currency": "USD",
    "tourCategory": "city_tour",
    "tourDuration": 4,
    "tourRating": 5,
    "attendance": "confirmed",
    "attendanceVerifiedBy": "automatic"
  }
}
```

---

#### 3. Producteur et Consommateur

##### A. Producteur : Tour Completion Service (Nouveau)

**Responsabilité** : Vérifier quotidiennement les tours complétés et publier les événements.

```javascript
// tour-completion-service/jobs/checkCompletedTours.js

const cron = require("node-cron");
const { publish } = require("./eventBroker");

// Exécuter tous les jours à 2h du matin
cron.schedule("0 2 * * *", async () => {
  console.log("🔍 Vérification des tours complétés...");

  try {
    // 1. Trouver tous les tours dont la date est passée et qui n'ont pas été marqués comme complétés
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(23, 59, 59, 999);

    const completedBookings = await BookingModel.findAll({
      where: {
        date: {
          [Op.lte]: yesterday,
        },
        status: "confirmed",
        completionProcessed: false, // Flag pour éviter les doublons
      },
      include: [
        { model: TourModel, as: "tour" },
        { model: UserModel, as: "user" },
      ],
    });

    console.log(`📋 ${completedBookings.length} réservations à traiter`);

    // 2. Pour chaque réservation, publier événement "tour.completed"
    for (const booking of completedBookings) {
      // Déterminer si l'utilisateur s'est présenté (par défaut: oui si pas de no-show signalé)
      const attendance = booking.noShow ? "no_show" : "confirmed";

      if (attendance === "confirmed") {
        // Publier l'événement
        await publish("tour.completed", {
          tourId: booking.tour.id,
          tourName: booking.tour.name,
          bookingId: booking.id,
          userId: booking.userId,
          tourDate: booking.date.toISOString(),
          completedAt: new Date().toISOString(),
          participants: booking.participants,
          totalPrice: booking.totalPrice,
          currency: booking.currency,
          tourCategory: booking.tour.category,
          tourDuration: booking.tour.duration,
          tourRating: booking.rating, // Si l'utilisateur a noté
          attendance: "confirmed",
          attendanceVerifiedBy: "automatic",
        });

        console.log(`✅ Événement publié pour la réservation ${booking.id}`);
      }

      // Marquer comme traité
      booking.completionProcessed = true;
      await booking.save();
    }

    console.log(`🎉 ${completedBookings.length} tours marqués comme complétés`);
  } catch (error) {
    console.error("Erreur lors de la vérification des tours complétés:", error);
  }
});
```

**Alternative : Webhook du Guide Touristique**

```javascript
// tour-completion-service/routes/completion.js

// Endpoint pour que le guide confirme la fin du tour
router.post("/tours/:tourId/complete", authenticate, async (req, res) => {
  const { tourId } = req.params;
  const { bookingIds, notes } = req.body;

  // Vérifier que le guide est autorisé
  if (req.user.role !== "guide") {
    return res.status(403).json({ error: "Non autorisé" });
  }

  // Pour chaque réservation, publier l'événement
  for (const bookingId of bookingIds) {
    const booking = await BookingModel.findByPk(bookingId);

    await publish("tour.completed", {
      tourId,
      bookingId,
      userId: booking.userId,
      attendance: "confirmed",
      attendanceVerifiedBy: "guide_confirmation",
      guideNotes: notes,
      // ... autres champs
    });
  }

  res.json({ success: true, message: "Tours marqués comme complétés" });
});
```

---

##### B. Consommateur : Loyalty Program Service

```javascript
// loyalty-service/consumers/tourCompletedConsumer.js

const { subscribe, publish } = require("../eventBroker");
const { calculatePoints } = require("../utils/pointsCalculator");

subscribe("tour.completed", async (event) => {
  const {
    bookingId,
    userId,
    tourId,
    tourName,
    totalPrice,
    tourCategory,
    tourDuration,
    tourRating,
    attendance,
  } = event.data;

  // Ignorer si l'utilisateur ne s'est pas présenté
  if (attendance === "no_show") {
    console.log(
      `⏭️ No-show détecté pour ${bookingId}, pas de points attribués`
    );
    return;
  }

  try {
    // 1. Vérifier l'idempotence (éviter double attribution)
    const existingTransaction = await LoyaltyTransactionModel.findOne({
      where: { event_id: event.eventId },
    });

    if (existingTransaction) {
      console.log(`⚠️ Points déjà attribués pour l'événement ${event.eventId}`);
      return; // Idempotence
    }

    // 2. Récupérer le compte de fidélité
    let loyaltyAccount = await LoyaltyAccountModel.findOne({
      where: { user_id: userId },
    });

    if (!loyaltyAccount) {
      console.log(
        `📝 Création du compte de fidélité pour l'utilisateur ${userId}`
      );
      loyaltyAccount = await LoyaltyAccountModel.create({
        user_id: userId,
        total_points: 0,
        lifetime_points: 0,
        current_tier: "bronze",
      });
    }

    // 3. Calculer les points à attribuer
    const basePoints = calculateBasePoints(totalPrice);
    const bonusPoints = calculateBonusPoints({
      tourCategory,
      tourDuration,
      tourRating,
      currentTier: loyaltyAccount.current_tier,
    });
    const totalPointsEarned = basePoints + bonusPoints;

    // 4. Mettre à jour le compte
    loyaltyAccount.total_points += totalPointsEarned;
    loyaltyAccount.lifetime_points += totalPointsEarned;

    // 5. Vérifier si l'utilisateur monte de niveau
    const previousTier = loyaltyAccount.current_tier;
    const newTier = calculateTier(loyaltyAccount.total_points);

    if (newTier !== previousTier) {
      loyaltyAccount.current_tier = newTier;
      loyaltyAccount.tier_since = new Date();
    }

    await loyaltyAccount.save();

    // 6. Enregistrer la transaction
    await LoyaltyTransactionModel.create({
      account_id: loyaltyAccount.id,
      type: "earned",
      points: totalPointsEarned,
      reason: `Tour complété: ${tourName}`,
      booking_id: bookingId,
      tour_id: tourId,
      event_id: event.eventId, // Pour idempotence
    });

    console.log(
      `🎁 ${totalPointsEarned} points attribués à ${userId} (${basePoints} base + ${bonusPoints} bonus)`
    );

    // 7. PUBLIER événement "loyalty.points.earned"
    await publish("loyalty.points.earned", {
      userId,
      accountId: loyaltyAccount.id,
      pointsEarned: totalPointsEarned,
      totalPoints: loyaltyAccount.total_points,
      currentTier: loyaltyAccount.current_tier,
      bookingId,
      tourId,
      tourName,
      earnedAt: new Date().toISOString(),
    });

    // 8. Si upgrade de niveau, publier événement
    if (newTier !== previousTier) {
      await publish("loyalty.tier.upgraded", {
        userId,
        previousTier,
        newTier,
        totalPoints: loyaltyAccount.total_points,
        upgradedAt: new Date().toISOString(),
      });

      console.log(`🌟 Upgrade de niveau: ${previousTier} → ${newTier}`);
    }
  } catch (error) {
    console.error("Erreur lors de l'attribution des points:", error);
    // Publier événement d'échec pour retry ultérieur
    await publish("loyalty.points.failed", {
      userId,
      bookingId,
      error: error.message,
    });
  }
});

// Fonction de calcul des points de base (1 point par dollar dépensé)
function calculateBasePoints(totalPrice) {
  return Math.floor(totalPrice);
}

// Fonction de calcul des bonus
function calculateBonusPoints({
  tourCategory,
  tourDuration,
  tourRating,
  currentTier,
}) {
  let bonus = 0;

  // Bonus par catégorie
  const categoryBonus = {
    city_tour: 10,
    adventure: 20,
    cultural: 15,
    food: 12,
  };
  bonus += categoryBonus[tourCategory] || 0;

  // Bonus par durée (5 points par heure)
  bonus += tourDuration * 5;

  // Bonus si excellente note (5 étoiles)
  if (tourRating === 5) {
    bonus += 50;
  }

  // Multiplicateur par niveau
  const tierMultiplier = {
    bronze: 1,
    silver: 1.2,
    gold: 1.5,
    platinum: 2,
  };
  bonus = Math.floor(bonus * (tierMultiplier[currentTier] || 1));

  return bonus;
}

// Fonction de calcul du niveau
function calculateTier(totalPoints) {
  if (totalPoints >= 5000) return "platinum";
  if (totalPoints >= 2000) return "gold";
  if (totalPoints >= 500) return "silver";
  return "bronze";
}
```

---

##### C. Consumer Secondaire : Notification Service

```javascript
// notification-service/consumers/loyaltyConsumer.js

// Notification quand des points sont gagnés
subscribe("loyalty.points.earned", async (event) => {
  const { userId, pointsEarned, totalPoints, tourName } = event.data;

  const user = await UserService.getUser(userId);

  await EmailService.send({
    to: user.email,
    subject: `🎁 Vous avez gagné ${pointsEarned} points de fidélité !`,
    template: "loyalty-points-earned",
    data: {
      userName: user.name,
      pointsEarned,
      totalPoints,
      tourName,
    },
  });

  console.log(`📧 Email de points envoyé à ${user.email}`);
});

// Notification quand upgrade de niveau
subscribe("loyalty.tier.upgraded", async (event) => {
  const { userId, newTier, totalPoints } = event.data;

  const user = await UserService.getUser(userId);
  const tierPerks = await getTierPerks(newTier);

  await EmailService.send({
    to: user.email,
    subject: `🌟 Félicitations ! Vous êtes maintenant ${newTier.toUpperCase()} !`,
    template: "loyalty-tier-upgraded",
    data: {
      userName: user.name,
      newTier,
      totalPoints,
      perks: tierPerks,
    },
  });

  console.log(`🎉 Email d'upgrade envoyé à ${user.email}`);
});
```

---

#### Flux Complet Événementiel

```
┌────────────────────────────────────────────────────────────────┐
│              FLUX COMPLET - PROGRAMME DE FIDÉLITÉ              │
└────────────────────────────────────────────────────────────────┘

1. Tour Completion Service (Cron quotidien 2h AM)
   └──> Vérifie tours de la veille
   └──> PUBLIE "tour.completed" 📨
        {userId, bookingId, tourId, totalPrice, ...}

2. Event Broker (RabbitMQ)
   └──> Distribue à tous les abonnés

3. Loyalty Program Service (Consumer)
   ├──> Calcule points (base + bonus)
   ├──> Met à jour compte fidélité
   ├──> Vérifie upgrade de niveau
   ├──> Enregistre transaction
   └──> PUBLIE "loyalty.points.earned" 📨
        └──> Si upgrade: PUBLIE "loyalty.tier.upgraded" 📨

4. Notification Service (Consumer)
   ├──> Reçoit "loyalty.points.earned"
   │    └──> Envoie email: "Vous avez gagné 275 points !"
   │
   └──> Reçoit "loyalty.tier.upgraded"
        └──> Envoie email: "Félicitations, vous êtes Gold !"

5. Frontend (WebSocket optionnel)
   └──> Notification temps réel: "🎁 +275 points"
```

---

#### Avantages de cette Architecture

| Avantage                        | Explication                                                        |
| ------------------------------- | ------------------------------------------------------------------ |
| **Zéro modification existante** | Aucun service existant n'a besoin d'être modifié                   |
| **Découplage total**            | Loyalty Service ne connaît pas Booking/Tour Services               |
| **Extensibilité**               | Facile d'ajouter de nouvelles règles de points                     |
| **Idempotence**                 | Impossible d'attribuer des points en double (event_id unique)      |
| **Auditabilité**                | Chaque transaction de points est liée à un événement               |
| **Scalabilité**                 | Loyalty Service peut scaler indépendamment                         |
| **Résilience**                  | Si Loyalty Service down, événements s'accumulent et sont retraités |

---

### Exemple d'API REST du Loyalty Service (Lecture uniquement)

```javascript
// loyalty-service/routes/loyalty.js

// Consulter son compte de fidélité
router.get("/loyalty/account", authenticate, async (req, res) => {
  const account = await LoyaltyAccountModel.findOne({
    where: { user_id: req.user.id },
  });

  if (!account) {
    return res.status(404).json({ error: "Compte de fidélité non trouvé" });
  }

  const tierInfo = await LoyaltyTierModel.findByPk(account.current_tier);

  res.json({
    account: {
      totalPoints: account.total_points,
      lifetimePoints: account.lifetime_points,
      currentTier: account.current_tier,
      tierSince: account.tier_since,
      perks: tierInfo.perks,
      discountPercentage: tierInfo.discount_percentage,
    },
    progress: {
      nextTier: getNextTier(account.current_tier),
      pointsToNextTier: calculatePointsToNextTier(account.total_points),
    },
  });
});

// Historique des transactions
router.get("/loyalty/transactions", authenticate, async (req, res) => {
  const account = await LoyaltyAccountModel.findOne({
    where: { user_id: req.user.id },
  });

  const transactions = await LoyaltyTransactionModel.findAll({
    where: { account_id: account.id },
    order: [["created_at", "DESC"]],
    limit: 50,
  });

  res.json({ transactions });
});
```

---

### Conclusion de l'Exercice 3

**Ce que nous avons démontré** :

✅ **Extension sans modification** : Le Loyalty Program a été ajouté sans toucher au Booking ou Tour Service

✅ **Architecture événementielle** : Utilisation d'événements pour déclencher l'attribution de points

✅ **Nouveau producteur** : Tour Completion Service crée l'événement `tour.completed`

✅ **Consumer pur** : Loyalty Service consomme uniquement, ne bloque aucun flux existant

✅ **Idempotence** : Protection contre la double attribution via `event_id`

✅ **Cascades d'événements** : `tour.completed` → `loyalty.points.earned` → `loyalty.tier.upgraded` → notifications

**Cette approche illustre parfaitement la puissance de l'architecture event-driven pour l'extensibilité.**

---

## Ressources Complémentaires

- 📖 [Martin Fowler - Event-Driven Architecture](https://martinfowler.com/articles/201701-event-driven.html)
- 📖 [Microservices Patterns - Saga Pattern](https://microservices.io/patterns/data/saga.html)
- 🎥 [GOTO 2017 - The Many Meanings of Event-Driven Architecture](https://www.youtube.com/watch?v=STKCRSUsyP0)
- 📖 [AWS - Event-Driven Architecture Best Practices](https://aws.amazon.com/event-driven-architecture/)
