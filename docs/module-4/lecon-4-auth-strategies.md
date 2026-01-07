# Leçon 4.4 - Stratégies d'Authentification et d'Autorisation (JWT, OAuth2)

**Module 4** : Intégration et sécurité du traitement des paiements

---

## Objectifs pédagogiques

À la fin de cette leçon, vous serez capable de :

- ✅ Comprendre la différence entre authentification et autorisation
- ✅ Maîtriser le fonctionnement des JSON Web Tokens (JWT) pour l'authentification sans état
- ✅ Comprendre le protocole OAuth2 pour l'autorisation déléguée
- ✅ Concevoir des stratégies d'authentification adaptées aux microservices
- ✅ Implémenter la vérification de tokens JWT dans vos microservices

## Prérequis

- Avoir complété les leçons précédentes du Module 4
- Comprendre les principes de base de la sécurité web
- Connaissances de base en Node.js/Express

## Durée estimée

2h30

---

## Introduction

L'authentification et l'autorisation efficaces des utilisateurs sont des composants critiques de toute application sécurisée, en particulier dans une architecture de microservices comme notre application de réservation touristique. Cette leçon explorera les stratégies modernes pour gérer l'identité et les permissions des utilisateurs, en se concentrant spécifiquement sur les **JSON Web Tokens (JWT)** pour l'authentification sans état et **OAuth2** pour l'autorisation déléguée. Ces approches permettent des mécanismes d'authentification et d'autorisation sécurisés, évolutifs et interopérables à travers nos microservices distribués.

---

## 1. Comprendre l'Authentification et l'Autorisation

L'**authentification** vérifie l'identité d'un utilisateur, confirmant qu'il est bien celui qu'il prétend être. L'**autorisation**, quant à elle, détermine ce qu'un utilisateur authentifié est autorisé à faire. Dans notre application de réservation touristique, l'authentification pourrait confirmer les identifiants de connexion d'un utilisateur, tandis que l'autorisation déciderait si cet utilisateur peut consulter ses réservations passées, modifier les détails d'un tour (s'il est administrateur), ou traiter un paiement.

### 1.1 Authentification

L'authentification implique couramment des identifiants comme des paires nom d'utilisateur/mot de passe, l'authentification multi-facteurs (MFA), ou la vérification biométrique. Une fois l'identité d'un utilisateur vérifiée, le système établit une session sécurisée ou émet un token pour représenter cette identité pour les requêtes suivantes.

**Exemple réel** : Lorsque vous vous connectez à votre portail bancaire en ligne, le système vous authentifie en vérifiant votre nom d'utilisateur et votre mot de passe par rapport à ses enregistrements. S'ils correspondent, vous obtenez l'accès à votre compte.

**Scénario hypothétique** : Dans notre application de réservation touristique, un utilisateur entre son email et son mot de passe sur la page de connexion. Le microservice d'authentification valide ces identifiants. S'ils sont valides, il confirme l'identité de l'utilisateur comme, par exemple, "Chermann KING, client."

**Exemple avancé** : Certaines applications bancaires utilisent l'authentification biométrique (empreinte digitale ou reconnaissance faciale) comme facteur secondaire après la saisie initiale du nom d'utilisateur/mot de passe, renforçant ainsi le processus d'authentification.

### 1.2 Autorisation

L'autorisation définit les politiques de contrôle d'accès, dictant quelles ressources un utilisateur authentifié peut accéder et quelles actions il peut effectuer. Cela est souvent basé sur des rôles (par exemple, client, admin, opérateur_tour) ou des permissions spécifiques (par exemple, read:booking, create:tour).

**Exemple réel** : Après vous être connecté à une plateforme de médias sociaux, vous êtes autorisé à publier des mises à jour sur votre propre fil et à consulter les profils publics, mais pas à supprimer la publication d'un autre utilisateur sauf si vous êtes administrateur.

**Scénario hypothétique** : Après que Chermann KING soit authentifié dans notre application de réservation touristique, le système vérifie son rôle. En tant que "client", il est autorisé à consulter ses propres réservations et à rechercher des tours, mais il n'est pas autorisé à créer de nouvelles offres de tours ou à rembourser le paiement d'un autre utilisateur. Un utilisateur "admin", cependant, serait autorisé pour ces actions.

