# Exercices - Leçon 4.4 Stratégies d'Authentification et d'Autorisation (JWT, OAuth2)

## Exercice 1 : Conception de Revendications JWT

### Énoncé

Pour notre application touristique, quelles revendications spécifiques incluriez-vous dans une charge utile JWT pour un utilisateur "client" régulier ? Listez au moins 5 revendications, incluant des revendications enregistrées et privées.

Quelles revendications supplémentaires la charge utile JWT d'un utilisateur "admin" nécessiterait-elle ?

Expliquez pourquoi chaque revendication choisie est pertinente pour les décisions d'authentification ou d'autorisation dans nos microservices.

Considérez un scénario où le Microservice Booking Management doit savoir si un utilisateur peut annuler une réservation. Quelle revendication pourrait faciliter cette autorisation sans nécessiter une recherche en base de données à chaque requête ?

### Solution

#### 1. Revendications JWT pour un Utilisateur "Client"

```json
{
  // === REVENDICATIONS ENREGISTRÉES (Registered Claims) ===
  "iss": "tourism-app-auth-service",     // Issuer - Identifie qui a émis le token
  "sub": "user_1234567890",              // Subject - ID unique de l'utilisateur
  "aud": "tourism-app-microservices",     // Audience - Pour quels services ce token est destiné
  "exp": 1704067200,                     // Expiration - Timestamp Unix (1h après émission)
  "iat": 1704063600,                     // Issued At - Timestamp de l'émission
  "nbf": 1704063600,                     // Not Before - Token valide à partir de ce timestamp

  // === REVENDICATIONS PRIVÉES (Private Claims) ===
  "userId": "user_1234567890",           // ID utilisateur (redondant avec sub mais plus explicite)
  "email": "john.doe@example.com",       // Email de l'utilisateur (pour notifications, logs)
  "roles": ["customer"],                 // Rôles de l'utilisateur (pour autorisation)
  "permissions": [                       // Permissions granulaires
    "read:own_bookings",
    "create:booking",
    "read:tours",
    "cancel:own_bookings"
  ],
  "customerTier": "standard",           // Niveau de client (standard, premium, vip)
  "accountStatus": "active",             // Statut du compte (active, suspended, etc.)
  "preferredCurrency": "EUR",             // Devise préférée (pour affichage)
  "locale": "fr-FR"                      // Locale pour internationalisation
}
```

**Explication des revendications :**

1. **`sub` (Subject)** : Identifie de manière unique l'utilisateur. Essentiel pour toutes les opérations qui nécessitent de savoir "qui" fait la requête.
2. **`email`** : Permet d'envoyer des notifications, de logger les actions, et de faciliter le support client sans requête supplémentaire à la base de données.
3. **`roles`** : Détermine rapidement le niveau d'accès global de l'utilisateur (customer, admin, tour_operator). Utilisé pour l'autorisation basée sur les rôles (RBAC).
4. **`permissions`** : Permissions granulaires spécifiques. Plus flexible que les rôles seuls, permet un contrôle d'accès fin (par exemple, un client peut avoir `cancel:own_bookings` mais pas `cancel:any_booking`).
5. **`customerTier`** : Peut influencer les fonctionnalités disponibles, les tarifs, ou les limites (par exemple, les clients premium peuvent annuler jusqu'à 48h avant, les standards jusqu'à 24h).
6. **`accountStatus`** : Permet de bloquer rapidement les comptes suspendus sans vérification en base de données.
7. **`exp` (Expiration)** : Sécurité critique - limite la fenêtre d'exploitation si un token est compromis. Recommandé : 15 minutes à 1 heure pour les access tokens.

#### 2. Revendications Supplémentaires pour un Utilisateur "Admin"

```json
{
  // ... toutes les revendications du client ...
  
  "roles": ["admin", "customer"],        // Admin a aussi le rôle customer
  "permissions": [
    "read:own_bookings",
    "create:booking",
    "read:tours",
    "cancel:own_bookings",
    // Permissions admin supplémentaires
    "read:all_bookings",                // Voir toutes les réservations
    "create:tour",                      // Créer de nouveaux tours
    "update:tour",                      // Modifier des tours
    "delete:tour",                      // Supprimer des tours
    "cancel:any_booking",               // Annuler n'importe quelle réservation
    "refund:payment",                   // Rembourser des paiements
    "read:analytics",                   // Accéder aux analytics
    "manage:users"                      // Gérer les utilisateurs
  ],
  "adminLevel": "super_admin",          // Niveau d'admin (admin, super_admin)
  "department": "operations",           // Département (pour restrictions de permissions)
  "canAccessFinancialData": true        // Flag explicite pour données financières
}
```

