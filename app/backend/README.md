# Tourism Booking App - Backend API

Backend RESTful API pour l'application de réservation touristique, développé dans le cadre du **Module 1 : Fondements du Développement Web Moderne et des Microservices**.

## 🎯 Objectifs du projet

Cette application met en pratique les concepts suivants :

- Architecture RESTful avec Express.js
- Connexion à PostgreSQL avec le module `pg`
- Principes SOLID et séparation des préoccupations
- Gestion des erreurs et validation des données
- Structure modulaire préparant l'architecture microservices

## 🛠️ Stack technologique

- **Runtime** : Node.js 24.x LTS
- **Framework** : Express.js 4.21.x
- **Base de données** : PostgreSQL 18.x
- **Client PostgreSQL** : pg 8.13.x
- **Sécurité** : Helmet, bcrypt, CORS
- **Validation** : Joi
- **Logging** : Morgan
- **Dev tools** : Nodemon, ESLint, Jest

## 📁 Structure du projet

```
backend/
├── src/
│   ├── config/
│   │   └── db.js                 # Configuration PostgreSQL et pool de connexions
│   ├── routes/
│   │   ├── tours.routes.js       # Routes API pour les visites
│   │   └── bookings.routes.js    # Routes API pour les réservations
│   ├── database/
│   │   ├── migrate.js            # Script de migration de la BDD
│   │   └── seed.js               # Script de données de test
│   └── server.js                 # Serveur Express principal
├── tests/                        # Tests unitaires et d'intégration
├── .env.example                  # Exemple de configuration
├── .gitignore
├── package.json
└── README.md
```

## 🚀 Installation et configuration

### 1. Prérequis

- Node.js 24.x ou supérieur
- PostgreSQL 18.x installé et en cours d'exécution
- npm 11.x ou supérieur

### 2. Installation des dépendances

```bash
cd app/backend
npm install
```

### 3. Configuration de l'environnement

Copiez le fichier `.env.example` vers `.env` :

```bash
cp .env.example .env
```

Modifiez le fichier `.env` avec vos paramètres :

```env
# Configuration du serveur
NODE_ENV=development
PORT=3000

# Configuration de la base de données PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USER=tourism_user
DB_PASSWORD=votre_mot_de_passe_securise
DB_DATABASE=tourism_app_db

# Configuration JWT (pour authentification future)
JWT_SECRET=votre_cle_secrete_jwt
JWT_EXPIRES_IN=7d

# Configuration CORS
CORS_ORIGIN=http://localhost:5173
```

### 4. Configuration de PostgreSQL

#### Créer un utilisateur et une base de données

```bash
# Connectez-vous à PostgreSQL
psql -U postgres

# Dans le shell PostgreSQL
CREATE USER tourism_user WITH PASSWORD 'votre_mot_de_passe_securise';
CREATE DATABASE tourism_app_db OWNER tourism_user;

# Accorder les privilèges (PostgreSQL 15+)
\c tourism_app_db
GRANT ALL ON SCHEMA public TO tourism_user;
GRANT CREATE ON SCHEMA public TO tourism_user;

# Quitter
\q
```

### 5. Créer les tables (migration)

```bash
npm run db:migrate
```

Sortie attendue :

```
🚀 Démarrage des migrations de base de données...

📝 Création de la table "tours"...
✅ Table "tours" créée

📝 Création de la table "users"...
✅ Table "users" créée

📝 Création de la table "bookings"...
✅ Table "bookings" créée

📝 Création de la table "reviews"...
✅ Table "reviews" créée

📝 Création des index...
✅ Index créés

📝 Création de la fonction trigger pour updated_at...
✅ Triggers créés

🎉 Migrations terminées avec succès!
```

### 6. Insérer des données de test (optionnel)

```bash
npm run db:seed
```

Cela va insérer :

- 5 utilisateurs de test
- 8 visites touristiques
- 6 réservations
- 3 avis

### 7. Démarrer le serveur

**Mode développement** (avec auto-reload) :

```bash
npm run dev
```

**Mode production** :

```bash
npm start
```

Le serveur démarre sur `http://localhost:3000`

Sortie attendue :

```
🔌 Connexion à la base de données...
✓ Connexion à PostgreSQL établie avec succès
✓ Heure serveur DB: 2025-12-30 10:30:00

🚀 Serveur démarré avec succès!
📍 URL: http://localhost:3000
🌍 Environnement: development

📚 Documentation API:
   - Tours: http://localhost:3000/api/v1/tours
   - Bookings: http://localhost:3000/api/v1/bookings
   - Health: http://localhost:3000/health

✨ Prêt à accepter des requêtes!
```

## 📚 Documentation de l'API

### Endpoints disponibles

#### Health Check

```http
GET /health
```

Retourne l'état du serveur.

**Réponse** :

