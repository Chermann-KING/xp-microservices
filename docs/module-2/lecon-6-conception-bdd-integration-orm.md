# Leçon 2.6 - Conception de Base de Données et Intégration ORM pour les Microservices

**Module 2** : Conception et Implémentation des Microservices Principaux

---

## Vue d'ensemble

Les bases de données relationnelles constituent une fondation robuste pour les microservices, permettant aux services individuels de gérer leurs propres données de manière indépendante. Ce choix de conception s'aligne avec le principe de couplage lâche des microservices et permet aux services d'évoluer sans impacter les autres. Les Object-Relational Mappers (ORM) simplifient l'interaction avec ces bases de données en mappant les schémas de base de données vers des objets de langage de programmation, abstrayant les complexités des requêtes SQL et permettant aux développeurs de travailler avec des paradigmes orientés objet familiers.

---

## Principes de Conception de Base de Données pour les Microservices

La conception de bases de données pour les microservices implique de considérer l'autonomie, la cohérence des données et les besoins spécifiques du Bounded Context de chaque service, comme introduit dans la leçon "Domain-Driven Design pour les Microservices : Bounded Contexts". Chaque microservice possède typiquement son propre magasin de données, qui peut être une instance de base de données séparée ou un schéma/tables dédié(es) au sein d'une base de données partagée, à condition qu'une propriété forte soit respectée. Cette approche contraste avec l'architecture monolithique traditionnelle où une seule grande base de données sert généralement tous les composants de l'application.

---

## Propriété et Autonomie des Données

Un principe fondamental dans la conception de bases de données pour microservices est que **chaque microservice possède ses données**. Cela signifie qu'un service est seul responsable du schéma de ses données, des opérations de lecture/écriture et du cycle de vie. Les autres services ne doivent **pas** accéder directement à la base de données d'un autre service. Au lieu de cela, ils interagissent via l'API du service propriétaire. Cela favorise l'autonomie, permettant aux équipes individuelles de sélectionner la technologie de base de données la plus appropriée (persistance polyglotte) et le schéma pour leur domaine spécifique, indépendamment des autres équipes.

### Exemple 1 : Microservice Tour Catalog

Le microservice Tour Catalog (de la leçon "Conception de l'API du Microservice Tour Catalog") est responsable de la gestion des informations sur les visites. Sa conception de base de données inclurait des tables comme :

- `tours` - Informations principales sur les visites
- `destinations` - Lieux de visites
- `activities` - Activités pendant les visites
- `tour_images` - Images des visites

**Principe de propriété** :

- ✅ Le service **possède** ces tables
- ✅ Il expose uniquement les données via son **API REST**
- ❌ Si le Booking Management Microservice a besoin de détails sur une visite, il fait un **appel API** au Tour Catalog Microservice
- ❌ Il ne doit **jamais** interroger directement la table `tours`

### Exemple 2 : Microservice Booking Management

Le microservice Booking Management nécessite sa propre base de données pour stocker les informations liées aux réservations. Son schéma pourrait inclure :

- `bookings` - Réservations principales
- `booking_items` - Détails des éléments réservés
- `customers` - Informations clients
- `payments` - Détails de paiement (bien que cela puisse être géré par un service de paiement séparé ultérieurement)

**Indépendance des données** :

- ✅ Ce service gère indépendamment ces données
- ✅ Il ne partage **pas** sa table `bookings` avec le Tour Catalog Microservice
- ✅ Les changements au schéma de réservation n'affectent **pas** les opérations du catalogue de visites

---

## Isolation et Cohérence des Données

Bien que chaque service possède ses données, maintenir la cohérence des données à travers les services est critique. Dans une architecture microservices, cela implique souvent une **cohérence éventuelle** plutôt qu'une cohérence transactionnelle forte à travers les frontières des services, qui est plus courante dans les applications monolithiques. Des techniques comme les architectures événementielles (à couvrir dans le Module 5) sont souvent utilisées pour propager les changements et maintenir la cohérence au fil du temps.

Pour les données internes au sein d'un seul microservice, une **cohérence forte** (transactions ACID) est typiquement maintenue.

### Scénario Hypothétique : Mise à Jour de Profil Utilisateur

Imaginons un microservice User Profile qui stocke les détails utilisateur (nom, email, adresse).

**Cohérence forte (interne au service)** :

1. Lorsqu'un utilisateur met à jour son adresse email
2. Le changement est committé dans la base de données du User Profile Microservice **dans une seule transaction**
3. Cela garantit l'atomicité, la cohérence, l'isolation et la durabilité (ACID) pour les données de ce service spécifique

