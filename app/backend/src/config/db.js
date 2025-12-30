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
  max: 20, // Nombre maximum de clients dans le pool
  idleTimeoutMillis: 30000, // Fermer les connexions inactives après 30s
  connectionTimeoutMillis: 2000, // Timeout de connexion : 2s
});

/**
 * Teste la connexion à la base de données
 * @returns {Promise<boolean>} true si la connexion réussit
 */
const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✓ Connexion à PostgreSQL établie avec succès');
    console.log('✓ Heure serveur DB:', result.rows[0].now);
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

// Gestion des signaux d'arrêt pour fermeture gracieuse
process.on('SIGTERM', async () => {
  console.log('Signal SIGTERM reçu, fermeture du pool...');
  await closePool();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\nSignal SIGINT reçu, fermeture du pool...');
  await closePool();
  process.exit(0);
});

// Export des fonctions et du pool
module.exports = {
  pool,
  testConnection,
  executeQuery,
  executeTransaction,
  closePool
};
