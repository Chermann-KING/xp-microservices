# Solutions des Exercices - Leçon 2.6 : Conception BDD et Intégration ORM

## Exercice 1 : Concevoir le Schéma de Base de Données Booking Management

**Objectif :** Définir le schéma complet de base de données pour le microservice Booking Management.

### Solution Complète

#### 1. Table `bookings` (Réservations)

| Colonne                | Type                 | Contraintes                                                          |
| ---------------------- | -------------------- | -------------------------------------------------------------------- |
| `id`                   | UUID                 | PRIMARY KEY, NOT NULL, DEFAULT uuid_generate_v4()                    |
| `tour_id`              | UUID                 | NOT NULL (référence logique au Tour Catalog Service)                |
| `user_id`              | UUID                 | NOT NULL (référence logique au User Service)                        |
| `status`               | ENUM                 | NOT NULL, DEFAULT 'pending', CHECK IN ('pending', 'confirmed', 'cancelled', 'completed', 'refunded', 'expired') |
| `date`                 | DATE                 | NOT NULL (date de la visite)                                         |
| `participants`         | JSONB                | NOT NULL (liste des participants avec nom, âge, type)                |
| `total_price`          | DECIMAL(10,2)        | NOT NULL, CHECK (total_price >= 0)                                   |
| `currency`             | VARCHAR(3)           | NOT NULL, DEFAULT 'EUR'                                              |
| `special_requests`     | TEXT                 | NULL (demandes spéciales du client)                                  |
| `payment_status`       | ENUM                 | NOT NULL, DEFAULT 'pending', CHECK IN ('pending', 'paid', 'failed', 'refunded') |
| `payment_id`           | VARCHAR(255)         | NULL (ID de paiement du Payment Gateway)                            |
| `cancellation_reason`  | TEXT                 | NULL                                                                 |
| `cancelled_at`         | TIMESTAMP            | NULL                                                                 |
| `confirmed_at`         | TIMESTAMP            | NULL                                                                 |
| `refund_details`       | JSONB                | NULL (montant, pourcentage, statut)                                  |
| `modification_history` | JSONB                | NULL (historique des modifications)                                  |
| `created_at`           | TIMESTAMP            | NOT NULL, DEFAULT CURRENT_TIMESTAMP                                  |
| `updated_at`           | TIMESTAMP            | NOT NULL, DEFAULT CURRENT_TIMESTAMP                                  |

**Indexes :**
```sql
CREATE INDEX idx_bookings_tour_id ON bookings(tour_id);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_date ON bookings(date);
CREATE INDEX idx_bookings_created_at ON bookings(created_at DESC);
```

---

#### 2. Table `customers` (Clients - Optionnel dans ce contexte)

**Note :** Dans une architecture microservices, les informations client sont généralement gérées par un microservice User/Customer séparé. Le Booking Service stocke uniquement l'ID utilisateur (`user_id`) comme référence logique.

Si vous choisissez de dupliquer certaines données client pour des raisons de performance (dénormalisation) :

| Colonne         | Type         | Contraintes                       |
| --------------- | ------------ | --------------------------------- |
| `id`            | UUID         | PRIMARY KEY, NOT NULL             |
| `full_name`     | VARCHAR(255) | NOT NULL                          |
| `email`         | VARCHAR(255) | NOT NULL, UNIQUE                  |
| `phone`         | VARCHAR(50)  | NULL                              |
| `date_of_birth` | DATE         | NULL                              |
| `created_at`    | TIMESTAMP    | NOT NULL, DEFAULT CURRENT_TIMESTAMP |
| `updated_at`    | TIMESTAMP    | NOT NULL, DEFAULT CURRENT_TIMESTAMP |

**Approche recommandée :** Ne pas créer cette table. Utiliser `user_id` pour référencer le User Service.

---

#### 3. Table `audit_logs` (Logs d'Audit)

Pour tracer toutes les actions importantes (création, modification, annulation) :

| Colonne       | Type         | Contraintes                       |
| ------------- | ------------ | --------------------------------- |
| `id`          | UUID         | PRIMARY KEY, NOT NULL             |
| `booking_id`  | UUID         | NOT NULL, FOREIGN KEY(bookings.id) ON DELETE CASCADE |
| `action`      | VARCHAR(50)  | NOT NULL (ex: 'created', 'updated', 'cancelled', 'confirmed') |
| `actor_id`    | UUID         | NOT NULL (user_id ou 'system')    |
| `changes`     | JSONB        | NULL (détails des changements)    |
| `ip_address`  | INET         | NULL                              |
| `user_agent`  | TEXT         | NULL                              |
| `timestamp`   | TIMESTAMP    | NOT NULL, DEFAULT CURRENT_TIMESTAMP |

