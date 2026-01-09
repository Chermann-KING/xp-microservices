/**
 * TourAvailabilityBadge - Module 5 - Badge de disponibilité en temps réel
 *
 * Badge visuel affichant les places disponibles, mis à jour en temps réel
 * via WebSocket quand des réservations sont faites.
 */

import { useState, useEffect } from "react";
import { useWebSocketEvent } from "../../hooks/useWebSocketEvent";

export default function TourAvailabilityBadge({
  tourId,
  initialAvailableSeats,
  maxGroupSize,
}) {
  const [availableSeats, setAvailableSeats] = useState(initialAvailableSeats);

  // Écouter les mises à jour de disponibilité pour ce tour
  useWebSocketEvent("tour.availability.low", (message) => {
    const { data } = message;

    // Ne mettre à jour que si c'est le même tour
    if (data.tourId === tourId) {
      setAvailableSeats(data.availableSeats);
    }
  });

  // Calculer le pourcentage et la couleur
  const percentage = (availableSeats / maxGroupSize) * 100;
  let badgeColor = "bg-green-100 text-green-800";
  let urgencyText = "";

  if (percentage <= 10) {
    badgeColor = "bg-red-100 text-red-800";
    urgencyText = "🔥 Dernières places !";
  } else if (percentage <= 20) {
    badgeColor = "bg-orange-100 text-orange-800";
    urgencyText = "⚡ Places limitées";
  } else if (percentage <= 50) {
    badgeColor = "bg-yellow-100 text-yellow-800";
  }

  if (availableSeats === 0) {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-200 text-gray-800">
        ❌ Complet
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badgeColor}`}
      >
        {availableSeats} place{availableSeats > 1 ? "s" : ""} disponible
        {availableSeats > 1 ? "s" : ""}
      </span>

      {urgencyText && (
        <span className="text-xs font-semibold text-red-600 animate-pulse">
          {urgencyText}
        </span>
      )}
    </div>
  );
}
