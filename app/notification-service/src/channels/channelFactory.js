import EmailChannel from "./emailChannel.js";

/**
 * Factory pour créer des canaux de notification
 */
class ChannelFactory {
  constructor() {
    this.channels = {
      email: new EmailChannel(),
      // Ajouter SmsChannel et PushChannel selon les besoins
    };
  }

  /**
   * Récupère un canal par son nom
   * @param {string} channelName - 'email', 'sms', 'push'
   * @returns {NotificationChannel}
   */
  getChannel(channelName) {
    const channel = this.channels[channelName];

    if (!channel) {
      throw new Error(`Canal de notification '${channelName}' non trouvé`);
    }

    return channel;
  }

  /**
   * Récupère tous les canaux disponibles
   * @returns {Object}
   */
  getAllChannels() {
    return this.channels;
  }
}

export default new ChannelFactory();
