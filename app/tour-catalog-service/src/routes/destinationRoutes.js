import express from 'express';
import {
  getAllDestinations,
  getDestinationById,
  createDestination,
  updateDestination,
  deleteDestination
} from '../controllers/destinationController.js';

const router = express.Router();

router.get('/', getAllDestinations);
router.get('/:destinationId', getDestinationById);
router.post('/', createDestination);
router.put('/:destinationId', updateDestination);
router.delete('/:destinationId', deleteDestination);

export default router;
