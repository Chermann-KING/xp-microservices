# Leçon 5.6 : Création de Fonctionnalités Temps Réel avec WebSockets pour la Disponibilité des Tours

**Module 5** : Architecture Event-Driven et Communication Asynchrone

---

## 📋 Objectifs d'Apprentissage

À la fin de cette leçon, vous serez capable de :

1. ✅ Comprendre les **fondamentaux des WebSockets** et leur utilité dans les microservices
2. ✅ Implémenter un **serveur WebSocket en Node.js** avec la bibliothèque `ws`
3. ✅ Intégrer les WebSockets avec **RabbitMQ** pour propager les mises à jour en temps réel
4. ✅ Créer un **client React** qui écoute les événements temps réel
5. ✅ Gérer les **reconnexions et l'état initial** dans les applications temps réel
6. ✅ Identifier les **cas d'usage réels** des WebSockets dans les systèmes distribués

---

## 🎯 Pourquoi les WebSockets pour les Mises à Jour Temps Réel ?

### Le Problème avec le Polling HTTP

Dans les approches traditionnelles, les clients **interrogent périodiquement** le serveur pour vérifier les mises à jour :

```javascript
// ❌ Approche inefficace : Polling toutes les 2 secondes
setInterval(async () => {
  const response = await fetch("/api/tours/availability");
  const data = await response.json();
  updateUI(data);
}, 2000);
```

**Problèmes** :

- ⚠️ **Latence élevée** : Mises à jour retardées jusqu'au prochain cycle de polling
- ⚠️ **Gaspillage de bande passante** : Requêtes inutiles même sans changement
- ⚠️ **Charge serveur** : Connexions HTTP répétées pour chaque client
- ⚠️ **Non scalable** : Augmente linéairement avec le nombre de clients

### Solution : WebSockets

Les WebSockets fournissent une **connexion bidirectionnelle persistante** entre le client et le serveur :

```javascript
// ✅ Approche efficace : WebSocket avec mises à jour push
const ws = new WebSocket("ws://localhost:8080");

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  updateUI(data); // Mise à jour instantanée
};
```

**Avantages** :

- ✅ **Latence ultra-faible** : Mises à jour instantanées (< 50ms)
- ✅ **Communication full-duplex** : Envoi et réception simultanés
- ✅ **Connexion persistante** : Pas de overhead de reconnexion HTTP
- ✅ **Efficacité réseau** : Messages légers sans en-têtes HTTP complets

---

## 🔧 Partie 1 : Comprendre le Protocole WebSocket

### 1.1 La Poignée de Main (Handshake) WebSocket

Le WebSocket commence par une **poignée de main HTTP** qui est ensuite **mise à niveau** vers le protocole WebSocket :

#### Requête du Client

```http
GET /websocket HTTP/1.1
Host: localhost:8080
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
```

#### Réponse du Serveur

```http
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

Une fois mise à niveau, la connexion devient une **socket TCP persistante** permettant une communication bidirectionnelle.

### 1.2 Format des Messages WebSocket

Les WebSockets supportent deux types de données :

- **Text** : Chaînes de caractères UTF-8 (typiquement JSON)
- **Binary** : Données binaires brutes (images, fichiers, etc.)

```javascript
// Message texte (JSON)
ws.send(
  JSON.stringify({
    type: "AVAILABILITY_UPDATE",
    tourId: "tour_123",
    availableSeats: 15,
  })
);

// Message binaire
const buffer = new ArrayBuffer(8);
ws.send(buffer);
```

---

## 🚀 Partie 2 : Implémentation d'un Serveur WebSocket

### 2.1 Configuration du Serveur avec la Bibliothèque `ws`

Installons la bibliothèque `ws` pour Node.js :

```bash
npm install ws
```

#### Serveur WebSocket de Base

```javascript
// websocket-server.js
const WebSocket = require("ws");

// Créer un serveur WebSocket sur le port 8080
const wss = new WebSocket.Server({ port: 8080 });

