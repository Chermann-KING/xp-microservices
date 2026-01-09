/**
 * WebSocketContext - Module 5 - WebSocket Real-Time Connection
 *
 * Context global pour partager la connexion WebSocket à travers toute l'app.
 * Gère la connexion, reconnexion automatique, et broadcasting des événements.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";

const WebSocketContext = createContext(null);

// Configuration
const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8080";
const RECONNECT_INTERVAL = 5000; // 5 secondes
const PING_INTERVAL = 25000; // 25 secondes (keep-alive)

export function WebSocketProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const pingIntervalRef = useRef(null);
  const eventListenersRef = useRef(new Map());

  // Fonction de connexion
  const connect = useCallback(() => {
    try {
      console.log("🔌 Connexion WebSocket...", WS_URL);
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        console.log("✅ WebSocket connecté");
        setIsConnected(true);

        // Démarrer le keep-alive ping
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, PING_INTERVAL);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log("📩 Message WebSocket reçu:", message);

          // Ignorer les pongs
          if (message.type === "pong") return;

          // Mettre à jour le dernier message
          setLastMessage(message);

          // Notifier les listeners spécifiques
          const listeners = eventListenersRef.current.get(message.type) || [];
          listeners.forEach((callback) => callback(message));

          // Notifier les listeners globaux
          const globalListeners = eventListenersRef.current.get("*") || [];
          globalListeners.forEach((callback) => callback(message));
        } catch (error) {
          console.error("❌ Erreur parsing message WebSocket:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("❌ Erreur WebSocket:", error);
      };

      ws.onclose = () => {
        console.log("❌ WebSocket déconnecté");
        setIsConnected(false);

        // Nettoyer le ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // Reconnecter après un délai
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log("🔄 Tentative de reconnexion...");
          connect();
        }, RECONNECT_INTERVAL);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("❌ Erreur création WebSocket:", error);

      // Retry après délai
      reconnectTimeoutRef.current = setTimeout(connect, RECONNECT_INTERVAL);
    }
  }, []);

  // Fonction de déconnexion
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  // Envoyer un message
  const send = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
      return true;
    }
    console.warn("⚠️ WebSocket non connecté, impossible d'envoyer");
    return false;
  }, []);

  // S'abonner à un type d'événement
  const subscribe = useCallback((eventType, callback) => {
    const listeners = eventListenersRef.current.get(eventType) || [];
    listeners.push(callback);
    eventListenersRef.current.set(eventType, listeners);

    // Retourner une fonction de désabonnement
    return () => {
      const updatedListeners = eventListenersRef.current.get(eventType) || [];
      const index = updatedListeners.indexOf(callback);
      if (index > -1) {
        updatedListeners.splice(index, 1);
        eventListenersRef.current.set(eventType, updatedListeners);
      }
    };
  }, []);

  // Connexion au montage
  useEffect(() => {
    connect();

    // Cleanup à la déconnexion
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  const value = {
    isConnected,
    lastMessage,
    send,
    subscribe,
    connect,
    disconnect,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

// Hook personnalisé pour utiliser le WebSocket
export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error(
      "useWebSocket doit être utilisé à l'intérieur de WebSocketProvider"
    );
  }
  return context;
}

export default WebSocketContext;
