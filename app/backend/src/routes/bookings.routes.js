/**
 * Routes API pour les réservations (bookings)
 * Gère toutes les opérations CRUD sur les réservations
 */

const express = require('express');
const router = express.Router();
const { executeQuery, executeTransaction } = require('../config/db');

/**
 * GET /api/v1/bookings
 * Récupérer la liste des réservations
 * Query params: user_id, tour_id, status, limit, page
 */
router.get('/', async (req, res) => {
  try {
    const {
      user_id,
      tour_id,
      status,
      limit = 20,
      page = 1
    } = req.query;

    let query = `
      SELECT
        b.*,
        t.name as tour_name,
        t.destination,
        u.email as user_email,
        u.first_name,
        u.last_name
      FROM bookings b
      JOIN tours t ON b.tour_id = t.id
      JOIN users u ON b.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (user_id) {
      query += ` AND b.user_id = $${paramCount}`;
      params.push(parseInt(user_id));
      paramCount++;
    }

    if (tour_id) {
      query += ` AND b.tour_id = $${paramCount}`;
      params.push(parseInt(tour_id));
      paramCount++;
    }

    if (status) {
      query += ` AND b.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    query += ' ORDER BY b.created_at DESC';

    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit), offset);

    const result = await executeQuery(query, params);

    // Compter le total
    let countQuery = 'SELECT COUNT(*) FROM bookings WHERE 1=1';
    const countParams = [];
    let countIndex = 1;

    if (user_id) {
      countQuery += ` AND user_id = $${countIndex}`;
      countParams.push(parseInt(user_id));
      countIndex++;
    }
    if (tour_id) {
      countQuery += ` AND tour_id = $${countIndex}`;
      countParams.push(parseInt(tour_id));
      countIndex++;
    }
    if (status) {
      countQuery += ` AND status = $${countIndex}`;
      countParams.push(status);
    }

    const countResult = await executeQuery(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      data: result.rows,
      pagination: {
        total,
        count: result.rows.length,
        per_page: parseInt(limit),
        current_page: parseInt(page),
        total_pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Erreur GET /bookings:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Erreur lors de la récupération des réservations'
      }
    });
  }
});

/**
 * GET /api/v1/bookings/:id
 * Récupérer une réservation spécifique
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const bookingId = parseInt(id, 10);

    if (isNaN(bookingId)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ID',
          message: 'L\'ID doit être un nombre valide'
        }
      });
    }

    const query = `
      SELECT
        b.*,
        t.name as tour_name,
        t.description as tour_description,
        t.destination,
        t.duration,
        u.email as user_email,
        u.first_name,
        u.last_name,
        u.phone
      FROM bookings b
      JOIN tours t ON b.tour_id = t.id
      JOIN users u ON b.user_id = u.id
      WHERE b.id = $1
    `;
    const result = await executeQuery(query, [bookingId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'BOOKING_NOT_FOUND',
          message: `Aucune réservation trouvée avec l'ID ${bookingId}`
        }
      });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Erreur GET /bookings/:id:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Erreur lors de la récupération de la réservation'
      }
    });
  }
});

/**
 * POST /api/v1/bookings
 * Créer une nouvelle réservation
 */
router.post('/', async (req, res) => {
  try {
    const {
      tour_id,
      user_id,
      booking_date,
      number_of_travelers,
      special_requests
    } = req.body;

    // Validation
    if (!tour_id || !user_id || !booking_date || !number_of_travelers) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Données manquantes',
          required: ['tour_id', 'user_id', 'booking_date', 'number_of_travelers']
        }
      });
    }

    // Vérifier que le tour existe et récupérer son prix
    const tourQuery = 'SELECT * FROM tours WHERE id = $1 AND available = true';
    const tourResult = await executeQuery(tourQuery, [tour_id]);

    if (tourResult.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'TOUR_NOT_FOUND',
          message: 'Visite non trouvée ou non disponible'
        }
      });
    }

    const tour = tourResult.rows[0];

    // Vérifier que l'utilisateur existe
    const userQuery = 'SELECT id FROM users WHERE id = $1';
    const userResult = await executeQuery(userQuery, [user_id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Utilisateur non trouvé'
        }
      });
    }

    // Vérifier la capacité
    if (number_of_travelers > tour.max_group_size) {
      return res.status(422).json({
        error: {
          code: 'EXCEEDS_MAX_CAPACITY',
          message: `Le nombre de voyageurs (${number_of_travelers}) dépasse la capacité maximale (${tour.max_group_size})`
        }
      });
    }

    // Calculer le prix total
    const total_price = parseFloat(tour.price) * parseInt(number_of_travelers);

    // Créer la réservation
    const insertQuery = `
      INSERT INTO bookings
        (tour_id, user_id, booking_date, number_of_travelers, total_price, special_requests, status, payment_status)
      VALUES ($1, $2, $3, $4, $5, $6, 'pending', 'pending')
      RETURNING *
    `;
    const values = [tour_id, user_id, booking_date, number_of_travelers, total_price, special_requests];
    const result = await executeQuery(insertQuery, values);

    res.status(201).json({
      message: 'Réservation créée avec succès',
      booking: result.rows[0]
    });

  } catch (error) {
    console.error('Erreur POST /bookings:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Erreur lors de la création de la réservation'
      }
    });
  }
});

/**
 * PATCH /api/v1/bookings/:id
 * Mettre à jour une réservation
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const bookingId = parseInt(id, 10);

    if (isNaN(bookingId)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ID',
          message: 'L\'ID doit être un nombre valide'
        }
      });
    }

    // Vérifier que la réservation existe
    const checkQuery = 'SELECT * FROM bookings WHERE id = $1';
    const checkResult = await executeQuery(checkQuery, [bookingId]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'BOOKING_NOT_FOUND',
          message: `Aucune réservation trouvée avec l'ID ${bookingId}`
        }
      });
    }

    // Champs autorisés à la mise à jour
    const allowedFields = ['booking_date', 'number_of_travelers', 'status', 'payment_status', 'special_requests'];
    const updates = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(req.body)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updates.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: {
          code: 'NO_UPDATE_DATA',
          message: 'Aucune donnée à mettre à jour'
        }
      });
    }

    values.push(bookingId);
    const query = `UPDATE bookings SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await executeQuery(query, values);

    res.json({
      message: 'Réservation mise à jour avec succès',
      booking: result.rows[0]
    });

  } catch (error) {
    console.error('Erreur PATCH /bookings/:id:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Erreur lors de la mise à jour de la réservation'
      }
    });
  }
});

/**
 * DELETE /api/v1/bookings/:id
 * Annuler/Supprimer une réservation
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const bookingId = parseInt(id, 10);

    if (isNaN(bookingId)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ID',
          message: 'L\'ID doit être un nombre valide'
        }
      });
    }

    // Plutôt que supprimer, on marque comme annulé
    const query = `
      UPDATE bookings
      SET status = 'cancelled'
      WHERE id = $1
      RETURNING *
    `;
    const result = await executeQuery(query, [bookingId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'BOOKING_NOT_FOUND',
          message: `Aucune réservation trouvée avec l'ID ${bookingId}`
        }
      });
    }

    res.json({
      message: 'Réservation annulée avec succès',
      booking: result.rows[0]
    });

  } catch (error) {
    console.error('Erreur DELETE /bookings/:id:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Erreur lors de l\'annulation de la réservation'
      }
    });
  }
});

module.exports = router;