**Différences clés :**
- **Permissions étendues** : L'admin a accès à toutes les ressources, pas seulement les siennes.
- **`adminLevel`** : Permet de distinguer différents niveaux d'administration (par exemple, un admin peut modifier des tours mais pas supprimer des utilisateurs, tandis qu'un super_admin peut tout faire).
- **`department`** : Peut restreindre certaines permissions à des départements spécifiques (par exemple, un admin du département "finance" peut voir les données financières mais pas modifier les tours).

#### 3. Revendication pour l'Annulation de Réservation

Pour permettre au Microservice Booking Management de déterminer si un utilisateur peut annuler une réservation sans requête en base de données, nous pourrions inclure :

```json
{
  "bookingCancellationPolicy": {
    "canCancelOwnBookings": true,
    "maxHoursBeforeCancellation": 24,    // Peut annuler jusqu'à 24h avant
    "cancellationFeePercentage": 0,      // Pas de frais pour ce client
    "allowedCancellationReasons": [      // Raisons autorisées
      "change_of_plans",
      "emergency",
      "weather"
    ]
  }
}
```

**Alternative plus simple :**

```json
{
  "canCancelBookings": true,
  "maxCancellationHoursBeforeTour": 24,
  "cancellationFeeWaived": true
}
```

**Pourquoi cette approche fonctionne :**

1. **Pas de lookup en base** : Les règles de politique sont dans le token, donc le microservice peut prendre une décision immédiate.
2. **Flexibilité** : Différents clients peuvent avoir des politiques différentes (premium = 48h, standard = 24h).
3. **Performance** : Évite un appel réseau ou une requête DB à chaque vérification d'autorisation.

**Limitation :** Si la politique change pour un utilisateur, il devra se reconnecter pour obtenir un nouveau token avec les nouvelles règles. Pour des changements fréquents, une vérification en base de données pourrait être préférable.

#### 4. Implémentation Complète

```javascript
// auth-service/src/services/TokenService.js

const jwt = require('jsonwebtoken');

class TokenService {
  constructor() {
    this.secret = process.env.JWT_SECRET;
    this.accessTokenExpiry = '1h';  // 1 heure
    this.refreshTokenExpiry = '7d'; // 7 jours
  }

  /**
   * Génère un JWT pour un utilisateur client
   */
  generateCustomerToken(user) {
    const payload = {
      // Revendications enregistrées
      iss: 'tourism-app-auth-service',
      sub: user.id,
      aud: 'tourism-app-microservices',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 heure
      
      // Revendications privées
      userId: user.id,
      email: user.email,
      roles: ['customer'],
      permissions: this.getCustomerPermissions(user),
      customerTier: user.customerTier || 'standard',
      accountStatus: user.accountStatus || 'active',
      preferredCurrency: user.preferredCurrency || 'EUR',
      locale: user.locale || 'fr-FR',
      
      // Politique d'annulation
      bookingCancellationPolicy: {
        canCancelOwnBookings: true,
        maxHoursBeforeCancellation: this.getCancellationWindow(user.customerTier),
        cancellationFeePercentage: 0,
        allowedCancellationReasons: ['change_of_plans', 'emergency', 'weather']
      }
    };

    return jwt.sign(payload, this.secret, { algorithm: 'HS256' });
  }

  /**
   * Génère un JWT pour un utilisateur admin
   */
  generateAdminToken(user) {
    const customerPayload = this.generateCustomerToken(user);
    const decoded = jwt.decode(customerPayload);
    
    // Étendre avec les permissions admin
    const adminPayload = {
      ...decoded,
      roles: ['admin', 'customer'],
      permissions: [
        ...decoded.permissions,
        'read:all_bookings',
        'create:tour',
        'update:tour',
        'delete:tour',
        'cancel:any_booking',
        'refund:payment',
        'read:analytics',
        'manage:users'
      ],
      adminLevel: user.adminLevel || 'admin',
      department: user.department,
      canAccessFinancialData: user.canAccessFinancialData || false
    };

    return jwt.sign(adminPayload, this.secret, { algorithm: 'HS256' });
  }

  /**
   * Obtient les permissions pour un client
   */
  getCustomerPermissions(user) {
    const basePermissions = [
      'read:own_bookings',
      'create:booking',
      'read:tours',
      'cancel:own_bookings'
    ];

    // Permissions additionnelles selon le tier
    if (user.customerTier === 'premium') {
      basePermissions.push('read:premium_tours', 'priority_support');
    }

    return basePermissions;
  }

  /**
   * Détermine la fenêtre d'annulation selon le tier
   */
  getCancellationWindow(tier) {
    const windows = {
      'standard': 24,   // 24 heures
      'premium': 48,    // 48 heures
      'vip': 72         // 72 heures
    };
    return windows[tier] || windows.standard;
  }
}

module.exports = TokenService;
```

