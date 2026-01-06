# Exercices - Leçon 4.3 Gestion des Callbacks et Webhooks de Paiement

## Exercice 1 : Webhook Handler Basique

### Énoncé

Créez un endpoint webhook simple qui log les événements reçus. Simulez l'envoi d'un webhook avec curl ou Postman.

### Solution

#### 1. Création de l'endpoint basique

```javascript
// payment-gateway-service/src/routes/webhook.routes.js

import express from "express";

const router = express.Router();

/**
 * Endpoint webhook basique pour le développement
 * Accepte tous les événements et les log
 *
 * @route POST /api/v1/payment-gateway/webhooks/test
 */
router.post("/test", express.json(), async (req, res) => {
  console.log("=== WEBHOOK RECEIVED ===");
  console.log("Headers:", JSON.stringify(req.headers, null, 2));
  console.log("Body:", JSON.stringify(req.body, null, 2));
  console.log("========================");

  // Extraire les informations clés si c'est un événement Stripe
  const { type, id, data } = req.body;

  if (type) {
    console.log(`Event Type: ${type}`);
    console.log(`Event ID: ${id}`);

    // Log spécifique selon le type d'événement
    switch (type) {
      case "payment_intent.succeeded":
        console.log("✅ Payment succeeded!");
        console.log(
          `  Amount: ${
            data.object.amount / 100
          } ${data.object.currency.toUpperCase()}`
        );
        console.log(`  Payment Intent ID: ${data.object.id}`);
        break;

      case "payment_intent.payment_failed":
        console.log("❌ Payment failed!");
        console.log(
          `  Error: ${data.object.last_payment_error?.message || "Unknown"}`
        );
        break;

      case "charge.refunded":
        console.log("💰 Charge refunded!");
        console.log(`  Amount refunded: ${data.object.amount_refunded / 100}`);
        break;

      default:
        console.log(`ℹ️ Unhandled event type: ${type}`);
    }
  }

  // Toujours retourner 200 pour acquitter la réception
  res.status(200).json({
    received: true,
    eventType: type || "unknown",
    timestamp: new Date().toISOString(),
  });
});

export default router;
```

#### 2. Test avec curl

```bash
# Simuler un événement payment_intent.succeeded
curl -X POST http://localhost:3003/api/v1/payment-gateway/webhooks/test \
  -H "Content-Type: application/json" \
  -d '{
    "id": "evt_test_123456789",
    "type": "payment_intent.succeeded",
    "data": {
      "object": {
        "id": "pi_test_123",
        "amount": 29999,
        "currency": "eur",
        "status": "succeeded",
        "metadata": {
          "bookingId": "booking-abc-123"
        }
      }
    }
  }'

# Simuler un événement payment_intent.payment_failed
curl -X POST http://localhost:3003/api/v1/payment-gateway/webhooks/test \
  -H "Content-Type: application/json" \
  -d '{
    "id": "evt_test_failed_123",
    "type": "payment_intent.payment_failed",
    "data": {
      "object": {
        "id": "pi_test_456",
        "amount": 29999,
        "currency": "eur",
        "status": "requires_payment_method",
        "last_payment_error": {
          "code": "card_declined",
          "message": "Your card was declined."
        }
      }
    }
  }'

# Simuler un remboursement
curl -X POST http://localhost:3003/api/v1/payment-gateway/webhooks/test \
  -H "Content-Type: application/json" \
  -d '{
    "id": "evt_test_refund_789",
    "type": "charge.refunded",
    "data": {
      "object": {
        "id": "ch_test_789",
        "amount": 29999,
        "amount_refunded": 29999,
        "refunded": true,
        "payment_intent": "pi_test_123"
      }
    }
  }'
```

#### 3. Test avec Postman

1. **Créer une nouvelle requête POST**

   - URL: `http://localhost:3003/api/v1/payment-gateway/webhooks/test`

2. **Headers**

   - Content-Type: `application/json`

3. **Body (raw JSON)**

```json
{
  "id": "evt_test_postman_001",
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_test_abc123",
      "payment_intent": "pi_test_xyz789",
      "amount_total": 29999,
      "currency": "eur",
      "metadata": {
        "booking_id": "booking-postman-test"
      }
    }
  }
}
```

4. **Réponse attendue**

```json
{
  "received": true,
  "eventType": "checkout.session.completed",
  "timestamp": "2026-01-06T14:30:00.000Z"
}
```

