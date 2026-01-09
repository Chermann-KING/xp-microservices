# Solutions : Leçon 5.6 - WebSockets et Communication Temps Réel

[⬅️ Retour à la Leçon 5.6](../lecon-6-websockets-realtime.md) | [🏠 Accueil](../../README.md)

---

## Exercice 1 : Serveur WebSocket de Base

### 📋 Objectif

Créer un serveur WebSocket qui diffuse un nombre aléatoire toutes les 3 secondes.

### ✅ Solution Complète

#### Fichier : `websocket-server.js`

```javascript
// websocket-server.js
const WebSocket = require('ws');

// Créer un serveur WebSocket sur le port 8080
const wss = new WebSocket.Server({ port: 8080 });

// Fonction de diffusion à tous les clients connectés
function broadcast(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// Gestion des nouvelles connexions
wss.on('connection', (ws) => {
  console.log('✅ Nouveau client connecté');

  // Envoyer un message de bienvenue au nouveau client
  ws.send(JSON.stringify({
    type: 'WELCOME',
    message: 'Bienvenue sur le serveur de nombres aléatoires!',
    timestamp: new Date().toISOString()
  }));

  // Gérer les messages du client
  ws.on('message', (message) => {
    console.log('📩 Message reçu du client:', message.toString());
  });

  // Gérer la déconnexion
  ws.on('close', () => {
    console.log('❌ Client déconnecté');
  });

  // Gérer les erreurs
  ws.on('error', (error) => {
    console.error('❌ Erreur WebSocket:', error);
  });
});

// Diffuser un nombre aléatoire toutes les 3 secondes
setInterval(() => {
  const randomNumber = Math.floor(Math.random() * 100) + 1; // Nombre entre 1 et 100

  const message = {
    type: 'RANDOM_NUMBER',
    value: randomNumber,
    timestamp: new Date().toISOString()
  };

  console.log('📢 Diffusion:', message);
  broadcast(message);
}, 3000);

console.log('🚀 Serveur WebSocket démarré sur ws://localhost:8080');
console.log('📊 Diffusion de nombres aléatoires toutes les 3 secondes...');
```

#### Installation des Dépendances

```bash
npm install ws
```

#### Exécution

```bash
node websocket-server.js
```

**Sortie attendue** :

```
🚀 Serveur WebSocket démarré sur ws://localhost:8080
📊 Diffusion de nombres aléatoires toutes les 3 secondes...
✅ Nouveau client connecté
📢 Diffusion: { type: 'RANDOM_NUMBER', value: 42, timestamp: '2025-01-08T10:40:00.000Z' }
📢 Diffusion: { type: 'RANDOM_NUMBER', value: 78, timestamp: '2025-01-08T10:40:03.000Z' }
```

---

## Exercice 2 : Client React pour Nombres Aléatoires

### 📋 Objectif

Créer un composant React qui affiche les nombres aléatoires reçus avec un historique.

### ✅ Solution Complète

#### Fichier : `src/components/RandomNumberDisplay.jsx`

