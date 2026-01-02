import { v4 as uuidv4 } from "uuid";

// Stockage en mémoire des visites
let tours = [
  {
    id: "550e8400-e29b-41d4-a716-446655440000",
    title: "Visite de la Tour Eiffel et Croisière sur la Seine",
    description: "Découvrez les monuments emblématiques de Paris",
    longDescription:
      "Cette visite complète vous emmène à travers les sites les plus célèbres de Paris. Commencez par la majestueuse Tour Eiffel, puis embarquez pour une croisière romantique sur la Seine.",
    categoryId: "c1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    destinationId: "d7e8f9a0-b1c2-3d4e-5f6a-7b8c9d0e1f2a",
    price: 89.99,
    duration: 4,
    maxGroupSize: 20,
    difficulty: "easy",
    rating: 4.7,
    ratingsCount: 342,
    images: [
      "https://cdn.example.com/tours/eiffel-tower-1.jpg",
      "https://cdn.example.com/tours/seine-cruise-1.jpg",
    ],
    itinerary: [
      {
        day: 1,
        activities: ["Visite de la Tour Eiffel", "Croisière sur la Seine"],
      },
    ],
    includedItems: ["Guide professionnel", "Billets d'entrée", "Boissons"],
    excludedItems: ["Repas", "Pourboires"],
    meetingPoint: "Place du Trocadéro, 75016 Paris",
    createdAt: new Date("2026-01-10T10:30:00Z"),
    updatedAt: new Date("2026-01-15T14:22:00Z"),
  },
  {
    id: "660e8400-e29b-41d4-a716-446655440001",
    title: "Safari dans le Parc National du Serengeti",
    description: "Observez la faune africaine dans son habitat naturel",
    longDescription:
      "Vivez une aventure inoubliable au cœur de la savane africaine. Ce safari de 3 jours vous permettra d'observer lions, éléphants, girafes et bien d'autres animaux sauvages.",
    categoryId: "c1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    destinationId: "e8f9a0b1-c2d3-4e5f-6a7b-8c9d0e1f2a3b",
    price: 1299.0,
    duration: 72,
    maxGroupSize: 8,
    difficulty: "moderate",
    rating: 4.9,
    ratingsCount: 156,
    images: [
      "https://cdn.example.com/tours/serengeti-1.jpg",
      "https://cdn.example.com/tours/serengeti-2.jpg",
    ],
    itinerary: [
      { day: 1, activities: ["Arrivée au camp", "Safari coucher de soleil"] },
      { day: 2, activities: ["Safari matinal", "Observation des migrations"] },
      { day: 3, activities: ["Safari final", "Départ"] },
    ],
    includedItems: ["Hébergement", "Repas", "Guide expert", "Transport 4x4"],
    excludedItems: ["Vols internationaux", "Visa", "Pourboires"],
    meetingPoint: "Aéroport de Kilimandjaro",
    createdAt: new Date("2026-01-05T08:00:00Z"),
    updatedAt: new Date("2026-01-12T16:45:00Z"),
  },
  {
    id: "770e8400-e29b-41d4-a716-446655440002",
    title: "Cours de Cuisine Toscane avec Dégustation de Vins",
    description: "Apprenez les secrets de la cuisine italienne authentique",
    longDescription:
      "Plongez dans l'art culinaire toscan avec ce cours de cuisine interactif. Préparez des pâtes fraîches, découvrez les techniques ancestrales et terminez par une dégustation de vins locaux.",
    categoryId: "e2f3a4b5-c6d7-8e9f-0a1b-2c3d4e5f6a7b",
    destinationId: "f9a0b1c2-d3e4-5f6a-7b8c-9d0e1f2a3b4c",
    price: 150.0,
    duration: 6,
    maxGroupSize: 12,
    difficulty: "easy",
    rating: 4.8,
    ratingsCount: 89,
    images: ["https://cdn.example.com/tours/tuscany-cooking-1.jpg"],
    itinerary: [
      {
        day: 1,
        activities: ["Visite du marché", "Cours de cuisine", "Dégustation"],
      },
    ],
    includedItems: ["Ingrédients", "Repas préparé", "Vins", "Recettes"],
    excludedItems: ["Transport", "Pourboires"],
    meetingPoint: "Piazza del Campo, Sienne",
    createdAt: new Date("2026-01-08T09:15:00Z"),
    updatedAt: new Date("2026-01-08T09:15:00Z"),
  },
];

/**
 * Récupère toutes les visites avec filtrage, tri et pagination
 */
export const findAll = (filters = {}) => {
  let result = [...tours];

  // Filtrage par catégorie
  if (filters.category) {
    result = result.filter((tour) => tour.categoryId === filters.category);
  }

  // Filtrage par destination
  if (filters.destination) {
    result = result.filter(
      (tour) => tour.destinationId === filters.destination
    );
  }

  // Filtrage par prix
  if (filters.minPrice) {
    result = result.filter(
      (tour) => tour.price >= parseFloat(filters.minPrice)
    );
  }
  if (filters.maxPrice) {
    result = result.filter(
      (tour) => tour.price <= parseFloat(filters.maxPrice)
    );
  }

  // Filtrage par difficulté
  if (filters.difficulty) {
    result = result.filter((tour) => tour.difficulty === filters.difficulty);
  }

  // Tri
  if (filters.sort) {
    const order = filters.order === "desc" ? -1 : 1;
    result.sort((a, b) => {
      if (a[filters.sort] < b[filters.sort]) return -1 * order;
      if (a[filters.sort] > b[filters.sort]) return 1 * order;
      return 0;
    });
  }

  // Pagination
  const page = parseInt(filters.page) || 1;
  const limit = parseInt(filters.limit) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  const paginatedResult = result.slice(startIndex, endIndex);

  return {
    tours: paginatedResult,
    totalItems: result.length,
  };
};

/**
 * Récupère une visite par ID
 */
export const findById = (id) => {
  return tours.find((tour) => tour.id === id);
};

/**
 * Crée une nouvelle visite
 */
export const create = (tourData) => {
  const newTour = {
    id: uuidv4(),
    ...tourData,
    rating: 0,
    ratingsCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  tours.push(newTour);
  return newTour;
};

/**
 * Met à jour complètement une visite
 */
export const update = (id, tourData) => {
  const index = tours.findIndex((tour) => tour.id === id);

  if (index === -1) {
    return null;
  }

  tours[index] = {
    ...tourData,
    id,
    rating: tours[index].rating,
    ratingsCount: tours[index].ratingsCount,
    createdAt: tours[index].createdAt,
    updatedAt: new Date(),
  };

  return tours[index];
};

/**
 * Met à jour partiellement une visite
 */
export const partialUpdate = (id, updates) => {
  const index = tours.findIndex((tour) => tour.id === id);

  if (index === -1) {
    return null;
  }

  tours[index] = {
    ...tours[index],
    ...updates,
    id,
    updatedAt: new Date(),
  };

  return tours[index];
};

/**
 * Supprime une visite
 */
export const remove = (id) => {
  const index = tours.findIndex((tour) => tour.id === id);

  if (index === -1) {
    return false;
  }

  tours.splice(index, 1);
  return true;
};
