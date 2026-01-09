# WebSocket Server - Disponibilités Temps Réel

## 📋 Description

Serveur WebSocket qui écoute les événements RabbitMQ `tour.availability.low` et diffuse les mises à jour de disponibilité en temps réel à tous les clients connectés.

**Module 5 - Leçon 5.6** : Communication temps réel avec WebSockets

## 🏗️ Architecture

```
┌─────────────────┐      ┌──────────────┐      ┌─────────────────┐
│  Tour Catalog   │─────▶│   RabbitMQ   │─────▶│  WebSocket      │
│     Service     │ pub  │   Exchange   │ sub  │    Server       │
└─────────────────┘      └──────────────┘      └────────┬────────┘
                                                         │
                                                         │ ws://
                                                         │
                                                         ▼
                                              ┌──────────────────┐
                                              │   Frontend       │
                                              │   React Clients  │
                                              └──────────────────┘
```

## 🚀 Démarrage

### Installation

```bash
cd app/websocket-server
npm install
```

### Configuration

Copier `.env.example` vers `.env` et ajuster les valeurs :

```bash
cp .env.example .env
```

### Lancer le serveur

```bash
# Développement avec auto-reload
npm run dev

# Production
npm start
```

## 📡 API WebSocket

### Connexion

```javascript
const ws = new WebSocket("ws://localhost:8080");

ws.onopen = () => {
  console.log("Connecté au serveur WebSocket");
};
```

### Messages entrants

#### Message de connexion

```json
{
  "type": "connection",
  "clientId": "uuid",
  "message": "Connecté au serveur WebSocket - Disponibilités en temps réel",
  "timestamp": "2025-01-09T10:00:00.000Z"
}
```

#### Événement disponibilité faible

```json
{
  "type": "tour.availability.low",
  "data": {
    "tourId": "uuid",
    "tourTitle": "Randonnée Montagne",
    "availableSeats": 3,
    "maxGroupSize": 15,
    "threshold": 3
  },
  "timestamp": "2025-01-09T10:00:00.000Z"
}
```

#### Ping (keep-alive)

```json
{
  "type": "ping",
  "timestamp": "2025-01-09T10:00:00.000Z"
}
```

### Messages sortants

#### Pong (réponse au ping)

```json
{
  "type": "ping"
}
```

## 🏥 Health Check

```bash
curl http://localhost:8080/health
```

Réponse :

```json
{
  "status": "ok",
  "service": "websocket-server",
  "connectedClients": 5,
  "timestamp": "2025-01-09T10:00:00.000Z"
}
```

## 🔧 Configuration

| Variable            | Description                      | Défaut                         |
| ------------------- | -------------------------------- | ------------------------------ |
| `PORT`              | Port du serveur WebSocket        | `8080`                         |
| `RABBITMQ_URL`      | URL de connexion RabbitMQ        | `amqp://guest:guest@localhost` |
| `RABBITMQ_EXCHANGE` | Nom de l'exchange                | `tour_booking_events`          |
| `ALLOWED_ORIGINS`   | Origines CORS (séparées par `,`) | ` `                            |

## 🎯 Fonctionnalités

- ✅ Connexion WebSocket avec authentification CORS
- ✅ Consumer RabbitMQ pour événements `tour.availability.low`
- ✅ Broadcast temps réel à tous les clients connectés
- ✅ Keep-alive avec ping/pong toutes les 30 secondes
- ✅ Health check HTTP endpoint
- ✅ Gestion gracieuse des déconnexions
- ✅ Logging détaillé des événements

## 🧪 Test avec `wscat`

### Installation

```bash
npm install -g wscat
```

### Connexion

```bash
wscat -c ws://localhost:8080
```

### Tester ping/pong

```
> {"type":"ping"}
< {"type":"pong","timestamp":"2025-01-09T10:00:00.000Z"}
```

## 🔗 Intégration Frontend

Exemple React avec hook personnalisé :

```javascript
import { useEffect, useState } from "react";

function useWebSocket(url) {
  const [data, setData] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const ws = new WebSocket(url);

    ws.onopen = () => {
      console.log("WebSocket connecté");
      setConnected(true);
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === "tour.availability.low") {
        setData(message.data);
        // Afficher notification toast
        showNotification(
          `⚠️ ${message.data.tourTitle} - Plus que ${message.data.availableSeats} places !`
        );
      }
    };

    ws.onclose = () => {
      console.log("WebSocket déconnecté");
      setConnected(false);
    };

    // Ping toutes les 25 secondes pour keep-alive
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 25000);

    return () => {
      clearInterval(pingInterval);
      ws.close();
    };
  }, [url]);

  return { data, connected };
}

// Usage dans un composant
function TourList() {
  const { data: lowAvailability, connected } = useWebSocket(
    "ws://localhost:8080"
  );

  return (
    <div>
      <div>Status: {connected ? "🟢 Connecté" : "🔴 Déconnecté"}</div>
      {lowAvailability && (
        <div className="alert">
          ⚠️ {lowAvailability.tourTitle} - Plus que{" "}
          {lowAvailability.availableSeats} places !
        </div>
      )}
    </div>
  );
}
```

## 📊 Métriques

- **Clients connectés** : visible dans le health check
- **Messages diffusés** : loggés dans la console
- **Événements RabbitMQ** : comptés dans les logs

## 🐛 Dépannage

### Le serveur ne démarre pas

- Vérifier que le port 8080 n'est pas déjà utilisé
- Vérifier la connexion à RabbitMQ (doit être démarré)

### Les clients ne reçoivent pas les messages

- Vérifier que RabbitMQ exchange `tour_booking_events` existe
- Vérifier que la queue `websocket_availability_queue` est bien bindée
- Tester manuellement avec `wscat`

### Erreurs CORS

- Ajouter l'origine du frontend dans `ALLOWED_ORIGINS`
- Format : `http://localhost:5173,http://localhost:3000`

## 📚 Ressources

- [WebSocket API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [ws Library](https://github.com/websockets/ws)
- [RabbitMQ Tutorials](https://www.rabbitmq.com/getstarted.html)