#### 4. Version améliorée avec logging structuré

```javascript
// payment-gateway-service/src/routes/webhook.routes.js (version améliorée)

import express from "express";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

// Store des événements pour debug (en mémoire)
const eventLog = [];

router.post("/test", express.json(), async (req, res) => {
  const receivedAt = new Date();
  const requestId = uuidv4();

  const logEntry = {
    requestId,
    receivedAt: receivedAt.toISOString(),
    headers: {
      "content-type": req.headers["content-type"],
      "stripe-signature": req.headers["stripe-signature"] || "not-present",
      "user-agent": req.headers["user-agent"],
    },
    event: {
      id: req.body.id || "unknown",
      type: req.body.type || "unknown",
      created: req.body.created,
      data: req.body.data,
    },
  };

  // Ajouter au log en mémoire (garder les 100 derniers)
  eventLog.unshift(logEntry);
  if (eventLog.length > 100) eventLog.pop();

  // Log formaté dans la console
  console.log("\n" + "=".repeat(60));
  console.log(`📨 WEBHOOK RECEIVED [${requestId}]`);
  console.log("=".repeat(60));
  console.log(`⏰ Time: ${receivedAt.toLocaleString()}`);
  console.log(`📋 Event Type: ${logEntry.event.type}`);
  console.log(`🆔 Event ID: ${logEntry.event.id}`);
  console.log(
    `📦 Payload: ${JSON.stringify(req.body.data?.object, null, 2).substring(
      0,
      500
    )}...`
  );
  console.log("=".repeat(60) + "\n");

  res.status(200).json({
    received: true,
    requestId,
    eventType: logEntry.event.type,
  });
});

// Endpoint pour voir les logs (debug)
router.get("/test/logs", (req, res) => {
  res.json({
    count: eventLog.length,
    events: eventLog.slice(0, 20), // 20 derniers
  });
});

// Endpoint pour vider les logs
router.delete("/test/logs", (req, res) => {
  eventLog.length = 0;
  res.json({ message: "Logs cleared" });
});

export default router;
```

---

## Exercice 2 : Vérification de Signature Stripe

### Énoncé

Intégrez la vérification de signature Stripe dans votre webhook handler. Testez avec `stripe listen --forward-to`.

### Solution

#### 1. Configuration préalable

```bash
# Installer Stripe CLI
# Sur macOS:
brew install stripe/stripe-cli/stripe

# Sur Windows (avec Scoop):
scoop install stripe

# Ou télécharger depuis: https://stripe.com/docs/stripe-cli
```

```bash
# Se connecter à Stripe
stripe login

# Récupérer le webhook secret
stripe listen --print-secret
# Output: whsec_xxxxxxxxxxxxx

# Ajouter au .env
echo "STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx" >> .env
```

#### 2. Webhook Handler avec vérification de signature

