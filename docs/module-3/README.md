# Module 3 - Principes SOLID, Design Patterns et React Avancé

## 🎯 Objectifs du Module

Ce module vous guide dans l'application des **principes SOLID** à la fois dans l'architecture microservices et dans le développement de composants React. Vous apprendrez à concevoir du code **maintenable**, **extensible** et **testable** en appliquant les design patterns appropriés.

---

## 📚 Ce que vous allez apprendre

### Principes SOLID

- **S**ingle Responsibility Principle (SRP) - Une seule raison de changer
- **O**pen/Closed Principle (OCP) - Ouvert à l'extension, fermé à la modification
- **L**iskov Substitution Principle (LSP) - Substitution de types sans altération
- **I**nterface Segregation Principle (ISP) - Interfaces spécifiques plutôt que générales
- **D**ependency Inversion Principle (DIP) - Dépendre d'abstractions, pas d'implémentations

### Application aux Microservices

- Décomposition basée sur les **responsabilités uniques**
- Services **extensibles** via plugins et middleware
- Contrats d'API **cohérents** et substituables
- **Injection de dépendances** pour la testabilité et le découplage

### React Avancé et State Management

- Gestion d'état avec **Context API** et **useReducer**
- Patterns **Redux-like** sans bibliothèque externe
- **Redux Toolkit** pour applications complexes
- Composants **présentationnels** vs **containers**
- **Custom Hooks** pour la réutilisation de logique

---

## 📖 Leçons du Module

| #   | Leçon                                                                                         | Description                                         | Durée estimée |
| --- | --------------------------------------------------------------------------------------------- | --------------------------------------------------- | ------------- |
| 3.1 | [Single Responsibility Principle (SRP)](lecon-1-single-responsibility-principle.md)           | SRP dans les microservices et composants React      | ~2h           |
| 3.2 | [Open/Closed Principle (OCP)](lecon-2-open-closed-principle.md)                               | Code extensible sans modification                   | ~2h           |
| 3.3 | [Liskov Substitution Principle (LSP)](lecon-3-liskov-substitution-principle.md)               | Substitution de types et polymorphisme              | ~1h30         |
| 3.4 | [Interface Segregation Principle (ISP)](lecon-4-interface-segregation-principle.md)           | Interfaces spécifiques et API design                | ~1h30         |
| 3.5 | [Dependency Inversion Principle (DIP)](lecon-5-dependency-inversion-principle.md)             | IoC, DI et architecture découplée                   | ~2h           |
| 3.6 | [React Avancé : State Management et Custom Hooks](lecon-6-advanced-react-state-management.md) | Context API, useReducer, Custom Hooks, Architecture | ~5h           |

**Temps total estimé : ~14 heures** (6 leçons)

---

## 🏆 Acquis à la fin du Module

À la fin de ce module, vous serez capable de :

### Conception SOLID

- ✅ Identifier les **violations des principes SOLID** dans le code existant
- ✅ Refactorer du code pour **respecter le SRP** (une responsabilité par module)
- ✅ Concevoir des services **extensibles** sans modification (OCP)
- ✅ Créer des **interfaces cohérentes** et substituables (LSP)
- ✅ Définir des **APIs spécifiques** aux besoins des clients (ISP)
- ✅ Implémenter l'**injection de dépendances** et l'inversion de contrôle (DIP)

### Développement React

- ✅ Utiliser **Context API** pour partager l'état global sans prop drilling
- ✅ Gérer des logiques d'état complexes avec **useReducer**
- ✅ Combiner **Context + useReducer** pour un state management centralisé
- ✅ Configurer **Redux Toolkit** pour les applications à grande échelle
- ✅ Créer des **Custom Hooks** réutilisables
- ✅ Séparer composants **présentationnels** des **containers**

### Architecture

- ✅ Structurer les microservices selon les **principes SOLID**
- ✅ Créer une architecture **testable** et **maintenable**
- ✅ Implémenter des **patterns de design** appropriés (Factory, Strategy, Observer)
- ✅ Documenter les **décisions architecturales** avec ADRs

---

## 🛠️ Stack Technique

| Technologie   | Version  | Usage                              |
| ------------- | -------- | ---------------------------------- |
| Node.js       | 22.x LTS | Runtime JavaScript                 |
| Express       | 4.21.x   | Framework web backend              |
| React         | 18.x     | Bibliothèque UI frontend           |
| Redux Toolkit | 2.x      | Gestion d'état globale (optionnel) |
| TypeScript    | 5.x      | Typage statique (recommandé)       |
| Jest          | 29.x     | Tests unitaires                    |
| PostgreSQL    | 18.x     | Base de données (depuis Module 2)  |

