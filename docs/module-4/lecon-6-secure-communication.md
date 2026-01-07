# Leçon 4.6 - Communication Sécurisée entre Microservices (API Gateway, HTTPS)

**Module 4** : Intégration et sécurité du traitement des paiements

---

## Objectifs pédagogiques

À la fin de cette leçon, vous serez capable de :

- ✅ Comprendre le rôle d'une API Gateway dans la sécurisation des microservices
- ✅ Implémenter une validation JWT centralisée au niveau de la Gateway
- ✅ Mettre en place le rate limiting et la validation des entrées
- ✅ Configurer HTTPS pour sécuriser les communications
- ✅ Comprendre les principes du mTLS (mutual TLS) pour les communications internes

## Prérequis

- Avoir complété la Leçon 4.5 sur le Microservice d'Authentification
- Comprendre les JWT et leur validation
- Notions de base sur les certificats SSL/TLS

## Durée estimée

2h00

---

## Introduction

Les microservices communiquent entre eux pour répondre aux requêtes, et assurer la sécurité de ces communications est primordial pour protéger les données sensibles et prévenir les accès non autorisés. Cette leçon explore deux composants critiques : les **API Gateways** et **HTTPS**. En centralisant le contrôle d'accès et en chiffrant les données en transit, ces technologies établissent une posture de sécurité robuste.

---

## 1. Le Rôle de l'API Gateway dans la Sécurité

Une **API Gateway** agit comme point d'entrée unique pour toutes les requêtes clients, les routant vers le microservice approprié. Au-delà du simple routage, elle fournit une couche de sécurité cruciale, agissant comme point d'application des politiques pour les requêtes entrantes.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ARCHITECTURE API GATEWAY                             │
└─────────────────────────────────────────────────────────────────────────────┘

                        ┌─────────────────────┐
        Internet ──────►│    API Gateway      │
                        │    (Port 8080)      │
                        │                     │
                        │ ✓ Validation JWT    │
                        │ ✓ Rate Limiting     │
                        │ ✓ Validation Input  │
                        │ ✓ Logging/Monitoring│
                        │ ✓ SSL Termination   │
                        └─────────┬───────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
              ▼                   ▼                   ▼
    ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
    │  Auth Service   │ │ Catalog Service │ │ Booking Service │
    │  (Port 3001)    │ │  (Port 3002)    │ │  (Port 3003)    │
    └─────────────────┘ └─────────────────┘ └─────────────────┘
                    RÉSEAU INTERNE (HTTPS ou mTLS)
```

### 1.1 Avantages de la Centralisation

| Aspect                | Sans API Gateway                        | Avec API Gateway                   |
| --------------------- | --------------------------------------- | ---------------------------------- |
| **Authentification**  | Chaque service implémente sa validation | Validation centralisée, unique     |
| **Rate Limiting**     | Difficile à coordonner                  | Politique globale uniforme         |
| **Logging**           | Logs dispersés                          | Audit trail centralisé             |
| **Certificats SSL**   | Un certificat par service               | SSL Termination au niveau Gateway  |
| **Surface d'attaque** | Multiple points exposés                 | Un seul point d'entrée à sécuriser |

---

## 2. Authentification et Autorisation Centralisées

Au lieu que chaque microservice implémente sa propre logique d'authentification, l'API Gateway peut gérer ces préoccupations. Quand un client envoie une requête, la Gateway valide les identifiants (JWT, API key) **avant** de transférer la requête aux services en aval.

### 2.1 Exemple : Validation JWT à l'API Gateway

```javascript
// api-gateway/src/server.js

const express = require("express");
const jwt = require("jsonwebtoken");
const app = express();

// URLs des microservices internes
const TOUR_CATALOG_URL =
  process.env.TOUR_CATALOG_URL || "http://tour-catalog-service:3002";
const BOOKING_SERVICE_URL =
  process.env.BOOKING_SERVICE_URL || "http://booking-service:3003";

const JWT_SECRET = process.env.JWT_SECRET;