---

## Exercice 2 : Flux de Vérification JWT

### Énoncé

Décrivez les étapes impliquées lorsque le Microservice Payment Gateway Integration reçoit une requête pour traiter un paiement, en supposant que la requête inclut un JWT. Concentrez-vous sur la façon dont le microservice valide le token et extrait les informations utilisateur.

Que se passe-t-il si la signature du JWT est invalide ? Quel code de statut HTTP devrait être retourné, et pourquoi ?

Que se passe-t-il si le JWT a expiré ? Quel code de statut HTTP devrait être retourné ?

### Solution

#### 1. Flux de Vérification JWT Détaillé

```
┌─────────────────────────────────────────────────────────────────────────────┐
│           FLUX DE VÉRIFICATION JWT DANS PAYMENT GATEWAY SERVICE               │
└─────────────────────────────────────────────────────────────────────────────┘

1. REQUÊTE ENTRANTE
   ┌──────────┐
   │  Client  │ POST /api/v1/payment-gateway/payments/charge
   │ (React)  │ Headers: {
   └────┬─────┘   Authorization: "Bearer eyJhbGc..."
        │         Content-Type: "application/json"
        │       }
        │       Body: { amount, currency, bookingId, ... }
        │
        ▼
2. MIDDLEWARE D'AUTHENTIFICATION
   ┌──────────────────────────────────────┐
   │  authenticateToken() middleware      │
   │                                      │
   │  a) Extraire le header Authorization│
   │  b) Parser "Bearer <token>"          │
   │  c) Vérifier la présence du token   │
   └──────────────┬───────────────────────┘
                  │
                  ▼
3. VÉRIFICATION DU TOKEN
   ┌──────────────────────────────────────┐
   │  jwt.verify(token, JWT_SECRET)        │
   │                                      │
   │  Vérifications effectuées :          │
   │  ✓ Signature valide ?                │
   │  ✓ Token non expiré ? (exp)          │
   │  ✓ Token valide maintenant ? (nbf)    │
   │  ✓ Audience correcte ? (aud)         │
   │  ✓ Issuer correct ? (iss)            │
   └──────────────┬───────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
   ✅ VALIDE          ❌ INVALIDE
        │                   │
        │                   └──► 403 Forbidden
        │                           (signature invalide)
        │                   └──► 401 Unauthorized
        │                           (token expiré)
        │
        ▼
4. EXTRACTION DES REVENDICATIONS
   ┌──────────────────────────────────────┐
   │  req.user = {                        │
   │    userId: "user_123",               │
   │    email: "john@example.com",         │
   │    roles: ["customer"],             │
   │    permissions: [...],               │
   │    ...                               │
   │  }                                   │
   └──────────────┬───────────────────────┘
                  │
                  ▼
5. VÉRIFICATION D'AUTORISATION
   ┌──────────────────────────────────────┐
   │  Vérifier si l'utilisateur peut       │
   │  effectuer un paiement                │
   │                                      │
   │  - accountStatus === "active" ?      │
   │  - permissions.includes("create:payment") ? │
   └──────────────┬───────────────────────┘
                  │
                  ▼
6. TRAITEMENT DE LA REQUÊTE
   ┌──────────────────────────────────────┐
   │  paymentController.processCharge()    │
   │  Utilise req.user.userId pour         │
   │  associer le paiement à l'utilisateur │
   └──────────────────────────────────────┘
```

