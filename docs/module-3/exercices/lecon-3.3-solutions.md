# Solutions des exercices - Leçon 3.3 : Principe de Substitution de Liskov (LSP)

## Exercice 1 : Extension de passerelle de paiement (CryptoGateway)

### Partie 1 : Implémentation initiale (avec défi LSP)

```javascript
// gateways/CryptoGateway.js - Version initiale
const PaymentGateway = require("../interfaces/PaymentGateway");

class CryptoGateway extends PaymentGateway {
  constructor(networkUrl, apiKey) {
    super();
    this.networkUrl = networkUrl;
    this.apiKey = apiKey;
  }

  // ⚠️ PROBLÈME : La signature diffère - walletAddress au lieu de token
  async processPayment(amount, currency, walletAddress) {
    // Validation spécifique aux cryptomonnaies
    const supportedCurrencies = ["BTC", "ETH", "USDT", "USDC"];
    if (!supportedCurrencies.includes(currency)) {
      throw new Error(`Devise crypto non supportée: ${currency}`);
    }

    // Validation de l'adresse du wallet
    if (!this.isValidWalletAddress(walletAddress, currency)) {
      throw new Error(`Adresse wallet invalide pour ${currency}`);
    }

    console.log(
      `Traitement paiement crypto: ${amount} ${currency} vers wallet ${walletAddress}`
    );

    // Simuler la transaction blockchain
    const txHash = `0x${Date.now().toString(16)}${Math.random()
      .toString(16)
      .slice(2)}`;

    return {
      success: true,
      transactionId: txHash,
      blockConfirmations: 0,
      estimatedConfirmationTime: "10-30 minutes",
    };
  }

  async refundPayment(transactionId, amount) {
    console.log(
      `Initiation remboursement crypto pour transaction ${transactionId}, montant: ${amount}`
    );

    // Les remboursements crypto nécessitent une adresse de destination
    // C'est un autre défi LSP - besoin d'informations supplémentaires
    return {
      success: true,
      refundTxHash: `0x${Date.now().toString(16)}`,
      note: "Remboursement initié - confirmation blockchain requise",
    };
  }

  isValidWalletAddress(address, currency) {
    // Validation simplifiée des adresses
    if (currency === "BTC") {
      return address.length >= 26 && address.length <= 35;
    }
    if (currency === "ETH" || currency === "USDT" || currency === "USDC") {
      return address.startsWith("0x") && address.length === 42;
    }
    return false;
  }
}

module.exports = CryptoGateway;
```

### Partie 2 : Analyse des défis LSP

Le `CryptoGateway` présente plusieurs défis de conformité LSP :

1. **Différence de paramètre** : `token` vs `walletAddress`

   - Les clients s'attendent à passer un token de paiement
   - Le crypto gateway a besoin d'une adresse de wallet

2. **Structure de réponse étendue** :

   - Ajoute `blockConfirmations` et `estimatedConfirmationTime`
   - Les clients existants pourraient ne pas gérer ces champs

3. **Devises différentes** :
   - Accepte uniquement les cryptomonnaies
   - Rejetterait "USD", "EUR" que les autres gateways acceptent

### Partie 3 : Solution conforme au LSP avec paramètres polymorphiques

```javascript
// interfaces/PaymentDetails.js
// Interface pour les détails de paiement polymorphiques
class PaymentDetails {
  constructor(amount, currency) {
    this.amount = amount;
    this.currency = currency;
  }

  getPaymentIdentifier() {
    throw new Error("getPaymentIdentifier doit être implémenté");
  }

  validate() {
    throw new Error("validate doit être implémenté");
  }
}

module.exports = PaymentDetails;
```

```javascript
// models/CardPaymentDetails.js
const PaymentDetails = require("../interfaces/PaymentDetails");

class CardPaymentDetails extends PaymentDetails {
  constructor(amount, currency, token) {
    super(amount, currency);
    this.token = token;
  }

  getPaymentIdentifier() {
    return this.token;
  }

  validate() {
    if (!this.token || this.token.length < 10) {
      throw new Error("Token de carte invalide");
    }
    if (!["USD", "EUR", "GBP", "CAD"].includes(this.currency)) {
      throw new Error(
        `Devise non supportée pour paiement carte: ${this.currency}`
      );
    }
    return true;
  }
}

module.exports = CardPaymentDetails;
```

```javascript
// models/CryptoPaymentDetails.js
const PaymentDetails = require("../interfaces/PaymentDetails");

class CryptoPaymentDetails extends PaymentDetails {
  constructor(amount, currency, walletAddress) {
    super(amount, currency);
    this.walletAddress = walletAddress;
  }

  getPaymentIdentifier() {
    return this.walletAddress;
  }

  validate() {
    const supportedCurrencies = ["BTC", "ETH", "USDT", "USDC"];
    if (!supportedCurrencies.includes(this.currency)) {
      throw new Error(`Cryptomonnaie non supportée: ${this.currency}`);
    }

    if (!this.isValidWalletAddress()) {
      throw new Error(`Adresse wallet invalide pour ${this.currency}`);
    }

    return true;
  }

  isValidWalletAddress() {
    if (this.currency === "BTC") {
      return this.walletAddress.length >= 26 && this.walletAddress.length <= 35;
    }
    if (["ETH", "USDT", "USDC"].includes(this.currency)) {
      return (
        this.walletAddress.startsWith("0x") && this.walletAddress.length === 42
      );
    }
    return false;
  }
}

module.exports = CryptoPaymentDetails;
```

