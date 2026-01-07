# Leçon 4.5 - Mise en œuvre du Microservice d'Authentification des Utilisateurs

**Module 4** : Intégration et sécurité du traitement des paiements

---

## Objectifs pédagogiques

À la fin de cette leçon, vous serez capable de :

- ✅ Mettre en place un service Node.js dédié à l'authentification
- ✅ Sécuriser les mots de passe utilisateurs avec le hachage (bcrypt)
- ✅ Implémenter l'enregistrement et la connexion des utilisateurs
- ✅ Générer et gérer des JSON Web Tokens (JWT)
- ✅ Créer un middleware de validation de token pour protéger les autres microservices

## Prérequis

- Avoir complété la Leçon 4.4 sur les stratégies d'authentification
- Environnement Node.js et PostgreSQL installés
- Postman ou un outil similaire pour tester les API

## Durée estimée

2h00

---

## Introduction

L'authentification des utilisateurs est un composant critique pour toute application nécessitant une expérience personnalisée ou un accès à des ressources restreintes. Dans une architecture de microservices, l'authentification est souvent gérée par un service dédié afin d'assurer la réutilisabilité, la maintenabilité et la sécurité à travers l'ensemble du système. Cette leçon se concentre sur l'implémentation pratique de ce microservice pour notre application touristique.

---

## 1. Composants Clés d'un Microservice d'Authentification

Ce microservice est responsable de la vérification de l'identité des utilisateurs et de l'émission de tokens que les autres services utiliseront pour autoriser l'accès. Il comprend :

1.  **Enregistrement (Inscription)** : Création de nouveaux comptes.
2.  **Connexion (Login)** : Vérification des identifiants et émission de tokens.
3.  **Gestion des Tokens** : Génération, rafraîchissement et validation (JWT).

---

## 2. Enregistrement des Utilisateurs

L'enregistrement consiste à collecter des informations (email, mot de passe) et à les stocker de manière sécurisée.

### 2.1 Stockage Sécurisé des Mots de Passe

⚠️ **Règle d'or** : Les mots de passe ne doivent **jamais** être stockés en texte clair.

Nous devons utiliser une fonction de hachage cryptographique à sens unique. Des algorithmes comme **bcrypt** ou **scrypt** sont préférés à MD5 ou SHA-256 car ils sont conçus pour être lents (coût computationnel élevé), ce qui les rend résistants aux attaques par force brute. Ils utilisent également un **sel** (salt), une chaîne aléatoire ajoutée au mot de passe avant le hachage pour garantir l'unicité du hash même si deux utilisateurs ont le même mot de passe.

### 2.2 Schéma de Base de Données

Voici un exemple simple de table `users` pour PostgreSQL :

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- Stocke le mot de passe haché
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 2.3 Exemple d'Endpoint d'Enregistrement (Node.js/Express)

```javascript
const express = require("express");
const bcrypt = require("bcrypt"); // Pour le hachage
const { Pool } = require("pg"); // Client PostgreSQL
const app = express();

app.use(express.json());

// Pool de connexion (à configurer avec vos identifiants réels/variables d'env)
const pool = new Pool({
  user: "your_user",
  host: "localhost",
  database: "auth_db",
  password: "your_password",
  port: 5432,
});

// Endpoint d'inscription
app.post("/register", async (req, res) => {
  const { email, password } = req.body;

  // Validation des entrées
  if (!email || !password) {
    return res.status(400).json({ message: "Email et mot de passe requis." });
  }

  try {
    // Vérifier si l'utilisateur existe déjà
    const userExists = await pool.query(
      "SELECT 1 FROM users WHERE email = $1",
      [email]
    );
    if (userExists.rows.length > 0) {
      return res
        .status(409)
        .json({ message: "Un utilisateur avec cet email existe déjà." });
    }

    // Hacher le mot de passe
    // 10 est le nombre de tours de sel (cost factor)
    // Plus ce nombre est élevé, plus c'est lent et sécurisé
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insérer l'utilisateur en base
    await pool.query("INSERT INTO users (email, password) VALUES ($1, $2)", [
      email,
      hashedPassword,
    ]);

    res.status(201).json({ message: "Utilisateur enregistré avec succès." });
  } catch (error) {
    console.error("Erreur inscription:", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Auth service running on port ${PORT}`));
```

---

## 3. Connexion des Utilisateurs (Login)

La connexion implique de recevoir les identifiants, de vérifier le mot de passe par rapport au hash stocké, et d'émettre un token si la vérification réussit.

### 3.1 Vérification du Mot de Passe

Lors de la connexion, `bcrypt.compare` prend le mot de passe fourni, le hache avec le sel extrait du hash stocké, et compare les résultats. Cette fonction est conçue pour éviter les attaques temporelles (timing attacks).

### 3.2 Génération du Token (JWT)

Une fois authentifié, nous générons un **JSON Web Token**. Il est autonome (self-contained) et évite de devoir interroger la base de données à chaque requête ultérieure sur les autres microservices.

### 3.3 Exemple d'Endpoint de Connexion

```javascript
const jwt = require("jsonwebtoken"); // Pour générer le token