**Cohérence éventuelle (entre services)** :

- D'autres services qui pourraient avoir besoin de l'email de l'utilisateur (ex: Notification Microservice pour envoyer des alertes) :
  - Soit interrogent l'API du User Profile Microservice
  - Soit reçoivent un **événement** indiquant le changement d'email
  - Soit mettent éventuellement à jour leurs propres copies en cache
  - Soit réagissent au changement

**Ce qui est interdit** :

- ❌ Mises à jour directes de la base de données User Profile par le Notification Microservice

---

## Intégration Object-Relational Mapping (ORM)

Les ORM font le pont entre les langages de programmation orientés objet et les bases de données relationnelles. Ils permettent aux développeurs de définir des schémas de base de données et d'interagir avec les enregistrements de base de données en utilisant des objets, classes et méthodes, plutôt que du SQL brut. Pour les applications Node.js, les ORM populaires incluent **Sequelize**, **TypeORM** et **Prisma**.

### Avantages de l'Utilisation d'un ORM

| Avantage                           | Description                                                                                                                                                                                                                                                             |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Abstraction**                    | Les ORM abstraient les requêtes SQL, permettant aux développeurs de manipuler les données en utilisant les constructions de leur langage de programmation. Cela réduit le besoin d'écrire des instructions SQL complexes manuellement.                                  |
| **Productivité**                   | Ils accélèrent le développement en gérant les tâches de base de données répétitives comme les opérations CRUD (Create, Read, Update, Delete).                                                                                                                           |
| **Sécurité**                       | Les ORM aident à prévenir les vulnérabilités courantes d'injection SQL en échappant automatiquement les valeurs d'entrée.                                                                                                                                               |
| **Maintenabilité**                 | Les changements de schéma de base de données peuvent souvent être gérés via des migrations ORM, facilitant l'évolution de la base de données au fil du temps.                                                                                                           |
| **Agnosticité de Base de Données** | Beaucoup d'ORM supportent plusieurs systèmes de base de données (ex: PostgreSQL, MySQL, SQLite), facilitant potentiellement le changement de bases de données si nécessaire (bien que cet avantage soit souvent surestimé en pratique pour les applications complexes). |

### Concepts Clés des ORM

**1. Modèles (Models)**

- Représentent les tables de base de données comme des classes
- Chaque instance d'un modèle correspond à une ligne dans la table

**2. Définition de Schéma**

- Définir la structure des tables de base de données (noms de colonnes, types de données, contraintes) en utilisant la syntaxe de l'ORM

**3. Migrations**

- Changements scriptés au schéma de base de données
- Les ORM fournissent des outils pour gérer ces changements, les appliquant de manière incrémentale au fur et à mesure que l'application évolue

**4. Associations/Relations**

- Définir comment les modèles sont liés les uns aux autres (ex: one-to-one, one-to-many, many-to-many)
- Gérer les clés étrangères et les opérations de jointure

**5. Construction de Requêtes**

- Méthodes pour effectuer des opérations de base de données comme `find`, `create`, `update`, `delete`
- Souvent avec chaînage pour des requêtes complexes

---

## Exemple Pratique : ORM Sequelize avec Tour Catalog Microservice

Nous utiliserons **Sequelize**, un ORM promis pour Node.js supportant PostgreSQL, MySQL, SQLite et MSSQL. Il supporte des transactions solides, des relations, le chargement eager et lazy, la réplication en lecture et plus encore.

### Configuration de Sequelize

**Étape 1 : Installation**

Installez Sequelize et un pilote de base de données (ex: `pg` pour PostgreSQL) :

```bash
npm install sequelize pg
npm install --save-dev sequelize-cli
```

Le `sequelize-cli` fournit des outils en ligne de commande pour générer des modèles et des migrations.

---

### Définition des Modèles

Pour notre microservice Tour Catalog, définissons un modèle **Tour**.

**Fichier : `models/tour.js`**

