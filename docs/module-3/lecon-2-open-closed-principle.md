# Leçon 3.2 - Le Principe Ouvert/Fermé (OCP) pour un Code Extensible

**Module 3** : Principes SOLID et Design Patterns

---

## Vue d'ensemble

Le **Principe Ouvert/Fermé** (Open/Closed Principle - OCP) stipule que les entités logicielles (classes, modules, fonctions, etc.) doivent être **ouvertes à l'extension**, mais **fermées à la modification**. Cela signifie que le comportement d'un composant peut être étendu **sans modifier son code source**.

Au lieu de modifier du code existant, les nouvelles fonctionnalités sont ajoutées en créant du **nouveau code** qui s'intègre avec le système existant.

Ce principe est crucial pour construire des applications **robustes**, **maintenables** et **évolutives**, particulièrement dans les architectures microservices et les frameworks UI basés sur les composants comme React, où le changement est constant.

**Avantages clés :**

- ✅ Minimise le risque d'introduire des bugs dans du code déjà testé
- ✅ Facilite les mises à jour et l'ajout de fonctionnalités
- ✅ Réduit le besoin de retester l'ensemble du système

---

## Comprendre "Ouvert à l'Extension, Fermé à la Modification"

### Ouvert à l'Extension

Cet aspect signifie que le **comportement d'un module peut être étendu**. De nouvelles fonctionnalités peuvent être ajoutées au système pour satisfaire de nouvelles exigences.

Ceci est généralement réalisé via des mécanismes comme :

- L'**héritage**
- La **composition**
- Le **polymorphisme**
- La définition d'**interfaces** et de **points d'extension** clairs

### Fermé à la Modification

Cet aspect signifie qu'une fois qu'un module a été développé et testé, **son code source ne devrait pas être modifié** pour incorporer de nouveaux comportements.

**Pourquoi ?**

- Modifier du code existant et fonctionnel introduit un **risque de casser des fonctionnalités existantes**
- Cela nécessite de **retester l'ensemble du module**
- Cela peut potentiellement **impacter les modules dépendants**

### L'objectif du OCP

L'objectif du OCP est de rendre un système **plus résilient au changement**. Lorsque de nouvelles exigences émergent, le scénario idéal est d'**ajouter du nouveau code** plutôt que de modifier du code existant et stable.

---

## Exemple concret : Traitement des paiements

Considérons notre application de réservation touristique qui doit s'intégrer avec diverses passerelles de paiement. Initialement, l'application ne supporte que Stripe.

### ❌ Violation du OCP

Si la logique de traitement des paiements est fortement couplée, l'ajout d'une nouvelle passerelle comme PayPal nécessiterait de **modifier la fonction existante** `processPayment` pour ajouter une logique conditionnelle :

```javascript
// services/PaymentProcessor.js (Violation OCP)
class PaymentProcessor {
  processPayment(amount, currency, paymentMethod, paymentDetails) {
    if (paymentMethod === "stripe") {
      // Logique pour interagir avec l'API Stripe
      console.log(`Traitement de ${amount} ${currency} via Stripe.`);
      // ... appels API Stripe ...
      return { status: "success", transactionId: "stripe_txn_123" };
    } else if (paymentMethod === "paypal") {
      // Nouvelle logique pour PayPal - MODIFICATION REQUISE !
      console.log(`Traitement de ${amount} ${currency} via PayPal.`);
      // ... appels API PayPal ...
      return { status: "success", transactionId: "paypal_txn_456" };
    } else if (paymentMethod === "square") {
      // Encore une modification pour Square...
      console.log(`Traitement de ${amount} ${currency} via Square.`);
      return { status: "success", transactionId: "square_txn_789" };
    } else {
      throw new Error("Méthode de paiement non supportée.");
    }
  }
}

// Utilisation
const processor = new PaymentProcessor();
processor.processPayment(100, "EUR", "stripe", {
  /* détails carte */
});
```

**Problèmes de cette approche :**

