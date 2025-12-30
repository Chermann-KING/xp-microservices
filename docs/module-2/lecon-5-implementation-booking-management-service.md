# Leçon 2.5 - Implémentation du Microservice Booking Management

**Module 2** : Conception et Implémentation des Microservices Principaux

---

## Vue d'ensemble

Après avoir conçu l'API du microservice Booking Management dans la leçon précédente, nous allons maintenant implémenter ce service en utilisant Node.js 24.x et Express 4.21.x. Cette implémentation inclut la gestion complète du cycle de vie des réservations, la vérification de disponibilité, la communication avec d'autres microservices et l'orchestration des flux de travail.

Nous utiliserons un stockage en mémoire pour cette première version, puis nous intégrerons PostgreSQL avec Sequelize dans les leçons ultérieures.

---

## Configuration du Projet

### 1. Initialisation du Projet

Créez un nouveau répertoire pour le microservice :

```bash
mkdir booking-management-service
cd booking-management-service
npm init -y
```

### 2. Installation des Dépendances

```bash
# Dépendances de production
npm install express@4.21.1 dotenv@16.4.7 uuid@11.0.3 cors@2.8.5 axios@1.7.9

# Dépendances de développement
npm install --save-dev nodemon@3.1.9 @types/express@4.17.21 @types/node@24.0.0
```

**Nouvelles dépendances :**

- **axios** : Client HTTP pour communiquer avec d'autres microservices (Tour Catalog, Payment Gateway)

### 3. Structure du Projet

```
booking-management-service/
├── src/
│   ├── config/
│   │   ├── database.js
│   │   └── services.js
│   ├── controllers/
│   │   ├── bookingController.js
│   │   └── availabilityController.js
│   ├── models/
│   │   └── bookingModel.js
│   ├── routes/
│   │   ├── bookingRoutes.js
│   │   └── availabilityRoutes.js
│   ├── services/
│   │   ├── tourCatalogService.js
│   │   ├── availabilityService.js
│   │   └── bookingStateMachine.js
│   ├── middleware/
│   │   ├── errorHandler.js
│   │   └── validator.js
│   ├── utils/
│   │   └── response.js
│   └── app.js
├── .env
├── .gitignore
├── package.json
└── server.js
```

### 4. Configuration de package.json

```json
{
  "name": "booking-management-service",
  "version": "1.0.0",
  "description": "Booking Management Microservice for Tourism Booking Application",
  "main": "server.js",
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "keywords": ["microservice", "booking", "reservation", "rest-api"],
  "author": "",
  "license": "ISC"
}
```

---

## Configuration de l'Environnement

### Fichier .env

```env
NODE_ENV=development
PORT=3002
API_VERSION=v1
API_BASE_PATH=/api

# URL des autres microservices
TOUR_CATALOG_SERVICE_URL=http://localhost:3001
PAYMENT_GATEWAY_SERVICE_URL=http://localhost:3003
```

### Fichier .gitignore

```
node_modules/
.env
*.log
.DS_Store
```

---

## Configuration des Services Externes

### src/config/services.js

```javascript
export const servicesConfig = {
  tourCatalog: {
    baseURL: process.env.TOUR_CATALOG_SERVICE_URL || 'http://localhost:3001',
    apiPath: '/api/v1/tours-catalog',
    timeout: 5000
  },
  paymentGateway: {
    baseURL: process.env.PAYMENT_GATEWAY_SERVICE_URL || 'http://localhost:3003',
    apiPath: '/api/v1/payment-gateway',
    timeout: 5000
  }
};
```

---

## Serveur Principal et Application Express

### server.js

```javascript
import dotenv from 'dotenv';
import app from './src/app.js';

dotenv.config();

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
  console.log(`🚀 Booking Management Service running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}${process.env.API_BASE_PATH}/${process.env.API_VERSION}`);
});
```

### src/app.js

```javascript
import express from 'express';
import cors from 'cors';
import bookingRoutes from './routes/bookingRoutes.js';
import availabilityRoutes from './routes/availabilityRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Middleware global
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Booking Management Service is healthy',
    timestamp: new Date().toISOString()
  });
});

// API Routes
const API_BASE = `${process.env.API_BASE_PATH}/${process.env.API_VERSION}/booking-management`;

app.use(`${API_BASE}/bookings`, bookingRoutes);
app.use(`${API_BASE}/availability`, availabilityRoutes);

// Route 404
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    error: {
      code: 'ENDPOINT_NOT_FOUND',
      message: 'The requested endpoint does not exist',
      path: req.path
    }
  });
});

// Middleware de gestion des erreurs
app.use(errorHandler);

export default app;
```

