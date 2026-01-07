# Solutions des Exercices - Leçon 4.6 Communication sécurisée entre microservices (passerelle API, HTTPS)

Ce document propose des solutions pour les exercices pratiques de la leçon sur la communication sécurisée entre microservices.

---

## Exercice 1 : Simulation API Gateway avec Authentification

### Structure du Projet

```
api-gateway-demo/
├── api-gateway/
│   ├── package.json
│   └── server.js
├── user-service/
│   ├── package.json
│   └── server.js
├── product-service/
│   ├── package.json
│   └── server.js
└── .env
```

### `api-gateway/server.js`

```javascript
require("dotenv").config({ path: "../.env" });
const express = require("express");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "demo-secret-key";
const USER_SERVICE_URL = "http://localhost:3001";
const PRODUCT_SERVICE_URL = "http://localhost:3002";

// ==================== MIDDLEWARE JWT ====================
const validateJWT = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: "Authorization header manquant",
    });
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({
      success: false,
      error: "Format de token invalide. Attendu: Bearer <token>",
    });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    console.log(`✓ JWT validé pour user: ${decoded.userId}`);
    next();
  } catch (err) {
    console.error("✗ Validation JWT échouée:", err.message);

    if (err.name === "TokenExpiredError") {
      return res.status(403).json({
        success: false,
        error: "Token expiré",
      });
    }

    return res.status(403).json({
      success: false,
      error: "Token invalide",
    });
  }
};

// ==================== ROUTES PUBLIQUES ====================
app.get("/health", (req, res) => {
  res.json({
    status: "API Gateway opérationnelle",
    timestamp: new Date().toISOString(),
  });
});

// Endpoint pour générer un token de test
app.post("/auth/test-token", (req, res) => {
  const { userId, role } = req.body;
  const token = jwt.sign(
    { userId: userId || "test-user", role: role || "client" },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
  res.json({ token });
});

// ==================== ROUTES PROTÉGÉES ====================

// Proxy vers User Service
app.get("/api/users", validateJWT, async (req, res) => {
  try {
    const response = await fetch(`${USER_SERVICE_URL}/users`, {
      headers: {
        "x-user-id": req.user.userId,
        "x-user-role": req.user.role,
      },
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Erreur proxy User Service:", error.message);
    res.status(503).json({ error: "User Service indisponible" });
  }
});

app.get("/api/users/:id", validateJWT, async (req, res) => {
  try {
    const response = await fetch(`${USER_SERVICE_URL}/users/${req.params.id}`, {
      headers: {
        "x-user-id": req.user.userId,
        "x-user-role": req.user.role,
      },
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(503).json({ error: "User Service indisponible" });
  }
});

// Proxy vers Product Service
app.get("/api/products", validateJWT, async (req, res) => {
  try {
    const response = await fetch(`${PRODUCT_SERVICE_URL}/products`, {
      headers: {
        "x-user-id": req.user.userId,
      },
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Erreur proxy Product Service:", error.message);
    res.status(503).json({ error: "Product Service indisponible" });
  }
});

const PORT = process.env.GATEWAY_PORT || 8080;
app.listen(PORT, () => {
  console.log(`\n🚀 API Gateway démarrée sur le port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   Routes protégées: /api/users, /api/products\n`);
});
```

### `user-service/server.js`

```javascript
const express = require("express");
const app = express();

// Données simulées
const users = [
  { id: "1", name: "Alice Martin", email: "alice@example.com" },
  { id: "2", name: "Bob Dupont", email: "bob@example.com" },
  { id: "3", name: "Claire Bernard", email: "claire@example.com" },
];

app.get("/users", (req, res) => {
  const requestingUser = req.headers["x-user-id"];
  console.log(`[UserService] GET /users - Requête de: ${requestingUser}`);
  res.json({ success: true, data: users });
});

app.get("/users/:id", (req, res) => {
  const user = users.find((u) => u.id === req.params.id);
  if (!user) {
    return res
      .status(404)
      .json({ success: false, error: "Utilisateur non trouvé" });
  }
  res.json({ success: true, data: user });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`👤 User Service démarré sur le port ${PORT}`);
});
```

### `product-service/server.js`

```javascript
const express = require("express");
const app = express();

// Données simulées
const products = [
  { id: "tour-1", name: "Visite de Paris", price: 89.99 },
  { id: "tour-2", name: "Château de Versailles", price: 129.99 },
  { id: "tour-3", name: "Mont Saint-Michel", price: 199.99 },
];

app.get("/products", (req, res) => {
  const requestingUser = req.headers["x-user-id"];
  console.log(`[ProductService] GET /products - Requête de: ${requestingUser}`);
  res.json({ success: true, data: products });
});

const PORT = 3002;
app.listen(PORT, () => {
  console.log(`📦 Product Service démarré sur le port ${PORT}`);
});
```

### Tests avec cURL

