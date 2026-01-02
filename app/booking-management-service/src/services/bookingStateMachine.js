/**
 * États possibles d'une réservation
 */
export const BookingStatus = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

/**
 * Transitions de statut valides
 */
const validTransitions = {
  [BookingStatus.PENDING]: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED],
  [BookingStatus.CONFIRMED]: [BookingStatus.COMPLETED, BookingStatus.CANCELLED],
  [BookingStatus.COMPLETED]: [],
  [BookingStatus.CANCELLED]: [],
};

/**
 * Vérifie si une transition de statut est valide
 */
export const isValidTransition = (currentStatus, newStatus) => {
  return validTransitions[currentStatus]?.includes(newStatus) || false;
};

/**
 * Obtient les transitions valides depuis un statut donné
 */
export const getValidTransitions = (currentStatus) => {
  return validTransitions[currentStatus] || [];
};

/**
 * Vérifie si une réservation peut être annulée
 */
export const canBeCancelled = (status) => {
  return status === BookingStatus.PENDING || status === BookingStatus.CONFIRMED;
};
