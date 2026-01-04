# Leçon 3.5 - Le Principe d'Inversion des Dépendances (DIP) et l'Inversion de Contrôle

**Module 3** : Principes SOLID, Design Patterns et React Avancé

---

## Objectifs pédagogiques

- Comprendre le Principe d'Inversion des Dépendances et ses deux énoncés clés
- Maîtriser le concept d'Inversion de Contrôle (IoC) et ses mécanismes
- Implémenter l'injection de dépendances en JavaScript/Node.js
- Appliquer le DIP dans les composants React avec props et Context API
- Concevoir des architectures microservices découplées et testables

## Prérequis

- [Leçon 3.4 : Principe de Ségrégation des Interfaces (ISP)](lecon-4-interface-segregation-principle.md)
- [Leçon 2.4 : Conception de l'API Booking Management](../module-2/lecon-4-conception-api-booking-management.md)
- Familiarité avec les classes JavaScript ES6+ et les Promises
- Bases de React (useState, useEffect, Context API)

## Durée estimée

3 heures

---

## Introduction

Le **Principe d'Inversion des Dépendances** (Dependency Inversion Principle - DIP) est le cinquième et dernier principe SOLID. Il se concentre sur la **réduction du couplage** entre les modules de haut niveau et les modules de bas niveau en introduisant des **abstractions**.

Ce principe établit que :

1. **Les modules de haut niveau ne doivent pas dépendre des modules de bas niveau. Les deux doivent dépendre d'abstractions.**

2. **Les abstractions ne doivent pas dépendre des détails. Les détails doivent dépendre des abstractions.**

Ce changement de direction des dépendances, où les composants de haut niveau définissent les interfaces que les composants de bas niveau doivent implémenter, conduit à un code plus **flexible**, **testable** et **maintenable**.

L'**Inversion de Contrôle** (IoC) est un principe de conception logicielle plus large où le contrôle de la création d'objets, de leur cycle de vie, ou du flux d'un programme, est transféré du code applicatif vers un framework ou un conteneur. Le DIP est souvent implémenté via des mécanismes IoC.

---

## Comprendre le Principe d'Inversion des Dépendances

### Les deux énoncés clés du DIP

#### 1. Les modules de haut niveau ne doivent pas dépendre des modules de bas niveau

```
┌─────────────────────────────────────────────────────────────────┐
│                    HIÉRARCHIE DES MODULES                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📊 Modules de HAUT NIVEAU                                      │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  • Encapsulent la logique métier importante                │ │
│  │  • Coordonnent les tâches                                  │ │
│  │  • Expriment le comportement central de l'application      │ │
│  │  → Exemple: BookingManager, PaymentProcessor               │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  🔧 Modules de BAS NIVEAU                                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  • Gèrent les opérations spécifiques et détaillées         │ │
│  │  • Interactions base de données, système de fichiers       │ │
│  │  • Communications réseau                                    │ │
│  │  → Exemple: PostgreSQLRepository, EmailSender              │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

Le principe préconise d'**éviter les dépendances concrètes directes**. Par exemple, au lieu que `BookingManager` utilise directement `PostgreSQLTourRepository`, il devrait dépendre d'une abstraction comme `ITourRepository`.

#### 2. Les abstractions ne doivent pas dépendre des détails

Les interfaces ou classes abstraites (les "abstractions") doivent être **définies par les modules de haut niveau** qui les utilisent, pas par les modules de bas niveau qui les implémentent.

Par exemple, l'interface `ITourRepository` doit définir des méthodes comme `getTourById` ou `saveBooking` qui sont pertinentes pour les besoins de `BookingManager`. L'implémentation concrète `PostgreSQLTourRepository` implémente ensuite ces méthodes. L'interface elle-même **ne se soucie pas des spécificités de PostgreSQL**.

### Visualisation du DIP

```
❌ SANS DIP - Dépendance directe
┌─────────────────────┐
│   BookingManager    │
│   (Haut niveau)     │
└──────────┬──────────┘
           │ dépend de
           ▼
┌─────────────────────┐
│ PostgreSQLRepository│
│   (Bas niveau)      │
└─────────────────────┘
→ Le module haut niveau est couplé à une implémentation spécifique


✅ AVEC DIP - Inversion des dépendances
┌─────────────────────┐
│   BookingManager    │
│   (Haut niveau)     │
└──────────┬──────────┘
           │ dépend de
           ▼
┌─────────────────────┐
│   ITourRepository   │◄────────────┐
│   (Abstraction)     │             │ implémente
└─────────────────────┘             │
           ▲                        │
           │ implémente             │
┌──────────┴──────────┐  ┌─────────┴──────────┐
│ PostgreSQLRepository│  │  MongoDBRepository │
│   (Bas niveau)      │  │   (Bas niveau)     │
└─────────────────────┘  └────────────────────┘
→ Tous les modules dépendent de l'abstraction
```

---

## Exemple : Système de Réservation SANS DIP

Considérons un `BookingManager` qui interagit directement avec un `PostgreSQLTourRepository` pour sauvegarder les informations de réservation.

### Code problématique

```javascript
// ❌ Module de bas niveau : PostgreSQLTourRepository.js
class PostgreSQLTourRepository {
  constructor() {
    // Initialisation de la connexion PostgreSQL
    console.log("PostgreSQLTourRepository initialisé.");
  }

  async saveBooking(bookingDetails) {
    // Simulation de sauvegarde dans PostgreSQL
    console.log(
      `Sauvegarde réservation PostgreSQL: ${bookingDetails.tourId} pour ${bookingDetails.customerName}`
    );
    return {
      id: Math.random().toString(36).substr(2, 9),
      ...bookingDetails,
    };
  }

  async getTourById(tourId) {
    // Simulation de récupération depuis PostgreSQL
    console.log(`Récupération tour ${tourId} depuis PostgreSQL.`);
    return {
      id: tourId,
      name: "Visite de la Tour Eiffel",
      price: 89.99,
    };
  }
}

// ❌ Module de haut niveau : BookingManager.js
class BookingManager {
  constructor() {
    // DÉPENDANCE DIRECTE sur une implémentation concrète de bas niveau
    this.tourRepository = new PostgreSQLTourRepository();
  }

  async createBooking(customerName, customerEmail, tourId, travelDate) {
    const tour = await this.tourRepository.getTourById(tourId);

    if (!tour) {
      throw new Error(`Tour avec ID ${tourId} non trouvé.`);
    }

    const bookingDetails = {
      customerName,
      customerEmail,
      tourId,
      tourName: tour.name,
      price: tour.price,
      travelDate,
      status: "pending",
    };

    const newBooking = await this.tourRepository.saveBooking(bookingDetails);
    console.log(`Réservation créée: ${JSON.stringify(newBooking)}`);
    return newBooking;
  }
}

// Utilisation
const bookingManager = new BookingManager();
bookingManager.createBooking(
  "Tony Stark",
  "tony@starkindustries.com",
  "tour-001",
  "2026-06-15"
);
```

### Problèmes identifiés

| Problème                                                          | Conséquence               |
| ----------------------------------------------------------------- | ------------------------- |
| `BookingManager` dépend directement de `PostgreSQLTourRepository` | Couplage fort             |
| Changement de base de données → modification de `BookingManager`  | Violation du principe OCP |
| Tests de `BookingManager` nécessitent une vraie base de données   | Difficile à tester        |
| Impossible de réutiliser `BookingManager` avec un autre stockage  | Faible flexibilité        |

---

## Exemple : Système de Réservation AVEC DIP

Pour appliquer le DIP, nous introduisons une **abstraction** (une interface ou classe abstraite) dont dépendront à la fois `BookingManager` et `PostgreSQLTourRepository`.

### Étape 1 : Définir l'abstraction

```javascript
// ✅ Abstraction : ITourRepository.js
// Définit le contrat que toute implémentation doit respecter

class ITourRepository {
  /**
   * Sauvegarde une réservation
   * @param {Object} bookingDetails - Détails de la réservation
   * @returns {Promise<Object>} - Réservation sauvegardée avec ID
   */
  async saveBooking(bookingDetails) {
    throw new Error("La méthode 'saveBooking()' doit être implémentée.");
  }

  /**
   * Récupère un tour par son ID
   * @param {string} tourId - Identifiant du tour
   * @returns {Promise<Object|null>} - Tour trouvé ou null
   */
  async getTourById(tourId) {
    throw new Error("La méthode 'getTourById()' doit être implémentée.");
  }

  /**
   * Récupère toutes les réservations d'un client
   * @param {string} customerEmail - Email du client
   * @returns {Promise<Array>} - Liste des réservations
   */
  async getBookingsByCustomer(customerEmail) {
    throw new Error(
      "La méthode 'getBookingsByCustomer()' doit être implémentée."
    );
  }
}

module.exports = ITourRepository;
```

### Étape 2 : Implémenter les modules de bas niveau

```javascript
// ✅ Implémentation PostgreSQL : PostgreSQLTourRepository.js
const ITourRepository = require("./ITourRepository");

class PostgreSQLTourRepository extends ITourRepository {
  constructor(connectionConfig) {
    super();
    this.connectionConfig = connectionConfig;
    console.log("PostgreSQLTourRepository initialisé.");
  }

  async saveBooking(bookingDetails) {
    console.log(
      `[PostgreSQL] Sauvegarde réservation: ${bookingDetails.tourId}`
    );
    // Simulation - en réalité: INSERT INTO bookings ...
    return {
      id: `pg-${Date.now()}`,
      ...bookingDetails,
      createdAt: new Date().toISOString(),
    };
  }

  async getTourById(tourId) {
    console.log(`[PostgreSQL] Récupération tour: ${tourId}`);
    // Simulation - en réalité: SELECT * FROM tours WHERE id = $1
    return {
      id: tourId,
      name: "Visite de la Tour Eiffel",
      price: 89.99,
      duration: "3 heures",
    };
  }

  async getBookingsByCustomer(customerEmail) {
    console.log(
      `[PostgreSQL] Récupération réservations pour: ${customerEmail}`
    );
    // Simulation
    return [{ id: "pg-001", tourName: "Tour Eiffel", status: "confirmed" }];
  }
}

module.exports = PostgreSQLTourRepository;
```

```javascript
// ✅ Implémentation MongoDB : MongoDBTourRepository.js
const ITourRepository = require("./ITourRepository");

class MongoDBTourRepository extends ITourRepository {
  constructor(mongoUri) {
    super();
    this.mongoUri = mongoUri;
    console.log("MongoDBTourRepository initialisé.");
  }

  async saveBooking(bookingDetails) {
    console.log(`[MongoDB] Sauvegarde réservation: ${bookingDetails.tourId}`);
    // Simulation - en réalité: db.bookings.insertOne(...)
    return {
      _id: `mongo-${Date.now()}`,
      ...bookingDetails,
      createdAt: new Date(),
    };
  }

  async getTourById(tourId) {
    console.log(`[MongoDB] Récupération tour: ${tourId}`);
    // Simulation - en réalité: db.tours.findOne({ _id: tourId })
    return {
      _id: tourId,
      name: "Safari en Wakanda",
      price: 299.99,
      duration: "1 journée",
    };
  }

  async getBookingsByCustomer(customerEmail) {
    console.log(`[MongoDB] Récupération réservations pour: ${customerEmail}`);
    // Simulation
    return [
      { _id: "mongo-001", tourName: "Safari Wakanda", status: "pending" },
    ];
  }
}

module.exports = MongoDBTourRepository;
```

### Étape 3 : Le module de haut niveau dépend de l'abstraction

```javascript
// ✅ Module de haut niveau : BookingManager.js
const ITourRepository = require("./ITourRepository");

class BookingManager {
  /**
   * @param {ITourRepository} tourRepository - Dépendance injectée
   */
  constructor(tourRepository) {
    // Vérification du contrat
    if (!(tourRepository instanceof ITourRepository)) {
      throw new Error(
        "tourRepository doit être une instance de ITourRepository."
      );
    }
    this.tourRepository = tourRepository;
  }

  async createBooking(customerName, customerEmail, tourId, travelDate) {
    // Utilise l'abstraction, pas l'implémentation concrète
    const tour = await this.tourRepository.getTourById(tourId);

    if (!tour) {
      throw new Error(`Tour avec ID ${tourId} non trouvé.`);
    }

    const bookingDetails = {
      customerName,
      customerEmail,
      tourId,
      tourName: tour.name,
      price: tour.price,
      travelDate,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    const newBooking = await this.tourRepository.saveBooking(bookingDetails);

    console.log(`✅ Réservation créée: ${newBooking.id || newBooking._id}`);
    return newBooking;
  }

  async getCustomerBookings(customerEmail) {
    return this.tourRepository.getBookingsByCustomer(customerEmail);
  }
}

module.exports = BookingManager;
```

### Étape 4 : Utilisation avec injection de dépendances

```javascript
// ✅ Application : app.js
const BookingManager = require("./BookingManager");
const PostgreSQLTourRepository = require("./PostgreSQLTourRepository");
const MongoDBTourRepository = require("./MongoDBTourRepository");

// Configuration basée sur l'environnement
const DATABASE_TYPE = process.env.DATABASE_TYPE || "postgresql";

// Factory pour créer le repository approprié
function createTourRepository() {
  switch (DATABASE_TYPE) {
    case "mongodb":
      return new MongoDBTourRepository(process.env.MONGO_URI);
    case "postgresql":
    default:
      return new PostgreSQLTourRepository({
        host: process.env.PG_HOST,
        database: process.env.PG_DATABASE,
      });
  }
}

// Injection de la dépendance
const tourRepository = createTourRepository();
const bookingManager = new BookingManager(tourRepository);

// Utilisation - le BookingManager ne sait pas quelle base de données est utilisée
async function main() {
  console.log("=== Réservation avec PostgreSQL ===");
  const pgRepo = new PostgreSQLTourRepository({});
  const pgBookingManager = new BookingManager(pgRepo);

  await pgBookingManager.createBooking(
    "Tony Stark",
    "tony@starkindustries.com",
    "tour-001",
    "2026-06-15"
  );

  console.log("\n=== Réservation avec MongoDB ===");
  const mongoRepo = new MongoDBTourRepository("mongodb://localhost:27017");
  const mongoBookingManager = new BookingManager(mongoRepo);

  await mongoBookingManager.createBooking(
    "T'Challa",
    "tchalla@wakanda.com",
    "tour-002",
    "2026-07-20"
  );
}

main().catch(console.error);
```

### Résultat de l'application du DIP

```
=== Réservation avec PostgreSQL ===
PostgreSQLTourRepository initialisé.
[PostgreSQL] Récupération tour: tour-001
[PostgreSQL] Sauvegarde réservation: tour-001
✅ Réservation créée: pg-1704292800000

=== Réservation avec MongoDB ===
MongoDBTourRepository initialisé.
[MongoDB] Récupération tour: tour-002
[MongoDB] Sauvegarde réservation: tour-002
✅ Réservation créée: mongo-1704292800001
```

### Avantages obtenus

| Aspect            | Avant DIP                         | Après DIP                                            |
| ----------------- | --------------------------------- | ---------------------------------------------------- |
| **Couplage**      | Fort (dépendance concrète)        | Faible (dépendance abstraite)                        |
| **Flexibilité**   | Changement = modification du code | Changement = nouvelle implémentation                 |
| **Testabilité**   | Nécessite vraie DB                | Mock facilement injectable                           |
| **Extensibilité** | Difficile                         | Ajouter DynamoDB = juste implémenter ITourRepository |

---

## Inversion de Contrôle (IoC)

L'**Inversion de Contrôle** (IoC) est un principe de conception qui **inverse le flux de contrôle** par rapport à la programmation procédurale traditionnelle.

### Définition

Au lieu que le code applicatif appelle une bibliothèque ou un framework pour effectuer des tâches, un **framework prend le contrôle du flux du programme** et rappelle le code applicatif selon les besoins.

Concernant la création d'objets et les dépendances, l'IoC signifie que **les composants ne créent pas ou ne gèrent pas leurs dépendances directement**. Les dépendances leur sont fournies par un mécanisme externe, souvent appelé **Conteneur IoC** ou **Conteneur d'Injection de Dépendances (DI)**.

### Relation entre DIP et IoC

```
┌─────────────────────────────────────────────────────────────────┐
│                    DIP vs IoC                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  DIP (Dependency Inversion Principle)                           │
│  → C'est un PRINCIPE de conception                              │
│  → Définit QUOI faire : dépendre d'abstractions                 │
│                                                                  │
│  IoC (Inversion of Control)                                     │
│  → C'est un PATTERN/MÉCANISME                                   │
│  → Définit COMMENT faire : injection de dépendances             │
│                                                                  │
│  DI (Dependency Injection)                                      │
│  → C'est une TECHNIQUE d'implémentation de l'IoC                │
│  → Les dépendances sont "injectées" dans les composants         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

Quand nous "injectons" des dépendances dans une classe (ex: passer `ITourRepository` dans le constructeur de `BookingManager`), nous utilisons la **DI**, qui est une forme d'**IoC**. Le contrôle de qui crée le repository et qui le fournit au manager a été **inversé**.

---

## Mécanismes d'Injection de Dépendances

### 1. Injection par Constructeur (Recommandée)

Les dépendances sont fournies via le constructeur de la classe. C'est la méthode la plus courante et recommandée car elle garantit qu'une classe reçoit toujours ses dépendances requises dès l'instanciation.

```javascript
// ✅ Injection par constructeur - Recommandée
class BookingManager {
  constructor(tourRepository, notificationService, paymentGateway) {
    this.tourRepository = tourRepository;
    this.notificationService = notificationService;
    this.paymentGateway = paymentGateway;
  }

  async createBooking(bookingData) {
    const tour = await this.tourRepository.getTourById(bookingData.tourId);
    const booking = await this.tourRepository.saveBooking(bookingData);

    // Utilisation des dépendances injectées
    await this.paymentGateway.processPayment(booking.id, tour.price);
    await this.notificationService.send(
      bookingData.customerEmail,
      "Confirmation de réservation",
      `Votre réservation ${booking.id} est confirmée.`
    );

    return booking;
  }
}

// Utilisation
const bookingManager = new BookingManager(
  new PostgreSQLTourRepository(),
  new EmailNotificationService(),
  new StripePaymentGateway()
);
```

**Avantages :**

- L'objet est valide dès sa création
- Dépendances clairement documentées
- Facilite les tests (mocks injectés au constructeur)

### 2. Injection par Setter (Propriété)

Les dépendances sont fournies via des méthodes setter publiques. Permet des dépendances optionnelles ou de changer les dépendances après construction.

```javascript
// ⚠️ Injection par setter - Pour dépendances optionnelles
class BookingManager {
  constructor() {
    this.tourRepository = null;
    this.notificationService = null;
  }

  setTourRepository(repository) {
    this.tourRepository = repository;
    return this; // Pour le chaînage
  }

  setNotificationService(service) {
    this.notificationService = service;
    return this;
  }

  async createBooking(bookingData) {
    if (!this.tourRepository) {
      throw new Error("TourRepository non configuré");
    }
    // ... logique
  }
}

// Utilisation avec chaînage
const bookingManager = new BookingManager()
  .setTourRepository(new PostgreSQLTourRepository())
  .setNotificationService(new EmailNotificationService());
```

**Inconvénients :**

- L'objet peut être dans un état invalide si les setters ne sont pas appelés
- Moins explicite sur les dépendances requises

### 3. Injection par Interface (Moins courante en JS)

Les dépendances sont fournies en exposant une interface que la classe injectrice doit implémenter.

```javascript
// Moins courant en JavaScript, plus adapté à TypeScript
interface IInjectable {
  injectDependencies(container: DependencyContainer): void;
}

class BookingManager implements IInjectable {
  private tourRepository: ITourRepository;

  injectDependencies(container: DependencyContainer) {
    this.tourRepository = container.resolve('ITourRepository');
  }
}
```

---

## Conteneur d'Injection de Dépendances Simple

Voici un exemple de conteneur IoC simple pour Node.js :

```javascript
// ✅ Conteneur IoC simple : DIContainer.js
class DIContainer {
  constructor() {
    this.services = new Map();
    this.singletons = new Map();
  }

  /**
   * Enregistre un service
   * @param {string} name - Nom du service
   * @param {Function} factory - Fonction factory pour créer le service
   * @param {boolean} singleton - Si true, une seule instance sera créée
   */
  register(name, factory, singleton = false) {
    this.services.set(name, { factory, singleton });
    return this;
  }

  /**
   * Résout un service
   * @param {string} name - Nom du service
   * @returns {*} - Instance du service
   */
  resolve(name) {
    const service = this.services.get(name);

    if (!service) {
      throw new Error(`Service '${name}' non enregistré.`);
    }

    if (service.singleton) {
      if (!this.singletons.has(name)) {
        this.singletons.set(name, service.factory(this));
      }
      return this.singletons.get(name);
    }

    return service.factory(this);
  }
}

// Configuration du conteneur
const container = new DIContainer();

// Enregistrement des services
container
  .register(
    "config",
    () => ({
      database: {
        type: process.env.DB_TYPE || "postgresql",
        host: process.env.DB_HOST || "localhost",
      },
      email: {
        provider: "sendgrid",
        apiKey: process.env.SENDGRID_API_KEY,
      },
    }),
    true
  ) // Singleton

  .register(
    "ITourRepository",
    (c) => {
      const config = c.resolve("config");
      if (config.database.type === "mongodb") {
        return new MongoDBTourRepository(config.database);
      }
      return new PostgreSQLTourRepository(config.database);
    },
    true
  ) // Singleton

  .register(
    "INotificationService",
    (c) => {
      const config = c.resolve("config");
      return new EmailNotificationService(config.email);
    },
    true
  )

  .register("BookingManager", (c) => {
    return new BookingManager(
      c.resolve("ITourRepository"),
      c.resolve("INotificationService")
    );
  }); // Pas singleton - nouvelle instance à chaque fois

// Utilisation
const bookingManager = container.resolve("BookingManager");
await bookingManager.createBooking({
  customerName: "Peter Parker",
  customerEmail: "peter@dailybugle.com",
  tourId: "tour-nyc-001",
  travelDate: "2026-08-15",
});
```

---

## Application du DIP dans React

Dans une application React, le DIP et l'IoC sont particulièrement utiles pour gérer les **appels API**, les **clients d'authentification**, ou les **feature flags**. Les composants React sont des modules de haut niveau qui dépendent souvent de détails de bas niveau comme les appels API.

### ❌ Composant React SANS DIP

```jsx
// Détail de bas niveau : Client API spécifique
const TourApiClient = {
  fetchTours: async () => {
    console.log("Récupération des tours depuis /api/tours...");
    const response = await fetch("/api/tours");
    return response.json();
  },
};

// ❌ Composant couplé à un client API spécifique
function TourList() {
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    TourApiClient.fetchTours() // DÉPENDANCE DIRECTE
      .then((data) => {
        setTours(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Chargement des visites...</div>;
  if (error) return <div>Erreur: {error}</div>;

  return (
    <div>
      <h2>Visites disponibles</h2>
      <ul>
        {tours.map((tour) => (
          <li key={tour.id}>
            {tour.name} - {tour.price} €
          </li>
        ))}
      </ul>
    </div>
  );
}
```

**Problèmes :**

- `TourList` est couplé à `TourApiClient`
- Difficile à tester sans mocker le fetch global
- Impossible de réutiliser avec une autre source de données

### ✅ Composant React AVEC DIP (Injection via Props)

```jsx
// Abstraction : Interface du service de tours
// const ITourService = {
//   fetchTours: () => Promise<Tour[]>
// };

// Implémentation : Service API en production
const LiveTourService = {
  fetchTours: async () => {
    console.log("Récupération tours depuis API...");
    const response = await fetch("/api/tours");
    return response.json();
  },
};

// Implémentation : Service mock pour les tests
const MockTourService = {
  fetchTours: async () => {
    console.log("Récupération tours depuis mock...");
    // Données de test avec personnages Marvel
    return [
      { id: "t1", name: "Visite du QG Avengers", price: 150 },
      { id: "t2", name: "Tour de Wakanda", price: 299 },
      { id: "t3", name: "Stark Tower Experience", price: 199 },
    ];
  },
};

// ✅ Composant qui dépend d'une abstraction (injectée via props)
function TourList({ tourService }) {
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!tourService || typeof tourService.fetchTours !== "function") {
      setError("Service de tours non fourni");
      setLoading(false);
      return;
    }

    tourService
      .fetchTours() // Utilise l'abstraction injectée
      .then((data) => {
        setTours(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [tourService]);

  if (loading) return <div>Chargement des visites...</div>;
  if (error) return <div>Erreur: {error}</div>;

  return (
    <div>
      <h2>Visites disponibles</h2>
      <ul>
        {tours.map((tour) => (
          <li key={tour.id}>
            {tour.name} - {tour.price} €
          </li>
        ))}
      </ul>
    </div>
  );
}

// Utilisation en production
function ProductionApp() {
  return <TourList tourService={LiveTourService} />;
}

// Utilisation en développement/test
function TestApp() {
  return <TourList tourService={MockTourService} />;
}
```

---

## React Context API pour l'IoC Global

Pour les services utilisés par de nombreux composants, le **prop drilling** peut devenir fastidieux. La **Context API** de React permet d'implémenter l'IoC à un niveau supérieur, rendant les dépendances disponibles à tous les composants d'un arbre sans passage explicite de props.

### Implémentation complète avec Context

```jsx
// ===== services/tourService.js =====
// Définition des implémentations

export const LiveTourService = {
  fetchTours: async () => {
    const response = await fetch("/api/tours");
    if (!response.ok) throw new Error("Erreur lors du chargement des tours");
    return response.json();
  },

  getTourById: async (id) => {
    const response = await fetch(`/api/tours/${id}`);
    if (!response.ok) throw new Error("Tour non trouvé");
    return response.json();
  },
};

export const MockTourService = {
  fetchTours: async () => {
    // Simulation de délai réseau
    await new Promise((resolve) => setTimeout(resolve, 500));
    return [
      {
        id: "t1",
        name: "Visite du QG Avengers",
        price: 150,
        description:
          "Découvrez le quartier général des héros les plus puissants",
      },
      {
        id: "t2",
        name: "Safari en Wakanda",
        price: 299,
        description: "Explorez la nation la plus avancée technologiquement",
      },
      {
        id: "t3",
        name: "Stark Industries Tour",
        price: 199,
        description: "Visite guidée par JARVIS des laboratoires Stark",
      },
    ];
  },

  getTourById: async (id) => {
    const tours = await MockTourService.fetchTours();
    return tours.find((t) => t.id === id) || null;
  },
};
```

```jsx
// ===== contexts/TourServiceContext.jsx =====
import React, { createContext, useContext } from "react";

// 1. Créer le Context
const TourServiceContext = createContext(null);

// 2. Créer le Provider
export function TourServiceProvider({ children, service }) {
  return (
    <TourServiceContext.Provider value={service}>
      {children}
    </TourServiceContext.Provider>
  );
}

// 3. Créer un Hook personnalisé pour consommer le service
export function useTourService() {
  const service = useContext(TourServiceContext);

  if (!service) {
    throw new Error(
      "useTourService doit être utilisé à l'intérieur d'un TourServiceProvider"
    );
  }

  return service;
}
```

```jsx
// ===== components/TourList.jsx =====
import React, { useState, useEffect } from "react";
import { useTourService } from "../contexts/TourServiceContext";

function TourList() {
  const tourService = useTourService(); // Consomme la dépendance injectée
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    tourService
      .fetchTours()
      .then((data) => {
        setTours(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [tourService]);

  if (loading) {
    return <div className="loading">Chargement des visites...</div>;
  }

  if (error) {
    return <div className="error">Erreur: {error}</div>;
  }

  return (
    <div className="tour-list">
      <h2>Visites disponibles</h2>
      <div className="tours-grid">
        {tours.map((tour) => (
          <TourCard key={tour.id} tour={tour} />
        ))}
      </div>
    </div>
  );
}

function TourCard({ tour }) {
  return (
    <div className="tour-card">
      <h3>{tour.name}</h3>
      <p>{tour.description}</p>
      <p className="price">{tour.price} €</p>
      <button>Réserver</button>
    </div>
  );
}

export default TourList;
```

```jsx
// ===== components/TourDetails.jsx =====
import React, { useState, useEffect } from "react";
import { useTourService } from "../contexts/TourServiceContext";

function TourDetails({ tourId }) {
  const tourService = useTourService(); // Même service injecté
  const [tour, setTour] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tourService
      .getTourById(tourId)
      .then((data) => {
        setTour(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [tourService, tourId]);

  if (loading) return <div>Chargement...</div>;
  if (!tour) return <div>Tour non trouvé</div>;

  return (
    <div className="tour-details">
      <h1>{tour.name}</h1>
      <p>{tour.description}</p>
      <p className="price">Prix: {tour.price} €</p>
    </div>
  );
}

export default TourDetails;
```

```jsx
// ===== App.jsx =====
import React, { useState } from "react";
import { TourServiceProvider } from "./contexts/TourServiceContext";
import { LiveTourService, MockTourService } from "./services/tourService";
import TourList from "./components/TourList";
import TourDetails from "./components/TourDetails";

function App() {
  // Basculer entre les services pour dev/test/prod
  const [useMock, setUseMock] = useState(
    process.env.NODE_ENV === "development"
  );

  const serviceToUse = useMock ? MockTourService : LiveTourService;

  return (
    <div className="app">
      <header>
        <h1>Tourism App - Réservations de Visites</h1>

        {process.env.NODE_ENV === "development" && (
          <button onClick={() => setUseMock(!useMock)}>
            Basculer vers {useMock ? "API Live" : "Mock"}
          </button>
        )}
      </header>

      <main>
        {/* Le Provider injecte le service à tous les composants enfants */}
        <TourServiceProvider service={serviceToUse}>
          <TourList />
          {/* TourDetails et autres composants ont accès au même service */}
        </TourServiceProvider>
      </main>
    </div>
  );
}

export default App;
```

### Avantages de la Context API pour l'IoC

| Avantage                          | Description                                        |
| --------------------------------- | -------------------------------------------------- |
| **Pas de prop drilling**          | Le service est accessible partout dans l'arbre     |
| **Changement centralisé**         | Modifier le service une fois l'applique partout    |
| **Tests facilités**               | Wrapper les composants avec un MockProvider        |
| **Séparation des préoccupations** | Les composants ne savent pas d'où vient le service |

---

## Patterns Avancés : Multiple Services avec DIP

Dans une vraie application, vous aurez plusieurs services. Voici comment organiser l'injection de dépendances pour une architecture complète :

```jsx
// ===== contexts/ServiceProvider.jsx =====
import React, { createContext, useContext, useMemo } from "react";

// Context pour tous les services
const ServiceContext = createContext(null);

// Hook générique pour accéder aux services
export function useService(serviceName) {
  const services = useContext(ServiceContext);

  if (!services) {
    throw new Error("useService doit être utilisé dans ServiceProvider");
  }

  if (!services[serviceName]) {
    throw new Error(`Service '${serviceName}' non trouvé`);
  }

  return services[serviceName];
}

// Hooks spécifiques pour chaque service
export const useTourService = () => useService("tourService");
export const useBookingService = () => useService("bookingService");
export const useAuthService = () => useService("authService");
export const useNotificationService = () => useService("notificationService");

// Provider qui injecte tous les services
export function ServiceProvider({ children, services }) {
  // Mémoriser pour éviter les re-renders inutiles
  const value = useMemo(() => services, [services]);

  return (
    <ServiceContext.Provider value={value}>{children}</ServiceContext.Provider>
  );
}
```

```jsx
// ===== index.jsx =====
import React from "react";
import ReactDOM from "react-dom/client";
import { ServiceProvider } from "./contexts/ServiceProvider";
import App from "./App";

// Services de production
import { LiveTourService } from "./services/tourService";
import { LiveBookingService } from "./services/bookingService";
import { LiveAuthService } from "./services/authService";
import { LiveNotificationService } from "./services/notificationService";

// Services mock pour dev/test
import { MockTourService } from "./services/tourService";
import { MockBookingService } from "./services/bookingService";
import { MockAuthService } from "./services/authService";
import { MockNotificationService } from "./services/notificationService";

// Configuration basée sur l'environnement
const isProduction = process.env.NODE_ENV === "production";

const services = isProduction
  ? {
      tourService: LiveTourService,
      bookingService: LiveBookingService,
      authService: LiveAuthService,
      notificationService: LiveNotificationService,
    }
  : {
      tourService: MockTourService,
      bookingService: MockBookingService,
      authService: MockAuthService,
      notificationService: MockNotificationService,
    };

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <ServiceProvider services={services}>
      <App />
    </ServiceProvider>
  </React.StrictMode>
);
```

```jsx
// ===== components/BookingForm.jsx =====
import React, { useState } from "react";
import {
  useBookingService,
  useNotificationService,
} from "../contexts/ServiceProvider";

function BookingForm({ tour, customer }) {
  const bookingService = useBookingService();
  const notificationService = useNotificationService();

  const [travelDate, setTravelDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const booking = await bookingService.createBooking({
        tourId: tour.id,
        customerId: customer.id,
        customerEmail: customer.email,
        travelDate,
      });

      await notificationService.send(
        customer.email,
        "Confirmation de réservation",
        `Votre réservation ${booking.id} pour ${tour.name} est confirmée.`
      );

      alert("Réservation confirmée !");
    } catch (error) {
      alert(`Erreur: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3>Réserver: {tour.name}</h3>
      <p>Prix: {tour.price} €</p>

      <label>
        Date de voyage:
        <input
          type="date"
          value={travelDate}
          onChange={(e) => setTravelDate(e.target.value)}
          required
          min={new Date().toISOString().split("T")[0]}
        />
      </label>

      <button type="submit" disabled={submitting}>
        {submitting ? "Réservation en cours..." : "Confirmer la réservation"}
      </button>
    </form>
  );
}

