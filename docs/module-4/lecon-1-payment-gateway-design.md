# Leçon 4.1 - Conception du Microservice d'Intégration de la Passerelle de Paiement

**Module 4** : Intégration et sécurité du traitement des paiements

---

## Objectifs pédagogiques

- Comprendre le rôle d'un microservice de paiement dédié
- Définir les frontières et responsabilités selon les principes SOLID
- Concevoir une API de paiement idempotente et sécurisée
- Modéliser les données de transactions
- Appliquer l'abstraction pour supporter plusieurs passerelles de paiement

## Prérequis

- Module 2 : Microservices Tour Catalog et Booking Management
- Module 3 : Principes SOLID (SRP, OCP, DIP)

---

## Introduction

La conception d'**Intégration d'une Passerelle de Paiement Microservice** consiste à créer un service dédié et indépendant, responsable uniquement de la gestion des interactions avec les fournisseurs de paiement externes. Ce microservice encapsule les complexités du traitement des paiements, garantissant que la logique métier principale reste séparée des API de paiement spécifiques aux fournisseurs et des préoccupations de sécurité.

Son rôle principal est d'agir comme un **intermédiaire sécurisé** : recevoir les demandes de paiement d'autres services (comme le Booking Management Service), communiquer avec les passerelles de paiement (ex: Stripe, PayPal), et retourner les résultats des transactions.

---

## 1. Frontières et Responsabilités du Microservice

### 1.1 Principe de Responsabilité Unique (SRP)

Un aspect clé de la conception de tout microservice est de définir des frontières et responsabilités claires, en respectant le **Single Responsibility Principle (SRP)** étudié au Module 3.

#### Ce que le Service de Passerelle de Paiement DOIT faire :

| Responsabilité                       | Description                                                                          |
| ------------------------------------ | ------------------------------------------------------------------------------------ |
| **Traitement des paiements**         | Initier les charges, remboursements, paiements récurrents                            |
| **Gestion des méthodes de paiement** | Stocker et récupérer les tokens de paiement de manière sécurisée                     |
| **Interface avec les passerelles**   | Traduire les requêtes internes en appels API spécifiques aux fournisseurs            |
| **Gestion des webhooks**             | Recevoir et traiter les notifications des passerelles (succès, échec, remboursement) |
| **Sécurité**                         | Assurer la communication sécurisée et protéger les informations sensibles            |

#### Ce que le Service de Passerelle de Paiement NE DOIT PAS faire :

| Anti-responsabilité          | Service responsable                     |
| ---------------------------- | --------------------------------------- |
| Logique de réservation       | Booking Management Service              |
| Authentification utilisateur | User Auth Service (Leçon 4.5)           |
| Génération de factures       | Billing/Notification Service (futur)    |
| Détection de fraude avancée  | Fraud Detection Service (si nécessaire) |

### 1.2 Exemple : Frontières Claires

Considérons notre application de réservation touristique. Quand **Tony Stark** réserve un tour :

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          FLUX DE PAIEMENT                                    │
└─────────────────────────────────────────────────────────────────────────────┘

   ┌──────────────┐         ┌──────────────────────┐         ┌─────────────────┐
   │   Frontend   │         │  Booking Management  │         │ Payment Gateway │
   │    React     │         │      Service         │         │    Service      │
   └──────┬───────┘         └──────────┬───────────┘         └────────┬────────┘
          │                            │                              │
          │ 1. Demande réservation     │                              │
          │ (avec token de paiement)   │                              │
          │ ─────────────────────────> │                              │
          │                            │                              │
          │                            │ 2. Créer booking "pending"   │
          │                            │ ───────────────────────────> │
          │                            │                              │
          │                            │ 3. Demander paiement         │
          │                            │ (amount, token, bookingId)   │
          │                            │ ─────────────────────────────>│
          │                            │                              │
          │                            │                              │ 4. Appel Stripe API
          │                            │                              │ ─────────────────>
          │                            │                              │
          │                            │                              │ 5. Réponse Stripe
          │                            │                              │ <─────────────────
          │                            │                              │
          │                            │ 6. Résultat (success/fail)   │
          │                            │ <─────────────────────────────│
          │                            │                              │
          │                            │ 7. Mettre à jour booking     │
          │                            │    (confirmed/cancelled)     │
          │                            │                              │
          │ 8. Confirmation            │                              │
          │ <───────────────────────── │                              │
          │                            │                              │
```

Cette séparation garantit que si nous décidons de changer de fournisseur de paiement (de Stripe à PayPal), **seul le Service de Passerelle de Paiement** nécessite des modifications significatives, pas le Service de Gestion des Réservations.

### 1.3 Anti-Pattern : Frontières Floues

> ❌ **À éviter** : Si le Service de Gestion des Réservations contenait directement le code pour appeler l'API Stripe, stocker les customer IDs Stripe, et gérer les webhooks Stripe, cela violerait le SRP.

```javascript
// ❌ MAUVAIS : Logique de paiement dans le contrôleur de réservation
// booking-management-service/src/controllers/booking.controller.js