// ==================== MIDDLEWARE JWT ====================
const validateJWT = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: "Authorization header manquant",
    });
  }

  const token = authHeader.split(" ")[1]; // Format: "Bearer <token>"

  if (!token) {
    return res.status(401).json({
      success: false,
      error: "Token manquant",
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Attacher les infos utilisateur
    next();
  } catch (err) {
    console.error("Validation JWT échouée:", err.message);
    return res.status(403).json({
      success: false,
      error: "Token invalide ou expiré",
    });
  }
};

// ==================== ROUTES PROTÉGÉES ====================

// Appliquer la validation JWT à toutes les routes /api/*
app.use("/api/*", validateJWT);

// Proxy vers le Catalogue de Tours
app.get("/api/tours", async (req, res) => {
  try {
    const response = await fetch(`${TOUR_CATALOG_URL}/tours`, {
      headers: {
        // Transmettre l'ID utilisateur au service interne
        "x-user-id": req.user.userId,
        "x-user-role": req.user.role,
      },
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Erreur proxy Tour Catalog:", error);
    res.status(503).json({ error: "Service indisponible" });
  }
});

// Proxy vers le Service de Réservation
app.post("/api/bookings", async (req, res) => {
  try {
    const response = await fetch(`${BOOKING_SERVICE_URL}/bookings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": req.user.userId,
      },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error("Erreur proxy Booking Service:", error);
    res.status(503).json({ error: "Service indisponible" });
  }
});

// ==================== ROUTE PUBLIQUE ====================
app.get("/health", (req, res) => {
  res.json({ status: "API Gateway opérationnelle" });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});
```

> **Point clé** : Les microservices internes reçoivent des requêtes **déjà authentifiées**. Ils font confiance aux headers `x-user-id` et `x-user-role` transmis par la Gateway.

---

## 3. Rate Limiting et Throttling

Une API Gateway peut protéger les microservices contre les abus et les attaques DoS (Denial of Service) en implémentant le **rate limiting**.

### 3.1 Scénarios d'Utilisation

| Scénario                      | Protection                                                     |
| ----------------------------- | -------------------------------------------------------------- |
| **Attaque DoS**               | Limiter à 100 req/min par IP                                   |
| **Scraping de données**       | Détecter les patterns suspects et bloquer temporairement       |
| **Abus API**                  | Quota par utilisateur (ex: 1000 req/jour pour le tier gratuit) |
| **Protection des ressources** | Endpoints coûteux limités (ex: recherche: 10 req/min)          |

### 3.2 Implémentation avec express-rate-limit

```javascript
// api-gateway/src/middleware/rateLimiter.js

const rateLimit = require("express-rate-limit");

// Rate limiter global
const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requêtes par fenêtre
  message: {
    success: false,
    error: "Trop de requêtes, veuillez réessayer plus tard",
    retryAfter: 60,
  },
  standardHeaders: true, // Retourne les headers RateLimit-*
  legacyHeaders: false,
});

// Rate limiter strict pour les endpoints sensibles
const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10, // Seulement 10 requêtes par minute
  message: {
    success: false,
    error: "Limite atteinte pour cet endpoint",
  },
});

// Rate limiter par utilisateur (basé sur le JWT)
const userBasedLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 heures
  max: 1000, // 1000 requêtes par jour
  keyGenerator: (req) => {
    // Utiliser l'ID utilisateur plutôt que l'IP
    return req.user?.userId || req.ip;
  },
  message: {
    success: false,
    error: "Quota journalier dépassé",
  },
});

module.exports = { globalLimiter, strictLimiter, userBasedLimiter };
```

```javascript
// Utilisation dans server.js
const { globalLimiter, strictLimiter } = require("./middleware/rateLimiter");

// Appliquer le rate limiter global
app.use(globalLimiter);

// Rate limiter strict pour la recherche
app.get("/api/tours/search", strictLimiter, async (req, res) => {
  // ... logique de recherche
});
```

---

## 4. Validation des Entrées et Schémas

L'API Gateway peut effectuer une validation initiale des corps de requête et paramètres, s'assurant que seules des requêtes bien formées atteignent les services backend.

### 4.1 Exemple avec Joi

```javascript
// api-gateway/src/middleware/validators.js

const Joi = require("joi");

// Schéma de validation pour une réservation
const bookingSchema = Joi.object({
  tourId: Joi.string().uuid().required(),
  numberOfParticipants: Joi.number().integer().min(1).max(20).required(),
  bookingDate: Joi.date().iso().greater("now").required(),
  specialRequests: Joi.string().max(500).optional(),
});

// Middleware de validation
const validateBooking = (req, res, next) => {
  const { error, value } = bookingSchema.validate(req.body, {
    abortEarly: false, // Retourner toutes les erreurs
  });

  if (error) {
    const errors = error.details.map((d) => d.message);
    return res.status(400).json({
      success: false,
      error: "Données de réservation invalides",
      details: errors,
    });
  }

  req.body = value; // Données validées et sanitisées
  next();
};

module.exports = { validateBooking };
```

```javascript
// Utilisation
const { validateBooking } = require("./middleware/validators");

app.post("/api/bookings", validateJWT, validateBooking, async (req, res) => {
  // req.body est maintenant validé et sûr
  // ...
});
```

---

## 5. Logging et Monitoring Centralisés

En centralisant la gestion des requêtes, l'API Gateway devient un point stratégique pour logger toutes les requêtes et réponses.

### 5.1 Middleware de Logging

```javascript
// api-gateway/src/middleware/logger.js

const morgan = require("morgan");

// Format de log personnalisé incluant les infos de sécurité
const logFormat =
  ':remote-addr - :user-id [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] :response-time ms';

morgan.token("user-id", (req) => {
  return req.user?.userId || "anonymous";
});

const requestLogger = morgan(logFormat, {
  stream: {
    write: (message) => {
      // En production: envoyer vers un système de logging centralisé
      // (ELK Stack, Datadog, CloudWatch, etc.)
      console.log(message.trim());
    },
  },
});

// Logger d'audit pour les actions sensibles
const auditLog = (action) => {
  return (req, res, next) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      action,
      userId: req.user?.userId,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      path: req.path,
      body: req.body, // Attention: ne pas logger les données sensibles!
    };

    console.log("AUDIT:", JSON.stringify(logEntry));
    next();
  };
};

module.exports = { requestLogger, auditLog };
```

---

## 6. Sécurisation avec HTTPS

Alors que l'API Gateway sécurise l'accès aux microservices, **HTTPS** sécurise les données en transit. HTTPS chiffre la communication, empêchant l'écoute clandestine, la falsification et la modification des messages.

### 6.1 Comment Fonctionne HTTPS

HTTPS repose sur **TLS (Transport Layer Security)** qui utilise une combinaison de chiffrement symétrique et asymétrique :

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             HANDSHAKE TLS                                   │
└─────────────────────────────────────────────────────────────────────────────┘

1. CLIENT HELLO
   ┌──────────┐                    ┌──────────────────────┐
   │  Client  │ ── versions TLS ──►│       Serveur        │
   │          │    cipher suites   │                      │
   └──────────┘                    └──────────────────────┘

2. SERVER HELLO + CERTIFICAT
   ┌──────────┐◄── certificat ─────┌──────────────────────┐
   │  Client  │    (clé publique)  │       Serveur        │
   │          │                    │                      │
   └──────────┘                    └──────────────────────┘

3. VÉRIFICATION CERTIFICAT
   Client vérifie:
   - Émetteur de confiance (CA)
   - Non expiré
   - Nom de domaine correspond

4. ÉCHANGE DE CLÉ DE SESSION
   ┌──────────┐                    ┌──────────────────────┐
   │  Client  │ ── clé chiffrée ──►│       Serveur        │
   │          │    (clé publique)  │                      │
   └──────────┘                    └──────────────────────┘

5. COMMUNICATION CHIFFRÉE
   Toutes les données sont chiffrées avec la clé de session symétrique
```

| Garantie             | Description                                                |
| -------------------- | ---------------------------------------------------------- |
| **Authentification** | Le client vérifie l'identité du serveur (certificat CA)    |
| **Confidentialité**  | Données chiffrées, illisibles pour un intercepteur         |
| **Intégrité**        | MAC (Message Authentication Code) détecte toute altération |

### 6.2 Communication Interne entre Microservices

Même au sein d'un réseau privé, chiffrer les communications inter-services ajoute une couche de **défense en profondeur** contre les menaces internes ou les compromissions réseau.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     COMMUNICATION INTER-SERVICES                            │
└─────────────────────────────────────────────────────────────────────────────┘

   Scénario: Payment Service → Booking Service

   ❌ SANS HTTPS (HTTP)
   ┌──────────────────┐         ┌──────────────────┐
   │ Payment Service  │ ──────► │ Booking Service  │
   │                  │  HTTP   │                  │
   └──────────────────┘  plain  └──────────────────┘
                            │
                      🔓 Données en clair
                         (bookingId, montant, statut)
                         → Interception possible

   ✅ AVEC HTTPS
   ┌──────────────────┐         ┌──────────────────┐
   │ Payment Service  │ ──────► │ Booking Service  │
   │                  │  HTTPS  │                  │
   └──────────────────┘  TLS    └──────────────────┘
                            │
                      🔒 Données chiffrées
                         → Confidentialité garantie
```

### 6.3 Implémentation HTTPS pour un Microservice

```javascript
// microservice/src/server-https.js

const express = require("express");
const https = require("https");
const fs = require("fs");
const path = require("path");

const app = express();

// Charger les certificats SSL/TLS
// En production: fichiers fournis par Let's Encrypt ou votre CA
const privateKey = fs.readFileSync(
  path.join(__dirname, "../certs/private.key"),
  "utf8"
);
const certificate = fs.readFileSync(
  path.join(__dirname, "../certs/certificate.crt"),
  "utf8"
);
const caBundle = fs.readFileSync(
  path.join(__dirname, "../certs/ca_bundle.crt"),
  "utf8"
); // Chaîne de certification

const credentials = {
  key: privateKey,
  cert: certificate,
  ca: caBundle,
};

app.get("/", (req, res) => {
  res.json({ message: "Microservice sécurisé avec HTTPS!" });
});

// Créer le serveur HTTPS
const httpsServer = https.createServer(credentials, app);

const HTTPS_PORT = process.env.HTTPS_PORT || 3000;
httpsServer.listen(HTTPS_PORT, () => {
  console.log(`HTTPS Server running on port ${HTTPS_PORT}`);
});
```

### 6.4 Générer des Certificats Auto-Signés (Développement)

```bash
# Générer une clé privée
openssl genrsa -out private.key 2048

# Générer un certificat auto-signé (valide 365 jours)
openssl req -new -x509 -key private.key -out certificate.crt -days 365 \
  -subj "/C=FR/ST=IDF/L=Paris/O=TourismApp/CN=localhost"
```

> ⚠️ **Important** : Les certificats auto-signés sont pour le développement uniquement. En production, utilisez des certificats d'une CA reconnue (Let's Encrypt, DigiCert, etc.).

---

## 7. mTLS (Mutual TLS) - Sécurité Avancée

Pour le plus haut niveau de sécurité dans les communications internes, **mTLS** peut être implémenté. Avec mTLS, **les deux parties** (client et serveur) présentent et vérifient des certificats.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TLS vs mTLS                                          │
└─────────────────────────────────────────────────────────────────────────────┘

   TLS Standard (One-Way):
   Client ────────────────────────► Serveur
           Le client vérifie         présente son
           le certificat serveur     certificat

   mTLS (Two-Way):
   Client ◄───────────────────────► Serveur
   présente son                      présente son
   certificat                        certificat
           Les DEUX vérifient
           le certificat de l'autre
```

> **Note** : Le mTLS est souvent implémenté via des **Service Meshes** comme Istio ou Linkerd, qui automatisent la gestion des certificats entre microservices.

---

## 8. Considérations et Défis

| Défi                        | Solution                                                    |
| --------------------------- | ----------------------------------------------------------- |
| **Performance**             | Impact minime avec hardware moderne et TLS 1.3              |
| **Gestion des certificats** | Automatisation (Certbot, cert-manager dans Kubernetes)      |
| **Renouvellement**          | Let's Encrypt: renouvellement automatique tous les 90 jours |
| **mTLS complexité**         | Service Mesh (Istio) pour automatiser                       |
| **SSL Termination**         | Effectuer au niveau du Load Balancer ou API Gateway         |

---

## Exercices et Pratique

### Exercice 1 : Simulation API Gateway avec Authentification

- Créez une application Express.js agissant comme API Gateway.
- Créez deux "microservices" basiques (UserService, ProductService).
- Implémentez un middleware de validation JWT dans la Gateway.
- Testez avec Postman : sans token, avec token valide, avec token invalide.

### Exercice 2 : Configuration HTTPS

- Générez des certificats auto-signés avec OpenSSL.
- Modifiez un de vos microservices pour servir en HTTPS.
- Accédez-y depuis un navigateur et observez l'avertissement de certificat non approuvé.

---

## Résumé

Sécuriser la communication entre microservices est une pierre angulaire des architectures résilientes :

| Composant         | Rôle                                                            |
| ----------------- | --------------------------------------------------------------- |
| **API Gateway**   | Point d'entrée unique, authentification, rate limiting, logging |
| **HTTPS**         | Chiffrement des données en transit, authentification serveur    |
| **mTLS**          | Authentification mutuelle pour les communications internes      |
| **Rate Limiting** | Protection contre DoS et abus                                   |
| **Validation**    | Filtrage des requêtes malformées avant les services backend     |

---

## Navigation

- **⬅️ Précédent** : [Leçon 4.5 - Microservice d'Authentification](lecon-5-user-auth-microservice.md)
- **🏠 Sommaire** : [Retour au README](README.md)
- **➡️ Module 5** : [Orchestration et Déploiement des Microservices]()

---

## Ressources

- [Express Rate Limit](https://www.npmjs.com/package/express-rate-limit)
- [Joi Validation](https://joi.dev/)
- [Let's Encrypt - Certificats Gratuits](https://letsencrypt.org/)
- [OpenSSL Documentation](https://www.openssl.org/docs/)
- [OWASP API Security](https://owasp.org/www-project-api-security/)