```bash
# 1. Démarrer les 3 services dans des terminaux séparés
cd user-service && node server.js
cd product-service && node server.js
cd api-gateway && node server.js

# 2. Test Health Check (public)
curl http://localhost:8080/health
# → {"status":"API Gateway opérationnelle","timestamp":"..."}

# 3. Test SANS token
curl http://localhost:8080/api/products
# → {"success":false,"error":"Authorization header manquant"} (401)

# 4. Générer un token de test
curl -X POST http://localhost:8080/auth/test-token \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-123", "role": "client"}'
# → {"token":"eyJhbGciOiJIUzI1NiIs..."}

# 5. Test AVEC token valide
TOKEN="eyJhbGciOiJIUzI1NiIs..."
curl http://localhost:8080/api/products \
  -H "Authorization: Bearer $TOKEN"
# → {"success":true,"data":[{"id":"tour-1",...}]}

# 6. Test avec token INVALIDE
curl http://localhost:8080/api/products \
  -H "Authorization: Bearer invalid-token-here"
# → {"success":false,"error":"Token invalide"} (403)
```

---

## Exercice 2 : Configuration HTTPS

### Étape 1 : Générer les Certificats

```bash
# Créer un dossier pour les certificats
mkdir certs && cd certs

# Générer une clé privée (2048 bits)
openssl genrsa -out private.key 2048

# Générer un certificat auto-signé (valide 365 jours)
openssl req -new -x509 -key private.key -out certificate.crt -days 365 \
  -subj "/C=FR/ST=IDF/L=Paris/O=TourismApp/OU=Dev/CN=localhost"

# Vérifier le certificat généré
openssl x509 -in certificate.crt -text -noout
```

### Étape 2 : Serveur HTTPS

```javascript
// https-service/server.js

const express = require("express");
const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");

const app = express();

// Charger les certificats
const certPath = path.join(__dirname, "../certs");
const credentials = {
  key: fs.readFileSync(path.join(certPath, "private.key"), "utf8"),
  cert: fs.readFileSync(path.join(certPath, "certificate.crt"), "utf8"),
};

app.get("/", (req, res) => {
  res.json({
    message: "🔒 Connexion sécurisée via HTTPS!",
    protocol: req.protocol,
    secure: req.secure,
  });
});

app.get("/api/secure-data", (req, res) => {
  res.json({
    secret: "Ces données sont transmises de manière sécurisée",
    timestamp: new Date().toISOString(),
  });
});

// Serveur HTTPS
const HTTPS_PORT = 3443;
https.createServer(credentials, app).listen(HTTPS_PORT, () => {
  console.log(`🔒 Serveur HTTPS démarré sur https://localhost:${HTTPS_PORT}`);
});

// Optionnel: Redirection HTTP → HTTPS
const HTTP_PORT = 3080;
http
  .createServer((req, res) => {
    res.writeHead(301, {
      Location: `https://localhost:${HTTPS_PORT}${req.url}`,
    });
    res.end();
  })
  .listen(HTTP_PORT, () => {
    console.log(`🔀 Redirection HTTP (${HTTP_PORT}) → HTTPS (${HTTPS_PORT})`);
  });
```

### Étape 3 : Tests

```bash
# Test HTTPS (avec certificat auto-signé, on doit ignorer la vérification)
curl -k https://localhost:3443/
# → {"message":"🔒 Connexion sécurisée via HTTPS!",...}

# Test redirection HTTP → HTTPS
curl -L http://localhost:3080/
# → Redirigé vers HTTPS

# Voir les détails du certificat
curl -v -k https://localhost:3443/ 2>&1 | grep -A5 "Server certificate"
```

### Observation dans le Navigateur

Quand vous accédez à `https://localhost:3443` :

1. **Chrome** affichera : "Votre connexion n'est pas privée" avec l'erreur `NET::ERR_CERT_AUTHORITY_INVALID`
2. Cliquez sur "Avancé" puis "Continuer vers localhost (non sécurisé)"
3. Une fois passé l'avertissement, la page s'affiche avec un cadenas barré (certificat non approuvé)

> **Pourquoi cet avertissement ?**
> Le certificat est auto-signé, donc non émis par une Autorité de Certification (CA) reconnue. Le navigateur ne peut pas vérifier l'authenticité du serveur. En production, utilisez un certificat d'une CA comme Let's Encrypt.

---

## Points Clés à Retenir

| Concept                     | Bonne Pratique                                                      |
| --------------------------- | ------------------------------------------------------------------- |
| **API Gateway**             | Point d'entrée unique, centralise authentification et rate limiting |
| **JWT Validation**          | Valider une fois au niveau Gateway, transmettre l'info via headers  |
| **Rate Limiting**           | Protéger contre DoS, configurer par IP et/ou par utilisateur        |
| **HTTPS**                   | Toujours en production, certificats CA reconnus                     |
| **Certificats auto-signés** | Développement uniquement, jamais en production                      |
| **mTLS**                    | Pour sécurité maximale inter-services, utiliser un Service Mesh     |