```json
{
  "status": "UP",
  "timestamp": "2025-12-30T10:30:00.000Z",
  "uptime": 123.456,
  "environment": "development"
}
```

---

### Tours (Visites touristiques)

#### Lister toutes les visites

```http
GET /api/v1/tours
```

**Query parameters** :

- `destination` (string) - Filtrer par destination
- `price_max` (number) - Prix maximum
- `price_min` (number) - Prix minimum
- `difficulty` (string) - Difficulté : `easy`, `moderate`, `hard`
- `sort` (string) - Tri : `name`, `price`, `destination`, `-name` (DESC)
- `limit` (number) - Nombre de résultats par page (défaut: 10)
- `page` (number) - Numéro de page (défaut: 1)

**Exemple** :

```bash
curl "http://localhost:3000/api/v1/tours?destination=Paris&price_max=500&sort=-price&limit=5"
```

**Réponse** :

```json
{
  "data": [
    {
      "id": 1,
      "name": "Visite Historique de Paris",
      "description": "Découvrez les monuments emblématiques...",
      "destination": "Paris, France",
      "price": 89.99,
      "duration": "4 heures",
      "max_group_size": 15,
      "difficulty": "easy",
      "image_url": "https://...",
      "available": true,
      "created_at": "2025-12-30T10:00:00.000Z",
      "updated_at": "2025-12-30T10:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 8,
    "count": 5,
    "per_page": 5,
    "current_page": 1,
    "total_pages": 2,
    "has_previous": false,
    "has_next": true
  },
  "filters": {
    "destination": "Paris",
    "price_max": "500"
  }
}
```

#### Récupérer une visite par ID

```http
GET /api/v1/tours/:id
```

**Exemple** :

```bash
curl http://localhost:3000/api/v1/tours/1
```

**Réponse** :

```json
{
  "id": 1,
  "name": "Visite Historique de Paris",
  "description": "Découvrez les monuments emblématiques de Paris...",
  "destination": "Paris, France",
  "price": 89.99,
  "duration": "4 heures",
  "max_group_size": 15,
  "difficulty": "easy",
  "image_url": "https://...",
  "available": true,
  "created_at": "2025-12-30T10:00:00.000Z",
  "updated_at": "2025-12-30T10:00:00.000Z"
}
```

#### Créer une nouvelle visite

```http
POST /api/v1/tours
Content-Type: application/json
```

**Body** :

```json
{
  "name": "Tour Gastronomique de Lyon",
  "description": "Découvrez la gastronomie lyonnaise...",
  "destination": "Lyon, France",
  "price": 75.0,
  "duration": "4 heures",
  "max_group_size": 12,
  "difficulty": "easy",
  "image_url": "https://..."
}
```

**Exemple** :

```bash
curl -X POST http://localhost:3000/api/v1/tours \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tour Gastronomique de Lyon",
    "description": "Découvrez la gastronomie lyonnaise",
    "destination": "Lyon, France",
    "price": 75.00,
    "duration": "4 heures",
    "max_group_size": 12,
    "difficulty": "easy"
  }'
```

**Réponse** (201 Created) :

```json
{
  "message": "Visite créée avec succès",
  "tour": {
    "id": 9,
    "name": "Tour Gastronomique de Lyon",
    "description": "Découvrez la gastronomie lyonnaise",
    "destination": "Lyon, France",
    "price": 75.0,
    "duration": "4 heures",
    "max_group_size": 12,
    "difficulty": "easy",
    "image_url": null,
    "available": true,
    "created_at": "2025-12-30T11:00:00.000Z",
    "updated_at": "2025-12-30T11:00:00.000Z"
  }
}
```

#### Mettre à jour une visite (partiel)

```http
PATCH /api/v1/tours/:id
Content-Type: application/json
```

**Body** :

```json
{
  "price": 85.0,
  "available": true
}
```

**Exemple** :

```bash
curl -X PATCH http://localhost:3000/api/v1/tours/1 \
  -H "Content-Type: application/json" \
  -d '{"price": 85.00}'
```

**Réponse** :

```json
{
  "message": "Visite mise à jour avec succès",
  "tour": {
    "id": 1,
    "name": "Visite Historique de Paris",
    "price": 85.00,
    "..."
  }
}
```

#### Supprimer une visite

```http
DELETE /api/v1/tours/:id
```

**Exemple** :

```bash
curl -X DELETE http://localhost:3000/api/v1/tours/9
```

**Réponse** (204 No Content) : (pas de body)

---

### Bookings (Réservations)

#### Lister toutes les réservations

```http
GET /api/v1/bookings
```

**Query parameters** :

- `user_id` (number) - Filtrer par utilisateur
- `tour_id` (number) - Filtrer par visite
- `status` (string) - Filtrer par statut : `pending`, `confirmed`, `cancelled`, `completed`
- `limit` (number) - Résultats par page (défaut: 20)
- `page` (number) - Numéro de page (défaut: 1)

