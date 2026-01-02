/**
 * Migration: Création de la table bookings
 * Booking Management Service - Leçon 2.6
 */

export async function up(queryInterface, Sequelize) {
  // Créer le type ENUM pour status
  await queryInterface.sequelize.query(`
    DO $$ BEGIN
      CREATE TYPE booking_status_enum AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await queryInterface.createTable("bookings", {
    id: {
      type: Sequelize.UUID,
      defaultValue: Sequelize.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    tour_id: {
      type: Sequelize.UUID,
      allowNull: false,
      comment: "Référence logique vers Tour Catalog Service",
    },
    customer_id: {
      type: Sequelize.UUID,
      allowNull: true,
      comment: "Référence vers un futur User Service",
    },
    customer_name: {
      type: Sequelize.STRING(200),
      allowNull: false,
    },
    customer_email: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },
    customer_phone: {
      type: Sequelize.STRING(20),
      allowNull: true,
    },
    tour_date: {
      type: Sequelize.DATEONLY,
      allowNull: false,
    },
    number_of_participants: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    total_amount: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
    },
    currency: {
      type: Sequelize.STRING(3),
      allowNull: false,
      defaultValue: "EUR",
    },
    status: {
      type: "booking_status_enum",
      allowNull: false,
      defaultValue: "pending",
    },
    special_requests: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    confirmed_at: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    cancelled_at: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    completed_at: {
      type: Sequelize.DATE,
      allowNull: true,
    },
    cancellation_reason: {
      type: Sequelize.TEXT,
      allowNull: true,
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
  await queryInterface.addIndex("bookings", ["tour_id"]);
  await queryInterface.addIndex("bookings", ["customer_id"]);
  await queryInterface.addIndex("bookings", ["customer_email"]);
  await queryInterface.addIndex("bookings", ["status"]);
  await queryInterface.addIndex("bookings", ["tour_date"]);
  await queryInterface.addIndex("bookings", ["created_at"]);
}

export async function down(queryInterface) {
  await queryInterface.dropTable("bookings");
  await queryInterface.sequelize.query(
    "DROP TYPE IF EXISTS booking_status_enum;"
  );
}