wss.on("connection", (ws) => {
  console.log("✅ Nouveau client connecté");

  // Envoyer un message de bienvenue
  ws.send(
    JSON.stringify({
      type: "WELCOME",
      message: "Connecté au serveur de mises à jour temps réel",
    })
  );

  // Écouter les messages du client
  ws.on("message", (message) => {
    console.log("📩 Message reçu:", message.toString());
  });

  // Gérer la déconnexion
  ws.on("close", () => {
    console.log("❌ Client déconnecté");
  });
});

console.log("🚀 Serveur WebSocket démarré sur ws://localhost:8080");
```

### 2.2 Diffusion de Mises à Jour à Tous les Clients

Pour envoyer un message à **tous les clients connectés** :

```javascript
// websocket-server.js
const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8080 });

// Fonction de diffusion
function broadcast(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

wss.on("connection", (ws) => {
  console.log("✅ Nouveau client connecté");

  ws.send(
    JSON.stringify({
      type: "WELCOME",
      message: "Connecté au serveur temps réel",
    })
  );

  ws.on("message", (message) => {
    console.log("📩 Message reçu:", message.toString());
  });

  ws.on("close", () => {
    console.log("❌ Client déconnecté");
  });
});

// Simulation de mises à jour de disponibilité toutes les 5 secondes
setInterval(() => {
  const update = {
    type: "AVAILABILITY_UPDATE",
    tourId: "tour_123",
    availableSeats: Math.floor(Math.random() * 20) + 1,
    timestamp: new Date().toISOString(),
  };

  console.log("📢 Diffusion de mise à jour:", update);
  broadcast(update);
}, 5000);

console.log("🚀 Serveur WebSocket démarré sur ws://localhost:8080");
```

---

## 🔗 Partie 3 : Intégration avec RabbitMQ

### 3.1 Architecture : RabbitMQ → WebSocket → Clients

Dans une architecture microservices, les **événements de disponibilité** proviennent de RabbitMQ. Le serveur WebSocket **écoute ces événements** et les **diffuse aux clients**.

```
┌─────────────────┐
│  Tour Service   │
│  (Publisher)    │
└────────┬────────┘
         │
         │ Publie : tour.availability.updated
         ▼
┌─────────────────┐
│   RabbitMQ      │
│  (Exchange)     │
└────────┬────────┘
         │
         │ Consomme
         ▼
┌─────────────────┐
│ WebSocket       │
│ Server          │
│ (Consumer)      │
└────────┬────────┘
         │
         │ Diffuse via WebSocket
         ▼
┌─────────────────┐
│  React Client   │
│  (UI Update)    │
└─────────────────┘
```

### 3.2 Implémentation : Consommation RabbitMQ + Diffusion WebSocket

```javascript
// websocket-server.js
const WebSocket = require("ws");
const amqp = require("amqplib");

const wss = new WebSocket.Server({ port: 8080 });

// Fonction de diffusion
function broadcast(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// Gestion des connexions WebSocket
wss.on("connection", (ws) => {
  console.log("✅ Nouveau client connecté");

  ws.send(
    JSON.stringify({
      type: "WELCOME",
      message: "Connecté aux mises à jour temps réel",
    })
  );

  ws.on("close", () => {
    console.log("❌ Client déconnecté");
  });
});

// Connexion à RabbitMQ et écoute des événements
async function startRabbitMQConsumer() {
  try {
    const connection = await amqp.connect("amqp://localhost");
    const channel = await connection.createChannel();

    const exchange = "tour_booking_events";
    const queue = "websocket_availability_updates";
    const routingKey = "tour.availability.updated";

    await channel.assertExchange(exchange, "topic", { durable: true });
    await channel.assertQueue(queue, { durable: true });
    await channel.bindQueue(queue, exchange, routingKey);

    console.log("🐰 Consommateur RabbitMQ démarré. En attente d'événements...");

    channel.consume(queue, (msg) => {
      if (msg !== null) {
        const event = JSON.parse(msg.content.toString());
        console.log("📩 Événement reçu de RabbitMQ:", event);

        // Diffuser l'événement à tous les clients WebSocket
        broadcast({
          type: "AVAILABILITY_UPDATE",
          tourId: event.tourId,
          availableSeats: event.availableSeats,
          timestamp: event.timestamp,
        });

        channel.ack(msg);
      }
    });
  } catch (error) {
    console.error("❌ Erreur de connexion RabbitMQ:", error);
  }
}

// Démarrer le serveur
console.log("🚀 Serveur WebSocket démarré sur ws://localhost:8080");
startRabbitMQConsumer();
```

### 3.3 Publication d'Événements depuis le Tour Service

Voici comment le Tour Service publie les mises à jour de disponibilité :

```javascript
// tour-service/src/events/availability-publisher.js
const amqp = require("amqplib");

class AvailabilityPublisher {
  constructor() {
    this.connection = null;
    this.channel = null;
  }

  async connect() {
    this.connection = await amqp.connect("amqp://localhost");
    this.channel = await this.connection.createChannel();

    const exchange = "tour_booking_events";
    await this.channel.assertExchange(exchange, "topic", { durable: true });
  }

  async publishAvailabilityUpdate(tourId, availableSeats) {
    const event = {
      eventId: `evt_${Date.now()}`,
      eventType: "tour.availability.updated",
      tourId,
      availableSeats,
      timestamp: new Date().toISOString(),
    };

    this.channel.publish(
      "tour_booking_events",
      "tour.availability.updated",
      Buffer.from(JSON.stringify(event)),
      { persistent: true }
    );

    console.log("📢 Événement publié:", event);
  }
}

module.exports = new AvailabilityPublisher();
```

#### Utilisation dans le Tour Service

```javascript
// tour-service/src/routes/tours.js
const express = require("express");
const router = express.Router();
const Tour = require("../models/Tour");
const availabilityPublisher = require("../events/availability-publisher");

// Initialiser la connexion RabbitMQ au démarrage
availabilityPublisher.connect();

// Endpoint pour réserver un tour
router.post("/tours/:id/book", async (req, res) => {
  const { id } = req.params;
  const { seatsToBook } = req.body;

  try {
    const tour = await Tour.findByPk(id);

    if (!tour) {
      return res.status(404).json({ error: "Tour non trouvé" });
    }

    if (tour.available_seats < seatsToBook) {
      return res.status(400).json({ error: "Pas assez de places disponibles" });
    }

    // Mettre à jour la disponibilité
    tour.available_seats -= seatsToBook;
    await tour.save();

    // Publier l'événement de mise à jour
    await availabilityPublisher.publishAvailabilityUpdate(
      tour.id,
      tour.available_seats
    );

    res.json({
      message: "Réservation réussie",
      tour: {
        id: tour.id,
        name: tour.name,
        availableSeats: tour.available_seats,
      },
    });
  } catch (error) {
    console.error("❌ Erreur lors de la réservation:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
```

---

## 💻 Partie 4 : Implémentation d'un Client React

### 4.1 Composant React avec Hook WebSocket

```javascript
// frontend/src/components/TourAvailability.jsx
import React, { useState, useEffect } from "react";

function TourAvailability({ tourId }) {
  const [availableSeats, setAvailableSeats] = useState(null);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    // Connexion au serveur WebSocket
    const ws = new WebSocket("ws://localhost:8080");

    ws.onopen = () => {
      console.log("✅ Connecté au serveur WebSocket");
      setConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("📩 Message reçu:", data);

      if (data.type === "AVAILABILITY_UPDATE" && data.tourId === tourId) {
        setAvailableSeats(data.availableSeats);
        setLastUpdate(new Date(data.timestamp));
      }
    };

    ws.onerror = (error) => {
      console.error("❌ Erreur WebSocket:", error);
    };

    ws.onclose = () => {
      console.log("❌ Déconnecté du serveur WebSocket");
      setConnected(false);
    };

    // Nettoyage : fermer la connexion lors du démontage
    return () => {
      ws.close();
    };
  }, [tourId]);

  return (
    <div className="tour-availability">
      <h2>Disponibilité en Temps Réel</h2>

      <div className={`status ${connected ? "connected" : "disconnected"}`}>
        {connected ? "🟢 Connecté" : "🔴 Déconnecté"}
      </div>

      {availableSeats !== null ? (
        <div className="availability-info">
          <p className="seats">
            <strong>{availableSeats}</strong> places disponibles
          </p>
          {lastUpdate && (
            <p className="last-update">
              Dernière mise à jour : {lastUpdate.toLocaleTimeString()}
            </p>
          )}
        </div>
      ) : (
        <p>En attente des données...</p>
      )}
    </div>
  );
}

export default TourAvailability;
```

### 4.2 Styles CSS

```css
/* frontend/src/components/TourAvailability.css */
.tour-availability {
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  max-width: 400px;
  margin: 20px auto;
  font-family: Arial, sans-serif;
}

.tour-availability h2 {
  margin-top: 0;
  color: #333;
}

.status {
  display: inline-block;
  padding: 5px 15px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 15px;
}

.status.connected {
  background-color: #d4edda;
  color: #155724;
}

.status.disconnected {
  background-color: #f8d7da;
  color: #721c24;
}

.availability-info {
  background-color: #f8f9fa;
  padding: 15px;
  border-radius: 5px;
  text-align: center;
}

.seats {
  font-size: 24px;
  margin: 10px 0;
  color: #007bff;
}

.last-update {
  font-size: 12px;
  color: #6c757d;
  margin: 5px 0 0 0;
}
```

---

## 🔄 Partie 5 : Gestion de l'État Initial et des Reconnexions

### 5.1 Problème : État Initial Manquant

Lorsqu'un client se connecte, il **ne reçoit que les événements futurs**. Il n'a pas l'état actuel de la disponibilité.

**Solution** : Envoyer l'**état initial** immédiatement après la connexion.

### 5.2 Implémentation : Envoi de l'État Initial

#### Serveur WebSocket Amélioré

```javascript
// websocket-server.js (amélioré)
const WebSocket = require("ws");
const amqp = require("amqplib");
const axios = require("axios");

const wss = new WebSocket.Server({ port: 8080 });

// Fonction de diffusion
function broadcast(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// Gestion des connexions WebSocket
wss.on("connection", async (ws) => {
  console.log("✅ Nouveau client connecté");

  // Envoyer un message de bienvenue
  ws.send(
    JSON.stringify({
      type: "WELCOME",
      message: "Connecté aux mises à jour temps réel",
    })
  );

  // Récupérer et envoyer l'état initial de tous les tours
  try {
    const response = await axios.get("http://localhost:3001/api/tours");
    const tours = response.data;

    tours.forEach((tour) => {
      ws.send(
        JSON.stringify({
          type: "INITIAL_STATE",
          tourId: tour.id,
          availableSeats: tour.available_seats,
          timestamp: new Date().toISOString(),
        })
      );
    });

    console.log("📦 État initial envoyé au client");
  } catch (error) {
    console.error(
      "❌ Erreur lors de la récupération de l'état initial:",
      error
    );
  }

  ws.on("close", () => {
    console.log("❌ Client déconnecté");
  });
});

// Connexion à RabbitMQ et écoute des événements
async function startRabbitMQConsumer() {
  try {
    const connection = await amqp.connect("amqp://localhost");
    const channel = await connection.createChannel();

    const exchange = "tour_booking_events";
    const queue = "websocket_availability_updates";
    const routingKey = "tour.availability.updated";

    await channel.assertExchange(exchange, "topic", { durable: true });
    await channel.assertQueue(queue, { durable: true });
    await channel.bindQueue(queue, exchange, routingKey);

    console.log("🐰 Consommateur RabbitMQ démarré. En attente d'événements...");

    channel.consume(queue, (msg) => {
      if (msg !== null) {
        const event = JSON.parse(msg.content.toString());
        console.log("📩 Événement reçu de RabbitMQ:", event);

        // Diffuser l'événement à tous les clients WebSocket
        broadcast({
          type: "AVAILABILITY_UPDATE",
          tourId: event.tourId,
          availableSeats: event.availableSeats,
          timestamp: event.timestamp,
        });

        channel.ack(msg);
      }
    });
  } catch (error) {
    console.error("❌ Erreur de connexion RabbitMQ:", error);
  }
}

// Démarrer le serveur
console.log("🚀 Serveur WebSocket démarré sur ws://localhost:8080");
startRabbitMQConsumer();
```

### 5.3 Client React avec Gestion de l'État Initial

```javascript
// frontend/src/components/TourAvailability.jsx (amélioré)
import React, { useState, useEffect } from "react";

function TourAvailability({ tourId }) {
  const [availableSeats, setAvailableSeats] = useState(null);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8080");

    ws.onopen = () => {
      console.log("✅ Connecté au serveur WebSocket");
      setConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("📩 Message reçu:", data);

      // Gérer l'état initial
      if (data.type === "INITIAL_STATE" && data.tourId === tourId) {
        setAvailableSeats(data.availableSeats);
        setLastUpdate(new Date(data.timestamp));
      }

      // Gérer les mises à jour en temps réel
      if (data.type === "AVAILABILITY_UPDATE" && data.tourId === tourId) {
        setAvailableSeats(data.availableSeats);
        setLastUpdate(new Date(data.timestamp));
      }
    };

    ws.onerror = (error) => {
      console.error("❌ Erreur WebSocket:", error);
    };

    ws.onclose = () => {
      console.log("❌ Déconnecté du serveur WebSocket");
      setConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [tourId]);

  return (
    <div className="tour-availability">
      <h2>Disponibilité en Temps Réel</h2>

      <div className={`status ${connected ? "connected" : "disconnected"}`}>
        {connected ? "🟢 Connecté" : "🔴 Déconnecté"}
      </div>

      {availableSeats !== null ? (
        <div className="availability-info">
          <p className="seats">
            <strong>{availableSeats}</strong> places disponibles
          </p>
          {lastUpdate && (
            <p className="last-update">
              Dernière mise à jour : {lastUpdate.toLocaleTimeString()}
            </p>
          )}
        </div>
      ) : (
        <p>En attente des données...</p>
      )}
    </div>
  );
}

export default TourAvailability;
```

### 5.4 Gestion des Reconnexions Automatiques

Pour gérer les déconnexions réseau, implémentons une **reconnexion automatique** avec backoff exponentiel :

```javascript
// frontend/src/hooks/useWebSocket.js
import { useState, useEffect, useRef } from "react";

function useWebSocket(url) {
  const [data, setData] = useState(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);

  const connect = () => {
    const ws = new WebSocket(url);

    ws.onopen = () => {
      console.log("✅ Connecté au serveur WebSocket");
      setConnected(true);
      reconnectAttemptsRef.current = 0; // Réinitialiser les tentatives
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setData(message);
    };

    ws.onerror = (error) => {
      console.error("❌ Erreur WebSocket:", error);
    };

    ws.onclose = () => {
      console.log("❌ Déconnecté du serveur WebSocket");
      setConnected(false);

      // Reconnexion automatique avec backoff exponentiel
      const delay = Math.min(
        1000 * Math.pow(2, reconnectAttemptsRef.current),
        30000
      );
      console.log(`🔄 Tentative de reconnexion dans ${delay}ms...`);

      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectAttemptsRef.current += 1;
        connect();
      }, delay);
    };

    wsRef.current = ws;
  };

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [url]);

  return { data, connected };
}

export default useWebSocket;
```

#### Utilisation du Hook Personnalisé

```javascript
// frontend/src/components/TourAvailability.jsx
import React, { useState, useEffect } from "react";
import useWebSocket from "../hooks/useWebSocket";

function TourAvailability({ tourId }) {
  const [availableSeats, setAvailableSeats] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const { data, connected } = useWebSocket("ws://localhost:8080");

  useEffect(() => {
    if (data && data.tourId === tourId) {
      if (
        data.type === "INITIAL_STATE" ||
        data.type === "AVAILABILITY_UPDATE"
      ) {
        setAvailableSeats(data.availableSeats);
        setLastUpdate(new Date(data.timestamp));
      }
    }
  }, [data, tourId]);

  return (
    <div className="tour-availability">
      <h2>Disponibilité en Temps Réel</h2>

      <div className={`status ${connected ? "connected" : "disconnected"}`}>
        {connected ? "🟢 Connecté" : "🔴 Déconnecté"}
      </div>

      {availableSeats !== null ? (
        <div className="availability-info">
          <p className="seats">
            <strong>{availableSeats}</strong> places disponibles
          </p>
          {lastUpdate && (
            <p className="last-update">
              Dernière mise à jour : {lastUpdate.toLocaleTimeString()}
            </p>
          )}
        </div>
      ) : (
        <p>En attente des données...</p>
      )}
    </div>
  );
}

export default TourAvailability;
```

---

## 🧪 Partie 6 : Tests et Débogage

### 6.1 Test du Serveur WebSocket avec `wscat`

Installez `wscat` pour tester manuellement :

```bash
npm install -g wscat
```

Connectez-vous au serveur :

```bash
wscat -c ws://localhost:8080
```

Vous devriez voir :

```
Connected (press CTRL+C to quit)
< {"type":"WELCOME","message":"Connecté aux mises à jour temps réel"}
< {"type":"INITIAL_STATE","tourId":"tour_123","availableSeats":15,"timestamp":"2025-01-08T10:30:00.000Z"}
```

### 6.2 Simulation de Publication RabbitMQ

Testez la publication d'événements depuis le Tour Service :

```javascript
// test/publish-availability-event.js
const amqp = require("amqplib");

async function publishTestEvent() {
  const connection = await amqp.connect("amqp://localhost");
  const channel = await connection.createChannel();

  const exchange = "tour_booking_events";
  await channel.assertExchange(exchange, "topic", { durable: true });

  const event = {
    eventId: `evt_${Date.now()}`,
    eventType: "tour.availability.updated",
    tourId: "tour_123",
    availableSeats: 8,
    timestamp: new Date().toISOString(),
  };

  channel.publish(
    exchange,
    "tour.availability.updated",
    Buffer.from(JSON.stringify(event)),
    { persistent: true }
  );

  console.log("📢 Événement de test publié:", event);

  setTimeout(() => {
    connection.close();
    process.exit(0);
  }, 500);
}

publishTestEvent();
```

Exécutez le test :

```bash
node test/publish-availability-event.js
```

Vérifiez que le serveur WebSocket diffuse l'événement et que le client React met à jour l'UI.

---

## 📊 Partie 7 : Cas d'Usage Réels des WebSockets

### 7.1 Notifications en Temps Réel

Envoyez des notifications instantanées aux utilisateurs :

```javascript
// Notification de nouvelle réservation
{
  type: 'BOOKING_CONFIRMED',
  bookingId: 'booking_456',
  tourName: 'Paris City Tour',
  message: 'Votre réservation est confirmée !',
  timestamp: '2025-01-08T10:35:00.000Z'
}
```

### 7.2 Tableaux de Bord d'Administration

Surveillez l'activité système en temps réel :

```javascript
// Métriques système
{
  type: 'METRICS_UPDATE',
  activeBookings: 42,
  totalRevenue: 8500.50,
  activeUsers: 120,
  timestamp: '2025-01-08T10:36:00.000Z'
}
```

### 7.3 Chat Support Client

Implémentez un chat en direct entre clients et support :

```javascript
// Message de chat
{
  type: 'CHAT_MESSAGE',
  from: 'support_agent_1',
  to: 'user_789',
  message: 'Bonjour ! Comment puis-je vous aider ?',
  timestamp: '2025-01-08T10:37:00.000Z'
}
```

### 7.4 Mises à Jour Collaboratives

Synchronisez l'état entre plusieurs utilisateurs (style Google Docs) :

```javascript
// Modification de document partagée
{
  type: 'DOCUMENT_EDIT',
  documentId: 'doc_101',
  userId: 'user_202',
  changes: { field: 'description', value: 'Updated text...' },
  timestamp: '2025-01-08T10:38:00.000Z'
}
```

---

## 🔒 Partie 8 : Sécurité et Bonnes Pratiques

### 8.1 Authentification WebSocket

Utilisez des **tokens JWT** pour authentifier les connexions :

```javascript
// Client : Envoyer le token lors de la connexion
const token = localStorage.getItem("authToken");
const ws = new WebSocket(`ws://localhost:8080?token=${token}`);
```

```javascript
// Serveur : Vérifier le token
const jwt = require("jsonwebtoken");
const url = require("url");

wss.on("connection", (ws, req) => {
  const params = url.parse(req.url, true).query;
  const token = params.token;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    ws.userId = decoded.userId; // Associer l'utilisateur à la connexion
    console.log(`✅ Utilisateur ${ws.userId} connecté`);
  } catch (error) {
    console.error("❌ Token invalide");
    ws.close();
    return;
  }

  // Suite de la logique...
});
```

### 8.2 Limitation de Débit (Rate Limiting)

Empêchez les clients d'envoyer trop de messages :

```javascript
const rateLimitMap = new Map();

wss.on("connection", (ws) => {
  const clientId = ws.userId || "anonymous";
  rateLimitMap.set(clientId, { count: 0, resetTime: Date.now() + 60000 });

  ws.on("message", (message) => {
    const limit = rateLimitMap.get(clientId);

    if (Date.now() > limit.resetTime) {
      limit.count = 0;
      limit.resetTime = Date.now() + 60000;
    }

    if (limit.count > 100) {
      ws.send(
        JSON.stringify({ type: "ERROR", message: "Rate limit exceeded" })
      );
      return;
    }

    limit.count += 1;

    // Traiter le message...
  });
});
```

### 8.3 Validation des Messages

Validez toujours les messages entrants :

```javascript
const Joi = require("joi");

const messageSchema = Joi.object({
  type: Joi.string().valid("SUBSCRIBE", "UNSUBSCRIBE").required(),
  tourId: Joi.string().required(),
});

ws.on("message", (message) => {
  const { error, value } = messageSchema.validate(JSON.parse(message));

  if (error) {
    ws.send(
      JSON.stringify({ type: "ERROR", message: "Invalid message format" })
    );
    return;
  }

  // Traiter le message valide...
});
```

### 8.4 Gestion de la Mémoire

Nettoyez les ressources lorsque les clients se déconnectent :

```javascript
const subscriptions = new Map(); // tourId -> Set(clients)

wss.on("connection", (ws) => {
  ws.subscribedTours = new Set();

  ws.on("close", () => {
    // Nettoyer les abonnements
    ws.subscribedTours.forEach((tourId) => {
      const clients = subscriptions.get(tourId);
      if (clients) {
        clients.delete(ws);
        if (clients.size === 0) {
          subscriptions.delete(tourId);
        }
      }
    });
  });
});
```

---

## 🎓 Exercices Pratiques

### Exercice 1 : Serveur WebSocket de Base

**Objectif** : Créer un serveur WebSocket qui diffuse un nombre aléatoire toutes les 3 secondes.

**Instructions** :

1. Créez un fichier `websocket-server.js`
2. Démarrez un serveur WebSocket sur le port 8080
3. Envoyez un message de bienvenue aux nouveaux clients
4. Diffusez un nombre aléatoire entre 1 et 100 toutes les 3 secondes

**Format du message** :

```json
{
  "type": "RANDOM_NUMBER",
  "value": 42,
  "timestamp": "2025-01-08T10:40:00.000Z"
}
```

---

### Exercice 2 : Client React pour Nombres Aléatoires

**Objectif** : Créer un composant React qui affiche les nombres aléatoires reçus.

**Instructions** :

1. Créez un composant `RandomNumberDisplay.jsx`
2. Connectez-vous au serveur WebSocket de l'exercice 1
3. Affichez le nombre actuel avec un indicateur de connexion
4. Affichez l'historique des 10 derniers nombres reçus

**Interface attendue** :

```
┌─────────────────────────────────┐
│  Nombre Aléatoire en Temps Réel │
│                                 │
│  🟢 Connecté                    │
│                                 │
│  Nombre actuel : 42             │
│  Reçu à : 10:40:15              │
│                                 │
│  Historique :                   │
│  • 42 (10:40:15)                │
│  • 78 (10:40:12)                │
│  • 23 (10:40:09)                │
│  ...                            │
└─────────────────────────────────┘
```

---

### Exercice 3 : Disponibilité de Tours avec Données Mock

**Objectif** : Étendre le serveur WebSocket pour diffuser la disponibilité de plusieurs tours avec des données simulées.

**Instructions** :

1. Modifiez `websocket-server.js` pour gérer 3 tours :
   - `tour_paris` : Paris City Tour
   - `tour_london` : London Eye Experience
   - `tour_rome` : Rome Colosseum Tour
2. Toutes les 5 secondes, diminuez aléatoirement les places disponibles d'un tour (entre 1 et 3)
3. Les places ne peuvent pas être négatives (min: 0)
4. Diffusez l'événement aux clients

**Format du message** :

```json
{
  "type": "AVAILABILITY_UPDATE",
  "tourId": "tour_paris",
  "tourName": "Paris City Tour",
  "availableSeats": 12,
  "timestamp": "2025-01-08T10:42:00.000Z"
}
```

---

### Exercice 4 : Tableau de Bord Multi-Tours

**Objectif** : Créer un composant React affichant la disponibilité de tous les tours en temps réel.

**Instructions** :

1. Créez un composant `TourDashboard.jsx`
2. Connectez-vous au serveur WebSocket de l'exercice 3
3. Affichez une carte pour chaque tour avec :
   - Nom du tour
   - Places disponibles
   - Indicateur visuel (vert si > 10, orange si 5-10, rouge si < 5)
   - Dernière mise à jour

**Interface attendue** :

```
┌─────────────────────────────────────────────────────────┐
│             Tableau de Bord des Tours                    │
│                                                           │
│  ┌───────────────────┐ ┌───────────────────┐            │
│  │ Paris City Tour   │ │ London Eye        │            │
│  │ 🟢 15 places      │ │ 🟠 7 places       │            │
│  │ Mis à jour: 10:42 │ │ Mis à jour: 10:43 │            │
│  └───────────────────┘ └───────────────────┘            │
│                                                           │
│  ┌───────────────────┐                                   │
│  │ Rome Colosseum    │                                   │
│  │ 🔴 2 places       │                                   │
│  │ Mis à jour: 10:44 │                                   │
│  └───────────────────┘                                   │
└─────────────────────────────────────────────────────────┘
```

---

## 📚 Ressources Supplémentaires

### Documentation Officielle

- **WebSocket API (MDN)** : [https://developer.mozilla.org/en-US/docs/Web/API/WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- **ws Library (Node.js)** : [https://github.com/websockets/ws](https://github.com/websockets/ws)
- **RFC 6455 (WebSocket Protocol)** : [https://tools.ietf.org/html/rfc6455](https://tools.ietf.org/html/rfc6455)

### Articles et Tutoriels

- **Real-Time Web Applications with WebSockets** : [https://www.smashingmagazine.com/2018/02/sse-websockets-data-flow-http2/](https://www.smashingmagazine.com/2018/02/sse-websockets-data-flow-http2/)
- **Building Scalable WebSocket Servers** : [https://blog.bitsrc.io/building-scalable-websocket-servers-with-node-js-ae1d2f7c1c42](https://blog.bitsrc.io/building-scalable-websocket-servers-with-node-js-ae1d2f7c1c42)

### Alternatives aux WebSockets

- **Server-Sent Events (SSE)** : Unidirectionnel (serveur → client), plus simple pour les notifications
- **Long Polling** : Compatible avec HTTP/1.1, mais moins efficace
- **WebRTC** : Pour la communication peer-to-peer (vidéo, audio, données)

---

## 🎯 Résumé

Dans cette leçon, vous avez appris :

1. ✅ **Pourquoi les WebSockets** sont essentiels pour les mises à jour temps réel
2. ✅ **Comment fonctionne le protocole WebSocket** (handshake, messages)
3. ✅ **Implémentation d'un serveur WebSocket** avec la bibliothèque `ws` en Node.js
4. ✅ **Intégration avec RabbitMQ** pour consommer et diffuser des événements
5. ✅ **Création d'un client React** avec hooks personnalisés pour WebSocket
6. ✅ **Gestion de l'état initial** et des reconnexions automatiques
7. ✅ **Bonnes pratiques de sécurité** (authentification, rate limiting, validation)
8. ✅ **Cas d'usage réels** : notifications, tableaux de bord, chat, collaboration

Les WebSockets sont un outil puissant pour créer des **expériences utilisateur réactives** dans les architectures microservices. Combinés avec RabbitMQ, ils permettent de **propager instantanément** les changements d'état à travers tout le système.

---

## Navigation

- **⬅️ Précédent** : [Leçon 5.5 - Gestion de la Concurrence et Idempotence](./lecon-5-concurrency-idempotency.md)
- **🏠 Sommaire** : [Retour au README](README.md)

---
