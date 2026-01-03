# Leçon 3.3 : Principe de Substitution de Liskov (LSP)

## Objectifs pédagogiques

- Comprendre le Principe de Substitution de Liskov et son importance
- Identifier les violations du LSP dans le code existant
- Appliquer le LSP dans les architectures microservices
- Implémenter le LSP dans les composants React
- Concevoir des hiérarchies de classes et des contrats d'interface robustes

## Prérequis

- Leçon 3.1 : [Principe de Responsabilité Unique (SRP)](lecon-1-single-responsibility-principle.md)
- Leçon 3.2 : [Principe Ouvert/Fermé (OCP)](lecon-2-open-closed-principle.md)
- Connaissances de base en programmation orientée objet
- Familiarité avec les classes JavaScript ES6+

## Durée estimée

2 heures 30 minutes

---

## Introduction au Principe de Substitution de Liskov (LSP)

Le **Principe de Substitution de Liskov (LSP)** est l'un des principes SOLID en conception orientée objet. Il stipule que **les objets d'une classe parente doivent pouvoir être remplacés par des objets de ses sous-classes sans casser l'application**. Cela signifie que toute fonction ou module qui opère sur une instance d'une classe de base doit pouvoir opérer de manière transparente avec une instance d'une classe dérivée.

Le LSP met l'accent sur le **sous-typage comportemental**, garantissant que le comportement d'une sous-classe ne contredit pas les attentes établies par sa classe parente. Adhérer au LSP aide à maintenir la **fiabilité** et la **flexibilité** du système, rendant le code plus facile à étendre et à maintenir sans introduire d'effets secondaires inattendus.

> 💡 **Définition formelle** : Si S est un sous-type de T, alors les objets de type T peuvent être remplacés par des objets de type S sans altérer les propriétés désirables du programme.

---

## Comprendre le LSP en profondeur

Le LSP se concentre sur le **contrat comportemental des types**. Quand une sous-classe redéfinit une méthode de sa classe parente, elle ne doit pas altérer le comportement attendu de cette méthode d'une manière qui surprendrait les utilisateurs de l'interface de la classe parente.

Cela va au-delà de la simple compatibilité de type ; il s'agit de **compatibilité sémantique**. Si un client attend un certain résultat ou comportement d'une méthode de la classe de base, toute méthode redéfinie dans une sous-classe doit fournir au moins le même niveau de garantie, ou un plus fort, sans violer les invariants de la classe de base.

### Les règles du LSP

1. **Préconditions** : Une sous-classe ne peut pas renforcer les préconditions
2. **Postconditions** : Une sous-classe ne peut pas affaiblir les postconditions
3. **Invariants** : Les invariants de la classe parente doivent être préservés
4. **Contrainte historique** : Les nouvelles méthodes ne doivent pas modifier l'état d'une manière inattendue

---

## Exemple 1 : Le problème Rectangle-Carré (Violation)

Considérons l'exemple classique d'un Rectangle et d'un Carré. Intuitivement, un carré est un rectangle, donc il pourrait sembler naturel de faire de `Square` une sous-classe de `Rectangle`.

### Définition de la classe Rectangle

```javascript
// models/Rectangle.js
class Rectangle {
  constructor(width, height) {
    this.width = width;
    this.height = height;
  }

  setWidth(width) {
    this.width = width;
  }

  setHeight(height) {
    this.height = height;
  }

  getArea() {
    return this.width * this.height;
  }
}

module.exports = Rectangle;
```

### Définition de la classe Square (Violation du LSP)

Maintenant, créons une classe `Square` qui étend `Rectangle`. La largeur et la hauteur d'un carré sont toujours égales.

```javascript
// models/Square.js - ❌ VIOLATION DU LSP
class Square extends Rectangle {
  constructor(side) {
    super(side, side); // Initialise avec largeur et hauteur égales
  }

  // Redéfinition de setWidth et setHeight pour maintenir l'invariant du carré
  setWidth(width) {
    this.width = width;
    this.height = width; // Crucial pour l'invariant du carré
  }

  setHeight(height) {
    this.width = height; // Crucial pour l'invariant du carré
    this.height = height;
  }
}

module.exports = Square;
```

### Démonstration de la violation

Considérons maintenant une fonction qui opère sur un type `Rectangle` :