import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createBooking = async (req, res, next) => {
  try {
    const { tourId, customerEmail, paymentMethodId } = req.body;

    // ❌ Violation SRP : Le contrôleur de booking gère le paiement
    const paymentIntent = await stripe.paymentIntents.create({
      amount: tour.price * 100,
      currency: "eur",
      payment_method: paymentMethodId,
      confirm: true,
    });

    // ❌ Couplage fort avec Stripe
    if (paymentIntent.status === "succeeded") {
      // Créer la réservation...
    }
  } catch (error) {
    // ❌ Gestion d'erreurs Stripe mélangée avec la logique booking
  }
};
```

Toute modification dans la logique de paiement ou le fournisseur nécessiterait de modifier le Service de Gestion des Réservations, augmentant sa complexité et rendant les tests plus difficiles.

---

## 2. Conception de l'API de Paiement

Le Service de Passerelle de Paiement nécessite une API bien définie pour communiquer avec les autres services internes. Cette API doit être **stateless**, **idempotente** et **sécurisée**.

### 2.1 Endpoints Principaux

```yaml
# API Service de Passerelle de Paiement - Port 3003
basePath: /api/v1/payment-gateway

endpoints:
  # Initier un paiement
  POST /payments/charge:
    description: Créer une nouvelle charge de paiement
    input:
      - amount: number (montant en unité monétaire, ex: 299.99)
      - currency: string (ISO 4217, ex: "EUR", "USD")
      - paymentMethodToken: string (token Stripe, jamais les données brutes)
      - bookingId: string (UUID - clé de corrélation)
      - customerEmail: string
      - idempotencyKey: string (pour éviter les doubles charges)
    output:
      - transactionId: string (ID interne)
      - externalTransactionId: string (ID Stripe)
      - status: enum ("pending", "succeeded", "failed")
      - errorCode?: string
      - errorMessage?: string

  # Rembourser un paiement
  POST /payments/refund:
    description: Rembourser une transaction existante
    input:
      - transactionId: string (ID de la transaction originale)
      - amount?: number (optionnel pour remboursement partiel)
      - reason?: string
    output:
      - refundId: string
      - status: enum ("succeeded", "failed", "pending")
      - amount: number
      - errorMessage?: string

  # Récupérer une transaction
  GET /payments/transactions/:transactionId:
    description: Obtenir les détails d'une transaction
    output:
      - transaction: PaymentTransaction

  # Webhook (public, sécurisé par signature)
  POST /payments/webhook/stripe:
    description: Recevoir les notifications Stripe
    security: Signature Stripe (Stripe-Signature header)
    input: Raw webhook event payload
    output: HTTP 200 (acknowledgement)
```

### 2.2 Idempotence : Éviter les Doubles Charges

Les opérations de paiement, particulièrement `POST /payments/charge`, **doivent être idempotentes**. Cela signifie que faire la même requête plusieurs fois doit avoir le même effet que de la faire une seule fois.

#### Scénario : Problème de Réseau

Imaginons que le Service de Gestion des Réservations essaie de facturer **Natasha Romanoff** pour un tour. À cause d'une coupure réseau momentanée, il envoie la requête mais ne reçoit pas de réponse. Il retente alors la charge.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SCÉNARIO SANS IDEMPOTENCE ❌                              │
└─────────────────────────────────────────────────────────────────────────────┘

Booking Service                     Payment Gateway                    Stripe
      │                                   │                              │
      │ POST /charge (299€)               │                              │
      │ ─────────────────────────────────>│                              │
      │                                   │ Charge 299€                  │
      │                                   │ ─────────────────────────────>│
      │                                   │                              │
      │     ✗ Timeout (pas de réponse)    │         OK (charge créée)    │
      │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │ <─────────────────────────────│
      │                                   │                              │
      │ POST /charge (299€) [RETRY]       │                              │
      │ ─────────────────────────────────>│                              │
      │                                   │ Charge 299€ (AGAIN!) ❌      │
      │                                   │ ─────────────────────────────>│
      │                                   │                              │
      │         OK                        │         OK (2ème charge)     │
      │ <─────────────────────────────────│ <─────────────────────────────│
      │                                   │                              │

💸 Natasha est facturée 598€ au lieu de 299€ !
```

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SCÉNARIO AVEC IDEMPOTENCE ✅                              │
└─────────────────────────────────────────────────────────────────────────────┘

Booking Service                     Payment Gateway                    Stripe
      │                                   │                              │
      │ POST /charge                      │                              │
      │ idempotencyKey: "book-abc-123"    │                              │
      │ ─────────────────────────────────>│                              │
      │                                   │ Charge (idempotency_key)     │
      │                                   │ ─────────────────────────────>│
      │                                   │                              │
      │     ✗ Timeout                     │         OK                   │
      │ <─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │ <─────────────────────────────│
      │                                   │                              │
      │ POST /charge [RETRY]              │                              │
      │ idempotencyKey: "book-abc-123"    │                              │
      │ ─────────────────────────────────>│                              │
      │                                   │                              │
      │                                   │ Check: key exists? ✓         │
      │                                   │ Return cached result         │
      │         OK (même résultat)        │                              │
      │ <─────────────────────────────────│                              │
      │                                   │                              │