**Exemple avancé** : Les fournisseurs de services cloud implémentent souvent des politiques d'autorisation granulaires, permettant à des utilisateurs ou groupes spécifiques de gérer certains types de ressources (par exemple, créer uniquement des machines virtuelles dans une région spécifique, ou lire uniquement depuis une instance de base de données particulière) plutôt qu'un accès administratif large.

---

## 2. JSON Web Tokens (JWT) pour l'Authentification sans État

Les **JSON Web Tokens (JWT, prononcé "jot")** sont un moyen compact et sûr pour les URL de représenter des revendications à transférer entre deux parties. Les JWT sont couramment utilisés pour l'authentification sans état dans les architectures de microservices car ils éliminent le besoin de sessions côté serveur, favorisant l'évolutivité. Un JWT contient des informations sur l'utilisateur (revendications), qui peuvent être signées pour vérifier leur authenticité.

### 2.1 Structure d'un JWT

Un JWT consiste en trois parties, séparées par des points (.) :

1. **Header (En-tête)** : Contient les métadonnées sur le token lui-même, telles que le type de token (JWT) et l'algorithme de hachage utilisé pour la signature (par exemple, HS256, RS256).
2. **Payload (Charge utile)** : Contient les revendications. Les revendications sont des déclarations sur une entité (généralement l'utilisateur) et des données supplémentaires. Il existe différents types de revendications :
   - **Revendications enregistrées** : Revendications prédéfinies comme `iss` (émetteur), `exp` (heure d'expiration), `sub` (sujet), `aud` (audience).
   - **Revendications publiques** : Revendications personnalisées qui peuvent être définies par les utilisateurs JWT, mais les collisions doivent être évitées.
   - **Revendications privées** : Revendications personnalisées créées pour partager des informations entre parties qui conviennent de les utiliser (par exemple, userId, role).
3. **Signature** : Créée en prenant l'en-tête encodé, la charge utile encodée, une clé secrète (ou une clé privée dans le cas de RSA), et en les signant à l'aide de l'algorithme spécifié dans l'en-tête. Cette signature est utilisée pour vérifier que l'expéditeur du JWT est bien celui qu'il prétend être et pour garantir que le message n'a pas été falsifié.

```json
// Exemple d'un en-tête JWT décodé
{
  "alg": "HS256", // Algorithme de hachage (HMAC SHA256)
  "typ": "JWT" // Type de token
}
```

```json
// Exemple d'une charge utile JWT décodée
{
  "sub": "1234567890", // Sujet (ID utilisateur)
  "name": "Chermann KING", // Nom de l'utilisateur
  "admin": true, // Revendication personnalisée : indique si l'utilisateur est admin
  "iat": 1516239022, // Émis à (timestamp)
  "exp": 1516242622 // Expiration (timestamp)
}
```

Le token résultant ressemble à `xxxxx.yyyyy.zzzzz`.

### 2.2 Flux JWT dans les Microservices

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FLUX JWT DANS LES MICROSERVICES                      │
└─────────────────────────────────────────────────────────────────────────────┘

1. CONNEXION
   ┌──────────┐                    ┌──────────────────────┐
   │  Client  │ ── credentials ──► │  Auth Microservice  │
   │ (React)  │                    │   (Port 3004)       │
   └──────────┘                    └──────────┬───────────┘
                                               │
                                               │ 2. Génération JWT
                                               │    (signé avec secret)
                                               │
   ┌──────────┐◄──────── JWT ──────────────────┘
   │  Client  │
   │ (React)  │
   └────┬─────┘
        │
        │ 3. Stockage (localStorage/cookie)
        │
        ▼
   ┌─────────────────────────────────────────────────────────────┐
   │  REQUÊTES SUBSÉQUENTES                                       │
   │                                                               │
   │  4. Client inclut JWT dans header:                          │
   │     Authorization: Bearer <JWT>                              │
   │                                                               │
   │  5. Chaque microservice vérifie:                             │
   │     - Signature valide ?                                     │
   │     - Token non expiré ?                                     │
   │     - Claims extraits (userId, roles)                       │
   │                                                               │
   │  6. Autorisation basée sur les claims                        │
   └─────────────────────────────────────────────────────────────┘
```

**Étapes détaillées :**

1. **Connexion** : Un utilisateur envoie ses identifiants à un Microservice d'Authentification.
2. **Génération de Token** : Si les identifiants sont valides, le Microservice d'Authentification génère un JWT. Il inclut des revendications spécifiques à l'utilisateur (par exemple, userId, roles) et le signe avec une clé secrète.
3. **Émission du Token** : Le JWT est retourné au client (par exemple, le frontend React). Le client stocke généralement ce token dans le stockage local ou un cookie HTTP-only.
4. **Requêtes Subséquentes** : Pour chaque requête suivante à n'importe quel microservice (par exemple, Tour Catalog, Booking Management, Payment Gateway), le client inclut le JWT, généralement dans l'en-tête Authorization comme un token Bearer.
5. **Vérification du Token** : Chaque microservice récepteur intercepte la requête entrante. Il extrait le JWT et vérifie sa signature en utilisant la même clé secrète (ou clé publique, si une signature asymétrique est utilisée). Si la signature est valide et que le token n'a pas expiré, le microservice fait confiance aux revendications dans la charge utile.
6. **Autorisation** : Basé sur les revendications (par exemple, userId, roles), le microservice détermine si l'utilisateur est autorisé à effectuer l'action demandée sur la ressource spécifique.

### 2.3 Avantages des JWT

| Avantage       | Description                                                                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Sans état**  | Pas besoin de sessions côté serveur, ce qui simplifie la mise à l'échelle des microservices. Chaque service peut vérifier indépendamment les tokens.         |
| **Efficacité** | Les revendications sont directement intégrées dans le token, réduisant les recherches en base de données pour les informations utilisateur à chaque requête. |
| **Découplage** | La logique d'authentification et d'autorisation peut être distribuée à travers les microservices.                                                            |

### 2.4 Inconvénients et Considérations

| Considération                  | Description                                                                                                                                                                                                                                                                                                             |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Taille du Token**            | Stocker des revendications étendues peut rendre les tokens volumineux, impactant la surcharge des requêtes.                                                                                                                                                                                                             |
| **Révocation**                 | Les JWT sont auto-contenus, ce qui rend la révocation immédiate difficile. Si un token est compromis avant son expiration, il reste valide. Des stratégies comme des temps d'expiration courts combinés à des refresh tokens, ou un mécanisme de liste noire (nécessitant une recherche centralisée), sont nécessaires. |
| **Sécurité de la Clé Secrète** | Si la clé secrète utilisée pour signer le JWT est compromise, un attaquant peut forger des tokens.                                                                                                                                                                                                                      |

### 2.5 Exemple Pratique : Implémentation de la Vérification JWT (Node.js/Express Conceptuel)

Considérons notre Microservice de Catalogue de Visite Guidée. Il doit s'assurer que seuls les utilisateurs authentifiés peuvent consulter les détails des tours et que seuls les utilisateurs autorisés (par exemple, admin) peuvent ajouter de nouveaux tours.

```javascript
// tour-catalog-service/src/middleware/authMiddleware.js

const jwt = require("jsonwebtoken");

// Un placeholder pour notre clé secrète JWT. Dans une vraie app, cela serait
// chargé depuis les variables d'environnement et gardé hautement sécurisé.
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey123";

/**
 * Middleware pour authentifier les requêtes en utilisant un JWT.
 * Il extrait le token de l'en-tête Authorization, le vérifie,
 * et attache les informations utilisateur décodées à l'objet request.
 */
const authenticateToken = (req, res, next) => {
  // Extraire l'en-tête Authorization
  const authHeader = req.headers["authorization"];

  // Le token est attendu au format "Bearer <TOKEN>"
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null) {
    // Aucun token fourni, envoyer 401 Unauthorized
    return res.sendStatus(401);
  }

  // Vérifier le token en utilisant la clé secrète
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      // Token invalide (par exemple, expiré, malformé, ou signature invalide)
      return res.sendStatus(403); // Forbidden
    }

    // Si le token est valide, attacher la charge utile utilisateur décodée à la requête
    // Cet objet 'user' contiendra des revendications comme userId, roles, etc.
    req.user = user;
    next(); // Procéder au middleware suivant ou au gestionnaire de route
  });
};