- ⚠️ Chaque nouvelle passerelle nécessite une **modification** de `PaymentProcessor.js`
- ⚠️ Le code devient de plus en plus **complexe** avec les `if-else`
- ⚠️ **Risque de bugs** dans les passerelles existantes lors des modifications
- ⚠️ **Tests à reprendre** pour l'ensemble de la classe

### ✅ Adhérence au OCP

Pour respecter le OCP, nous définissons une **abstraction** (interface ou classe abstraite) pour les passerelles de paiement. Chaque passerelle spécifique implémente cette abstraction :

```javascript
// interfaces/IPaymentGateway.js
// En JavaScript, nous utilisons des conventions (en TypeScript, ce serait une vraie interface)
class IPaymentGateway {
  /**
   * Traite un paiement
   * @param {number} amount - Montant à payer
   * @param {string} currency - Devise (EUR, USD, etc.)
   * @param {object} details - Détails spécifiques à la passerelle
   * @returns {object} Résultat du paiement
   */
  processPayment(amount, currency, details) {
    throw new Error(
      "processPayment doit être implémentée par les sous-classes."
    );
  }

  /**
   * Rembourse un paiement
   * @param {string} transactionId - ID de la transaction à rembourser
   * @param {number} amount - Montant à rembourser
   * @returns {object} Résultat du remboursement
   */
  refund(transactionId, amount) {
    throw new Error("refund doit être implémentée par les sous-classes.");
  }
}

export default IPaymentGateway;
```

```javascript
// gateways/StripePaymentGateway.js
import IPaymentGateway from "../interfaces/IPaymentGateway.js";

class StripePaymentGateway extends IPaymentGateway {
  constructor(apiKey) {
    super();
    this.apiKey = apiKey;
  }

  processPayment(amount, currency, details) {
    console.log(
      `Traitement de ${amount} ${currency} via Stripe (API Key: ${this.apiKey.substring(
        0,
        10
      )}...)`
    );
    // Simulation d'interaction avec l'API Stripe
    // En production, cela appellerait un service backend qui communique avec Stripe
    return {
      status: "success",
      transactionId: `stripe_txn_${Date.now()}`,
      gateway: "stripe",
    };
  }

  refund(transactionId, amount) {
    console.log(
      `Remboursement de ${amount} pour la transaction ${transactionId} via Stripe.`
    );
    return {
      status: "success",
      refundId: `stripe_ref_${Date.now()}`,
    };
  }
}

export default StripePaymentGateway;
```

```javascript
// gateways/PayPalPaymentGateway.js
import IPaymentGateway from "../interfaces/IPaymentGateway.js";

class PayPalPaymentGateway extends IPaymentGateway {
  constructor(clientId, clientSecret) {
    super();
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  processPayment(amount, currency, details) {
    console.log(
      `Traitement de ${amount} ${currency} via PayPal (Client ID: ${this.clientId})`
    );
    // Simulation d'interaction avec l'API PayPal
    return {
      status: "success",
      transactionId: `paypal_txn_${Date.now()}`,
      gateway: "paypal",
    };
  }

  refund(transactionId, amount) {
    console.log(
      `Remboursement de ${amount} pour la transaction ${transactionId} via PayPal.`
    );
    return {
      status: "success",
      refundId: `paypal_ref_${Date.now()}`,
    };
  }
}

export default PayPalPaymentGateway;
```

```javascript
// services/PaymentProcessorOCP.js
import IPaymentGateway from "../interfaces/IPaymentGateway.js";

class PaymentProcessorOCP {
  /**
   * Le processeur de paiement dépend maintenant de l'abstraction (IPaymentGateway)
   * @param {IPaymentGateway} paymentGateway - Instance d'une passerelle de paiement
   */
  constructor(paymentGateway) {
    if (!(paymentGateway instanceof IPaymentGateway)) {
      throw new Error(
        "paymentGateway doit être une instance de IPaymentGateway."
      );
    }
    this.paymentGateway = paymentGateway;
  }

  executePayment(amount, currency, details) {
    // Validation métier avant le paiement
    if (amount <= 0) {
      throw new Error("Le montant doit être positif.");
    }

    return this.paymentGateway.processPayment(amount, currency, details);
  }

  executeRefund(transactionId, amount) {
    return this.paymentGateway.refund(transactionId, amount);
  }
}

export default PaymentProcessorOCP;
```