```javascript
// src/components/RandomNumberDisplay.jsx
import React, { useState, useEffect } from 'react';
import './RandomNumberDisplay.css';

function RandomNumberDisplay() {
  const [currentNumber, setCurrentNumber] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [connected, setConnected] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    // Connexion au serveur WebSocket
    const ws = new WebSocket('ws://localhost:8080');

    ws.onopen = () => {
      console.log('✅ Connecté au serveur WebSocket');
      setConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('📩 Message reçu:', data);

      if (data.type === 'WELCOME') {
        console.log('👋', data.message);
      }

      if (data.type === 'RANDOM_NUMBER') {
        const timestamp = new Date(data.timestamp);

        // Mettre à jour le nombre actuel
        setCurrentNumber(data.value);
        setLastUpdate(timestamp);

        // Ajouter au début de l'historique (max 10 éléments)
        setHistory(prevHistory => {
          const newEntry = {
            value: data.value,
            timestamp: timestamp
          };
          const updatedHistory = [newEntry, ...prevHistory].slice(0, 10);
          return updatedHistory;
        });
      }
    };

    ws.onerror = (error) => {
      console.error('❌ Erreur WebSocket:', error);
    };

    ws.onclose = () => {
      console.log('❌ Déconnecté du serveur WebSocket');
      setConnected(false);
    };

    // Nettoyage lors du démontage du composant
    return () => {
      ws.close();
    };
  }, []);

  return (
    <div className="random-number-display">
      <h2>Nombre Aléatoire en Temps Réel</h2>

      {/* Indicateur de connexion */}
      <div className={`status ${connected ? 'connected' : 'disconnected'}`}>
        {connected ? '🟢 Connecté' : '🔴 Déconnecté'}
      </div>

      {/* Nombre actuel */}
      {currentNumber !== null ? (
        <div className="current-number">
          <h3>Nombre actuel</h3>
          <div className="number-value">{currentNumber}</div>
          {lastUpdate && (
            <p className="last-update">
              Reçu à : {lastUpdate.toLocaleTimeString()}
            </p>
          )}
        </div>
      ) : (
        <p className="waiting">En attente du premier nombre...</p>
      )}

      {/* Historique */}
      {history.length > 0 && (
        <div className="history">
          <h3>Historique</h3>
          <ul>
            {history.map((entry, index) => (
              <li key={index}>
                <span className="history-value">{entry.value}</span>
                <span className="history-time">
                  ({entry.timestamp.toLocaleTimeString()})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default RandomNumberDisplay;
```

#### Fichier : `src/components/RandomNumberDisplay.css`

```css
/* src/components/RandomNumberDisplay.css */
.random-number-display {
  max-width: 500px;
  margin: 40px auto;
  padding: 30px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  background-color: #ffffff;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  font-family: Arial, sans-serif;
}

.random-number-display h2 {
  text-align: center;
  color: #333;
  margin-bottom: 20px;
}

/* Indicateur de connexion */
.status {
  display: inline-block;
  padding: 8px 20px;
  border-radius: 25px;
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 20px;
}

.status.connected {
  background-color: #d4edda;
  color: #155724;
}

.status.disconnected {
  background-color: #f8d7da;
  color: #721c24;
}

/* Nombre actuel */
.current-number {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 30px;
  border-radius: 10px;
  text-align: center;
  color: white;
  margin-bottom: 20px;
}

.current-number h3 {
  margin: 0 0 10px 0;
  font-size: 16px;
  font-weight: normal;
  opacity: 0.9;
}

.number-value {
  font-size: 72px;
  font-weight: bold;
  margin: 10px 0;
}

.last-update {
  margin: 10px 0 0 0;
  font-size: 14px;
  opacity: 0.8;
}

.waiting {
  text-align: center;
  color: #6c757d;
  font-style: italic;
  padding: 20px;
}

/* Historique */
.history {
  margin-top: 20px;
}

.history h3 {
  color: #333;
  font-size: 18px;
  margin-bottom: 15px;
}

.history ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.history li {
  background-color: #f8f9fa;
  padding: 12px 15px;
  margin-bottom: 8px;
  border-radius: 6px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background-color 0.2s;
}

.history li:hover {
  background-color: #e9ecef;
}

.history-value {
  font-size: 20px;
  font-weight: bold;
  color: #667eea;
}

.history-time {
  font-size: 12px;
  color: #6c757d;
}
```

#### Fichier : `src/App.jsx`

```javascript
// src/App.jsx
import React from 'react';
import RandomNumberDisplay from './components/RandomNumberDisplay';
import './App.css';

function App() {
  return (
    <div className="App">
      <RandomNumberDisplay />
    </div>
  );
}

export default App;
```

#### Exécution

```bash
# Démarrer le serveur WebSocket (terminal 1)
node websocket-server.js

# Démarrer le client React (terminal 2)
npm start
```

---

## Exercice 3 : Disponibilité de Tours avec Données Mock

### 📋 Objectif

Étendre le serveur WebSocket pour diffuser la disponibilité de plusieurs tours avec des données simulées.

### ✅ Solution Complète

#### Fichier : `websocket-tour-server.js`

