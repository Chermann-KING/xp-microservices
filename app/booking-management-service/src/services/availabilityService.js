// Stockage en mémoire de la disponibilité
// Dans une application réelle, cela serait dans une base de données
const availabilityData = new Map();

/**
 * Génère une clé unique pour la disponibilité (tourId + date)
 */
const generateAvailabilityKey = (tourId, date) => {
  const dateStr = new Date(date).toISOString().split("T")[0];
  return `${tourId}_${dateStr}`;
};

/**
 * Initialise la disponibilité pour une visite et une date
 */
export const initializeAvailability = (tourId, date, maxCapacity) => {
  const key = generateAvailabilityKey(tourId, date);
  if (!availabilityData.has(key)) {
    availabilityData.set(key, {
      tourId,
      date,
      maxCapacity,
      bookedSeats: 0,
    });
  }
};

/**
 * Récupère la disponibilité pour une visite à une date donnée
 */
export const getAvailability = (tourId, date, maxCapacity = 20) => {
  const key = generateAvailabilityKey(tourId, date);

  if (!availabilityData.has(key)) {
    initializeAvailability(tourId, date, maxCapacity);
  }

  const availability = availabilityData.get(key);

  return {
    tourId: availability.tourId,
    date: availability.date,
    maxCapacity: availability.maxCapacity,
    bookedSeats: availability.bookedSeats,
    availableSeats: availability.maxCapacity - availability.bookedSeats,
    isAvailable: availability.maxCapacity - availability.bookedSeats > 0,
  };
};

/**
 * Réserve des places pour une visite
 */
export const reserveSeats = (tourId, date, numberOfSeats) => {
  const key = generateAvailabilityKey(tourId, date);
  const availability = availabilityData.get(key);

  if (!availability) {
    throw new Error("Availability not initialized");
  }

  if (availability.maxCapacity - availability.bookedSeats < numberOfSeats) {
    return false;
  }

  availability.bookedSeats += numberOfSeats;
  availabilityData.set(key, availability);
  return true;
};

/**
 * Libère des places pour une visite (lors d'une annulation)
 */
export const releaseSeats = (tourId, date, numberOfSeats) => {
  const key = generateAvailabilityKey(tourId, date);
  const availability = availabilityData.get(key);

  if (!availability) {
    return;
  }

  availability.bookedSeats = Math.max(
    0,
    availability.bookedSeats - numberOfSeats
  );
  availabilityData.set(key, availability);
};