```javascript
// Utilisation
import StripePaymentGateway from "./gateways/StripePaymentGateway.js";
import PayPalPaymentGateway from "./gateways/PayPalPaymentGateway.js";
import PaymentProcessorOCP from "./services/PaymentProcessorOCP.js";

// Paiement avec Stripe
const stripeGateway = new StripePaymentGateway("pk_test_12345");
const stripeProcessor = new PaymentProcessorOCP(stripeGateway);
stripeProcessor.executePayment(100, "EUR", {
  /* détails carte */
});

// Paiement avec PayPal - AUCUNE MODIFICATION de PaymentProcessorOCP nécessaire !
const paypalGateway = new PayPalPaymentGateway(
  "sb-clientid",
  "sb-clientsecret"
);
const paypalProcessor = new PaymentProcessorOCP(paypalGateway);
paypalProcessor.executePayment(50, "EUR", {
  /* détails PayPal */
});

// Pour ajouter Square : créer SquarePaymentGateway qui étend IPaymentGateway
// Aucune modification des classes existantes !
```

### Analyse de la conception OCP

| Aspect                      | Description                                                                                                |
| --------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Fermé à la modification** | `PaymentProcessorOCP` ne change jamais lors de l'ajout de nouvelles passerelles                            |
| **Ouvert à l'extension**    | Nouvelles passerelles ajoutées via de nouvelles classes implémentant `IPaymentGateway`                     |
| **Lien avec DIP**           | Le module de haut niveau (`PaymentProcessorOCP`) dépend d'une abstraction, pas d'implémentations concrètes |

---

## Scénario pratique : Calcul des remises

Imaginons que notre application de réservation touristique a besoin de calculer des remises pour les visites. Les remises peuvent être basées sur divers facteurs :

- Réservations anticipées (early bird)
- Taille du groupe
- Promotions saisonnières
- Programmes de fidélité
- Nouveaux clients

### ❌ Violation du OCP

Un `DiscountCalculator` qui utilise une série de `if-else if` pour appliquer les remises :

```javascript
// services/DiscountCalculator.js (Violation OCP)
function calculateDiscount(tour, bookingDetails, user) {
  let discount = 0;

  if (bookingDetails.isEarlyBird) {
    discount += tour.price * 0.1; // 10% remise early bird
  }

  if (bookingDetails.groupSize >= 5) {
    discount += tour.price * 0.05; // 5% remise groupe
  }

  if (tour.season === "winter" && user.isLoyaltyMember) {
    discount += tour.price * 0.15; // 15% remise fidélité hiver
  }

  // Chaque nouvelle remise nécessite une modification ici...
  if (user.isFirstTimeCustomer) {
    discount += tour.price * 0.08; // 8% nouveau client
  }

  // Et encore une autre...
  if (bookingDetails.promoCode === "SUMMER2026") {
    discount += tour.price * 0.2; // 20% code promo
  }

  return discount;
}
```

**Problème :** Ajouter un nouveau type de remise (ex: "parrainage") nécessite de **modifier** `calculateDiscount`, augmentant sa complexité et le risque d'erreurs.

### ✅ Adhérence au OCP

Définir une interface `IDiscountRule` et implémenter des règles de remise concrètes. Le `DiscountCalculator` applique ensuite toutes les règles applicables :