```javascript
// interfaces/PaymentGatewayV2.js
// Interface refactorisée pour supporter les paramètres polymorphiques
class PaymentGatewayV2 {
  /**
   * Traite un paiement avec les détails fournis
   * @param {PaymentDetails} paymentDetails - Détails du paiement polymorphiques
   * @returns {Promise<{success: boolean, transactionId: string}>}
   */
  async processPayment(paymentDetails) {
    throw new Error("processPayment doit être implémenté par les sous-classes");
  }

  /**
   * Rembourse un paiement
   * @param {string} transactionId - ID de la transaction originale
   * @param {number} amount - Montant à rembourser
   * @returns {Promise<{success: boolean}>}
   */
  async refundPayment(transactionId, amount) {
    throw new Error("refundPayment doit être implémenté par les sous-classes");
  }

  /**
   * Vérifie si cette passerelle supporte les détails de paiement donnés
   * @param {PaymentDetails} paymentDetails
   * @returns {boolean}
   */
  supportsPaymentDetails(paymentDetails) {
    throw new Error(
      "supportsPaymentDetails doit être implémenté par les sous-classes"
    );
  }
}

module.exports = PaymentGatewayV2;
```

```javascript
// gateways/StripeGatewayV2.js
const PaymentGatewayV2 = require("../interfaces/PaymentGatewayV2");
const CardPaymentDetails = require("../models/CardPaymentDetails");

class StripeGatewayV2 extends PaymentGatewayV2 {
  constructor(apiKey) {
    super();
    this.apiKey = apiKey;
  }

  supportsPaymentDetails(paymentDetails) {
    return paymentDetails instanceof CardPaymentDetails;
  }

  async processPayment(paymentDetails) {
    // Valider que nous pouvons traiter ce type de paiement
    if (!this.supportsPaymentDetails(paymentDetails)) {
      throw new Error("Stripe ne supporte que les paiements par carte");
    }

    paymentDetails.validate();

    console.log(
      `Stripe: Traitement ${paymentDetails.amount} ${paymentDetails.currency}`
    );
    console.log(
      `Stripe: Utilisation token ${paymentDetails.getPaymentIdentifier()}`
    );

    return {
      success: true,
      transactionId: `STRIPE_${Date.now()}`,
    };
  }

  async refundPayment(transactionId, amount) {
    console.log(
      `Stripe: Remboursement ${amount} pour transaction ${transactionId}`
    );
    return { success: true };
  }
}

module.exports = StripeGatewayV2;
```

```javascript
// gateways/CryptoGatewayV2.js
const PaymentGatewayV2 = require("../interfaces/PaymentGatewayV2");
const CryptoPaymentDetails = require("../models/CryptoPaymentDetails");

class CryptoGatewayV2 extends PaymentGatewayV2 {
  constructor(networkUrl, apiKey) {
    super();
    this.networkUrl = networkUrl;
    this.apiKey = apiKey;
  }

  supportsPaymentDetails(paymentDetails) {
    return paymentDetails instanceof CryptoPaymentDetails;
  }

  async processPayment(paymentDetails) {
    // Valider que nous pouvons traiter ce type de paiement
    if (!this.supportsPaymentDetails(paymentDetails)) {
      throw new Error("CryptoGateway ne supporte que les paiements crypto");
    }

    paymentDetails.validate();

    console.log(
      `Crypto: Traitement ${paymentDetails.amount} ${paymentDetails.currency}`
    );
    console.log(`Crypto: Vers wallet ${paymentDetails.getPaymentIdentifier()}`);

    const txHash = `0x${Date.now().toString(16)}${Math.random()
      .toString(16)
      .slice(2)}`;

    return {
      success: true,
      transactionId: txHash,
    };
  }

  async refundPayment(transactionId, amount) {
    console.log(
      `Crypto: Remboursement ${amount} pour transaction ${transactionId}`
    );
    return {
      success: true,
      note: "Remboursement crypto initié",
    };
  }
}

module.exports = CryptoGatewayV2;
```

```javascript
// services/PaymentServiceV2.js
// Service de paiement refactorisé
class PaymentServiceV2 {
  constructor(gateways = []) {
    this.gateways = gateways;
  }

  addGateway(gateway) {
    this.gateways.push(gateway);
  }

  findGatewayFor(paymentDetails) {
    const gateway = this.gateways.find((g) =>
      g.supportsPaymentDetails(paymentDetails)
    );
    if (!gateway) {
      throw new Error(`Aucune passerelle disponible pour ce type de paiement`);
    }
    return gateway;
  }

  async processPayment(bookingId, paymentDetails) {
    console.log(`Initiation paiement pour réservation ${bookingId}`);

    const gateway = this.findGatewayFor(paymentDetails);
    const result = await gateway.processPayment(paymentDetails);

    if (result.success) {
      console.log(
        `Paiement réussi pour ${bookingId}. Transaction: ${result.transactionId}`
      );
    }

    return result;
  }
}

module.exports = PaymentServiceV2;
```

### Partie 4 : Utilisation de la solution conforme LSP

