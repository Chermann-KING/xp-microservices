/**
 * Interface abstraite pour les canaux de notification
 * Pattern Strategy - Leçon 5.4
 */
class NotificationChannel {
  /**
   * Envoie une notification
   * @param {Object} recipient - Destinataire
   * @param {Object} message - Contenu du message
   * @returns {Promise<Object>} Résultat de l'envoi
   */
  async send(recipient, message) {
    throw new Error("La méthode send() doit être implémentée");
  }

  /**
   * Vérifie la disponibilité du canal
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    return true;
  }
}

module.exports = NotificationChannel;