```javascript
// interfaces/IDiscountRule.js
class IDiscountRule {
  /**
   * Vérifie si cette règle s'applique au contexte donné
   * @param {object} tour - Informations de la visite
   * @param {object} bookingDetails - Détails de la réservation
   * @param {object} user - Informations de l'utilisateur
   * @returns {boolean} true si la règle s'applique
   */
  appliesTo(tour, bookingDetails, user) {
    throw new Error("appliesTo doit être implémentée par les sous-classes.");
  }

  /**
   * Calcule le montant de la remise
   * @param {object} tour - Informations de la visite
   * @param {object} bookingDetails - Détails de la réservation
   * @param {object} user - Informations de l'utilisateur
   * @returns {number} Montant de la remise en euros
   */
  calculateDiscount(tour, bookingDetails, user) {
    throw new Error(
      "calculateDiscount doit être implémentée par les sous-classes."
    );
  }

  /**
   * Nom de la règle pour l'affichage
   * @returns {string}
   */
  getName() {
    throw new Error("getName doit être implémentée par les sous-classes.");
  }
}

export default IDiscountRule;
```

```javascript
// discountRules/EarlyBirdDiscountRule.js
import IDiscountRule from "../interfaces/IDiscountRule.js";

class EarlyBirdDiscountRule extends IDiscountRule {
  constructor(percentage = 0.1) {
    super();
    this.percentage = percentage;
  }

  appliesTo(tour, bookingDetails, user) {
    return bookingDetails.isEarlyBird === true;
  }

  calculateDiscount(tour, bookingDetails, user) {
    return tour.price * this.percentage;
  }

  getName() {
    return `Remise Early Bird (${this.percentage * 100}%)`;
  }
}

export default EarlyBirdDiscountRule;
```

```javascript
// discountRules/GroupDiscountRule.js
import IDiscountRule from "../interfaces/IDiscountRule.js";

class GroupDiscountRule extends IDiscountRule {
  constructor(minGroupSize = 5, percentage = 0.05) {
    super();
    this.minGroupSize = minGroupSize;
    this.percentage = percentage;
  }

  appliesTo(tour, bookingDetails, user) {
    return bookingDetails.groupSize >= this.minGroupSize;
  }

  calculateDiscount(tour, bookingDetails, user) {
    return tour.price * this.percentage;
  }

  getName() {
    return `Remise Groupe (${this.minGroupSize}+ personnes, ${
      this.percentage * 100
    }%)`;
  }
}

export default GroupDiscountRule;
```

```javascript
// discountRules/WinterLoyaltyDiscountRule.js
import IDiscountRule from "../interfaces/IDiscountRule.js";

class WinterLoyaltyDiscountRule extends IDiscountRule {
  constructor(percentage = 0.15) {
    super();
    this.percentage = percentage;
  }

  appliesTo(tour, bookingDetails, user) {
    return tour.season === "winter" && user.isLoyaltyMember === true;
  }

  calculateDiscount(tour, bookingDetails, user) {
    return tour.price * this.percentage;
  }

  getName() {
    return `Remise Fidélité Hiver (${this.percentage * 100}%)`;
  }
}

export default WinterLoyaltyDiscountRule;
```

```javascript
// discountRules/FirstTimeCustomerDiscountRule.js
import IDiscountRule from "../interfaces/IDiscountRule.js";

class FirstTimeCustomerDiscountRule extends IDiscountRule {
  constructor(percentage = 0.08) {
    super();
    this.percentage = percentage;
  }

  appliesTo(tour, bookingDetails, user) {
    return user.isFirstTimeCustomer === true;
  }

  calculateDiscount(tour, bookingDetails, user) {
    return tour.price * this.percentage;
  }

  getName() {
    return `Remise Nouveau Client (${this.percentage * 100}%)`;
  }
}

export default FirstTimeCustomerDiscountRule;
```