```javascript
// Exemple d'utilisation
const StripeGatewayV2 = require("./gateways/StripeGatewayV2");
const CryptoGatewayV2 = require("./gateways/CryptoGatewayV2");
const PaymentServiceV2 = require("./services/PaymentServiceV2");
const CardPaymentDetails = require("./models/CardPaymentDetails");
const CryptoPaymentDetails = require("./models/CryptoPaymentDetails");

// Configuration du service avec plusieurs passerelles
const paymentService = new PaymentServiceV2([
  new StripeGatewayV2("sk_test_stripe"),
  new CryptoGatewayV2("https://ethereum.network", "crypto_api_key"),
]);

// Paiement par carte - utilise automatiquement Stripe
const cardPayment = new CardPaymentDetails(100, "EUR", "tok_visa_4242");
paymentService.processPayment("BOOK001", cardPayment);
// Output: Stripe: Traitement 100 EUR
// Output: Stripe: Utilisation token tok_visa_4242

// Paiement crypto - utilise automatiquement CryptoGateway
const cryptoPayment = new CryptoPaymentDetails(
  0.005,
  "ETH",
  "0x742d35Cc6634C0532925a3b844Bc9e7595f00000"
);
paymentService.processPayment("BOOK002", cryptoPayment);
// Output: Crypto: Traitement 0.005 ETH
// Output: Crypto: Vers wallet 0x742d35Cc6634C0532925a3b844Bc9e7595f00000
```

---

## Exercice 2 : Raffinement du système de notification

### Partie 1 : Problème avec PushNotificationNotifier

```javascript
// notifiers/PushNotificationNotifier.js - Version problématique
const Notifier = require("../interfaces/Notifier");

class PushNotificationNotifier extends Notifier {
  constructor(pushServiceUrl, appId) {
    super();
    this.pushServiceUrl = pushServiceUrl;
    this.appId = appId;
  }

  // ⚠️ PROBLÈME : Attend deviceId au lieu d'un identifiant générique
  send(deviceId, message) {
    if (!deviceId.startsWith("device_")) {
      throw new Error('Format deviceId invalide. Doit commencer par "device_"');
    }

    // Limite de caractères pour les notifications push
    const title = message.substring(0, 50);
    const body = message.substring(0, 200);

    console.log(`Push vers ${deviceId}:`);
    console.log(`  Titre: ${title}`);
    console.log(`  Corps: ${body}`);

    return true;
  }
}

module.exports = PushNotificationNotifier;
```

### Partie 2 : Solution avec interface NotificationRecipient

```javascript
// interfaces/NotificationRecipient.js
// Interface pour les destinataires de notification
class NotificationRecipient {
  getIdentifier() {
    throw new Error("getIdentifier doit être implémenté");
  }

  getType() {
    throw new Error("getType doit être implémenté");
  }

  validate() {
    throw new Error("validate doit être implémenté");
  }
}

module.exports = NotificationRecipient;
```

```javascript
// models/EmailRecipient.js
const NotificationRecipient = require("../interfaces/NotificationRecipient");

class EmailRecipient extends NotificationRecipient {
  constructor(email, name = "") {
    super();
    this.email = email;
    this.name = name;
  }

  getIdentifier() {
    return this.email;
  }

  getType() {
    return "email";
  }

  validate() {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      throw new Error(`Email invalide: ${this.email}`);
    }
    return true;
  }

  getFormattedRecipient() {
    return this.name ? `${this.name} <${this.email}>` : this.email;
  }
}

module.exports = EmailRecipient;
```

```javascript
// models/PhoneRecipient.js
const NotificationRecipient = require("../interfaces/NotificationRecipient");

class PhoneRecipient extends NotificationRecipient {
  constructor(phoneNumber, countryCode = "+33") {
    super();
    this.phoneNumber = phoneNumber;
    this.countryCode = countryCode;
  }

  getIdentifier() {
    return `${this.countryCode}${this.phoneNumber}`;
  }

  getType() {
    return "sms";
  }

  validate() {
    const phoneRegex = /^\d{9,15}$/;
    if (!phoneRegex.test(this.phoneNumber.replace(/\D/g, ""))) {
      throw new Error(`Numéro de téléphone invalide: ${this.phoneNumber}`);
    }
    return true;
  }
}

module.exports = PhoneRecipient;
```

```javascript
// models/DeviceRecipient.js
const NotificationRecipient = require("../interfaces/NotificationRecipient");

class DeviceRecipient extends NotificationRecipient {
  constructor(deviceId, platform = "unknown") {
    super();
    this.deviceId = deviceId;
    this.platform = platform; // 'ios', 'android', 'web'
  }

  getIdentifier() {
    return this.deviceId;
  }

  getType() {
    return "push";
  }

  validate() {
    if (!this.deviceId || this.deviceId.length < 10) {
      throw new Error(`DeviceId invalide: ${this.deviceId}`);
    }
    return true;
  }

  getPlatform() {
    return this.platform;
  }
}

module.exports = DeviceRecipient;
```

```javascript
// interfaces/NotifierV2.js
// Interface Notifier refactorisée
class NotifierV2 {
  /**
   * Envoie une notification au destinataire
   * @param {NotificationRecipient} recipient - Le destinataire
   * @param {string} message - Le message à envoyer
   * @returns {Promise<{success: boolean, messageId?: string}>}
   */
  async send(recipient, message) {
    throw new Error("send doit être implémenté");
  }

  /**
   * Vérifie si ce notifier supporte le type de destinataire
   * @param {NotificationRecipient} recipient
   * @returns {boolean}
   */
  supportsRecipient(recipient) {
    throw new Error("supportsRecipient doit être implémenté");
  }

  /**
   * Retourne la longueur maximale du message supportée
   * @returns {number}
   */
  getMaxMessageLength() {
    return Infinity; // Par défaut, pas de limite
  }
}

module.exports = NotifierV2;
```