// Clé secrète (GARDER SECRÈTE dans les variables d'environnement .env !)
const JWT_SECRET = process.env.JWT_SECRET || "supersecretjwtkey";

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email et mot de passe requis." });
  }

  try {
    // Récupérer l'utilisateur
    const result = await pool.query(
      "SELECT id, email, password FROM users WHERE email = $1",
      [email]
    );
    const user = result.rows[0];

    if (!user) {
      // Note: Pour la sécurité, message générique pour ne pas révéler si l'email existe
      return res.status(401).json({ message: "Identifiants invalides." });
    }

    // Comparer le mot de passe fourni avec le hash stocké
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Identifiants invalides." });
    }

    // Générer le token JWT
    // Le payload inclut l'ID et l'email, mais JAMAIS le mot de passe
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: "1h" } // Expire dans 1 heure
    );

    res.status(200).json({ message: "Connexion réussie.", token });
  } catch (error) {
    console.error("Erreur login:", error);
    res.status(500).json({ message: "Erreur serveur." });
  }
});
```

---

## 4. Gestion des Tokens et Rafraîchissement

Les JWT ont une durée de vie limitée (`expiresIn`) pour des raisons de sécurité.

### 4.1 Access Tokens vs Refresh Tokens

| Type              | Durée de vie        | Usage                                           | Stockage recommandé           |
| ----------------- | ------------------- | ----------------------------------------------- | ----------------------------- |
| **Access Token**  | Courte (15min - 1h) | Accès aux ressources API                        | localStorage / sessionStorage |
| **Refresh Token** | Longue (7+ jours)   | Obtenir un nouvel Access Token sans reconnexion | Cookie `HTTP-Only`            |

### 4.2 Flux Conceptuel du Refresh Token

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FLUX REFRESH TOKEN                                        │
└─────────────────────────────────────────────────────────────────────────────┘

1. LOGIN
   ┌──────────┐                    ┌──────────────────────┐
   │  Client  │ ── credentials ──► │     Auth Service     │
   │ (React)  │                    │                      │
   └──────────┘◄── access_token ───│  + Génère refresh    │
                   + refresh_token │    (stocké en DB)    │
                                   └──────────────────────┘

2. UTILISATION NORMALE
   Access Token envoyé à chaque requête API
   → Tant que non expiré, accès accordé

3. EXPIRATION ACCESS TOKEN
   ┌──────────┐                    ┌──────────────────────┐
   │  Client  │ ── refresh_token ─► │     Auth Service     │
   │ (React)  │                    │                      │
   └──────────┘◄── new_access_token│  Vérifie en DB       │
                                   └──────────────────────┘

4. REFRESH TOKEN COMPROMIS/EXPIRÉ
   → L'utilisateur doit se reconnecter
```

> **Note** : Implémenter les refresh tokens ajoute de la complexité (table en base pour les stocker, mécanisme de révocation).

---

## 5. Validation du Token dans les Autres Microservices

L'Auth Service **émet** les tokens, mais ce sont les services consommateurs (Catalogue, Réservation) qui les **valident**.

### 5.1 Processus de Vérification JWT

Quand une requête arrive avec `Authorization: Bearer <token>` :

1.  **Présence** : Vérifier si le header existe.
2.  **Signature** : Vérifier la signature avec la même `JWT_SECRET`.
3.  **Expiration** : Vérifier si `exp` est dépassé.
4.  **Extraction** : Lire le payload (userId) pour savoir qui fait la requête.
5.  **Claims (optionnel)** : Vérifier `iss` (émetteur), `aud` (audience).

### 5.2 Exemple de Middleware de Validation

Ce code serait utilisé dans le service **Catalogue** ou **Réservation**.

```javascript
const jwt = require("jsonwebtoken");
// DOIT être identique à la clé du Auth Service
const JWT_SECRET = process.env.JWT_SECRET || "supersecretjwtkey";

const authenticateToken = (req, res, next) => {
  // Récupérer le header Authorization
  const authHeader = req.headers["authorization"];
  // Format attendu: "Bearer <TOKEN>"
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null) {
    return res
      .status(401)
      .json({ message: "Token d'authentification requis." });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error("Erreur vérification JWT:", err.message);
      // 403 Forbidden car le token est présent mais invalide/expiré
      return res.status(403).json({ message: "Token invalide ou expiré." });
    }

    // Attacher l'utilisateur décodé à la requête
    req.user = user;
    next();
  });
};

/* Utilisation dans une route :
app.get('/protected-route', authenticateToken, (req, res) => {
    res.json({ message: `Bienvenue, utilisateur ${req.user.email}!` });
});
*/

module.exports = authenticateToken;
```