**Exemple** :

```bash
curl "http://localhost:3000/api/v1/bookings?user_id=3&status=confirmed"
```

**Réponse** :

```json
{
  "data": [
    {
      "id": 1,
      "tour_id": 1,
      "user_id": 3,
      "booking_date": "2025-02-15",
      "number_of_travelers": 2,
      "total_price": 179.98,
      "status": "confirmed",
      "payment_status": "paid",
      "special_requests": null,
      "created_at": "2025-12-30T10:00:00.000Z",
      "updated_at": "2025-12-30T10:00:00.000Z",
      "tour_name": "Visite Historique de Paris",
      "destination": "Paris, France",
      "user_email": "marie.dupont@email.com",
      "first_name": "Marie",
      "last_name": "Dupont"
    }
  ],
  "pagination": {
    "total": 2,
    "count": 2,
    "per_page": 20,
    "current_page": 1,
    "total_pages": 1
  }
}
```

#### Récupérer une réservation par ID

```http
GET /api/v1/bookings/:id
```

**Exemple** :

```bash
curl http://localhost:3000/api/v1/bookings/1
```

**Réponse** :

```json
{
  "id": 1,
  "tour_id": 1,
  "user_id": 3,
  "booking_date": "2025-02-15",
  "number_of_travelers": 2,
  "total_price": 179.98,
  "status": "confirmed",
  "payment_status": "paid",
  "special_requests": null,
  "created_at": "2025-12-30T10:00:00.000Z",
  "updated_at": "2025-12-30T10:00:00.000Z",
  "tour_name": "Visite Historique de Paris",
  "tour_description": "Découvrez les monuments emblématiques...",
  "destination": "Paris, France",
  "duration": "4 heures",
  "user_email": "marie.dupont@email.com",
  "first_name": "Marie",
  "last_name": "Dupont",
  "phone": "+32612345678"
}
```

#### Créer une réservation

```http
POST /api/v1/bookings
Content-Type: application/json
```

**Body** :

```json
{
  "tour_id": 1,
  "user_id": 3,
  "booking_date": "2025-03-15",
  "number_of_travelers": 2,
  "special_requests": "Végétarien"
}
```

**Exemple** :

```bash
curl -X POST http://localhost:3000/api/v1/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "tour_id": 1,
    "user_id": 3,
    "booking_date": "2025-03-15",
    "number_of_travelers": 2
  }'
```

**Réponse** (201 Created) :

```json
{
  "message": "Réservation créée avec succès",
  "booking": {
    "id": 7,
    "tour_id": 1,
    "user_id": 3,
    "booking_date": "2025-03-15",
    "number_of_travelers": 2,
    "total_price": 179.98,
    "status": "pending",
    "payment_status": "pending",
    "special_requests": null,
    "created_at": "2025-12-30T11:30:00.000Z",
    "updated_at": "2025-12-30T11:30:00.000Z"
  }
}
```

#### Mettre à jour une réservation

```http
PATCH /api/v1/bookings/:id
Content-Type: application/json
```

**Body** :

```json
{
  "status": "confirmed",
  "payment_status": "paid"
}
```

**Exemple** :

```bash
curl -X PATCH http://localhost:3000/api/v1/bookings/7 \
  -H "Content-Type: application/json" \
  -d '{"status": "confirmed", "payment_status": "paid"}'
```

#### Annuler une réservation

```http
DELETE /api/v1/bookings/:id
```

**Exemple** :

```bash
curl -X DELETE http://localhost:3000/api/v1/bookings/7
```

**Réponse** :

```json
{
  "message": "Réservation annulée avec succès",
  "booking": {
    "id": 7,
    "status": "cancelled",
    "..."
  }
}
```

---

## 🧪 Tests

### Lancer les tests

```bash
npm test
```

### Tests en mode watch

```bash
npm run test:watch
```

---

## 📊 Schéma de la base de données

### Table : tours

| Colonne        | Type               | Description                       |
| -------------- | ------------------ | --------------------------------- |
| id             | SERIAL PRIMARY KEY | Identifiant unique                |
| name           | VARCHAR(255)       | Nom de la visite                  |
| description    | TEXT               | Description détaillée             |
| destination    | VARCHAR(255)       | Destination                       |
| price          | DECIMAL(10,2)      | Prix par personne                 |
| duration       | VARCHAR(100)       | Durée (ex: "4 heures")            |
| max_group_size | INTEGER            | Taille maximale du groupe         |
| difficulty     | VARCHAR(50)        | Difficulté : easy, moderate, hard |
| image_url      | VARCHAR(500)       | URL de l'image                    |
| available      | BOOLEAN            | Disponibilité                     |
| created_at     | TIMESTAMP          | Date de création                  |
| updated_at     | TIMESTAMP          | Date de modification              |

