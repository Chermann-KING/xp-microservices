# Exercices - Leçon 4.1 Conception du Microservice d'Intégration de la Passerelle de Paiement

## Exercice 1 : Schéma API Complet (OpenAPI)

### Énoncé

Définissez le schéma JSON complet (format OpenAPI) pour les endpoints `POST /payments/charge` et `POST /payments/refund`. Incluez tous les champs nécessaires, les validations, et les codes d'erreur possibles.

### Solution

```yaml
# openapi.yaml - Payment Gateway Service API
openapi: 3.0.3
info:
  title: Payment Gateway Service API
  description: API de gestion des paiements pour l'application de réservation touristique
  version: 1.0.0
  contact:
    name: Équipe Tourism App
    email: dev@tourismapp.com

servers:
  - url: http://localhost:3004/api/v1/payments
    description: Serveur de développement
  - url: https://api.tourismapp.com/payment-gateway
    description: Serveur de production

tags:
  - name: Payments
    description: Opérations de paiement

paths:
  /payments/charge:
    post:
      tags:
        - Payments
      summary: Créer une nouvelle charge de paiement
      description: |
        Initie un paiement pour une réservation. Cette opération est **idempotente** :
        si une requête avec le même `idempotencyKey` est envoyée plusieurs fois,
        le résultat de la première requête sera retourné.
      operationId: createCharge
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/ChargeRequest"
            examples:
              tourBooking:
                summary: Paiement d'une réservation de tour
                value:
                  amount: 299.99
                  currency: EUR
                  paymentMethodToken: tok_1abc2def3ghi
                  bookingId: 550e8400-e29b-41d4-a716-446655440000
                  customerEmail: tony.stark@avengers.com
                  idempotencyKey: charge-550e8400-e29b-41d4-a716-446655440000-1704067200
      responses:
        "201":
          description: Paiement créé avec succès
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ChargeResponse"
              example:
                success: true
                data:
                  id: txn_123456789
                  externalTransactionId: ch_3abc4def5ghi
                  bookingId: 550e8400-e29b-41d4-a716-446655440000
                  amount: 299.99
                  currency: EUR
                  status: succeeded
                  cardLast4Digits: "4242"
                  cardBrand: visa
                  customerEmail: tony.stark@avengers.com
                  createdAt: "2026-01-06T10:30:00Z"
        "200":
          description: Requête idempotente - Résultat précédent retourné
          content:
            application/json:
              schema:
                allOf:
                  - $ref: "#/components/schemas/ChargeResponse"
                  - type: object
                    properties:
                      cached:
                        type: boolean
                        example: true
        "400":
          description: Erreur de validation
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorResponse"
              examples:
                missingField:
                  summary: Champ requis manquant
                  value:
                    success: false
                    error:
                      code: VALIDATION_ERROR
                      message: "Le champ 'amount' est requis"
                invalidAmount:
                  summary: Montant invalide
                  value:
                    success: false
                    error:
                      code: INVALID_AMOUNT
                      message: "Le montant doit être supérieur à 0"
        "402":
          description: Paiement refusé
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorResponse"
              examples:
                cardDeclined:
                  summary: Carte refusée
                  value:
                    success: false
                    error:
                      code: CARD_DECLINED
                      message: "Votre carte a été refusée"
                      userMessage: "Votre carte a été refusée. Veuillez utiliser une autre méthode de paiement."
                insufficientFunds:
                  summary: Fonds insuffisants
                  value:
                    success: false
                    error:
                      code: INSUFFICIENT_FUNDS
                      message: "Fonds insuffisants sur votre carte"
        "500":
          description: Erreur serveur
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorResponse"

  /payments/refund:
    post:
      tags:
        - Payments
      summary: Rembourser une transaction
      description: |
        Effectue un remboursement total ou partiel d'une transaction existante.
        Seules les transactions en statut `succeeded` peuvent être remboursées.
      operationId: createRefund
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/RefundRequest"
            examples:
              fullRefund:
                summary: Remboursement total
                value:
                  transactionId: txn_123456789
                  reason: "Annulation de la réservation par le client"
              partialRefund:
                summary: Remboursement partiel
                value:
                  transactionId: txn_123456789
                  amount: 100.00
                  reason: "Remboursement partiel suite à modification"
      responses:
        "200":
          description: Remboursement effectué
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/RefundResponse"
              example:
                success: true
                data:
                  refundId: re_1abc2def3ghi
                  transactionId: txn_123456789
                  amount: 299.99
                  status: succeeded
                  createdAt: "2026-01-06T14:00:00Z"
        "400":
          description: Remboursement invalide
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorResponse"
              examples:
                invalidState:
                  summary: Transaction non remboursable
                  value:
                    success: false
                    error:
                      code: INVALID_REFUND_STATE
                      message: "Impossible de rembourser une transaction en statut 'pending'"
                amountTooHigh:
                  summary: Montant trop élevé
                  value:
                    success: false
                    error:
                      code: REFUND_AMOUNT_EXCEEDS_CHARGE
                      message: "Le montant du remboursement dépasse le montant de la charge"
        "404":
          description: Transaction non trouvée
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorResponse"
              example:
                success: false
                error:
                  code: TRANSACTION_NOT_FOUND
                  message: "Transaction txn_invalid123 introuvable"

components:
  schemas:
    ChargeRequest:
      type: object
      required:
        - amount
        - currency
        - paymentMethodToken
        - bookingId
        - customerEmail
        - idempotencyKey
      properties:
        amount:
          type: number
          format: double
          minimum: 0.50
          maximum: 999999.99
          description: Montant à facturer (en unité monétaire)
          example: 299.99
        currency:
          type: string
          minLength: 3
          maxLength: 3
          pattern: "^[A-Z]{3}$"
          description: Code devise ISO 4217
          example: EUR
          enum:
            - EUR
            - USD
            - GBP
        paymentMethodToken:
          type: string
          minLength: 10
          maxLength: 255
          description: Token de paiement Stripe (jamais les données carte brutes)
          example: tok_1abc2def3ghi
        bookingId:
          type: string
          format: uuid
          description: ID de la réservation associée
          example: 550e8400-e29b-41d4-a716-446655440000
        customerEmail:
          type: string
          format: email
          maxLength: 255
          description: Email du client
          example: tony.stark@avengers.com
        idempotencyKey:
          type: string
          minLength: 10
          maxLength: 255
          description: Clé unique pour garantir l'idempotence
          example: charge-550e8400-e29b-41d4-a716-446655440000-1704067200

    ChargeResponse:
      type: object
      properties:
        success:
          type: boolean
          example: true
        data:
          $ref: "#/components/schemas/PaymentTransaction"
        cached:
          type: boolean
          description: Indique si le résultat provient du cache (idempotence)
          example: false

    RefundRequest:
      type: object
      required:
        - transactionId
      properties:
        transactionId:
          type: string
          description: ID de la transaction à rembourser
          example: txn_123456789
        amount:
          type: number
          format: double
          minimum: 0.50
          description: Montant à rembourser (optionnel, remboursement total si omis)
          example: 100.00
        reason:
          type: string
          maxLength: 500
          description: Raison du remboursement
          example: "Annulation de la réservation"

    RefundResponse:
      type: object
      properties:
        success:
          type: boolean
          example: true
        data:
          type: object
          properties:
            refundId:
              type: string
              example: re_1abc2def3ghi
            transactionId:
              type: string
              example: txn_123456789
            amount:
              type: number
              example: 299.99
            status:
              type: string
              enum: [succeeded, pending, failed]
              example: succeeded
            createdAt:
              type: string
              format: date-time

    PaymentTransaction:
      type: object
      properties:
        id:
          type: string
          description: ID interne de la transaction
          example: txn_123456789
        externalTransactionId:
          type: string
          description: ID de la passerelle (Stripe)
          example: ch_3abc4def5ghi
        bookingId:
          type: string
          format: uuid
          example: 550e8400-e29b-41d4-a716-446655440000
        amount:
          type: number
          example: 299.99
        currency:
          type: string
          example: EUR
        status:
          type: string
          enum:
            [pending, succeeded, failed, refunded, partially_refunded, disputed]
          example: succeeded
        paymentMethodType:
          type: string
          example: card
        cardLast4Digits:
          type: string
          example: "4242"
        cardBrand:
          type: string
          example: visa
        customerEmail:
          type: string
          example: tony.stark@avengers.com
        errorCode:
          type: string
          nullable: true
        errorMessage:
          type: string
          nullable: true
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time

    ErrorResponse:
      type: object
      properties:
        success:
          type: boolean
          example: false
        error:
          type: object
          properties:
            code:
              type: string
              description: Code d'erreur machine-readable
              example: CARD_DECLINED
            message:
              type: string
              description: Message technique
              example: "La carte a été refusée par l'émetteur"
            userMessage:
              type: string
              description: Message à afficher à l'utilisateur
              example: "Votre carte a été refusée. Veuillez utiliser une autre méthode de paiement."
```