#### 2. Implémentation du Middleware de Vérification

```javascript
// payment-gateway-service/src/middleware/authMiddleware.js

const jwt = require('jsonwebtoken');
const { promisify } = require('util');

const verifyToken = promisify(jwt.verify);

const JWT_SECRET = process.env.JWT_SECRET;
const EXPECTED_ISSUER = 'tourism-app-auth-service';
const EXPECTED_AUDIENCE = 'tourism-app-microservices';

/**
 * Middleware d'authentification JWT pour Payment Gateway Service
 */
const authenticateToken = async (req, res, next) => {
  try {
    // ÉTAPE 1 : Extraire le token de l'en-tête Authorization
    const authHeader = req.headers['authorization'];
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_AUTHORIZATION_HEADER',
          message: 'En-tête Authorization manquant'
        }
      });
    }

    // ÉTAPE 2 : Parser le format "Bearer <token>"
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_AUTHORIZATION_FORMAT',
          message: 'Format invalide. Attendu: "Bearer <token>"'
        }
      });
    }

    const token = parts[1];

    // ÉTAPE 3 : Vérifier et décoder le token
    const decoded = await verifyToken(token, JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: EXPECTED_ISSUER,
      audience: EXPECTED_AUDIENCE
    });

    // ÉTAPE 4 : Vérifications supplémentaires
    // Vérifier le statut du compte
    if (decoded.accountStatus !== 'active') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_INACTIVE',
          message: 'Le compte utilisateur n\'est pas actif'
        }
      });
    }

    // ÉTAPE 5 : Attacher les informations utilisateur à la requête
    req.user = decoded;
    req.token = token;

    // ÉTAPE 6 : Passer au middleware suivant
    next();

  } catch (error) {
    // Gestion des erreurs spécifiques
    return handleJWTError(error, res);
  }
};

/**
 * Gère les erreurs de vérification JWT
 */
function handleJWTError(error, res) {
  // CAS 1 : Token expiré
  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'TOKEN_EXPIRED',
        message: 'Le token a expiré. Veuillez vous reconnecter.',
        expiredAt: error.expiredAt
      }
    });
  }

  // CAS 2 : Signature invalide
  if (error.name === 'JsonWebTokenError') {
    // Distinguer différents types d'erreurs JWT
    if (error.message.includes('signature')) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN_SIGNATURE',
          message: 'Signature du token invalide. Le token peut avoir été falsifié.'
        }
      });
    }

    if (error.message.includes('jwt malformed')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'MALFORMED_TOKEN',
          message: 'Format de token invalide'
        }
      });
    }

    // Autre erreur JWT
    return res.status(403).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Token invalide'
      }
    });
  }

  // CAS 3 : Audience ou Issuer incorrect
  if (error.name === 'JsonWebTokenError' && 
      (error.message.includes('audience') || error.message.includes('issuer'))) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'TOKEN_AUDIENCE_ISSUER_MISMATCH',
        message: 'Le token n\'est pas destiné à ce service'
      }
    });
  }

  // CAS 4 : Token pas encore valide (nbf)
  if (error.name === 'NotBeforeError') {
    return res.status(401).json({
      success: false,
      error: {
        code: 'TOKEN_NOT_YET_VALID',
        message: 'Le token n\'est pas encore valide',
        notBefore: error.date
      }
    });
  }

  // CAS 5 : Erreur inattendue
  console.error('Erreur inattendue lors de la vérification JWT:', error);
  return res.status(500).json({
    success: false,
    error: {
      code: 'AUTHENTICATION_ERROR',
      message: 'Erreur lors de l\'authentification'
    }
  });
}

/**
 * Middleware pour vérifier les permissions
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentification requise'
        }
      });
    }

    const userPermissions = req.user.permissions || [];
    
    if (!userPermissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Permission requise: ${permission}`
        }
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  requirePermission,
  handleJWTError
};
```

#### 3. Utilisation dans le Controller

```javascript
// payment-gateway-service/src/controllers/payment.controller.js

const { authenticateToken, requirePermission } = require('../middleware/authMiddleware');

/**
 * Traite une charge de paiement
 * Nécessite authentification et permission create:payment
 */
