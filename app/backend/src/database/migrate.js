/**
 * Script de migration de base de données
 * Crée toutes les tables nécessaires pour l'application de réservation touristique
 *
 * Usage: npm run db:migrate
 */

const { pool } = require('../config/db');

async function migrate() {
  console.log('🚀 Démarrage des migrations de base de données...\n');

  try {
    // 1. Créer la table tours
    console.log('📝 Création de la table "tours"...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tours (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        destination VARCHAR(255) NOT NULL,
        price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
        duration VARCHAR(100) NOT NULL,
        max_group_size INTEGER NOT NULL CHECK (max_group_size > 0),
        difficulty VARCHAR(50) DEFAULT 'moderate',
        image_url VARCHAR(500),
        available BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Table "tours" créée\n');

    // 2. Créer la table users
    console.log('📝 Création de la table "users"...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        role VARCHAR(20) DEFAULT 'customer' CHECK (role IN ('customer', 'admin', 'tour_operator')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Table "users" créée\n');

    // 3. Créer la table bookings
    console.log('📝 Création de la table "bookings"...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        tour_id INTEGER NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        booking_date DATE NOT NULL,
        number_of_travelers INTEGER NOT NULL CHECK (number_of_travelers > 0),
        total_price DECIMAL(10, 2) NOT NULL CHECK (total_price >= 0),
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
        payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')),
        special_requests TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Table "bookings" créée\n');

    // 4. Créer la table reviews
    console.log('📝 Création de la table "reviews"...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        tour_id INTEGER NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        title VARCHAR(255),
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, tour_id)
      );
    `);
    console.log('✅ Table "reviews" créée\n');

    // 5. Créer des index pour améliorer les performances
    console.log('📝 Création des index...');

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_tours_destination ON tours(destination);
      CREATE INDEX IF NOT EXISTS idx_tours_price ON tours(price);
      CREATE INDEX IF NOT EXISTS idx_tours_available ON tours(available);

      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

      CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
      CREATE INDEX IF NOT EXISTS idx_bookings_tour_id ON bookings(tour_id);
      CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
      CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

      CREATE INDEX IF NOT EXISTS idx_reviews_tour_id ON reviews(tour_id);
      CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
    `);
    console.log('✅ Index créés\n');

    // 6. Créer une fonction trigger pour updated_at
    console.log('📝 Création de la fonction trigger pour updated_at...');
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Appliquer le trigger à toutes les tables
    const tables = ['tours', 'users', 'bookings', 'reviews'];
    for (const table of tables) {
      await pool.query(`
        DROP TRIGGER IF EXISTS update_${table}_updated_at ON ${table};
        CREATE TRIGGER update_${table}_updated_at
        BEFORE UPDATE ON ${table}
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
      `);
    }
    console.log('✅ Triggers créés\n');

    console.log('🎉 Migrations terminées avec succès!\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Erreur lors des migrations:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Exécuter les migrations
migrate();
