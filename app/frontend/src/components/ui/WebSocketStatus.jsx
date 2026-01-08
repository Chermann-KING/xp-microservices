/**
 * WebSocketStatus - Module 5 - Indicateur de connexion WebSocket
 *
 * Composant visuel affichant l'état de la connexion WebSocket.
 * Peut être placé dans le header/footer.
 */

import { useWebSocket } from "../../contexts/WebSocketContext";

export default function WebSocketStatus() {
  const { isConnected } = useWebSocket();

  return (
    <div className="flex items-center gap-2 text-sm">
      <div
        className={`w-2 h-2 rounded-full ${
          isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
        }`}
        title={isConnected ? "WebSocket connecté" : "WebSocket déconnecté"}
      />
      <span className="hidden sm:inline text-gray-600">
        {isConnected ? "Temps réel activé" : "Hors ligne"}
      </span>
    </div>
  );
}
