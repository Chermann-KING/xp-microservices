/**
 * Routes API pour les tours (visites touristiques)
 * Implémente tous les endpoints RESTful selon les principes de la leçon 1.4
 */

const express = require('express');
const router = express.Router();
const { executeQuery } = require('../config/db');

/**
 * GET /api/v1/tours
 * Récupérer la liste de toutes les visites
 * Query params: destination, price_max, price_min, difficulty, sort, limit, page
 */
router.get('/', async (req, res) => {
  try {
    const {
      destination,
      price_max,
      price_min,
      difficulty,
      sort = 'name',
      limit = 10,
      page = 1
    } = req.query;

    // Construction dynamique de la requête
    let query = 'SELECT * FROM tours WHERE available = true';
    const params = [];
    let paramCount = 1;

    // Filtrage par destination
    if (destination) {
      query += ` AND destination ILIKE $${paramCount}`;
      params.push(`%${destination}%`);
      paramCount++;
    }

    // Filtrage par prix maximum
    if (price_max) {
      query += ` AND price <= $${paramCount}`;
      params.push(parseFloat(price_max));
      paramCount++;
    }

    // Filtrage par prix minimum
    if (price_min) {
      query += ` AND price >= $${paramCount}`;
      params.push(parseFloat(price_min));
      paramCount++;
    }

    // Filtrage par difficulté
    if (difficulty) {
      query += ` AND difficulty = $${paramCount}`;
      params.push(difficulty);
      paramCount++;
    }

    // Tri
    const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
    const sortOrder = sort.startsWith('-') ? 'DESC' : 'ASC';
    const allowedSortFields = ['name', 'price', 'destination', 'created_at'];

    if (allowedSortFields.includes(sortField)) {
      query += ` ORDER BY ${sortField} ${sortOrder}`;
    } else {
      query += ' ORDER BY name ASC';
    }

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit), offset);

    // Exécuter la requête
    const result = await executeQuery(query, params);

    // Compter le total pour la pagination
    let countQuery = 'SELECT COUNT(*) FROM tours WHERE available = true';
    const countParams = [];
    let countParamIndex = 1;

    if (destination) {
      countQuery += ` AND destination ILIKE $${countParamIndex}`;
      countParams.push(`%${destination}%`);
      countParamIndex++;
    }
    if (price_max) {
      countQuery += ` AND price <= $${countParamIndex}`;
      countParams.push(parseFloat(price_max));
      countParamIndex++;
    }
    if (price_min) {
      countQuery += ` AND price >= $${countParamIndex}`;
      countParams.push(parseFloat(price_min));
      countParamIndex++;
    }
    if (difficulty) {
      countQuery += ` AND difficulty = $${countParamIndex}`;
      countParams.push(difficulty);
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
        total_pages: Math.ceil(total / parseInt(limit)),
        has_previous: parseInt(page) > 1,
        has_next: parseInt(page) < Math.ceil(total / parseInt(limit))
      },
      filters: {
        destination,
        price_max,
        price_min,
        difficulty
      }
    });

  } catch (error) {
    console.error('Erreur GET /tours:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Erreur lors de la récupération des visites'
      }
    });
  }
});

/**
 * GET /api/v1/tours/:id
 * Récupérer une visite spécifique par ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tourId = parseInt(id, 10);

    if (isNaN(tourId)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ID',
          message: 'L\'ID doit être un nombre valide'
        }
      });
    }

    const query = 'SELECT * FROM tours WHERE id = $1';
    const result = await executeQuery(query, [tourId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'TOUR_NOT_FOUND',
          message: `Aucune visite trouvée avec l'ID ${tourId}`
        }
      });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Erreur GET /tours/:id:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Erreur lors de la récupération de la visite'
      }
    });
  }
});

/**
 * POST /api/v1/tours
 * Créer une nouvelle visite
 */
router.post('/', async (req, res) => {
  try {
    const {
      name,
      description,
      destination,
      price,
      duration,
      max_group_size,
      difficulty = 'moderate',
      image_url
    } = req.body;

    // Validation
    if (!name || !description || !destination || price === undefined || !duration || !max_group_size) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Données manquantes',
          required: ['name', 'description', 'destination', 'price', 'duration', 'max_group_size']
        }
      });
    }

    if (typeof price !== 'number' || price < 0) {
      return res.status(400).json({
        error: {
          code: 'INVALID_PRICE',
          message: 'Le prix doit être un nombre positif'
        }
      });
    }

    if (typeof max_group_size !== 'number' || max_group_size < 1) {
      return res.status(400).json({
        error: {
          code: 'INVALID_GROUP_SIZE',
          message: 'La taille maximale du groupe doit être au moins 1'
        }
      });
    }

    // Insertion
    const query = `
      INSERT INTO tours (name, description, destination, price, duration, max_group_size, difficulty, image_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const values = [name, description, destination, price, duration, max_group_size, difficulty, image_url];
    const result = await executeQuery(query, values);

    res.status(201).json({
      message: 'Visite créée avec succès',
      tour: result.rows[0]
    });

  } catch (error) {
    console.error('Erreur POST /tours:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Erreur lors de la création de la visite'
      }
    });
  }
});

/**
 * PATCH /api/v1/tours/:id
 * Mettre à jour partiellement une visite
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tourId = parseInt(id, 10);

    if (isNaN(tourId)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ID',
          message: 'L\'ID doit être un nombre valide'
        }
      });
    }

    // Vérifier que la visite existe
    const checkQuery = 'SELECT * FROM tours WHERE id = $1';
    const checkResult = await executeQuery(checkQuery, [tourId]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'TOUR_NOT_FOUND',
          message: `Aucune visite trouvée avec l'ID ${tourId}`
        }
      });
    }

    // Construction dynamique de la requête UPDATE
    const allowedFields = ['name', 'description', 'destination', 'price', 'duration', 'max_group_size', 'difficulty', 'image_url', 'available'];
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

    values.push(tourId);
    const query = `UPDATE tours SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await executeQuery(query, values);

    res.json({
      message: 'Visite mise à jour avec succès',
      tour: result.rows[0]
    });

  } catch (error) {
    console.error('Erreur PATCH /tours/:id:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Erreur lors de la mise à jour de la visite'
      }
    });
  }
});

/**
 * DELETE /api/v1/tours/:id
 * Supprimer une visite
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tourId = parseInt(id, 10);

    if (isNaN(tourId)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_ID',
          message: 'L\'ID doit être un nombre valide'
        }
      });
    }

    const query = 'DELETE FROM tours WHERE id = $1 RETURNING id';
    const result = await executeQuery(query, [tourId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'TOUR_NOT_FOUND',
          message: `Aucune visite trouvée avec l'ID ${tourId}`
        }
      });
    }

    res.status(204).send();

  } catch (error) {
    console.error('Erreur DELETE /tours/:id:', error);
    res.status(500).json({
      error: {
        code: 'SERVER_ERROR',
        message: 'Erreur lors de la suppression de la visite'
      }
    });
  }
});

module.exports = router;