---

## 🎨 Patterns et Refactoring

Ce module **améliore et refactorise** les microservices construits dans le Module 2 en appliquant les principes SOLID :

### Refactoring Tour Catalog Service

- Application du **SRP** : séparation controllers/services/repositories
- Application de l'**OCP** : système de plugins pour filtres et validateurs
- Application du **DIP** : injection de dépendances pour les repositories

### Refactoring Booking Management Service

- Application du **LSP** : hiérarchie de stratégies de paiement substituables
- Application de l'**ISP** : interfaces spécifiques (INotificationService, IPaymentGateway)
- Patterns : Strategy (paiements), Observer (notifications), Factory (création d'entités)

### Frontend React Avancé

- **Context API** : Authentification, panier de réservation, préférences utilisateur
- **useReducer** : Gestion d'état complexe (panier, recherche, filtres)
- **Redux Toolkit** : Alternative pour applications à grande échelle
- **Custom Hooks** : Logique réutilisable (useAuth, useBooking, useCurrency)

---

## 📁 Structure des Fichiers

```
docs/module-3/
├── README.md                                    # Ce fichier
├── lecon-1-single-responsibility-principle.md   # Leçon 3.1 - SRP
├── lecon-2-open-closed-principle.md             # Leçon 3.2 - OCP
├── lecon-3-liskov-substitution-principle.md     # Leçon 3.3 - LSP
├── lecon-4-interface-segregation-principle.md   # Leçon 3.4 - ISP
├── lecon-5-dependency-inversion-principle.md    # Leçon 3.5 - DIP
├── lecon-6-advanced-react-state-management.md   # Leçon 3.6 - React avancé + Custom Hooks
└── exercices/
    ├── lecon-3.1-solutions.md                   # Solutions exercices SRP
    ├── lecon-3.2-solutions.md                   # Solutions exercices OCP
    ├── lecon-3.3-solutions.md                   # Solutions exercices LSP
    ├── lecon-3.4-solutions.md                   # Solutions exercices ISP
    ├── lecon-3.5-solutions.md                   # Solutions exercices DIP
    └── lecon-3.6-solutions.md                   # Solutions exercices React + Custom Hooks
```

---

## 📋 Prérequis

Avant de commencer ce module, assurez-vous d'avoir complété :

- ✅ **Module 1** : Fondements du Développement Web Moderne
- ✅ **Module 2** : Conception et Implémentation des Microservices Principaux

Vous devez avoir :

- Les microservices **Tour Catalog** et **Booking Management** fonctionnels
- PostgreSQL configuré avec les bases de données des deux services
- Une compréhension des concepts REST et de l'architecture microservices
- Familiarité avec React (hooks de base : useState, useEffect)

---

## 🔗 Liens avec les Autres Modules

| Module       | Relation                                           |
| ------------ | -------------------------------------------------- |
| **Module 1** | Prérequis - Fondements et backend monolithique     |
| **Module 2** | Prérequis - Microservices Tour Catalog et Booking  |
| **Module 4** | Suite - Payment Processing et Security (à venir)   |
| **Module 5** | Extension - Communication événementielle (à venir) |

---

## 💡 Conseils d'Apprentissage

1. **Suivez l'ordre des leçons** - Chaque principe SOLID s'appuie sur les précédents
2. **Identifiez les violations** - Avant de refactorer, apprenez à détecter les problèmes
3. **Refactorez progressivement** - Ne cherchez pas la perfection dès le premier coup
4. **Testez après chaque refactoring** - Assurez-vous que le comportement reste identique
5. **SOLID = guides, pas règles** - L'objectif est un code maintenable, pas "parfaitement SOLID"
6. **Pratiquez avec vos propres exemples** - Appliquez les principes à votre code existant

---

## ✅ Checklist de Validation

Avant de passer au Module 4, vérifiez que vous avez :

- [ ] Lu et compris les 6 leçons du module
- [ ] Identifié des violations SOLID dans du code existant
- [ ] Refactoré au moins un service en appliquant le SRP
- [ ] Implémenté un système extensible avec l'OCP
- [ ] Créé des interfaces conformes à l'ISP
- [ ] Appliqué l'injection de dépendances (DIP)
- [ ] Utilisé Context API et useReducer dans un composant React
- [ ] Créé au moins 2 Custom Hooks réutilisables
- [ ] Complété au moins 10 exercices sur 17
- [ ] Compris quand utiliser Context vs Redux Toolkit

**Compétences clés acquises :**

- Conception orientée objets avec SOLID
- Architecture découplée et testable
- Gestion d'état avancée en React
- Patterns de design appliqués aux microservices

---

**Bon apprentissage ! 🚀**