```javascript
// notifiers/EmailNotifierV2.js
const NotifierV2 = require("../interfaces/NotifierV2");
const EmailRecipient = require("../models/EmailRecipient");

class EmailNotifierV2 extends NotifierV2 {
  constructor(smtpConfig) {
    super();
    this.smtpConfig = smtpConfig;
  }

  supportsRecipient(recipient) {
    return recipient instanceof EmailRecipient;
  }

  getMaxMessageLength() {
    return 50000; // Limite généreuse pour les emails
  }

  async send(recipient, message) {
    if (!this.supportsRecipient(recipient)) {
      throw new Error("EmailNotifier ne supporte que EmailRecipient");
    }

    recipient.validate();

    console.log(`📧 Email envoyé à ${recipient.getFormattedRecipient()}`);
    console.log(`   Message: ${message.substring(0, 100)}...`);

    return {
      success: true,
      messageId: `EMAIL_${Date.now()}`,
    };
  }
}

module.exports = EmailNotifierV2;
```

```javascript
// notifiers/SMSNotifierV2.js
const NotifierV2 = require("../interfaces/NotifierV2");
const PhoneRecipient = require("../models/PhoneRecipient");

class SMSNotifierV2 extends NotifierV2 {
  constructor(smsGatewayConfig) {
    super();
    this.smsGatewayConfig = smsGatewayConfig;
  }

  supportsRecipient(recipient) {
    return recipient instanceof PhoneRecipient;
  }

  getMaxMessageLength() {
    return 160; // Limite SMS standard
  }

  async send(recipient, message) {
    if (!this.supportsRecipient(recipient)) {
      throw new Error("SMSNotifier ne supporte que PhoneRecipient");
    }

    recipient.validate();

    // Vérifier la longueur du message - CONFORME LSP
    if (message.length > this.getMaxMessageLength()) {
      throw new Error(
        `Message trop long pour SMS. Max: ${this.getMaxMessageLength()}, Reçu: ${
          message.length
        }`
      );
    }

    console.log(`📱 SMS envoyé à ${recipient.getIdentifier()}`);
    console.log(`   Message: ${message}`);

    return {
      success: true,
      messageId: `SMS_${Date.now()}`,
    };
  }
}

module.exports = SMSNotifierV2;
```

```javascript
// notifiers/PushNotifierV2.js
const NotifierV2 = require("../interfaces/NotifierV2");
const DeviceRecipient = require("../models/DeviceRecipient");

class PushNotifierV2 extends NotifierV2 {
  constructor(pushServiceConfig) {
    super();
    this.pushServiceConfig = pushServiceConfig;
  }

  supportsRecipient(recipient) {
    return recipient instanceof DeviceRecipient;
  }

  getMaxMessageLength() {
    return 200; // Limite pour les notifications push
  }

  async send(recipient, message) {
    if (!this.supportsRecipient(recipient)) {
      throw new Error("PushNotifier ne supporte que DeviceRecipient");
    }

    recipient.validate();

    // Vérifier la longueur du message - CONFORME LSP
    if (message.length > this.getMaxMessageLength()) {
      throw new Error(
        `Message trop long pour Push. Max: ${this.getMaxMessageLength()}, Reçu: ${
          message.length
        }`
      );
    }

    console.log(
      `🔔 Push envoyé à ${recipient.getIdentifier()} (${recipient.getPlatform()})`
    );
    console.log(`   Message: ${message}`);

    return {
      success: true,
      messageId: `PUSH_${Date.now()}`,
    };
  }
}

module.exports = PushNotifierV2;
```

### Partie 3 : Service de notification unifié

```javascript
// services/NotificationServiceV2.js
class NotificationServiceV2 {
  constructor(notifiers = []) {
    this.notifiers = notifiers;
  }

  addNotifier(notifier) {
    this.notifiers.push(notifier);
  }

  findNotifierFor(recipient) {
    const notifier = this.notifiers.find((n) => n.supportsRecipient(recipient));
    if (!notifier) {
      throw new Error(
        `Aucun notifier disponible pour le type: ${recipient.getType()}`
      );
    }
    return notifier;
  }

  /**
   * Envoie une notification au destinataire approprié
   * Vérifie les contraintes de longueur avant l'envoi
   */
  async sendNotification(recipient, message) {
    const notifier = this.findNotifierFor(recipient);
    const maxLength = notifier.getMaxMessageLength();

    // Le client peut vérifier et adapter le message si nécessaire
    if (message.length > maxLength) {
      console.warn(
        `⚠️ Message (${
          message.length
        } chars) dépasse la limite (${maxLength} chars) pour ${recipient.getType()}`
      );
      // Option 1: Lancer une erreur (comportement par défaut du notifier)
      // Option 2: Le client peut choisir de tronquer ou d'adapter
    }

    return notifier.send(recipient, message);
  }

  /**
   * Envoie à plusieurs destinataires avec adaptation automatique du message
   */
  async sendToMultiple(recipients, message, options = { adaptMessage: false }) {
    const results = [];

    for (const recipient of recipients) {
      try {
        const notifier = this.findNotifierFor(recipient);
        let adaptedMessage = message;

        if (options.adaptMessage) {
          const maxLength = notifier.getMaxMessageLength();
          if (message.length > maxLength) {
            adaptedMessage = message.substring(0, maxLength - 3) + "...";
            console.log(
              `📝 Message adapté pour ${recipient.getType()}: ${
                adaptedMessage.length
              } chars`
            );
          }
        }

        const result = await notifier.send(recipient, adaptedMessage);
        results.push({ recipient: recipient.getIdentifier(), ...result });
      } catch (error) {
        results.push({
          recipient: recipient.getIdentifier(),
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }
}

module.exports = NotificationServiceV2;
```

