# 🚀 Démarrage Rapide - Backend Tourism App

Guide rapide pour démarrer le backend en 5 minutes.

## ⚡ Installation Express (3 étapes)

### 1️⃣ Installer les dépendances

```bash
cd C:\Users\cherm\Development\xp-microservices\app\backend
npm install
```

Cela va installer :
- Express.js, pg, dotenv, cors, helmet, morgan, joi, bcrypt, jsonwebtoken
- Nodemon, jest, supertest, eslint (dev)

### 2️⃣ Configurer l'environnement

Créez le fichier `.env` à partir de l'exemple :

```bash
cp .env.example .env
```

**Ouvrez `.env` et modifiez ces lignes** :

```env
DB_USER=tourism_user
DB_PASSWORD=VOTRE_MOT_DE_PASSE_ICI
DB_DATABASE=tourism_app_db
```

### 3️⃣ Configurer PostgreSQL

Ouvrez le terminal PostgreSQL :

```bash
psql -U postgres
```

Exécutez ces commandes SQL :

```sql
-- Créer utilisateur
CREATE USER tourism_user WITH PASSWORD 'votre_mot_de_passe';

-- Créer base de données
CREATE DATABASE tourism_app_db OWNER tourism_user;

-- Accorder privilèges (PostgreSQL 15+)
\c tourism_app_db
GRANT ALL ON SCHEMA public TO tourism_user;
GRANT CREATE ON SCHEMA public TO tourism_user;

-- Quitter
\q
```

## 🗄️ Initialiser la base de données

### Créer les tables

```bash
npm run db:migrate
```

✅ Vous devriez voir :
```
🚀 Démarrage des migrations de base de données...
✅ Table "tours" créée
✅ Table "users" créée
✅ Table "bookings" créée
✅ Table "reviews" créée
✅ Index créés
✅ Triggers créés
🎉 Migrations terminées avec succès!
```

### Insérer des données de test

```bash
npm run db:seed
```

✅ Vous devriez voir :
```
🌱 Démarrage du seeding...
👥 5 utilisateurs insérés
🗺️  8 visites insérées
📅 6 réservations insérées
⭐ 3 avis insérés
🎉 Seeding terminé avec succès!
```

## 🏃 Lancer le serveur

```bash
npm run dev
```

✅ Vous devriez voir :
```
🔌 Connexion à la base de données...
✓ Connexion à PostgreSQL établie avec succès

🚀 Serveur démarré avec succès!
📍 URL: http://localhost:3000
🌍 Environnement: development

📚 Documentation API:
   - Tours: http://localhost:3000/api/v1/tours
   - Bookings: http://localhost:3000/api/v1/bookings
   - Health: http://localhost:3000/health

✨ Prêt à accepter des requêtes!
```

## ✅ Tester l'API

### Dans votre navigateur

Ouvrez : http://localhost:3000

Vous devriez voir :
```json
{
  "message": "Bienvenue sur l'API Tourism Booking App",
  "version": "1.0.0",
  "module": "Module 1 - Fondements",
  "endpoints": {
    "health": "/health",
    "tours": "/api/v1/tours",
    "bookings": "/api/v1/bookings"
  }
}
```

### Avec curl

```bash
# Récupérer toutes les visites
curl http://localhost:3000/api/v1/tours

# Récupérer une visite spécifique
curl http://localhost:3000/api/v1/tours/1

# Créer une nouvelle visite
curl -X POST http://localhost:3000/api/v1/tours \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Tour",
    "description": "Description test",
    "destination": "Paris, France",
    "price": 99.99,
    "duration": "3 heures",
    "max_group_size": 10,
    "difficulty": "easy"
  }'
```

### Avec Postman ou Insomnia

Importez cette collection :

```json
{
  "name": "Tourism API",
  "requests": [
    {
      "name": "Get All Tours",
      "method": "GET",
      "url": "http://localhost:3000/api/v1/tours"
    },
    {
      "name": "Get Tour by ID",
      "method": "GET",
      "url": "http://localhost:3000/api/v1/tours/1"
    },
    {
      "name": "Create Tour",
      "method": "POST",
      "url": "http://localhost:3000/api/v1/tours",
      "headers": {
        "Content-Type": "application/json"
      },
      "body": {
        "name": "Test Tour",
        "description": "Description test",
        "destination": "Paris, France",
        "price": 99.99,
        "duration": "3 heures",
        "max_group_size": 10
      }
    }
  ]
}
```

## 🐛 Problèmes courants

### ❌ Erreur : "Cannot connect to database"

**Solution** : Vérifiez que PostgreSQL est en cours d'exécution

```bash
# Windows (dans Services)
# Cherchez "postgresql" et démarrez le service

# macOS (avec Homebrew)
brew services start postgresql@16

# Linux
sudo systemctl start postgresql
```

### ❌ Erreur : "role 'tourism_user' does not exist"

**Solution** : Recréez l'utilisateur PostgreSQL

```bash
psql -U postgres
CREATE USER tourism_user WITH PASSWORD 'votre_mot_de_passe';
```

### ❌ Erreur : "database 'tourism_app_db' does not exist"

**Solution** : Recréez la base de données

```bash
psql -U postgres
CREATE DATABASE tourism_app_db OWNER tourism_user;
```

### ❌ Erreur : "permission denied for schema public"

**Solution** : Accordez les privilèges (PostgreSQL 15+)

```bash
psql -U postgres -d tourism_app_db
GRANT ALL ON SCHEMA public TO tourism_user;
GRANT CREATE ON SCHEMA public TO tourism_user;
```

### ❌ Port 3000 déjà utilisé

**Solution** : Changez le port dans `.env`

```env
PORT=3001
```

## 📊 Données de test disponibles

### Utilisateurs

| Email | Mot de passe | Rôle |
|-------|--------------|------|
| admin@tourism.com | password123 | admin |
| marie.dupont@email.com | password123 | customer |

### Visites

- Visite Historique de Paris (89,99€)
- Trek d'Aventure dans les Alpes (1250€)
- Dégustation de Vin en Bourgogne (120€)
- Safari Photos en Provence (95€)
- Exploration Culinaire de Lyon (75€)
- + 3 autres...

### Réservations

6 réservations de test avec différents statuts (pending, confirmed, completed)

## 🎯 Prochaines étapes

1. ✅ Backend fonctionnel
2. 📚 Lire la documentation complète : [README.md](README.md)
3. 🧪 Tester tous les endpoints API
4. 📖 Consulter les exercices du Module 1 : `../../docs/module-1/exercices/`
5. 🚀 Passer au Module 2 : Microservices et Domain-Driven Design

## 🆘 Besoin d'aide ?

- 📖 [README complet](README.md) - Documentation détaillée
- 📚 [Leçons du Module 1](../../docs/module-1/) - Cours théoriques
- 💡 [Solutions exercices](../../docs/module-1/exercices/) - Exercices corrigés

---

**🎉 Félicitations ! Votre backend est opérationnel !**
