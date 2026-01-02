/**
 * Script de seed (données initiales)
 * Booking Management Service - Leçon 2.6
 *
 * Usage: npm run db:seed
 *
 * Note: Les tourIds sont des références logiques vers le Tour Catalog Service.
 * Dans un environnement réel, ces IDs seraient obtenus via l'API du Tour Catalog.
 */

import db from "../models/index.js";

const { sequelize, Booking } = db;

// Données de seed (exemples avec des IDs fictifs pour les tours)
const bookings = [
  {
    tourId: "00000000-0000-0000-0000-000000000001", // ID fictif
    customerName: "Jean Dupont",
    customerEmail: "jean.dupont@example.com",
    customerPhone: "+33612345678",
    tourDate: "2026-03-15",
    numberOfParticipants: 2,
    totalAmount: 179.98,
    currency: "EUR",
    status: "confirmed",
    confirmedAt: new Date("2026-01-02T10:30:00Z"),
    specialRequests: "Allergie aux noix",
  },
  {
    tourId: "00000000-0000-0000-0000-000000000002",
    customerName: "Marie Martin",
    customerEmail: "marie.martin@example.com",
    customerPhone: "+33698765432",
    tourDate: "2026-04-01",
    numberOfParticipants: 4,
    totalAmount: 2396.0,
    currency: "EUR",
    status: "pending",
    specialRequests: "Groupe familial avec enfants",
  },
  {
    tourId: "00000000-0000-0000-0000-000000000003",
    customerName: "Pierre Durand",
    customerEmail: "pierre.durand@example.com",
    tourDate: "2026-02-28",
    numberOfParticipants: 1,
    totalAmount: 159.0,
    currency: "EUR",
    status: "confirmed",
    confirmedAt: new Date("2026-01-01T14:00:00Z"),
  },
  {
    tourId: "00000000-0000-0000-0000-000000000001",
    customerName: "Sophie Lambert",
    customerEmail: "sophie.lambert@example.com",
    tourDate: "2026-03-20",
    numberOfParticipants: 3,
    totalAmount: 269.97,
    currency: "EUR",
    status: "cancelled",
    cancelledAt: new Date("2026-01-02T16:45:00Z"),
    cancellationReason: "Changement de plans",
  },
];

async function seed() {
  console.log("\n🌱 Insertion des données de seed...\n");

  try {
    // Tester la connexion
    await sequelize.authenticate();
    console.log("✅ Connexion à la base de données établie.\n");

    // Insérer les réservations
    console.log("📋 Insertion des réservations...");
    const createdBookings = await Booking.bulkCreate(bookings, {
      ignoreDuplicates: true,
    });
    console.log(`   ✅ ${createdBookings.length} réservations insérées.\n`);

    // Afficher un résumé
    const stats = await Booking.findAll({
      attributes: [
        "status",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
      ],
      group: ["status"],
      raw: true,
    });

    console.log("📊 Résumé des réservations:");
    stats.forEach((s) => {
      console.log(`   - ${s.status}: ${s.count}`);
    });

    console.log("\n✅ Seed terminé avec succès!\n");
  } catch (error) {
    console.error("❌ Erreur lors du seed:", error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

seed();
