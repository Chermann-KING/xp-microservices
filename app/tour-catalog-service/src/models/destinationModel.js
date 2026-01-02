import { v4 as uuidv4 } from 'uuid';

// Stockage en mémoire des destinations
let destinations = [
  {
    id: 'd7e8f9a0-b1c2-3d4e-5f6a-7b8c9d0e1f2a',
    name: 'Paris',
    country: 'France',
    description: 'La Ville Lumière, capitale de l\'art et de la gastronomie',
    imageUrl: 'https://cdn.example.com/destinations/paris.jpg',
    tourCount: 89,
    createdAt: new Date('2026-01-01T08:00:00Z'),
    updatedAt: new Date('2026-01-01T08:00:00Z')
  },
  {
    id: 'e8f9a0b1-c2d3-4e5f-6a7b-8c9d0e1f2a3b',
    name: 'Serengeti',
    country: 'Tanzanie',
    description: 'Le théâtre de la grande migration africaine',
    imageUrl: 'https://cdn.example.com/destinations/serengeti.jpg',
    tourCount: 24,
    createdAt: new Date('2026-01-01T08:00:00Z'),
    updatedAt: new Date('2026-01-01T08:00:00Z')
  },
  {
    id: 'f9a0b1c2-d3e4-5f6a-7b8c-9d0e1f2a3b4c',
    name: 'Toscane',
    country: 'Italie',
    description: 'Collines verdoyantes, vignobles et art Renaissance',
    imageUrl: 'https://cdn.example.com/destinations/tuscany.jpg',
    tourCount: 45,
    createdAt: new Date('2026-01-01T08:00:00Z'),
    updatedAt: new Date('2026-01-01T08:00:00Z')
  },
  {
    id: 'a0b1c2d3-e4f5-6a7b-8c9d-0e1f2a3b4c5d',
    name: 'Tokyo',
    country: 'Japon',
    description: 'Mélange fascinant de tradition et de modernité',
    imageUrl: 'https://cdn.example.com/destinations/tokyo.jpg',
    tourCount: 67,
    createdAt: new Date('2026-01-01T08:00:00Z'),
    updatedAt: new Date('2026-01-01T08:00:00Z')
  },
  {
    id: 'b1c2d3e4-f5a6-7b8c-9d0e-1f2a3b4c5d6e',
    name: 'New York',
    country: 'États-Unis',
    description: 'La ville qui ne dort jamais',
    imageUrl: 'https://cdn.example.com/destinations/new-york.jpg',
    tourCount: 78,
    createdAt: new Date('2026-01-01T08:00:00Z'),
    updatedAt: new Date('2026-01-01T08:00:00Z')
  }
];

export const findAll = () => destinations;

export const findById = (id) => {
  return destinations.find(dest => dest.id === id);
};

export const create = (destinationData) => {
  const newDestination = {
    id: uuidv4(),
    ...destinationData,
    tourCount: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  destinations.push(newDestination);
  return newDestination;
};

export const update = (id, destinationData) => {
  const index = destinations.findIndex(dest => dest.id === id);

  if (index === -1) {
    return null;
  }

  destinations[index] = {
    ...destinationData,
    id,
    tourCount: destinations[index].tourCount,
    createdAt: destinations[index].createdAt,
    updatedAt: new Date()
  };

  return destinations[index];
};

export const remove = (id) => {
  const index = destinations.findIndex(dest => dest.id === id);

  if (index === -1) {
    return false;
  }

  destinations.splice(index, 1);
  return true;
};