### Table : users

| Colonne       | Type                | Description                           |
| ------------- | ------------------- | ------------------------------------- |
| id            | SERIAL PRIMARY KEY  | Identifiant unique                    |
| email         | VARCHAR(255) UNIQUE | Email (unique)                        |
| password_hash | VARCHAR(255)        | Mot de passe hashé                    |
| first_name    | VARCHAR(100)        | Prénom                                |
| last_name     | VARCHAR(100)        | Nom                                   |
| phone         | VARCHAR(20)         | Téléphone                             |
| role          | VARCHAR(20)         | Rôle : customer, admin, tour_operator |
| created_at    | TIMESTAMP           | Date de création                      |
| updated_at    | TIMESTAMP           | Date de modification                  |

### Table : bookings

| Colonne             | Type               | Description                                       |
| ------------------- | ------------------ | ------------------------------------------------- |
| id                  | SERIAL PRIMARY KEY | Identifiant unique                                |
| tour_id             | INTEGER FK         | Référence à tours(id)                             |
| user_id             | INTEGER FK         | Référence à users(id)                             |
| booking_date        | DATE               | Date de la visite                                 |
| number_of_travelers | INTEGER            | Nombre de voyageurs                               |
| total_price         | DECIMAL(10,2)      | Prix total                                        |
| status              | VARCHAR(50)        | Statut : pending, confirmed, cancelled, completed |
| payment_status      | VARCHAR(50)        | Paiement : pending, paid, refunded, failed        |
| special_requests    | TEXT               | Demandes spéciales                                |
| created_at          | TIMESTAMP          | Date de création                                  |
| updated_at          | TIMESTAMP          | Date de modification                              |

### Table : reviews

| Colonne    | Type               | Description              |
| ---------- | ------------------ | ------------------------ |
| id         | SERIAL PRIMARY KEY | Identifiant unique       |
| tour_id    | INTEGER FK         | Référence à tours(id)    |
| user_id    | INTEGER FK         | Référence à users(id)    |
| booking_id | INTEGER FK         | Référence à bookings(id) |
| rating     | INTEGER            | Note (1-5)               |
| title      | VARCHAR(255)       | Titre de l'avis          |
| comment    | TEXT               | Commentaire              |
| created_at | TIMESTAMP          | Date de création         |
| updated_at | TIMESTAMP          | Date de modification     |

**Contrainte** : UNIQUE(user_id, tour_id) - Un utilisateur ne peut laisser qu'un seul avis par visite.

---

## 🔒 Sécurité

- **Helmet** : Protection contre les vulnérabilités web courantes
- **CORS** : Configuration stricte des origines autorisées
- **Bcrypt** : Hashage sécurisé des mots de passe (10 rounds)
- **Requêtes paramétrées** : Protection contre les injections SQL
- **Validation des entrées** : Validation côté serveur de toutes les données

---

## 🚧 Limitations actuelles et améliorations futures

### Limitations (Module 1)

- Pas d'authentification JWT (sera ajouté dans Module 2)
- Pas de tests automatisés (sera ajouté dans Module 3)
- Pas de gestion des fichiers/images (sera ajouté dans Module 4)
- Pas de cache Redis (sera ajouté dans Module 5)
- Architecture monolithique (migration vers microservices dans Module 6-7)

### Améliorations prévues

- [ ] Authentification JWT et autorisation basée sur les rôles
- [ ] Tests unitaires et d'intégration avec Jest
- [ ] Upload et gestion des images de visites
- [ ] Système de cache avec Redis
- [ ] Rate limiting pour prévenir les abus
- [ ] Logging avancé avec Winston
- [ ] Documentation Swagger/OpenAPI
- [ ] Migration vers architecture microservices

---

## 📖 Ressources et références

- [Documentation Express.js](https://expressjs.com/)
- [Documentation PostgreSQL](https://www.postgresql.org/docs/16/)
- [Documentation pg (node-postgres)](https://node-postgres.com/)
- [REST API Best Practices](https://restfulapi.net/)
- [Leçons du Module 1](../../docs/module-1/)

---

## 👥 Utilisateurs de test

Après avoir exécuté `npm run db:seed`, vous pouvez utiliser ces comptes :

| Email                    | Mot de passe | Rôle          |
| ------------------------ | ------------ | ------------- |
| admin@tourism.com        | password123  | admin         |
| operator@tourism.com     | password123  | tour_operator |
| marie.dupont@email.com   | password123  | customer      |
| jean.martin@email.com    | password123  | customer      |
| sophie.bernard@email.com | password123  | customer      |

---

## 📝 Licence

MIT

---

**🎓 Projet éducatif - Module 1 complété avec succès !**
