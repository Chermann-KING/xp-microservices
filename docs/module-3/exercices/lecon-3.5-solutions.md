# Solutions des Exercices - Leçon 3.5 : Dependency Inversion Principle (DIP)

**Module 3** : Principes SOLID, Design Patterns et React Avancé

---

## Exercice 1 : Refactorer le Service de Confirmation de Réservation

### Étape 1 : Créer l'interface INotificationService

```javascript
// ===== interfaces/INotificationService.js =====

/**
 * Interface abstraite pour les services de notification.
 * Définit le contrat que toute implémentation doit respecter.
 */
class INotificationService {
  /**
   * Envoie une notification à un destinataire
   * @param {string} recipient - Email, numéro de téléphone, etc.
   * @param {string} subject - Sujet de la notification
   * @param {string} message - Corps du message
   * @returns {Promise<Object>} - Résultat de l'envoi
   */
  async sendNotification(recipient, subject, message) {
    throw new Error("La méthode 'sendNotification()' doit être implémentée.");
  }

  /**
   * Vérifie si le service est disponible
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    throw new Error("La méthode 'isAvailable()' doit être implémentée.");
  }

  /**
   * Retourne le type de notification supporté
   * @returns {string}
   */
  getNotificationType() {
    throw new Error(
      "La méthode 'getNotificationType()' doit être implémentée."
    );
  }
}

module.exports = INotificationService;
```

### Étape 2 : Implémenter EmailService

```javascript
// ===== services/EmailService.js =====
const INotificationService = require("../interfaces/INotificationService");

/**
 * Service d'envoi d'emails via AWS SES
 * Implémente INotificationService
 */
class EmailService extends INotificationService {
  constructor(config = {}) {
    super();
    this.provider = config.provider || "ses";
    this.apiKey = config.apiKey;
    this.fromAddress = config.fromAddress || "noreply@tourismapp.com";
    this.fromName = config.fromName || "Tourism App";

    console.log(`EmailService initialisé (provider: ${this.provider})`);
  }

  async sendNotification(recipient, subject, message) {
    // Validation de l'email
    if (!this.isValidEmail(recipient)) {
      throw new Error(`Email invalide: ${recipient}`);
    }

    console.log(`[Email] Envoi à ${recipient}`);
    console.log(`[Email] Sujet: ${subject}`);
    console.log(`[Email] Message: ${message.substring(0, 100)}...`);

    // Simulation d'envoi d'email via AWS SES
    // En production: utiliser @aws-sdk/client-ses
    const result = await this.simulateSendEmail({
      to: recipient,
      from: `${this.fromName} <${this.fromAddress}>`,
      subject,
      body: message,
    });

    return {
      success: true,
      type: "email",
      messageId: result.messageId,
      recipient,
      sentAt: new Date().toISOString(),
    };
  }

  async isAvailable() {
    // Vérifier la disponibilité du service SES
    try {
      // En production: vérifier la connexion à SES
      return true;
    } catch (error) {
      console.error("EmailService non disponible:", error.message);
      return false;
    }
  }

  getNotificationType() {
    return "email";
  }

  // Méthodes privées
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  async simulateSendEmail(emailData) {
    // Simulation de délai réseau
    await new Promise((resolve) => setTimeout(resolve, 100));

    return {
      messageId: `ses-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...emailData,
    };
  }
}

module.exports = EmailService;
```

### Étape 3 : Implémenter SMSService

```javascript
// ===== services/SMSService.js =====
const INotificationService = require("../interfaces/INotificationService");

/**
 * Service d'envoi de SMS via Twilio
 * Implémente INotificationService
 */
class SMSService extends INotificationService {
  constructor(config = {}) {
    super();
    this.provider = config.provider || "twilio";
    this.accountSid = config.accountSid;
    this.authToken = config.authToken;
    this.fromNumber = config.fromNumber || "+33600000000";

    console.log(`SMSService initialisé (provider: ${this.provider})`);
  }

  async sendNotification(recipient, subject, message) {
    // Validation du numéro de téléphone
    if (!this.isValidPhoneNumber(recipient)) {
      throw new Error(`Numéro de téléphone invalide: ${recipient}`);
    }

    // Pour SMS, on combine sujet et message (les SMS n'ont pas de sujet)
    const smsContent = subject ? `${subject}: ${message}` : message;

    // Tronquer si trop long (limite SMS: 160 caractères)
    const truncatedContent =
      smsContent.length > 160
        ? smsContent.substring(0, 157) + "..."
        : smsContent;

    console.log(`[SMS] Envoi à ${recipient}`);
    console.log(`[SMS] Message: ${truncatedContent}`);

    // Simulation d'envoi SMS via Twilio
    // En production: utiliser twilio npm package
    const result = await this.simulateSendSMS({
      to: recipient,
      from: this.fromNumber,
      body: truncatedContent,
    });

    return {
      success: true,
      type: "sms",
      messageId: result.sid,
      recipient,
      sentAt: new Date().toISOString(),
      segments: Math.ceil(smsContent.length / 160),
    };
  }

