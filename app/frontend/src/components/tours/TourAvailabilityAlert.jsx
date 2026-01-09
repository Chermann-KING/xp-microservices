/**
 * TourAvailabilityAlert - Module 5 - Alerte disponibilité tours
 *
 * Composant qui écoute les événements WebSocket 'tour.availability.low'
 * et affiche une alerte toast + notification système.
 */

import { useEffect, useContext } from "react";
import { useWebSocketEvent } from "../../hooks/useWebSocketEvent";
import { useNotifications } from "../../hooks/useNotifications";
import { NotificationContext } from "../../contexts/NotificationContext";
import { NOTIFICATION_TYPES } from "../../contexts/NotificationContext";

export default function TourAvailabilityAlert() {
  const { addNotification } = useContext(NotificationContext);
  const { showNotification } = useNotifications();

  // Écouter les événements de disponibilité faible
  const { lastEvent } = useWebSocketEvent(
    "tour.availability.low",
    (message) => {
      const { data } = message;

      console.log("⚠️ Disponibilité faible détectée:", data);

      // Toast dans l'application
      addNotification({
        type: NOTIFICATION_TYPES.WARNING,
        title: "⚠️ Places limitées !",
        message: `${data.tourTitle} - Plus que ${data.availableSeats} place${
          data.availableSeats > 1 ? "s" : ""
        } disponible${data.availableSeats > 1 ? "s" : ""} !`,
        duration: 8000, // 8 secondes
      });

      // Notification système (si permission accordée)
      showNotification("Places limitées !", {
        body: `${data.tourTitle} - Plus que ${data.availableSeats} places !`,
        icon: "/tour-icon.png",
        tag: `tour-${data.tourId}`,
        requireInteraction: true,
        vibrate: [200, 100, 200],
        duration: 10000,
        onClick: () => {
          // Rediriger vers la page du tour
          window.location.href = `/tours/${data.tourId}`;
        },
      });
    }
  );

  // Afficher le nombre d'alertes reçues (debug)
  useEffect(() => {
    if (lastEvent) {
      console.log("🔔 Dernière alerte de disponibilité:", lastEvent.data);
    }
  }, [lastEvent]);

  // Ce composant ne rend rien visuellement (seulement logique)
  return null;
}
