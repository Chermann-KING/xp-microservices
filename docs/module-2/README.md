# Module 2 - Conception et Implémentation des Microservices Principaux

## 🎯 Objectifs du Module

Ce module vous guide dans la **conception et l'implémentation concrète** des microservices principaux de l'application de réservation touristique. Vous passerez de la théorie (Module 1) à la pratique en construisant deux microservices autonomes.

---

## 📚 Ce que vous allez apprendre

### Domain-Driven Design (DDD)

- Comprendre et appliquer les **Bounded Contexts**
- Définir un **langage ubiquitaire** pour chaque domaine
- Identifier les frontières entre microservices
- Maîtriser le **Context Mapping** entre services

### Conception d'API Microservices

- Concevoir des APIs RESTful respectant les Bounded Contexts
- Appliquer les principes de **séparation des préoccupations**
- Structurer les endpoints, les ressources et les réponses
- Gérer le versionnement, la pagination et le filtrage

### Implémentation Node.js/Express

- Structurer un projet microservice professionnel
- Implémenter des contrôleurs, routes et modèles
- Gérer les erreurs et valider les données
- Communiquer entre microservices via HTTP (Axios)

### Base de Données et ORM

- Concevoir des schémas pour microservices (propriété des données)
- Intégrer **Sequelize** avec PostgreSQL
- Créer et exécuter des **migrations**
- Gérer les relations entre entités

---

## 📖 Leçons du Module

| #   | Leçon                                                                                             | Description                                            | Durée estimée |
| --- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------- |
| 2.1 | [Domain-Driven Design et Bounded Contexts](lecon-1-domain-driven-design-bounded-contexts.md)      | Fondamentaux DDD, langage ubiquitaire, context mapping | ~2h           |
| 2.2 | [Conception API Tour Catalog](lecon-2-conception-api-tour-catalog.md)                             | Design RESTful, endpoints, structures de données       | ~1h30         |
| 2.3 | [Implémentation Tour Catalog Service](lecon-3-implementation-tour-catalog-service.md)             | Code complet du microservice avec Node.js/Express      | ~3h           |
| 2.4 | [Conception API Booking Management](lecon-4-conception-api-booking-management.md)                 | Machine à états, orchestration, disponibilité          | ~1h30         |
| 2.5 | [Implémentation Booking Management Service](lecon-5-implementation-booking-management-service.md) | Code complet avec communication inter-services         | ~3h           |
| 2.6 | [Base de Données et Intégration ORM](lecon-6-conception-bdd-integration-orm.md)                   | Sequelize, migrations, modèles et relations            | ~2h           |

**Temps total estimé : ~13 heures**

---

## 🏆 Acquis à la fin du Module

À la fin de ce module, vous serez capable de :

### Conception

- ✅ Identifier et définir les **Bounded Contexts** d'une application
- ✅ Concevoir des **APIs RESTful** alignées avec le domaine métier
- ✅ Modéliser les **machines à états** pour les entités métier (réservations)
- ✅ Concevoir des **schémas de base de données** pour microservices

### Développement

- ✅ Créer un **microservice Node.js/Express** de A à Z
- ✅ Structurer un projet avec **controllers, routes, models, services**
- ✅ Implémenter la **communication inter-services** avec Axios
- ✅ Utiliser **Sequelize** pour interagir avec PostgreSQL

### Architecture

- ✅ Respecter le principe de **propriété des données** par service
- ✅ Implémenter la **séparation des préoccupations** entre microservices
- ✅ Gérer la **cohérence éventuelle** entre services
- ✅ Appliquer les **bonnes pratiques** de développement microservices

---

## 🛠️ Stack Technique

| Technologie | Version  | Usage                     |
| ----------- | -------- | ------------------------- |
| Node.js     | 24.x LTS | Runtime JavaScript        |
| Express     | 4.21.x   | Framework web             |
| PostgreSQL  | 18.x     | Base de données           |
| Sequelize   | 6.x      | ORM                       |
| Axios       | 1.7.x    | Client HTTP               |
| UUID        | 11.x     | Génération d'identifiants |

---

## 🚀 Microservices Construits

### 1. Tour Catalog Service (Port 3001)

Gère le catalogue des visites touristiques.

**Responsabilités :**

- CRUD des visites (tours)
- Gestion des catégories et destinations
- Recherche et filtrage
- Gestion des images et médias

**Endpoints principaux :**

```
GET    /api/v1/tours-catalog/tours
GET    /api/v1/tours-catalog/tours/{id}
POST   /api/v1/tours-catalog/tours
PUT    /api/v1/tours-catalog/tours/{id}
DELETE /api/v1/tours-catalog/tours/{id}
GET    /api/v1/tours-catalog/categories
GET    /api/v1/tours-catalog/destinations
```

### 2. Booking Management Service (Port 3002)

Gère les réservations des clients.

**Responsabilités :**

- Création et gestion des réservations
- Machine à états (pending → confirmed → completed)
- Vérification de disponibilité
- Communication avec Tour Catalog Service

**Endpoints principaux :**

```
GET    /api/v1/booking-management/bookings
GET    /api/v1/booking-management/bookings/{id}
POST   /api/v1/booking-management/bookings
PATCH  /api/v1/booking-management/bookings/{id}/status
DELETE /api/v1/booking-management/bookings/{id}
GET    /api/v1/booking-management/availability
```

---

## 📁 Structure des Fichiers

```
docs/module-2/
├── README.md                                            # Ce fichier
├── lecon-1-domain-driven-design-bounded-contexts.md     # DDD et Bounded Contexts
├── lecon-2-conception-api-tour-catalog.md               # Design API Tour Catalog
├── lecon-3-implementation-tour-catalog-service.md       # Implémentation Tour Catalog
├── lecon-4-conception-api-booking-management.md         # Design API Booking
├── lecon-5-implementation-booking-management-service.md # Implémentation Booking
├── lecon-6-conception-bdd-integration-orm.md            # BDD et Sequelize
└── exercices/
    ├── lecon-2.1-solutions.md                           # Solutions DDD
    ├── lecon-2.2-solutions.md                           # Solutions API Tour Catalog
    ├── lecon-2.3-solutions.md                           # Solutions Implémentation TC
    ├── lecon-2.4-solutions.md                           # Solutions API Booking
    ├── lecon-2.5-solutions.md                           # Solutions Implémentation BM
    └── lecon-2.6-solutions.md                           # Solutions ORM
```

---

## 📋 Prérequis

Avant de commencer ce module, assurez-vous d'avoir :

- ✅ Terminé le **Module 1** (fondements)
- ✅ Node.js 22+ et npm 10+ installés
- ✅ PostgreSQL 16+ installé et configuré
- ✅ Connaissance de base d'Express et des APIs REST
- ✅ Compréhension des concepts monolithe vs microservices

---

## 🔗 Liens avec les Autres Modules

| Module       | Relation                                       |
| ------------ | ---------------------------------------------- |
| **Module 1** | Prérequis - Fondements et backend monolithique |
| **Module 3** | Suite - Application des principes SOLID        |
| **Module 4** | Extension - Ajout du Payment Service           |
| **Module 5** | Extension - Communication événementielle       |

---

## 💡 Conseils d'Apprentissage

1. **Suivez l'ordre des leçons** - Chaque leçon s'appuie sur la précédente
2. **Codez en parallèle** - Implémentez le code pendant la lecture
3. **Faites les exercices** - Ils renforcent la compréhension
4. **Testez vos APIs** - Utilisez Postman ou curl pour valider
5. **Relisez le DDD** - La leçon 2.1 est fondamentale pour la suite

---

**Bon apprentissage ! 🚀**