```javascript
// services/DiscountCalculatorOCP.js
import IDiscountRule from "../interfaces/IDiscountRule.js";

class DiscountCalculatorOCP {
  constructor(discountRules = []) {
    this.discountRules = discountRules;
  }

  /**
   * Ajoute une nouvelle règle de remise
   * EXTENSION sans modification de la logique existante
   */
  addRule(rule) {
    if (!(rule instanceof IDiscountRule)) {
      throw new Error("La règle doit être une instance de IDiscountRule.");
    }
    this.discountRules.push(rule);
    return this; // Permet le chaînage
  }

  /**
   * Calcule la remise totale en appliquant toutes les règles applicables
   * Cette méthode est FERMÉE à la modification
   */
  calculateTotalDiscount(tour, bookingDetails, user) {
    let totalDiscount = 0;
    const appliedRules = [];

    for (const rule of this.discountRules) {
      if (rule.appliesTo(tour, bookingDetails, user)) {
        const discountAmount = rule.calculateDiscount(
          tour,
          bookingDetails,
          user
        );
        totalDiscount += discountAmount;
        appliedRules.push({
          name: rule.getName(),
          amount: discountAmount,
        });
      }
    }

    return {
      totalDiscount,
      appliedRules,
      finalPrice: Math.max(0, tour.price - totalDiscount),
    };
  }
}

export default DiscountCalculatorOCP;
```

```javascript
// Utilisation
import EarlyBirdDiscountRule from "./discountRules/EarlyBirdDiscountRule.js";
import GroupDiscountRule from "./discountRules/GroupDiscountRule.js";
import WinterLoyaltyDiscountRule from "./discountRules/WinterLoyaltyDiscountRule.js";
import FirstTimeCustomerDiscountRule from "./discountRules/FirstTimeCustomerDiscountRule.js";
import DiscountCalculatorOCP from "./services/DiscountCalculatorOCP.js";

// Configuration des règles de remise
const calculator = new DiscountCalculatorOCP([
  new EarlyBirdDiscountRule(0.1), // 10%
  new GroupDiscountRule(5, 0.05), // 5% pour 5+ personnes
  new WinterLoyaltyDiscountRule(0.15), // 15%
]);

// Données de test
const tourInfo = { price: 500, season: "winter" };
const booking = { isEarlyBird: true, groupSize: 6 };
const userInfo = { isLoyaltyMember: true, isFirstTimeCustomer: false };

// Calcul
const result1 = calculator.calculateTotalDiscount(tourInfo, booking, userInfo);
console.log("Résultat:", result1);
// {
//   totalDiscount: 150,  // 50 (early) + 25 (group) + 75 (winter loyalty)
//   appliedRules: [...],
//   finalPrice: 350
// }

// EXTENSION : Ajouter une nouvelle règle sans modifier le code existant
calculator.addRule(new FirstTimeCustomerDiscountRule(0.08));

// Tester avec un nouveau client
const newUser = { isLoyaltyMember: false, isFirstTimeCustomer: true };
const result2 = calculator.calculateTotalDiscount(tourInfo, booking, newUser);
console.log("Nouveau client:", result2);
// {
//   totalDiscount: 115,  // 50 (early) + 25 (group) + 40 (first-time 8%)
//   appliedRules: [...],
//   finalPrice: 385
// }
```

### Points clés de cette conception

| Aspect           | Implémentation                                        |
| ---------------- | ----------------------------------------------------- |
| **Fermé**        | `calculateTotalDiscount` ne change jamais             |
| **Ouvert**       | Nouvelles règles via `addRule()` ou nouvelles classes |
| **Testable**     | Chaque règle peut être testée isolément               |
| **Configurable** | Pourcentages paramétrables dans les constructeurs     |

---

## Le OCP dans les Composants React

Dans React, le OCP peut être appliqué pour construire des composants **flexibles** et **réutilisables** qui peuvent être étendus sans modification directe.

### Techniques pour respecter le OCP en React

| Technique                          | Description                                                                  |
| ---------------------------------- | ---------------------------------------------------------------------------- |
| **Composition**                    | Utiliser `props.children` pour rendre du contenu dynamique                   |
| **Higher-Order Components (HOCs)** | Fonctions qui prennent un composant et retournent un composant amélioré      |
| **Render Props**                   | Technique pour partager du code via une prop dont la valeur est une fonction |
| **Custom Hooks**                   | Pour réutiliser de la logique avec état                                      |