### Partie 4 : Exemple d'utilisation

```javascript
// Utilisation du système de notification refactorisé
const NotificationServiceV2 = require("./services/NotificationServiceV2");
const EmailNotifierV2 = require("./notifiers/EmailNotifierV2");
const SMSNotifierV2 = require("./notifiers/SMSNotifierV2");
const PushNotifierV2 = require("./notifiers/PushNotifierV2");
const EmailRecipient = require("./models/EmailRecipient");
const PhoneRecipient = require("./models/PhoneRecipient");
const DeviceRecipient = require("./models/DeviceRecipient");

// Configuration du service
const notificationService = new NotificationServiceV2([
  new EmailNotifierV2({ host: "smtp.example.com" }),
  new SMSNotifierV2({ apiKey: "sms_api_key" }),
  new PushNotifierV2({ fcmKey: "fcm_api_key" }),
]);

// Créer différents types de destinataires
const emailRecipient = new EmailRecipient("tchalla@wakanda.com", "T'Challa");
const phoneRecipient = new PhoneRecipient("612345678", "+33");
const deviceRecipient = new DeviceRecipient("device_abc123xyz789", "android");

// Message court - fonctionne partout
const shortMessage = "Votre réservation est confirmée!";

// Envoi à tous les types de destinataires
async function sendBookingConfirmation() {
  // Email - pas de contrainte de longueur significative
  await notificationService.sendNotification(emailRecipient, shortMessage);

  // SMS - vérifie la contrainte de 160 caractères
  await notificationService.sendNotification(phoneRecipient, shortMessage);

  // Push - vérifie la contrainte de 200 caractères
  await notificationService.sendNotification(deviceRecipient, shortMessage);
}

// Message long - nécessite adaptation
const longMessage =
  "Votre réservation pour la visite guidée de Paris est confirmée. " +
  "Rendez-vous le 15 janvier 2026 à 9h00 devant la Tour Eiffel. " +
  "Veuillez apporter une pièce d'identité et ce message de confirmation.";

async function sendDetailedNotification() {
  const recipients = [emailRecipient, phoneRecipient, deviceRecipient];

  // Avec adaptation automatique du message
  const results = await notificationService.sendToMultiple(
    recipients,
    longMessage,
    { adaptMessage: true }
  );

  console.log("Résultats:", results);
}

sendBookingConfirmation();
sendDetailedNotification();
```

---

## Exercice 3 : Refactoring de composants React pour le LSP

### Solution complète avec composants Avatar conformes au LSP

```jsx
// interfaces/UserAvatarProps.js
// Définition du contrat de props pour les composants Avatar
/**
 * @typedef {Object} UserAvatarProps
 * @property {Object} user - L'objet utilisateur
 * @property {string} [user.fullName] - Nom complet de l'utilisateur
 * @property {string} [user.profilePictureUrl] - URL de l'image de profil
 * @property {boolean} [user.isAuthenticated] - Statut d'authentification
 * @property {string} [size] - Taille de l'avatar ('small' | 'medium' | 'large')
 * @property {function} [onClick] - Handler de clic optionnel
 */

// Les deux composants Avatar doivent respecter ce contrat
```

```jsx
// components/BaseAvatar.jsx
// Composant de base pour la logique commune
import React from "react";
import PropTypes from "prop-types";
import "./Avatar.css";

const sizeMap = {
  small: 32,
  medium: 48,
  large: 64,
};

const BaseAvatar = ({
  imageUrl,
  altText,
  displayName,
  size = "medium",
  onClick,
  className = "",
}) => {
  const dimension = sizeMap[size] || sizeMap.medium;

  return (
    <div
      className={`avatar-container ${className}`}
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      <img
        src={imageUrl}
        alt={altText}
        className="avatar-image"
        style={{ width: dimension, height: dimension }}
      />
      <span className="avatar-name">{displayName}</span>
    </div>
  );
};

BaseAvatar.propTypes = {
  imageUrl: PropTypes.string.isRequired,
  altText: PropTypes.string.isRequired,
  displayName: PropTypes.string.isRequired,
  size: PropTypes.oneOf(["small", "medium", "large"]),
  onClick: PropTypes.func,
  className: PropTypes.string,
};

export default BaseAvatar;
```