```javascript
// services/shapeService.js
function increaseRectangleWidth(rectangle) {
  // Cette fonction s'attend à ne changer que la propriété width
  // Elle suppose que modifier width n'affectera pas height
  rectangle.setWidth(rectangle.width + 5);
  return rectangle;
}

// Test avec Rectangle
const rect = new Rectangle(5, 10);
console.log("Aire Rectangle originale:", rect.getArea()); // Output: 50
increaseRectangleWidth(rect);
console.log("Aire Rectangle modifiée:", rect.getArea()); // Output: 100 (10 * 10) ✅

// Test avec Square
const square = new Square(5);
console.log("Aire Square originale:", square.getArea()); // Output: 25
increaseRectangleWidth(square); // Appelle Square's setWidth
console.log("Aire Square modifiée:", square.getArea()); // Output: 100 (10 * 10) ⚠️

console.log("Square width:", square.width); // Output: 10
console.log("Square height:", square.height); // Output: 10
```

### Analyse de la violation

Dans la fonction `increaseRectangleWidth` :

- Quand on passe une instance `Rectangle`, seule sa largeur change, et la hauteur reste 10. L'aire devient 100. ✅
- Quand on passe une instance `Square`, sa méthode `setWidth` est appelée. Comme `Square` redéfinit `setWidth` pour aussi changer la hauteur, l'attente de la fonction `increaseRectangleWidth` que seule la largeur changerait est **violée**. ❌

L'objet `Square`, quand substitué à un `Rectangle`, a changé son comportement d'une manière inattendue du point de vue du client, **violant ainsi le LSP**.

> ⚠️ **Le problème** : `Square` ne peut pas vraiment se substituer à `Rectangle` sans altérer le comportement attendu par la fonction `increaseRectangleWidth`. L'invariant du `Square` (largeur toujours égale à hauteur) brise le contrat du `Rectangle` (largeur et hauteur peuvent être définies indépendamment).

---

## Exemple 2 : Résolution du problème Rectangle-Carré (Adhérence au LSP)

Pour adhérer au LSP, `Square` ne devrait pas hériter de `Rectangle` s'il viole le contrat comportemental. À la place, les deux peuvent implémenter une interface commune, ou leur relation devrait être composée plutôt qu'héritée.

### Option A : Hiérarchies séparées avec interface commune

Cette option reconnaît que la relation "est-un" n'implique pas toujours "se-comporte-comme-un".

```javascript
// interfaces/ShapeWithArea.js
// Interface (conceptuelle en JS, peut être représentée par des classes abstraites)
// Définit le contrat pour les formes qui ont une aire
class ShapeWithArea {
  getArea() {
    throw new Error("getArea() doit être implémenté par les sous-classes");
  }
}

module.exports = ShapeWithArea;
```

```javascript
// models/Rectangle.js - ✅ CONFORME AU LSP
const ShapeWithArea = require("../interfaces/ShapeWithArea");

class Rectangle extends ShapeWithArea {
  constructor(width, height) {
    super();
    this.width = width;
    this.height = height;
  }

  setWidth(width) {
    this.width = width;
  }

  setHeight(height) {
    this.height = height;
  }

  getArea() {
    return this.width * this.height;
  }
}

module.exports = Rectangle;
```

```javascript
// models/Square.js - ✅ CONFORME AU LSP
const ShapeWithArea = require("../interfaces/ShapeWithArea");

class Square extends ShapeWithArea {
  constructor(side) {
    super();
    this.side = side;
  }

  setSide(side) {
    this.side = side;
  }

  getArea() {
    return this.side * this.side;
  }
}

module.exports = Square;
```

### Utilisation correcte

```javascript
// services/shapeService.js
// Une fonction qui opère correctement sur tout ShapeWithArea
// sans surprises comportementales
function printShapeArea(shape) {
  console.log("Aire de la forme:", shape.getArea());
}

const rect2 = new Rectangle(5, 10);
const square2 = new Square(5);

printShapeArea(rect2); // Output: Aire de la forme: 50
printShapeArea(square2); // Output: Aire de la forme: 25

// La fonction increaseRectangleWidth opérerait maintenant explicitement
// uniquement sur Rectangle, ou une fonction plus générique serait nécessaire
// qui ne repose que sur le comportement partagé (comme getArea)
```

Dans cette conception révisée, `Rectangle` et `Square` n'ont pas de relation d'héritage qui cause une violation du LSP. Ils adhèrent tous deux à un contrat conceptuel `ShapeWithArea` (représenté par la classe de base `ShapeWithArea`), qui ne mandate que `getArea()`. Il n'y a pas d'attente que modifier la largeur n'affectera pas la hauteur, car il n'y a pas de méthode partagée `setWidth`/`setHeight` avec un contrat problématique.

---

## Exemple concret : Intégration de passerelles de paiement

Considérons le **microservice de traitement des paiements** de notre application de réservation touristique. Nous pourrions avoir une classe de base `PaymentGateway` (ou interface) qui définit les méthodes pour traiter les paiements.

