# 🚀 Implémentation des microservices Tour Catalog et Booking Management

## Description

Cette PR ajoute les **deux premiers microservices** de l'application de réservation touristique, conformément aux leçons 2.3 et 2.5 du curriculum.

---

## 📦 Microservices Créés

### 1. Tour Catalog Service (Port 3001)

Gère le catalogue des visites touristiques.

**Structure :**

```
app/tour-catalog-service/
├── server.js
├── package.json
└── src/
    ├── app.js
    ├── controllers/ (tour, category, destination)
    ├── models/ (in-memory)
    ├── routes/
    ├── middleware/errorHandler.js
    └── utils/response.js
```

**Endpoints :**

- `GET/POST /api/v1/tours-catalog/tours`
- `GET/PUT/PATCH/DELETE /api/v1/tours-catalog/tours/:tourId`
- `GET/POST /api/v1/tours-catalog/categories`
- `GET/POST /api/v1/tours-catalog/destinations`

---

### 2. Booking Management Service (Port 3002)

Gère les réservations des clients avec communication inter-services.

**Structure :**

```
app/booking-management-service/
├── server.js
├── package.json
└── src/
    ├── app.js
    ├── config/services.js
    ├── controllers/ (booking, availability)
    ├── models/bookingModel.js
    ├── routes/
    ├── services/
    │   ├── tourCatalogService.js  ← Axios vers port 3001
    │   ├── availabilityService.js
    │   └── bookingStateMachine.js
    ├── middleware/errorHandler.js
    └── utils/response.js
```

**Endpoints :**

- `GET/POST /api/v1/booking-management/bookings`
- `GET/DELETE /api/v1/booking-management/bookings/:bookingId`
- `PATCH /api/v1/booking-management/bookings/:bookingId/status`
- `POST /api/v1/booking-management/bookings/:bookingId/cancel`
- `GET /api/v1/booking-management/availability`

---

## 🔧 Caractéristiques Techniques

| Aspect          | Implémentation                            |
| --------------- | ----------------------------------------- |
| Architecture    | 2 microservices indépendants              |
| Modules         | ES Modules (import/export)                |
| Communication   | Axios HTTP (Booking → Tour Catalog)       |
| Stockage        | In-memory (PostgreSQL prévu Leçon 2.6)    |
| Machine à états | pending → confirmed → completed/cancelled |
| Réponses        | Format standardisé + liens HATEOAS        |

---

## 📊 Statistiques

| Métrique         | Valeur |
| ---------------- | ------ |
| Fichiers ajoutés | 34     |
| Lignes de code   | ~4 600 |
| Commits          | 2      |

---

## ✅ Checklist

- [x] Tour Catalog Service fonctionnel
- [x] Booking Management Service fonctionnel
- [x] Communication inter-services (Axios)
- [x] Machine à états des réservations
- [x] Gestion de disponibilité
- [x] Middleware d'erreurs centralisé
- [x] Configuration environnement (.env)

---

## 🧪 Pour Tester

```bash
# Terminal 1 - Tour Catalog
cd app/tour-catalog-service && npm install && npm run dev

# Terminal 2 - Booking Management
cd app/booking-management-service && npm install && npm run dev

# Tests
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3001/api/v1/tours-catalog/tours
```

---

**Réf: Leçons 2.3 et 2.5 du Module 2**