```javascript
// websocket-tour-server.js
const WebSocket = require('ws');

// Créer un serveur WebSocket sur le port 8080
const wss = new WebSocket.Server({ port: 8080 });

// Base de données de tours en mémoire
const tours = {
  tour_paris: {
    id: 'tour_paris',
    name: 'Paris City Tour',
    availableSeats: 20
  },
  tour_london: {
    id: 'tour_london',
    name: 'London Eye Experience',
    availableSeats: 15
  },
  tour_rome: {
    id: 'tour_rome',
    name: 'Rome Colosseum Tour',
    availableSeats: 18
  }
};

// Fonction de diffusion à tous les clients
function broadcast(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// Gestion des nouvelles connexions
wss.on('connection', (ws) => {
  console.log('✅ Nouveau client connecté');

  // Envoyer un message de bienvenue
  ws.send(JSON.stringify({
    type: 'WELCOME',
    message: 'Connecté au serveur de disponibilité des tours',
    timestamp: new Date().toISOString()
  }));

  // Envoyer l'état initial de tous les tours
  Object.values(tours).forEach(tour => {
    ws.send(JSON.stringify({
      type: 'INITIAL_STATE',
      tourId: tour.id,
      tourName: tour.name,
      availableSeats: tour.availableSeats,
      timestamp: new Date().toISOString()
    }));
  });

  console.log('📦 État initial envoyé au client');

  ws.on('message', (message) => {
    console.log('📩 Message reçu du client:', message.toString());
  });

  ws.on('close', () => {
    console.log('❌ Client déconnecté');
  });

  ws.on('error', (error) => {
    console.error('❌ Erreur WebSocket:', error);
  });
});

// Simulation : Diminuer aléatoirement les places disponibles toutes les 5 secondes
setInterval(() => {
  // Sélectionner un tour aléatoire
  const tourIds = Object.keys(tours);
  const randomTourId = tourIds[Math.floor(Math.random() * tourIds.length)];
  const tour = tours[randomTourId];

  // Diminuer les places disponibles (entre 1 et 3)
  const seatsToReduce = Math.floor(Math.random() * 3) + 1;
  tour.availableSeats = Math.max(0, tour.availableSeats - seatsToReduce);

  // Créer le message de mise à jour
  const update = {
    type: 'AVAILABILITY_UPDATE',
    tourId: tour.id,
    tourName: tour.name,
    availableSeats: tour.availableSeats,
    timestamp: new Date().toISOString()
  };

  console.log(`📢 Mise à jour: ${tour.name} - ${tour.availableSeats} places disponibles`);
  broadcast(update);

  // Réinitialiser si tous les tours sont à 0
  if (Object.values(tours).every(t => t.availableSeats === 0)) {
    console.log('🔄 Réinitialisation de tous les tours');
    tours.tour_paris.availableSeats = 20;
    tours.tour_london.availableSeats = 15;
    tours.tour_rome.availableSeats = 18;
  }
}, 5000);

console.log('🚀 Serveur WebSocket démarré sur ws://localhost:8080');
console.log('📊 Simulation de mises à jour de disponibilité toutes les 5 secondes...');
```

#### Installation et Exécution

```bash
# Installer les dépendances
npm install ws

# Démarrer le serveur
node websocket-tour-server.js
```

**Sortie attendue** :

```
🚀 Serveur WebSocket démarré sur ws://localhost:8080
📊 Simulation de mises à jour de disponibilité toutes les 5 secondes...
✅ Nouveau client connecté
📦 État initial envoyé au client
📢 Mise à jour: Paris City Tour - 18 places disponibles
📢 Mise à jour: London Eye Experience - 13 places disponibles
📢 Mise à jour: Rome Colosseum Tour - 15 places disponibles
```

---

## Exercice 4 : Tableau de Bord Multi-Tours

### 📋 Objectif

Créer un composant React affichant la disponibilité de tous les tours en temps réel.

### ✅ Solution Complète

#### Fichier : `src/components/TourDashboard.jsx`