---

## Exercice 2 : Génération de Clés d'Idempotence

### Énoncé

Décrivez une stratégie pour que le Booking Management Service génère des clés d'idempotence uniques et cohérentes. Expliquez pourquoi un simple UUID généré aléatoirement pourrait ne pas être suffisant.

### Solution

#### Pourquoi un UUID aléatoire n'est pas suffisant ?

Un UUID aléatoire (`uuid.v4()`) présente plusieurs problèmes :

1. **Non-déterministe** : Chaque appel génère un nouvel UUID, donc si le client retry, il aura une nouvelle clé → double charge !
2. **Pas de corrélation** : Impossible de lier la clé à l'opération métier
3. **Debugging difficile** : Pas de contexte dans la clé

```javascript
// ❌ MAUVAIS : UUID aléatoire
const idempotencyKey = uuid.v4(); // "a1b2c3d4-e5f6-..."
// Si le client retry, il génère un NOUVEAU UUID → double charge !
```

#### Stratégie recommandée : Clé composite déterministe

La clé d'idempotence doit être **déterministe** et **corrélée à l'opération**.

```javascript
// booking-management-service/src/services/BookingService.js

/**
 * Génère une clé d'idempotence déterministe pour les paiements
 *
 * Format: {operation}-{bookingId}-{version}
 *
 * @param {string} bookingId - ID de la réservation
 * @param {string} operation - Type d'opération (charge, refund)
 * @param {number} version - Version de l'opération (pour gérer les modifications)
 * @returns {string} Clé d'idempotence
 */
function generateIdempotencyKey(bookingId, operation, version = 1) {
  // Validation des entrées
  if (!bookingId || !operation) {
    throw new Error("bookingId et operation sont requis");
  }

  // Format déterministe : même entrées = même clé
  return `${operation}-${bookingId}-v${version}`;
}

// Exemples d'utilisation
class BookingService {
  async processBookingPayment(bookingId) {
    const booking = await this.bookingRepository.findById(bookingId);

    // La clé est déterministe basée sur le booking
    // Si on retry avec le même bookingId, on obtient la MÊME clé
    const idempotencyKey = generateIdempotencyKey(
      bookingId,
      "charge",
      booking.paymentVersion || 1
    );

    // Appel au Payment Gateway
    const result = await this.paymentGatewayClient.charge({
      amount: booking.totalAmount,
      currency: booking.currency,
      paymentMethodToken: booking.paymentToken,
      bookingId,
      idempotencyKey, // Clé déterministe !
    });

    return result;
  }

  async processBookingRefund(bookingId, amount = null) {
    const booking = await this.bookingRepository.findById(bookingId);

    // Pour les remboursements, inclure un compteur de refund
    const refundCount = booking.refundCount || 0;
    const idempotencyKey = generateIdempotencyKey(
      bookingId,
      "refund",
      refundCount + 1
    );

    const result = await this.paymentGatewayClient.refund({
      transactionId: booking.paymentTransactionId,
      amount,
      idempotencyKey,
    });

    // Incrémenter le compteur de refund
    await this.bookingRepository.update(bookingId, {
      refundCount: refundCount + 1,
    });

    return result;
  }
}
```