---

#### 4. SQL de Création Complète

```sql
-- Extension pour UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Type ENUM pour le statut de réservation
CREATE TYPE booking_status AS ENUM (
  'pending',
  'confirmed',
  'cancelled',
  'completed',
  'refunded',
  'expired'
);

-- Type ENUM pour le statut de paiement
CREATE TYPE payment_status AS ENUM (
  'pending',
  'paid',
  'failed',
  'refunded'
);

-- Table bookings
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tour_id UUID NOT NULL,
  user_id UUID NOT NULL,
  status booking_status NOT NULL DEFAULT 'pending',
  date DATE NOT NULL,
  participants JSONB NOT NULL,
  total_price DECIMAL(10,2) NOT NULL CHECK (total_price >= 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
  special_requests TEXT,
  payment_status payment_status NOT NULL DEFAULT 'pending',
  payment_id VARCHAR(255),
  cancellation_reason TEXT,
  cancelled_at TIMESTAMP,
  confirmed_at TIMESTAMP,
  refund_details JSONB,
  modification_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_bookings_tour_id ON bookings(tour_id);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_date ON bookings(date);
CREATE INDEX idx_bookings_created_at ON bookings(created_at DESC);
CREATE INDEX idx_bookings_payment_status ON bookings(payment_status);

-- Table audit_logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  actor_id UUID NOT NULL,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_booking_id ON audit_logs(booking_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bookings_updated_at
BEFORE UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Contrainte pour s'assurer que cancelled_at est défini si status = 'cancelled'
ALTER TABLE bookings ADD CONSTRAINT check_cancelled_at
  CHECK (
    (status = 'cancelled' AND cancelled_at IS NOT NULL)
    OR (status != 'cancelled' AND cancelled_at IS NULL)
  );

-- Contrainte pour s'assurer que confirmed_at est défini si status = 'confirmed'
ALTER TABLE bookings ADD CONSTRAINT check_confirmed_at
  CHECK (
    (status = 'confirmed' AND confirmed_at IS NOT NULL)
    OR (status != 'confirmed')
  );
```

---

## Exercice 2 : Implémenter le Modèle Booking avec Sequelize

**Objectif :** Créer un modèle Sequelize complet pour le Booking Management Microservice.

### Solution Complète

#### 1. Configuration du Projet

```bash
# Créer le dossier du projet
mkdir booking-management-service
cd booking-management-service

# Initialiser npm
npm init -y

# Installer les dépendances
npm install sequelize pg pg-hstore dotenv express cors
npm install --save-dev sequelize-cli nodemon

# Initialiser Sequelize
npx sequelize-cli init
```

**Structure créée :**
```
booking-management-service/
├── config/
│   └── config.json
├── migrations/
├── models/
│   └── index.js
├── seeders/
└── package.json
```

---

#### 2. Configuration de la Base de Données

**Fichier `.env` :**

```env
NODE_ENV=development
PORT=3002

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=booking_management_db
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_DIALECT=postgres

# API
API_BASE_PATH=/api/v1
API_VERSION=v1
```

**Fichier `config/database.js` :**

```javascript
// config/database.js
require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'booking_management_db',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: process.env.DB_DIALECT || 'postgres',
    logging: console.log,
    define: {
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  },
  test: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: 'booking_management_test',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false
  },
  production: {
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: false
  }
};
```

**Modifier `.sequelizerc` :**

```javascript
// .sequelizerc
const path = require('path');

module.exports = {
  'config': path.resolve('config', 'database.js'),
  'models-path': path.resolve('models'),
  'seeders-path': path.resolve('seeders'),
  'migrations-path': path.resolve('migrations')
};
```

---

#### 3. Création du Modèle Booking

**Fichier `models/booking.js` :**

