# Solutions - Leçon 1.3 : Setup environnement fullstack

**Module 1** : Fondements du Développement Web Moderne et des Microservices

---

## Vue d'ensemble

Ces exercices pratiques vous permettent de mettre en application les concepts de configuration d'environnement en construisant des endpoints API complets et en structurant votre code backend.

---

## Exercice 1 : Ajouter un endpoint POST /api/tours

### Objectif

Créer un endpoint permettant d'ajouter de nouvelles visites dans la base de données via une requête POST.

### Solution complète

#### Fichier : `app/backend/server.js` (version avec POST)

```javascript
// Importer les modules nécessaires
require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');

// Initialiser l'application Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware pour parser le JSON dans le corps des requêtes
app.use(express.json());

// Configuration du pool de connexions PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Tester la connexion à la base de données au démarrage
pool.connect()
  .then(client => {
    console.log('✓ Connecté à la base de données PostgreSQL!');
    client.release();
  })
  .catch(err => {
    console.error('✗ Erreur de connexion à la base de données:', err.message);
    process.exit(1);
  });

// Route de base
app.get('/', (req, res) => {
  res.json({ message: 'Bienvenue sur le Backend de l\'Application de Tourisme!' });
});

// GET /api/tours - Récupérer toutes les visites
app.get('/api/tours', async (req, res) => {
  const client = await pool.connect();
  try {
    const query = 'SELECT * FROM tours ORDER BY id';
    const result = await client.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Erreur lors de la récupération des tours:', err);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des tours' });
  } finally {
    client.release();
  }
});

// POST /api/tours - Créer une nouvelle visite
app.post('/api/tours', async (req, res) => {
  const client = await pool.connect();
  try {
    // Extraire les données du corps de la requête
    const { name, description, price, duration, max_group_size } = req.body;

    // Validation des données requises
    if (!name || !description || price === undefined || !duration || !max_group_size) {
      return res.status(400).json({
        error: 'Données manquantes',
        required: ['name', 'description', 'price', 'duration', 'max_group_size']
      });
    }

    // Validation des types de données
    if (typeof price !== 'number' || price < 0) {
      return res.status(400).json({ error: 'Le prix doit être un nombre positif' });
    }

    if (typeof max_group_size !== 'number' || max_group_size < 1) {
      return res.status(400).json({ error: 'La taille maximale du groupe doit être au moins 1' });
    }

    // Requête SQL paramétrée pour éviter les injections SQL
    const query = `
      INSERT INTO tours (name, description, price, duration, max_group_size)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [name, description, price, duration, max_group_size];

    // Exécuter la requête
    const result = await client.query(query, values);

    // Retourner le tour nouvellement créé avec le statut 201 Created
    res.status(201).json({
      message: 'Visite créée avec succès',
      tour: result.rows[0]
    });

  } catch (err) {
    console.error('Erreur lors de la création du tour:', err);
    res.status(500).json({ error: 'Erreur serveur lors de la création du tour' });
  } finally {
    client.release();
  }
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`✓ Serveur en cours d'exécution sur http://localhost:${PORT}`);
});
```

### Test de l'endpoint avec curl

```bash
# Test POST - Créer une nouvelle visite
curl -X POST http://localhost:3000/api/tours \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tour Gastronomique de Paris",
    "description": "Découvrez les meilleurs restaurants et fromages de Paris",
    "price": 85.50,
    "duration": "4 heures",
    "max_group_size": 8
  }'
```

### Résultat attendu

```json
{
  "message": "Visite créée avec succès",
  "tour": {
    "id": 3,
    "name": "Tour Gastronomique de Paris",
    "description": "Découvrez les meilleurs restaurants et fromages de Paris",
    "price": 85.50,
    "duration": "4 heures",
    "max_group_size": 8
  }
}
```

### Test des cas d'erreur

```bash
# Test avec données manquantes (devrait retourner 400)
curl -X POST http://localhost:3000/api/tours \
  -H "Content-Type: application/json" \
  -d '{"name": "Tour incomplet"}'
```

Résultat :
```json
{
  "error": "Données manquantes",
  "required": ["name", "description", "price", "duration", "max_group_size"]
}
```

---

## Exercice 2 : Endpoint GET /api/tours/:id

### Objectif

Créer un endpoint permettant de récupérer une visite spécifique par son ID.

### Solution complète

#### Ajout au fichier `server.js`

```javascript
// GET /api/tours/:id - Récupérer un tour spécifique par ID
app.get('/api/tours/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    // Récupérer l'ID depuis les paramètres d'URL
    const { id } = req.params;

    // Validation de l'ID
    const tourId = parseInt(id, 10);
    if (isNaN(tourId)) {
      return res.status(400).json({ error: 'ID invalide. L\'ID doit être un nombre.' });
    }

    // Requête SQL paramétrée
    const query = 'SELECT * FROM tours WHERE id = $1';
    const result = await client.query(query, [tourId]);

    // Vérifier si le tour existe
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Tour non trouvé',
        message: `Aucune visite trouvée avec l'ID ${tourId}`
      });
    }

    // Retourner le tour trouvé
    res.json(result.rows[0]);

  } catch (err) {
    console.error('Erreur lors de la récupération du tour:', err);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération du tour' });
  } finally {
    client.release();
  }
});
```

### Test de l'endpoint

```bash
# Test GET par ID - Tour existant
curl http://localhost:3000/api/tours/1