/**
 * Middleware pour autoriser les requêtes basées sur les rôles utilisateur.
 * Attend que `req.user` soit rempli par le middleware `authenticateToken`.
 */
const authorizeRoles = (roles) => {
  return (req, res, next) => {
    // Si l'objet utilisateur n'a pas été défini par authenticateToken, quelque chose ne va pas
    if (!req.user || !req.user.roles) {
      return res.sendStatus(403); // Forbidden, pas d'infos utilisateur
    }

    // Vérifier si le rôle de l'utilisateur existe dans le tableau des rôles autorisés
    const hasPermission = req.user.roles.some((role) => roles.includes(role));

    if (hasPermission) {
      next(); // Utilisateur autorisé, procéder
    } else {
      res.sendStatus(403); // Forbidden, utilisateur n'a pas le rôle requis
    }
  };
};

module.exports = { authenticateToken, authorizeRoles };
```

```javascript
// tour-catalog-service/src/routes/tours.js

const express = require("express");
const router = express.Router();
const {
  authenticateToken,
  authorizeRoles,
} = require("../middleware/authMiddleware");

// Supposons que tourController gère les opérations de base de données pour les tours
const tourController = require("../controllers/tourController");

// Route pour obtenir tous les tours (nécessite authentification, mais pas de rôle spécifique)
router.get("/", authenticateToken, tourController.getAllTours);