---

## Utilitaires

### src/utils/response.js

```javascript
export const sendSuccess = (res, data, statusCode = 200) => {
  res.status(statusCode).json({
    status: 'success',
    data
  });
};

export const sendError = (res, code, message, details = null, statusCode = 400) => {
  const errorResponse = {
    status: 'error',
    error: {
      code,
      message
    }
  };

  if (details) {
    errorResponse.error.details = details;
  }

  res.status(statusCode).json(errorResponse);
};

export const createPagination = (page, limit, totalItems) => {
  const currentPage = parseInt(page) || 1;
  const itemsPerPage = parseInt(limit) || 10;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return {
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage
  };
};

/**
 * Crée des liens HATEOAS pour une réservation
 */
export const addBookingHateoasLinks = (booking) => {
  const baseUrl = `${process.env.API_BASE_PATH}/${process.env.API_VERSION}`;

  return {
    ...booking,
    links: {
      self: `${baseUrl}/booking-management/bookings/${booking.id}`,
      tour: `${baseUrl}/tours-catalog/tours/${booking.tourId}`,
      cancel: `${baseUrl}/booking-management/bookings/${booking.id}/cancel`,
      payment: booking.paymentStatus === 'pending'
        ? `${baseUrl}/payment-gateway/payments/create?bookingId=${booking.id}`
        : undefined
    }
  };
};
```

---

## Middleware de Gestion des Erreurs

### src/middleware/errorHandler.js

```javascript
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      status: 'error',
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message,
        details: err.details || null
      }
    });
  }

  if (err.name === 'NotFoundError') {
    return res.status(404).json({
      status: 'error',
      error: {
        code: err.code || 'RESOURCE_NOT_FOUND',
        message: err.message,
        details: err.details || null
      }
    });
  }

  if (err.name === 'ConflictError') {
    return res.status(409).json({
      status: 'error',
      error: {
        code: err.code || 'CONFLICT',
        message: err.message,
        details: err.details || null
      }
    });
  }

  res.status(err.statusCode || 500).json({
    status: 'error',
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'development'
        ? err.message
        : 'An unexpected error occurred'
    }
  });
};

export class NotFoundError extends Error {
  constructor(message, code, details = null) {
    super(message);
    this.name = 'NotFoundError';
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends Error {
  constructor(message, details = null) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

export class ConflictError extends Error {
  constructor(message, code, details = null) {
    super(message);
    this.name = 'ConflictError';
    this.code = code;
    this.details = details;
  }
}
```

---

## Service de Communication avec Tour Catalog

### src/services/tourCatalogService.js

```javascript
import axios from 'axios';
import { servicesConfig } from '../config/services.js';

const tourCatalogAPI = axios.create({
  baseURL: `${servicesConfig.tourCatalog.baseURL}${servicesConfig.tourCatalog.apiPath}`,
  timeout: servicesConfig.tourCatalog.timeout
});

/**
 * Récupère les détails d'une visite depuis le Tour Catalog
 */
export const getTourDetails = async (tourId) => {
  try {
    const response = await tourCatalogAPI.get(`/tours/${tourId}`);
    return response.data.data.tour;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return null;
    }
    throw new Error(`Failed to fetch tour details: ${error.message}`);
  }
};

/**
 * Vérifie si une visite existe
 */
export const tourExists = async (tourId) => {
  const tour = await getTourDetails(tourId);
  return tour !== null;
};
```

---

## Service de Gestion de Disponibilité

### src/services/availabilityService.js

