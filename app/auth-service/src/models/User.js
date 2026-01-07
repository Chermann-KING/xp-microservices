/**
 * @fileoverview Modèle User pour l'authentification
 */

import { DataTypes } from 'sequelize';
import bcrypt from 'bcrypt';
import { sequelize } from '../config/database.js';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  firstName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'first_name'
  },
  lastName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'last_name'
  },
  role: {
    type: DataTypes.ENUM('customer', 'admin', 'manager'),
    defaultValue: 'customer',
    allowNull: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  lastLogin: {
    type: DataTypes.DATE,
    field: 'last_login'
  },
  refreshToken: {
    type: DataTypes.STRING(500),
    field: 'refresh_token'
  }
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const rounds = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;
        user.password = await bcrypt.hash(user.password, rounds);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const rounds = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;
        user.password = await bcrypt.hash(user.password, rounds);
      }
    }
  }
});

/**
 * Vérifie si le mot de passe correspond
 * @param {string} candidatePassword - Mot de passe à vérifier
 * @returns {Promise<boolean>}
 */
User.prototype.validatePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Retourne les données utilisateur sans informations sensibles
 * @returns {Object}
 */
User.prototype.toSafeJSON = function() {
  const { password, refreshToken, ...safeUser } = this.toJSON();
  return safeUser;
};

export { User };
export default User;
