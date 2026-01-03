# Leçon 1.3 - Configuration d'un environnement de développement Fullstack

**Module 1** : Fondements du Développement Web Moderne et des Microservices

---

## Objectifs pédagogiques

- Installer et configurer Node.js avec un gestionnaire de versions (nvm)
- Comprendre le rôle de npm dans la gestion des dépendances
- Installer et configurer PostgreSQL pour la persistance des données
- Mettre en place Express.js pour créer des APIs web
- Préparer un environnement de développement complet et fonctionnel

## Prérequis

- [Leçon 1.1 : Introduction à l'étude de cas](lecon-1-introduction-etude-de-cas.md)
- [Leçon 1.2 : Fondamentaux de React](lecon-2-react-fundamentals.md)
- Accès administrateur sur votre machine pour l'installation de logiciels
- Familiarité de base avec le terminal/ligne de commande

## Durée estimée

2 heures

---

## Introduction

Le développement d'une application fullstack basée sur les microservices nécessite un environnement robuste et cohérent. Cette leçon se concentre sur la configuration des outils essentiels : **Node.js** pour la logique côté serveur, **Express.js** pour la construction d'APIs web, et **PostgreSQL** pour la gestion de base de données.

L'établissement correct de ces composants fondamentaux garantit un flux de travail de développement fluide pour les modules suivants, où nous construirons les microservices de l'application de réservation touristique.

---

## Installation de Node.js et npm

### Qu'est-ce que Node.js ?

**Node.js** est un environnement d'exécution JavaScript construit sur le moteur V8 de Chrome. Il permet aux développeurs d'exécuter du code JavaScript en dehors d'un navigateur web, le rendant adapté au développement côté serveur.

**npm** (Node Package Manager) est le gestionnaire de paquets par défaut pour Node.js, utilisé pour installer, partager et gérer les dépendances de projet.

---

### Étapes d'installation de Node.js

La méthode recommandée pour installer Node.js est d'utiliser un gestionnaire de versions comme **nvm** (Node Version Manager) pour macOS/Linux ou **nvm-windows** pour Windows. Cela permet de basculer facilement entre différentes versions de Node.js, ce qui est bénéfique lors du travail sur plusieurs projets avec des exigences variées.

---

#### Pour macOS/Linux (utilisant nvm)

**1. Installer nvm**

Ouvrez votre terminal et exécutez la commande suivante. Ce script clone le dépôt nvm dans `~/.nvm` et ajoute les lignes nécessaires à votre profil shell (`~/.bash_profile`, `~/.zshrc`, `~/.profile`, ou `~/.bashrc`).

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
```

> **Note** : La version `v0.40.1` est la dernière version stable au moment de la rédaction (Décembre 2025). Vérifiez toujours la [page des releases nvm](https://github.com/nvm-sh/nvm/releases) pour la version la plus récente.

Après l'installation, fermez et rouvrez votre terminal, ou sourcez votre profil shell :

```bash
source ~/.zshrc  # ou ~/.bashrc selon votre shell
```

**2. Vérifier l'installation de nvm**

```bash
nvm --version
```

**3. Installer Node.js**

Installez la dernière version LTS (Long Term Support) de Node.js :

```bash
nvm install --lts
```

> **Versions actuelles** : Au moment de la rédaction, la version LTS est **Node.js 22.x**. La version LTS est recommandée pour les environnements de production en raison de sa stabilité et de son support étendu.

**4. Définir la version Node.js par défaut**

```bash
nvm alias default node
```

Cette commande définit la version LTS installée comme version par défaut pour les nouvelles sessions shell.

**5. Vérifier Node.js et npm**

```bash
node -v   # Devrait afficher v22.x.x
npm -v    # Devrait afficher 10.x.x
```

---

#### Pour Windows (utilisant nvm-windows)

**1. Télécharger l'installateur nvm-windows**

Accédez à la [page des releases nvm-windows](https://github.com/coreybutler/nvm-windows/releases) et téléchargez le fichier `nvm-setup.exe`.

> **Version actuelle** : `nvm-windows 1.2.2` (Décembre 2025)

**2. Exécuter l'installateur**

- Extrayez le fichier zip et exécutez `nvm-setup.exe`
- Suivez les instructions, en sélectionnant des répertoires d'installation appropriés

**3. Ouvrir une nouvelle invite de commande/PowerShell**

Après l'installation, fermez et rouvrez votre invite de commande ou PowerShell pour vous assurer que nvm est dans votre PATH.

**4. Vérifier l'installation de nvm**

```bash
nvm --version
```

**5. Installer Node.js**

```bash
nvm install lts
```

**6. Utiliser la version Node.js**

```bash
nvm use lts
```

**7. Vérifier Node.js et npm**

```bash
node -v
npm -v
```

---

## Initialisation d'un projet Node.js avec Express

### Qu'est-ce qu'Express.js ?

**Express.js** est un framework d'application web Node.js minimaliste et flexible qui fournit un ensemble robuste de fonctionnalités pour les applications web et mobiles. Il simplifie le processus de construction d'APIs et de serveurs web robustes.

---

### Étapes de configuration du projet

**1. Créer un répertoire de projet**

Créez un nouveau dossier pour votre application :

```bash
mkdir tourism-app-backend
cd tourism-app-backend
```

**2. Initialiser le projet npm**

Cette commande crée un fichier `package.json` qui gère les métadonnées et les dépendances du projet :

```bash
npm init -y
```

Le flag `-y` répond "oui" à toutes les invites, créant un `package.json` par défaut. Vous pouvez modifier ce fichier ultérieurement.

**3. Installer Express**

```bash
npm install express
```

> **Version actuelle** : Express 5.1.x (Décembre 2025)

Cette commande installe le package Express et l'ajoute à la section `dependencies` de votre `package.json`.

---

### Exemple de serveur Express de base

Créez un fichier nommé `server.js` (ou `index.js`) dans votre répertoire `tourism-app-backend` et ajoutez le code suivant :

```javascript
// server.js
// Importer le module express
const express = require("express");

// Créer une instance d'application Express
const app = express();

// Définir le numéro de port sur lequel le serveur écoutera
// Utiliser la variable d'environnement PORT si disponible, sinon par défaut 3000
const PORT = process.env.PORT || 3000;

// Middleware pour parser les corps de requête JSON
// Ceci est essentiel pour gérer les données entrantes des applications clientes,
// en particulier pour les endpoints API qui reçoivent des données via POST, PUT ou PATCH.
app.use(express.json());

// Définir une route GET simple pour l'URL racine
// Lorsqu'une requête GET est effectuée vers '/', cette fonction de rappel sera exécutée.
app.get("/", (req, res) => {
  // Envoyer une réponse JSON indiquant une connexion réussie
  res.json({
    message: "Bienvenue sur le Backend de l'Application de Tourisme!",
  });
});

// Définir une route GET pour un endpoint spécifique, par exemple '/api/tours'
// Ceci démontre une structure typique d'endpoint API.
app.get("/api/tours", (req, res) => {
  // Dans une application réelle, ceci récupérerait les données de tours depuis une base de données.
  const tours = [
    {
      id: 1,
      name: "Visite Historique de la Ville",
      duration: "3 heures",
      price: 50,
    },
    {
      id: 2,
      name: "Aventure Randonnée en Montagne",
      duration: "Journée complète",
      price: 120,
    },
  ];
  // Envoyer le tableau d'objets tour comme réponse JSON.
  res.json(tours);
});

// Démarrer le serveur et écouter les requêtes entrantes sur le port spécifié
app.listen(PORT, () => {
  // Afficher un message dans la console une fois que le serveur démarre avec succès
  console.log(`Serveur en cours d'exécution sur http://localhost:${PORT}`);
});
```

**Pour exécuter ce serveur :**

```bash
node server.js
```

Ouvrez votre navigateur web ou un outil comme Postman/Insomnia et naviguez vers `http://localhost:3000`. Vous devriez voir la réponse JSON `{"message":"Bienvenue sur le Backend de l'Application de Tourisme!"}`.

Naviguez vers `http://localhost:3000/api/tours` pour voir les données des tours.

---

## Installation et configuration de PostgreSQL

### Qu'est-ce que PostgreSQL ?

**PostgreSQL** est un système de base de données relationnelle-objet open-source puissant, connu pour sa fiabilité, sa robustesse de fonctionnalités et ses performances. C'est un excellent choix pour les microservices grâce à son fort support des données structurées et des requêtes complexes.

---

### Étapes d'installation de PostgreSQL

#### Pour macOS (utilisant Homebrew)

**1. Installer Homebrew (si pas déjà installé)**

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

**2. Installer PostgreSQL**

```bash
brew install postgresql@16
```

> **Version actuelle** : PostgreSQL 18.x (Décembre 2025)

**3. Démarrer le service PostgreSQL**

```bash
brew services start postgresql@18
```

**4. Vérifier l'installation de PostgreSQL**

```bash
psql --version
```

---

#### Pour Windows (utilisant l'installateur officiel)

**1. Télécharger l'installateur**

Accédez à la [page de téléchargements PostgreSQL officielle](https://www.postgresql.org/download/windows/) et téléchargez l'installateur interactif d'EnterpriseDB. Choisissez la dernière version stable (**PostgreSQL 18.x**).

**2. Exécuter l'installateur**

- Exécutez le fichier `.exe` téléchargé
- Suivez les instructions, en sélectionnant les composants dont vous avez besoin :
  - PostgreSQL Server
  - pgAdmin 4
  - Stack Builder
  - Command Line Tools

**3. Configuration**

- Définissez un mot de passe pour le superutilisateur `postgres` par défaut. **Retenez ce mot de passe**.
- Choisissez le port par défaut (`5432`)
- Sélectionnez la locale par défaut

**4. Vérifier l'installation**

Ouvrez le SQL Shell (psql) depuis votre menu Démarrer :

```
Server: localhost
Database: postgres
Port: 5432
Username: postgres
```

Entrez le mot de passe que vous avez défini lors de l'installation. Une fois connecté, tapez `\q` et appuyez sur Entrée pour quitter.

---

#### Pour Linux (Debian/Ubuntu)

**1. Mettre à jour les listes de paquets**

```bash
sudo apt update
```

**2. Installer PostgreSQL et le package contrib**

```bash
sudo apt install postgresql-18 postgresql-contrib-18
```

Le package `postgresql-contrib` fournit des utilitaires et fonctionnalités supplémentaires.

**3. Vérifier le statut du service PostgreSQL**

```bash
sudo systemctl status postgresql
```

Il devrait afficher "active (exited)".

**4. Définir un mot de passe pour l'utilisateur postgres**

Par défaut, l'utilisateur `postgres` dans PostgreSQL a une méthode d'authentification peer, ce qui signifie qu'il ne peut être accédé que par l'utilisateur système `postgres`. Pour activer la connexion basée sur un mot de passe pour le développement, vous devez définir un mot de passe.

```bash
sudo -i -u postgres
psql
\password postgres
```

Entrez un mot de passe fort lorsque vous y êtes invité. Puis tapez `\q` pour quitter psql et `exit` pour revenir à votre utilisateur normal.

**5. Modifier pg_hba.conf (Optionnel)**

Pour le développement local, les paramètres par défaut fonctionnent généralement. Si vous rencontrez des problèmes d'authentification, vous devrez peut-être ajuster le fichier `pg_hba.conf`.

```bash
sudo nano /etc/postgresql/18/main/pg_hba.conf
```

Localisez les lignes pour les connexions locales IPv4 et IPv6 et changez `peer` ou `ident` en `md5` ou `scram-sha-256` pour les entrées host si vous voulez une authentification par mot de passe sur les connexions réseau.

Exemple :

```
host    all             all             127.0.0.1/32            scram-sha-256
```

Après les modifications, redémarrez PostgreSQL :

```bash
sudo systemctl restart postgresql
```

---

### Création d'une base de données et d'un utilisateur pour l'application de tourisme

C'est une bonne pratique de créer une base de données dédiée et un rôle non-superutilisateur pour votre application.

**1. Accéder au terminal PostgreSQL (psql)**

```bash
psql -U postgres
```

Entrez votre mot de passe superutilisateur postgres lorsque demandé.

**2. Créer une nouvelle base de données**

```sql
CREATE DATABASE tourism_app_db;
```

**3. Créer un nouvel utilisateur (rôle)**

```sql
CREATE USER tourism_user WITH ENCRYPTED PASSWORD 'your_secure_password';
```

Remplacez `'your_secure_password'` par un mot de passe fort.

**4. Accorder les privilèges à l'utilisateur sur la base de données**

```sql
GRANT ALL PRIVILEGES ON DATABASE tourism_app_db TO tourism_user;
```

**5. Connexion à la nouvelle base de données et accorder les privilèges sur le schéma (PostgreSQL 15+)**

```sql
\c tourism_app_db
GRANT ALL ON SCHEMA public TO tourism_user;
GRANT CREATE ON SCHEMA public TO tourism_user;
```

> **Important** : À partir de PostgreSQL 15, les privilèges sur le schéma `public` ont changé. Ces commandes supplémentaires sont nécessaires.

**6. Quitter psql**

```sql
\q
```

Vous avez maintenant une base de données dédiée et un utilisateur pour votre application, améliorant la sécurité et l'organisation.

---

## Connexion de Node.js avec PostgreSQL

Pour connecter notre application Node.js Express à PostgreSQL, nous utiliserons une bibliothèque client PostgreSQL. **pg** est le client PostgreSQL JavaScript pur le plus populaire pour Node.js.

### Installation du client PostgreSQL

**1. Installer le package pg**

Dans votre répertoire de projet `tourism-app-backend` :

```bash
npm install pg
```

> **Version actuelle** : pg 8.16.x (Décembre 2025)

**2. Installer dotenv pour les variables d'environnement**

Il est crucial de gérer les informations sensibles comme les identifiants de base de données en utilisant des variables d'environnement, et non en les codant directement dans votre code d'application.

```bash
npm install dotenv
```

---

### Configuration de la connexion à la base de données

**1. Créer un fichier `.env`**

Créez un fichier `.env` à la racine de votre projet `tourism-app-backend` :

```env
# .env file
DB_USER=tourism_user
DB_PASSWORD=your_secure_password
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=tourism_app_db
```

Remplacez `your_secure_password` par le mot de passe que vous avez défini pour `tourism_user`.

**2. Ajouter `.env` au `.gitignore`**

Créez un fichier `.gitignore` à la racine de votre projet et ajoutez :

```
node_modules/
.env
```

Cela empêche de commettre des informations sensibles dans votre dépôt Git.

---

### Modification du serveur pour se connecter à PostgreSQL

Modifiez votre fichier `server.js` pour vous connecter à PostgreSQL :

```javascript
// server.js
// Charger les variables d'environnement depuis le fichier .env
require("dotenv").config();

const express = require("express");
const { Pool } = require("pg"); // Importer Pool depuis le module pg

const app = express();
const PORT = process.env.PORT || 3000;

// Configurer le pool de connexion PostgreSQL en utilisant les variables d'environnement
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Tester la connexion à la base de données
// Cela garantit que l'application peut se connecter avec succès au serveur PostgreSQL
pool
  .connect()
  .then((client) => {
    console.log("Connecté à la base de données PostgreSQL!");
    client.release(); // Libérer le client dans le pool immédiatement après le test de connexion
  })
  .catch((err) => {
    console.error(
      "Erreur de connexion à la base de données PostgreSQL:",
      err.message
    );
    // Quitter le processus si impossible de se connecter à la base de données pour éviter d'autres problèmes
    process.exit(1);
  });

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Bienvenue sur le Backend de l'Application de Tourisme!",
  });
});

// Route exemple pour récupérer les tours depuis la base de données
app.get("/api/tours", async (req, res) => {
  try {
    // Acquérir un client depuis le pool de connexion
    const client = await pool.connect();
    // Exécuter une requête SQL pour sélectionner tous les tours
    const result = await client.query(
      "SELECT id, name, description, price FROM tours"
    );
    client.release(); // Libérer le client dans le pool

    // Envoyer les résultats de la requête comme réponse JSON
    res.json(result.rows);
  } catch (err) {
    console.error("Erreur lors de la récupération des tours:", err.message);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`Serveur en cours d'exécution sur http://localhost:${PORT}`);
});
```

---

### Création d'une table d'exemple

Avant d'exécuter le serveur, nous devons créer une table `tours` dans notre base de données `tourism_app_db`.

**1. Se connecter à la base de données avec l'utilisateur tourism_user**

```bash
psql -U tourism_user -d tourism_app_db -h localhost -p 5432
```

Entrez `your_secure_password` lorsque demandé.

**2. Créer la table tours et insérer des données d'exemple**

```sql
CREATE TABLE tours (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    duration VARCHAR(100),
    max_group_size INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO tours (name, description, price, duration, max_group_size) VALUES
('Promenade Historique de la Ville', 'Explorez l''histoire ancienne et les monuments de la ville.', 45.00, '3 heures', 15),
('Aventure Safari dans le Désert', 'Un voyage passionnant hors route à travers les dunes du désert avec un dîner BBQ.', 99.50, '6 heures', 8),
('Randonnée au Sommet de la Montagne', 'Défiez-vous avec une randonnée guidée vers le plus haut sommet, offrant des vues à couper le souffle.', 75.00, 'Journée complète', 10);
```

**3. Vérifier les données insérées**

```sql
SELECT * FROM tours;
```

**4. Quitter psql**

```sql
\q
```

---

### Tester la connexion

Maintenant, exécutez à nouveau votre serveur Node.js :

```bash
node server.js
```

Vous devriez voir dans votre console :

```
Connecté à la base de données PostgreSQL!
Serveur en cours d'exécution sur http://localhost:3000
```

Accédez à `http://localhost:3000/api/tours` dans votre navigateur, et vous verrez maintenant les données de tours récupérées directement depuis votre base de données PostgreSQL.

---

## Exercices et activités pratiques

### Exercice 1 : Ajouter un nouvel endpoint API

Dans votre `server.js`, créez un nouvel endpoint `POST /api/tours`.

**Exigences :**

- Cet endpoint doit accepter des données JSON dans le corps de la requête
  - Exemple : `{"name": "Nouveau Tour", "description": "...", "price": 100, "duration": "2 heures", "max_group_size": 12}`
- Il doit insérer les données de tour reçues dans la table `tours` de votre base de données PostgreSQL
- Après insertion réussie, répondez avec les détails du tour nouvellement créé (incluant l'`id` généré) et un statut `201 Created`
- En cas d'erreur, renvoyez un statut `400 Bad Request` avec un message d'erreur approprié

**Indice :** Utilisez une requête paramétrée pour éviter les injections SQL :

```javascript
const query =
  "INSERT INTO tours (name, description, price, duration, max_group_size) VALUES ($1, $2, $3, $4, $5) RETURNING *";
const values = [name, description, price, duration, max_group_size];
const result = await client.query(query, values);
```

---

### Exercice 2 : Implémenter un endpoint GET /api/tours/:id

Créez une nouvelle route GET qui récupère un seul tour par son `id`.

**Exigences :**

- L'`id` doit être passé comme paramètre d'URL (par exemple, `/api/tours/1`)
- Interrogez la table `tours` pour le tour spécifique
- Si le tour est trouvé, retournez ses données avec un statut `200 OK`
- Si le tour n'est pas trouvé, retournez un statut `404 Not Found` avec un message d'erreur approprié

**Indice :** Utilisez `req.params.id` pour récupérer l'ID depuis l'URL :

```javascript
app.get("/api/tours/:id", async (req, res) => {
  const { id } = req.params;
  // ... votre code ici
});
```

Requête SQL :

```javascript
const query = "SELECT * FROM tours WHERE id = $1";
const result = await client.query(query, [id]);
```

---

### Exercice 3 : Refactoriser les interactions avec la base de données

Actuellement, `pool.connect()` et `client.release()` sont appelés dans chaque gestionnaire de route. Pour une meilleure organisation du code et une gestion des erreurs, créez une fonction utilitaire.

**Tâche :**

1. Créez un nouveau fichier `db.js` dans votre projet
2. Implémentez une fonction `executeQuery(sql, params)` qui encapsule ces opérations de base de données
3. Exportez cette fonction et utilisez-la dans vos routes

**Exemple de structure :**

```javascript
// db.js
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const executeQuery = async (sql, params = []) => {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result;
  } finally {
    client.release();
  }
};

module.exports = { executeQuery, pool };
```

Mettez à jour vos routes pour utiliser cette fonction utilitaire. Cela démontre une forme basique de séparation des préoccupations, préparant à un accès à la base de données plus structuré dans les microservices.

---

## Résumé et prochaines étapes

Dans cette leçon, nous avons établi un environnement de développement fullstack robuste en installant :

- ✅ **Node.js 24.x** (LTS) et son gestionnaire de paquets **npm**
- ✅ **Express.js 4.21.x** pour créer un serveur backend
- ✅ **PostgreSQL 18.x** avec un utilisateur et un schéma dédiés
- ✅ **Bibliothèque client pg** pour connecter Node.js à PostgreSQL

Nous avons démontré comment connecter ces composants, permettant à notre application backend d'interagir avec une base de données relationnelle. Le backend de l'application de tourisme a maintenant une fondation pour gérer les requêtes API et le stockage de données persistant.

---

### Prochaine leçon

La prochaine leçon approfondira les **Principes de Design d'API RESTful et Bonnes Pratiques**. Nous allons développer notre API Express basique en introduisant des directives pour créer des APIs claires, cohérentes et évolutives, ce qui est crucial pour développer efficacement notre architecture microservices.

**Vous apprendrez à :**

- Structurer les endpoints API de manière logique
- Utiliser les méthodes HTTP appropriées (GET, POST, PUT, PATCH, DELETE)
- Gérer les codes de statut HTTP correctement
- Organiser les ressources efficacement
- Assurer que notre backend soit non seulement fonctionnel mais aussi bien conçu et maintenable pour une croissance future et l'intégration avec d'autres services

---

## Navigation

- **⬅️ Précédent** : [Leçon 1.2 - Les fondamentaux de React](lecon-2-react-fundamentals.md)
- **➡️ Suivant** : [Leçon 1.4 - Principes de Design d'API RESTful](lecon-4-restful-api-design.md)
- **🏠 Retour** : [Sommaire du Module 1](README.md)

---

## Ressources complémentaires

- [Documentation officielle Node.js](https://nodejs.org/docs/latest/api/)
- [Documentation Express.js](https://expressjs.com/)
- [Documentation PostgreSQL](https://www.postgresql.org/docs/16/index.html)
- [Documentation du module pg](https://node-postgres.com/)
- [Guide nvm](https://github.com/nvm-sh/nvm)
- [Guide nvm-windows](https://github.com/coreybutler/nvm-windows)

---

**Leçon complétée** ✅