```javascript
// Stockage en mémoire de la disponibilité
// Dans une application réelle, cela serait dans une base de données
const availabilityData = new Map();

/**
 * Génère une clé unique pour la disponibilité (tourId + date)
 */
const generateAvailabilityKey = (tourId, date) => {
  const dateStr = new Date(date).toISOString().split('T')[0];
  return `${tourId}_${dateStr}`;
};

/**
 * Initialise la disponibilité pour une visite et une date
 */
export const initializeAvailability = (tourId, date, maxCapacity) => {
  const key = generateAvailabilityKey(tourId, date);
  if (!availabilityData.has(key)) {
    availabilityData.set(key, {
      tourId,
      date,
      maxCapacity,
      bookedSeats: 0
    });
  }
};

/**
 * Récupère la disponibilité pour une visite à une date donnée
 */
export const getAvailability = (tourId, date, maxCapacity = 20) => {
  const key = generateAvailabilityKey(tourId, date);

  if (!availabilityData.has(key)) {
    initializeAvailability(tourId, date, maxCapacity);
  }

  const availability = availabilityData.get(key);

  return {
    tourId: availability.tourId,
    date: availability.date,
    maxCapacity: availability.maxCapacity,
    bookedSeats: availability.bookedSeats,
    availableSeats: availability.maxCapacity - availability.bookedSeats,
    isAvailable: (availability.maxCapacity - availability.bookedSeats) > 0
  };
};

/**
 * Réserve des places pour une visite
 */
export const reserveSeats = (tourId, date, numberOfSeats) => {
  const key = generateAvailabilityKey(tourId, date);
  const availability = availabilityData.get(key);

  if (!availability) {
    throw new Error('Availability not initialized');
  }

  if (availability.maxCapacity - availability.bookedSeats < numberOfSeats) {
    return false;
  }

  availability.bookedSeats += numberOfSeats;
  availabilityData.set(key, availability);
  return true;
};

/**
 * Libère des places pour une visite (lors d'une annulation)
 */
export const releaseSeats = (tourId, date, numberOfSeats) => {
  const key = generateAvailabilityKey(tourId, date);
  const availability = availabilityData.get(key);

  if (!availability) {
    return;
  }

  availability.bookedSeats = Math.max(0, availability.bookedSeats - numberOfSeats);
  availabilityData.set(key, availability);
};
```

---

## Machine à États de Réservation

### src/services/bookingStateMachine.js

```javascript
/**
 * États possibles d'une réservation
 */
export const BookingStatus = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

/**
 * Transitions de statut valides
 */
const validTransitions = {
  [BookingStatus.PENDING]: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED],
  [BookingStatus.CONFIRMED]: [BookingStatus.COMPLETED, BookingStatus.CANCELLED],
  [BookingStatus.COMPLETED]: [],
  [BookingStatus.CANCELLED]: []
};

/**
 * Vérifie si une transition de statut est valide
 */
export const isValidTransition = (currentStatus, newStatus) => {
  return validTransitions[currentStatus]?.includes(newStatus) || false;
};

/**
 * Obtient les transitions valides depuis un statut donné
 */
export const getValidTransitions = (currentStatus) => {
  return validTransitions[currentStatus] || [];
};

/**
 * Vérifie si une réservation peut être annulée
 */
export const canBeCancelled = (status) => {
  return status === BookingStatus.PENDING || status === BookingStatus.CONFIRMED;
};
```

---

## Modèle de Données

### src/models/bookingModel.js