### Exemple pratique : Composant Liste Générique

Considérons un composant liste qui doit rendre différents types d'éléments (visites, réservations, utilisateurs).

#### ❌ Violation du OCP

Un `ListComponent` qui utilise de la logique conditionnelle pour rendre différents types d'éléments :

```jsx
// components/ListComponent.jsx (Violation OCP)
function ListComponent({ items, itemType }) {
  return (
    <ul className="list-component">
      {items.map((item) => {
        if (itemType === "tour") {
          return (
            <li key={item.id} className="list-item">
              <h3>{item.name}</h3>
              <p>{item.description}</p>
              <span>{item.price} €</span>
            </li>
          );
        } else if (itemType === "booking") {
          return (
            <li key={item.id} className="list-item">
              <p>ID Réservation : {item.id}</p>
              <p>Visite : {item.tourName}</p>
              <p>Statut : {item.status}</p>
            </li>
          );
        } else if (itemType === "user") {
          // Nouvelle modification nécessaire pour chaque type...
          return (
            <li key={item.id} className="list-item">
              <h4>{item.name}</h4>
              <p>Email : {item.email}</p>
            </li>
          );
        }
        return null;
      })}
    </ul>
  );
}
```

**Problème :** Ajouter un nouveau type d'élément (ex: liste d'avis) nécessiterait de **modifier** `ListComponent` avec plus de blocs `if-else if`.

#### ✅ Adhérence au OCP avec Render Props

Le `GenericListComponent` ne se soucie pas de **comment** chaque élément est rendu. Il délègue cette responsabilité à une prop :

```jsx
// components/GenericListComponent.jsx (OCP avec Render Props)
import React from "react";

function GenericListComponent({
  items,
  renderItem,
  emptyMessage = "Aucun élément à afficher.",
  className = "generic-list",
}) {
  // Ce composant est FERMÉ à la modification
  // Il ne sait pas et n'a pas besoin de savoir quel type d'élément il affiche

  if (!items || items.length === 0) {
    return <p className="list-empty">{emptyMessage}</p>;
  }

  return (
    <ul className={className}>
      {items.map((item, index) => (
        <li key={item.id || index} className="list-item">
          {renderItem(item)} {/* Délégation du rendu via render prop */}
        </li>
      ))}
    </ul>
  );
}

export default GenericListComponent;
```

```jsx
// components/items/TourItem.jsx
import React from "react";

function TourItem({ tour }) {
  return (
    <div className="tour-item">
      <h3>{tour.name}</h3>
      <p>{tour.description}</p>
      <span className="price">{tour.price} €</span>
    </div>
  );
}

export default TourItem;
```

```jsx
// components/items/BookingItem.jsx
import React from "react";

function BookingItem({ booking }) {
  const statusColors = {
    pending: "orange",
    confirmed: "green",
    cancelled: "red",
  };

  return (
    <div className="booking-item">
      <p>
        <strong>ID Réservation :</strong> {booking.id}
      </p>
      <p>
        <strong>Visite :</strong> {booking.tourName}
      </p>
      <p>
        <strong>Statut :</strong>{" "}
        <span style={{ color: statusColors[booking.status] }}>
          {booking.status}
        </span>
      </p>
    </div>
  );
}

export default BookingItem;
```

```jsx
// components/items/UserItem.jsx
import React from "react";

function UserItem({ user }) {
  return (
    <div className="user-item">
      <h4>{user.name}</h4>
      <p>Email : {user.email}</p>
      {user.isLoyaltyMember && (
        <span className="badge loyalty">Membre Fidélité</span>
      )}
    </div>
  );
}

export default UserItem;
```

