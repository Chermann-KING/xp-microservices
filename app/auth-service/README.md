# Auth Service

Microservice d'authentification de l'application de réservation touristique.

## Fonctionnalités

- ✅ Inscription (register)
- ✅ Connexion (login)
- ✅ Déconnexion (logout)
- ✅ Rafraîchissement de tokens (refresh)
- ✅ Récupération de profil
- ✅ Vérification de token (inter-service)

## Démarrage rapide

### Prérequis

- Node.js 18+
- PostgreSQL 14+

### Installation

```bash
# Installer les dépendances
npm install

# Copier le fichier d'environnement
cp .env.example .env

# Créer la base de données PostgreSQL
createdb xp_travel_auth

# Démarrer le service
npm run dev
```

### Variables d'environnement

| Variable             | Description             | Défaut         |
| -------------------- | ----------------------- | -------------- |
| `PORT`               | Port du serveur         | 3005           |
| `DB_HOST`            | Hôte PostgreSQL         | localhost      |
| `DB_PORT`            | Port PostgreSQL         | 5432           |
| `DB_NAME`            | Nom de la base          | xp_travel_auth |
| `DB_USER`            | Utilisateur DB          | postgres       |
| `DB_PASSWORD`        | Mot de passe DB         | postgres       |
| `JWT_SECRET`         | Clé secrète JWT         | -              |
| `JWT_REFRESH_SECRET` | Clé pour refresh tokens | -              |
| `JWT_ACCESS_EXPIRY`  | Durée du token d'accès  | 15m            |
| `JWT_REFRESH_EXPIRY` | Durée du refresh token  | 7d             |
| `BCRYPT_ROUNDS`      | Rounds de hachage       | 12             |

## API Endpoints

### Routes publiques

| Méthode | Endpoint             | Description           |
| ------- | -------------------- | --------------------- |
| POST    | `/api/auth/register` | Inscription           |
| POST    | `/api/auth/login`    | Connexion             |
| POST    | `/api/auth/refresh`  | Rafraîchir les tokens |
| POST    | `/api/auth/verify`   | Vérifier un token     |

### Routes protégées

| Méthode | Endpoint            | Description        |
| ------- | ------------------- | ------------------ |
| POST    | `/api/auth/logout`  | Déconnexion        |
| GET     | `/api/auth/profile` | Profil utilisateur |

### Health Check

| Méthode | Endpoint        | Description             |
| ------- | --------------- | ----------------------- |
| GET     | `/health`       | État complet du service |
| GET     | `/health/live`  | Liveness probe          |
| GET     | `/health/ready` | Readiness probe         |

## Exemples d'utilisation

### Inscription

```bash
curl -X POST http://localhost:3005/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Password123",
    "firstName": "Jean",
    "lastName": "Dupont"
  }'
```

### Connexion

```bash
curl -X POST http://localhost:3005/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Password123"
  }'
```

### Récupérer le profil

```bash
curl http://localhost:3005/api/auth/profile \
  -H "Authorization: Bearer <access_token>"
```

### Rafraîchir le token

```bash
curl -X POST http://localhost:3005/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<refresh_token>"
  }'
```

## Architecture

```
auth-service/
├── server.js              # Point d'entrée
├── package.json
├── .env.example
└── src/
    ├── config/
    │   └── database.js    # Configuration Sequelize
    ├── controllers/
    │   └── authController.js
    ├── middleware/
    │   ├── errorHandler.js
    │   └── validate.js
    ├── models/
    │   ├── User.js
    │   └── index.js
    ├── repositories/
    │   └── userRepository.js
    ├── routes/
    │   ├── auth.routes.js
    │   └── health.routes.js
    ├── services/
    │   └── authService.js
    └── validators/
        └── authValidators.js
```

## Sécurité

- Mots de passe hachés avec bcrypt (12 rounds par défaut)
- Tokens JWT signés avec HS256
- Refresh token rotation (nouveau token à chaque refresh)
- Validation stricte des entrées avec Joi
- Headers de sécurité avec Helmet