```javascript
// payment-gateway-service/src/routes/webhook.routes.js

import express from "express";
import Stripe from "stripe";

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Endpoint webhook sécurisé avec vérification de signature
 *
 * IMPORTANT: Utiliser express.raw() pour recevoir le body brut
 * La signature est calculée sur le body RAW, pas le JSON parsé
 *
 * @route POST /api/v1/payment-gateway/webhooks/stripe
 */
router.post(
  "/stripe",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    // 1. Vérifier que la signature est présente
    if (!signature) {
      console.error("❌ Missing stripe-signature header");
      return res.status(400).json({
        error: "Missing signature",
        message: "stripe-signature header is required",
      });
    }

    // 2. Vérifier que le webhook secret est configuré
    if (!webhookSecret) {
      console.error("❌ STRIPE_WEBHOOK_SECRET not configured");
      return res.status(500).json({
        error: "Server configuration error",
        message: "Webhook secret not configured",
      });
    }

    let event;

    try {
      // 3. Vérifier la signature et construire l'événement
      event = stripe.webhooks.constructEvent(
        req.body, // Body RAW (Buffer)
        signature, // Signature du header
        webhookSecret // Notre secret
      );

      console.log("✅ Signature verified successfully");
      console.log(`📨 Event: ${event.type} (${event.id})`);
    } catch (err) {
      console.error("❌ Signature verification failed:", err.message);

      // Détailler l'erreur pour le debug
      if (err.type === "StripeSignatureVerificationError") {
        return res.status(400).json({
          error: "Invalid signature",
          message: err.message,
          hint: "Make sure STRIPE_WEBHOOK_SECRET matches the endpoint secret in Stripe Dashboard",
        });
      }

      return res.status(400).json({
        error: "Webhook error",
        message: err.message,
      });
    }

    // 4. Traiter l'événement vérifié
    try {
      await handleStripeEvent(event);
      res.status(200).json({ received: true, eventId: event.id });
    } catch (processingError) {
      console.error("❌ Error processing event:", processingError);
      res.status(500).json({
        received: true,
        error: processingError.message,
      });
    }
  }
);

/**
 * Handler des événements Stripe
 */
async function handleStripeEvent(event) {
  const { type, data } = event;

  console.log(`\n${"─".repeat(50)}`);
  console.log(`Processing: ${type}`);
  console.log(`${"─".repeat(50)}`);

  switch (type) {
    case "payment_intent.succeeded":
      console.log("✅ Payment Intent Succeeded");
      console.log(`   ID: ${data.object.id}`);
      console.log(
        `   Amount: ${
          data.object.amount / 100
        } ${data.object.currency.toUpperCase()}`
      );
      console.log(`   Customer: ${data.object.customer || "N/A"}`);
      console.log(`   Metadata:`, data.object.metadata);
      // Ici, appeler votre PaymentService ou BookingClient
      break;

    case "payment_intent.payment_failed":
      console.log("❌ Payment Intent Failed");
      console.log(`   ID: ${data.object.id}`);
      console.log(`   Error: ${data.object.last_payment_error?.message}`);
      console.log(`   Code: ${data.object.last_payment_error?.code}`);
      break;

    case "checkout.session.completed":
      console.log("🛒 Checkout Session Completed");
      console.log(`   Session ID: ${data.object.id}`);
      console.log(`   Payment Intent: ${data.object.payment_intent}`);
      console.log(`   Amount: ${data.object.amount_total / 100}`);
      console.log(`   Metadata:`, data.object.metadata);
      break;

    case "charge.refunded":
      console.log("💰 Charge Refunded");
      console.log(`   Charge ID: ${data.object.id}`);
      console.log(`   Refunded: ${data.object.amount_refunded / 100}`);
      console.log(`   Full refund: ${data.object.refunded}`);
      break;

    case "charge.dispute.created":
      console.log("⚠️ DISPUTE CREATED");
      console.log(`   Charge ID: ${data.object.charge}`);
      console.log(`   Amount: ${data.object.amount / 100}`);
      console.log(`   Reason: ${data.object.reason}`);
      break;

    default:
      console.log(`ℹ️ Unhandled event type: ${type}`);
  }

  console.log(`${"─".repeat(50)}\n`);
}

export default router;
```

#### 3. Configuration Express importante

```javascript
// payment-gateway-service/src/app.js

import express from "express";
import webhookRoutes from "./routes/webhook.routes.js";

const app = express();

// IMPORTANT: Les routes webhook doivent être AVANT express.json()
// Car elles ont besoin du body RAW pour la vérification de signature
app.use("/api/v1/payment-gateway/webhooks", webhookRoutes);

// Après, on peut utiliser express.json() pour les autres routes
app.use(express.json());

// Autres routes...
app.use("/api/v1/payment-gateway/payments", paymentRoutes);

export default app;
```

#### 4. Test avec Stripe CLI

```bash
# Terminal 1: Démarrer votre serveur
npm run dev

# Terminal 2: Lancer Stripe CLI pour forwarder les webhooks
stripe listen --forward-to localhost:3003/api/v1/payment-gateway/webhooks/stripe

# Output:
# > Ready! Your webhook signing secret is whsec_xxxxxxxx (^C to quit)
# Note: Utilisez ce secret dans votre .env

# Terminal 3: Déclencher des événements de test
stripe trigger payment_intent.succeeded
stripe trigger payment_intent.payment_failed
stripe trigger checkout.session.completed
stripe trigger charge.refunded
```

#### 5. Test avec un payload invalide (signature incorrecte)

```bash
# Envoyer un webhook sans signature
curl -X POST http://localhost:3003/api/v1/payment-gateway/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"type":"payment_intent.succeeded"}'

# Réponse attendue:
# { "error": "Missing signature", "message": "stripe-signature header is required" }

# Envoyer avec une signature invalide
curl -X POST http://localhost:3003/api/v1/payment-gateway/webhooks/stripe \
  -H "Content-Type: application/json" \
  -H "stripe-signature: t=123,v1=invalid" \
  -d '{"type":"payment_intent.succeeded"}'

# Réponse attendue:
# { "error": "Invalid signature", "message": "No signatures found matching..." }
```

