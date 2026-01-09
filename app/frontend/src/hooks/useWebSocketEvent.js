/**
 * useWebSocketEvent - Module 5 - Hook pour écouter des événements WebSocket
 *
 * Hook personnalisé simplifié pour s'abonner à des événements WebSocket spécifiques.
 */

import { useEffect, useState } from "react";
import { useWebSocket } from "../contexts/WebSocketContext";

/**
 * Hook pour écouter un type d'événement WebSocket spécifique
 *
 * @param {string} eventType - Type d'événement à écouter (ex: 'tour.availability.low')
 * @param {function} callback - Fonction appelée quand l'événement arrive (optionnel)
 * @returns {object} Dernier message reçu pour ce type d'événement
 */
export function useWebSocketEvent(eventType, callback) {
  const { subscribe, isConnected } = useWebSocket();
  const [lastEvent, setLastEvent] = useState(null);

  useEffect(() => {
    if (!isConnected) return;

    const handleEvent = (message) => {
      setLastEvent(message);
      if (callback) {
        callback(message);
      }
    };

    const unsubscribe = subscribe(eventType, handleEvent);

    return () => {
      unsubscribe();
    };
  }, [eventType, callback, subscribe, isConnected]);

  return { lastEvent, isConnected };
}

export default useWebSocketEvent;