```javascript
"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Tour extends Model {
    /**
     * Méthode helper pour définir les associations.
     * Cette méthode ne fait pas partie du cycle de vie Sequelize.
     * Le fichier `models/index` appellera cette méthode automatiquement.
     */
    static associate(models) {
      // Définir les associations ici
      // Par exemple, une Tour pourrait avoir plusieurs Activities ou Destinations
      // models.Tour.hasMany(models.Activity, { foreignKey: 'tourId' });
    }
  }

  Tour.init(
    {
      id: {
        type: DataTypes.UUID, // Utilisation d'UUID pour les clés primaires
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      price: {
        type: DataTypes.DECIMAL(10, 2), // Prix avec 2 décimales
        allowNull: false,
      },
      duration: {
        type: DataTypes.INTEGER, // Durée en jours
        allowNull: false,
      },
      difficulty: {
        type: DataTypes.ENUM("easy", "medium", "difficult"),
        allowNull: false,
      },
      imageCover: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      maxGroupSize: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      ratingsAverage: {
        type: DataTypes.FLOAT,
        defaultValue: 4.5,
      },
      ratingsQuantity: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      startDates: {
        type: DataTypes.ARRAY(DataTypes.DATE), // Tableau de dates de départ disponibles
        allowNull: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: "Tour",
      tableName: "tours", // Définir explicitement le nom de la table
    }
  );

  return Tour;
};
```

**Explication** :

- Ce modèle définit la classe `Tour`, qui mappe vers une table `tours` dans la base de données
- Chaque attribut (`id`, `title`, `description`, etc.) correspond à une colonne
- Types de données et contraintes sont spécifiés

---

### Configuration de la Base de Données

Sequelize nécessite une configuration pour se connecter à la base de données.

**Fichier : `config/config.json`**

```json
{
  "development": {
    "username": "your_db_user",
    "password": "your_db_password",
    "database": "tourism_app_tour_catalog_dev",
    "host": "localhost",
    "dialect": "postgres",
    "port": 5432
  },
  "test": {
    "username": "your_db_user",
    "password": "your_db_password",
    "database": "tourism_app_tour_catalog_test",
    "host": "localhost",
    "dialect": "postgres",
    "port": 5432,
    "logging": false
  },
  "production": {
    "username": "your_db_user",
    "password": "your_db_password",
    "database": "tourism_app_tour_catalog_prod",
    "host": "your_production_db_host",
    "dialect": "postgres",
    "port": 5432
  }
}
```

**Notes importantes** :

- ✅ Base de données dédiée pour ce service : `tourism_app_tour_catalog_dev`
- ✅ Configurations séparées pour développement, test et production
- ✅ PostgreSQL 18.x (version à jour pour 2025)

---

### Exécution des Migrations

Après avoir défini les modèles, vous créez des migrations pour appliquer les changements de schéma à la base de données.

**Étape 1 : Générer une migration**

```bash
npx sequelize-cli migration:generate --name create-tours
```

Cela génère un fichier dans le répertoire `migrations`.

**Étape 2 : Remplir la migration avec la définition du schéma**

**Fichier : `migrations/XXXXXXXXXXXXXX-create-tours.js`**

```javascript
"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("tours", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      duration: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      difficulty: {
        type: Sequelize.ENUM("easy", "medium", "difficult"),
        allowNull: false,
      },
      imageCover: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      maxGroupSize: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      ratingsAverage: {
        type: Sequelize.FLOAT,
        defaultValue: 4.5,
      },
      ratingsQuantity: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      startDates: {
        type: Sequelize.ARRAY(Sequelize.DATE),
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("tours");
  },
};
```

**Étape 3 : Appliquer la migration**

```bash
npx sequelize-cli db:migrate
```

Cette commande crée la table `tours` dans la base de données configurée.

---

### Interaction avec la Base de Données en Utilisant Sequelize

Après avoir défini les modèles et exécuté les migrations, vous pouvez effectuer des opérations CRUD.

**Fichier : `db.js` (initialisation centralisée de la base de données)**

```javascript
const Sequelize = require("sequelize");
const env = process.env.NODE_ENV || "development";
const config = require(__dirname + "/config/config.json")[env];

const db = {};

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    config
  );
}

db.sequelize = sequelize;
db.Sequelize = Sequelize;

// Charger les modèles
db.Tour = require("./models/tour")(sequelize, Sequelize.DataTypes);
// Ajouter d'autres modèles ici

// Appliquer les associations si définies dans les modèles
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

module.exports = db;
```

---

### Exemple d'Utilisation dans le Service

**Fichier : Contrôleur ou service du Tour Catalog Microservice**

