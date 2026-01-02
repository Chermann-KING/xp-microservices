# Module 1 - Fondements du Développement Web Moderne et des Microservices

## 🎯 Objectifs du Module

Ce module pose les **bases fondamentales** du développement web fullstack et introduit les concepts clés de l'architecture microservices. C'est le point de départ indispensable pour comprendre et construire l'application de réservation touristique.

---

## 📚 Ce que vous allez apprendre

### Étude de Cas
- Comprendre les **fonctionnalités** d'une application de réservation touristique
- Identifier les **exigences fonctionnelles et non-fonctionnelles**
- Analyser les **besoins métier** d'une plateforme de voyage

### Fondamentaux React
- Maîtriser les **composants fonctionnels**
- Comprendre le flux de données avec **Props et State**
- Utiliser les **Hooks** essentiels (useState, useEffect)
- Appliquer les bonnes pratiques TypeScript

### Environnement Fullstack
- Installer et configurer **Node.js** et **npm**
- Créer un serveur **Express.js**
- Configurer **PostgreSQL** et les connexions
- Structurer un projet backend professionnel

### Design d'API RESTful
- Concevoir des **URIs sémantiques**
- Utiliser correctement les **méthodes HTTP** (GET, POST, PUT, PATCH, DELETE)
- Gérer les **codes de statut** appropriés
- Implémenter **pagination, filtrage et tri**

### Architecture Microservices
- Comprendre les **caractéristiques clés** des microservices
- Identifier les **avantages** (scalabilité, résilience, indépendance)
- Reconnaître les **défis** (complexité, cohérence, communication)
- Analyser des exemples réels (Netflix, Amazon, Uber)

### Monolithe vs Microservices
- Comparer les deux **approches architecturales**
- Identifier **quand utiliser** chaque architecture
- Comprendre les **compromis** de chaque choix
- Planifier une **migration progressive**

---

## 📖 Leçons du Module