✅ Natasha n'est facturée qu'une seule fois : 299€
```

#### Implémentation de l'Idempotence

```javascript
// payment-gateway-service/src/services/PaymentService.js

/**
 * Payment Service - Module 4
 *
 * Responsabilité unique : Orchestration des opérations de paiement
 * Applique l'idempotence pour éviter les doubles charges
 */

class PaymentService {
  constructor({ paymentRepository, paymentGateway, logger }) {
    this.paymentRepository = paymentRepository;
    this.paymentGateway = paymentGateway;
    this.logger = logger;
  }

  /**
   * Traite une demande de paiement de manière idempotente
   * @param {Object} chargeRequest - Données de la charge
   * @returns {Object} Transaction result
   */
  async processCharge(chargeRequest) {
    const {
      amount,
      currency,
      paymentMethodToken,
      bookingId,
      customerEmail,
      idempotencyKey,
    } = chargeRequest;

    this.logger.info("PaymentService.processCharge", {
      bookingId,
      idempotencyKey,
    });

    // 1. Vérifier si cette charge a déjà été traitée (idempotence)
    const existingTransaction =
      await this.paymentRepository.findByIdempotencyKey(idempotencyKey);

    if (existingTransaction) {
      this.logger.info(
        `Charge idempotente détectée pour booking ${bookingId}. Retour du résultat précédent.`
      );
      return {
        success: true,
        data: existingTransaction,
        cached: true, // Indique que c'est un résultat en cache
      };
    }

    // 2. Créer une transaction en statut "pending"
    const pendingTransaction = await this.paymentRepository.create({
      bookingId,
      idempotencyKey,
      amount,
      currency,
      customerEmail,
      status: "pending",
    });

    try {
      // 3. Appeler la passerelle de paiement
      const gatewayResponse = await this.paymentGateway.charge({
        amount,
        currency,
        token: paymentMethodToken,
        idempotencyKey, // Stripe supporte aussi l'idempotence
        metadata: { bookingId, transactionId: pendingTransaction.id },
      });

      // 4. Mettre à jour la transaction avec le résultat
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
      };
    } catch (error) {
      // 5. Marquer la transaction comme échouée
      await this.paymentRepository.update(pendingTransaction.id, {
        status: "failed",
        errorCode: error.code,
        errorMessage: error.message,
        gatewayResponse: error.raw,
      });

      this.logger.error(`Paiement échoué pour booking ${bookingId}:`, error);

      throw error;
    }
  }

  /**
   * Traite un remboursement
   */
  async processRefund(refundRequest) {
    const { transactionId, amount, reason } = refundRequest;

    // Vérifier que la transaction existe et peut être remboursée
    const transaction = await this.paymentRepository.findById(transactionId);

    if (!transaction) {
      throw new PaymentError(
        "Transaction non trouvée",
        "TRANSACTION_NOT_FOUND",
        404
      );
    }

    if (transaction.status !== "succeeded") {
      throw new PaymentError(
        `Impossible de rembourser une transaction en statut "${transaction.status}"`,
        "INVALID_REFUND_STATE",
        400
      );
    }

    // Appeler la passerelle pour le remboursement
    const refundResponse = await this.paymentGateway.refund({
      externalTransactionId: transaction.externalTransactionId,
      amount: amount || transaction.amount,
    });

    // Mettre à jour le statut
    await this.paymentRepository.update(transactionId, {
      status: "refunded",
      refundId: refundResponse.id,
      refundAmount: refundResponse.amount,
      refundReason: reason,
    });

    return {
      success: true,
      data: {
        refundId: refundResponse.id,
        status: refundResponse.status,
        amount: refundResponse.amount,
      },
    };
  }
}

export default PaymentService;
```

---

## 3. Modèle de Données des Transactions

Le Service de Passerelle de Paiement doit persister les informations critiques de chaque transaction pour l'audit, le débogage et la gestion des remboursements ou litiges.

### 3.1 Schéma de la Table `payment_transactions`

```sql
-- PostgreSQL - Migration pour payment_transactions
-- payment-gateway-service/src/database/migrations/001-create-payment-transactions.sql