```javascript
import { v4 as uuidv4 } from 'uuid';
import { BookingStatus } from '../services/bookingStateMachine.js';

// Stockage en mémoire des réservations
let bookings = [];

/**
 * Calcule le nombre total de participants
 */
const calculateTotalParticipants = (participants) => {
  return (participants.adults || 0) + (participants.children || 0) + (participants.infants || 0);
};

/**
 * Récupère toutes les réservations avec filtres
 */
export const findAll = (filters = {}) => {
  let result = [...bookings];

  // Filtrage par client
  if (filters.customerId) {
    result = result.filter(b => b.customerId === filters.customerId);
  }

  // Filtrage par visite
  if (filters.tourId) {
    result = result.filter(b => b.tourId === filters.tourId);
  }

  // Filtrage par statut
  if (filters.status) {
    result = result.filter(b => b.status === filters.status);
  }

  // Filtrage par date
  if (filters.dateFrom) {
    result = result.filter(b => new Date(b.travelDate) >= new Date(filters.dateFrom));
  }
  if (filters.dateTo) {
    result = result.filter(b => new Date(b.travelDate) <= new Date(filters.dateTo));
  }

  // Pagination
  const page = parseInt(filters.page) || 1;
  const limit = parseInt(filters.limit) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  const paginatedResult = result.slice(startIndex, endIndex);

  return {
    bookings: paginatedResult,
    totalItems: result.length
  };
};

/**
 * Récupère une réservation par ID
 */
export const findById = (id) => {
  return bookings.find(b => b.id === id);
};

/**
 * Crée une nouvelle réservation
 */
export const create = (bookingData) => {
  const totalParticipants = calculateTotalParticipants(bookingData.participants);

  const newBooking = {
    id: uuidv4(),
    customerId: bookingData.customerId,
    tourId: bookingData.tourId,
    travelDate: bookingData.travelDate,
    participants: {
      ...bookingData.participants,
      totalCount: totalParticipants
    },
    totalPrice: bookingData.totalPrice,
    status: BookingStatus.PENDING,
    paymentStatus: 'pending',
    specialRequests: bookingData.specialRequests || null,
    createdAt: new Date(),
    updatedAt: new Date(),
    confirmedAt: null,
    cancelledAt: null,
    cancellationReason: null
  };

  bookings.push(newBooking);
  return newBooking;
};

/**
 * Met à jour le statut d'une réservation
 */
export const updateStatus = (id, newStatus, additionalData = {}) => {
  const index = bookings.findIndex(b => b.id === id);

  if (index === -1) {
    return null;
  }

  const timestampField = `${newStatus}At`;
  const updates = {
    status: newStatus,
    updatedAt: new Date(),
    ...additionalData
  };

  // Ajouter le timestamp approprié
  if (newStatus === BookingStatus.CONFIRMED) {
    updates.confirmedAt = new Date();
  } else if (newStatus === BookingStatus.CANCELLED) {
    updates.cancelledAt = new Date();
  }

  bookings[index] = {
    ...bookings[index],
    ...updates
  };

  return bookings[index];
};

/**
 * Met à jour partiellement une réservation
 */
export const partialUpdate = (id, updates) => {
  const index = bookings.findIndex(b => b.id === id);

  if (index === -1) {
    return null;
  }

  bookings[index] = {
    ...bookings[index],
    ...updates,
    updatedAt: new Date()
  };

  return bookings[index];
};

/**
 * Supprime une réservation
 */
export const remove = (id) => {
  const index = bookings.findIndex(b => b.id === id);

  if (index === -1) {
    return false;
  }

  bookings.splice(index, 1);
  return true;
};
```

---

## Contrôleurs

### src/controllers/bookingController.js