// Route pour obtenir un tour spécifique par ID (nécessite authentification)
router.get("/:id", authenticateToken, tourController.getTourById);

// Route pour ajouter un nouveau tour (nécessite le rôle 'admin')
// Nous authentifions d'abord, puis vérifions le rôle admin
router.post(
  "/",
  authenticateToken,
  authorizeRoles(["admin"]),
  tourController.createTour
);

// Route pour mettre à jour un tour (nécessite le rôle 'admin')
router.put(
  "/:id",
  authenticateToken,
  authorizeRoles(["admin"]),
  tourController.updateTour
);

// Route pour supprimer un tour (nécessite le rôle 'admin')
router.delete(
  "/:id",
  authenticateToken,
  authorizeRoles(["admin"]),
  tourController.deleteTour
);

module.exports = router;
```

Dans cette configuration, n'importe quel microservice peut utiliser `authenticateToken` pour vérifier l'identité de l'utilisateur et `authorizeRoles` pour vérifier des permissions spécifiques. Cela démontre comment les JWT facilitent les décisions d'autorisation décentralisées.

---

## 3. OAuth2 pour l'Autorisation Déléguée

**OAuth2 (Open Authorization 2.0)** est un protocole standard de l'industrie pour l'autorisation. Il permet à un utilisateur d'accorder à une application tierce (client) un accès limité à ses ressources sur un autre serveur (serveur de ressources) sans partager ses identifiants. Contrairement aux JWT, qui concernent qui est l'utilisateur et ce qu'il peut faire, OAuth2 concerne principalement la façon dont une application obtient la permission d'agir au nom d'un utilisateur.

Dans le contexte de notre application de réservation touristique, bien que JWT gère l'authentification directe de nos utilisateurs contre nos services, OAuth2 serait pertinent si notre application devait accéder aux données utilisateur de services externes (par exemple, le profil de médias sociaux d'un utilisateur ou un service de calendrier externe) avec leur permission explicite. Il est également souvent utilisé comme cadre pour construire notre propre système d'authentification et d'autorisation, où nos propres services agissent comme le serveur d'autorisation et le serveur de ressources.

### 3.1 Rôles Clés dans OAuth2

| Rôle                     | Description                                                                                                                                                                                                                                |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Resource Owner**       | L'utilisateur qui possède les données (par exemple, un utilisateur de notre application de réservation touristique).                                                                                                                       |
| **Client**               | L'application demandant l'accès aux données du Resource Owner (par exemple, notre frontend React, ou un service de réservation partenaire).                                                                                                |
| **Authorization Server** | Le serveur qui authentifie le Resource Owner et émet des access tokens au Client. Cela pourrait être notre propre Microservice d'Authentification dédié ou un fournisseur d'identité tiers (IdP) comme Google, Facebook, Okta, Auth0, etc. |
| **Resource Server**      | Le serveur hébergeant les ressources protégées (par exemple, notre Microservice de Catalogue de Visite Guidée, Microservice de Gestion des Réservations). Il accepte et valide les access tokens pour accorder l'accès aux ressources.     |

### 3.2 Le Flux OAuth2 (Type d'Octroi Authorization Code avec PKCE)

Le type d'octroi **Authorization Code avec PKCE (Proof Key for Code Exchange)** est le standard moderne obligatoire pour les applications frontend (SPA) et mobiles. Il empêche les attaques par interception de code.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FLUX OAUTH2 + PKCE (STANDARD SPA)                         │
└─────────────────────────────────────────────────────────────────────────────┘

1. PRÉPARATION (Frontend)
   - Génère "code_verifier" (secret aléatoire)
   - Calcule "code_challenge" = SHA256(code_verifier)

2. DEMANDE D'AUTORISATION
   ┌──────────┐                    ┌──────────────────────┐
   │  Client  │ ── redirect ──────► │ Authorization Server │
   │ (React)  │    /authorize?      │   (Auth Service)     │
   │          │    client_id=...    │                      │
   │          │    code_challenge=..│ ◄── Stocke le challenge
   │          │    ...              │                      │
   └──────────┘                    └──────────┬───────────┘
                                               │
                                               │ 3. Authentification
                                               │    + Consentement
                                               │
   ┌──────────┐◄── authorization_code ────────┘
   │  Client  │
   │ (React)  │
   └────┬─────┘
        │
        │ 4. Échange du code + VERIFIER
        │    POST /token
        │    code=...
        │    code_verifier=...  ─────► 5. Vérifie:
        ▼                              SHA256(verifier) == challenge ?
   ┌──────────────────────┐            Si OK -> Token
   │  Authorization       │
   │  Server              │
   │  /token              │
   └──────────┬───────────┘
              │
              │ 6. Access Token (JWT)
              │    + ID Token (OIDC)
              ▼
   ┌──────────┐
   │  Client  │
   └──────────┘
```

