# Solutions des Exercices - Leçon 4.5 Mise en œuvre du Microservice d'Authentification des Utilisateurs

## Exercice 1 : Configuration Complète du Service Auth

### Structure du Projet

```
auth-service/
├── package.json
├── .env
├── server.js
└── db/
    └── init.sql
```

### `package.json`

```json
{
  "name": "auth-microservice",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "bcrypt": "^5.1.0",
    "dotenv": "^16.0.3",
    "express": "^4.18.2",
    "jsonwebtoken": "^9.0.0",
    "pg": "^8.11.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.0"
  }
}
```

### `db/init.sql`

```sql
CREATE DATABASE auth_db;

\c auth_db

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'client',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### `.env`

```env
DATABASE_URL=postgresql://user:password@localhost:5432/auth_db
JWT_SECRET=votre_cle_secrete_tres_longue_et_complexe
PORT=3001
```

### `server.js` (Implémentation Complète)

```javascript
require("dotenv").config();
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

const app = express();
app.use(express.json());

// Configuration DB
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const JWT_SECRET = process.env.JWT_SECRET;
const SALT_ROUNDS = 10;

// ==================== REGISTER ====================
app.post("/auth/register", async (req, res) => {
  const { email, password } = req.body;

  // Validation
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email et mot de passe requis",
    });
  }

  // Validation email basique
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: "Format email invalide",
    });
  }

  // Validation mot de passe (min 8 caractères)
  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Le mot de passe doit contenir au moins 8 caractères",
    });
  }

  try {
    // Vérification existence
    const userCheck = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email.toLowerCase()]
    );

    if (userCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: "Un compte avec cet email existe déjà",
      });
    }

    // Hachage du mot de passe
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Insertion
    const newUser = await pool.query(
      "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email, created_at",
      [email.toLowerCase(), hashedPassword]
    );

    res.status(201).json({
      success: true,
      message: "Utilisateur créé avec succès",
      user: {
        id: newUser.rows[0].id,
        email: newUser.rows[0].email,
      },
    });
  } catch (err) {
    console.error("Erreur register:", err);
    res.status(500).json({
      success: false,
      message: "Erreur serveur lors de l'inscription",
    });
  }
});

// ==================== LOGIN ====================
app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email et mot de passe requis",
    });
  }

  try {
    // Recherche utilisateur
    const result = await pool.query(
      "SELECT id, email, password, role FROM users WHERE email = $1",
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      // Message générique pour la sécurité
      return res.status(401).json({
        success: false,
        message: "Identifiants incorrects",
      });
    }

    const user = result.rows[0];

    // Vérification mot de passe
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: "Identifiants incorrects",
      });
    }

    // Génération Token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      success: true,
      message: "Connexion réussie",
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Erreur login:", err);
    res.status(500).json({
      success: false,
      message: "Erreur serveur lors de la connexion",
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Auth Service running on port ${PORT}`));
```

### Tests Postman

**1. Register (succès)**

```
POST http://localhost:3001/auth/register
Body: { "email": "test@example.com", "password": "motdepasse123" }
→ 201 Created
```

**2. Register (email existant)**

```
POST http://localhost:3001/auth/register
Body: { "email": "test@example.com", "password": "autremotdepasse" }
→ 409 Conflict
```

**3. Login (succès)**

```
POST http://localhost:3001/auth/login
Body: { "email": "test@example.com", "password": "motdepasse123" }
→ 200 OK + token JWT
```

**4. Login (mauvais mot de passe)**

```
POST http://localhost:3001/auth/login
Body: { "email": "test@example.com", "password": "mauvais" }
→ 401 Unauthorized
```

---

## Exercice 2 : Middleware de Protection

### `middleware/authenticateToken.js`

```javascript
const jwt = require("jsonwebtoken");

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>

  if (token == null) {
    return res.status(401).json({
      success: false,
      message: "Token d'authentification requis",
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      const message =
        err.name === "TokenExpiredError" ? "Token expiré" : "Token invalide";

      return res.status(403).json({
        success: false,
        message,
      });
    }

    req.user = decoded; // Attache { userId, email, role, iat, exp }
    next();
  });
}

module.exports = authenticateToken;
```

### Route `/profile` protégée

```javascript
const authenticateToken = require("./middleware/authenticateToken");

// Route protégée - accessible uniquement avec un token valide
app.get("/profile", authenticateToken, async (req, res) => {
  try {
    // req.user contient le payload JWT décodé
    const result = await pool.query(
      "SELECT id, email, role, created_at FROM users WHERE id = $1",
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé",
      });
    }

    res.json({
      success: true,
      profile: result.rows[0],
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Erreur serveur",
    });
  }
});
```

### Tests

| Test            | Header Authorization    | Résultat attendu   |
| --------------- | ----------------------- | ------------------ |
| Sans header     | _(absent)_              | 401 Unauthorized   |
| Token mal formé | `Bearer xyz123`         | 403 Forbidden      |
| Token expiré    | `Bearer <token_expiré>` | 403 "Token expiré" |
| Token valide    | `Bearer <token_valide>` | 200 + données      |

---

## Exercice 3 : Claims et Expiration

### Modification du Login avec Claims additionnels

```javascript
const token = jwt.sign(
  {
    userId: user.id,
    email: user.email,
    role: "client", // Claim personnalisée
    permissions: ["read:tours", "create:booking"], // Autre exemple
    isAdmin: false,
  },
  JWT_SECRET,
  { expiresIn: "10s" } // Expiration très courte pour le test
);
```

### Observation de l'Expiration

1. **Connexion** → Récupérer le token
2. **Immédiatement** : `GET /profile` avec le token → 200 OK
3. **Attendre 15 secondes**
4. **Réessayer** : `GET /profile` avec le même token → 403 "Token expiré"

### Inspection sur JWT.io

Collez le token sur [jwt.io](https://jwt.io/). Vous verrez :

**Header:**

```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

**Payload:**

```json
{
  "userId": 1,
  "email": "test@example.com",
  "role": "client",
  "permissions": ["read:tours", "create:booking"],
  "isAdmin": false,
  "iat": 1704628800,
  "exp": 1704628810
}
```

> **Important** : Les données sont lisibles (Base64), mais toute modification invalide la signature. C'est pourquoi on ne met jamais de données sensibles dans le payload.

---

## Points Clés à Retenir

| Concept                   | Bonne Pratique                                                   |
| ------------------------- | ---------------------------------------------------------------- |
| **Stockage mot de passe** | Toujours hasher avec bcrypt (salt rounds >= 10)                  |
| **Messages d'erreur**     | Génériques pour login (ne pas révéler si l'email existe)         |
| **JWT_SECRET**            | Longue, complexe, stockée dans `.env`, jamais dans le code       |
| **Expiration**            | Courte pour access tokens (15min-1h), longue pour refresh tokens |
| **Validation**            | Chaque service vérifie le token indépendamment                   |