```jsx
// pages/App.jsx - Utilisation
import React from "react";
import GenericListComponent from "./components/GenericListComponent";
import TourItem from "./components/items/TourItem";
import BookingItem from "./components/items/BookingItem";
import UserItem from "./components/items/UserItem";

function App() {
  const tours = [
    {
      id: "t1",
      name: "Visite de Paris",
      description: "Explorez la capitale",
      price: 150,
    },
    {
      id: "t2",
      name: "Randonnée Alpine",
      description: "Vues panoramiques",
      price: 250,
    },
  ];

  const bookings = [
    { id: "b1", tourName: "Visite de Paris", status: "confirmed" },
    { id: "b2", tourName: "Randonnée Alpine", status: "pending" },
  ];

  const users = [
    {
      id: "u1",
      name: "Alice Martin",
      email: "alice@example.com",
      isLoyaltyMember: true,
    },
    {
      id: "u2",
      name: "Bob Dupont",
      email: "bob@example.com",
      isLoyaltyMember: false,
    },
  ];

  return (
    <div className="app">
      <h2>Liste des Visites</h2>
      <GenericListComponent
        items={tours}
        renderItem={(tour) => <TourItem tour={tour} />}
        emptyMessage="Aucune visite disponible."
      />

      <h2>Liste des Réservations</h2>
      <GenericListComponent
        items={bookings}
        renderItem={(booking) => <BookingItem booking={booking} />}
        emptyMessage="Aucune réservation."
      />

      <h2>Liste des Utilisateurs</h2>
      <GenericListComponent
        items={users}
        renderItem={(user) => <UserItem user={user} />}
        emptyMessage="Aucun utilisateur."
      />
    </div>
  );
}

export default App;
```

Le `GenericListComponent` est maintenant **fermé à la modification**. Pour afficher de nouveaux types d'éléments, de nouveaux composants `Item` sont créés, et la prop `renderItem` est utilisée pour **étendre** le comportement de rendu de la liste.

---

## Avantages de l'adhérence au OCP

| Avantage                      | Description                                                                      |
| ----------------------------- | -------------------------------------------------------------------------------- |
| **Maintenabilité accrue**     | Les changements sont isolés dans du nouveau code, réduisant le risque de bugs    |
| **Évolutivité améliorée**     | Les systèmes s'adaptent facilement aux nouvelles fonctionnalités                 |
| **Réutilisabilité améliorée** | Les abstractions bien conçues peuvent être réutilisées dans différents contextes |
| **Couplage réduit**           | Les composants deviennent moins dépendants des implémentations concrètes         |
| **Tests facilités**           | Les nouvelles fonctionnalités peuvent être testées indépendamment                |

---

## Défis et considérations

Bien que le OCP offre des avantages significatifs, son application n'est pas toujours simple :

### ⚠️ Sur-ingénierie

Appliquer le OCP partout peut mener à des **abstractions excessives** et de la complexité, surtout pour des systèmes simples ou des fonctionnalités peu susceptibles de changer.

**Solution :** Anticiper les zones de changement probables et appliquer le OCP de manière **stratégique**.

### ⚠️ Difficulté à anticiper toutes les extensions

Il est difficile de concevoir des abstractions qui s'adaptent parfaitement à tous les besoins futurs. Parfois, les conceptions initiales nécessitent un refactoring.

**Solution :** Adopter une approche **itérative** - refactorer vers OCP quand le besoin d'extension devient clair.

### ⚠️ Temps de développement initial accru

Concevoir des abstractions flexibles prend souvent plus de temps que d'ajouter simplement de la logique conditionnelle.

**Solution :** Cet investissement est généralement **rentable à long terme** pour les systèmes qui évoluent.

---

## Exercices et activités pratiques

### Exercice 1 : Service de recommandation de visites

Notre application de réservation touristique a besoin d'un service de recommandation de visites. Initialement, il recommande les visites basées sur la popularité. Plus tard, il devra recommander selon les préférences utilisateur, la localisation, ou les réservations passées.

**Tâche :** Concevoir une classe `TourRecommender` qui respecte le OCP.

**Instructions :**