#### Stratégies avancées

```javascript
// Stratégie 1 : Hash de l'opération complète
import crypto from "crypto";

function generateIdempotencyKeyFromPayload(payload) {
  const { bookingId, amount, operation } = payload;
  const data = `${operation}:${bookingId}:${amount}`;
  return crypto
    .createHash("sha256")
    .update(data)
    .digest("hex")
    .substring(0, 32);
}

// Stratégie 2 : Timestamp arrondi (pour les opérations dans une fenêtre de temps)
function generateIdempotencyKeyWithTimeWindow(
  bookingId,
  operation,
  windowMinutes = 5
) {
  const now = Date.now();
  const windowMs = windowMinutes * 60 * 1000;
  const windowStart = Math.floor(now / windowMs) * windowMs;

  return `${operation}-${bookingId}-${windowStart}`;
}

// Stratégie 3 : Version stockée en base
async function generateVersionedIdempotencyKey(
  bookingId,
  operation,
  repository
) {
  // Récupérer ou créer un compteur atomique
  const counter = await repository.incrementOperationCounter(
    bookingId,
    operation
  );
  return `${operation}-${bookingId}-${counter}`;
}
```

#### Tableau récapitulatif

| Stratégie               | Avantages             | Inconvénients        | Cas d'usage          |
| ----------------------- | --------------------- | -------------------- | -------------------- |
| UUID aléatoire          | Simple                | Non-déterministe     | ❌ À éviter          |
| `{op}-{bookingId}-v{n}` | Déterministe, lisible | Nécessite versioning | ✅ Recommandé        |
| Hash du payload         | Unique par contenu    | Moins lisible        | Opérations complexes |
| Timestamp arrondi       | Groupe les retries    | Fenêtre fixe         | Rate limiting        |

