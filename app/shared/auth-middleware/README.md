# @booking-tourism-app/auth-middleware

Package partagé pour l'authentification JWT dans les microservices de l'application de réservation touristique.

## Installation

```bash
# Depuis le dossier d'un microservice
npm install ../shared/auth-middleware
```

## Utilisation

### Middleware d'authentification

```javascript
import { createAuthMiddleware } from "@booking-tourism-app/auth-middleware";

// Créer le middleware
const authenticate = createAuthMiddleware({
  secret: process.env.JWT_SECRET,
  optional: false, // true pour permettre les requêtes non authentifiées
});

// Protéger des routes
app.use("/api/protected", authenticate, protectedRoutes);
```

### Vérification de rôles

```javascript
import {
  createAuthMiddleware,
  requireRoles,
} from "@booking-tourism-app/auth-middleware";

const authenticate = createAuthMiddleware({ secret: process.env.JWT_SECRET });

// Route admin uniquement
app.get("/api/admin", authenticate, requireRoles("admin"), adminController);

// Route pour admin ou manager
app.get(
  "/api/reports",
  authenticate,
  requireRoles("admin", "manager"),
  reportsController
);
```

### Vérification de propriété

```javascript
import {
  createAuthMiddleware,
  requireOwnership,
} from "@booking-tourism-app/auth-middleware";

const authenticate = createAuthMiddleware({ secret: process.env.JWT_SECRET });

// L'utilisateur ne peut modifier que ses propres ressources
app.put(
  "/api/bookings/:id",
  authenticate,
  requireOwnership(async (req) => {
    const booking = await Booking.findByPk(req.params.id);
    return booking?.userId;
  }),
  updateBookingController
);
```

### Génération de tokens

```javascript
import {
  generateAccessToken,
  generateRefreshToken,
} from "@booking-tourism-app/auth-middleware";

// Après validation des credentials
const accessToken = generateAccessToken(
  { userId: user.id, email: user.email, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: "15m" }
);

const refreshToken = generateRefreshToken(
  { userId: user.id },
  process.env.JWT_REFRESH_SECRET,
  { expiresIn: "7d" }
);
```

### Vérification manuelle de tokens

```javascript
import {
  verifyToken,
  extractTokenFromHeader,
} from "@booking-tourism-app/auth-middleware";

// Extraire le token du header
const token = extractTokenFromHeader(req.headers.authorization);

// Vérifier le token
try {
  const payload = verifyToken(token, process.env.JWT_SECRET);
  console.log(payload); // { userId, email, role, iat, exp }
} catch (error) {
  if (error.name === "TokenExpiredError") {
    // Token expiré
  }
}
```

## API Reference

### JWT Utilities

| Fonction                                         | Description                                           |
| ------------------------------------------------ | ----------------------------------------------------- |
| `generateAccessToken(payload, secret, options)`  | Génère un token d'accès (défaut: 15min)               |
| `generateRefreshToken(payload, secret, options)` | Génère un token de rafraîchissement (défaut: 7 jours) |
| `verifyToken(token, secret)`                     | Vérifie et décode un token                            |
| `decodeToken(token)`                             | Décode sans vérification (inspection)                 |
| `extractTokenFromHeader(authHeader)`             | Extrait le token du header Bearer                     |

### Middlewares

| Middleware                            | Description                                        |
| ------------------------------------- | -------------------------------------------------- |
| `createAuthMiddleware(config)`        | Crée un middleware de validation JWT               |
| `requireRoles(...roles)`              | Vérifie que l'utilisateur a un des rôles autorisés |
| `requireOwnership(getResourceUserId)` | Vérifie que l'utilisateur possède la ressource     |

## Codes d'erreur

| Code                  | HTTP Status | Description                                  |
| --------------------- | ----------- | -------------------------------------------- |
| `AUTH_TOKEN_MISSING`  | 401         | Token non fourni                             |
| `AUTH_TOKEN_EXPIRED`  | 401         | Token expiré                                 |
| `AUTH_TOKEN_INVALID`  | 401         | Token invalide                               |
| `AUTH_REQUIRED`       | 401         | Authentification requise                     |
| `FORBIDDEN_ROLE`      | 403         | Rôle non autorisé                            |
| `FORBIDDEN_OWNERSHIP` | 403         | Ressource appartenant à un autre utilisateur |

## Variables d'environnement requises

```env
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_REFRESH_SECRET=another-secret-key-for-refresh-tokens
```