```javascript
const db = require("./db");
const Tour = db.Tour;

// Créer une nouvelle visite
async function createTour(tourData) {
  try {
    const newTour = await Tour.create(tourData);
    console.log("Visite créée:", newTour.toJSON());
    return newTour;
  } catch (error) {
    console.error("Erreur lors de la création de la visite:", error);
    throw error;
  }
}

// Trouver toutes les visites
async function findAllTours() {
  try {
    const tours = await Tour.findAll();
    console.log(
      "Toutes les visites:",
      tours.map((t) => t.toJSON())
    );
    return tours;
  } catch (error) {
    console.error("Erreur lors de la récupération des visites:", error);
    throw error;
  }
}

// Trouver une visite par ID
async function findTourById(id) {
  try {
    const tour = await Tour.findByPk(id);
    if (tour) {
      console.log("Visite trouvée:", tour.toJSON());
      return tour;
    } else {
      console.log("Visite non trouvée.");
      return null;
    }
  } catch (error) {
    console.error("Erreur lors de la récupération de la visite par ID:", error);
    throw error;
  }
}

// Mettre à jour une visite
async function updateTour(id, updateData) {
  try {
    const [updatedRows] = await Tour.update(updateData, {
      where: { id: id },
    });

    if (updatedRows > 0) {
      const updatedTour = await Tour.findByPk(id);
      console.log("Visite mise à jour:", updatedTour.toJSON());
      return updatedTour;
    } else {
      console.log("Visite non trouvée ou aucun changement effectué.");
      return null;
    }
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la visite:", error);
    throw error;
  }
}

// Supprimer une visite
async function deleteTour(id) {
  try {
    const deletedRows = await Tour.destroy({
      where: { id: id },
    });

    if (deletedRows > 0) {
      console.log(`Visite avec ID ${id} supprimée.`);
      return true;
    } else {
      console.log("Visite non trouvée pour suppression.");
      return false;
    }
  } catch (error) {
    console.error("Erreur lors de la suppression de la visite:", error);
    throw error;
  }
}

// Exemples d'appels (à des fins de démonstration)
(async () => {
  await db.sequelize.authenticate(); // Tester la connexion à la base de données
  console.log("La connexion à la base de données a été établie avec succès.");

  const newTourData = {
    title: "Trek Aventure dans l'Himalaya",
    description:
      "Un trek exaltant à travers les magnifiques montagnes de l'Himalaya.",
    price: 1500.0,
    duration: 7,
    difficulty: "difficult",
    imageCover: "himalayas-trek.jpg",
    maxGroupSize: 10,
    startDates: [new Date("2025-08-15"), new Date("2025-09-20")],
  };

  const tour1 = await createTour(newTourData);

  if (tour1) {
    await updateTour(tour1.id, { price: 1600.0, difficulty: "medium" });
    await findTourById(tour1.id);
  }

  await findAllTours();

  // await deleteTour(tour1.id); // Décommenter pour tester la suppression
})();
```

**Explication** :

Cet exemple démontre comment effectuer des opérations courantes de base de données (créer, lire, mettre à jour, supprimer) en utilisant les modèles Sequelize dans le contexte du microservice Tour Catalog. Ce code résiderait typiquement dans une couche de service que les routes Express (de "Implémentation du Tour Catalog Microservice (Node.js/Express)") appelleraient.

---

## Exercices et Activités Pratiques

### Exercice 1 : Concevoir le Schéma de Base de Données Booking Management

Basé sur la leçon "Conception de l'API du Microservice Booking Management", définissez le schéma complet de base de données pour le microservice Booking Management.

**Tâche** :
Incluez des tables pour :

- `bookings` - Réservations
- `customers` - Clients
- Toute autre entité pertinente

**Considérez** :

- Clés primaires (UUID recommandé)
- Clés étrangères
- Types de données
- Contraintes nécessaires

**Livrables** :

| Table      | Colonnes       | Type      | Contraintes                                 |
| ---------- | -------------- | --------- | ------------------------------------------- |
| `bookings` | `id`           | UUID      | PRIMARY KEY, NOT NULL                       |
|            | `tour_id`      | UUID      | NOT NULL, référence logique au Tour Catalog |
|            | `customer_id`  | UUID      | NOT NULL                                    |
|            | `booking_date` | TIMESTAMP | NOT NULL, DEFAULT NOW()                     |
|            | `status`       | ENUM      | NOT NULL, DEFAULT 'pending'                 |
|            | ...            | ...       | ...                                         |

---

### Exercice 2 : Implémenter le Modèle Booking avec Sequelize

**Objectif** : Créer un modèle Sequelize complet pour le Booking Management Microservice.

**Étapes** :