1. Créer une interface `ITourRecommendationStrategy` (ou classe abstraite)
2. Implémenter `PopularityRecommendationStrategy` et `UserPreferenceRecommendationStrategy`
3. Le `TourRecommender` doit accepter une stratégie et l'utiliser pour générer des recommandations
4. Démontrer comment ajouter une nouvelle `LocationBasedRecommendationStrategy` sans modifier `TourRecommender` ou les classes de stratégies existantes

**Indice :** L'interface `ITourRecommendationStrategy` pourrait avoir une méthode comme `getRecommendations(tours, userContext)`.

---

### Exercice 2 : Variations de TourCard React

Notre composant `TourCard` affiche actuellement le nom, la description et le prix d'une visite. Nous devons afficher différents badges ou actions selon le statut de la visite (ex: "En Promo", "Complet", "Nouveau").

**Tâche :** Refactorer un composant `TourCard` pour qu'il soit conforme au OCP.

**Instructions :**

1. Créer un composant `TourCard` de base qui se concentre uniquement sur les détails essentiels de la visite
2. Utiliser `props.children` ou une prop `renderBadge` pour permettre à des composants externes d'injecter des éléments spécifiques au statut (badges, boutons, etc.)
3. Implémenter les composants `OnSaleBadge`, `SoldOutBadge` et `NewTourBadge`
4. Démontrer comment rendre une liste de visites avec le `TourCard` conforme au OCP, en appliquant différents badges selon les données simulées
5. Montrer comment ajouter un badge "Visite Populaire" sans modifier le `TourCard` lui-même

**Indice :** Le `TourCard` pourrait accepter une prop `badge` qui est un composant React, ou il pourrait rendre `props.children` dans une zone spécifique pour les extensions.

---

## Points clés à retenir

| Concept          | Description                                               |
| ---------------- | --------------------------------------------------------- |
| **OCP**          | Ouvert à l'extension, fermé à la modification             |
| **Extension**    | Ajouter du nouveau code (classes, composants)             |
| **Modification** | Changer du code existant et testé                         |
| **Abstractions** | Interfaces et classes abstraites comme points d'extension |
| **React**        | Render props, composition, children pour l'extensibilité  |

---

## Conclusion

Le Principe Ouvert/Fermé est une **pierre angulaire** de la construction de logiciels flexibles et robustes. En concevant des systèmes **ouverts à l'extension mais fermés à la modification**, nous créons des bases de code qui sont :

- Plus **faciles à maintenir**
- Moins **sujettes aux bugs** lors des changements
- Plus **adaptables** aux exigences évolutives

Ce principe, souvent réalisé via l'**abstraction** et le **polymorphisme**, est particulièrement précieux :

- Dans les **microservices** où les services doivent être déployables et évolutifs indépendamment
- Dans les **frameworks UI basés sur les composants** comme React, où le comportement des composants doit souvent être étendu sans modification directe

---

## Prochaine leçon

Comprendre le OCP prépare le terrain pour saisir les autres principes SOLID. Dans la prochaine leçon, nous explorerons le **Principe de Substitution de Liskov (LSP)**, qui s'appuie sur l'idée de **substituabilité** et l'utilisation correcte de l'héritage et des interfaces pour s'assurer que l'extension de types existants ne casse pas le code client.

**➡️ [Leçon 3.3 - Le Principe de Substitution de Liskov (LSP)](lecon-3-liskov-substitution-principle.md)**

---

## Ressources complémentaires

- [Design Patterns: Elements of Reusable Object-Oriented Software](https://www.amazon.fr/Design-Patterns-Elements-Reusable-Object-Oriented/dp/0201633612) - Gang of Four
- [Refactoring: Improving the Design of Existing Code](https://martinfowler.com/books/refactoring.html) - Martin Fowler
- [React Patterns - Render Props](https://react.dev/learn/passing-props-to-a-component)
- [Strategy Pattern - Refactoring Guru](https://refactoring.guru/design-patterns/strategy)
