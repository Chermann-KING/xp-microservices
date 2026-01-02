/**
 * Migration: Création de la table destinations
 * Tour Catalog Service - Leçon 2.6
 */

export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable("destinations", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: Sequelize.STRING(200),
      allowNull: false,
    },
    slug: {
      type: Sequelize.STRING(200),
      allowNull: false,
      unique: true,
    },
    country: {
      type: Sequelize.STRING(100),
      allowNull: false,
    },
    region: {
      type: Sequelize.STRING(100),
      allowNull: true,
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    image: {
      type: Sequelize.STRING(500),
      allowNull: true,
    },
    coordinates: {
      type: Sequelize.JSONB,
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

  // Index
  await queryInterface.addIndex("destinations", ["slug"], { unique: true });
  await queryInterface.addIndex("destinations", ["country"]);
  await queryInterface.addIndex("destinations", ["is_active"]);
}

export async function down(queryInterface) {
  await queryInterface.dropTable("destinations");
}