```javascript
import * as BookingModel from '../models/bookingModel.js';
import * as TourCatalogService from '../services/tourCatalogService.js';
import * as AvailabilityService from '../services/availabilityService.js';
import { isValidTransition, canBeCancelled, BookingStatus } from '../services/bookingStateMachine.js';
import { sendSuccess, sendError, createPagination, addBookingHateoasLinks } from '../utils/response.js';
import { NotFoundError, ValidationError, ConflictError } from '../middleware/errorHandler.js';

/**
 * Calcule le prix total de la réservation
 */
const calculateTotalPrice = (tour, participants) => {
  const adultPrice = tour.price;
  const childPrice = tour.price * 0.5; // 50% pour les enfants
  const infantPrice = 0; // Gratuit pour les bébés

  const total =
    (participants.adults || 0) * adultPrice +
    (participants.children || 0) * childPrice +
    (participants.infants || 0) * infantPrice;

  return parseFloat(total.toFixed(2));
};

/**
 * Récupère toutes les réservations
 */
export const getAllBookings = (req, res, next) => {
  try {
    const { customerId, tourId, status, dateFrom, dateTo, page, limit } = req.query;

    const filters = { customerId, tourId, status, dateFrom, dateTo, page, limit };
    const { bookings, totalItems } = BookingModel.findAll(filters);

    const pagination = createPagination(page, limit, totalItems);

    sendSuccess(res, { bookings, pagination });
  } catch (error) {
    next(error);
  }
};

/**
 * Récupère une réservation par ID
 */
export const getBookingById = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const booking = BookingModel.findById(bookingId);

    if (!booking) {
      throw new NotFoundError(
        'The requested booking does not exist',
        'BOOKING_NOT_FOUND',
        { bookingId }
      );
    }

    // Récupérer les détails de la visite
    const tour = await TourCatalogService.getTourDetails(booking.tourId);

    const enrichedBooking = {
      ...booking,
      tourDetails: tour ? {
        title: tour.title,
        duration: tour.duration,
        meetingPoint: tour.meetingPoint
      } : null
    };

    const bookingWithLinks = addBookingHateoasLinks(enrichedBooking);

    sendSuccess(res, { booking: bookingWithLinks });
  } catch (error) {
    next(error);
  }
};

/**
 * Crée une nouvelle réservation
 */
export const createBooking = async (req, res, next) => {
  try {
    const { customerId, tourId, travelDate, participants, specialRequests } = req.body;

    // Validation
    if (!customerId || !tourId || !travelDate || !participants) {
      throw new ValidationError(
        'Missing required fields',
        { required: ['customerId', 'tourId', 'travelDate', 'participants'] }
      );
    }

    // Vérifier l'existence de la visite
    const tour = await TourCatalogService.getTourDetails(tourId);
    if (!tour) {
      throw new NotFoundError(
        'The requested tour does not exist',
        'TOUR_NOT_FOUND',
        { tourId }
      );
    }

    // Calculer le nombre total de participants
    const totalParticipants =
      (participants.adults || 0) +
      (participants.children || 0) +
      (participants.infants || 0);

    // Vérifier la disponibilité
    const availability = AvailabilityService.getAvailability(tourId, travelDate, tour.maxGroupSize);

    if (availability.availableSeats < totalParticipants) {
      throw new ConflictError(
        'Not enough available seats for the requested date',
        'INSUFFICIENT_CAPACITY',
        {
          requestedSeats: totalParticipants,
          availableSeats: availability.availableSeats,
          tourId,
          date: travelDate
        }
      );
    }

    // Réserver les places
    const reserved = AvailabilityService.reserveSeats(tourId, travelDate, totalParticipants);

    if (!reserved) {
      throw new ConflictError(
        'Failed to reserve seats',
        'RESERVATION_FAILED'
      );
    }

    // Calculer le prix total
    const totalPrice = calculateTotalPrice(tour, participants);

    // Créer la réservation
    const newBooking = BookingModel.create({
      customerId,
      tourId,
      travelDate,
      participants,
      totalPrice,
      specialRequests
    });

    const bookingWithLinks = addBookingHateoasLinks(newBooking);

    sendSuccess(res, { booking: bookingWithLinks }, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Met à jour le statut d'une réservation
 */
export const updateBookingStatus = (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { status, reason } = req.body;

    const booking = BookingModel.findById(bookingId);

    if (!booking) {
      throw new NotFoundError(
        'The requested booking does not exist',
        'BOOKING_NOT_FOUND',
        { bookingId }
      );
    }

    // Vérifier la transition de statut
    if (!isValidTransition(booking.status, status)) {
      throw new ValidationError(
        `Cannot transition from ${booking.status} to ${status}`,
        {
          currentStatus: booking.status,
          requestedStatus: status,
          allowedTransitions: getValidTransitions(booking.status)
        }
      );
    }

    // Mettre à jour le statut
    const updatedBooking = BookingModel.updateStatus(bookingId, status, { reason });

    sendSuccess(res, { booking: updatedBooking });
  } catch (error) {
    next(error);
  }
};

/**
 * Annule une réservation
 */
export const cancelBooking = (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { reason, requestRefund } = req.body;

    const booking = BookingModel.findById(bookingId);

    if (!booking) {
      throw new NotFoundError(
        'The requested booking does not exist',
        'BOOKING_NOT_FOUND',
        { bookingId }
      );
    }

    // Vérifier si la réservation peut être annulée
    if (!canBeCancelled(booking.status)) {
      throw new ConflictError(
        `Booking with status ${booking.status} cannot be cancelled`,
        'CANNOT_CANCEL',
        { status: booking.status }
      );
    }

    // Libérer les places
    const totalParticipants = booking.participants.totalCount;
    AvailabilityService.releaseSeats(booking.tourId, booking.travelDate, totalParticipants);

    // Mettre à jour le statut
    const updatedBooking = BookingModel.updateStatus(
      bookingId,
      BookingStatus.CANCELLED,
      {
        cancellationReason: reason,
        refundStatus: requestRefund ? 'pending' : 'not_requested'
      }
    );

    res.status(200).json({
      status: 'success',
      data: {
        booking: updatedBooking
      },
      message: requestRefund
        ? 'Booking cancelled successfully. Refund will be processed within 5-7 business days.'
        : 'Booking cancelled successfully.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Supprime une réservation
 */
export const deleteBooking = (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const deleted = BookingModel.remove(bookingId);

    if (!deleted) {
      throw new NotFoundError(
        'The requested booking does not exist',
        'BOOKING_NOT_FOUND',
        { bookingId }
      );
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
```