```javascript
// src/components/TourDashboard.jsx
import React, { useState, useEffect } from 'react';
import './TourDashboard.css';

function TourDashboard() {
  const [tours, setTours] = useState({});
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Connexion au serveur WebSocket
    const ws = new WebSocket('ws://localhost:8080');

    ws.onopen = () => {
      console.log('✅ Connecté au serveur WebSocket');
      setConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('📩 Message reçu:', data);

      if (data.type === 'WELCOME') {
        console.log('👋', data.message);
      }

      // Gérer l'état initial et les mises à jour
      if (data.type === 'INITIAL_STATE' || data.type === 'AVAILABILITY_UPDATE') {
        setTours(prevTours => ({
          ...prevTours,
          [data.tourId]: {
            id: data.tourId,
            name: data.tourName,
            availableSeats: data.availableSeats,
            lastUpdate: new Date(data.timestamp)
          }
        }));
      }
    };

    ws.onerror = (error) => {
      console.error('❌ Erreur WebSocket:', error);
    };

    ws.onclose = () => {
      console.log('❌ Déconnecté du serveur WebSocket');
      setConnected(false);
    };

    // Nettoyage lors du démontage
    return () => {
      ws.close();
    };
  }, []);

  // Déterminer la classe de couleur selon la disponibilité
  const getAvailabilityClass = (seats) => {
    if (seats > 10) return 'high';
    if (seats >= 5) return 'medium';
    return 'low';
  };

  // Déterminer l'emoji indicateur
  const getAvailabilityEmoji = (seats) => {
    if (seats > 10) return '🟢';
    if (seats >= 5) return '🟠';
    return '🔴';
  };

  return (
    <div className="tour-dashboard">
      <header>
        <h1>Tableau de Bord des Tours</h1>
        <div className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
          {connected ? '🟢 Connecté' : '🔴 Déconnecté'}
        </div>
      </header>

      <div className="tours-grid">
        {Object.values(tours).map(tour => (
          <div
            key={tour.id}
            className={`tour-card ${getAvailabilityClass(tour.availableSeats)}`}
          >
            <div className="tour-header">
              <h3>{tour.name}</h3>
            </div>

            <div className="tour-body">
              <div className="availability">
                <span className="emoji">{getAvailabilityEmoji(tour.availableSeats)}</span>
                <span className="seats">{tour.availableSeats}</span>
                <span className="label">places</span>
              </div>

              <div className="last-update">
                Mis à jour : {tour.lastUpdate.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {Object.keys(tours).length === 0 && (
        <div className="no-data">
          <p>En attente des données des tours...</p>
        </div>
      )}
    </div>
  );
}

export default TourDashboard;
```

#### Fichier : `src/components/TourDashboard.css`

```css
/* src/components/TourDashboard.css */
.tour-dashboard {
  max-width: 1200px;
  margin: 0 auto;
  padding: 30px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

/* En-tête */
header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
  padding-bottom: 20px;
  border-bottom: 3px solid #e0e0e0;
}

header h1 {
  margin: 0;
  color: #333;
  font-size: 32px;
}

.connection-status {
  padding: 10px 20px;
  border-radius: 25px;
  font-size: 14px;
  font-weight: bold;
}

.connection-status.connected {
  background-color: #d4edda;
  color: #155724;
}

.connection-status.disconnected {
  background-color: #f8d7da;
  color: #721c24;
}

/* Grille des tours */
.tours-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
  margin-bottom: 30px;
}

/* Carte de tour */
.tour-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: transform 0.3s, box-shadow 0.3s;
}

.tour-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 12px rgba(0, 0, 0, 0.15);
}

/* Couleurs selon la disponibilité */
.tour-card.high {
  border-left: 5px solid #28a745;
}

.tour-card.medium {
  border-left: 5px solid #ffc107;
}

.tour-card.low {
  border-left: 5px solid #dc3545;
}

/* En-tête de la carte */
.tour-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  color: white;
}

.tour-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

/* Corps de la carte */
.tour-body {
  padding: 25px;
}

.availability {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 15px;
}

.availability .emoji {
  font-size: 36px;
  margin-right: 10px;
}

.availability .seats {
  font-size: 48px;
  font-weight: bold;
  color: #333;
  margin-right: 8px;
}

.availability .label {
  font-size: 18px;
  color: #6c757d;
}

.last-update {
  text-align: center;
  font-size: 13px;
  color: #6c757d;
  padding-top: 15px;
  border-top: 1px solid #e0e0e0;
}

/* Message sans données */
.no-data {
  text-align: center;
  padding: 60px 20px;
  color: #6c757d;
  font-size: 18px;
  font-style: italic;
}

/* Responsive */
@media (max-width: 768px) {
  .tour-dashboard {
    padding: 20px;
  }

  header {
    flex-direction: column;
    gap: 15px;
    text-align: center;
  }

  header h1 {
    font-size: 24px;
  }

  .tours-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }
}
```

