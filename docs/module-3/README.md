# Module 3 - Principes SOLID et React Avancé

## 🎯 Objectifs du Module

Ce module vous guide dans l'application des **principes SOLID** à la fois dans l'architecture microservices et dans le développement de composants React. Vous apprendrez à concevoir du code **maintenable**, **extensible** et **testable**.

---

## 📚 Ce que vous allez apprendre

### Principes SOLID

- **S**ingle Responsibility Principle (SRP) - Une seule raison de changer
- **O**pen/Closed Principle (OCP) - Ouvert à l'extension, fermé à la modification
- **L**iskov Substitution Principle (LSP) - Substitution de types sans altération du comportement
- **I**nterface Segregation Principle (ISP) - Interfaces spécifiques plutôt que générales
- **D**ependency Inversion Principle (DIP) - Dépendre d'abstractions, pas d'implémentations

### Application aux Microservices

- Décomposition basée sur les responsabilités
- Services extensibles via plugins et middleware
- Contrats d'API cohérents et substituables
- Injection de dépendances pour la testabilité

### React Avancé

- Composants présentationnels vs containers
- Patterns de composition et Higher-Order Components
- Context API et gestion d'état avancée
- Redux Toolkit pour l'état global

---

## 📖 Leçons du Module

| #   | Leçon                                                                         | Description                                    | Durée estimée |
| --- | ----------------------------------------------------------------------------- | ---------------------------------------------- | ------------- |
| 3.1 | [Single Responsibility Principle](lecon-1-single-responsibility-principle.md) | SRP dans les microservices et composants React | ~2h           |
| 3.2 | [Open/Closed Principle](lecon-2-open-closed-principle.md)                     | Code extensible sans modification              | ~2h           |
| 3.3 | [Liskov Substitution Principle](lecon-3-liskov-substitution-principle.md)     | Substitution de types et polymorphisme         | ~1h30         |
| 3.4 | [Interface Segregation Principle](lecon-4-interface-segregation-principle.md) | Interfaces spécifiques et API design           | ~1h30         |
| 3.5 | [Dependency Inversion Principle](lecon-5-dependency-inversion-principle.md)   | IoC, DI et architecture découplée              | ~2h           |
| 3.6 | [Advanced React State Management](lecon-6-advanced-react-state-management.md) | Context API, Redux Toolkit, patterns avancés   | ~3h           |

**Temps total estimé : ~12 heures**

---

## 🏆 Acquis à la fin du Module

À la fin de ce module, vous serez capable de :

### Conception SOLID

- ✅ Identifier les **violations des principes SOLID** dans le code existant
- ✅ Refactorer du code pour **respecter le SRP** (une responsabilité par module)
- ✅ Concevoir des services **extensibles** sans modification (OCP)
- ✅ Créer des **interfaces cohérentes** et substituables (LSP)
- ✅ Définir des **APIs spécifiques** aux besoins des clients (ISP)
- ✅ Implémenter l'**injection de dépendances** (DIP)

### Développement React

- ✅ Séparer les composants **présentationnels** des **containers**
- ✅ Utiliser les **Custom Hooks** pour la réutilisation de logique
- ✅ Implémenter **Context API** pour l'état partagé
- ✅ Configurer **Redux Toolkit** pour la gestion d'état globale
- ✅ Appliquer les **patterns de composition** React

### Architecture

- ✅ Structurer les microservices selon les principes SOLID
- ✅ Créer une architecture **testable** et **maintenable**
- ✅ Implémenter des **patterns de design** appropriés
- ✅ Documenter les **décisions architecturales**

---

## 🛠️ Stack Technique

| Technologie   | Version  | Usage                       |
| ------------- | -------- | --------------------------- |
| Node.js       | 22.x LTS | Runtime JavaScript          |
| Express       | 4.21.x   | Framework web               |
| React         | 18.x     | Bibliothèque UI             |
| Redux Toolkit | 2.x      | Gestion d'état              |
| TypeScript    | 5.x      | Typage statique (optionnel) |
| Jest          | 29.x     | Tests unitaires             |

---

## 🔗 Prérequis

Avant de commencer ce module, assurez-vous d'avoir complété :

- ✅ **Module 1** : Fondements du Développement Web Moderne
- ✅ **Module 2** : Conception et Implémentation des Microservices Principaux

Vous devez avoir :

- Les microservices **Tour Catalog** et **Booking Management** fonctionnels
- PostgreSQL configuré avec les bases de données des deux services
- Une compréhension des concepts REST et de l'architecture microservices

---

## 📁 Structure des fichiers

```
docs/module-3/
├── README.md                                    # Ce fichier
├── lecon-1-single-responsibility-principle.md   # Leçon 3.1 - SRP
├── lecon-2-open-closed-principle.md             # Leçon 3.2 - OCP
├── lecon-3-liskov-substitution-principle.md     # Leçon 3.3 - LSP
├── lecon-4-interface-segregation-principle.md   # Leçon 3.4 - ISP
├── lecon-5-dependency-inversion-principle.md    # Leçon 3.5 - DIP
├── lecon-6-advanced-react-state-management.md   # Leçon 3.6 - React avancé
└── exercices/
    ├── lecon-3.1-solutions.md                   # Solutions exercices SRP
    ├── lecon-3.2-solutions.md                   # Solutions exercices OCP
    ├── lecon-3.3-solutions.md                   # Solutions exercices LSP
    ├── lecon-3.4-solutions.md                   # Solutions exercices ISP
    ├── lecon-3.5-solutions.md                   # Solutions exercices DIP
    └── lecon-3.6-solutions.md                   # Solutions exercices React
```

---

## 🚀 Pour commencer

1. Assurez-vous que vos microservices du Module 2 fonctionnent
2. Commencez par la [Leçon 3.1 - Single Responsibility Principle](lecon-1-single-responsibility-principle.md)
3. Complétez les exercices de chaque leçon avant de passer à la suivante
4. Consultez les solutions uniquement après avoir tenté les exercices

---

## 📊 Progression

| Leçon | Statut      | Notes |
| ----- | ----------- | ----- |
| 3.1   | 🟡 En cours | SRP   |
| 3.2   | ⬜ À faire  | OCP   |
| 3.3   | ⬜ À faire  | LSP   |
| 3.4   | ⬜ À faire  | ISP   |
| 3.5   | ⬜ À faire  | DIP   |
| 3.6   | ⬜ À faire  | React |

---

## 💡 Conseils

- **Prenez le temps** de bien comprendre chaque principe avant de passer au suivant
- **Pratiquez** en identifiant les violations SOLID dans du code existant
- **Refactorez** progressivement - ne cherchez pas la perfection du premier coup
- Les principes SOLID sont des **guides**, pas des règles absolues
- L'objectif est un code **maintenable**, pas un code "parfaitement SOLID"