### Interface PaymentGateway

```javascript
// interfaces/PaymentGateway.js
// Interface de base PaymentGateway (conceptuelle en JS)
class PaymentGateway {
  processPayment(amount, currency, token) {
    throw new Error("processPayment doit être implémenté par les sous-classes");
  }

  refundPayment(transactionId, amount) {
    throw new Error("refundPayment doit être implémenté par les sous-classes");
  }

  // Autres opérations de paiement communes
}

module.exports = PaymentGateway;
```

### Implémentation StripeGateway

```javascript
// gateways/StripeGateway.js
const PaymentGateway = require("../interfaces/PaymentGateway");

class StripeGateway extends PaymentGateway {
  constructor(apiKey) {
    super();
    this.apiKey = apiKey;
    // Initialiser le client Stripe
  }

  async processPayment(amount, currency, token) {
    console.log(
      `Traitement paiement Stripe: ${amount} ${currency} avec token ${token}`
    );
    // Simuler l'appel API
    return { success: true, transactionId: `STRIPE_${Date.now()}` };
  }

  async refundPayment(transactionId, amount) {
    console.log(
      `Remboursement Stripe transaction ${transactionId} pour ${amount}`
    );
    // Simuler l'appel API
    return { success: true };
  }
}

module.exports = StripeGateway;
```

### Implémentation PayPalGateway

```javascript
// gateways/PayPalGateway.js
const PaymentGateway = require("../interfaces/PaymentGateway");

class PayPalGateway extends PaymentGateway {
  constructor(clientId, clientSecret) {
    super();
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    // Initialiser le client PayPal
  }

  async processPayment(amount, currency, token) {
    console.log(
      `Traitement paiement PayPal: ${amount} ${currency} avec token ${token}`
    );
    // Simuler l'appel API
    return { success: true, transactionId: `PAYPAL_${Date.now()}` };
  }

  async refundPayment(transactionId, amount) {
    console.log(
      `Remboursement PayPal transaction ${transactionId} pour ${amount}`
    );
    // Simuler l'appel API
    return { success: true };
  }
}

module.exports = PayPalGateway;
```

### Service de paiement utilisant les passerelles

```javascript
// services/PaymentService.js
class PaymentService {
  constructor(paymentGateway) {
    this.paymentGateway = paymentGateway;
  }

  async makeBookingPayment(bookingId, amount, currency, paymentToken) {
    console.log(`Initiation du paiement pour la réservation ${bookingId}`);

    const result = await this.paymentGateway.processPayment(
      amount,
      currency,
      paymentToken
    );

    if (result.success) {
      console.log(
        `Paiement réussi pour réservation ${bookingId}. Transaction ID: ${result.transactionId}`
      );
      // Mettre à jour le statut de la réservation dans la base de données
    } else {
      console.log(`Paiement échoué pour réservation ${bookingId}`);
      // Gérer l'échec, logger les erreurs
    }

    return result;
  }

  async initiateRefund(bookingId, transactionId, amount) {
    console.log(
      `Initiation du remboursement pour réservation ${bookingId}, transaction ${transactionId}`
    );

    const result = await this.paymentGateway.refundPayment(
      transactionId,
      amount
    );

    if (result.success) {
      console.log(`Remboursement réussi pour réservation ${bookingId}.`);
      // Mettre à jour le statut de la réservation à "remboursé"
    } else {
      console.log(`Remboursement échoué pour réservation ${bookingId}`);
    }

    return result;
  }
}

module.exports = PaymentService;
```

### Utilisation dans l'application

```javascript
// app.js - Utilisation dans notre application de réservation touristique
const StripeGateway = require("./gateways/StripeGateway");
const PayPalGateway = require("./gateways/PayPalGateway");
const PaymentService = require("./services/PaymentService");

const stripeGateway = new StripeGateway("sk_test_...");
const paypalGateway = new PayPalGateway("client_id_...", "client_secret_...");

const stripePaymentService = new PaymentService(stripeGateway);
stripePaymentService.makeBookingPayment("BOOK123", 100.0, "USD", "tok_stripe");

const paypalPaymentService = new PaymentService(paypalGateway);
paypalPaymentService.makeBookingPayment("BOOK124", 75.0, "EUR", "tok_paypal");
```

### Analyse de la conformité LSP

Ici, `StripeGateway` et `PayPalGateway` sont **substituables** pour `PaymentGateway` car ils adhèrent au même contrat pour `processPayment` et `refundPayment`. Le `PaymentService` peut fonctionner de manière transparente avec l'une ou l'autre passerelle concrète sans avoir besoin de connaître les détails spécifiques de l'implémentation.