| # | Leçon | Description | Durée estimée |
|---|-------|-------------|---------------|
| 1.1 | [Introduction à l'Étude de Cas](lecon-1-introduction-etude-de-cas.md) | Présentation de l'application de réservation touristique | ~1h |
| 1.2 | [React Fundamentals](lecon-2-react-fundamentals.md) | Composants, Props, State et Hooks | ~2h |
| 1.3 | [Setup Environnement Fullstack](lecon-3-setup-environnement.md) | Node.js, Express, PostgreSQL | ~2h |
| 1.4 | [Design d'API RESTful](lecon-4-restful-api-design.md) | Principes REST et bonnes pratiques | ~1h30 |
| 1.5 | [Introduction aux Microservices](lecon-5-microservices-intro.md) | Architecture, avantages et exemples | ~1h30 |
| 1.6 | [Monolithe vs Microservices](lecon-6-monolithe-vs-microservices.md) | Comparaison et compromis | ~1h |

**Temps total estimé : ~9 heures**

---

## 🏆 Acquis à la fin du Module

À la fin de ce module, vous serez capable de :

### Conception
- ✅ Analyser les **besoins fonctionnels** d'une application web
- ✅ Concevoir des **APIs RESTful** conformes aux standards
- ✅ Choisir l'**architecture appropriée** (monolithe ou microservices)
- ✅ Identifier les **bounded contexts** potentiels d'une application

### Développement
- ✅ Créer des **composants React** fonctionnels avec hooks
- ✅ Configurer un **serveur Express.js** avec middlewares
- ✅ Connecter une application à **PostgreSQL**
- ✅ Implémenter des **endpoints CRUD** complets

### Architecture
- ✅ Expliquer les **avantages et inconvénients** des microservices
- ✅ Reconnaître les **patterns** courants (scalabilité, résilience)
- ✅ Comprendre les **défis** de distribution (cohérence, communication)
- ✅ Planifier une **stratégie de migration** du monolithe

---

## 🛠️ Stack Technique

| Technologie | Version | Usage |
|-------------|---------|-------|
| Node.js | 22.x LTS | Runtime JavaScript |
| Express | 4.21.x | Framework web backend |
| PostgreSQL | 16.x | Base de données relationnelle |
| pg | 8.13.x | Client PostgreSQL pour Node.js |
| React | 18.x | Bibliothèque UI (théorie) |
| TypeScript | 5.x | Typage statique (recommandé) |

---

## 🚀 Backend Construit

### API Monolithique (Port 3000)

Le Module 1 construit un **backend monolithique** qui servira de base pour la migration vers les microservices dans les modules suivants.

**Fonctionnalités :**
- CRUD complet pour les visites (tours)
- CRUD complet pour les réservations (bookings)
- Connexion PostgreSQL avec pool de connexions
- Migrations et données de test (seeds)

**Endpoints principaux :**
```
GET    /api/v1/tours              # Liste des visites
GET    /api/v1/tours/:id          # Détail d'une visite
POST   /api/v1/tours              # Créer une visite
PATCH  /api/v1/tours/:id          # Modifier une visite
DELETE /api/v1/tours/:id          # Supprimer une visite

GET    /api/v1/bookings           # Liste des réservations
GET    /api/v1/bookings/:id       # Détail d'une réservation
POST   /api/v1/bookings           # Créer une réservation
PATCH  /api/v1/bookings/:id       # Modifier une réservation
DELETE /api/v1/bookings/:id       # Annuler une réservation

GET    /health                    # État du serveur
```

**Base de données (4 tables) :**
- `tours` - Visites touristiques
- `users` - Utilisateurs
- `bookings` - Réservations
- `reviews` - Avis clients

---

## 📁 Structure des Fichiers

```
docs/module-1/
├── README.md                              # Ce fichier
├── lecon-1-introduction-etude-de-cas.md   # Étude de cas
├── lecon-2-react-fundamentals.md          # Fondamentaux React
├── lecon-3-setup-environnement.md         # Configuration environnement
├── lecon-4-restful-api-design.md          # Design API RESTful
├── lecon-5-microservices-intro.md         # Introduction microservices
├── lecon-6-monolithe-vs-microservices.md  # Comparaison architectures
└── exercices/
    ├── lecon-1.1-solutions.md             # Solutions étude de cas
    ├── lecon-1.3-solutions.md             # Solutions setup
    ├── lecon-1.4-solutions.md             # Solutions API design
    ├── lecon-1.5-solutions.md             # Solutions microservices
    └── lecon-1.6-solutions.md             # Solutions comparaison

app/backend/
├── src/
│   ├── server.js                          # Serveur Express
│   ├── config/db.js                       # Configuration PostgreSQL
│   ├── routes/
│   │   ├── tours.routes.js                # Routes API tours
│   │   └── bookings.routes.js             # Routes API bookings
│   └── database/
│       ├── migrate.js                     # Script de migration
│       └── seed.js                        # Données de test
├── package.json
├── .env.example
└── README.md                              # Documentation API
```

---

## 📋 Prérequis

Avant de commencer ce module :

- ✅ Connaissances de base en **JavaScript**
- ✅ Familiarité avec le **terminal/ligne de commande**
- ✅ Un éditeur de code (VS Code recommandé)
- ✅ Git installé sur votre machine

**Installations requises pendant le module :**
- Node.js 22+ (via nvm recommandé)
- PostgreSQL 16+
- npm 10+

---

## 🔗 Liens avec les Autres Modules

| Module | Relation |
|--------|----------|
| **Module 2** | Suite directe - DDD et premiers microservices |
| **Module 3** | Extension - Principes SOLID appliqués |
| **Module 4** | Extension - Ajout paiements et sécurité |

---

## 💡 Conseils d'Apprentissage

1. **Commencez par la leçon 1.1** - Elle donne le contexte de tout le projet
2. **Configurez votre environnement tôt** - Leçon 1.3 est pratique et essentielle
3. **Testez chaque endpoint** - Utilisez curl ou Postman pour valider
4. **Faites les exercices** - Ils consolident la compréhension
5. **Relisez la comparaison 1.6** - Elle justifie toute l'architecture future

---

## ✅ Checklist de Validation

Avant de passer au Module 2, vérifiez que vous avez :

- [ ] Lu et compris les 6 leçons
- [ ] Installé Node.js, npm et PostgreSQL
- [ ] Configuré et lancé le backend (`npm run dev`)
- [ ] Testé les endpoints API (tours et bookings)
- [ ] Complété au moins 3 exercices sur 5
- [ ] Compris la différence monolithe vs microservices

---

**Bon apprentissage ! 🚀**