# Test GET par ID - Tour inexistant (devrait retourner 404)
curl http://localhost:3000/api/tours/999

# Test GET par ID - ID invalide (devrait retourner 400)
curl http://localhost:3000/api/tours/abc
```

### Résultats attendus

**Tour existant (200 OK)** :
```json
{
  "id": 1,
  "name": "Visite Historique de la Ville",
  "description": "Explorez les monuments historiques",
  "price": 50,
  "duration": "3 heures",
  "max_group_size": 15
}
```

**Tour inexistant (404 Not Found)** :
```json
{
  "error": "Tour non trouvé",
  "message": "Aucune visite trouvée avec l'ID 999"
}
```

**ID invalide (400 Bad Request)** :
```json
{
  "error": "ID invalide. L'ID doit être un nombre."
}
```

---

## Exercice 3 : Refactoriser avec un module db.js

### Objectif

Séparer la logique d'accès à la base de données dans un module dédié pour améliorer l'organisation du code et la réutilisabilité.

### Solution complète

#### Fichier : `app/backend/db.js`

```javascript
/**
 * Module de gestion de la base de données PostgreSQL
 *
 * Ce module encapsule toutes les opérations liées à la base de données,
 * offrant une interface simple et cohérente pour exécuter des requêtes SQL.
 */

const { Pool } = require('pg');
require('dotenv').config();

// Configuration et création du pool de connexions
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

/**
 * Teste la connexion à la base de données
 * @returns {Promise<boolean>} true si la connexion réussit
 */
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✓ Connexion à la base de données PostgreSQL établie avec succès');
    client.release();
    return true;
  } catch (err) {
    console.error('✗ Erreur de connexion à la base de données:', err.message);
    throw err;
  }
};

/**
 * Exécute une requête SQL avec des paramètres
 * @param {string} sql - La requête SQL à exécuter
 * @param {Array} params - Les paramètres de la requête (optionnel)
 * @returns {Promise<Object>} Le résultat de la requête
 */