La méthode `processPayment` dans les deux sous-classes :

- ✅ Accepte les mêmes paramètres
- ✅ Retourne une structure de résultat similaire
- ✅ Maintient le comportement attendu

Cette adhérence au LSP permet au `PaymentService` d'être flexible et d'intégrer facilement de nouveaux fournisseurs de paiement en créant simplement une nouvelle sous-classe de `PaymentGateway`.

---

## Scénario hypothétique : Système de notification

Imaginons un système de notification pour notre application de réservation touristique qui envoie des mises à jour aux utilisateurs concernant leurs réservations, changements de visites ou offres promotionnelles.

### Interface Notifier de base

```javascript
// interfaces/Notifier.js
class Notifier {
  send(recipient, message) {
    throw new Error("send() doit être implémenté par les sous-classes");
  }
}

module.exports = Notifier;
```

### Implémentations EmailNotifier et SMSNotifier

```javascript
// notifiers/EmailNotifier.js
const Notifier = require("../interfaces/Notifier");

class EmailNotifier extends Notifier {
  send(recipientEmail, message) {
    console.log(`Envoi email à ${recipientEmail}: "${message}"`);
    // Logique pour envoyer réellement l'email via une API de service email
    return true;
  }
}

module.exports = EmailNotifier;
```

```javascript
// notifiers/SMSNotifier.js - ⚠️ VIOLATION POTENTIELLE DU LSP
const Notifier = require("../interfaces/Notifier");

class SMSNotifier extends Notifier {
  send(recipientPhoneNumber, message) {
    // Les SMS ont des limites de caractères. Si le message dépasse,
    // il devrait être tronqué ou envoyé en plusieurs parties.
    if (message.length > 160) {
      message = message.substring(0, 157) + "..."; // Tronquer pour simplifier
    }
    console.log(`Envoi SMS à ${recipientPhoneNumber}: "${message}"`);
    // Logique pour envoyer réellement le SMS via une API de passerelle SMS
    return true;
  }
}

module.exports = SMSNotifier;
```

### Fonction cliente utilisant les notifiers

```javascript
// services/notificationService.js
function sendGeneralNotification(notifier, recipient, notificationMessage) {
  // Cette fonction s'attend à ce que le notifier envoie le message complet
  notifier.send(recipient, notificationMessage);
}

const emailNotifier = new EmailNotifier();
const smsNotifier = new SMSNotifier();

sendGeneralNotification(
  emailNotifier,
  "user@example.com",
  "Votre réservation pour la visite de l'Amazone est confirmée!"
);
// Output: Envoi email à user@example.com: "Votre réservation pour la visite de l'Amazone est confirmée!"

sendGeneralNotification(
  smsNotifier,
  "+32485345678",
  "Votre réservation pour la visite de l'Amazone est confirmée et l'heure de départ a changé à 10h. Veuillez consulter votre email pour les détails."
);
// Output: Envoi SMS à +32485345678: "Votre réservation pour la visite de l'Amazone est confirmée et l'heure de départ a changé à 10h. Veuillez consulter vo..."
```

### Analyse de la violation potentielle

Dans ce scénario, `SMSNotifier` tronquant le message pourrait **violer le LSP**. Si `sendGeneralNotification` (le client) s'attend à ce que le `notificationMessage` entier soit délivré, alors `SMSNotifier` changeant le contenu du message implicitement brise ce contrat. Le client de `Notifier` ne s'attend pas à ce que son message soit silencieusement altéré.

### Solutions pour corriger la violation

**Option 1 : Le contrat `Notifier` indique explicitement que les messages peuvent être tronqués** (affaiblissement du contrat de base, mais explicite)