---

## Exercice 3 : Diagramme d'États de Transaction

### Énoncé

Dessinez un diagramme d'états montrant les transitions autorisées pour un `PaymentTransaction`.

### Solution

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DIAGRAMME D'ÉTATS - PaymentTransaction                    │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌───────────┐
                              │  PENDING  │
                              │ (initial) │
                              └─────┬─────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               │               ▼
             ┌───────────┐         │        ┌───────────┐
             │ SUCCEEDED │         │        │  FAILED   │
             └─────┬─────┘         │        │ (final)   │
                   │               │        └───────────┘
       ┌───────────┼───────────┐   │
       │           │           │   │
       ▼           ▼           ▼   │
┌──────────────┐ ┌────────────┐   │
│ PARTIALLY_   │ │  DISPUTED  │   │
│   REFUNDED   │ └──────┬─────┘   │
└──────┬───────┘        │         │
       │                │         │
       │        ┌───────┼─────────┘
       │        │       │
       ▼        ▼       │
  ┌───────────────┐     │
  │   REFUNDED    │ <───┘
  │   (final)     │
  └───────────────┘


LÉGENDE:
─────────────────────────────────────
  ┌─────────┐
  │  État   │  = État de la transaction
  └─────────┘

  ────────>  = Transition autorisée

  (initial)  = État de départ
  (final)    = État terminal (pas de sortie)
```

#### Matrice des transitions

| De ↓ / Vers →          | PENDING | SUCCEEDED | FAILED | REFUNDED | PARTIALLY_REFUNDED | DISPUTED |
| ---------------------- | :-----: | :-------: | :----: | :------: | :----------------: | :------: |
| **PENDING**            |    -    |    ✅     |   ✅   |    ❌    |         ❌         |    ❌    |
| **SUCCEEDED**          |   ❌    |     -     |   ❌   |    ✅    |         ✅         |    ✅    |
| **FAILED**             |   ❌    |    ❌     |   -    |    ❌    |         ❌         |    ❌    |
| **REFUNDED**           |   ❌    |    ❌     |   ❌   |    -     |         ❌         |    ❌    |
| **PARTIALLY_REFUNDED** |   ❌    |    ❌     |   ❌   |    ✅    |         -          |    ❌    |
| **DISPUTED**           |   ❌    |    ✅     |   ❌   |    ✅    |         ❌         |    -     |

#### Implémentation JavaScript

```javascript
// payment-gateway-service/src/models/PaymentTransaction.js

const TRANSACTION_STATUSES = {
  PENDING: "pending",
  SUCCEEDED: "succeeded",
  FAILED: "failed",
  REFUNDED: "refunded",
  PARTIALLY_REFUNDED: "partially_refunded",
  DISPUTED: "disputed",
};

const STATUS_TRANSITIONS = {
  [TRANSACTION_STATUSES.PENDING]: [
    TRANSACTION_STATUSES.SUCCEEDED,
    TRANSACTION_STATUSES.FAILED,
  ],
  [TRANSACTION_STATUSES.SUCCEEDED]: [
    TRANSACTION_STATUSES.REFUNDED,
    TRANSACTION_STATUSES.PARTIALLY_REFUNDED,
    TRANSACTION_STATUSES.DISPUTED,
  ],
  [TRANSACTION_STATUSES.FAILED]: [], // État final
  [TRANSACTION_STATUSES.REFUNDED]: [], // État final
  [TRANSACTION_STATUSES.PARTIALLY_REFUNDED]: [
    TRANSACTION_STATUSES.REFUNDED, // Peut devenir totalement remboursé
  ],
  [TRANSACTION_STATUSES.DISPUTED]: [
    TRANSACTION_STATUSES.SUCCEEDED, // Dispute résolue en notre faveur
    TRANSACTION_STATUSES.REFUNDED, // Dispute perdue → remboursement
  ],
};