---

## Exercice 3 : Simulation de Mise à Jour du Booking Service

### Énoncé

Créez un mock du Booking Service et implémentez la communication depuis le Payment Gateway Service lors de la réception d'un webhook.

### Solution

#### 1. Mock Booking Service

```javascript
// mock-booking-service/server.js

import express from "express";

const app = express();
app.use(express.json());

// Base de données en mémoire
const bookings = new Map();

// Initialiser quelques réservations de test
bookings.set("booking-123", {
  id: "booking-123",
  tourId: "tour-456",
  tourName: "Safari Kenya",
  customerId: "cust-789",
  customerEmail: "tony@avengers.com",
  numberOfGuests: 2,
  totalAmount: 599.98,
  currency: "EUR",
  status: "pending",
  createdAt: new Date().toISOString(),
});

bookings.set("booking-456", {
  id: "booking-456",
  tourId: "tour-789",
  tourName: "Tour Eiffel VIP",
  customerId: "cust-123",
  customerEmail: "natasha@avengers.com",
  numberOfGuests: 1,
  totalAmount: 149.99,
  currency: "EUR",
  status: "pending",
  createdAt: new Date().toISOString(),
});

// Middleware pour vérifier le token inter-service
const verifyServiceToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const serviceName = req.headers["x-service-name"];

  console.log(`📥 Request from: ${serviceName || "unknown"}`);

  // En production, vérifier vraiment le token
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
};

// GET /api/v1/bookings/:id
app.get("/api/v1/bookings/:id", verifyServiceToken, (req, res) => {
  const booking = bookings.get(req.params.id);

  if (!booking) {
    return res.status(404).json({
      success: false,
      error: { code: "NOT_FOUND", message: "Booking not found" },
    });
  }

  res.json({ success: true, data: booking });
});

// PUT /api/v1/bookings/:id/payment-status
app.put(
  "/api/v1/bookings/:id/payment-status",
  verifyServiceToken,
  (req, res) => {
    const { id } = req.params;
    const { status, paymentIntentId, paidAt, refundedAt } = req.body;

    console.log(`\n${"=".repeat(50)}`);
    console.log(`📝 UPDATE BOOKING STATUS`);
    console.log(`${"=".repeat(50)}`);
    console.log(`Booking ID: ${id}`);
    console.log(`New Status: ${status}`);
    console.log(`Payment Intent: ${paymentIntentId || "N/A"}`);
    console.log(`Request from: ${req.headers["x-service-name"]}`);
    console.log(`Request ID: ${req.headers["x-request-id"]}`);

    const booking = bookings.get(id);

    if (!booking) {
      console.log(`❌ Booking ${id} not found`);
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: `Booking ${id} not found` },
      });
    }

    // Valider la transition d'état
    const validTransitions = {
      pending: ["confirmed", "cancelled"],
      confirmed: ["cancelled", "partially_refunded", "refunded"],
      partially_refunded: ["refunded", "cancelled"],
    };

    if (!validTransitions[booking.status]?.includes(status)) {
      console.log(`❌ Invalid transition: ${booking.status} → ${status}`);
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_TRANSITION",
          message: `Cannot transition from ${booking.status} to ${status}`,
        },
      });
    }

    // Mettre à jour
    const previousStatus = booking.status;
    booking.status = status;

    if (paymentIntentId) booking.paymentIntentId = paymentIntentId;
    if (paidAt) booking.paidAt = paidAt;
    if (refundedAt) booking.refundedAt = refundedAt;

    booking.updatedAt = new Date().toISOString();

    bookings.set(id, booking);

    console.log(`✅ Status updated: ${previousStatus} → ${status}`);
    console.log(`${"=".repeat(50)}\n`);

    res.json({ success: true, data: booking });
  }
);

// Liste toutes les réservations (debug)
app.get("/api/v1/bookings", (req, res) => {
  res.json({
    success: true,
    data: Array.from(bookings.values()),
  });
});

const PORT = process.env.BOOKING_SERVICE_PORT || 3001;

app.listen(PORT, () => {
  console.log(`\n🏨 Mock Booking Service running on port ${PORT}`);
  console.log(`   Bookings initialized: ${bookings.size}`);
  console.log(
    `   Available booking IDs: ${Array.from(bookings.keys()).join(", ")}\n`
  );
});
```