```javascript
// models/booking.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Booking extends Model {
    static associate(models) {
      // Associations à définir si nécessaire
      // Par exemple, si vous avez un modèle User local :
      // Booking.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    }

    /**
     * Méthodes d'instance personnalisées
     */
    canBeCancelled() {
      const allowedStatuses = ['pending', 'confirmed'];
      const now = new Date();
      const tourDate = new Date(this.date);

      return allowedStatuses.includes(this.status) && now < tourDate;
    }

    isModifiable() {
      const allowedStatuses = ['pending', 'confirmed'];
      const now = new Date();
      const tourDate = new Date(this.date);
      const hoursUntilTour = (tourDate - now) / (1000 * 60 * 60);

      return allowedStatuses.includes(this.status) && hoursUntilTour >= 48;
    }

    getTotalParticipants() {
      return this.participants ? this.participants.length : 0;
    }

    /**
     * Méthodes de classe (statiques)
     */
    static async findByUserId(userId, options = {}) {
      return this.findAll({
        where: { userId },
        order: [['createdAt', 'DESC']],
        ...options
      });
    }

    static async findUpcoming(options = {}) {
      return this.findAll({
        where: {
          date: {
            [sequelize.Sequelize.Op.gte]: new Date()
          },
          status: {
            [sequelize.Sequelize.Op.in]: ['confirmed', 'pending']
          }
        },
        order: [['date', 'ASC']],
        ...options
      });
    }
  }

  Booking.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      tourId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'tour_id',
        validate: {
          isUUID: 4
        }
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'user_id',
        validate: {
          isUUID: 4
        }
      },
      status: {
        type: DataTypes.ENUM('pending', 'confirmed', 'cancelled', 'completed', 'refunded', 'expired'),
        allowNull: false,
        defaultValue: 'pending',
        validate: {
          isIn: [['pending', 'confirmed', 'cancelled', 'completed', 'refunded', 'expired']]
        }
      },
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: {
          isDate: true,
          isAfter: new Date().toISOString().split('T')[0] // Date doit être dans le futur
        }
      },
      participants: {
        type: DataTypes.JSONB,
        allowNull: false,
        validate: {
          isValidParticipants(value) {
            if (!Array.isArray(value) || value.length === 0) {
              throw new Error('Participants must be a non-empty array');
            }
            value.forEach((participant, index) => {
              if (!participant.name || !participant.age || !participant.type) {
                throw new Error(`Participant at index ${index} is missing required fields`);
              }
            });
          }
        }
      },
      totalPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        field: 'total_price',
        validate: {
          isDecimal: true,
          min: 0
        }
      },
      currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: 'EUR',
        validate: {
          isIn: [['EUR', 'USD', 'GBP', 'JPY', 'CHF']]
        }
      },
      specialRequests: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'special_requests'
      },
      paymentStatus: {
        type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'),
        allowNull: false,
        defaultValue: 'pending',
        field: 'payment_status'
      },
      paymentId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'payment_id'
      },
      cancellationReason: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'cancellation_reason'
      },
      cancelledAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'cancelled_at'
      },
      confirmedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'confirmed_at'
      },
      refundDetails: {
        type: DataTypes.JSONB,
        allowNull: true,
        field: 'refund_details'
      },
      modificationHistory: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
        field: 'modification_history'
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'created_at'
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: 'updated_at'
      }
    },
    {
      sequelize,
      modelName: 'Booking',
      tableName: 'bookings',
      underscored: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [
        { fields: ['tour_id'] },
        { fields: ['user_id'] },
        { fields: ['status'] },
        { fields: ['date'] },
        { fields: ['created_at'] }
      ]
    }
  );

  return Booking;
};
```

---

#### 4. Création de la Migration

```bash
npx sequelize-cli migration:generate --name create-bookings
```

**Fichier généré : `migrations/XXXXXXXXXXXXXX-create-bookings.js` :**

```javascript
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Créer les types ENUM
    await queryInterface.sequelize.query(`
      CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed', 'refunded', 'expired');
    `);

    await queryInterface.sequelize.query(`
      CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
    `);

    // Créer la table bookings
    await queryInterface.createTable('bookings', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      tour_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false
      },
      status: {
        type: 'booking_status',
        allowNull: false,
        defaultValue: 'pending'
      },
      date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      participants: {
        type: Sequelize.JSONB,
        allowNull: false
      },
      total_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: 'EUR'
      },
      special_requests: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      payment_status: {
        type: 'payment_status',
        allowNull: false,
        defaultValue: 'pending'
      },
      payment_id: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      cancellation_reason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      cancelled_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      confirmed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      refund_details: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      modification_history: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: '[]'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Créer les indexes
    await queryInterface.addIndex('bookings', ['tour_id'], {
      name: 'idx_bookings_tour_id'
    });

    await queryInterface.addIndex('bookings', ['user_id'], {
      name: 'idx_bookings_user_id'
    });

    await queryInterface.addIndex('bookings', ['status'], {
      name: 'idx_bookings_status'
    });

    await queryInterface.addIndex('bookings', ['date'], {
      name: 'idx_bookings_date'
    });

    await queryInterface.addIndex('bookings', ['created_at'], {
      name: 'idx_bookings_created_at'
    });
  },

  async down(queryInterface, Sequelize) {
    // Supprimer la table
    await queryInterface.dropTable('bookings');

    // Supprimer les types ENUM
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS booking_status;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS payment_status;');
  }
};
```

