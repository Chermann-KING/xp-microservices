const Redis = require("ioredis");
const config = require("../config");

class IdempotenceService {
  constructor() {
    this.redis = new Redis(config.redis.url);
    this.ttl = config.redis.ttl;

    this.redis.on("connect", () => {
      console.log("✅ Redis connecté pour idempotence");
    });

    this.redis.on("error", (err) => {
      console.error("❌ Erreur Redis:", err);
    });
  }

  /**
   * Vérifie si un événement a déjà été traité
   * @param {string} eventId - ID unique de l'événement
   * @returns {Promise<boolean>} true si déjà traité
   */
  async isProcessed(eventId) {
    const key = `processed:${eventId}`;
    const exists = await this.redis.get(key);
    return exists !== null;
  }

  /**
   * Marque un événement comme traité
   * @param {string} eventId - ID unique de l'événement
   * @returns {Promise<void>}
   */
  async markAsProcessed(eventId) {
    const key = `processed:${eventId}`;
    await this.redis.setex(key, this.ttl, new Date().toISOString());
    console.log(
      `🔒 Événement ${eventId} marqué comme traité (TTL: ${this.ttl}s)`
    );
  }

  /**
   * Ferme la connexion Redis
   */
  async disconnect() {
    await this.redis.quit();
    console.log("❌ Redis déconnecté");
  }
}

module.exports = new IdempotenceService();