router.post(
  '/payments/charge',
  authenticateToken,                    // Étape 1 : Authentifier
  requirePermission('create:payment'),   // Étape 2 : Vérifier permission
  async (req, res, next) => {
    try {
      const { amount, currency, bookingId } = req.body;
      const userId = req.user.userId;    // Utiliser l'ID de l'utilisateur authentifié

      // Vérifier que l'utilisateur peut payer pour cette réservation
      // (par exemple, vérifier que booking.userId === req.user.userId)
      
      const result = await paymentService.processCharge({
        amount,
        currency,
        bookingId,
        userId,  // Associé automatiquement depuis le token
        customerEmail: req.user.email
      });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
);
```

#### 4. Codes de Statut HTTP - Justification

| Scénario                    | Code HTTP | Justification                                                                 |
| --------------------------- | --------- | ----------------------------------------------------------------------------- |
| **Token manquant**          | 401       | L'utilisateur n'a pas fourni d'identifiants. Doit s'authentifier.            |
| **Token expiré**            | 401       | Les identifiants ne sont plus valides. L'utilisateur doit obtenir un nouveau token (via refresh token ou nouvelle connexion). |
| **Signature invalide**      | 403       | Le token a été falsifié ou corrompu. C'est une violation de sécurité, pas simplement une authentification manquante. |
| **Token malformé**           | 401       | Le format du token est incorrect. L'utilisateur doit fournir un token valide. |
| **Permissions insuffisantes** | 403      | L'utilisateur est authentifié mais n'a pas les droits nécessaires.           |
| **Compte inactif**          | 403       | L'utilisateur est authentifié mais son compte est suspendu.                   |

**Différence entre 401 et 403 :**
- **401 Unauthorized** : "Qui êtes-vous ?" - Problème d'authentification (identité non vérifiée)
- **403 Forbidden** : "Que pouvez-vous faire ?" - Problème d'autorisation (identité vérifiée mais pas les droits)

---

## Exercice 3 : Identification de Scénario OAuth2

### Énoncé

Imaginez que notre application touristique souhaite offrir une fonctionnalité où les utilisateurs peuvent importer leurs préférences de voyage depuis le programme de fidélité d'une compagnie aérienne partenaire. Les JWTs ou OAuth2 seraient-ils le mécanisme principal pour accéder de manière sécurisée à ces données externes ? Expliquez votre raisonnement et décrivez brièvement le flux.

Si notre application touristique s'associait avec un outil d'analyse tiers qui devait suivre les réservations des utilisateurs, et que cet outil voulait accéder à notre Microservice Booking Management au nom de nos utilisateurs, comment OAuth2 faciliterait-il cela ? Identifiez les rôles (Resource Owner, Client, Authorization Server, Resource Server) dans ce scénario spécifique.

### Solution

#### Scénario 1 : Importation des Préférences depuis une Compagnie Aérienne

**Réponse : OAuth2 serait le mécanisme principal.**

**Raisonnement :**

1. **Autorisation Déléguée** : Notre application (Client) demande l'accès aux données de l'utilisateur (Resource Owner) stockées sur les serveurs de la compagnie aérienne (Resource Server), sans connaître le mot de passe de l'utilisateur.
2. **Sécurité** : L'utilisateur accorde explicitement des permissions limitées (scopes) à notre application, et peut révoquer cet accès à tout moment.
3. **Standard** : OAuth2 est le standard de l'industrie pour ce type d'intégration. La plupart des compagnies aériennes (et services externes en général) exposent leurs APIs via OAuth2.

**Flux OAuth2 :**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│        IMPORTATION DES PRÉFÉRENCES - FLUX OAUTH2                             │
└─────────────────────────────────────────────────────────────────────────────┘

1. UTILISATEUR INITIE L'IMPORT
   ┌──────────┐
   │  Client  │ Clic sur "Importer depuis AirlineX"
   │ (React)  │
   └────┬─────┘
        │
        ▼
2. REDIRECTION VERS AIRLINEX
   ┌──────────┐                    ┌──────────────────────┐
   │  Client  │ ── redirect ──────► │  AirlineX Auth       │
   │ (React)  │    /authorize?     │  Server              │
   │          │    client_id=...   │                      │
   │          │    scope=read:preferences │               │
   │          │    redirect_uri=...│                      │
   │          │    state=csrf_token│                      │
   └──────────┘                    └──────────┬───────────┘
                                               │
                                               │ 3. Authentification
                                               │    + Consentement
                                               │    "Autoriser TourismApp à
                                               │     lire vos préférences ?"
                                               │
   ┌──────────┐◄── authorization_code ────────┘
   │  Client  │    + state
   │ (React)  │
   └────┬─────┘
        │
        │ 4. Échange du code (backend)
        ▼
   ┌──────────────────────┐
   │  Tourism App Backend │ POST /token
   │  (Auth Service)      │ {
   └──────────┬───────────┘   code, client_id, client_secret
              │
              │ 5. Access Token
              ▼
   ┌──────────┐
   │  Client  │ Access Token: "eyJhbGc..."
   │ (Backend)│
   └────┬─────┘
        │
        │ 6. Requête aux préférences
        ▼
   ┌──────────────────────┐
   │  AirlineX API        │ GET /api/v1/user/preferences
   │  (Resource Server)   │ Authorization: Bearer <access_token>
   └──────────┬───────────┘
              │
              │ 7. Préférences retournées
              ▼
   ┌──────────┐
   │  Backend │ {
   │          │   preferredSeats: "window",
   │          │   mealPreferences: "vegetarian",
   │          │   frequentDestinations: [...]
   │          │ }
   └────┬─────┘
        │
        │ 8. Sauvegarde dans notre DB
        ▼
   ┌──────────┐
   │  Tourism │ Préférences importées et
   │  App DB  │ associées à l'utilisateur
   └──────────┘
```

**Rôles OAuth2 :**
- **Resource Owner** : L'utilisateur de notre application qui possède un compte AirlineX
- **Client** : Notre application Tourism App (frontend + backend)
- **Authorization Server** : Le serveur d'authentification d'AirlineX
- **Resource Server** : L'API d'AirlineX qui expose les préférences utilisateur

**Pourquoi pas seulement JWT ?**
- JWT est un **format de token**, pas un **protocole d'autorisation**. OAuth2 définit comment obtenir le token, comment l'utiliser, et comment gérer les scopes. Le token retourné par AirlineX pourrait être un JWT, mais le processus pour l'obtenir est OAuth2.

#### Scénario 2 : Outil d'Analyse Tiers

**Réponse : OAuth2 avec Client Credentials Grant ou Authorization Code Grant selon le cas.**

**Flux OAuth2 :**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│        OUTIL D'ANALYSE TIERS - FLUX OAUTH2                                  │
└─────────────────────────────────────────────────────────────────────────────┘

OPTION A : ACCÈS AU NOM DE L'UTILISATEUR (Authorization Code Grant)

1. UTILISATEUR ACCORDE L'ACCÈS
   ┌──────────┐                    ┌──────────────────────┐
   │ Analytics│ ── redirect ──────► │  Tourism App Auth    │
   │  Tool    │    /authorize?     │  Server              │
   │          │    client_id=...   │                      │
   │          │    scope=read:bookings:analytics │        │
   └──────────┘                    └──────────┬───────────┘
                                               │
                                               │ 2. Utilisateur se connecte
                                               │    et accorde l'accès
                                               │
   ┌──────────┐◄── authorization_code ────────┘
   │ Analytics│
   │  Tool    │
   └────┬─────┘
        │
        │ 3. Échange du code
        ▼
   ┌──────────────────────┐
   │  Tourism App Auth    │ Access Token (JWT)
   │  Server /token       │ avec scope: read:bookings:analytics
   └──────────┬───────────┘
              │
              │ 4. Requêtes avec token
              ▼
   ┌──────────────────────┐
   │  Booking Management  │ GET /api/v1/bookings?analytics=true
   │  Service             │ Authorization: Bearer <token>
   └──────────────────────┘
```

**Rôles OAuth2 :**
- **Resource Owner** : L'utilisateur de notre application touristique
- **Client** : L'outil d'analyse tiers (Analytics Tool)
- **Authorization Server** : Notre Microservice d'Authentification (Tourism App)
- **Resource Server** : Notre Microservice Booking Management

**OPTION B : ACCÈS AU NIVEAU DE L'APPLICATION (Client Credentials Grant)**

Si l'outil d'analyse a besoin d'accéder à des données agrégées anonymisées (pas au nom d'un utilisateur spécifique), on utiliserait le **Client Credentials Grant** :

```
1. Analytics Tool s'authentifie directement
   POST /oauth/token
   {
     grant_type: "client_credentials",
     client_id: "analytics_tool_id",
     client_secret: "analytics_tool_secret"
   }

2. Reçoit un access token (pas de refresh token)
   {
     access_token: "eyJhbGc...",
     token_type: "Bearer",
     expires_in: 3600
   }

3. Utilise le token pour accéder aux endpoints d'analytics
   GET /api/v1/analytics/bookings/stats
   Authorization: Bearer <token>
```

**Différences :**
- **Authorization Code Grant** : L'utilisateur accorde explicitement l'accès. L'outil peut accéder aux données de l'utilisateur.
- **Client Credentials Grant** : Pas d'utilisateur impliqué. L'outil s'authentifie en tant qu'application. Accès limité aux données agrégées/anonymisées.

#### Implémentation Conceptuelle

```javascript
// auth-service/src/controllers/oauth.controller.js

/**
 * Endpoint d'autorisation OAuth2
 * /oauth/authorize
 */
router.get('/authorize', async (req, res) => {
  const { client_id, redirect_uri, scope, state, response_type } = req.query;

  // Vérifier le client
  const client = await validateClient(client_id, redirect_uri);
  if (!client) {
    return res.status(400).json({ error: 'invalid_client' });
  }

  // Vérifier que l'utilisateur est authentifié
  if (!req.session.userId) {
    // Rediriger vers la page de connexion
    return res.redirect(`/login?redirect=/oauth/authorize?${req.query}`);
  }

  // Afficher la page de consentement
  res.render('oauth-consent', {
    clientName: client.name,
    scopes: parseScopes(scope),
    state
  });
});

/**
 * Endpoint de consentement
 * POST /oauth/authorize
 */
router.post('/authorize', async (req, res) => {
  const { client_id, redirect_uri, scope, state } = req.body;
  const userId = req.session.userId;

  if (req.body.action === 'deny') {
    // Utilisateur a refusé
    return res.redirect(`${redirect_uri}?error=access_denied&state=${state}`);
  }

  // Générer un code d'autorisation
  const authCode = await generateAuthorizationCode({
    clientId: client_id,
    userId,
    scopes: parseScopes(scope),
    redirectUri: redirect_uri
  });

  // Rediriger avec le code
  res.redirect(`${redirect_uri}?code=${authCode}&state=${state}`);
});

/**
 * Endpoint d'échange de token
 * POST /oauth/token
 */
router.post('/token', async (req, res) => {
  const { grant_type, code, client_id, client_secret, redirect_uri } = req.body;

  if (grant_type === 'authorization_code') {
    // Valider le code d'autorisation
    const authCode = await validateAuthorizationCode(code, client_id, redirect_uri);
    if (!authCode) {
      return res.status(400).json({ error: 'invalid_grant' });
    }

    // Générer un access token (JWT)
    const accessToken = await generateAccessToken({
      userId: authCode.userId,
      clientId: client_id,
      scopes: authCode.scopes
    });

    // Optionnel : générer un refresh token
    const refreshToken = await generateRefreshToken({
      userId: authCode.userId,
      clientId: client_id
    });

    res.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: refreshToken,
      scope: authCode.scopes.join(' ')
    });
  } else if (grant_type === 'client_credentials') {
    // Client Credentials Grant pour accès application
    const client = await validateClientCredentials(client_id, client_secret);
    if (!client) {
      return res.status(401).json({ error: 'invalid_client' });
    }

    const accessToken = await generateClientAccessToken({
      clientId: client_id,
      scopes: client.defaultScopes
    });

    res.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600
    });
  } else {
    res.status(400).json({ error: 'unsupported_grant_type' });
  }
});
```

---

## Résumé des Exercices

Ces exercices ont couvert :

1. **Conception de revendications JWT** : Comment structurer les tokens pour différents types d'utilisateurs et besoins d'autorisation
2. **Flux de vérification** : Les étapes détaillées de validation d'un JWT et la gestion appropriée des erreurs avec les codes HTTP corrects
3. **Scénarios OAuth2** : Quand et comment utiliser OAuth2 pour l'autorisation déléguée avec des services externes ou des applications tierces

Ces concepts sont fondamentaux pour implémenter un système d'authentification et d'autorisation robuste dans une architecture de microservices.
