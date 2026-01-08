/**
 * WebSocket Server - Module 5 - Leçon 5.6
 * Temps réel pour les disponibilités des tours
 * 
 * Ce serveur WebSocket écoute les événements tour.availability.low
 * et diffuse les mises à jour à tous les clients connectés en temps réel.
 */

import dotenv from 'dotenv';
import { WebSocketServer } from 'ws';
import http from 'http';
import amqplib from 'amqplib';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const PORT = process.env.PORT || 8080;
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
const EXCHANGE_NAME = process.env.RABBITMQ_EXCHANGE || 'tour_booking_events';
const QUEUE_NAME = 'websocket_availability_queue';

// Gestion des clients connectés
const clients = new Set();

/**
 * Crée le serveur HTTP pour WebSocket
 */
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'websocket-server',
      connectedClients: clients.size,
      timestamp: new Date().toISOString()
    }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

/**
 * Initialise le serveur WebSocket
 */
const wss = new WebSocketServer({ 
  server,
  // Gestion CORS pour WebSocket
  verifyClient: (info) => {
    const origin = info.origin;
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',');
    
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return true;
    }
    
    console.warn(`❌ Origine refusée: ${origin}`);
    return false;
  }
});

/**
 * Gestion des connexions WebSocket
 */
wss.on('connection', (ws, req) => {
  const clientId = uuidv4();
  const clientIP = req.socket.remoteAddress;
  
  console.log(`✅ Client connecté: ${clientId} (${clientIP})`);
  
  // Ajouter à la liste des clients
  clients.add(ws);
  ws.clientId = clientId;

  // Message de bienvenue
  ws.send(JSON.stringify({
    type: 'connection',
    clientId,
    message: 'Connecté au serveur WebSocket - Disponibilités en temps réel',
    timestamp: new Date().toISOString()
  }));

  // Gestion des messages reçus du client
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log(`📩 Message reçu de ${clientId}:`, message);

      // Ping/Pong pour keep-alive
      if (message.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
      }
    } catch (error) {
      console.error(`❌ Erreur parsing message de ${clientId}:`, error.message);
    }
  });

  // Gestion de la déconnexion
  ws.on('close', () => {
    clients.delete(ws);
    console.log(`❌ Client déconnecté: ${clientId} (${clients.size} restants)`);
  });

  // Gestion des erreurs
  ws.on('error', (error) => {
    console.error(`❌ Erreur WebSocket ${clientId}:`, error.message);
    clients.delete(ws);
  });
});

/**
 * Diffuse un message à tous les clients connectés
 */
function broadcast(message) {
  const payload = JSON.stringify(message);
  let successCount = 0;
  let failureCount = 0;

  clients.forEach((client) => {
    if (client.readyState === 1) { // OPEN state
      try {
        client.send(payload);
        successCount++;
      } catch (error) {
        console.error(`❌ Erreur envoi à ${client.clientId}:`, error.message);
        failureCount++;
      }
    }
  });

  console.log(`📡 Broadcast: ${successCount} succès, ${failureCount} échecs`);
}

/**
 * Consumer RabbitMQ pour les événements de disponibilité
 */
class AvailabilityConsumer {
  constructor() {
    this.connection = null;
    this.channel = null;
  }

  async connect() {
    try {
      console.log('🔌 Connexion RabbitMQ Consumer (WebSocket)...');
      this.connection = await amqplib.connect(RABBITMQ_URL);
      this.channel = await this.connection.createChannel();

      // Déclarer l'exchange
      await this.channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });

      // Déclarer la queue
      await this.channel.assertQueue(QUEUE_NAME, { durable: true });

      // Bind à l'événement tour.availability.low
      await this.channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, 'tour.availability.low');
      console.log(`🔗 Binding: tour.availability.low → ${QUEUE_NAME}`);

      // Consommer les messages
      await this.channel.consume(
        QUEUE_NAME,
        (msg) => this.handleMessage(msg),
        { noAck: false }
      );

      console.log(`✅ Consumer démarré sur '${QUEUE_NAME}'`);

    } catch (error) {
      console.error('❌ Erreur connexion RabbitMQ:', error.message);
      throw error;
    }
  }

  handleMessage(msg) {
    if (!msg) return;

    try {
      const content = JSON.parse(msg.content.toString());
      console.log(`\n📩 Événement reçu:`, content.data);

      // Diffuser aux clients WebSocket
      broadcast({
        type: 'tour.availability.low',
        data: content.data,
        timestamp: content.timestamp
      });

      this.channel.ack(msg);
      console.log(`✅ Message traité et diffusé à ${clients.size} clients`);

    } catch (error) {
      console.error(`❌ Erreur traitement message:`, error.message);
      this.channel.nack(msg, false, true); // Requeue
    }
  }

  async disconnect() {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
    console.log('❌ Consumer RabbitMQ arrêté');
  }
}

/**
 * Démarrage du serveur
 */
async function startServer() {
  try {
    // Démarrer le serveur HTTP/WebSocket
    server.listen(PORT, () => {
      console.log(`\n🚀 WebSocket Server démarré`);
      console.log(`📍 Port: ${PORT}`);
      console.log(`📡 WebSocket URL: ws://localhost:${PORT}`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
    });

    // Démarrer le consumer RabbitMQ
    const consumer = new AvailabilityConsumer();
    await consumer.connect();

    // Keep-alive ping toutes les 30 secondes
    setInterval(() => {
      broadcast({
        type: 'ping',
        timestamp: new Date().toISOString()
      });
    }, 30000);

    // Gestion de l'arrêt propre
    const shutdown = async () => {
      console.log('\n🛑 Arrêt du serveur...');
      
      // Fermer les connexions WebSocket
      clients.forEach((client) => {
        client.close(1000, 'Server shutting down');
      });

      // Fermer RabbitMQ
      await consumer.disconnect();

      // Fermer le serveur HTTP
      server.close(() => {
        console.log('✅ Serveur arrêté');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

  } catch (error) {
    console.error('❌ Erreur démarrage serveur:', error.message);
    process.exit(1);
  }
}

// Démarrer
startServer();
