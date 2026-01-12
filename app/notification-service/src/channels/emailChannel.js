import nodemailer from "nodemailer";
import NotificationChannel from "./notificationChannel.js";
import config from "../config/index.js";

class EmailChannel extends NotificationChannel {
  constructor() {
    super();
    this.transporter = nodemailer.createTransport(config.email);
  }

  /**
   * Envoie un email
   * @param {Object} recipient - { email, name }
   * @param {Object} message - { subject, html, text }
   * @returns {Promise<Object>}
   */
  async send(recipient, message) {
    try {
      if (!recipient.email) {
        return {
          success: false,
          channel: "email",
          error: "Email destinataire manquant",
        };
      }

      const mailOptions = {
        from: `${config.email.from.name} <${config.email.from.email}>`,
        to: recipient.email,
        subject: message.subject,
        html: message.html,
        text: message.text || "",
      };

      const info = await this.transporter.sendMail(mailOptions);

      console.log(
        `📧 Email envoyé à ${recipient.email} - ID: ${info.messageId}`
      );

      return {
        success: true,
        channel: "email",
        messageId: info.messageId,
        recipient: recipient.email,
      };
    } catch (error) {
      console.error(`❌ Échec envoi email:`, error.message);

      return {
        success: false,
        channel: "email",
        error: error.message,
      };
    }
  }

  /**
   * Vérifie la connexion SMTP
   */
  async isAvailable() {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error("❌ Canal Email non disponible:", error.message);
      return false;
    }
  }
}

export default EmailChannel;