```jsx
// components/GuestUserAvatar.jsx
import React from "react";
import PropTypes from "prop-types";
import BaseAvatar from "./BaseAvatar";

// Image par défaut pour les invités
const DEFAULT_GUEST_AVATAR = "/images/guest-avatar.png";
const GUEST_DISPLAY_NAME = "Utilisateur Invité";

const GuestUserAvatar = ({ user, size, onClick }) => {
  // Même si user est fourni, nous affichons toujours l'avatar invité
  // car ce composant est spécifiquement pour les utilisateurs non authentifiés

  return (
    <BaseAvatar
      imageUrl={DEFAULT_GUEST_AVATAR}
      altText="Avatar utilisateur invité"
      displayName={GUEST_DISPLAY_NAME}
      size={size}
      onClick={onClick}
      className="guest-avatar"
    />
  );
};

GuestUserAvatar.propTypes = {
  user: PropTypes.shape({
    isAuthenticated: PropTypes.bool,
  }),
  size: PropTypes.oneOf(["small", "medium", "large"]),
  onClick: PropTypes.func,
};

GuestUserAvatar.defaultProps = {
  size: "medium",
};

export default GuestUserAvatar;
```

```jsx
// components/AuthenticatedUserAvatar.jsx
import React from "react";
import PropTypes from "prop-types";
import BaseAvatar from "./BaseAvatar";

// Image par défaut si l'utilisateur authentifié n'a pas de photo
const DEFAULT_AUTH_AVATAR = "/images/default-user-avatar.png";

const AuthenticatedUserAvatar = ({ user, size, onClick }) => {
  // Gestion gracieuse des données manquantes - conforme LSP
  const profilePicture = user?.profilePictureUrl || DEFAULT_AUTH_AVATAR;
  const displayName = user?.fullName || "Utilisateur";

  return (
    <BaseAvatar
      imageUrl={profilePicture}
      altText={`Avatar de ${displayName}`}
      displayName={displayName}
      size={size}
      onClick={onClick}
      className="authenticated-avatar"
    />
  );
};

AuthenticatedUserAvatar.propTypes = {
  user: PropTypes.shape({
    fullName: PropTypes.string,
    profilePictureUrl: PropTypes.string,
    isAuthenticated: PropTypes.bool,
  }).isRequired,
  size: PropTypes.oneOf(["small", "medium", "large"]),
  onClick: PropTypes.func,
};

AuthenticatedUserAvatar.defaultProps = {
  size: "medium",
};

export default AuthenticatedUserAvatar;
```

```jsx
// components/UserProfileHeader.jsx
import React from "react";
import PropTypes from "prop-types";
import GuestUserAvatar from "./GuestUserAvatar";
import AuthenticatedUserAvatar from "./AuthenticatedUserAvatar";
import "./UserProfileHeader.css";

const UserProfileHeader = ({ user, onAvatarClick }) => {
  // Déterminer quel composant Avatar utiliser
  // Les deux composants sont SUBSTITUABLES car ils respectent le même contrat de props
  const AvatarComponent = user?.isAuthenticated
    ? AuthenticatedUserAvatar
    : GuestUserAvatar;

  return (
    <header className="user-profile-header">
      <AvatarComponent user={user} size="large" onClick={onAvatarClick} />

      <div className="user-actions">
        {user?.isAuthenticated ? (
          <>
            <button className="btn-settings">Paramètres</button>
            <button className="btn-logout">Déconnexion</button>
          </>
        ) : (
          <>
            <button className="btn-login">Connexion</button>
            <button className="btn-register">Inscription</button>
          </>
        )}
      </div>
    </header>
  );
};

UserProfileHeader.propTypes = {
  user: PropTypes.shape({
    fullName: PropTypes.string,
    profilePictureUrl: PropTypes.string,
    isAuthenticated: PropTypes.bool,
  }),
  onAvatarClick: PropTypes.func,
};

export default UserProfileHeader;
```

### Démonstration de la conformité LSP

```jsx
// App.jsx - Démonstration de l'utilisation
import React, { useState } from "react";
import UserProfileHeader from "./components/UserProfileHeader";
import GuestUserAvatar from "./components/GuestUserAvatar";
import AuthenticatedUserAvatar from "./components/AuthenticatedUserAvatar";

function App() {
  const [currentUser, setCurrentUser] = useState(null);

  // Utilisateur invité
  const guestUser = {
    isAuthenticated: false,
  };

  // Utilisateur authentifié complet
  const authenticatedUser = {
    fullName: "Shuri",
    profilePictureUrl: "https://wakanda.com/shuri.jpg",
    isAuthenticated: true,
  };

  // Utilisateur authentifié avec données partielles
  const partialAuthUser = {
    fullName: "Peter Parker",
    // Pas de profilePictureUrl - le composant doit gérer ce cas
    isAuthenticated: true,
  };

  const handleAvatarClick = () => {
    console.log("Avatar cliqué!");
  };

  return (
    <div className="app">
      <h1>Démonstration LSP - Composants Avatar</h1>

      {/* Test 1: Utilisateur invité */}
      <section>
        <h2>1. Utilisateur Invité</h2>
        <UserProfileHeader user={guestUser} onAvatarClick={handleAvatarClick} />
      </section>

      {/* Test 2: Utilisateur authentifié complet */}
      <section>
        <h2>2. Utilisateur Authentifié (données complètes)</h2>
        <UserProfileHeader
          user={authenticatedUser}
          onAvatarClick={handleAvatarClick}
        />
      </section>

      {/* Test 3: Utilisateur authentifié avec données partielles */}
      <section>
        <h2>3. Utilisateur Authentifié (données partielles)</h2>
        <UserProfileHeader
          user={partialAuthUser}
          onAvatarClick={handleAvatarClick}
        />
      </section>

      {/* Test 4: Substitution directe des composants */}
      <section>
        <h2>4. Test de substitution directe</h2>
        <div style={{ display: "flex", gap: "20px" }}>
          {/* Les deux composants peuvent être utilisés de manière interchangeable */}
          <GuestUserAvatar
            user={guestUser}
            size="medium"
            onClick={handleAvatarClick}
          />
          <AuthenticatedUserAvatar
            user={authenticatedUser}
            size="medium"
            onClick={handleAvatarClick}
          />
          {/* AuthenticatedUserAvatar gère gracieusement les données manquantes */}
          <AuthenticatedUserAvatar
            user={partialAuthUser}
            size="medium"
            onClick={handleAvatarClick}
          />
        </div>
      </section>
    </div>
  );
}

export default App;
```