---

#### 5. Exécution de la Migration

```bash
# Créer la base de données
createdb booking_management_db

# Exécuter la migration
npx sequelize-cli db:migrate

# Vérifier les migrations
npx sequelize-cli db:migrate:status
```

---

#### 6. Script de Démonstration CRUD

**Fichier `demo/bookingCrud.js` :**

```javascript
// demo/bookingCrud.js
const { Booking } = require('../models');

async function demonstrateCRUD() {
  try {
    console.log('=== Booking CRUD Demonstration ===\n');

    // 1. CREATE - Créer une nouvelle réservation
    console.log('1. Creating a new booking...');
    const newBooking = await Booking.create({
      tourId: '550e8400-e29b-41d4-a716-446655440000',
      userId: 'u9s8e7r6-5i4d-3a2b-1c0d-9e8f7a6b5c4d',
      status: 'pending',
      date: '2026-08-15',
      participants: [
        { name: 'Tony Stark', age: 45, type: 'adult' },
        { name: 'Peter Parker', age: 16, type: 'child' }
      ],
      totalPrice: 224.98,
      currency: 'EUR',
      specialRequests: 'Vegetarian meal preference'
    });
    console.log('Created booking:', newBooking.toJSON());
    console.log('\n');

    // 2. READ - Lire la réservation
    console.log('2. Reading the booking by ID...');
    const foundBooking = await Booking.findByPk(newBooking.id);
    console.log('Found booking:', foundBooking.toJSON());
    console.log('\n');

    // 3. READ - Lire toutes les réservations avec filtre
    console.log('3. Reading all pending bookings...');
    const pendingBookings = await Booking.findAll({
      where: { status: 'pending' },
      order: [['createdAt', 'DESC']],
      limit: 5
    });
    console.log(`Found ${pendingBookings.length} pending bookings`);
    console.log('\n');

    // 4. UPDATE - Mettre à jour la réservation
    console.log('4. Updating the booking (confirm payment)...');
    await foundBooking.update({
      status: 'confirmed',
      paymentStatus: 'paid',
      paymentId: 'pay_abc123xyz789',
      confirmedAt: new Date()
    });
    console.log('Updated booking:', foundBooking.toJSON());
    console.log('\n');

    // 5. Utiliser une méthode personnalisée
    console.log('5. Testing custom instance methods...');
    console.log('Can be cancelled?', foundBooking.canBeCancelled());
    console.log('Is modifiable?', foundBooking.isModifiable());
    console.log('Total participants:', foundBooking.getTotalParticipants());
    console.log('\n');

    // 6. DELETE - Supprimer la réservation (soft delete recommandé en production)
    console.log('6. Deleting the booking...');
    await foundBooking.destroy();
    console.log('Booking deleted successfully');
    console.log('\n');

    console.log('=== CRUD Demonstration Complete ===');
  } catch (error) {
    console.error('Error during CRUD demonstration:', error);
  }
}

// Exécuter la démonstration
demonstrateCRUD()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
```

**Exécution :**
```bash
node demo/bookingCrud.js
```

---

## Exercice 3 : Refactoriser le Modèle Tour Catalog avec Relations

**Objectif :** Ajouter un modèle `Location` au Tour Catalog Microservice et établir une relation one-to-many.

### Solution Complète

#### 1. Création du Modèle Location

**Fichier `models/location.js` :**

```javascript
// models/location.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Location extends Model {
    static associate(models) {
      // Une Location a plusieurs Tours
      Location.hasMany(models.Tour, {
        foreignKey: 'locationId',
        as: 'tours'
      });
    }

    /**
     * Méthodes personnalisées
     */
    getFullName() {
      return `${this.name}, ${this.country}`;
    }

    static async findByCountry(country, options = {}) {
      return this.findAll({
        where: { country },
        include: [{ association: 'tours' }],
        ...options
      });
    }
  }

  Location.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [2, 255]
        }
      },
      country: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
          notEmpty: true
        }
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      imageUrl: {
        type: DataTypes.STRING(500),
        allowNull: true,
        field: 'image_url',
        validate: {
          isUrl: true
        }
      },
      coordinates: {
        type: DataTypes.GEOMETRY('POINT'),
        allowNull: true
      },
      timezone: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      currency: {
        type: DataTypes.STRING(3),
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'created_at'
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'updated_at'
      }
    },
    {
      sequelize,
      modelName: 'Location',
      tableName: 'locations',
      underscored: true,
      timestamps: true
    }
  );

  return Location;
};
```