**Option 2 : `SMSNotifier` lance une erreur si le message est trop long** (adhérence au LSP en échouant bruyamment plutôt qu'en altérant silencieusement le comportement)

**Option 3 : `SMSNotifier` implémente une interface différente** ou `sendGeneralNotification` vérifie le type de notifier

### Implémentation conforme au LSP

```javascript
// notifiers/SMSNotifierLSP.js - ✅ CONFORME AU LSP
const Notifier = require("../interfaces/Notifier");

class SMSNotifierLSP extends Notifier {
  send(recipientPhoneNumber, message) {
    if (message.length > 160) {
      // Option 1: Lancer une erreur, forçant le client à gérer
      throw new Error(
        `Message SMS trop long pour ${recipientPhoneNumber}. Max 160 caractères, reçu ${message.length}.`
      );

      // Option 2: Fournir une méthode de troncature explicite si permis par design,
      // mais le client devrait l'appeler avant l'envoi s'il se soucie du message complet
    }

    console.log(`Envoi SMS à ${recipientPhoneNumber}: "${message}"`);
    return true;
  }
}

module.exports = SMSNotifierLSP;
```

### Utilisation avec gestion d'erreur

```javascript
// services/notificationService.js
const SMSNotifierLSP = require("../notifiers/SMSNotifierLSP");

try {
  sendGeneralNotification(
    new SMSNotifierLSP(),
    "+33612345678",
    "Votre réservation pour la visite de l'Amazone est confirmée et l'heure de départ a changé à 10h. Veuillez consulter votre email pour les détails."
  );
} catch (error) {
  console.error("Erreur envoi SMS:", error.message);
  // Le client gère maintenant explicitement la contrainte de longueur du message
}
```

En lançant une erreur, `SMSNotifierLSP` n'altère plus silencieusement le message, et la fonction cliente `sendGeneralNotification` reçoit un signal explicite que ses attentes (délivrance du message complet) ne peuvent pas être satisfaites par ce substitut particulier.

Cela adhère au LSP car la substitution (utiliser `SMSNotifierLSP` au lieu de `EmailNotifier`) n'introduit pas de changements comportementaux silencieux inattendus ; plutôt, elle introduit une erreur prévisible pour un contrat non rempli.

---

## Applications pratiques dans les Microservices et React

Le LSP nous guide dans la conception de systèmes flexibles et robustes tant dans les microservices que dans les applications frontend React.

### Dans l'architecture Microservices

Dans un contexte microservices, le LSP s'applique principalement à la façon dont les services interagissent entre eux et à la conception des composants internes.

#### Contrats d'API et modèles de données

Quand un microservice (Service A) appelle un autre microservice (Service B), le Service A agit comme client de l'API du Service B. Si le Service B a différentes versions ou fournit différentes implémentations d'un endpoint, ces implémentations (substituts) doivent adhérer au même contrat d'API.

**Exemple dans notre application de réservation touristique :**

Notre **microservice Tour Catalog** pourrait exposer un endpoint `/tours/:id`. Si nous introduisons un service spécialisé "Visites Premium" qui offre aussi un endpoint `/tours/:id` pour les visites premium, les réponses de ce service premium devraient toujours adhérer à la structure de données `Tour` générale et au comportement attendu par les clients.

Si l'endpoint `/tours/:id` du service premium retourne des champs drastiquement différents ou requiert une authentification différente non attendue par un client conçu pour le contrat `Tour` de base, cela **viole le LSP**.

**Adhérence :** S'assurer que toute implémentation alternative d'une API (ex: v2 d'un endpoint, ou un endpoint spécialisé servant un sous-ensemble de données) fournit des réponses sémantiquement compatibles avec le contrat original. Si de nouveaux champs sont ajoutés, ils devraient être optionnels ou fournir des valeurs par défaut sensées pour les anciens clients.

#### Pattern Repository

À l'intérieur d'un microservice, les couches d'accès aux données utilisent souvent un **pattern repository**. Nous pourrions avoir une interface `ITourRepository`. Différentes implémentations concrètes pourraient exister pour différentes bases de données.

```javascript
// interfaces/ITourRepository.js
// Interface conceptuelle pour Tour Repository
class ITourRepository {
  getTourById(tourId) {
    throw new Error("Doit implémenter getTourById");
  }

  getAllTours(filters) {
    throw new Error("Doit implémenter getAllTours");
  }

  saveTour(tour) {
    throw new Error("Doit implémenter saveTour");
  }
}

module.exports = ITourRepository;
```

```javascript
// repositories/PostgreSQLTourRepository.js
const ITourRepository = require("../interfaces/ITourRepository");

class PostgreSQLTourRepository extends ITourRepository {
  constructor(dbClient) {
    super();
    this.dbClient = dbClient;
  }

  async getTourById(tourId) {
    console.log(`Récupération tour ${tourId} depuis PostgreSQL.`);
    // ... requête DB réelle ...
    return { id: tourId, name: "Visite Historique de la Ville", price: 50 };
  }

  async getAllTours(filters) {
    console.log(
      `Récupération tous les tours depuis PostgreSQL avec filtres: ${JSON.stringify(
        filters
      )}.`
    );
    // ... requête DB réelle ...
    return [{ id: "T001", name: "Visite Historique de la Ville" }];
  }

  async saveTour(tour) {
    console.log(`Sauvegarde tour ${tour.id} dans PostgreSQL.`);
    // ... insert/update DB réel ...
    return tour;
  }
}

module.exports = PostgreSQLTourRepository;
```

```javascript
// repositories/MockTourRepository.js
const ITourRepository = require("../interfaces/ITourRepository");

class MockTourRepository extends ITourRepository {
  constructor() {
    super();
    this.tours = new Map();
  }

  async getTourById(tourId) {
    console.log(`Récupération tour ${tourId} depuis Mock.`);
    return this.tours.get(tourId) || null;
  }

  async getAllTours(filters) {
    console.log(
      `Récupération tous les tours depuis Mock avec filtres: ${JSON.stringify(
        filters
      )}.`
    );
    return Array.from(this.tours.values()).filter((tour) => {
      // filtrage mock simple
      if (filters && filters.name && !tour.name.includes(filters.name))
        return false;
      return true;
    });
  }

  async saveTour(tour) {
    console.log(`Sauvegarde tour ${tour.id} dans Mock.`);
    this.tours.set(tour.id, tour);
    return tour;
  }
}

module.exports = MockTourRepository;
```

```javascript
// services/TourService.js
// Service utilisant le repository
class TourService {
  constructor(tourRepository) {
    this.tourRepository = tourRepository;
  }

  async getTourDetails(tourId) {
    return this.tourRepository.getTourById(tourId);
  }

  async listAllAvailableTours(filters) {
    return this.tourRepository.getAllTours(filters);
  }
}

module.exports = TourService;
```

```javascript
// Utilisation en production
const PostgreSQLTourRepository = require("./repositories/PostgreSQLTourRepository");
const MockTourRepository = require("./repositories/MockTourRepository");
const TourService = require("./services/TourService");

const pgRepo = new PostgreSQLTourRepository(/* connexion db */);
const prodTourService = new TourService(pgRepo);
prodTourService.getTourDetails("T001").then((tour) => console.log(tour));

// Utilisation pour les tests ou développement local
const mockRepo = new MockTourRepository();
mockRepo.saveTour({ id: "T002", name: "Randonnée en Montagne" });
const devTourService = new TourService(mockRepo);
devTourService.getTourDetails("T002").then((tour) => console.log(tour));
devTourService
  .listAllAvailableTours({ name: "Mont" })
  .then((tours) => console.log(tours));
```

**Adhérence :** `PostgreSQLTourRepository` et `MockTourRepository` implémentent tous deux `ITourRepository`. Ils remplissent le contrat :

- `getTourById` retourne un tour ou `null`
- `getAllTours` retourne un tableau de tours
- `saveTour` persiste le tour

Le `TourService` peut opérer sur l'un ou l'autre repository sans connaître le mécanisme de stockage de données sous-jacent, démontrant le LSP. Le contrat comportemental de `ITourRepository` est préservé.

### Dans les applications React

Le LSP guide principalement la conception des composants dans React, particulièrement à travers la **composition** et les **contrats basés sur les props et les hooks**.

#### Custom Hooks et LSP

Dans React 18.x, les **Custom Hooks** sont la méthode moderne et recommandée pour partager la logique entre composants. Le LSP s'applique directement : un hook qui remplace un autre doit respecter le même contrat (mêmes valeurs retournées, même comportement).

**Exemple :** Imaginons un hook `useAuth` qui fournit le statut d'authentification. Si nous créons un `useMockAuth` pour les tests, il doit retourner exactement la même structure.

```jsx
// hooks/useAuth.js - Hook de production
import { useState, useEffect, useCallback } from "react";
import { authService } from "../services/authService";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    authService
      .getCurrentUser()
      .then((userData) => {
        setUser(userData);
        setIsAuthenticated(!!userData);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  // Contrat : { user, isAuthenticated, isLoading, logout }
  return { user, isAuthenticated, isLoading, logout };
}
```

```jsx
// hooks/useMockAuth.js - Hook de test (DOIT respecter le même contrat)
import { useState, useCallback } from "react";

export function useMockAuth(initialUser = null) {
  const [user, setUser] = useState(initialUser);
  const [isAuthenticated, setIsAuthenticated] = useState(!!initialUser);
  const [isLoading] = useState(false); // Pas de chargement en mock

  const logout = useCallback(() => {
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  // ✅ Même contrat que useAuth : { user, isAuthenticated, isLoading, logout }
  return { user, isAuthenticated, isLoading, logout };
}
```

```jsx
// components/UserProfile.jsx - Composant consommateur
import { useAuth } from "../hooks/useAuth";
// Pour les tests : import { useMockAuth as useAuth } from '../hooks/useMockAuth';

function UserProfile() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  if (isLoading) return <div>Chargement...</div>;

  if (!isAuthenticated) return <div>Veuillez vous connecter</div>;

  return (
    <div>
      <h2>Bienvenue, {user.name}</h2>
      <button onClick={logout}>Déconnexion</button>
    </div>
  );
}
```

**Adhérence LSP :** `useMockAuth` peut remplacer `useAuth` sans casser `UserProfile` car :

- ✅ Retourne `{ user, isAuthenticated, isLoading, logout }`
- ✅ `logout` est une fonction appelable
- ✅ Les types des valeurs sont identiques

> ⚠️ **Violation LSP :** Si `useMockAuth` ne retournait pas `logout` ou retournait `isLoading` comme string au lieu de boolean, le composant casserait.

#### Composants polymorphiques

Composants qui acceptent différents "types" de composants enfants ou rendent différents composants internes basés sur une prop `type`.

**Exemple :** Un composant `TourCard` qui peut afficher soit `BasicTourDetails` soit `PremiumTourDetails` en interne.

```jsx
// components/BasicTourDetails.jsx
const BasicTourDetails = ({ tour }) => (
  <div>
    <h3>{tour.name}</h3>
    <p>Prix: {tour.price}€</p>
    <p>Durée: {tour.duration}</p>
  </div>
);

export default BasicTourDetails;
```

```jsx
// components/PremiumTourDetails.jsx
const PremiumTourDetails = ({ tour }) => (
  <div>
    <h2>✨ {tour.name} ✨</h2>
    <p>Prix Exclusif: {tour.premiumPrice}€</p>
    <p>Durée: {tour.duration} (avec accès VIP)</p>
    <p>Inclus: {tour.extraFeatures.join(", ")}</p>
  </div>
);

export default PremiumTourDetails;
```

```jsx
// components/TourCard.jsx
// Ce composant agit comme client de BasicTourDetails ou PremiumTourDetails
import BasicTourDetails from "./BasicTourDetails";
import PremiumTourDetails from "./PremiumTourDetails";

const TourCard = ({ tour, isPremium = false }) => {
  if (isPremium) {
    // PremiumTourDetails doit être substituable à BasicTourDetails
    // en termes de ce que TourCard attend de son enfant.
    // Ici, les deux attendent simplement une prop 'tour'.
    return (
      <div className="tour-card premium">
        <PremiumTourDetails tour={tour} />
        <button>Réserver Premium Maintenant</button>
      </div>
    );
  }

  return (
    <div className="tour-card basic">
      <BasicTourDetails tour={tour} />
      <button>Voir les Détails</button>
    </div>
  );
};

export default TourCard;
```

```jsx
// Utilisation
const basicTour = {
  id: 'T001',
  name: "Balade en Ville",
  price: 25,
  duration: "2 heures"
};

const premiumTour = {
  id: 'T002',
  name: "Croisière Yacht de Luxe",
  premiumPrice: 200,
  duration: "4 heures",
  extraFeatures: ["Champagne", "Guide Privé"]
};

// Rendu avec BasicTourDetails
<TourCard tour={basicTour} />

// Rendu avec PremiumTourDetails
<TourCard tour={premiumTour} isPremium={true} />
```

**Adhérence :** `TourCard` passe une prop `tour`. `BasicTourDetails` et `PremiumTourDetails` doivent tous deux gérer gracieusement cette prop `tour`, en attendant certains champs. Si `PremiumTourDetails` attendait une prop `tourId` mais pas un objet `tour`, alors le substituer casserait `TourCard`.

Le LSP ici signifie que `PremiumTourDetails` peut être utilisé là où `BasicTourDetails` est attendu, à condition qu'il remplisse le même contrat de props ou un sur-ensemble compatible sans causer d'erreurs inattendues ou de problèmes de rendu pour le composant `TourCard`. La prop `tour` elle-même devrait être compatible.

> 💡 **Le LSP dans React** encourage une définition soigneuse des types de props, des contrats de hooks et de composants, garantissant que les composants et hooks peuvent être échangés sans casser leurs consommateurs. C'est crucial pour construire des bibliothèques de composants réutilisables et maintenables, ainsi que pour faciliter les tests avec des hooks mock.

---

## Exercices pratiques

### Exercice 1 : Extension de passerelle de paiement (Microservices)

**Scénario :** Étendez l'exemple `PaymentGateway`. Nous devons intégrer une nouvelle `CryptoGateway` qui traite les paiements en cryptomonnaie.

**Tâches :**

1. Créez une classe `CryptoGateway` qui étend `PaymentGateway`
2. Implémentez les méthodes `processPayment` et `refundPayment` pour `CryptoGateway`. Pour `processPayment`, supposez qu'elle prend `amount`, `currency` (ex: "BTC", "ETH"), et `walletAddress` au lieu de `token`
3. **Vérification LSP :** Discutez si votre `CryptoGateway` adhère au LSP par rapport à `PaymentGateway`. Quels défis se posent quand la signature de la méthode `processPayment` change (ex: `token` vs `walletAddress`) ?
4. Comment pourriez-vous refactoriser `PaymentGateway` ou `PaymentService` pour accommoder ces différences tout en maintenant le LSP ? (Indice : Considérez le Principe de Ségrégation des Interfaces de la prochaine leçon, ou les paramètres polymorphiques)

### Exercice 2 : Raffinement du système de notification (Microservices/Contexte React)

**Scénario :** Rappelez-vous l'exemple `Notifier` avec `EmailNotifier` et `SMSNotifier`. Nous voulons aussi un `PushNotificationNotifier` pour les applications mobiles.

**Tâches :**

1. Créez une classe `PushNotificationNotifier` étendant `Notifier`. Implémentez sa méthode `send`, qui pourrait prendre un `deviceId` au lieu d'un email ou numéro de téléphone
2. **Vérification LSP :** Comment la fonction `sendGeneralNotification` réagit-elle à `PushNotificationNotifier` si sa méthode `send` attend `deviceId` au lieu d'une chaîne de destinataire (comme email/numéro de téléphone) ?
3. Refactorisez l'interface `Notifier` et la fonction `sendGeneralNotification` pour mieux adhérer au LSP, permettant différents types de destinataires sans vérifications de type à l'exécution dans le code client
4. Pensez à une interface `NotificationRecipient` que différents types de destinataires pourraient implémenter

### Exercice 3 : Refactoring de composants React pour le LSP

**Scénario :** Vous avez un composant `UserAvatar` qui affiche la photo de profil et le nom d'un utilisateur.

**Tâches :**

1. Créez un composant `GuestUserAvatar` et un composant `AuthenticatedUserAvatar`
2. Les deux devraient accepter une prop `user`. `GuestUserAvatar` affiche un avatar par défaut et "Utilisateur Invité". `AuthenticatedUserAvatar` affiche le `profilePictureUrl` et `fullName` de l'utilisateur
3. Créez un composant `UserProfileHeader` qui prend un objet `user` et rend soit `GuestUserAvatar` soit `AuthenticatedUserAvatar` basé sur `user.isAuthenticated`
4. **Vérification LSP :** Assurez-vous que `UserProfileHeader` peut substituer `GuestUserAvatar` avec `AuthenticatedUserAvatar` de manière transparente sans nécessiter de logique conditionnelle dans l'implémentation de `UserAvatar` elle-même qui briserait son contrat (ex: `AuthenticatedUserAvatar` supposant que `user` a toujours `profilePictureUrl` si `GuestUserAvatar` ne l'a pas). Quelles props sont essentielles pour les deux ?

---

## Conclusion

Le **Principe de Substitution de Liskov** est fondamental pour construire des systèmes orientés objet robustes, flexibles et maintenables. Il garantit que quand vous concevez une hiérarchie de classes, les sous-classes se comportent vraiment comme leurs classes parentes du point de vue de leurs clients.

Ce principe encourage la conception d'**interfaces et contrats propres**, prévenant les comportements inattendus quand des composants sont échangés ou étendus.

Dans notre application de réservation touristique, adhérer au LSP signifie que nos services, repositories et composants React peuvent être facilement étendus, testés et maintenus sans crainte d'introduire des bugs subtils à travers des substitutions incompatibles.

### Points clés à retenir

| Aspect             | Règle LSP                                            |
| ------------------ | ---------------------------------------------------- |
| **Préconditions**  | Ne peuvent pas être renforcées dans les sous-classes |
| **Postconditions** | Ne peuvent pas être affaiblies dans les sous-classes |
| **Invariants**     | Doivent être préservés                               |
| **Substitution**   | Doit être transparente pour les clients              |

---

## Navigation

- **⬅️ Précédent** : [Leçon 3.2 - Le Principe Ouvert/Fermé (OCP)](lecon-2-open-closed-principle.md)
- **➡️ Suivant** : Leçon 3.4 - Le Principe de Ségrégation des Interfaces (ISP) *(à venir)*
- **🏠 Retour** : [Sommaire du Module 3](README.md)

---

## Ressources supplémentaires

- [The Liskov Substitution Principle - Robert C. Martin](https://web.archive.org/web/20151128004108/http://www.objectmentor.com/resources/articles/lsp.pdf)
- [SOLID Principles in JavaScript](https://www.digitalocean.com/community/conceptual-articles/s-o-l-i-d-the-first-five-principles-of-object-oriented-design)
- [Behavioral Subtyping - Barbara Liskov](https://www.cs.cmu.edu/~wing/publications/LiskovWing94.pdf)