**Étapes détaillées :**

1. **Préparation (PKCE)** : Le Client React génère un secret cryptographique temporaire (`code_verifier`) et son empreinte hachée (`code_challenge`).
2. **Demande d'Autorisation** : Le Client redirige vers le Authorization Server avec le `code_challenge`.
3. **Consentement** : L'utilisateur s'authentifie.
4. **Code d'Autorisation** : Le serveur renvoie un code temporaire.
5. **Échange de Token (Preuve)** : Le Client envoie le code **ET** le `code_verifier` original (le secret) au endpoint `/token`.
6. **Validation** : Le serveur hache le `code_verifier` reçu. Si le résultat correspond au `code_challenge` reçu à l'étape 2, cela prouve que c'est bien le même client qui a initié la demande. Il délivre alors le token.

> **Note technologique** : Ce mécanisme remplace l'ancien "Implicit Flow" qui est désormais déprécié pour des raisons de sécurité.

### 3.3 Exemple : Notre Application de Réservation Touristique Utilisant OAuth2 (Serveur d'Autorisation Interne)

Supposons que notre Microservice d'Authentification agisse également comme un Authorization Server OAuth2.

- **Resource Owner** : Un client dans notre application de réservation touristique.
- **Client** : Notre application frontend React.
- **Authorization Server** : Notre Microservice d'Authentification.
- **Resource Server** : Microservice de Catalogue de Visite Guidée, Microservice de Gestion des Réservations.

Le frontend React veut accéder à l'historique des réservations du client.