export default BookingForm;
```

---

## Tests avec Injection de Dépendances

L'un des plus grands avantages du DIP est la **facilité de test**. Voici comment tester les composants avec des mocks :

```jsx
// ===== __tests__/TourList.test.jsx =====
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { TourServiceProvider } from "../contexts/TourServiceContext";
import TourList from "../components/TourList";

// Mock service pour les tests
const createMockTourService = (tours = [], shouldFail = false) => ({
  fetchTours: jest.fn().mockImplementation(() => {
    if (shouldFail) {
      return Promise.reject(new Error("Erreur de test"));
    }
    return Promise.resolve(tours);
  }),
});

// Helper pour wrapper avec le provider
const renderWithTourService = (component, service) => {
  return render(
    <TourServiceProvider service={service}>{component}</TourServiceProvider>
  );
};

describe("TourList", () => {
  it("affiche la liste des tours", async () => {
    const mockTours = [
      { id: "1", name: "Tour Stark Industries", price: 199 },
      { id: "2", name: "Safari Wakanda", price: 299 },
    ];

    const mockService = createMockTourService(mockTours);
    renderWithTourService(<TourList />, mockService);

    // Vérifie le chargement initial
    expect(screen.getByText("Chargement des visites...")).toBeInTheDocument();

    // Attend que les tours s'affichent
    await waitFor(() => {
      expect(screen.getByText("Tour Stark Industries")).toBeInTheDocument();
      expect(screen.getByText("Safari Wakanda")).toBeInTheDocument();
    });

    // Vérifie que le service a été appelé
    expect(mockService.fetchTours).toHaveBeenCalledTimes(1);
  });

  it("affiche une erreur en cas d'échec", async () => {
    const mockService = createMockTourService([], true);
    renderWithTourService(<TourList />, mockService);

    await waitFor(() => {
      expect(screen.getByText(/Erreur: Erreur de test/)).toBeInTheDocument();
    });
  });

  it("affiche un message si aucun tour", async () => {
    const mockService = createMockTourService([]);
    renderWithTourService(<TourList />, mockService);

    await waitFor(() => {
      expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
    });
  });
});
```

```javascript
// ===== __tests__/BookingManager.test.js =====
const BookingManager = require("../BookingManager");
const ITourRepository = require("../ITourRepository");