class PaymentTransaction {
  canTransitionTo(newStatus) {
    const allowedTransitions = STATUS_TRANSITIONS[this.status] || [];
    return allowedTransitions.includes(newStatus);
  }

  async transitionTo(newStatus) {
    if (!this.canTransitionTo(newStatus)) {
      const allowed = STATUS_TRANSITIONS[this.status]?.join(", ") || "aucune";
      throw new Error(
        `Transition invalide: "${this.status}" → "${newStatus}". ` +
          `Transitions autorisées depuis "${this.status}": [${allowed}]`
      );
    }

    const previousStatus = this.status;
    this.status = newStatus;
    await this.save();

    console.log(`Transaction ${this.id}: ${previousStatus} → ${newStatus}`);
    return this;
  }
}
```

#### Scénarios de transition

```javascript
// Scénario 1 : Paiement réussi
transaction.status = "pending";
await transaction.transitionTo("succeeded"); // ✅ OK

// Scénario 2 : Paiement échoué
transaction.status = "pending";
await transaction.transitionTo("failed"); // ✅ OK

// Scénario 3 : Remboursement après succès
transaction.status = "succeeded";
await transaction.transitionTo("refunded"); // ✅ OK

// Scénario 4 : Remboursement partiel puis total
transaction.status = "succeeded";
await transaction.transitionTo("partially_refunded"); // ✅ OK
await transaction.transitionTo("refunded"); // ✅ OK

// Scénario 5 : Dispute puis résolution
transaction.status = "succeeded";
await transaction.transitionTo("disputed"); // ✅ OK
await transaction.transitionTo("succeeded"); // ✅ OK (dispute gagnée)

// Scénario 6 : INVALIDE - On ne peut pas revenir de failed
transaction.status = "failed";
await transaction.transitionTo("succeeded"); // ❌ ERREUR !
```

---

## Exercice 4 : Extension Multi-Passerelles

### Énoncé

Implémentez une classe `PayPalGateway` qui implémente l'interface `PaymentGateway`. Modifiez `GatewayFactory` pour permettre la sélection dynamique basée sur un paramètre de requête `gatewayType`.

### Solution

#### 1. Implémentation PayPalGateway

```javascript
// payment-gateway-service/src/gateways/PayPalGateway.js

import PaymentGateway from "./PaymentGateway.interface.js";

/**
 * Implémentation PayPal de la passerelle de paiement
 *
 * Note: Cette implémentation utilise l'API PayPal REST v2
 * Documentation: https://developer.paypal.com/docs/api/overview/
 */
