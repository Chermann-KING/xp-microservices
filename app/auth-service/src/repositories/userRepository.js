/**
 * @fileoverview Repository pour les opérations sur les utilisateurs
 */

import { User } from "../models/index.js";

class UserRepository {
  /**
   * Crée un nouvel utilisateur
   * @param {Object} userData - Données de l'utilisateur
   * @returns {Promise<User>}
   */
  async create(userData) {
    return User.create(userData);
  }

  /**
   * Trouve un utilisateur par email
   * @param {string} email
   * @returns {Promise<User|null>}
   */
  async findByEmail(email) {
    return User.findOne({
      where: { email: email.toLowerCase() },
    });
  }

  /**
   * Trouve un utilisateur par ID
   * @param {string} id
   * @returns {Promise<User|null>}
   */
  async findById(id) {
    return User.findByPk(id);
  }

  /**
   * Met à jour le refresh token
   * @param {string} userId
   * @param {string|null} refreshToken
   * @returns {Promise<[number]>}
   */
  async updateRefreshToken(userId, refreshToken) {
    return User.update({ refreshToken }, { where: { id: userId } });
  }

  /**
   * Met à jour la date de dernière connexion
   * @param {string} userId
   * @returns {Promise<[number]>}
   */
  async updateLastLogin(userId) {
    return User.update({ lastLogin: new Date() }, { where: { id: userId } });
  }

  /**
   * Trouve un utilisateur par refresh token
   * @param {string} refreshToken
   * @returns {Promise<User|null>}
   */
  async findByRefreshToken(refreshToken) {
    return User.findOne({
      where: { refreshToken },
    });
  }

  /**
   * Met à jour le mot de passe d'un utilisateur
   * @param {string} userId
   * @param {string} newPassword
   * @returns {Promise<[number]>}
   */
  async updatePassword(userId, newPassword) {
    const user = await User.findByPk(userId);
    if (user) {
      user.password = newPassword;
      await user.save();
      return [1];
    }
    return [0];
  }
}

export const userRepository = new UserRepository();
export default userRepository;