---

## 6. Intégration dans l'Application de Réservation Touristique

Pour notre projet :

```
┌─────────────────────────────────────────────────────────────────────────────┐
│           ARCHITECTURE AUTH - APPLICATION RÉSERVATION TOURISTIQUE           │
└─────────────────────────────────────────────────────────────────────────────┘

                          ┌────────────────────┐
                          │   React Frontend   │
                          └─────────┬──────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
              ▼                     ▼                     ▼
    ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
    │   Auth Service  │   │ Catalog Service │   │ Booking Service │
    │   (Port 3001)   │   │   (Port 3002)   │   │   (Port 3003)   │
    │                 │   │                 │   │                 │
    │ POST /register  │   │ GET /tours      │   │ POST /bookings  │
    │ POST /login     │   │ (protégé)       │   │ (protégé)       │
    └─────────────────┘   └─────────────────┘   └─────────────────┘
              │                     ▲                     ▲
              │                     │                     │
              └─────────── JWT ─────┴─────────────────────┘
                       (partagé via JWT_SECRET commun)
```

- Le **Microservice Auth** expose :
  - `POST /register` : Création de compte
  - `POST /login` : Authentification et émission JWT
- Le **Frontend React** stocke le Token et l'envoie dans le header `Authorization`.
- Les autres services utilisent le middleware `authenticateToken` pour protéger leurs routes.

---

## 7. Cas d'Usage Réels

### Plateformes E-commerce à Grande Échelle

Un détaillant comme Amazon possède de nombreux services : catalogue produits, traitement des commandes, paiement, recommandations, support client. Un service d'authentification central gère les connexions une seule fois, émettant des tokens utilisés par tous les services internes. Chaque service valide le token indépendamment.

### Systèmes ERP d'Entreprise

Dans une grande entreprise, un système ERP intègre des modules RH, finance, inventaire. Une expérience SSO (Single Sign-On) alimentée par un microservice d'authentification permet aux employés de se connecter une fois et d'accéder ensuite à divers modules sans ressaisir leurs identifiants.

---

## Exercices et Pratique

### Exercice 1 : Configuration Complète du Service Auth

- Initialisez un nouveau projet Express.
- Installez `bcrypt`, `jsonwebtoken`, `pg`.
- Configurez la base de données PostgreSQL avec la table `users`.
- Implémentez les routes `/register` et `/login`.
- Testez avec Postman : Créez un utilisateur, connectez-vous, et récupérez le token.

### Exercice 2 : Protection d'une Route dans un Autre Service

- Dans le service Catalogue (ou une route séparée), implémentez le middleware `authenticateToken`.
- Créez une route `/profile` qui renvoie les infos de l'utilisateur connecté.
- Testez l'accès sans token, avec un token invalide, et avec un token valide.

### Exercice 3 : Exploration des Claims et Expiration

- Modifiez le endpoint `/login` pour ajouter `role: 'client'` dans le payload.
- Réduisez la durée de vie du token à 10 secondes.
- Connectez-vous, attendez 10s, et vérifiez que l'accès est refusé.
- Utilisez [jwt.io](https://jwt.io) pour inspecter votre token.

---

## Résumé

Cette leçon a démontré l'implémentation d'un Microservice d'Authentification, pierre angulaire des architectures microservices sécurisées. Nous avons couvert :

| Aspect                        | Ce que nous avons appris                            |
| ----------------------------- | --------------------------------------------------- |
| **Inscription sécurisée**     | Hachage des mots de passe avec bcrypt et sel        |
| **Connexion**                 | Vérification des credentials et génération JWT      |
| **Tokens**                    | Access tokens vs Refresh tokens, durée de vie       |
| **Validation inter-services** | Middleware `authenticateToken` réutilisable         |
| **Intégration**               | Frontend stocke le JWT, autres services le valident |

---

## Navigation

- **⬅️ Précédent** : [Leçon 4.4 - Stratégies d'Authentification (JWT, OAuth2)](lecon-4-auth-strategies.md)
- **➡️ Suivant** : [Leçon 4.6 - Communication Sécurisée entre Microservices](lecon-6-secure-communication.md)
- **🏠 Sommaire** : [Retour au README](README.md)

---

## Ressources

- [bcrypt npm package](https://www.npmjs.com/package/bcrypt)
- [jsonwebtoken npm package](https://www.npmjs.com/package/jsonwebtoken)
- [JWT.io - Debugger](https://jwt.io/)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