#### Fichier : `src/App.jsx`

```javascript
// src/App.jsx
import React from 'react';
import TourDashboard from './components/TourDashboard';
import './App.css';

function App() {
  return (
    <div className="App">
      <TourDashboard />
    </div>
  );
}

export default App;
```

#### Exécution Complète

```bash
# Terminal 1 : Démarrer le serveur WebSocket
node websocket-tour-server.js

# Terminal 2 : Démarrer l'application React
npm start
```

---

## 🧪 Tests et Validation

### Test avec `wscat`

Pour tester manuellement le serveur WebSocket :

```bash
# Installer wscat
npm install -g wscat

# Se connecter au serveur
wscat -c ws://localhost:8080
```

Vous devriez voir les messages entrants :

```json
< {"type":"WELCOME","message":"Connecté au serveur de disponibilité des tours","timestamp":"2025-01-08T10:50:00.000Z"}
< {"type":"INITIAL_STATE","tourId":"tour_paris","tourName":"Paris City Tour","availableSeats":20,"timestamp":"2025-01-08T10:50:00.000Z"}
< {"type":"INITIAL_STATE","tourId":"tour_london","tourName":"London Eye Experience","availableSeats":15,"timestamp":"2025-01-08T10:50:00.000Z"}
< {"type":"INITIAL_STATE","tourId":"tour_rome","tourName":"Rome Colosseum Tour","availableSeats":18,"timestamp":"2025-01-08T10:50:00.000Z"}
< {"type":"AVAILABILITY_UPDATE","tourId":"tour_paris","tourName":"Paris City Tour","availableSeats":18,"timestamp":"2025-01-08T10:50:05.000Z"}
```

---

## 🔧 Améliorations Possibles

### 1. Gestion des Abonnements Sélectifs

Au lieu de diffuser toutes les mises à jour à tous les clients, permettez aux clients de s'abonner à des tours spécifiques :

```javascript
// Serveur
const subscriptions = new Map(); // tourId -> Set(clients)

ws.on('message', (message) => {
  const data = JSON.parse(message);

  if (data.type === 'SUBSCRIBE') {
    const tourId = data.tourId;
    if (!subscriptions.has(tourId)) {
      subscriptions.set(tourId, new Set());
    }
    subscriptions.get(tourId).add(ws);
    console.log(`📌 Client abonné à ${tourId}`);
  }

  if (data.type === 'UNSUBSCRIBE') {
    const tourId = data.tourId;
    if (subscriptions.has(tourId)) {
      subscriptions.get(tourId).delete(ws);
      console.log(`📌 Client désabonné de ${tourId}`);
    }
  }
});

// Diffusion sélective
function broadcastToSubscribers(tourId, data) {
  if (subscriptions.has(tourId)) {
    subscriptions.get(tourId).forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  }
}
```

### 2. Authentification avec JWT

Sécurisez les connexions WebSocket avec des tokens JWT :

```javascript
const jwt = require('jsonwebtoken');
const url = require('url');

wss.on('connection', (ws, req) => {
  const params = url.parse(req.url, true).query;
  const token = params.token;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    ws.userId = decoded.userId;
    console.log(`✅ Utilisateur ${ws.userId} authentifié`);
  } catch (error) {
    console.error('❌ Token invalide');
    ws.close();
    return;
  }

  // Suite de la logique...
});
```

### 3. Persistance avec Redis

Stockez l'état des tours dans Redis pour la persistance :

