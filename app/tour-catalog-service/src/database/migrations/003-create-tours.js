/**
 * Migration: Création de la table tours
 * Tour Catalog Service - Leçon 2.6
 */

export async function up(queryInterface, Sequelize) {
  // Créer le type ENUM pour difficulty
  await queryInterface.sequelize.query(`
    DO $$ BEGIN
      CREATE TYPE difficulty_enum AS ENUM ('easy', 'medium', 'difficult');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  // Créer le type ENUM pour duration_unit
  await queryInterface.sequelize.query(`
    DO $$ BEGIN
      CREATE TYPE duration_unit_enum AS ENUM ('hours', 'days', 'weeks');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await queryInterface.createTable("tours", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    title: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },
    slug: {
      type: Sequelize.STRING(255),
      allowNull: false,
      unique: true,
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    summary: {
      type: Sequelize.STRING(500),
      allowNull: true,
    },
    price: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
    },
    currency: {
      type: Sequelize.STRING(3),
      allowNull: false,
      defaultValue: "EUR",
    },
    duration: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    duration_unit: {
      type: "duration_unit_enum",
      allowNull: false,
      defaultValue: "days",
    },
    difficulty: {
      type: "difficulty_enum",
      allowNull: false,
      defaultValue: "medium",
    },
    max_group_size: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 15,
    },
    ratings_average: {
      type: Sequelize.FLOAT,
      defaultValue: 4.5,
    },
    ratings_quantity: {
      type: Sequelize.INTEGER,
      defaultValue: 0,
    },
    image_cover: {
      type: Sequelize.STRING(500),
      allowNull: true,
    },
    images: {
      type: Sequelize.ARRAY(Sequelize.STRING),
      defaultValue: [],
    },
    start_dates: {
      type: Sequelize.ARRAY(Sequelize.DATE),
      defaultValue: [],
    },
    is_active: {
      type: Sequelize.BOOLEAN,
      defaultValue: true,
    },
    category_id: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "categories",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    },
    destination_id: {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: "destinations",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
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
  await queryInterface.addIndex("tours", ["slug"], { unique: true });
  await queryInterface.addIndex("tours", ["category_id"]);
  await queryInterface.addIndex("tours", ["destination_id"]);
  await queryInterface.addIndex("tours", ["price"]);
  await queryInterface.addIndex("tours", ["difficulty"]);
  await queryInterface.addIndex("tours", ["is_active"]);
}

export async function down(queryInterface) {
  await queryInterface.dropTable("tours");

  // Supprimer les types ENUM
  await queryInterface.sequelize.query("DROP TYPE IF EXISTS difficulty_enum;");
  await queryInterface.sequelize.query(
    "DROP TYPE IF EXISTS duration_unit_enum;"
  );
}