---

#### 2. Mise à Jour du Modèle Tour

**Fichier `models/tour.js` (modification) :**

```javascript
// models/tour.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Tour extends Model {
    static associate(models) {
      // Un Tour appartient à une Location
      Tour.belongsTo(models.Location, {
        foreignKey: 'locationId',
        as: 'location'
      });
    }
  }

  Tour.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      locationId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'location_id',
        references: {
          model: 'locations',
          key: 'id'
        }
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      currency: {
        type: DataTypes.STRING(3),
        defaultValue: 'EUR'
      },
      duration: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      durationUnit: {
        type: DataTypes.ENUM('hours', 'days', 'weeks'),
        defaultValue: 'hours',
        field: 'duration_unit'
      },
      maxGroupSize: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'max_group_size'
      },
      rating: {
        type: DataTypes.DECIMAL(3, 2),
        defaultValue: 0
      },
      ratingsCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'ratings_count'
      },
      images: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: []
      },
      createdAt: {
        type: DataTypes.DATE,
        field: 'created_at'
      },
      updatedAt: {
        type: DataTypes.DATE,
        field: 'updated_at'
      }
    },
    {
      sequelize,
      modelName: 'Tour',
      tableName: 'tours',
      underscored: true,
      timestamps: true
    }
  );

  return Tour;
};
```

---

#### 3. Création des Migrations

**Migration 1 : Créer la table locations**

```bash
npx sequelize-cli migration:generate --name create-locations
```

**Fichier `migrations/XXXXXX-create-locations.js` :**

```javascript
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('locations', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      country: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      image_url: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      coordinates: {
        type: Sequelize.GEOMETRY('POINT'),
        allowNull: true
      },
      timezone: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    await queryInterface.addIndex('locations', ['country'], {
      name: 'idx_locations_country'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('locations');
  }
};
```

**Migration 2 : Ajouter location_id à la table tours**

```bash
npx sequelize-cli migration:generate --name add-location-id-to-tours
```

**Fichier `migrations/XXXXXX-add-location-id-to-tours.js` :**

```javascript
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('tours', 'location_id', {
      type: Sequelize.UUID,
      allowNull: true, // Temporairement nullable pour la migration
      references: {
        model: 'locations',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addIndex('tours', ['location_id'], {
      name: 'idx_tours_location_id'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('tours', 'location_id');
  }
};
```

---

#### 4. Seed pour Locations et Tours

```bash
npx sequelize-cli seed:generate --name demo-locations-and-tours
```

**Fichier `seeders/XXXXXX-demo-locations-and-tours.js` :**

```javascript
'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    const locationIds = {
      paris: uuidv4(),
      london: uuidv4(),
      tokyo: uuidv4()
    };

    // Insérer les locations
    await queryInterface.bulkInsert('locations', [
      {
        id: locationIds.paris,
        name: 'Paris',
        country: 'France',
        description: 'La Ville Lumière, capitale de la France',
        image_url: 'https://cdn.example.com/locations/paris.jpg',
        timezone: 'Europe/Paris',
        currency: 'EUR',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: locationIds.london,
        name: 'London',
        country: 'United Kingdom',
        description: 'La capitale historique du Royaume-Uni',
        image_url: 'https://cdn.example.com/locations/london.jpg',
        timezone: 'Europe/London',
        currency: 'GBP',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: locationIds.tokyo,
        name: 'Tokyo',
        country: 'Japan',
        description: 'La métropole moderne du Japon',
        image_url: 'https://cdn.example.com/locations/tokyo.jpg',
        timezone: 'Asia/Tokyo',
        currency: 'JPY',
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    // Insérer les tours liés aux locations
    await queryInterface.bulkInsert('tours', [
      {
        id: uuidv4(),
        title: 'Visite de la Tour Eiffel et Croisière sur la Seine',
        description: 'Découvrez les monuments emblématiques de Paris',
        location_id: locationIds.paris,
        price: 89.99,
        currency: 'EUR',
        duration: 4,
        duration_unit: 'hours',
        max_group_size: 20,
        rating: 4.7,
        ratings_count: 342,
        images: ['https://cdn.example.com/tours/eiffel-1.jpg'],
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        title: 'Visite Guidée du British Museum',
        description: 'Explorez l\'histoire mondiale au British Museum',
        location_id: locationIds.london,
        price: 45.00,
        currency: 'GBP',
        duration: 3,
        duration_unit: 'hours',
        max_group_size: 25,
        rating: 4.6,
        ratings_count: 210,
        images: ['https://cdn.example.com/tours/british-museum.jpg'],
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        title: 'Tokyo Street Food Tour',
        description: 'Découvrez la cuisine de rue authentique de Tokyo',
        location_id: locationIds.tokyo,
        price: 12000,
        currency: 'JPY',
        duration: 4,
        duration_unit: 'hours',
        max_group_size: 12,
        rating: 4.9,
        ratings_count: 156,
        images: ['https://cdn.example.com/tours/tokyo-food.jpg'],
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('tours', null, {});
    await queryInterface.bulkDelete('locations', null, {});
  }
};
```

