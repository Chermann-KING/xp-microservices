const pug = require("pug");
const path = require("path");

class TemplateService {
  constructor() {
    this.templatesDir = path.join(__dirname, "../templates");
  }

  /**
   * Compile et rend un template Pug
   * @param {string} templateName - Nom du fichier template (sans extension)
   * @param {Object} data - Données à injecter dans le template
   * @returns {string} HTML compilé
   */
  render(templateName, data) {
    try {
      const templatePath = path.join(this.templatesDir, `${templateName}.pug`);
      const html = pug.renderFile(templatePath, data);
      return html;
    } catch (error) {
      console.error(
        `❌ Erreur compilation template '${templateName}':`,
        error.message
      );
      throw error;
    }
  }

  /**
   * Génère un email de confirmation de réservation
   * @param {Object} bookingData
   * @returns {Object} { subject, html, text }
   */
  generateBookingConfirmation(bookingData) {
    const html = this.render("booking-confirmation", bookingData);

    return {
      subject: `Confirmation de votre réservation #${bookingData.bookingId}`,
      html,
      text: `Votre réservation pour "${bookingData.tourName}" a été confirmée.`,
    };
  }

  /**
   * Génère un email d'annulation de réservation
   * @param {Object} bookingData
   * @returns {Object} { subject, html, text }
   */
  generateBookingCancellation(bookingData) {
    const html = this.render("booking-cancellation", bookingData);

    return {
      subject: `Annulation de votre réservation #${bookingData.bookingId}`,
      html,
      text: `Votre réservation pour "${bookingData.tourName}" a été annulée.`,
    };
  }

  /**
   * Génère un email de confirmation de paiement
   * @param {Object} paymentData
   * @returns {Object} { subject, html, text }
   */
  generatePaymentSuccess(paymentData) {
    const html = this.render("payment-success", paymentData);

    return {
      subject: `Paiement confirmé - ${paymentData.amount} ${paymentData.currency}`,
      html,
      text: `Votre paiement de ${paymentData.amount} ${paymentData.currency} a été traité avec succès.`,
    };
  }
}

module.exports = new TemplateService();
