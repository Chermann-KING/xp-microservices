/**
 * Script de seed (données initiales)
 * Tour Catalog Service - Leçon 2.6
 *
 * Usage: npm run db:seed
 */

import db from "../models/index.js";

const { sequelize, Category, Destination, Tour } = db;

// Données de seed
const categories = [
  {
    name: "Aventure",
    slug: "aventure",
    description:
      "Visites pour les amateurs de sensations fortes et d'exploration",
    icon: "hiking",
  },
  {
    name: "Culture",
    slug: "culture",
    description: "Découvrez l'histoire et le patrimoine local",
    icon: "museum",
  },
  {
    name: "Nature",
    slug: "nature",
    description: "Explorez les merveilles naturelles et la faune",
    icon: "leaf",
  },
  {
    name: "Gastronomie",
    slug: "gastronomie",
    description: "Expériences culinaires et dégustations",
    icon: "utensils",
  },
  {
    name: "Bien-être",
    slug: "bien-etre",
    description: "Détente, spa et retraites de méditation",
    icon: "spa",
  },
];

const destinations = [
  {
    name: "Paris",
    slug: "paris",
    country: "France",
    region: "Île-de-France",
    description: "La Ville Lumière, capitale de l'art et de la mode",
    coordinates: { lat: 48.8566, lng: 2.3522 },
  },
  {
    name: "Tokyo",
    slug: "tokyo",
    country: "Japon",
    region: "Kantō",
    description: "Mégalopole fascinante mêlant tradition et modernité",
    coordinates: { lat: 35.6762, lng: 139.6503 },
  },
  {
    name: "New York",
    slug: "new-york",
    country: "États-Unis",
    region: "New York State",
    description: "La ville qui ne dort jamais",
    coordinates: { lat: 40.7128, lng: -74.006 },
  },
  {
    name: "Marrakech",
    slug: "marrakech",
    country: "Maroc",
    region: "Marrakech-Safi",
    description: "Perle du Sud marocain aux couleurs ocres",
    coordinates: { lat: 31.6295, lng: -7.9811 },
  },
  {
    name: "Bali",
    slug: "bali",
    country: "Indonésie",
    region: "Bali",
    description: "L'île des dieux, paradis tropical",
    coordinates: { lat: -8.3405, lng: 115.092 },
  },
];

async function seed() {
  console.log("\n🌱 Insertion des données de seed...\n");

  try {
    // Tester la connexion
    await sequelize.authenticate();
    console.log("✅ Connexion à la base de données établie.\n");

    // Insérer les catégories
    console.log("📁 Insertion des catégories...");
    const createdCategories = await Category.bulkCreate(categories, {
      ignoreDuplicates: true,
    });
    console.log(`   ✅ ${createdCategories.length} catégories insérées.\n`);

    // Insérer les destinations
    console.log("🗺️  Insertion des destinations...");
    const createdDestinations = await Destination.bulkCreate(destinations, {
      ignoreDuplicates: true,
    });
    console.log(`   ✅ ${createdDestinations.length} destinations insérées.\n`);

    // Récupérer les catégories et destinations pour créer les tours
    const [aventure] = await Category.findAll({ where: { slug: "aventure" } });
    const [culture] = await Category.findAll({ where: { slug: "culture" } });
    const [nature] = await Category.findAll({ where: { slug: "nature" } });
    const [gastronomie] = await Category.findAll({
      where: { slug: "gastronomie" },
    });

    const [paris] = await Destination.findAll({ where: { slug: "paris" } });
    const [tokyo] = await Destination.findAll({ where: { slug: "tokyo" } });
    const [marrakech] = await Destination.findAll({
      where: { slug: "marrakech" },
    });
    const [bali] = await Destination.findAll({ where: { slug: "bali" } });

    // Créer des tours
    const tours = [
      {
        title: "Visite guidée de la Tour Eiffel",
        slug: "visite-guidee-tour-eiffel",
        description:
          "Découvrez l'histoire fascinante de la Dame de Fer avec un guide expert. Montée au sommet incluse.",
        summary: "Visite complète de la Tour Eiffel avec accès au sommet",
        price: 89.99,
        currency: "EUR",
        duration: 3,
        durationUnit: "hours",
        difficulty: "easy",
        maxGroupSize: 20,
        ratingsAverage: 4.8,
        ratingsQuantity: 245,
        startDates: [
          new Date("2026-03-15"),
          new Date("2026-04-20"),
          new Date("2026-05-10"),
        ],
        categoryId: culture?.id,
        destinationId: paris?.id,
      },
      {
        title: "Trek dans l'Atlas marocain",
        slug: "trek-atlas-marocain",
        description:
          "Une aventure inoubliable dans les montagnes de l'Atlas. Nuits chez l'habitant et paysages époustouflants.",
        summary: "Randonnée de 5 jours dans l'Atlas",
        price: 599.0,
        currency: "EUR",
        duration: 5,
        durationUnit: "days",
        difficulty: "difficult",
        maxGroupSize: 12,
        ratingsAverage: 4.9,
        ratingsQuantity: 89,
        startDates: [
          new Date("2026-04-01"),
          new Date("2026-05-15"),
          new Date("2026-09-20"),
        ],
        categoryId: aventure?.id,
        destinationId: marrakech?.id,
      },
      {
        title: "Circuit gastronomique à Tokyo",
        slug: "circuit-gastronomique-tokyo",
        description:
          "Explorez les saveurs de Tokyo : sushis, ramen, izakayas. Une immersion dans la cuisine japonaise.",
        summary: "Découverte culinaire de Tokyo",
        price: 159.0,
        currency: "EUR",
        duration: 4,
        durationUnit: "hours",
        difficulty: "easy",
        maxGroupSize: 10,
        ratingsAverage: 4.7,
        ratingsQuantity: 156,
        startDates: [
          new Date("2026-02-28"),
          new Date("2026-03-30"),
          new Date("2026-04-25"),
        ],
        categoryId: gastronomie?.id,
        destinationId: tokyo?.id,
      },
      {
        title: "Retraite yoga à Bali",
        slug: "retraite-yoga-bali",
        description:
          "Une semaine de détente et de méditation dans un cadre paradisiaque. Cours de yoga, spa et excursions.",
        summary: "Retraite bien-être à Ubud",
        price: 1299.0,
        currency: "EUR",
        duration: 7,
        durationUnit: "days",
        difficulty: "easy",
        maxGroupSize: 15,
        ratingsAverage: 4.9,
        ratingsQuantity: 78,
        startDates: [
          new Date("2026-03-01"),
          new Date("2026-06-15"),
          new Date("2026-10-01"),
        ],
        categoryId: nature?.id,
        destinationId: bali?.id,
      },
    ];

    console.log("🎫 Insertion des tours...");
    const createdTours = await Tour.bulkCreate(tours, {
      ignoreDuplicates: true,
    });
    console.log(`   ✅ ${createdTours.length} tours insérés.\n`);

    console.log("✅ Seed terminé avec succès!\n");
  } catch (error) {
    console.error("❌ Erreur lors du seed:", error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

seed();
