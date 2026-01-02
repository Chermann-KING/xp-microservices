/**
 * Script d'exécution des migrations
 * Booking Management Service - Leçon 2.6
 *
 * Usage: npm run db:migrate
 */

import { Sequelize } from "sequelize";
import databaseConfig from "../config/database.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readdirSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const env = process.env.NODE_ENV || "development";
const config = databaseConfig[env];

async function runMigrations() {
  console.log(`\n🔄 Exécution des migrations (${env})...\n`);

  const sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    {
      host: config.host,
      port: config.port,
      dialect: config.dialect,
      logging: console.log,
    }
  );

  try {
    // Tester la connexion
    await sequelize.authenticate();
    console.log("✅ Connexion à la base de données établie.\n");

    // Créer la table de suivi des migrations si elle n'existe pas
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS sequelize_migrations (
        name VARCHAR(255) PRIMARY KEY,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Récupérer les migrations déjà exécutées
    const [executedMigrations] = await sequelize.query(
      "SELECT name FROM sequelize_migrations ORDER BY name;"
    );
    const executedNames = executedMigrations.map((m) => m.name);

    // Lire les fichiers de migration
    const migrationsPath = join(__dirname, "migrations");
    const migrationFiles = readdirSync(migrationsPath)
      .filter((f) => f.endsWith(".js"))
      .sort();

    let migrationsRun = 0;

    for (const file of migrationFiles) {
      if (!executedNames.includes(file)) {
        console.log(`📦 Exécution de la migration: ${file}`);

        const migration = await import(join(migrationsPath, file));
        const queryInterface = sequelize.getQueryInterface();

        await migration.up(queryInterface, Sequelize);

        // Enregistrer la migration comme exécutée
        await sequelize.query(
          "INSERT INTO sequelize_migrations (name) VALUES (?)",
          { replacements: [file] }
        );

        console.log(`   ✅ Migration ${file} terminée.\n`);
        migrationsRun++;
      }
    }

    if (migrationsRun === 0) {
      console.log("ℹ️  Aucune nouvelle migration à exécuter.");
    } else {
      console.log(
        `\n✅ ${migrationsRun} migration(s) exécutée(s) avec succès.`
      );
    }
  } catch (error) {
    console.error("❌ Erreur lors des migrations:", error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

runMigrations();
