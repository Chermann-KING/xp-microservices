/**
 * Migration: Ajout de la colonne optimistic_lock_version
 * Module 5 - Leçon 5.5 : Optimistic Locking
 *
 * Cette colonne est utilisée pour gérer la concurrence lors des mises à jour
 * des places disponibles (bookedSeats) suite aux événements de réservation.
 */

export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn("tours", "optimistic_lock_version", {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: "Version pour optimistic locking (Module 5)",
  });

  console.log("✅ Colonne optimistic_lock_version ajoutée à la table tours");
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.removeColumn("tours", "optimistic_lock_version");
  console.log("❌ Colonne optimistic_lock_version supprimée de la table tours");
}