  async isAvailable() {
    try {
      // En production: vérifier la connexion à Twilio
      return true;
    } catch (error) {
      console.error("SMSService non disponible:", error.message);
      return false;
    }
  }

  getNotificationType() {
    return "sms";
  }

  // Méthodes privées
  isValidPhoneNumber(phone) {
    // Format international simple
    const phoneRegex = /^\+[1-9]\d{6,14}$/;
    return phoneRegex.test(phone);
  }

  async simulateSendSMS(smsData) {
    await new Promise((resolve) => setTimeout(resolve, 150));

    return {
      sid: `twilio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: "sent",
      ...smsData,
    };
  }
}

module.exports = SMSService;
```

### Étape 4 : Implémenter PushNotificationService (Bonus)

```javascript
// ===== services/PushNotificationService.js =====
const INotificationService = require("../interfaces/INotificationService");

/**
 * Service d'envoi de notifications push via Firebase
 * Implémente INotificationService
 */
class PushNotificationService extends INotificationService {
  constructor(config = {}) {
    super();
    this.provider = "firebase";
    this.projectId = config.projectId;

    console.log(`PushNotificationService initialisé (Firebase)`);
  }

  async sendNotification(recipient, subject, message) {
    // recipient = device token pour les push notifications
    console.log(`[Push] Envoi à device: ${recipient.substring(0, 20)}...`);
    console.log(`[Push] Titre: ${subject}`);
    console.log(`[Push] Corps: ${message}`);

    const result = await this.simulateSendPush({
      token: recipient,
      notification: {
        title: subject,
        body: message,
      },
    });

    return {
      success: true,
      type: "push",
      messageId: result.messageId,
      recipient: recipient.substring(0, 20) + "...",
      sentAt: new Date().toISOString(),
    };
  }

  async isAvailable() {
    return true;
  }

  getNotificationType() {
    return "push";
  }

  async simulateSendPush(pushData) {
    await new Promise((resolve) => setTimeout(resolve, 80));

    return {
      messageId: `fcm-${Date.now()}`,
      ...pushData,
    };
  }
}

module.exports = PushNotificationService;
```

### Étape 5 : BookingConfirmationManager avec DIP

```javascript
// ===== managers/BookingConfirmationManager.js =====
const INotificationService = require("../interfaces/INotificationService");

/**
 * Gestionnaire de confirmations de réservation
 * Module de HAUT NIVEAU qui dépend de l'abstraction INotificationService
 */
class BookingConfirmationManager {
  /**
   * @param {INotificationService} notificationService - Service de notification injecté
   */
  constructor(notificationService) {
    if (!(notificationService instanceof INotificationService)) {
      throw new Error(
        "notificationService doit être une instance de INotificationService"
      );
    }

    this.notificationService = notificationService;
    console.log(
      `BookingConfirmationManager initialisé avec ${notificationService.getNotificationType()}`
    );
  }

  /**
   * Envoie une confirmation de réservation
   * @param {Object} booking - Détails de la réservation
   * @returns {Promise<Object>} - Résultat de l'envoi
   */
  async sendConfirmation(booking) {
    const {
      id,
      customerName,
      customerEmail,
      customerPhone,
      tourName,
      travelDate,
      totalPrice,
    } = booking;

    // Déterminer le destinataire selon le type de notification
    const notificationType = this.notificationService.getNotificationType();
    let recipient;

    switch (notificationType) {
      case "sms":
        recipient = customerPhone;
        break;
      case "push":
        recipient = booking.deviceToken;
        break;
      case "email":
      default:
        recipient = customerEmail;
    }

    if (!recipient) {
      throw new Error(
        `Destinataire manquant pour notification de type ${notificationType}`
      );
    }

    // Construire le message
    const subject = `Confirmation de réservation #${id}`;
    const message = this.buildConfirmationMessage(booking);

    // Vérifier la disponibilité du service
    const isAvailable = await this.notificationService.isAvailable();
    if (!isAvailable) {
      throw new Error(
        `Service de notification ${notificationType} non disponible`
      );
    }

    // Envoyer la notification via l'abstraction
    const result = await this.notificationService.sendNotification(
      recipient,
      subject,
      message
    );

    console.log(
      `✅ Confirmation envoyée via ${notificationType} pour réservation #${id}`
    );

    return {
      bookingId: id,
      notificationResult: result,
      sentVia: notificationType,
    };
  }

  /**
   * Envoie un rappel de réservation
   */
  async sendReminder(booking, daysUntilTravel) {
    const subject = `Rappel: Votre visite dans ${daysUntilTravel} jour(s)`;
    const message = `Bonjour ${
      booking.customerName
    },\n\nN'oubliez pas votre réservation "${booking.tourName}" prévue le ${
      booking.travelDate
    }.\n\nPoint de rendez-vous: ${
      booking.meetingPoint || "À confirmer"
    }\n\nBon voyage !`;

    const notificationType = this.notificationService.getNotificationType();
    const recipient =
      notificationType === "sms"
        ? booking.customerPhone
        : booking.customerEmail;

    return this.notificationService.sendNotification(
      recipient,
      subject,
      message
    );
  }

  /**
   * Construit le message de confirmation
   */
  buildConfirmationMessage(booking) {
    return `
Bonjour ${booking.customerName},

Votre réservation a été confirmée !

📋 Détails de la réservation:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎫 Référence: #${booking.id}
🏛️ Visite: ${booking.tourName}
📅 Date: ${booking.travelDate}
👥 Participants: ${booking.participants?.totalCount || 1}
💰 Total: ${booking.totalPrice} €

📍 Point de rendez-vous:
${booking.meetingPoint || "Vous recevrez les détails par email séparément."}

Merci de votre confiance !
L'équipe Tourism App
    `.trim();
  }
}

module.exports = BookingConfirmationManager;
```

### Étape 6 : Démonstration d'utilisation

```javascript
// ===== demo/notificationDemo.js =====
const BookingConfirmationManager = require("../managers/BookingConfirmationManager");
const EmailService = require("../services/EmailService");
const SMSService = require("../services/SMSService");
const PushNotificationService = require("../services/PushNotificationService");

// Données de réservation de test (personnages Marvel)
const testBooking = {
  id: "BK-2026-001234",
  customerName: "Tony Stark",
  customerEmail: "tony@starkindustries.com",
  customerPhone: "+33612345678",
  deviceToken: "fcm-token-abc123xyz",
  tourName: "Visite du QG Avengers",
  travelDate: "2026-06-15",
  participants: {
    adults: 2,
    children: 1,
    totalCount: 3,
  },
  totalPrice: 450,
  meetingPoint: "Avengers Tower, Manhattan, NY",
};

async function demonstrateWithEmail() {
  console.log("\n=== DÉMONSTRATION AVEC EMAIL SERVICE ===\n");

  const emailService = new EmailService({
    provider: "ses",
    fromAddress: "reservations@tourismapp.com",
    fromName: "Tourism App Réservations",
  });

  const emailManager = new BookingConfirmationManager(emailService);

  const result = await emailManager.sendConfirmation(testBooking);
  console.log("Résultat:", JSON.stringify(result, null, 2));
}

async function demonstrateWithSMS() {
  console.log("\n=== DÉMONSTRATION AVEC SMS SERVICE ===\n");

  const smsService = new SMSService({
    provider: "twilio",
    fromNumber: "+33700000000",
  });

  const smsManager = new BookingConfirmationManager(smsService);

  const result = await smsManager.sendConfirmation(testBooking);
  console.log("Résultat:", JSON.stringify(result, null, 2));
}

async function demonstrateWithPush() {
  console.log("\n=== DÉMONSTRATION AVEC PUSH NOTIFICATION ===\n");

  const pushService = new PushNotificationService({
    projectId: "tourism-app-firebase",
  });

  const pushManager = new BookingConfirmationManager(pushService);

  const result = await pushManager.sendConfirmation(testBooking);
  console.log("Résultat:", JSON.stringify(result, null, 2));
}

// Exécuter les démonstrations
async function main() {
  try {
    await demonstrateWithEmail();
    await demonstrateWithSMS();
    await demonstrateWithPush();

    console.log("\n✅ Toutes les démonstrations terminées avec succès !");
  } catch (error) {
    console.error("Erreur:", error.message);
  }
}

main();
```

### Résultat attendu

```
=== DÉMONSTRATION AVEC EMAIL SERVICE ===

EmailService initialisé (provider: ses)
BookingConfirmationManager initialisé avec email
[Email] Envoi à tony@starkindustries.com
[Email] Sujet: Confirmation de réservation #BK-2026-001234
[Email] Message:
Bonjour Tony Stark,

Votre réservation a été confirmée !

📋 Détails de...
✅ Confirmation envoyée via email pour réservation #BK-2026-001234
Résultat: {
  "bookingId": "BK-2026-001234",
  "notificationResult": {
    "success": true,
    "type": "email",
    "messageId": "ses-1704292800000-abc123",
    "recipient": "tony@starkindustries.com"
  },
  "sentVia": "email"
}

=== DÉMONSTRATION AVEC SMS SERVICE ===

SMSService initialisé (provider: twilio)
BookingConfirmationManager initialisé avec sms
[SMS] Envoi à +33612345678
[SMS] Message: Confirmation de réservation #BK-2026-001234:
Bonjour Tony Stark,

Votre réservation a...
✅ Confirmation envoyée via sms pour réservation #BK-2026-001234
...

✅ Toutes les démonstrations terminées avec succès !
```

---

## Exercice 2 : Service d'Authentification en React

### Étape 1 : Définir l'interface IAuthService

```javascript
// ===== services/authService.js =====

/**
 * Interface conceptuelle pour le service d'authentification
 * @interface IAuthService
 * @property {function} fetchUser - Récupère les informations d'un utilisateur
 * @property {function} login - Authentifie un utilisateur
 * @property {function} logout - Déconnecte l'utilisateur
 * @property {function} getCurrentUser - Retourne l'utilisateur actuel
 */

// Implémentation Live (Production)
export const LiveAuthService = {
  async fetchUser(userId) {
    console.log(`[LiveAuth] Récupération utilisateur ${userId}...`);

    const response = await fetch(`/api/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (!response.ok) {
      throw new Error("Utilisateur non trouvé");
    }

    return response.json();
  },

  async login(credentials) {
    console.log(`[LiveAuth] Connexion pour ${credentials.email}...`);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      throw new Error("Identifiants invalides");
    }

    const data = await response.json();
    localStorage.setItem("token", data.token);
    localStorage.setItem("userId", data.user.id);

    return data.user;
  },

  async logout() {
    console.log("[LiveAuth] Déconnexion...");
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    return true;
  },

  getCurrentUser() {
    const userId = localStorage.getItem("userId");
    return userId ? { id: userId } : null;
  },
};

// Implémentation Mock (Tests/Développement)
export const MockAuthService = {
  // Base de données mock avec personnages Marvel
  _mockUsers: {
    "user-001": {
      id: "user-001",
      name: "Tony Stark",
      email: "tony@starkindustries.com",
      avatar: "https://example.com/avatars/tony.jpg",
      role: "premium",
      bookingsCount: 15,
    },
    "user-002": {
      id: "user-002",
      name: "Peter Parker",
      email: "peter@dailybugle.com",
      avatar: "https://example.com/avatars/peter.jpg",
      role: "standard",
      bookingsCount: 3,
    },
    "user-003": {
      id: "user-003",
      name: "Natasha Romanoff",
      email: "natasha@avengers.com",
      avatar: "https://example.com/avatars/natasha.jpg",
      role: "premium",
      bookingsCount: 8,
    },
  },
  _currentUser: null,

  async fetchUser(userId) {
    console.log(`[MockAuth] Récupération utilisateur ${userId}...`);

    // Simulation de délai réseau
    await new Promise((resolve) => setTimeout(resolve, 300));

    const user = this._mockUsers[userId];

    if (!user) {
      throw new Error("Utilisateur non trouvé");
    }

    return { ...user };
  },

  async login(credentials) {
    console.log(`[MockAuth] Connexion pour ${credentials.email}...`);

    await new Promise((resolve) => setTimeout(resolve, 500));

    // Trouver l'utilisateur par email
    const user = Object.values(this._mockUsers).find(
      (u) => u.email === credentials.email
    );

    if (!user) {
      throw new Error("Identifiants invalides");
    }

    // Simuler le stockage de session
    this._currentUser = user;

    return { ...user };
  },

  async logout() {
    console.log("[MockAuth] Déconnexion...");
    await new Promise((resolve) => setTimeout(resolve, 100));
    this._currentUser = null;
    return true;
  },

  getCurrentUser() {
    return this._currentUser ? { ...this._currentUser } : null;
  },
};
```

### Étape 2 : Composant UserProfile avec injection par props

```jsx
// ===== components/UserProfile.jsx =====
import React, { useState, useEffect } from "react";

/**
 * Composant UserProfile avec DIP
 * Reçoit le service d'authentification via props (injection de dépendance)
 *
 * @param {Object} props
 * @param {Object} props.authService - Service d'authentification (IAuthService)
 * @param {string} props.userId - ID de l'utilisateur à afficher
 */
function UserProfile({ authService, userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Validation du service injecté
    if (!authService || typeof authService.fetchUser !== "function") {
      setError("Service d'authentification non fourni ou invalide");
      setLoading(false);
      return;
    }

    // Récupérer les données utilisateur via l'abstraction
    authService
      .fetchUser(userId)
      .then((userData) => {
        setUser(userData);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [authService, userId]);

  if (loading) {
    return (
      <div className="user-profile-skeleton">
        <div className="skeleton-avatar"></div>
        <div className="skeleton-text"></div>
        <div className="skeleton-text"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="user-profile-error">
        <p>❌ Erreur: {error}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="user-profile-empty">
        <p>Utilisateur non trouvé</p>
      </div>
    );
  }

  return (
    <div className="user-profile">
      <div className="user-avatar">
        <img src={user.avatar || "/default-avatar.png"} alt={user.name} />
      </div>
      <div className="user-info">
        <h2>{user.name}</h2>
        <p className="user-email">{user.email}</p>
        <span className={`user-role role-${user.role}`}>
          {user.role === "premium" ? "⭐ Premium" : "Standard"}
        </span>
        <p className="user-stats">{user.bookingsCount} réservation(s)</p>
      </div>
    </div>
  );
}

export default UserProfile;
```

### Étape 3 : Démonstration avec différents services

```jsx
// ===== demo/UserProfileDemo.jsx =====
import React, { useState } from "react";
import UserProfile from "../components/UserProfile";
import { LiveAuthService, MockAuthService } from "../services/authService";

function UserProfileDemo() {
  const [useMock, setUseMock] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState("user-001");

  const serviceToUse = useMock ? MockAuthService : LiveAuthService;

  return (
    <div className="demo-container">
      <h1>Démonstration UserProfile avec DIP</h1>

      <div className="demo-controls">
        <button onClick={() => setUseMock(!useMock)}>
          Service actuel: {useMock ? "Mock" : "Live"}
          <br />
          <small>Cliquer pour basculer</small>
        </button>

        <select
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
        >
          <option value="user-001">Tony Stark</option>
          <option value="user-002">Peter Parker</option>
          <option value="user-003">Natasha Romanoff</option>
          <option value="user-invalid">Utilisateur invalide</option>
        </select>
      </div>

      <div className="demo-result">
        {/* Le service est injecté via prop */}
        <UserProfile authService={serviceToUse} userId={selectedUserId} />
      </div>
    </div>
  );
}

export default UserProfileDemo;
```

### Étape 4 : Implémentation avec Context API (Avancé)

```jsx
// ===== contexts/AuthServiceContext.jsx =====
import React, { createContext, useContext, useState, useCallback } from "react";

// Créer le Context
const AuthServiceContext = createContext(null);

/**
 * Provider pour le service d'authentification
 */
export function AuthServiceProvider({ children, service }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Wrapper les méthodes du service pour gérer l'état
  const login = useCallback(
    async (credentials) => {
      const user = await service.login(credentials);
      setCurrentUser(user);
      setIsAuthenticated(true);
      return user;
    },
    [service]
  );

  const logout = useCallback(async () => {
    await service.logout();
    setCurrentUser(null);
    setIsAuthenticated(false);
  }, [service]);

  const fetchUser = useCallback(
    async (userId) => {
      return service.fetchUser(userId);
    },
    [service]
  );

  const value = {
    // Service sous-jacent
    service,
    // État d'authentification
    currentUser,
    isAuthenticated,
    // Méthodes wrappées
    login,
    logout,
    fetchUser,
    // Méthode directe
    getCurrentUser: service.getCurrentUser,
  };

  return (
    <AuthServiceContext.Provider value={value}>
      {children}
    </AuthServiceContext.Provider>
  );
}

/**
 * Hook personnalisé pour utiliser le service d'authentification
 */
export function useAuthService() {
  const context = useContext(AuthServiceContext);

  if (!context) {
    throw new Error(
      "useAuthService doit être utilisé à l'intérieur d'un AuthServiceProvider"
    );
  }

  return context;
}

/**
 * Hook pour vérifier si l'utilisateur est authentifié
 */
export function useIsAuthenticated() {
  const { isAuthenticated } = useAuthService();
  return isAuthenticated;
}

/**
 * Hook pour obtenir l'utilisateur courant
 */
export function useCurrentUser() {
  const { currentUser } = useAuthService();
  return currentUser;
}
```

```jsx
// ===== components/UserProfileWithContext.jsx =====
import React, { useState, useEffect } from "react";
import { useAuthService } from "../contexts/AuthServiceContext";

/**
 * Composant UserProfile utilisant le Context API
 * Ne reçoit plus le service via props - il est fourni par le Context
 */
function UserProfileWithContext({ userId }) {
  const { fetchUser, isAuthenticated } = useAuthService();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetchUser(userId)
      .then((userData) => {
        setUser(userData);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [fetchUser, userId]);

  if (loading) {
    return <div className="loading">Chargement du profil...</div>;
  }

  if (error) {
    return <div className="error">Erreur: {error}</div>;
  }

  return (
    <div className="user-profile">
      <img src={user.avatar} alt={user.name} className="avatar" />
      <h2>{user.name}</h2>
      <p>{user.email}</p>
      <span className={`badge badge-${user.role}`}>{user.role}</span>
    </div>
  );
}

export default UserProfileWithContext;
```

```jsx
// ===== components/LoginForm.jsx =====
import React, { useState } from "react";
import { useAuthService } from "../contexts/AuthServiceContext";

function LoginForm({ onSuccess }) {
  const { login, isAuthenticated } = useAuthService();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = await login({ email, password });
      console.log("Connecté en tant que:", user.name);
      onSuccess?.(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (isAuthenticated) {
    return <p>Vous êtes déjà connecté.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="login-form">
      <h2>Connexion</h2>

      {error && <div className="error-message">{error}</div>}

      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tony@starkindustries.com"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="password">Mot de passe</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      <button type="submit" disabled={loading}>
        {loading ? "Connexion..." : "Se connecter"}
      </button>
    </form>
  );
}

export default LoginForm;
```

```jsx
// ===== App.jsx - Application complète avec Context =====
import React, { useState } from "react";
import {
  AuthServiceProvider,
  useAuthService,
} from "./contexts/AuthServiceContext";
import { LiveAuthService, MockAuthService } from "./services/authService";
import UserProfileWithContext from "./components/UserProfileWithContext";
import LoginForm from "./components/LoginForm";

function AppContent() {
  const { isAuthenticated, currentUser, logout } = useAuthService();

  if (!isAuthenticated) {
    return (
      <div className="app-login">
        <LoginForm onSuccess={(user) => console.log("Bienvenue", user.name)} />
        <p className="hint">
          Essayez: tony@starkindustries.com (avec le service Mock)
        </p>
      </div>
    );
  }

  return (
    <div className="app-authenticated">
      <header>
        <h1>Tourism App</h1>
        <div className="user-menu">
          <span>Connecté en tant que {currentUser?.name}</span>
          <button onClick={logout}>Déconnexion</button>
        </div>
      </header>

      <main>
        <UserProfileWithContext userId={currentUser?.id} />
      </main>
    </div>
  );
}

function App() {
  const [useMock, setUseMock] = useState(true);
  const serviceToUse = useMock ? MockAuthService : LiveAuthService;

  return (
    <div className="app">
      {/* Toggle pour démo */}
      <div className="service-toggle">
        <label>
          <input
            type="checkbox"
            checked={useMock}
            onChange={(e) => setUseMock(e.target.checked)}
          />
          Utiliser le service Mock
        </label>
      </div>

      {/* Le Provider injecte le service à toute l'application */}
      <AuthServiceProvider service={serviceToUse}>
        <AppContent />
      </AuthServiceProvider>
    </div>
  );
}

export default App;
```

---

## Exercice 3 : Conteneur IoC Complet

### Conteneur DI Avancé

```javascript
// ===== container/DIContainer.js =====

/**
 * Conteneur d'Injection de Dépendances avancé
 * Supporte: singleton, transient, scoped
 */
class DIContainer {
  constructor() {
    this.services = new Map();
    this.singletons = new Map();
    this.scopedInstances = new Map();
    this.currentScope = null;
  }

  /**
   * Types de cycle de vie
   */
  static Lifecycle = {
    SINGLETON: "singleton", // Une seule instance pour toute l'application
    TRANSIENT: "transient", // Nouvelle instance à chaque résolution
    SCOPED: "scoped", // Une instance par scope (ex: par requête HTTP)
  };

  /**
   * Enregistre un service
   */
  register(name, factory, lifecycle = DIContainer.Lifecycle.TRANSIENT) {
    this.services.set(name, {
      factory,
      lifecycle,
      dependencies: this.extractDependencies(factory),
    });
    return this;
  }

  /**
   * Enregistre un singleton
   */
  registerSingleton(name, factory) {
    return this.register(name, factory, DIContainer.Lifecycle.SINGLETON);
  }

  /**
   * Enregistre un service scoped
   */
  registerScoped(name, factory) {
    return this.register(name, factory, DIContainer.Lifecycle.SCOPED);
  }

  /**
   * Enregistre une instance existante comme singleton
   */
  registerInstance(name, instance) {
    this.singletons.set(name, instance);
    this.services.set(name, {
      factory: () => instance,
      lifecycle: DIContainer.Lifecycle.SINGLETON,
    });
    return this;
  }

  /**
   * Résout un service
   */
  resolve(name) {
    const service = this.services.get(name);

    if (!service) {
      throw new Error(`Service '${name}' non enregistré.`);
    }

    switch (service.lifecycle) {
      case DIContainer.Lifecycle.SINGLETON:
        if (!this.singletons.has(name)) {
          this.singletons.set(name, service.factory(this));
        }
        return this.singletons.get(name);

      case DIContainer.Lifecycle.SCOPED:
        if (!this.currentScope) {
          throw new Error(
            `Impossible de résoudre '${name}' scoped sans scope actif.`
          );
        }
        if (!this.scopedInstances.get(this.currentScope)?.has(name)) {
          const scopeMap =
            this.scopedInstances.get(this.currentScope) || new Map();
          scopeMap.set(name, service.factory(this));
          this.scopedInstances.set(this.currentScope, scopeMap);
        }
        return this.scopedInstances.get(this.currentScope).get(name);

      case DIContainer.Lifecycle.TRANSIENT:
      default:
        return service.factory(this);
    }
  }

  /**
   * Crée un nouveau scope
   */
  createScope() {
    const scopeId = Symbol("scope");
    this.scopedInstances.set(scopeId, new Map());
    return scopeId;
  }

  /**
   * Active un scope
   */
  useScope(scopeId, callback) {
    const previousScope = this.currentScope;
    this.currentScope = scopeId;

    try {
      return callback(this);
    } finally {
      this.currentScope = previousScope;
    }
  }

  /**
   * Supprime un scope et ses instances
   */
  disposeScope(scopeId) {
    this.scopedInstances.delete(scopeId);
  }

  /**
   * Extrait les dépendances d'une factory (pour info/debug)
   */
  extractDependencies(factory) {
    const fnStr = factory.toString();
    const match = fnStr.match(/\(([^)]*)\)/);
    if (match && match[1]) {
      return match[1]
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean);
    }
    return [];
  }

  /**
   * Affiche les services enregistrés
   */
  debug() {
    console.log("\n=== Services enregistrés ===");
    for (const [name, service] of this.services) {
      console.log(`${name}: ${service.lifecycle}`);
    }
    console.log("=== Singletons actifs ===");
    for (const [name] of this.singletons) {
      console.log(`- ${name}`);
    }
  }
}

module.exports = DIContainer;
```

### Configuration pour l'Application Tourism

```javascript
// ===== config/containerConfig.js =====
const DIContainer = require("../container/DIContainer");

// Interfaces
const ITourRepository = require("../interfaces/ITourRepository");
const IBookingRepository = require("../interfaces/IBookingRepository");
const INotificationService = require("../interfaces/INotificationService");
const IPaymentGateway = require("../interfaces/IPaymentGateway");

// Implémentations
const PostgreSQLTourRepository = require("../repositories/PostgreSQLTourRepository");
const MongoDBTourRepository = require("../repositories/MongoDBTourRepository");
const PostgreSQLBookingRepository = require("../repositories/PostgreSQLBookingRepository");
const EmailService = require("../services/EmailService");
const SMSService = require("../services/SMSService");
const StripePaymentGateway = require("../services/StripePaymentGateway");
const MockPaymentGateway = require("../services/MockPaymentGateway");

// Managers
const BookingManager = require("../managers/BookingManager");
const BookingConfirmationManager = require("../managers/BookingConfirmationManager");
const TourManager = require("../managers/TourManager");

/**
 * Factory pour créer le conteneur selon l'environnement
 */
function createContainer(environment = "development") {
  const container = new DIContainer();

  // Configuration
  container.registerSingleton("config", () => ({
    environment,
    database: {
      type: process.env.DB_TYPE || "postgresql",
      host: process.env.DB_HOST || "localhost",
      port: process.env.DB_PORT || 5432,
      name: process.env.DB_NAME || "tourism_db",
    },
    email: {
      provider: process.env.EMAIL_PROVIDER || "ses",
      fromAddress: process.env.EMAIL_FROM || "noreply@tourismapp.com",
    },
    payment: {
      provider: process.env.PAYMENT_PROVIDER || "stripe",
      apiKey: process.env.STRIPE_API_KEY,
    },
  }));

  // Repositories (Singletons)
  container.registerSingleton("ITourRepository", (c) => {
    const config = c.resolve("config");

    if (config.database.type === "mongodb") {
      return new MongoDBTourRepository(config.database);
    }
    return new PostgreSQLTourRepository(config.database);
  });

  container.registerSingleton("IBookingRepository", (c) => {
    const config = c.resolve("config");
    return new PostgreSQLBookingRepository(config.database);
  });

  // Services de notification (Singleton)
  container.registerSingleton("INotificationService", (c) => {
    const config = c.resolve("config");

    // On peut avoir plusieurs services de notification
    if (process.env.NOTIFICATION_TYPE === "sms") {
      return new SMSService(config.sms);
    }
    return new EmailService(config.email);
  });

  // Payment Gateway (selon environnement)
  container.registerSingleton("IPaymentGateway", (c) => {
    const config = c.resolve("config");

    if (config.environment === "test" || config.environment === "development") {
      console.log(
        "Utilisation du MockPaymentGateway (environnement non-production)"
      );
      return new MockPaymentGateway();
    }
    return new StripePaymentGateway(config.payment);
  });

  // Managers (Transient - nouvelle instance à chaque résolution)
  container.register("TourManager", (c) => {
    return new TourManager(c.resolve("ITourRepository"));
  });

  container.register("BookingManager", (c) => {
    return new BookingManager(
      c.resolve("ITourRepository"),
      c.resolve("IBookingRepository"),
      c.resolve("IPaymentGateway")
    );
  });

  container.register("BookingConfirmationManager", (c) => {
    return new BookingConfirmationManager(c.resolve("INotificationService"));
  });

  // Service composite pour les opérations de booking complètes
  container.register("BookingService", (c) => {
    return {
      bookingManager: c.resolve("BookingManager"),
      confirmationManager: c.resolve("BookingConfirmationManager"),

      async createAndConfirmBooking(bookingData) {
        const booking = await this.bookingManager.createBooking(
          bookingData.customerName,
          bookingData.customerEmail,
          bookingData.tourId,
          bookingData.travelDate
        );

        await this.confirmationManager.sendConfirmation({
          ...booking,
          customerPhone: bookingData.customerPhone,
        });

        return booking;
      },
    };
  });

  return container;
}

/**
 * Containers pré-configurés pour différents environnements
 */
const containers = {
  production: () => createContainer("production"),
  development: () => createContainer("development"),
  test: () => createContainer("test"),
};

module.exports = {
  DIContainer,
  createContainer,
  containers,
};
```

### Utilisation du Conteneur

```javascript
// ===== app.js - Point d'entrée de l'application =====
const express = require("express");
const { createContainer } = require("./config/containerConfig");

const app = express();
app.use(express.json());

// Créer le conteneur selon l'environnement
const container = createContainer(process.env.NODE_ENV || "development");

// Middleware pour injecter le conteneur dans les requêtes
app.use((req, res, next) => {
  // Créer un scope par requête
  req.scope = container.createScope();
  req.container = container;

  // Cleanup du scope à la fin de la requête
  res.on("finish", () => {
    container.disposeScope(req.scope);
  });

  next();
});

// Routes utilisant les services du conteneur
app.post("/api/bookings", async (req, res) => {
  try {
    const bookingService = container.resolve("BookingService");

    const booking = await bookingService.createAndConfirmBooking({
      customerName: req.body.customerName,
      customerEmail: req.body.customerEmail,
      customerPhone: req.body.customerPhone,
      tourId: req.body.tourId,
      travelDate: req.body.travelDate,
    });

    res.status(201).json({
      status: "success",
      data: { booking },
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      error: { message: error.message },
    });
  }
});

app.get("/api/tours", async (req, res) => {
  try {
    const tourManager = container.resolve("TourManager");
    const tours = await tourManager.getAllTours();

    res.json({
      status: "success",
      data: { tours },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      error: { message: error.message },
    });
  }
});

// Debug endpoint (dev only)
if (process.env.NODE_ENV === "development") {
  app.get("/api/debug/container", (req, res) => {
    container.debug();
    res.json({ message: "Voir la console pour les détails" });
  });
}

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  container.debug();
});
```

### Tests avec le Conteneur

```javascript
// ===== __tests__/container.test.js =====
const { createContainer, DIContainer } = require("../config/containerConfig");

describe("DIContainer", () => {
  let container;

  beforeEach(() => {
    container = createContainer("test");
  });

  describe("Résolution de services", () => {
    it("résout les singletons correctement", () => {
      const config1 = container.resolve("config");
      const config2 = container.resolve("config");

      expect(config1).toBe(config2); // Même instance
    });

    it("crée de nouvelles instances pour transient", () => {
      const manager1 = container.resolve("BookingManager");
      const manager2 = container.resolve("BookingManager");

      expect(manager1).not.toBe(manager2); // Instances différentes
    });

    it("utilise MockPaymentGateway en environnement test", () => {
      const gateway = container.resolve("IPaymentGateway");

      expect(gateway.constructor.name).toBe("MockPaymentGateway");
    });
  });

  describe("Scoped services", () => {
    it("crée une instance par scope", () => {
      // Enregistrer un service scoped
      container.registerScoped("RequestContext", () => ({
        requestId: Math.random().toString(36),
        timestamp: Date.now(),
      }));

      const scope1 = container.createScope();
      const scope2 = container.createScope();

      let context1a, context1b, context2;

      container.useScope(scope1, (c) => {
        context1a = c.resolve("RequestContext");
        context1b = c.resolve("RequestContext");
      });

      container.useScope(scope2, (c) => {
        context2 = c.resolve("RequestContext");
      });

      // Dans le même scope, même instance
      expect(context1a).toBe(context1b);
      // Dans des scopes différents, instances différentes
      expect(context1a).not.toBe(context2);
    });
  });
});

describe("BookingService Integration", () => {
  let container;

  beforeEach(() => {
    container = createContainer("test");
  });

  it("crée une réservation avec confirmation", async () => {
    const bookingService = container.resolve("BookingService");

    const booking = await bookingService.createAndConfirmBooking({
      customerName: "Natasha Romanoff",
      customerEmail: "natasha@avengers.com",
      customerPhone: "+33612345678",
      tourId: "tour-001",
      travelDate: "2026-09-15",
    });

    expect(booking).toBeDefined();
    expect(booking.customerName).toBe("Natasha Romanoff");
    expect(booking.status).toBe("pending");
  });
});
```

---

## Résumé

Le **Principe d'Inversion des Dépendances** et l'**Inversion de Contrôle** permettent de :

1. **Découpler** les modules de haut niveau des détails d'implémentation
2. **Faciliter les tests** grâce à l'injection de mocks
3. **Améliorer la flexibilité** en permettant de changer les implémentations sans modifier le code métier
4. **Centraliser la configuration** des dépendances dans un conteneur IoC

Ces solutions démontrent l'application pratique du DIP dans différents contextes :

- Backend Node.js avec services et repositories
- Frontend React avec Context API
- Conteneur d'injection de dépendances complet