### Analyse de la conformité LSP dans les composants

```jsx
// tests/AvatarLSP.test.jsx
import { render, screen, fireEvent } from "@testing-library/react";
import GuestUserAvatar from "../components/GuestUserAvatar";
import AuthenticatedUserAvatar from "../components/AuthenticatedUserAvatar";

describe("LSP Compliance Tests for Avatar Components", () => {
  const mockOnClick = jest.fn();

  // Les deux composants doivent accepter les mêmes props de base
  const commonProps = {
    size: "medium",
    onClick: mockOnClick,
  };

  beforeEach(() => {
    mockOnClick.mockClear();
  });

  describe("Contrat de props commun", () => {
    test("GuestUserAvatar accepte le contrat de props standard", () => {
      render(
        <GuestUserAvatar user={{ isAuthenticated: false }} {...commonProps} />
      );

      expect(screen.getByText("Utilisateur Invité")).toBeInTheDocument();
      expect(screen.getByRole("img")).toBeInTheDocument();
    });

    test("AuthenticatedUserAvatar accepte le contrat de props standard", () => {
      const user = {
        fullName: "Test User",
        profilePictureUrl: "https://example.com/avatar.jpg",
        isAuthenticated: true,
      };

      render(<AuthenticatedUserAvatar user={user} {...commonProps} />);

      expect(screen.getByText("Test User")).toBeInTheDocument();
      expect(screen.getByRole("img")).toBeInTheDocument();
    });
  });

  describe("Comportement onClick cohérent", () => {
    test("GuestUserAvatar déclenche onClick", () => {
      render(
        <GuestUserAvatar user={{ isAuthenticated: false }} {...commonProps} />
      );

      fireEvent.click(screen.getByRole("img"));
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    test("AuthenticatedUserAvatar déclenche onClick", () => {
      const user = { fullName: "Test", isAuthenticated: true };
      render(<AuthenticatedUserAvatar user={user} {...commonProps} />);

      fireEvent.click(screen.getByRole("img"));
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("Gestion gracieuse des données manquantes", () => {
    test("AuthenticatedUserAvatar gère un user sans profilePictureUrl", () => {
      const user = { fullName: "Test User", isAuthenticated: true };

      // Ne doit pas lancer d'erreur
      expect(() => {
        render(<AuthenticatedUserAvatar user={user} {...commonProps} />);
      }).not.toThrow();

      expect(screen.getByRole("img")).toBeInTheDocument();
    });

    test("AuthenticatedUserAvatar gère un user sans fullName", () => {
      const user = {
        profilePictureUrl: "https://example.com/avatar.jpg",
        isAuthenticated: true,
      };

      expect(() => {
        render(<AuthenticatedUserAvatar user={user} {...commonProps} />);
      }).not.toThrow();

      // Doit afficher une valeur par défaut
      expect(screen.getByText("Utilisateur")).toBeInTheDocument();
    });
  });

  describe("Substitutabilité dans un conteneur parent", () => {
    // Simule le comportement de UserProfileHeader
    const renderAvatarContainer = (AvatarComponent, user) => {
      return render(
        <div data-testid="avatar-container">
          <AvatarComponent user={user} size="large" onClick={mockOnClick} />
        </div>
      );
    };

    test("GuestUserAvatar peut remplacer AuthenticatedUserAvatar dans le conteneur", () => {
      renderAvatarContainer(GuestUserAvatar, { isAuthenticated: false });

      const container = screen.getByTestId("avatar-container");
      expect(container).toBeInTheDocument();
      expect(screen.getByRole("img")).toBeInTheDocument();
    });

    test("AuthenticatedUserAvatar peut remplacer GuestUserAvatar dans le conteneur", () => {
      const authUser = { fullName: "Wanda Maximoff", isAuthenticated: true };
      renderAvatarContainer(AuthenticatedUserAvatar, authUser);

      const container = screen.getByTestId("avatar-container");
      expect(container).toBeInTheDocument();
      expect(screen.getByRole("img")).toBeInTheDocument();
    });
  });
});
```

### Points clés de la conformité LSP

| Aspect             | GuestUserAvatar | AuthenticatedUserAvatar | Conformité LSP |
| ------------------ | --------------- | ----------------------- | -------------- |
| Prop `user`        | Acceptée        | Acceptée                | ✅             |
| Prop `size`        | Acceptée        | Acceptée                | ✅             |
| Prop `onClick`     | Fonctionne      | Fonctionne              | ✅             |
| Rendu d'image      | Toujours        | Toujours                | ✅             |
| Rendu de nom       | Toujours        | Toujours                | ✅             |
| Données manquantes | Géré            | Géré avec défauts       | ✅             |