#### 2. BookingClient dans Payment Gateway Service

```javascript
// payment-gateway-service/src/clients/BookingClient.js

import axios from "axios";

class BookingClient {
  constructor(config = {}) {
    this.baseUrl =
      config.baseUrl ||
      process.env.BOOKING_SERVICE_URL ||
      "http://localhost:3001";
    this.serviceToken =
      config.serviceToken || process.env.INTERNAL_SERVICE_TOKEN || "dev-token";
    this.timeout = config.timeout || 5000;
    this.retries = config.retries || 3;
  }

  async updateBookingStatus(bookingId, updateData) {
    const url = `${this.baseUrl}/api/v1/bookings/${bookingId}/payment-status`;
    const requestId = `pg-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    console.log(`\n📤 Calling Booking Service`);
    console.log(`   URL: ${url}`);
    console.log(`   Request ID: ${requestId}`);
    console.log(`   Data:`, updateData);

    let lastError;

    for (let attempt = 1; attempt <= this.retries; attempt++) {
      try {
        const response = await axios.put(url, updateData, {
          timeout: this.timeout,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.serviceToken}`,
            "X-Service-Name": "payment-gateway-service",
            "X-Request-Id": requestId,
          },
        });

        console.log(`✅ Booking Service responded (attempt ${attempt})`);
        console.log(`   Status: ${response.status}`);
        return response.data;
      } catch (error) {
        lastError = error;
        console.error(
          `❌ Attempt ${attempt}/${this.retries} failed:`,
          error.message
        );

        if (error.response) {
          console.error(`   Status: ${error.response.status}`);
          console.error(`   Data:`, error.response.data);

          // Ne pas retry pour les erreurs 4xx (sauf 429)
          if (
            error.response.status >= 400 &&
            error.response.status < 500 &&
            error.response.status !== 429
          ) {
            throw error;
          }
        }

        // Attendre avant le retry (backoff exponentiel)
        if (attempt < this.retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.log(`   Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  async getBooking(bookingId) {
    const url = `${this.baseUrl}/api/v1/bookings/${bookingId}`;

    try {
      const response = await axios.get(url, {
        timeout: this.timeout,
        headers: {
          Authorization: `Bearer ${this.serviceToken}`,
          "X-Service-Name": "payment-gateway-service",
        },
      });

      return response.data.data;
    } catch (error) {
      console.error(`Failed to get booking ${bookingId}:`, error.message);
      throw error;
    }
  }
}

export default BookingClient;
```

#### 3. Intégration dans WebhookService

```javascript
// payment-gateway-service/src/services/WebhookService.js

import BookingClient from "../clients/BookingClient.js";

class WebhookService {
  constructor() {
    this.bookingClient = new BookingClient();
    this.processedEvents = new Set(); // Idempotence simple en mémoire
  }

  async handleStripeEvent(event) {
    const { type, id } = event;

    // Vérification idempotence
    if (this.processedEvents.has(id)) {
      console.log(`⏭️ Event ${id} already processed, skipping`);
      return { skipped: true };
    }

    console.log(`\n${"*".repeat(60)}`);
    console.log(`🔄 Processing webhook event: ${type}`);
    console.log(`${"*".repeat(60)}`);

    try {
      let result;

      switch (type) {
        case "payment_intent.succeeded":
          result = await this.handlePaymentSucceeded(event.data.object);
          break;
        case "payment_intent.payment_failed":
          result = await this.handlePaymentFailed(event.data.object);
          break;
        case "charge.refunded":
          result = await this.handleRefund(event.data.object);
          break;
        default:
          console.log(`ℹ️ Event type ${type} not handled`);
          result = { handled: false };
      }

      // Marquer comme traité
      this.processedEvents.add(id);

      // Nettoyer les vieux événements (garder les 1000 derniers)
      if (this.processedEvents.size > 1000) {
        const firstEvent = this.processedEvents.values().next().value;
        this.processedEvents.delete(firstEvent);
      }

      return result;
    } catch (error) {
      console.error(`❌ Error processing event ${id}:`, error.message);
      throw error;
    }
  }

  async handlePaymentSucceeded(paymentIntent) {
    const { id, metadata, amount, currency } = paymentIntent;
    const bookingId = metadata?.bookingId || metadata?.booking_id;

    console.log(`\n💳 Payment Intent Succeeded`);
    console.log(`   Payment Intent ID: ${id}`);
    console.log(`   Booking ID: ${bookingId}`);
    console.log(`   Amount: ${amount / 100} ${currency.toUpperCase()}`);

    if (!bookingId) {
      console.log("⚠️ No booking ID in metadata, skipping booking update");
      return { success: true, bookingUpdated: false };
    }

    // Mettre à jour le Booking Service
    try {
      const result = await this.bookingClient.updateBookingStatus(bookingId, {
        status: "confirmed",
        paymentIntentId: id,
        paidAt: new Date().toISOString(),
      });

      console.log(`✅ Booking ${bookingId} confirmed successfully`);
      return { success: true, bookingUpdated: true, booking: result.data };
    } catch (error) {
      console.error(`❌ Failed to update booking ${bookingId}:`, error.message);

      // Décider comment gérer l'échec
      // Option 1: Échouer le webhook (Stripe réessaiera)
      // Option 2: Logger et continuer (risque de désynchronisation)

      // Pour cet exercice, on log et continue
      // En production, utiliser une queue de retry
      return { success: true, bookingUpdated: false, error: error.message };
    }
  }

  async handlePaymentFailed(paymentIntent) {
    const { id, metadata, last_payment_error } = paymentIntent;
    const bookingId = metadata?.bookingId || metadata?.booking_id;

    console.log(`\n❌ Payment Intent Failed`);
    console.log(`   Payment Intent ID: ${id}`);
    console.log(`   Booking ID: ${bookingId}`);
    console.log(`   Error: ${last_payment_error?.message}`);

    // Pour un échec, on ne change pas le statut de la réservation
    // Elle reste "pending" et l'utilisateur peut réessayer

    return { success: true, error: last_payment_error };
  }

  async handleRefund(charge) {
    const { payment_intent, amount_refunded, refunded } = charge;

    console.log(`\n💰 Refund Processed`);
    console.log(`   Payment Intent: ${payment_intent}`);
    console.log(`   Amount Refunded: ${amount_refunded / 100}`);
    console.log(`   Full Refund: ${refunded}`);

    // Pour un remboursement, on devrait trouver la réservation
    // via le payment_intent et mettre à jour son statut

    return { success: true, refunded };
  }
}

export default WebhookService;
```

#### 4. Test complet du flux

```bash
# Terminal 1: Démarrer le Mock Booking Service
node mock-booking-service/server.js

# Terminal 2: Démarrer le Payment Gateway Service
npm run dev

# Terminal 3: Lancer Stripe CLI
stripe listen --forward-to localhost:3003/api/v1/payment-gateway/webhooks/stripe

# Terminal 4: Déclencher un paiement réussi avec metadata
stripe trigger payment_intent.succeeded \
  --add payment_intent:metadata.bookingId=booking-123
```

#### 5. Vérifier le résultat

```bash
# Vérifier le statut de la réservation après le webhook
curl http://localhost:3001/api/v1/bookings/booking-123 \
  -H "Authorization: Bearer dev-token"

# Réponse attendue:
{
  "success": true,
  "data": {
    "id": "booking-123",
    "tourName": "Safari Kenya",
    "status": "confirmed",        // ← Mis à jour !
    "paymentIntentId": "pi_xxx",  // ← Ajouté !
    "paidAt": "2026-01-06T...",   // ← Ajouté !
    ...
  }
}
```

#### 6. Que retourner en cas d'échec ?

```javascript
// Dans le webhook handler

// ❌ Retourner 500 = Stripe réessaiera (jusqu'à 3 jours)
// Utiliser si l'erreur est temporaire (DB down, service unavailable)
if (error.code === "ECONNREFUSED") {
  return res
    .status(500)
    .json({ received: false, error: "Service unavailable" });
}

// ✅ Retourner 200 = Stripe ne réessaiera pas
// Utiliser si l'erreur est permanente (booking not found, invalid data)
if (error.response?.status === 404) {
  console.error(`Booking not found, acknowledging webhook anyway`);
  return res.status(200).json({ received: true, error: "Booking not found" });
}
```

---

## Points Clés à Retenir

| Exercice  | Concept Clé                  | Bonnes Pratiques                        |
| --------- | ---------------------------- | --------------------------------------- |
| **Ex. 1** | Handler basique              | Logger tous les événements pour debug   |
| **Ex. 2** | Signature Stripe             | Toujours vérifier, body RAW obligatoire |
| **Ex. 3** | Communication inter-services | Retry avec backoff, gérer les échecs    |