CREATE TABLE payment_transactions (
    -- Identifiants
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL,                          -- Corrélation avec Booking Service
    external_transaction_id VARCHAR(255) UNIQUE,       -- ID Stripe (ch_xxx)
    idempotency_key VARCHAR(255) UNIQUE NOT NULL,      -- Clé d'idempotence

    -- Montants
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    refund_amount NUMERIC(10, 2),

    -- Statut
    status VARCHAR(50) NOT NULL DEFAULT 'pending',     -- pending, succeeded, failed, refunded
    error_code VARCHAR(100),
    error_message TEXT,

    -- Méthode de paiement (données masquées)
    payment_method_type VARCHAR(50) DEFAULT 'card',    -- card, paypal, bank_transfer
    card_last_4_digits VARCHAR(4),
    card_brand VARCHAR(50),                            -- visa, mastercard, amex

    -- Client
    customer_email VARCHAR(255),

    -- Remboursement
    refund_id VARCHAR(255),
    refund_reason TEXT,

    -- Audit
    gateway_response JSONB,                            -- Réponse complète pour debug
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pour les recherches fréquentes
CREATE INDEX idx_payment_transactions_booking_id ON payment_transactions(booking_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_payment_transactions_customer_email ON payment_transactions(customer_email);
CREATE INDEX idx_payment_transactions_created_at ON payment_transactions(created_at);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_payment_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_payment_transactions_updated_at
    BEFORE UPDATE ON payment_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_transactions_updated_at();
```

### 3.2 Modèle Sequelize

```javascript
// payment-gateway-service/src/models/PaymentTransaction.js

import { DataTypes, Model } from "sequelize";

// États possibles d'une transaction
const TRANSACTION_STATUSES = {
  PENDING: "pending",
  SUCCEEDED: "succeeded",
  FAILED: "failed",
  REFUNDED: "refunded",
  PARTIALLY_REFUNDED: "partially_refunded",
  DISPUTED: "disputed",
};

// Transitions d'état autorisées
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
  [TRANSACTION_STATUSES.FAILED]: [],
  [TRANSACTION_STATUSES.REFUNDED]: [],
  [TRANSACTION_STATUSES.PARTIALLY_REFUNDED]: [TRANSACTION_STATUSES.REFUNDED],
  [TRANSACTION_STATUSES.DISPUTED]: [
    TRANSACTION_STATUSES.SUCCEEDED,
    TRANSACTION_STATUSES.REFUNDED,
  ],
};

class PaymentTransaction extends Model {
  /**
   * Vérifie si une transition vers un nouveau statut est autorisée
   */
  canTransitionTo(newStatus) {
    const allowedTransitions = STATUS_TRANSITIONS[this.status] || [];
    return allowedTransitions.includes(newStatus);
  }

  /**
   * Effectue une transition de statut
   */
  async transitionTo(newStatus) {
    if (!this.canTransitionTo(newStatus)) {
      throw new Error(
        `Transition invalide de "${this.status}" vers "${newStatus}". ` +
          `Transitions autorisées: ${
            STATUS_TRANSITIONS[this.status]?.join(", ") || "aucune"
          }`
      );
    }
    this.status = newStatus;
    await this.save();
    return this;
  }

  /**
   * Format pour l'API
   */
  toAPIFormat() {
    return {
      id: this.id,
      bookingId: this.bookingId,
      externalTransactionId: this.externalTransactionId,
      amount: parseFloat(this.amount),
      currency: this.currency,
      status: this.status,
      paymentMethodType: this.paymentMethodType,
      cardLast4Digits: this.cardLast4Digits,
      cardBrand: this.cardBrand,
      customerEmail: this.customerEmail,
      errorCode: this.errorCode,
      errorMessage: this.errorMessage,
      refundAmount: this.refundAmount ? parseFloat(this.refundAmount) : null,
      refundReason: this.refundReason,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

// Attributs statiques
PaymentTransaction.STATUSES = TRANSACTION_STATUSES;
PaymentTransaction.STATUS_TRANSITIONS = STATUS_TRANSITIONS;

export function initPaymentTransaction(sequelize) {
  PaymentTransaction.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      bookingId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "booking_id",
      },
      externalTransactionId: {
        type: DataTypes.STRING(255),
        unique: true,
        field: "external_transaction_id",
      },
      idempotencyKey: {
        type: DataTypes.STRING(255),
        unique: true,
        allowNull: false,
        field: "idempotency_key",
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      currency: {
        type: DataTypes.STRING(3),
        defaultValue: "EUR",
      },
      status: {
        type: DataTypes.ENUM(...Object.values(TRANSACTION_STATUSES)),
        defaultValue: TRANSACTION_STATUSES.PENDING,
      },
      errorCode: {
        type: DataTypes.STRING(100),
        field: "error_code",
      },
      errorMessage: {
        type: DataTypes.TEXT,
        field: "error_message",
      },
      paymentMethodType: {
        type: DataTypes.STRING(50),
        defaultValue: "card",
        field: "payment_method_type",
      },
      cardLast4Digits: {
        type: DataTypes.STRING(4),
        field: "card_last_4_digits",
      },
      cardBrand: {
        type: DataTypes.STRING(50),
        field: "card_brand",
      },
      customerEmail: {
        type: DataTypes.STRING(255),
        field: "customer_email",
      },
      refundId: {
        type: DataTypes.STRING(255),
        field: "refund_id",
      },
      refundAmount: {
        type: DataTypes.DECIMAL(10, 2),
        field: "refund_amount",
      },
      refundReason: {
        type: DataTypes.TEXT,
        field: "refund_reason",
      },
      gatewayResponse: {
        type: DataTypes.JSONB,
        field: "gateway_response",
      },
    },
    {
      sequelize,
      modelName: "PaymentTransaction",
      tableName: "payment_transactions",
      underscored: true,
      timestamps: true,
    }
  );

  return PaymentTransaction;
}

export { PaymentTransaction, TRANSACTION_STATUSES, STATUS_TRANSITIONS };
export default PaymentTransaction;
```

---

## 4. Tokenisation : Sécurité des Données de Paiement

Manipuler directement les informations de paiement sensibles (numéros de carte) augmente considérablement la portée de conformité **PCI DSS** et les risques de sécurité. Les intégrations modernes de passerelles de paiement reposent sur la **tokenisation**.

### 4.1 Flux de Tokenisation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FLUX DE TOKENISATION STRIPE                           │
└─────────────────────────────────────────────────────────────────────────────┘

   ┌──────────────┐          ┌──────────────┐          ┌──────────────┐
   │   Navigateur │          │    Stripe    │          │   Backend    │
   │    (React)   │          │   Servers    │          │   (Node.js)  │
   └──────┬───────┘          └──────┬───────┘          └──────┬───────┘
          │                         │                         │
          │ 1. Saisie carte         │                         │
          │ (4242 4242 4242 4242)   │                         │
          │                         │                         │
          │ 2. Stripe.js envoie     │                         │
          │    directement à Stripe │                         │
          │ ───────────────────────>│                         │
          │                         │                         │
          │ 3. Token retourné       │                         │
          │ (tok_1abc2def3ghi)      │                         │
          │ <───────────────────────│                         │
          │                         │                         │
          │ 4. Token envoyé au backend                        │
          │ ───────────────────────────────────────────────────>│
          │    (jamais les données carte!)                     │
          │                         │                         │
          │                         │ 5. Backend utilise le   │
          │                         │    token pour charger   │
          │                         │ <───────────────────────│
          │                         │                         │
          │                         │ 6. Confirmation         │
          │                         │ ───────────────────────>│
          │                         │                         │
          │ 7. Résultat             │                         │
          │ <─────────────────────────────────────────────────│
          │                         │                         │

🔒 Les données carte sensibles ne transitent JAMAIS par notre serveur !
```

### 4.2 Avantages de la Tokenisation

| Aspect                  | Sans Tokenisation ❌     | Avec Tokenisation ✅  |
| ----------------------- | ------------------------ | --------------------- |
| **Conformité PCI DSS**  | Scope complet (coûteux)  | Scope minimal (SAQ A) |
| **Données sur serveur** | Numéros de carte stockés | Seulement des tokens  |
| **Risque de fuite**     | Élevé                    | Minimal               |
| **Responsabilité**      | Sur nous                 | Sur Stripe            |

### 4.3 Exemple React avec Stripe.js

```jsx
// frontend/src/components/payment/PaymentForm.jsx

import { useState } from "react";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useNotification } from "../../contexts/NotificationContext";

/**
 * Formulaire de paiement avec tokenisation Stripe
 * Les données de carte ne passent JAMAIS par notre serveur
 */
function PaymentForm({ bookingId, amount, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const { showNotification } = useNotification();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return; // Stripe.js pas encore chargé
    }

    setProcessing(true);

    try {
      // 1. Créer un token à partir des données carte (via Stripe.js)
      //    Les données vont directement à Stripe, pas à notre serveur
      const { error, token } = await stripe.createToken(
        elements.getElement(CardElement)
      );

      if (error) {
        showNotification(`Erreur: ${error.message}`, "error");
        return;
      }

      // 2. Envoyer le TOKEN (pas les données carte) à notre backend
      const response = await fetch("/api/v1/payment-gateway/payments/charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          currency: "EUR",
          paymentMethodToken: token.id, // tok_xxx, pas les données carte
          bookingId,
          idempotencyKey: `charge-${bookingId}-${Date.now()}`,
        }),
      });

      const result = await response.json();

      if (result.success) {
        showNotification("Paiement réussi !", "success");
        onSuccess(result.data);
      } else {
        showNotification(`Paiement échoué: ${result.error.message}`, "error");
      }
    } catch (err) {
      showNotification("Erreur lors du paiement", "error");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="payment-form">
      <div className="card-element-container">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: "16px",
                color: "#424770",
                "::placeholder": { color: "#aab7c4" },
              },
              invalid: { color: "#9e2146" },
            },
          }}
        />
      </div>

      <button
        type="submit"
        disabled={!stripe || processing}
        className="pay-button"
      >
        {processing ? "Traitement..." : `Payer ${amount} €`}
      </button>
    </form>
  );
}

export default PaymentForm;
```

---

## 5. Gestion des Erreurs et Retries

Une gestion robuste des erreurs est critique pour le traitement des paiements.

### 5.1 Types d'Erreurs

| Type                         | Exemples                                          | Action                             |
| ---------------------------- | ------------------------------------------------- | ---------------------------------- |
| **Erreurs de la passerelle** | Carte refusée, fonds insuffisants, carte invalide | Retourner l'erreur à l'utilisateur |
| **Erreurs réseau**           | Timeout, connexion refusée                        | Retry avec backoff exponentiel     |
| **Erreurs internes**         | Bug, config manquante                             | Logger, alerter, ne pas retry      |

### 5.2 Stratégie de Retry avec Backoff Exponentiel

```javascript
// payment-gateway-service/src/utils/retry.js

/**
 * Exécute une fonction avec retry et backoff exponentiel
 * @param {Function} fn - Fonction à exécuter
 * @param {Object} options - Options de retry
 * @returns {Promise} Résultat de la fonction
 */
async function withRetry(fn, options = {}) {
  const {
    maxRetries = 3,
    baseDelay = 1000, // 1 seconde
    maxDelay = 30000, // 30 secondes max
    shouldRetry = (error) => isTransientError(error),
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Ne pas retry si ce n'est pas une erreur transitoire
      if (!shouldRetry(error)) {
        throw error;
      }

      // Dernier essai, on abandonne
      if (attempt === maxRetries) {
        throw error;
      }

      // Calculer le délai avec backoff exponentiel + jitter
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
        maxDelay
      );

      console.log(`Retry ${attempt + 1}/${maxRetries} après ${delay}ms...`);
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Détermine si une erreur est transitoire (peut être retryée)
 */
function isTransientError(error) {
  // Erreurs réseau
  if (
    error.code === "ECONNRESET" ||
    error.code === "ETIMEDOUT" ||
    error.code === "ENOTFOUND"
  ) {
    return true;
  }

  // Erreurs HTTP 5xx (serveur)
  if (error.statusCode >= 500) {
    return true;
  }

  // Rate limiting (429)
  if (error.statusCode === 429) {
    return true;
  }

  // Erreurs Stripe spécifiques qui peuvent être retryées
  if (
    error.type === "StripeConnectionError" ||
    error.type === "StripeAPIError"
  ) {
    return true;
  }

  // Les erreurs de carte (card_declined, etc.) ne doivent PAS être retryées
  if (error.type === "StripeCardError") {
    return false;
  }

  return false;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { withRetry, isTransientError };
```

---

## 6. Abstraction pour Multi-Passerelles (OCP + DIP)

Conformément aux principes **Open/Closed (OCP)** et **Dependency Inversion (DIP)** du Module 3, nous concevons une abstraction permettant de supporter plusieurs passerelles de paiement.

### 6.1 Interface de Passerelle de Paiement

```javascript
// payment-gateway-service/src/gateways/PaymentGateway.interface.js

/**
 * Interface abstraite pour les passerelles de paiement
 *
 * Principe OCP : Ouvert à l'extension (nouvelles passerelles),
 *                fermé à la modification
 * Principe DIP : Les services dépendent de cette abstraction,
 *                pas des implémentations concrètes
 */
class PaymentGateway {
  /**
   * Effectue une charge
   * @param {Object} params
   * @param {number} params.amount - Montant en unité monétaire
   * @param {string} params.currency - Code devise ISO 4217
   * @param {string} params.token - Token de paiement
   * @param {string} params.idempotencyKey - Clé d'idempotence
   * @param {Object} params.metadata - Données additionnelles
   * @returns {Promise<Object>} Résultat de la charge
   */
  async charge({ amount, currency, token, idempotencyKey, metadata }) {
    throw new Error('La méthode "charge" doit être implémentée');
  }

  /**
   * Effectue un remboursement
   * @param {Object} params
   * @param {string} params.externalTransactionId - ID de la transaction originale
   * @param {number} [params.amount] - Montant à rembourser (optionnel pour partiel)
   * @returns {Promise<Object>} Résultat du remboursement
   */
  async refund({ externalTransactionId, amount }) {
    throw new Error('La méthode "refund" doit être implémentée');
  }

  /**
   * Vérifie la signature d'un webhook
   * @param {string} payload - Corps brut du webhook
   * @param {string} signature - Signature du header
   * @returns {Object} Événement vérifié
   */
  verifyWebhook(payload, signature) {
    throw new Error('La méthode "verifyWebhook" doit être implémentée');
  }

  /**
   * Nom de la passerelle
   * @returns {string}
   */
  get name() {
    throw new Error('La propriété "name" doit être implémentée');
  }
}

export default PaymentGateway;
```

### 6.2 Implémentation Stripe

```javascript
// payment-gateway-service/src/gateways/StripeGateway.js

import Stripe from "stripe";
import PaymentGateway from "./PaymentGateway.interface.js";

/**
 * Implémentation Stripe de la passerelle de paiement
 *
 * Cette classe implémente l'interface PaymentGateway pour Stripe,
 * permettant de changer de fournisseur sans modifier le code client.
 */
class StripeGateway extends PaymentGateway {
  constructor() {
    super();
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16", // Toujours spécifier la version API
    });
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  }

  get name() {
    return "stripe";
  }

  async charge({ amount, currency, token, idempotencyKey, metadata }) {
    try {
      // Stripe attend les montants en centimes
      const amountInCents = Math.round(amount * 100);

      const charge = await this.stripe.charges.create(
        {
          amount: amountInCents,
          currency: currency.toLowerCase(),
          source: token,
          description: `Réservation ${metadata.bookingId}`,
          metadata: {
            bookingId: metadata.bookingId,
            transactionId: metadata.transactionId,
          },
        },
        {
          idempotencyKey, // Stripe gère l'idempotence nativement
        }
      );

      return {
        id: charge.id,
        status: this._mapStatus(charge.status),
        cardLast4: charge.source?.last4,
        cardBrand: charge.source?.brand,
        raw: charge, // Réponse complète pour debug
      };
    } catch (error) {
      // Transformer les erreurs Stripe en erreurs génériques
      throw this._transformError(error);
    }
  }

  async refund({ externalTransactionId, amount }) {
    try {
      const refundParams = {
        charge: externalTransactionId,
      };

      // Montant optionnel pour remboursement partiel
      if (amount) {
        refundParams.amount = Math.round(amount * 100);
      }

      const refund = await this.stripe.refunds.create(refundParams);

      return {
        id: refund.id,
        status: refund.status,
        amount: refund.amount / 100, // Reconvertir en unité monétaire
        raw: refund,
      };
    } catch (error) {
      throw this._transformError(error);
    }
  }

  verifyWebhook(payload, signature) {
    try {
      return this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret
      );
    } catch (error) {
      throw new Error(`Signature webhook invalide: ${error.message}`);
    }
  }

  /**
   * Mappe les statuts Stripe vers nos statuts internes
   * @private
   */
  _mapStatus(stripeStatus) {
    const statusMap = {
      succeeded: "succeeded",
      pending: "pending",
      failed: "failed",
    };
    return statusMap[stripeStatus] || "pending";
  }

  /**
   * Transforme les erreurs Stripe en erreurs génériques
   * @private
   */
  _transformError(stripeError) {
    const error = new Error(stripeError.message);
    error.code = stripeError.code;
    error.type = stripeError.type;
    error.statusCode = stripeError.statusCode || 500;
    error.raw = stripeError;

    // Codes d'erreur Stripe courants
    if (stripeError.code === "card_declined") {
      error.userMessage = "Votre carte a été refusée";
    } else if (stripeError.code === "insufficient_funds") {
      error.userMessage = "Fonds insuffisants sur votre carte";
    } else if (stripeError.code === "expired_card") {
      error.userMessage = "Votre carte a expiré";
    }

    return error;
  }
}

export default StripeGateway;
```

### 6.3 Factory pour Sélection Dynamique

```javascript
// payment-gateway-service/src/gateways/GatewayFactory.js

import StripeGateway from "./StripeGateway.js";
// import PayPalGateway from './PayPalGateway.js'; // Future implémentation

/**
 * Factory pour créer des instances de passerelles de paiement
 *
 * Permet de sélectionner dynamiquement la passerelle à utiliser
 * basé sur la configuration ou la requête.
 */
class GatewayFactory {
  static gateways = {
    stripe: StripeGateway,
    // paypal: PayPalGateway, // À ajouter plus tard
  };

  /**
   * Crée une instance de passerelle
   * @param {string} gatewayType - Type de passerelle ('stripe', 'paypal')
   * @returns {PaymentGateway} Instance de la passerelle
   */
  static create(gatewayType = "stripe") {
    const GatewayClass = this.gateways[gatewayType.toLowerCase()];

    if (!GatewayClass) {
      throw new Error(
        `Passerelle "${gatewayType}" non supportée. ` +
          `Options disponibles: ${Object.keys(this.gateways).join(", ")}`
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

### 6.4 Injection dans le Container

```javascript
// payment-gateway-service/src/config/container.js

import PaymentTransaction from "../models/PaymentTransaction.js";
import PaymentRepository from "../repositories/PaymentRepository.js";
import PaymentService from "../services/PaymentService.js";
import GatewayFactory from "../gateways/GatewayFactory.js";

/**
 * Conteneur d'Injection de Dépendances - Payment Gateway Service
 *
 * Applique le principe DIP : les dépendances sont injectées,
 * permettant de changer facilement de passerelle de paiement.
 */
function createContainer() {
  // Couche Gateway - sélection dynamique
  const paymentGateway = GatewayFactory.getDefault();

  // Couche Repository
  const paymentRepository = new PaymentRepository(PaymentTransaction);

  // Couche Service
  const paymentService = new PaymentService({
    paymentRepository,
    paymentGateway, // Injection de l'abstraction, pas de l'implémentation
    logger: console,
  });

  return {
    paymentGateway,
    paymentRepository,
    paymentService,
    models: { PaymentTransaction },
  };
}

let container = null;

export function getContainer() {
  if (!container) {
    container = createContainer();
  }
  return container;
}

export function resetContainer() {
  container = null;
}

export default getContainer;
```

---

## 7. Architecture Complète du Service

### 7.1 Structure des Fichiers

```
payment-gateway-service/           # Port 3003
├── server.js                      # Point d'entrée
├── package.json
├── .env.example
│
└── src/
    ├── app.js                     # Configuration Express
    │
    ├── config/
    │   ├── db.js                  # Configuration PostgreSQL
    │   └── container.js           # DI Container
    │
    ├── gateways/                  # Abstractions passerelles
    │   ├── PaymentGateway.interface.js
    │   ├── StripeGateway.js
    │   ├── GatewayFactory.js
    │   └── (PayPalGateway.js)     # Future extension
    │
    ├── repositories/
    │   └── PaymentRepository.js   # Accès données
    │
    ├── services/
    │   └── PaymentService.js      # Logique métier
    │
    ├── controllers/
    │   └── payment.controller.js  # HTTP uniquement
    │
    ├── models/
    │   └── PaymentTransaction.js  # Modèle Sequelize
    │
    ├── routes/
    │   └── payment.routes.js
    │
    ├── middleware/
    │   ├── errorHandler.js
    │   └── webhookVerifier.js     # Vérification signatures
    │
    ├── utils/
    │   ├── response.js
    │   └── retry.js               # Retry avec backoff
    │
    └── database/
        ├── migrate.js
        └── migrations/
```

### 7.2 Diagramme d'Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ARCHITECTURE PAYMENT GATEWAY SERVICE                    │
└─────────────────────────────────────────────────────────────────────────────┘

                          ┌─────────────────────┐
                          │    HTTP Request     │
                          │  POST /payments/*   │
                          └──────────┬──────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                              CONTROLLER LAYER                                │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  payment.controller.js                                                  │ │
│  │  - Extraction des données HTTP                                         │ │
│  │  - Délégation au Service                                               │ │
│  │  - Formatage réponses HTTP                                             │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                               SERVICE LAYER                                  │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  PaymentService.js                                                      │ │
│  │  - Idempotence (vérification clés)                                     │ │
│  │  - Orchestration Repository + Gateway                                   │ │
│  │  - Gestion erreurs métier                                              │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
                           │                    │
                           ▼                    ▼
┌─────────────────────────────────┐  ┌─────────────────────────────────────────┐
│       REPOSITORY LAYER          │  │           GATEWAY LAYER                 │
│  ┌───────────────────────────┐  │  │  ┌───────────────────────────────────┐ │
│  │  PaymentRepository.js     │  │  │  │  PaymentGateway (Interface)       │ │
│  │  - CRUD transactions      │  │  │  │         ▲                         │ │
│  │  - findByIdempotencyKey   │  │  │  │         │ implements              │ │
│  └───────────────────────────┘  │  │  │  ┌──────┴──────┐                  │ │
└─────────────────────────────────┘  │  │  │             │                  │ │
                │                    │  │  ▼             ▼                  │ │
                ▼                    │  │ StripeGateway  PayPalGateway      │ │
┌─────────────────────────────────┐  │  │ (actif)       (future)           │ │
│         PostgreSQL              │  │  └───────────────────────────────────┘ │
│  ┌───────────────────────────┐  │  └─────────────────────────────────────────┘
│  │  payment_transactions     │  │                      │
│  └───────────────────────────┘  │                      ▼
└─────────────────────────────────┘           ┌─────────────────────┐
                                              │    Stripe API       │
                                              │   (externe)         │
                                              └─────────────────────┘
```

---

## Exercices

### Exercice 1 : Schéma API Complet

Définissez le schéma JSON complet (format OpenAPI) pour les endpoints `POST /payments/charge` et `POST /payments/refund`. Incluez tous les champs nécessaires, les validations, et les codes d'erreur possibles.

### Exercice 2 : Génération de Clés d'Idempotence

Décrivez une stratégie pour que le Service de Gestion des Réservations génère des clés d'idempotence uniques et cohérentes. Expliquez pourquoi un simple UUID généré aléatoirement pourrait ne pas être suffisant.

### Exercice 3 : Diagramme d'États de Transaction

Dessinez un diagramme d'états montrant les transitions autorisées pour un `PaymentTransaction` :

- États : `pending`, `succeeded`, `failed`, `refunded`, `partially_refunded`, `disputed`
- Montrez quelles transitions sont valides

### Exercice 4 : Extension Multi-Passerelles

Implémentez une classe `PayPalGateway` qui implémente l'interface `PaymentGateway`. Modifiez `GatewayFactory` pour permettre la sélection dynamique basée sur un paramètre de requête `gatewayType`.

---

## Résumé

Cette leçon a couvert les aspects cruciaux de la conception d'un microservice Passerelle de Paiement dédié :

| Concept                     | Principe SOLID | Application                               |
| --------------------------- | -------------- | ----------------------------------------- |
| **Frontières claires**      | SRP            | Le service ne fait QUE le paiement        |
| **Idempotence**             | -              | Éviter les doubles charges                |
| **Tokenisation**            | -              | Sécurité PCI DSS                          |
| **Abstraction passerelles** | OCP + DIP      | Support multi-fournisseurs                |
| **Architecture en couches** | SRP            | Controller → Service → Repository/Gateway |

---

## Prochaines Étapes

| Leçon   | Sujet                                         |
| ------- | --------------------------------------------- |
| **4.2** | Implémentation pratique avec l'API Stripe     |
| **4.3** | Gestion des webhooks et callbacks asynchrones |
| **4.4** | Stratégies d'authentification (JWT, OAuth2)   |

---

## Navigation

- **⬅️ Précédent** : [Module 3 - Leçon 3.6 - React Avancé : State Management et Hooks Personnalisés](../module-3/lecon-6-advanced-react-state-management.md)
- **➡️ Suivant** : [Leçon 4.2 - Mise en œuvre d'un traitement sécurisé des paiements avec l'API Stripe](lecon-2-stripe-integration.md)
- **🏠 Retour** : [Sommaire du Module 4](README.md)

---

## Ressources

- [Documentation Stripe](https://stripe.com/docs)
- [PCI DSS Compliance](https://www.pcisecuritystandards.org/)
- [Stripe.js Reference](https://stripe.com/docs/js)
- [Module 3 - Principes SOLID](../module-3/README.md)