```javascript
const redis = require('redis');
const client = redis.createClient();

// Sauvegarder l'état
async function saveTourState(tourId, availableSeats) {
  await client.set(`tour:${tourId}:seats`, availableSeats);
}

// Récupérer l'état
async function getTourState(tourId) {
  const seats = await client.get(`tour:${tourId}:seats`);
  return parseInt(seats) || 0;
}
```

### 4. Heartbeat pour Détecter les Connexions Mortes

Implémentez un mécanisme de heartbeat pour nettoyer les connexions inactives :

```javascript
const HEARTBEAT_INTERVAL = 30000; // 30 secondes

wss.on('connection', (ws) => {
  ws.isAlive = true;

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (message) => {
    const data = JSON.parse(message);
    if (data.type === 'PING') {
      ws.send(JSON.stringify({ type: 'PONG' }));
    }
  });
});

// Vérifier les connexions toutes les 30 secondes
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) {
      console.log('❌ Connexion morte détectée, fermeture...');
      return ws.terminate();
    }

    ws.isAlive = false;
    ws.ping();
  });
}, HEARTBEAT_INTERVAL);
```

---

## 📊 Architecture Complète pour Production

### Structure de Dossiers Recommandée

```
websocket-service/
├── src/
│   ├── server.js              # Serveur WebSocket principal
│   ├── handlers/
│   │   ├── connection.js      # Gestion des connexions
│   │   ├── subscription.js    # Gestion des abonnements
│   │   └── authentication.js  # Authentification JWT
│   ├── consumers/
│   │   └── rabbitmq.js        # Consommateur RabbitMQ
│   ├── utils/
│   │   ├── broadcast.js       # Fonctions de diffusion
│   │   └── heartbeat.js       # Gestion du heartbeat
│   └── config/
│       └── index.js           # Configuration
├── tests/
│   ├── server.test.js
│   └── integration.test.js
├── package.json
└── .env
```

### Fichier : `src/server.js`

```javascript
// src/server.js
const WebSocket = require('ws');
const { handleConnection } = require('./handlers/connection');
const { startRabbitMQConsumer } = require('./consumers/rabbitmq');
const { startHeartbeat } = require('./utils/heartbeat');
const config = require('./config');

const wss = new WebSocket.Server({ port: config.port });

// Gestion des connexions
wss.on('connection', (ws, req) => {
  handleConnection(ws, req, wss);
});

// Démarrer le consommateur RabbitMQ
startRabbitMQConsumer(wss);

// Démarrer le heartbeat
startHeartbeat(wss);

console.log(`🚀 Serveur WebSocket démarré sur ws://localhost:${config.port}`);

// Gestion de l'arrêt gracieux
process.on('SIGINT', () => {
  console.log('🛑 Arrêt du serveur WebSocket...');
  wss.close(() => {
    console.log('✅ Serveur fermé');
    process.exit(0);
  });
});
```

---

## 🎯 Points Clés à Retenir

1. ✅ **WebSockets** : Connexion bidirectionnelle persistante pour la communication temps réel
2. ✅ **Diffusion (Broadcast)** : Envoyer des messages à tous les clients connectés
3. ✅ **État Initial** : Envoyer l'état actuel lors de la connexion
4. ✅ **Reconnexion Automatique** : Implémenter un backoff exponentiel
5. ✅ **Indicateurs Visuels** : Utiliser des couleurs et emojis pour la disponibilité
6. ✅ **Gestion de la Mémoire** : Nettoyer les ressources lors de la déconnexion
7. ✅ **Sécurité** : Authentification, validation, rate limiting

---

## 📚 Ressources Complémentaires

- **ws Library Documentation** : [https://github.com/websockets/ws](https://github.com/websockets/ws)
- **React WebSocket Best Practices** : [https://blog.logrocket.com/websockets-tutorial-how-to-go-real-time-with-node-and-react/](https://blog.logrocket.com/websockets-tutorial-how-to-go-real-time-with-node-and-react/)
- **WebSocket Security** : [https://owasp.org/www-community/vulnerabilities/WebSocket_Security](https://owasp.org/www-community/vulnerabilities/WebSocket_Security)

---

[⬅️ Retour à la Leçon 5.6](../lecon-6-websockets-realtime.md) | [🏠 Accueil](../../README.md)