class PayPalGateway extends PaymentGateway {
  constructor() {
    super();
    this.clientId = process.env.PAYPAL_CLIENT_ID;
    this.clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    this.baseUrl =
      process.env.PAYPAL_MODE === "live"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com";
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  get name() {
    return "paypal";
  }

  /**
   * Obtient un token d'accès OAuth2
   * @private
   */
  async _getAccessToken() {
    // Réutiliser le token s'il est encore valide
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString(
      "base64"
    );

    const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    if (!response.ok) {
      throw new Error(`PayPal auth failed: ${response.status}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    // Expirer 5 minutes avant la vraie expiration pour être safe
    this.tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;

    return this.accessToken;
  }

  /**
   * Effectue une requête authentifiée à l'API PayPal
   * @private
   */
  async _apiRequest(endpoint, method, body, idempotencyKey = null) {
    const token = await this._getAccessToken();

    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    // PayPal utilise PayPal-Request-Id pour l'idempotence
    if (idempotencyKey) {
      headers["PayPal-Request-Id"] = idempotencyKey;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.message || "PayPal API error");
      error.code = data.name;
      error.details = data.details;
      error.statusCode = response.status;
      error.raw = data;
      throw error;
    }

    return data;
  }

  async charge({ amount, currency, token, idempotencyKey, metadata }) {
    try {
      // PayPal utilise un flux en 2 étapes: Create Order → Capture
      // Le token ici est l'order_id créé côté client après approbation

      // Si le token est un order_id (flux standard PayPal)
      if (token.startsWith("ORDER-") || token.length > 20) {
        // Capturer le paiement d'une commande approuvée
        const capture = await this._apiRequest(
          `/v2/checkout/orders/${token}/capture`,
          "POST",
          {},
          idempotencyKey
        );

        const captureDetails = capture.purchase_units[0].payments.captures[0];

        return {
          id: captureDetails.id,
          status: this._mapStatus(captureDetails.status),
          cardLast4: null, // PayPal ne fournit pas ces infos
          cardBrand: "paypal",
          raw: capture,
        };
      }

      // Sinon, créer une nouvelle commande (pour les paiements directs)
      const order = await this._apiRequest(
        "/v2/checkout/orders",
        "POST",
        {
          intent: "CAPTURE",
          purchase_units: [
            {
              reference_id: metadata.bookingId,
              amount: {
                currency_code: currency.toUpperCase(),
                value: amount.toFixed(2),
              },
              description: `Réservation ${metadata.bookingId}`,
            },
          ],
        },
        idempotencyKey
      );

      return {
        id: order.id,
        status: this._mapStatus(order.status),
        cardLast4: null,
        cardBrand: "paypal",
        raw: order,
        // Pour PayPal, on retourne aussi l'URL d'approbation si nécessaire
        approvalUrl: order.links?.find((l) => l.rel === "approve")?.href,
      };
    } catch (error) {
      throw this._transformError(error);
    }
  }

  async refund({ externalTransactionId, amount }) {
    try {
      const body = {};

      // Montant optionnel pour remboursement partiel
      if (amount) {
        body.amount = {
          value: amount.toFixed(2),
          currency_code: "EUR", // TODO: récupérer la devise de la transaction originale
        };
      }

      const refund = await this._apiRequest(
        `/v2/payments/captures/${externalTransactionId}/refund`,
        "POST",
        Object.keys(body).length > 0 ? body : undefined
      );

      return {
        id: refund.id,
        status: this._mapStatus(refund.status),
        amount: parseFloat(refund.amount?.value || amount),
        raw: refund,
      };
    } catch (error) {
      throw this._transformError(error);
    }
  }

  verifyWebhook(payload, signature) {
    // PayPal utilise un système de vérification différent de Stripe
    // Il faut appeler leur API pour vérifier le webhook
    // Simplifié ici - en production, appeler /v1/notifications/verify-webhook-signature

    const webhookId = process.env.PAYPAL_WEBHOOK_ID;

    // Pour la simplicité, on parse juste le payload
    // En production, TOUJOURS vérifier la signature !
    try {
      const event = typeof payload === "string" ? JSON.parse(payload) : payload;

      // Vérification basique de la structure
      if (!event.event_type || !event.resource) {
        throw new Error("Invalid PayPal webhook structure");
      }

      return event;
    } catch (error) {
      throw new Error(`PayPal webhook verification failed: ${error.message}`);
    }
  }

  /**
   * Mappe les statuts PayPal vers nos statuts internes
   * @private
   */
  _mapStatus(paypalStatus) {
    const statusMap = {
      COMPLETED: "succeeded",
      APPROVED: "pending", // Commande approuvée, en attente de capture
      CREATED: "pending",
      SAVED: "pending",
      VOIDED: "failed",
      DECLINED: "failed",
      REFUNDED: "refunded",
      PARTIALLY_REFUNDED: "partially_refunded",
    };
    return statusMap[paypalStatus] || "pending";
  }

  /**
   * Transforme les erreurs PayPal en erreurs génériques
   * @private
   */
  _transformError(paypalError) {
    const error = new Error(paypalError.message || "PayPal error");
    error.code = paypalError.code;
    error.type = "PayPalError";
    error.statusCode = paypalError.statusCode || 500;
    error.raw = paypalError;

    // Messages utilisateur
    if (paypalError.code === "INSTRUMENT_DECLINED") {
      error.userMessage = "Le paiement PayPal a été refusé";
    } else if (paypalError.code === "PAYER_ACTION_REQUIRED") {
      error.userMessage = "Une action est requise sur votre compte PayPal";
    }

    return error;
  }
}

export default PayPalGateway;
```

#### 2. GatewayFactory mis à jour

```javascript
// payment-gateway-service/src/gateways/GatewayFactory.js

import StripeGateway from "./StripeGateway.js";
import PayPalGateway from "./PayPalGateway.js";

/**
 * Factory pour créer des instances de passerelles de paiement
 *
 * Permet de sélectionner dynamiquement la passerelle à utiliser
 * basé sur la configuration ou la requête.
 */
class GatewayFactory {
  static gateways = {
    stripe: StripeGateway,
    paypal: PayPalGateway,
  };

  /**
   * Crée une instance de passerelle
   * @param {string} gatewayType - Type de passerelle ('stripe', 'paypal')
   * @returns {PaymentGateway} Instance de la passerelle
   */
  static create(gatewayType = "stripe") {
    const normalizedType = gatewayType.toLowerCase();
    const GatewayClass = this.gateways[normalizedType];

    if (!GatewayClass) {
      const available = Object.keys(this.gateways).join(", ");
      throw new Error(
        `Passerelle "${gatewayType}" non supportée. ` +
          `Options disponibles: ${available}`
      );
    }

    return new GatewayClass();
  }

  /**
   * Retourne la passerelle par défaut
   * @returns {PaymentGateway}
   */
  static getDefault() {
    const defaultGateway = process.env.DEFAULT_PAYMENT_GATEWAY || "stripe";
    return this.create(defaultGateway);
  }

  /**
   * Liste toutes les passerelles disponibles
   * @returns {string[]}
   */
  static getAvailable() {
    return Object.keys(this.gateways);
  }

  /**
   * Vérifie si une passerelle est supportée
   * @param {string} gatewayType
   * @returns {boolean}
   */
  static isSupported(gatewayType) {
    return gatewayType.toLowerCase() in this.gateways;
  }

  /**
   * Enregistre une nouvelle passerelle
   * @param {string} name - Nom de la passerelle
   * @param {Class} GatewayClass - Classe implémentant PaymentGateway
   */
  static register(name, GatewayClass) {
    this.gateways[name.toLowerCase()] = GatewayClass;
  }
}

export default GatewayFactory;
```

#### 3. PaymentService avec sélection dynamique

```javascript
// payment-gateway-service/src/services/PaymentService.js

import GatewayFactory from "../gateways/GatewayFactory.js";

class PaymentService {
  constructor({ paymentRepository, logger }) {
    this.paymentRepository = paymentRepository;
    this.logger = logger;
    // Pas de gateway fixe - on le sélectionne par requête
  }

  /**
   * Obtient la passerelle appropriée
   * @private
   */
  _getGateway(gatewayType) {
    if (gatewayType) {
      return GatewayFactory.create(gatewayType);
    }
    return GatewayFactory.getDefault();
  }

  async processCharge(chargeRequest) {
    const {
      amount,
      currency,
      paymentMethodToken,
      bookingId,
      customerEmail,
      idempotencyKey,
      gatewayType, // Nouveau paramètre optionnel
    } = chargeRequest;

    this.logger.info("PaymentService.processCharge", {
      bookingId,
      idempotencyKey,
      gateway: gatewayType || "default",
    });

    // Vérification idempotence
    const existingTransaction =
      await this.paymentRepository.findByIdempotencyKey(idempotencyKey);
    if (existingTransaction) {
      return { success: true, data: existingTransaction, cached: true };
    }

    // Sélection dynamique de la passerelle
    const gateway = this._getGateway(gatewayType);
    this.logger.info(`Using payment gateway: ${gateway.name}`);

    // Créer transaction pending
    const pendingTransaction = await this.paymentRepository.create({
      bookingId,
      idempotencyKey,
      amount,
      currency,
      customerEmail,
      status: "pending",
      paymentGateway: gateway.name, // Stocker quelle passerelle est utilisée
    });

    try {
      const gatewayResponse = await gateway.charge({
        amount,
        currency,
        token: paymentMethodToken,
        idempotencyKey,
        metadata: { bookingId, transactionId: pendingTransaction.id },
      });

      const completedTransaction = await this.paymentRepository.update(
        pendingTransaction.id,
        {
          externalTransactionId: gatewayResponse.id,
          status: gatewayResponse.status,
          gatewayResponse: gatewayResponse.raw,
          cardLast4Digits: gatewayResponse.cardLast4,
          cardBrand: gatewayResponse.cardBrand,
        }
      );

      return {
        success: gatewayResponse.status === "succeeded",
        data: completedTransaction,
        // Pour PayPal, on peut avoir une URL d'approbation
        approvalUrl: gatewayResponse.approvalUrl,
      };
    } catch (error) {
      await this.paymentRepository.update(pendingTransaction.id, {
        status: "failed",
        errorCode: error.code,
        errorMessage: error.message,
        gatewayResponse: error.raw,
      });
      throw error;
    }
  }

  async processRefund(refundRequest) {
    const { transactionId, amount, reason } = refundRequest;

    const transaction = await this.paymentRepository.findById(transactionId);
    if (!transaction) {
      throw new Error("Transaction non trouvée");
    }

    // Utiliser la même passerelle que la transaction originale
    const gateway = this._getGateway(transaction.paymentGateway);

    const refundResponse = await gateway.refund({
      externalTransactionId: transaction.externalTransactionId,
      amount: amount || transaction.amount,
    });

    await this.paymentRepository.update(transactionId, {
      status:
        amount && amount < transaction.amount
          ? "partially_refunded"
          : "refunded",
      refundId: refundResponse.id,
      refundAmount: refundResponse.amount,
      refundReason: reason,
    });

    return { success: true, data: refundResponse };
  }
}

export default PaymentService;
```

#### 4. Controller avec paramètre gatewayType

```javascript
// payment-gateway-service/src/controllers/payment.controller.js

import { getContainer } from "../config/container.js";
import GatewayFactory from "../gateways/GatewayFactory.js";

export const createCharge = async (req, res, next) => {
  try {
    const { paymentService } = getContainer();

    const {
      amount,
      currency,
      paymentMethodToken,
      bookingId,
      customerEmail,
      idempotencyKey,
      gatewayType, // Paramètre optionnel dans la requête
    } = req.body;

    // Validation du gatewayType si fourni
    if (gatewayType && !GatewayFactory.isSupported(gatewayType)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_GATEWAY",
          message: `Passerelle "${gatewayType}" non supportée`,
          availableGateways: GatewayFactory.getAvailable(),
        },
      });
    }

    const result = await paymentService.processCharge({
      amount,
      currency,
      paymentMethodToken,
      bookingId,
      customerEmail,
      idempotencyKey,
      gatewayType,
    });

    const statusCode = result.cached ? 200 : 201;
    res.status(statusCode).json(result);
  } catch (error) {
    next(error);
  }
};

// Endpoint pour lister les passerelles disponibles
export const getAvailableGateways = async (req, res) => {
  res.json({
    success: true,
    data: {
      gateways: GatewayFactory.getAvailable(),
      default: process.env.DEFAULT_PAYMENT_GATEWAY || "stripe",
    },
  });
};
```

#### 5. Exemple d'utilisation côté client

```javascript
// Depuis le Booking Management Service ou le Frontend

// Paiement avec Stripe (par défaut)
const stripePayment = await fetch("/api/v1/payment-gateway/payments/charge", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    amount: 299.99,
    currency: "EUR",
    paymentMethodToken: "tok_stripe_xxx",
    bookingId: "booking-123",
    customerEmail: "tony@avengers.com",
    idempotencyKey: "charge-booking-123-v1",
    // gatewayType non spécifié = utilise Stripe par défaut
  }),
});

// Paiement avec PayPal
const paypalPayment = await fetch("/api/v1/payment-gateway/payments/charge", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    amount: 299.99,
    currency: "EUR",
    paymentMethodToken: "ORDER-paypal-xxx", // Order ID PayPal
    bookingId: "booking-456",
    customerEmail: "natasha@avengers.com",
    idempotencyKey: "charge-booking-456-v1",
    gatewayType: "paypal", // Sélection explicite de PayPal
  }),
});
```

---

## Points Clés à Retenir

| Exercice  | Concept Principal         | Principe SOLID        |
| --------- | ------------------------- | --------------------- |
| **Ex. 1** | Spécification API OpenAPI | Documentation claire  |
| **Ex. 2** | Idempotence déterministe  | Fiabilité             |
| **Ex. 3** | Machine à états           | Intégrité des données |
| **Ex. 4** | Multi-passerelles         | OCP + DIP             |