1. **Configuration du projet**

   ```bash
   mkdir booking-management-service
   cd booking-management-service
   npm init -y
   npm install sequelize pg dotenv
   npm install --save-dev sequelize-cli
   ```

2. **Créer le modèle Booking**

   - Champs : `id` (UUID), `tourId` (UUID), `customerId` (UUID), `bookingDate`, `status`, `numberOfParticipants`, `totalAmount`
   - Utilisez les validations appropriées

3. **Générer et exécuter la migration**

   ```bash
   npx sequelize-cli migration:generate --name create-bookings
   npx sequelize-cli db:migrate
   ```

4. **Écrire un script de démonstration**
   - Créer une réservation
   - Lire les réservations
   - Mettre à jour une réservation
   - Supprimer une réservation

**Code de démarrage** :

```javascript
// models/booking.js
"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Booking extends Model {
    static associate(models) {
      // Associations à définir
    }
  }

  Booking.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      tourId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "tour_id",
      },
      customerId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: "customer_id",
      },
      // Compléter les autres champs...
    },
    {
      sequelize,
      modelName: "Booking",
      tableName: "bookings",
      underscored: true,
    }
  );

  return Booking;
};
```

---

### Exercice 3 : Refactoriser le Modèle Tour Catalog avec Relations

**Objectif** : Ajouter un modèle `Location` au Tour Catalog Microservice.

**Relation** :

- Chaque `Tour` a une `Location` (one-to-one ou many-to-one)
- Une `Location` peut avoir plusieurs `Tours` (one-to-many)

**Étapes** :

1. **Définir le modèle Location**

   ```javascript
   // models/location.js
   Location.init(
     {
       id: {
         type: DataTypes.UUID,
         defaultValue: DataTypes.UUIDV4,
         primaryKey: true,
       },
       name: {
         type: DataTypes.STRING,
         allowNull: false,
       },
       country: {
         type: DataTypes.STRING,
         allowNull: false,
       },
       coordinates: {
         type: DataTypes.GEOMETRY("POINT"), // Pour PostgreSQL
         allowNull: true,
       },
     },
     {
       /* options */
     }
   );
   ```

2. **Établir l'association one-to-many**

   ```javascript
   // Dans models/location.js
   static associate(models) {
     Location.hasMany(models.Tour, {
       foreignKey: 'locationId',
       as: 'tours'
     });
   }

   // Dans models/tour.js
   static associate(models) {
     Tour.belongsTo(models.Location, {
       foreignKey: 'locationId',
       as: 'location'
     });
   }
   ```

3. **Créer les migrations**

   ```bash
   npx sequelize-cli migration:generate --name create-locations
   npx sequelize-cli migration:generate --name add-location-to-tours
   ```

4. **Mettre à jour le script de création/récupération de tours**
   ```javascript
   // Inclure les données de location lors de la récupération
   const tour = await Tour.findByPk(id, {
     include: [
       {
         model: Location,
         as: "location",
       },
     ],
   });
   ```

---

## Prochaines Étapes

Cette leçon a établi la fondation pour la persistance des données au sein des microservices individuels. Comprendre comment concevoir des bases de données spécifiques aux services et intégrer des ORM comme Sequelize est crucial pour construire des microservices robustes.

**Ce que vous avez appris** :

- ✅ Principes de conception de base de données pour microservices
- ✅ Propriété et autonomie des données
- ✅ Cohérence forte vs cohérence éventuelle
- ✅ Intégration d'ORM avec Sequelize
- ✅ Définition de modèles et exécution de migrations
- ✅ Opérations CRUD avec Sequelize

**Prochaines leçons** :

Les prochaines leçons continueront l'implémentation pratique, en se concentrant sur :

1. L'intégration complète du Booking Management Microservice
2. La définition de son API
3. L'interaction avec sa base de données
4. L'application des principes SOLID (Module 3)

Cette gestion de base de données indépendante au sein de chaque service pose les bases pour appliquer les principes SOLID et construire une architecture microservices scalable et maintenable.

---

## Ressources complémentaires

- [Sequelize Documentation](https://sequelize.org/)
- [PostgreSQL 18.x Documentation](https://www.postgresql.org/docs/18/index.html)
- [Database Per Service Pattern - Microservices.io](https://microservices.io/patterns/data/database-per-service.html)
- [Martin Fowler - ORM](https://martinfowler.com/bliki/OrmHate.html)
- [Node.js Best Practices - Database](https://github.com/goldbergyoni/nodebestpractices)

---

**Leçon complétée** ✅