### src/controllers/availabilityController.js

```javascript
import * as AvailabilityService from '../services/availabilityService.js';
import * as TourCatalogService from '../services/tourCatalogService.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { NotFoundError, ValidationError } from '../middleware/errorHandler.js';

/**
 * Vérifie la disponibilité d'une visite
 */
export const checkAvailability = async (req, res, next) => {
  try {
    const { tourId, date } = req.query;

    // Validation
    if (!tourId || !date) {
      throw new ValidationError(
        'Missing required parameters',
        { required: ['tourId', 'date'] }
      );
    }

    // Vérifier l'existence de la visite
    const tour = await TourCatalogService.getTourDetails(tourId);

    if (!tour) {
      throw new NotFoundError(
        'The requested tour does not exist',
        'TOUR_NOT_FOUND',
        { tourId }
      );
    }

    // Récupérer la disponibilité
    const availability = AvailabilityService.getAvailability(tourId, date, tour.maxGroupSize);

    // Ajouter les prix
    const enrichedAvailability = {
      ...availability,
      pricePerAdult: tour.price,
      pricePerChild: tour.price * 0.5,
      pricePerInfant: 0.00
    };

    sendSuccess(res, { availability: enrichedAvailability });
  } catch (error) {
    next(error);
  }
};
```

---

## Routes

### src/routes/bookingRoutes.js

```javascript
import express from 'express';
import {
  getAllBookings,
  getBookingById,
  createBooking,
  updateBookingStatus,
  cancelBooking,
  deleteBooking
} from '../controllers/bookingController.js';

const router = express.Router();

router.get('/', getAllBookings);
router.get('/:bookingId', getBookingById);
router.post('/', createBooking);
router.patch('/:bookingId/status', updateBookingStatus);
router.post('/:bookingId/cancel', cancelBooking);
router.delete('/:bookingId', deleteBooking);

export default router;
```

### src/routes/availabilityRoutes.js

```javascript
import express from 'express';
import { checkAvailability } from '../controllers/availabilityController.js';

const router = express.Router();

router.get('/', checkAvailability);

export default router;
```

---

## Test du Microservice

### Démarrer les Services

**Terminal 1 - Tour Catalog Service :**

```bash
cd tour-catalog-service
npm run dev
```

**Terminal 2 - Booking Management Service :**

```bash
cd booking-management-service
npm run dev
```

### Tests avec cURL

#### 1. Health Check

```bash
curl http://localhost:3002/health
```

#### 2. Vérifier la Disponibilité

```bash
curl "http://localhost:3002/api/v1/booking-management/availability?tourId=550e8400-e29b-41d4-a716-446655440000&date=2025-06-15"
```

#### 3. Créer une Nouvelle Réservation

```bash
curl -X POST http://localhost:3002/api/v1/booking-management/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "u1s2e3r4-i5d6-7h8e-9r0e-1a2b3c4d5e6f",
    "tourId": "550e8400-e29b-41d4-a716-446655440000",
    "travelDate": "2025-06-15T09:00:00Z",
    "participants": {
      "adults": 2,
      "children": 1,
      "infants": 0,
      "details": [
        {"name": "Jean Dupont", "age": 35, "type": "adult"},
        {"name": "Marie Dupont", "age": 32, "type": "adult"},
        {"name": "Pierre Dupont", "age": 8, "type": "child"}
      ]
    },
    "specialRequests": "Régime végétarien"
  }'
```

#### 4. Récupérer Toutes les Réservations

```bash
curl "http://localhost:3002/api/v1/booking-management/bookings?customerId=u1s2e3r4-i5d6-7h8e-9r0e-1a2b3c4d5e6f"
```

#### 5. Récupérer une Réservation Spécifique

```bash
curl http://localhost:3002/api/v1/booking-management/bookings/{bookingId}
```

#### 6. Mettre à Jour le Statut

```bash
curl -X PATCH http://localhost:3002/api/v1/booking-management/bookings/{bookingId}/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "confirmed",
    "reason": "Payment received"
  }'
```

#### 7. Annuler une Réservation

```bash
curl -X POST http://localhost:3002/api/v1/booking-management/bookings/{bookingId}/cancel \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Change of plans",
    "requestRefund": true
  }'
```

