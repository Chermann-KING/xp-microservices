/**
 * Migration: Création de la table categories
 * Tour Catalog Service - Leçon 2.6
 */

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("categories", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: Sequelize.STRING(100),
      allowNull: false,
      unique: true,
    },
    slug: {
      type: Sequelize.STRING(100),
      allowNull: false,
      unique: true,
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    icon: {
      type: Sequelize.STRING(50),
      allowNull: true,
    },
    is_active: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
    },
    created_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
    updated_at: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
  });

  // Index sur slug et name
  await queryInterface.addIndex("categories", ["slug"], { unique: true });
  await queryInterface.addIndex("categories", ["name"], { unique: true });
  await queryInterface.addIndex("categories", ["is_active"]);
}

export async function down(queryInterface) {
  await queryInterface.dropTable("categories");
}