**Exécution :**
```bash
npx sequelize-cli db:seed:all
```

---

#### 5. Démonstration des Relations

**Fichier `demo/locationRelations.js` :**

```javascript
// demo/locationRelations.js
const { Location, Tour } = require('../models');

async function demonstrateRelations() {
  try {
    console.log('=== Location-Tour Relations Demonstration ===\n');

    // 1. Récupérer une Location avec ses Tours (eager loading)
    console.log('1. Finding location with all tours...');
    const paris = await Location.findOne({
      where: { name: 'Paris' },
      include: [{
        association: 'tours',
        attributes: ['id', 'title', 'price', 'currency']
      }]
    });

    console.log(`Location: ${paris.getFullName()}`);
    console.log(`Tours in ${paris.name}:`, paris.tours.length);
    paris.tours.forEach(tour => {
      console.log(`  - ${tour.title} (${tour.price} ${tour.currency})`);
    });
    console.log('\n');

    // 2. Récupérer un Tour avec sa Location
    console.log('2. Finding tour with location...');
    const tour = await Tour.findOne({
      where: { title: { [Tour.sequelize.Op.like]: '%Eiffel%' } },
      include: [{
        association: 'location',
        attributes: ['name', 'country', 'timezone']
      }]
    });

    console.log(`Tour: ${tour.title}`);
    console.log(`Location: ${tour.location.getFullName()}`);
    console.log(`Timezone: ${tour.location.timezone}`);
    console.log('\n');

    // 3. Créer un nouveau Tour avec une Location existante
    console.log('3. Creating a new tour for Paris...');
    const newTour = await Tour.create({
      title: 'Musée du Louvre - Visite Privée',
      description: 'Visite exclusive du Louvre',
      locationId: paris.id,
      price: 150.00,
      currency: 'EUR',
      duration: 5,
      durationUnit: 'hours',
      maxGroupSize: 10
    });

    console.log(`Created tour: ${newTour.title}`);
    console.log('\n');

    // 4. Rechercher toutes les locations d'un pays avec leurs tours
    console.log('4. Finding all locations in France...');
    const franceLocations = await Location.findByCountry('France');
    franceLocations.forEach(loc => {
      console.log(`${loc.getFullName()} - ${loc.tours.length} tours`);
    });
    console.log('\n');

    console.log('=== Relations Demonstration Complete ===');
  } catch (error) {
    console.error('Error:', error);
  }
}

demonstrateRelations()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
```

**Exécution :**
```bash
node demo/locationRelations.js
```

---

## Conclusion

Ces exercices ont permis de maîtriser :

1. **Conception de schéma de base de données** avec tables, contraintes, indexes et types ENUM pour PostgreSQL
2. **Implémentation de modèles Sequelize** avec validations, méthodes personnalisées et migrations
3. **Relations entre modèles** (one-to-many) avec eager loading et méthodes d'association

**Bonnes pratiques appliquées :**
- ✅ UUIDs comme clés primaires pour la scalabilité distribuée
- ✅ Types ENUM pour les statuts avec contraintes
- ✅ JSONB pour données semi-structurées (participants, refund details)
- ✅ Indexes stratégiques pour optimiser les requêtes
- ✅ Timestamps automatiques (created_at, updated_at)
- ✅ Migrations versionnées pour gestion du schéma
- ✅ Seeds pour données de test
- ✅ Validations au niveau du modèle

**Module 2 Terminé !** Vous avez maintenant une compréhension complète de la conception et de l'implémentation de microservices avec DDD, API RESTful, et persistance des données.