---

## Exercices Pratiques

### Exercice 1 : Implémenter la Politique d'Annulation avec Remboursement

**Objectif :** Ajouter une logique de calcul de remboursement basée sur la date d'annulation.

**Tâches :**

1. Créer une fonction `calculateRefundAmount` dans un nouveau fichier `src/services/refundService.js`
2. Règles :
   - Plus de 7 jours avant : 100% de remboursement
   - 3-7 jours avant : 50% de remboursement
   - Moins de 3 jours : pas de remboursement
3. Modifier le contrôleur `cancelBooking` pour inclure le montant du remboursement
4. Tester avec différentes dates

### Exercice 2 : Implémenter un Endpoint de Modification de Réservation

**Objectif :** Permettre aux clients de modifier la date ou le nombre de participants.

**Tâches :**

1. Créer un endpoint `PATCH /bookings/:bookingId`
2. Valider que la réservation est en statut `pending` ou `confirmed`
3. Vérifier la disponibilité pour la nouvelle date
4. Mettre à jour la disponibilité (libérer l'ancienne, réserver la nouvelle)
5. Recalculer le prix si le nombre de participants change

### Exercice 3 : Ajouter des Webhooks pour la Confirmation de Paiement

**Objectif :** Implémenter un endpoint webhook pour recevoir les confirmations de paiement.

**Tâches :**

1. Créer un endpoint `POST /webhooks/payment-confirmation`
2. Valider la signature du webhook (simulé)
3. Mettre à jour le statut de la réservation à `confirmed`
4. Mettre à jour le statut de paiement à `paid`
5. Logger l'événement pour audit

**Structure du Webhook :**

```javascript
// src/routes/webhookRoutes.js
import express from 'express';

const router = express.Router();

router.post('/payment-confirmation', async (req, res) => {
  const { bookingId, paymentId, status, amount } = req.body;

  // Valider et traiter le paiement
  // ...

  res.status(200).json({ received: true });
});

export default router;
```

---

## Bonnes Pratiques et Améliorations

### 1. Gestion des Transactions Distribuées

Implémenter le pattern **Saga** pour gérer les transactions distribuées entre microservices.

### 2. Retry et Circuit Breaker

Ajouter des mécanismes de retry et circuit breaker pour les appels inter-microservices.

```bash
npm install axios-retry
```

### 3. Événements Asynchrones

Utiliser un message broker (RabbitMQ, Kafka) pour les événements asynchrones.

### 4. Cache Redis

Mettre en cache la disponibilité et les détails des visites pour améliorer les performances.

```bash
npm install redis
```

### 5. Validation Avancée

Utiliser Joi pour une validation robuste des données.

```bash
npm install joi
```

---

## Ressources Complémentaires

- **Axios Documentation** : [https://axios-http.com/docs/intro](https://axios-http.com/docs/intro)
- **Saga Pattern** : [https://microservices.io/patterns/data/saga.html](https://microservices.io/patterns/data/saga.html)
- **State Machine Pattern** : [https://refactoring.guru/design-patterns/state](https://refactoring.guru/design-patterns/state)
- **Circuit Breaker Pattern** : [https://martinfowler.com/bliki/CircuitBreaker.html](https://martinfowler.com/bliki/CircuitBreaker.html)

---

## Conclusion

Dans cette leçon, nous avons implémenté un microservice Booking Management complet avec :

- Communication inter-microservices avec le Tour Catalog
- Gestion du cycle de vie des réservations avec une machine à états
- Vérification de disponibilité et réservation de places
- Gestion des annulations avec libération de places
- Liens HATEOAS pour guider les clients
- Gestion centralisée des erreurs
- Validation des données et des transitions de statut

Dans les prochaines leçons, nous intégrerons PostgreSQL avec Sequelize pour persister les données, et nous ajouterons des fonctionnalités avancées comme les webhooks, les notifications et la gestion des paiements.

---

## Navigation

- **⬅️ Précédent** : [Leçon 2.4 - Conception de l'API Booking Management](lecon-4-conception-api-booking-management.md)
- **➡️ Suivant** : [Leçon 2.6 - Conception de Base de Données et Intégration ORM](lecon-6-conception-bdd-integration-orm.md)
- **🏠 Retour** : [Sommaire du Module 2](README.md)