Les deux composants peuvent être substitués l'un à l'autre dans `UserProfileHeader` sans modifier le comportement attendu du composant parent. C'est l'essence du Principe de Substitution de Liskov appliqué aux composants React.

---

## Bonus : LSP avec Custom Hooks (React 18.x moderne)

Dans React moderne, les **Custom Hooks** sont le moyen privilégié pour partager la logique. Voici comment appliquer le LSP aux hooks.

### Exemple : Hook useUserData avec substitution pour les tests

```jsx
// hooks/useUserData.js - Hook de production
import { useState, useEffect, useCallback } from "react";
import { userService } from "../services/userService";

/**
 * Hook pour récupérer et gérer les données utilisateur
 * @returns {{ user: User | null, isLoading: boolean, error: Error | null, refetch: () => void }}
 */
export function useUserData(userId) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUser = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const userData = await userService.getUser(userId);
      setUser(userData);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const refetch = useCallback(() => {
    fetchUser();
  }, [fetchUser]);

  // Contrat : { user, isLoading, error, refetch }
  return { user, isLoading, error, refetch };
}
```

```jsx
// hooks/useMockUserData.js - Hook de test substituable
import { useState, useCallback } from "react";

/**
 * Hook mock pour les tests - DOIT respecter le même contrat que useUserData
 * @returns {{ user: User | null, isLoading: boolean, error: Error | null, refetch: () => void }}
 */
export function useMockUserData(userId, mockData = {}) {
  const [user, setUser] = useState(mockData.user || null);
  const [isLoading] = useState(mockData.isLoading || false);
  const [error] = useState(mockData.error || null);

  const refetch = useCallback(() => {
    console.log("Mock refetch called for userId:", userId);
    // Ne fait rien en mock, mais respecte le contrat
  }, [userId]);

  // ✅ Même contrat que useUserData
  return { user, isLoading, error, refetch };
}
```

```jsx
// components/UserDashboard.jsx - Composant consommateur
import { useUserData } from "../hooks/useUserData";
// Pour les tests : import { useMockUserData as useUserData } from '../hooks/useMockUserData';

function UserDashboard({ userId }) {
  // Fonctionne avec useUserData OU useMockUserData grâce au LSP
  const { user, isLoading, error, refetch } = useUserData(userId);

  if (isLoading) {
    return <div className="loading">Chargement du profil...</div>;
  }

  if (error) {
    return (
      <div className="error">
        <p>Erreur: {error.message}</p>
        <button onClick={refetch}>Réessayer</button>
      </div>
    );
  }

  if (!user) {
    return <div>Utilisateur non trouvé</div>;
  }

  return (
    <div className="user-dashboard">
      <h1>Bienvenue, {user.fullName}</h1>
      <p>Email: {user.email}</p>
      <button onClick={refetch}>Actualiser</button>
    </div>
  );
}

export default UserDashboard;
```

### Tests avec substitution de hooks

```jsx
// tests/UserDashboard.test.jsx
import { render, screen, fireEvent } from "@testing-library/react";
import UserDashboard from "../components/UserDashboard";

// Mock du hook - respecte le contrat LSP
jest.mock("../hooks/useUserData", () => ({
  useUserData: jest.fn(),
}));

import { useUserData } from "../hooks/useUserData";

describe("UserDashboard avec hook substituable", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("affiche le chargement quand isLoading est true", () => {
    // Le mock respecte le contrat : { user, isLoading, error, refetch }
    useUserData.mockReturnValue({
      user: null,
      isLoading: true,
      error: null,
      refetch: jest.fn(),
    });

    render(<UserDashboard userId="123" />);
    expect(screen.getByText("Chargement du profil...")).toBeInTheDocument();
  });

  test("affiche les données utilisateur quand chargées", () => {
    useUserData.mockReturnValue({
      user: { fullName: "Tony Stark", email: "tony@starkindustries.com" },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<UserDashboard userId="123" />);
    expect(screen.getByText("Bienvenue, Tony Stark")).toBeInTheDocument();
    expect(
      screen.getByText("Email: tony@starkindustries.com")
    ).toBeInTheDocument();
  });

  test("affiche erreur et permet de réessayer", () => {
    const mockRefetch = jest.fn();
    useUserData.mockReturnValue({
      user: null,
      isLoading: false,
      error: new Error("Erreur réseau"),
      refetch: mockRefetch,
    });

    render(<UserDashboard userId="123" />);
    expect(screen.getByText("Erreur: Erreur réseau")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Réessayer"));
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });
});
```

### Tableau de conformité LSP pour les Hooks

| Élément du contrat      | useUserData (prod)    | useMockUserData (test) | Conformité |
| ----------------------- | --------------------- | ---------------------- | ---------- |
| `user` (User \| null)   | ✅ Retourné           | ✅ Retourné            | ✅         |
| `isLoading` (boolean)   | ✅ Retourné           | ✅ Retourné            | ✅         |
| `error` (Error \| null) | ✅ Retourné           | ✅ Retourné            | ✅         |
| `refetch` (function)    | ✅ Fonction appelable | ✅ Fonction appelable  | ✅         |

> 💡 **Clé du LSP avec les Hooks** : Le contrat de retour (interface) doit être identique. Les composants consommateurs ne doivent pas avoir besoin de savoir quel hook ils utilisent réellement.