const executeQuery = async (sql, params = []) => {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result;
  } catch (err) {
    console.error('Erreur lors de l\'exécution de la requête:', err.message);
    console.error('SQL:', sql);
    console.error('Params:', params);
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Exécute une transaction (plusieurs requêtes atomiques)
 * @param {Function} callback - Fonction contenant les requêtes à exécuter
 * @returns {Promise<any>} Le résultat de la transaction
 */
const executeTransaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erreur lors de la transaction:', err.message);
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Ferme toutes les connexions du pool
 * Utile lors de l'arrêt gracieux de l'application
 */
const closePool = async () => {
  await pool.end();
  console.log('✓ Pool de connexions fermé');
};

// Export des fonctions et du pool
module.exports = {
  pool,
  testConnection,
  executeQuery,
  executeTransaction,
  closePool
};
```

#### Fichier : `app/backend/server.js` (refactorisé)

```javascript
// Importer les modules nécessaires
require('dotenv').config();
const express = require('express');
const { testConnection, executeQuery } = require('./db');

// Initialiser l'application Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware pour parser le JSON
app.use(express.json());

// Tester la connexion à la base de données au démarrage
testConnection()
  .catch(err => {
    console.error('Impossible de se connecter à la base de données');
    process.exit(1);
  });

// Route de base
app.get('/', (req, res) => {
  res.json({ message: 'Bienvenue sur le Backend de l\'Application de Tourisme!' });
});

// GET /api/tours - Récupérer toutes les visites
app.get('/api/tours', async (req, res) => {
  try {
    const query = 'SELECT * FROM tours ORDER BY id';
    const result = await executeQuery(query);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des tours' });
  }
});

// GET /api/tours/:id - Récupérer un tour spécifique
app.get('/api/tours/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tourId = parseInt(id, 10);

    if (isNaN(tourId)) {
      return res.status(400).json({ error: 'ID invalide. L\'ID doit être un nombre.' });
    }

    const query = 'SELECT * FROM tours WHERE id = $1';
    const result = await executeQuery(query, [tourId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Tour non trouvé',
        message: `Aucune visite trouvée avec l'ID ${tourId}`
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur lors de la récupération du tour' });
  }
});

// POST /api/tours - Créer une nouvelle visite
app.post('/api/tours', async (req, res) => {
  try {
    const { name, description, price, duration, max_group_size } = req.body;

    // Validation
    if (!name || !description || price === undefined || !duration || !max_group_size) {
      return res.status(400).json({
        error: 'Données manquantes',
        required: ['name', 'description', 'price', 'duration', 'max_group_size']
      });
    }

    if (typeof price !== 'number' || price < 0) {
      return res.status(400).json({ error: 'Le prix doit être un nombre positif' });
    }

    if (typeof max_group_size !== 'number' || max_group_size < 1) {
      return res.status(400).json({ error: 'La taille maximale du groupe doit être au moins 1' });
    }

    // Insertion dans la base de données
    const query = `
      INSERT INTO tours (name, description, price, duration, max_group_size)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [name, description, price, duration, max_group_size];
    const result = await executeQuery(query, values);

    res.status(201).json({
      message: 'Visite créée avec succès',
      tour: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur lors de la création du tour' });
  }
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`✓ Serveur en cours d'exécution sur http://localhost:${PORT}`);
});

// Gestion de l'arrêt gracieux
process.on('SIGTERM', async () => {
  console.log('Signal SIGTERM reçu, arrêt gracieux...');
  const { closePool } = require('./db');
  await closePool();
  process.exit(0);
});
```

### Avantages de cette refactorisation

#### 1. Séparation des préoccupations (Separation of Concerns)

**Avant** :
- Le code de connexion à la base de données est mélangé avec la logique des routes
- Duplication du code `pool.connect()` et `client.release()` dans chaque route

**Après** :
- Module `db.js` : responsable uniquement de l'accès aux données
- Module `server.js` : responsable uniquement des routes et de la logique HTTP
- Principe SOLID respecté (Single Responsibility Principle)

#### 2. Réutilisabilité

```javascript
// La fonction executeQuery peut être utilisée partout
const { executeQuery } = require('./db');

// Dans les routes
const tours = await executeQuery('SELECT * FROM tours');

// Dans un service métier
const bookings = await executeQuery('SELECT * FROM bookings WHERE user_id = $1', [userId]);
```

#### 3. Gestion centralisée des erreurs

Toutes les erreurs de base de données sont loggées de manière cohérente dans `db.js`, facilitant le débogage.

#### 4. Testabilité améliorée

Le module `db.js` peut être facilement mocké dans les tests unitaires :

```javascript
// Dans les tests
jest.mock('./db');
const { executeQuery } = require('./db');
executeQuery.mockResolvedValue({ rows: [{ id: 1, name: 'Test Tour' }] });
```

#### 5. Support des transactions

La fonction `executeTransaction` permet des opérations atomiques :

```javascript
const { executeTransaction } = require('./db');

await executeTransaction(async (client) => {
  await client.query('INSERT INTO bookings ...');
  await client.query('UPDATE tours SET available_seats = ...');
  // Si une requête échoue, tout est rollback
});
```

---

## Tests complets de l'API

### Script de test avec curl

Créez un fichier `test-api.sh` :

```bash
#!/bin/bash

echo "=== Test de l'API Tourism Backend ==="
echo ""

# Test 1: Route de base
echo "1. Test GET /"
curl -s http://localhost:3000/ | jq
echo ""

# Test 2: Récupérer tous les tours
echo "2. Test GET /api/tours"
curl -s http://localhost:3000/api/tours | jq
echo ""

# Test 3: Créer un nouveau tour
echo "3. Test POST /api/tours"
curl -s -X POST http://localhost:3000/api/tours \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tour des Châteaux de la Loire",
    "description": "Visitez les magnifiques châteaux de Chambord, Chenonceau et Amboise",
    "price": 120.00,
    "duration": "Journée complète",
    "max_group_size": 20
  }' | jq
echo ""

# Test 4: Récupérer un tour spécifique
echo "4. Test GET /api/tours/1"
curl -s http://localhost:3000/api/tours/1 | jq
echo ""

# Test 5: Tour inexistant
echo "5. Test GET /api/tours/999 (devrait retourner 404)"
curl -s http://localhost:3000/api/tours/999 | jq
echo ""

# Test 6: ID invalide
echo "6. Test GET /api/tours/abc (devrait retourner 400)"
curl -s http://localhost:3000/api/tours/abc | jq
echo ""

echo "=== Tests terminés ==="
```

Rendez le script exécutable et lancez-le :

```bash
chmod +x test-api.sh
./test-api.sh
```

---

## Conclusion

Ces trois exercices vous ont permis de :

1. **Implémenter un endpoint POST** pour créer des ressources avec validation complète
2. **Implémenter un endpoint GET avec paramètre** pour récupérer une ressource spécifique
3. **Refactoriser le code** en séparant les préoccupations avec un module dédié à la base de données

Ces compétences sont fondamentales pour construire des microservices robustes et maintenables.

---

**Retour à la leçon** : [Leçon 1.3 - Setup environnement fullstack](../lecon-3-setup-environnement.md)

**Prochains exercices** : [Leçon 1.4 - RESTful API Design](lecon-1.4-solutions.md)
