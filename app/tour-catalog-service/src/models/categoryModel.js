import { v4 as uuidv4 } from "uuid";

// Stockage en mémoire des catégories
let categories = [
  {
    id: "c1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
    name: "Aventure",
    description: "Visites riches en adrénaline et activités de plein air",
    imageUrl: "https://cdn.example.com/categories/adventure.jpg",
    tourCount: 47,
    createdAt: new Date("2026-01-01T08:00:00Z"),
    updatedAt: new Date("2026-01-01T08:00:00Z"),
  },
  {
    id: "e2f3a4b5-c6d7-8e9f-0a1b-2c3d4e5f6a7b",
    name: "Culturel",
    description: "Explorez l'histoire, l'art et les traditions locales",
    imageUrl: "https://cdn.example.com/categories/cultural.jpg",
    tourCount: 62,
    createdAt: new Date("2026-01-01T08:00:00Z"),
    updatedAt: new Date("2026-01-01T08:00:00Z"),
  },
  {
    id: "f3a4b5c6-d7e8-9f0a-1b2c-3d4e5f6a7b8c",
    name: "Gastronomie",
    description: "Découvrez les saveurs et cuisines du monde",
    imageUrl: "https://cdn.example.com/categories/gastronomy.jpg",
    tourCount: 35,
    createdAt: new Date("2026-01-01T08:00:00Z"),
    updatedAt: new Date("2026-01-01T08:00:00Z"),
  },
  {
    id: "a4b5c6d7-e8f9-0a1b-2c3d-4e5f6a7b8c9d",
    name: "Nature",
    description: "Immergez-vous dans les plus beaux paysages naturels",
    imageUrl: "https://cdn.example.com/categories/nature.jpg",
    tourCount: 54,
    createdAt: new Date("2026-01-01T08:00:00Z"),
    updatedAt: new Date("2026-01-01T08:00:00Z"),
  },
];

export const findAll = () => categories;

export const findById = (id) => {
  return categories.find((cat) => cat.id === id);
};

export const create = (categoryData) => {
  const newCategory = {
    id: uuidv4(),
    ...categoryData,
    tourCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  categories.push(newCategory);
  return newCategory;
};

export const update = (id, categoryData) => {
  const index = categories.findIndex((cat) => cat.id === id);

  if (index === -1) {
    return null;
  }

  categories[index] = {
    ...categoryData,
    id,
    tourCount: categories[index].tourCount,
    createdAt: categories[index].createdAt,
    updatedAt: new Date(),
  };

  return categories[index];
};

export const remove = (id) => {
  const index = categories.findIndex((cat) => cat.id === id);

  if (index === -1) {
    return false;
  }

  categories.splice(index, 1);
  return true;
};
