/**
 * Script de seed de la base de données
 * Insère des données de test pour le développement
 *
 * Usage: npm run db:seed
 */

const { pool } = require("../config/db");
const bcrypt = require("bcrypt");

async function seed() {
  console.log("🌱 Démarrage du seeding de la base de données...\n");

  try {
    // 1. Insérer des utilisateurs de test
    console.log("👥 Insertion des utilisateurs...");
    const hashedPassword = await bcrypt.hash("password123", 10);

    const usersResult = await pool.query(
      `
      INSERT INTO users (email, password_hash, first_name, last_name, phone, role)
      VALUES
        ('admin@tourism.com', $1, 'Admin', 'System', '+32123456789', 'admin'),
        ('operator@tourism.com', $1, 'Tour', 'Operator', '+32123456790', 'tour_operator'),
        ('marie.dupont@email.com', $1, 'Marie', 'Dupont', '+32612345678', 'customer'),
        ('jean.martin@email.com', $1, 'Jean', 'Martin', '+32623456789', 'customer'),
        ('sophie.bernard@email.com', $1, 'Sophie', 'Bernard', '+32634567890', 'customer')
      ON CONFLICT (email) DO NOTHING
      RETURNING id;
    `,
      [hashedPassword]
    );

    console.log(`✅ ${usersResult.rowCount} utilisateurs insérés\n`);

    // 2. Insérer des visites
    console.log("🗺️  Insertion des visites...");
    const toursResult = await pool.query(`
      INSERT INTO tours (name, description, destination, price, duration, max_group_size, difficulty, image_url)
      VALUES
        (
          'Visite Historique de Paris',
          'Découvrez les monuments emblématiques de Paris : Tour Eiffel, Louvre, Notre-Dame et bien plus. Une visite complète avec un guide expert francophone.',
          'Paris, France',
          89.99,
          '4 heures',
          15,
          'easy',
          'https://images.unsplash.com/photo-1502602898657-3e91760cbb34'
        ),
        (
          'Trek d''Aventure dans les Alpes',
          'Randonnée de 7 jours à travers les Alpes françaises. Paysages à couper le souffle, refuges de montagne et expérience inoubliable.',
          'Chamonix, France',
          1250.00,
          '7 jours',
          12,
          'hard',
          'https://images.unsplash.com/photo-1506905925346-21bda4d32df4'
        ),
        (
          'Dégustation de Vin en Bourgogne',
          'Visitez les meilleurs vignobles de Bourgogne, dégustez des vins d''exception et découvrez le processus de vinification.',
          'Beaune, France',
          120.00,
          '6 heures',
          10,
          'easy',
          'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb'
        ),
        (
          'Safari Photos en Provence',
          'Capturez la beauté des champs de lavande et des villages provençaux avec un photographe professionnel.',
          'Provence, France',
          95.00,
          '5 heures',
          8,
          'easy',
          'https://images.unsplash.com/photo-1499856871958-5b9627545d1a'
        ),
        (
          'Exploration Culinaire de Lyon',
          'Découvrez la gastronomie lyonnaise à travers ses bouchons traditionnels et marchés locaux.',
          'Lyon, France',
          75.00,
          '4 heures',
          12,
          'easy',
          'https://images.unsplash.com/photo-1414235077428-338989a2e8c0'
        ),
        (
          'Surf et Yoga au Pays Basque',
          'Combinaison parfaite de surf le matin et yoga en fin de journée sur les plages basques.',
          'Biarritz, France',
          450.00,
          '3 jours',
          10,
          'moderate',
          'https://images.unsplash.com/photo-1502680390469-be75c86b636f'
        ),
        (
          'Château de la Loire à Vélo',
          'Circuit cycliste de 5 jours à travers les plus beaux châteaux de la Loire.',
          'Vallée de la Loire, France',
          890.00,
          '5 jours',
          15,
          'moderate',
          'https://images.unsplash.com/photo-1464037866556-6812c9d1c72e'
        ),
        (
          'Cours de Pâtisserie Française',
          'Apprenez à réaliser croissants, macarons et éclairs avec un chef pâtissier parisien.',
          'Paris, France',
          150.00,
          '3 heures',
          8,
          'easy',
          'https://images.unsplash.com/photo-1486427944299-d1955d23e34d'
        )
      ON CONFLICT DO NOTHING
      RETURNING id;
    `);

    console.log(`✅ ${toursResult.rowCount} visites insérées\n`);

    // 3. Insérer des réservations
    console.log("📅 Insertion des réservations...");
    const bookingsResult = await pool.query(`
      INSERT INTO bookings (tour_id, user_id, booking_date, number_of_travelers, total_price, status, payment_status)
      VALUES
        (1, 3, '2025-02-15', 2, 179.98, 'confirmed', 'paid'),
        (2, 3, '2025-03-10', 1, 1250.00, 'confirmed', 'paid'),
        (3, 4, '2025-02-20', 4, 480.00, 'confirmed', 'paid'),
        (5, 4, '2025-01-25', 3, 225.00, 'completed', 'paid'),
        (1, 5, '2025-02-10', 2, 179.98, 'pending', 'pending'),
        (6, 5, '2025-04-01', 2, 900.00, 'confirmed', 'paid')
      ON CONFLICT DO NOTHING
      RETURNING id;
    `);

    console.log(`✅ ${bookingsResult.rowCount} réservations insérées\n`);

    // 4. Insérer des avis
    console.log("⭐ Insertion des avis...");
    const reviewsResult = await pool.query(`
      INSERT INTO reviews (tour_id, user_id, booking_id, rating, title, comment)
      VALUES
        (
          1,
          3,
          1,
          5,
          'Visite exceptionnelle !',
          'Guide très compétent et sympathique. J''ai adoré découvrir Paris sous un nouvel angle. Je recommande vivement !'
        ),
        (
          5,
          4,
          4,
          5,
          'Expérience culinaire inoubliable',
          'Les bouchons lyonnais sont incroyables ! Notre guide connaissait tous les meilleurs endroits. Un régal du début à la fin.'
        ),
        (
          3,
          4,
          3,
          4,
          'Très bonne dégustation',
          'Vins excellents et explications claires. Seul bémol : un peu trop de monde dans certains vignobles.'
        )
      ON CONFLICT (user_id, tour_id) DO NOTHING
      RETURNING id;
    `);

    console.log(`✅ ${reviewsResult.rowCount} avis insérés\n`);

    console.log("🎉 Seeding terminé avec succès!\n");
    console.log("📊 Résumé:");
    console.log(`   - Utilisateurs : ${usersResult.rowCount}`);
    console.log(`   - Visites : ${toursResult.rowCount}`);
    console.log(`   - Réservations : ${bookingsResult.rowCount}`);
    console.log(`   - Avis : ${reviewsResult.rowCount}\n`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Erreur lors du seeding:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Exécuter le seeding
seed();