// Mock Repository pour les tests
class MockTourRepository extends ITourRepository {
  constructor(mockData = {}) {
    super();
    this.mockData = mockData;
    this.savedBookings = [];
  }

  async getTourById(tourId) {
    return this.mockData.tours?.[tourId] || null;
  }

  async saveBooking(bookingDetails) {
    const booking = {
      id: `mock-${Date.now()}`,
      ...bookingDetails,
    };
    this.savedBookings.push(booking);
    return booking;
  }

  async getBookingsByCustomer(email) {
    return this.savedBookings.filter((b) => b.customerEmail === email);
  }
}

describe("BookingManager", () => {
  let mockRepository;
  let bookingManager;

  beforeEach(() => {
    mockRepository = new MockTourRepository({
      tours: {
        "tour-001": { id: "tour-001", name: "Tour Avengers", price: 150 },
        "tour-002": { id: "tour-002", name: "Tour Wakanda", price: 299 },
      },
    });
    bookingManager = new BookingManager(mockRepository);
  });

  it("crée une réservation avec succès", async () => {
    const booking = await bookingManager.createBooking(
      "Peter Parker",
      "peter@dailybugle.com",
      "tour-001",
      "2026-08-15"
    );

    expect(booking).toBeDefined();
    expect(booking.customerName).toBe("Peter Parker");
    expect(booking.tourName).toBe("Tour Avengers");
    expect(booking.price).toBe(150);
    expect(mockRepository.savedBookings).toHaveLength(1);
  });

  it("lève une erreur si le tour n'existe pas", async () => {
    await expect(
      bookingManager.createBooking(
        "Tony Stark",
        "tony@starkindustries.com",
        "tour-inexistant",
        "2026-08-15"
      )
    ).rejects.toThrow("Tour avec ID tour-inexistant non trouvé.");
  });

  it("récupère les réservations d'un client", async () => {
    await bookingManager.createBooking(
      "Natasha Romanoff",
      "natasha@avengers.com",
      "tour-001",
      "2026-09-01"
    );

    await bookingManager.createBooking(
      "Natasha Romanoff",
      "natasha@avengers.com",
      "tour-002",
      "2026-09-15"
    );

    const bookings = await bookingManager.getCustomerBookings(
      "natasha@avengers.com"
    );

    expect(bookings).toHaveLength(2);
  });
});
```

---

## Résumé : Avantages du DIP et de l'IoC

| Avantage                  | Description                                                                  |
| ------------------------- | ---------------------------------------------------------------------------- |
| **Couplage réduit**       | Les modules de haut niveau ne sont plus liés aux implémentations spécifiques |
| **Flexibilité accrue**    | Nouvelles implémentations sans modifier les modules existants                |
| **Testabilité améliorée** | Mocks et stubs facilement injectables                                        |
| **Débogage simplifié**    | Flux d'exécution plus clair avec des interfaces bien définies                |
| **Réutilisabilité**       | Abstractions et implémentations réutilisables dans différents contextes      |

---

## Exercices Pratiques

### Exercice 1 : Refactorer le Service de Confirmation de Réservation

**Scénario** : Notre Tourism App envoie actuellement les confirmations de réservation directement par email via une classe `SESEmailService` (AWS SES). Nous voulons maintenant supporter l'envoi de notifications par SMS également, ou potentiellement un `NotificationService` générique qui peut abstraire les deux.

**Tâches** :

1. Créer une interface `INotificationService` avec une méthode `sendNotification(recipient, subject, message)`

2. Implémenter les classes `EmailService` et `SMSService` qui respectent toutes deux `INotificationService`

3. Modifier le `BookingConfirmationManager` (module de haut niveau) pour dépendre de `INotificationService` en utilisant l'injection par constructeur

4. Démontrer comment instancier `BookingConfirmationManager` avec `EmailService` et `SMSService` pour envoyer une confirmation de réservation

### Exercice 2 : Service d'Authentification en React

**Scénario** : Un composant React `UserProfile` utilise actuellement un `AuthAPIClient` codé en dur pour récupérer les détails utilisateur. Ce client appelle directement `/api/user/{id}`. Pour les tests, nous devons pouvoir utiliser un service d'authentification mock.

**Tâches** :

1. Définir une interface conceptuelle `IAuthService` avec les méthodes `fetchUser(userId)` et `login(credentials)`

2. Créer les implémentations `LiveAuthService` et `MockAuthService`

3. Refactorer le composant React `UserProfile` pour accepter une prop `authService` (injection par prop) qui adhère à `IAuthService`

4. Démontrer comment rendre `UserProfile` avec `LiveAuthService` et `MockAuthService`

5. **(Optionnel avancé)** Implémenter une Context API React pour `AuthServiceContext` afin de fournir le service d'authentification à `UserProfile` et d'autres composants liés

### Exercice 3 : Conteneur IoC Complet

**Scénario** : Créer un conteneur d'injection de dépendances plus avancé pour l'application backend.

**Tâches** :

1. Étendre le `DIContainer` pour supporter :

   - Les dépendances avec cycle de vie (transient, scoped, singleton)
   - La résolution automatique des dépendances

2. Configurer le conteneur avec tous les services de l'application Tourism :

   - `ITourRepository`
   - `IBookingRepository`
   - `INotificationService`
   - `IPaymentGateway`

3. Créer des factories pour les différents environnements (development, test, production)

---

## Conclusion

Le **Principe d'Inversion des Dépendances** et l'**Inversion de Contrôle** sont des concepts fondamentaux pour construire des systèmes logiciels robustes, maintenables et testables, particulièrement dans les architectures microservices et les applications frontend complexes comme notre Tourism App.

En s'appuyant sur des **abstractions plutôt que sur des implémentations concrètes**, nous créons des systèmes hautement flexibles et adaptables au changement. Cela s'aligne parfaitement avec les objectifs des microservices, où les services individuels doivent être indépendamment déployables, évolutifs et facilement interchangeables.

### Points clés à retenir

| Concept           | Application                                             |
| ----------------- | ------------------------------------------------------- |
| **DIP**           | Dépendre d'abstractions, pas de concrets                |
| **IoC**           | Inverser le contrôle de création des dépendances        |
| **DI**            | Technique d'injection (constructeur, setter, interface) |
| **React Context** | Conteneur IoC léger pour les applications React         |
| **Tests**         | Mocks facilement injectables grâce au découplage        |

### SOLID Complet

Avec cette leçon, nous avons couvert les **5 principes SOLID** :

1. **S**RP - Single Responsibility Principle ✅
2. **O**CP - Open/Closed Principle ✅
3. **L**SP - Liskov Substitution Principle ✅
4. **I**SP - Interface Segregation Principle ✅
5. **D**IP - Dependency Inversion Principle ✅

Ces principes forment la base d'une architecture logicielle solide et maintenable.

---

## Navigation

- **⬅️ Précédent** : [Leçon 3.4 - Le Principe de Ségrégation des Interfaces (ISP)](lecon-4-interface-segregation-principle.md)
- **➡️ Suivant** : [Leçon 3.6 - Design Patterns dans les Microservices](lecon-6-advanced-react-state-management.md)
- **🏠 Retour** : [Sommaire du Module 3](README.md)

---

## Ressources supplémentaires

- [Dependency Inversion Principle - Robert C. Martin](https://web.archive.org/web/20150905081107/http://www.objectmentor.com/resources/articles/dip.pdf)
- [Inversion of Control Containers and the Dependency Injection pattern - Martin Fowler](https://martinfowler.com/articles/injection.html)
- [React Dependency Injection with Context](https://kentcdodds.com/blog/how-to-use-react-context-effectively)
- [Testing React Components with Dependency Injection](https://testing-library.com/docs/react-testing-library/intro/)

---

**Leçon complétée** ✅