1. Si le client n'est pas connecté, le frontend React le redirige vers la page de connexion du Microservice d'Authentification (endpoint `/authorize`), demandant `scope=read:bookings`.
2. Le client se connecte avec ses identifiants.
3. Le Microservice d'Authentification redirige vers le frontend React avec un code d'autorisation.
4. Le proxy backend du frontend React (ou l'application React elle-même, si conçue de manière sécurisée avec PKCE) échange ce code pour un access_token et un refresh_token avec l'endpoint token (`/token`) du Microservice d'Authentification. L'access_token retourné serait un JWT contenant userId et la revendication de scope `read:bookings`.
5. Le frontend React utilise ensuite ce JWT access_token dans l'en-tête `Authorization: Bearer <JWT>` lors de requêtes au Microservice de Gestion des Réservations (Resource Server) pour récupérer l'historique des réservations.
6. Le Microservice de Gestion des Réservations vérifie le JWT et vérifie si le scope `read:bookings` est présent avant de retourner les données.

### 3.4 Avantages d'OAuth2

| Avantage                          | Description                                                                                                                                                      |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Autorisation Déléguée**         | Les utilisateurs accordent des permissions spécifiques et limitées sans partager leurs identifiants principaux.                                                  |
| **Séparation des Préoccupations** | Le Authorization Server gère l'authentification utilisateur, permettant aux serveurs de ressources de se concentrer uniquement sur la protection des ressources. |
| **Standardisation**               | Un standard largement adopté, favorisant l'interopérabilité.                                                                                                     |
| **Flexibilité**                   | Prend en charge divers types d'octroi pour différents types de clients et scénarios.                                                                             |

### 3.5 Inconvénients et Considérations

| Considération                 | Description                                                                                                                                               |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Complexité**                | Peut être plus complexe à implémenter par rapport à une authentification basée sur des tokens simple en raison de multiples composants et types d'octroi. |
| **Gestion des Scopes**        | Définir et gérer des scopes appropriés nécessite une conception soignée.                                                                                  |
| **Sécurité du client_secret** | Pour les clients confidentiels, le client_secret doit être gardé hautement sécurisé.                                                                      |

---

## 4. Comparaison JWT et OAuth2

Il est important de comprendre que JWT et OAuth2 ne sont pas mutuellement exclusifs ; ils se complètent souvent.

| Caractéristique        | JSON Web Tokens (JWT)                                                                                      | OAuth2                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **Objectif Principal** | Authentification sans état (identifier un utilisateur) et échange d'informations sécurisé (revendications) | Autorisation déléguée (accorder un accès limité aux ressources)                 |
| **Ce que c'est**       | Un format de token (un objet JSON signé)                                                                   | Un protocole/cadre pour l'autorisation                                          |
| **Usage**              | Souvent utilisé dans OAuth2 comme format pour les access tokens                                            | Définit comment les access tokens sont émis et utilisés                         |
| **Composants**         | Header, Payload, Signature                                                                                 | Resource Owner, Client, Authorization Server, Resource Server                   |
| **Sans État**          | Inhéremment sans état grâce aux revendications auto-contenues                                              | Peut être avec état (par exemple, avec refresh tokens) ou sans état (avec JWTs) |
| **Complexité**         | Relativement simple à implémenter pour l'authentification de base                                          | Plus complexe, impliquant de multiples redirections et appels serveur à serveur |

Dans notre architecture de microservices, nous utiliserons probablement des JWTs comme format pour les access tokens émis par un Authorization Server OAuth2 (qui pourrait être notre propre Microservice d'Authentification). Cela combine les avantages de l'autorisation déléguée d'OAuth2 avec le sans état et l'efficacité des JWTs pour les appels API.

---

## 5. Implémentation Pratique : Middleware d'Authentification JWT

### 5.1 Middleware de Vérification JWT Complet

```javascript
// shared/auth-middleware/src/jwtAuth.js

const jwt = require("jsonwebtoken");
const { promisify } = require("util");

const verifyToken = promisify(jwt.verify);

/**
 * Middleware d'authentification JWT réutilisable
 * Peut être utilisé dans n'importe quel microservice
 */
class JWTAuthMiddleware {
  constructor(options = {}) {
    this.secret = options.secret || process.env.JWT_SECRET;
    this.algorithm = options.algorithm || "HS256";

    if (!this.secret) {
      throw new Error(
        "JWT_SECRET doit être défini dans les variables d'environnement"
      );
    }
  }

  /**
   * Middleware Express pour authentifier les requêtes
   */
  authenticate() {
    return async (req, res, next) => {
      try {
        // Extraire le token de l'en-tête Authorization
        const authHeader = req.headers["authorization"];

        if (!authHeader) {
          return res.status(401).json({
            success: false,
            error: {
              code: "MISSING_TOKEN",
              message: "Token d'authentification manquant",
            },
          });
        }

        // Format attendu: "Bearer <token>"
        const parts = authHeader.split(" ");
        if (parts.length !== 2 || parts[0] !== "Bearer") {
          return res.status(401).json({
            success: false,
            error: {
              code: "INVALID_TOKEN_FORMAT",
              message: 'Format de token invalide. Attendu: "Bearer <token>"',
            },
          });
        }

        const token = parts[1];

        // Vérifier et décoder le token
        const decoded = await verifyToken(token, this.secret, {
          algorithms: [this.algorithm],
        });

        // Attacher les informations utilisateur à la requête
        req.user = decoded;
        req.token = token;

        next();
      } catch (error) {
        if (error.name === "TokenExpiredError") {
          return res.status(401).json({
            success: false,
            error: {
              code: "TOKEN_EXPIRED",
              message: "Le token a expiré",
            },
          });
        }

        if (error.name === "JsonWebTokenError") {
          return res.status(403).json({
            success: false,
            error: {
              code: "INVALID_TOKEN",
              message: "Token invalide",
            },
          });
        }

        // Erreur inattendue
        console.error("Erreur d'authentification JWT:", error);
        return res.status(500).json({
          success: false,
          error: {
            code: "AUTH_ERROR",
            message: "Erreur lors de l'authentification",
          },
        });
      }
    };
  }

  /**
   * Middleware pour autoriser basé sur les rôles
   */
  authorize(roles) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentification requise",
          },
        });
      }

      const userRoles = req.user.roles || [];
      const hasRole = Array.isArray(roles)
        ? roles.some((role) => userRoles.includes(role))
        : userRoles.includes(roles);

      if (!hasRole) {
        return res.status(403).json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Permissions insuffisantes",
          },
        });
      }

      next();
    };
  }

  /**
   * Middleware pour autoriser basé sur les scopes OAuth2
   */
  requireScope(scopes) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentification requise",
          },
        });
      }

      const tokenScopes = req.user.scope ? req.user.scope.split(" ") : [];

      const requiredScopes = Array.isArray(scopes) ? scopes : [scopes];

      const hasScope = requiredScopes.every((scope) =>
        tokenScopes.includes(scope)
      );

      if (!hasScope) {
        return res.status(403).json({
          success: false,
          error: {
            code: "INSUFFICIENT_SCOPE",
            message: `Scopes requis: ${requiredScopes.join(", ")}`,
          },
        });
      }

      next();
    };
  }
}

module.exports = JWTAuthMiddleware;
```

### 5.2 Utilisation dans un Microservice

```javascript
// tour-catalog-service/src/routes/tours.js

const express = require("express");
const router = express.Router();
const JWTAuthMiddleware = require("@tourism-app/auth-middleware");

const tourController = require("../controllers/tourController");

// Créer une instance du middleware avec la configuration
const auth = new JWTAuthMiddleware({
  secret: process.env.JWT_SECRET,
});

// Routes publiques (sans authentification)
router.get("/public", tourController.getPublicTours);

// Routes protégées nécessitant une authentification
router.get("/", auth.authenticate(), tourController.getAllTours);
router.get("/:id", auth.authenticate(), tourController.getTourById);

// Routes nécessitant le rôle 'admin'
router.post(
  "/",
  auth.authenticate(),
  auth.authorize(["admin"]),
  tourController.createTour
);

router.put(
  "/:id",
  auth.authenticate(),
  auth.authorize(["admin"]),
  tourController.updateTour
);

router.delete(
  "/:id",
  auth.authenticate(),
  auth.authorize(["admin"]),
  tourController.deleteTour
);

// Route nécessitant un scope OAuth2 spécifique
router.get(
  "/:id/bookings",
  auth.authenticate(),
  auth.requireScope("read:bookings"),
  tourController.getTourBookings
);

module.exports = router;
```

---

## Exercices

### Exercice 1 : Conception de Revendications JWT

Pour notre application de réservation touristique, quelles revendications spécifiques incluriez-vous dans une charge utile JWT pour un utilisateur "client" régulier ? Listez au moins 5 revendications, incluant des revendications enregistrées et privées.

Quelles revendications supplémentaires la charge utile JWT d'un utilisateur "admin" nécessiterait-elle ?

Expliquez pourquoi chaque revendication choisie est pertinente pour les décisions d'authentification ou d'autorisation dans nos microservices.

Considérez un scénario où le Microservice de Gestion des Réservations doit savoir si un utilisateur peut annuler une réservation. Quelle revendication pourrait faciliter cette autorisation sans nécessiter une recherche en base de données à chaque requête ?

### Exercice 2 : Flux de Vérification JWT

Décrivez les étapes impliquées lorsque le Microservice Payment Gateway Integration reçoit une requête pour traiter un paiement, en supposant que la requête inclut un JWT. Concentrez-vous sur la façon dont le microservice valide le token et extrait les informations utilisateur.

Que se passe-t-il si la signature du JWT est invalide ? Quel code de statut HTTP devrait être retourné, et pourquoi ?

Que se passe-t-il si le JWT a expiré ? Quel code de statut HTTP devrait être retourné ?

### Exercice 3 : Identification de Scénario OAuth2

Imaginez que notre application de réservation touristique souhaite offrir une fonctionnalité où les utilisateurs peuvent importer leurs préférences de voyage depuis le programme de fidélité d'une compagnie aérienne partenaire. Les JWTs ou OAuth2 seraient-ils le mécanisme principal pour accéder de manière sécurisée à ces données externes ? Expliquez votre raisonnement et décrivez brièvement le flux.

Si notre application de réservation touristique s'associait avec un outil d'analyse tiers qui devait suivre les réservations des utilisateurs, et que cet outil voulait accéder à notre Microservice de Gestion des Réservations au nom de nos utilisateurs, comment OAuth2 faciliterait-il cela ? Identifiez les rôles (Resource Owner, Client, Authorization Server, Resource Server) dans ce scénario spécifique.

---

## Points Clés à Retenir

| Aspect                               | Recommandation                                                                                                 |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| **Authentification vs Autorisation** | Authentification = "Qui êtes-vous ?", Autorisation = "Que pouvez-vous faire ?"                                 |
| **JWT**                              | Format de token sans état, auto-contenu, idéal pour les microservices                                          |
| **OAuth2**                           | Protocole d'autorisation déléguée, peut utiliser JWT comme format de token                                     |
| **Vérification de Signature**        | Toujours vérifier la signature JWT avant de faire confiance aux revendications                                 |
| **Gestion de l'Expiration**          | Utiliser des temps d'expiration courts pour les access tokens, refresh tokens pour renouvellement              |
| **Révocation**                       | Les JWT sont difficiles à révoquer immédiatement - utiliser des temps d'expiration courts ou des listes noires |
| **Sécurité de la Clé Secrète**       | Garder la clé secrète JWT hautement sécurisée, jamais exposée côté client                                      |

---

## Prochaines Étapes et Directions d'Apprentissage Futures

Dans les leçons à venir, nous implémenterons un véritable Microservice d'Authentification en utilisant Node.js/Express, intégrant les concepts de génération et de vérification JWT que nous avons discutés. Nous explorerons également les pratiques de communication sécurisée entre microservices, incluant l'utilisation de Passerelles API et HTTPS, qui sont cruciales pour protéger les JWTs en transit et assurer la sécurité globale du système. Cette implémentation pratique solidifiera votre compréhension de la façon dont ces concepts théoriques se traduisent en code fonctionnel.

---

## Navigation

- **⬅️ Précédent** : [Leçon 4.3 - Gestion des Callbacks et Webhooks de Paiement](lecon-3-payment-webhooks.md)
- **➡️ Suivant** : [Leçon 4.5 - Mise en œuvre du Microservice d'Authentification des Utilisateurs](lecon-5-user-auth-microservice.md)
- **🏠 Retour** : [Sommaire du Module 4](README.md)

---

## Ressources

- [RFC 7519 - JSON Web Token (JWT)](https://tools.ietf.org/html/rfc7519)
- [RFC 6749 - OAuth 2.0 Authorization Framework](https://tools.ietf.org/html/rfc6749)
- [JWT.io - Décodeur et vérificateur JWT](https://jwt.io/)
- [OAuth 2.0 Simplified](https://oauth.net/2/)
- [Module 3 - Principes SOLID](../module-3/README.md)
