# Leçon 1.6 - Monolithe vs Microservices : comprendre les compromis

**Module 1** : Fondements du Développement Web Moderne et des Microservices

---

## Objectifs pédagogiques

- Comprendre les caractéristiques de l'architecture monolithique
- Comparer objectivement les avantages et inconvénients des deux approches
- Identifier les critères de choix entre monolithe et microservices
- Appliquer ces connaissances au contexte de notre application de réservation touristique

## Prérequis

- [Leçon 1.1 : Introduction à l'étude de cas](lecon-1-introduction-etude-de-cas.md)
- [Leçon 1.4 : Principes de Design d'API RESTful](lecon-4-restful-api-design.md)
- [Leçon 1.5 : Introduction à l'architecture microservices](lecon-5-microservices-intro.md)

## Durée estimée

1 heure 15 minutes

---

## Introduction

L'architecture logicielle définit la structure fondamentale d'un système logiciel, influençant sa scalabilité, sa maintenabilité et son évolution. Deux styles architecturaux proéminents, monolithique et microservices, offrent des approches distinctes pour construire des applications, chacune avec son propre ensemble d'avantages et d'inconvénients. Comprendre ces compromis est crucial pour prendre des décisions de conception éclairées, particulièrement lors du développement de systèmes complexes comme notre application de réservation touristique.

---

## Comprendre l'architecture monolithique

Une architecture monolithique représente une approche traditionnelle où tous les composants d'une application sont étroitement couplés et fonctionnent comme une seule unité unifiée. Cela signifie que l'ensemble de l'application — frontend, logique backend et interactions avec la base de données — est regroupé dans un package de déploiement unique. Tout changement, aussi petit soit-il, nécessite généralement de reconstruire et redéployer l'ensemble de l'application.

### Caractéristiques des monolithes

**Base de code unique** : Toutes les fonctionnalités et modules résident dans un seul référentiel et une structure de projet unique.

**Ressources partagées** : Les composants partagent souvent le même processus, le même espace mémoire et parfois le même pool de connexions à la base de données.

**Unité de déploiement unique** : L'ensemble de l'application est compilé et déployé comme un artefact indivisible (par exemple, un seul fichier WAR pour Java, un seul exécutable pour Node.js).

**Pile technologique unifiée** : Typiquement, un seul langage de programmation et framework sont utilisés dans toute l'application.

### Avantages de l'architecture monolithique

#### 1. Simplicité de développement et de déploiement (initialement)

Pour les applications de petite à moyenne taille, une structure monolithique peut être plus rapide à configurer et à déployer. Tout le code est au même endroit, ce qui facilite la gestion des dépendances et le déploiement d'un seul artefact.

**Exemple hypothétique** : Un système de commande en ligne pour une petite boulangerie locale. Il a quelques pages pour l'affichage du menu, un panier d'achat et un paiement basique. Toute la logique pour afficher les articles, traiter les commandes et l'authentification utilisateur est dans une seule application. Un développeur peut rapidement construire et déployer ce système comme une seule unité sans se soucier de la communication inter-services ou de multiples déploiements.

**Application réelle** : Les premières versions de nombreuses applications web réussies comme Etsy ou Amazon ont commencé comme des monolithes en raison de leur simplicité initiale et de leurs équipes plus petites. Elles ont évolué vers des systèmes plus distribués à mesure que leur complexité et leur échelle augmentaient.

#### 2. Débogage et tests plus faciles

Puisque tous les composants s'exécutent dans le même processus, tracer les problèmes et effectuer des tests de bout en bout peut être simple. Vous n'avez pas besoin de gérer la latence réseau ou les échecs de communication inter-services pendant le débogage.

**Exemple (contexte de l'application touristique)** : Dans une application touristique monolithique, si un utilisateur ne peut pas réserver une visite, un développeur peut utiliser un débogueur pour parcourir l'ensemble du flux, de la requête UI, à travers la logique de réservation, jusqu'à la persistance en base de données, tout cela dans une seule session de débogage. Toutes les fonctions connexes sont accessibles localement.

#### 3. Gestion simplifiée des préoccupations transversales

Des aspects comme la journalisation, la mise en cache et la sécurité peuvent être implémentés uniformément dans toute l'application, souvent en utilisant une seule configuration ou bibliothèque.

**Exemple** : Une bibliothèque de journalisation peut être configurée une fois pour capturer les logs de toutes les parties de l'application et les diriger vers un seul fichier ou un service de journalisation centralisé. De même, un seul module d'authentification peut protéger tous les points de terminaison de l'API.

### Inconvénients de l'architecture monolithique

#### 1. Couplage serré et agilité réduite

Les changements dans une partie de l'application peuvent affecter involontairement d'autres parties, rendant le développement plus lent et plus risqué à mesure que la base de code croît. Il est difficile de faire de petites mises à jour indépendantes.

**Exemple (contexte de l'application touristique)** : Imaginez que notre application touristique a des modules de Gestion des Visites, de Réservation et d'Authentification Utilisateur tous dans un monolithe. Si l'équipe de Gestion des Visites doit mettre à jour la façon dont les prix des visites sont calculés, elle pourrait accidentellement introduire un bug dans le module de Réservation car les deux modules s'appuient sur des fonctions utilitaires partagées ou des structures de données. Redéployer ce changement signifie redéployer l'ensemble de l'application, ce qui pourrait impacter les réservations en cours ou les sessions utilisateur.

#### 2. Défis de scalabilité

Les monolithes évoluent généralement comme une seule unité. Si un seul composant (par exemple, la logique de traitement des réservations) subit une forte charge, l'ensemble de l'application doit être mis à l'échelle, ce qui peut être inefficace et coûteux.

**Exemple** : Pendant les saisons de vacances de pointe, la partie traitement des réservations de notre application touristique pourrait connaître une augmentation massive du trafic, tandis que les sections Recherche de Visites et Profil Utilisateur restent relativement stables. Dans un monolithe, pour gérer la charge de réservation, le serveur d'application entier doit être mis à l'échelle (plus de RAM, CPU, ou instances supplémentaires de l'ensemble de l'application), même si la plupart de ses composants ne sont pas sous forte charge. Cela conduit à un gaspillage de ressources.

#### 3. Verrouillage technologique

Choisir une pile technologique spécifique au début signifie que l'ensemble de l'application est construit dessus. Introduire de nouveaux langages ou frameworks plus tard peut être très difficile ou impossible sans une réécriture complète.

**Exemple** : Si l'application touristique a été initialement construite entièrement en Java avec Spring Boot, et qu'une nouvelle fonctionnalité pourrait être développée beaucoup plus efficacement en utilisant les bibliothèques de machine learning de Python (par exemple, pour des recommandations de visites personnalisées), intégrer Python directement dans le monolithe Java existant serait très complexe, nécessitant potentiellement des processus séparés ou une réécriture complète du module concerné en Java.

#### 4. Faible isolation des pannes

Un bug ou une défaillance dans une partie de l'application peut faire tomber l'ensemble du système.

**Exemple** : Si le module d'intégration de passerelle de paiement dans une application touristique monolithique subit une fuite de mémoire ou une exception non gérée, cela pourrait crasher l'ensemble du serveur d'application, rendant les fonctionnalités de Recherche de Visites, d'Authentification Utilisateur et de Réservation indisponibles pour tous les utilisateurs.

#### 5. Difficulté pour les grandes équipes

À mesure que l'équipe grandit, les développeurs travaillant sur différentes fonctionnalités peuvent fréquemment se gêner mutuellement en raison de la base de code partagée, conduisant à des conflits de fusion et des cycles de développement plus lents.

**Application réelle** : Une grande entreprise avec des centaines de développeurs essayant de travailler sur un seul système ERP monolithique. Différentes équipes responsables des modules Inventaire, Finance, RH et CRM feraient constamment face à des défis pour coordonner les changements, résoudre les conflits de fusion et s'assurer que leurs mises à jour ne cassent pas d'autres parties du système, conduisant à des cycles de release lents et à de la frustration.

---

## Architecture microservices

L'architecture microservices est une approche pour développer une application unique comme une suite de petits services indépendants, chacun fonctionnant dans son propre processus et communiquant avec des mécanismes légers, souvent une API HTTP RESTful. Ces services sont construits autour de capacités métier et sont déployables indépendamment par une machinerie de déploiement entièrement automatisée.

### Caractéristiques des microservices

**Gestion décentralisée des données** : Chaque microservice gère généralement sa propre base de données ou magasin de données, garantissant un couplage lâche et une évolution indépendante.

**Développement et déploiement autonomes** : Les équipes peuvent développer, déployer et mettre à l'échelle leurs services indépendamment, sans affecter d'autres parties de l'application.

**Persistance et programmation polyglotte** : Différents services peuvent utiliser différentes bases de données et langages de programmation optimisés pour leurs besoins spécifiques.

**Isolation des pannes** : Une défaillance dans un service n'entraîne généralement pas la chute de l'ensemble de l'application.

**Communication via API** : Les services communiquent entre eux via des API bien définies (par exemple, RESTful HTTP, gRPC, files d'attente de messages).

### Avantages de l'architecture microservices

#### 1. Agilité améliorée et mise sur le marché plus rapide

Les services indépendants signifient que les équipes peuvent développer, tester et déployer des fonctionnalités plus rapidement et fréquemment. Les petits changements ne nécessitent pas de redéployer l'ensemble de l'application.

**Exemple (contexte de l'application touristique)** : Si l'équipe du Catalogue de Visites veut ajouter une nouvelle option de filtrage basée sur le "niveau d'aventure", elle peut développer et déployer cette fonctionnalité sur le Microservice Catalogue de Visites sans avoir besoin de coordonner une release complète avec les équipes de Réservation ou de Paiement. Cela permet une itération et un déploiement rapides de nouvelles fonctionnalités.

#### 2. Scalabilité améliorée

Chaque service peut être mis à l'échelle indépendamment en fonction de ses exigences de charge spécifiques. Cela conduit à une utilisation plus efficace des ressources.

**Exemple (contexte de l'application touristique)** : Pendant une vente flash, le Microservice de Réservation pourrait connaître une augmentation de trafic de 10x. Avec les microservices, seul ce service spécifique doit être mis à l'échelle (en ajoutant plus d'instances), tandis que d'autres services comme Profil Utilisateur ou Gestion des Avis peuvent maintenir leur allocation de ressources actuelle. Cela optimise les coûts d'infrastructure.

#### 3. Hétérogénéité technologique (capacités polyglotte)

Différents services peuvent être construits en utilisant différents langages de programmation, frameworks et technologies de stockage de données les mieux adaptés à leurs fonctions spécifiques.

**Exemple** : Le Microservice Catalogue de Visites pourrait être construit en utilisant Node.js et MongoDB pour une modélisation de données flexible et des opérations de lecture rapides. Le Microservice de Traitement des Paiements pourrait utiliser Java avec une base de données PostgreSQL pour ses fortes garanties transactionnelles et ses fonctionnalités de sécurité de niveau entreprise. Un Microservice de Recommandation pourrait être construit en Python pour exploiter ses vastes bibliothèques de machine learning.

#### 4. Meilleure isolation des pannes et résilience

Une défaillance dans un microservice n'affecte que ce service spécifique, pas l'ensemble de l'application. Les autres services continuent de fonctionner normalement.

**Exemple** : Si le Microservice de Notification (responsable de l'envoi de confirmations de réservation par email) tombe en panne en raison d'une panne de service email externe, les utilisateurs peuvent toujours rechercher des visites, effectuer des réservations et gérer leurs profils. Les fonctionnalités principales restent inaffectées, et la notification peut être réessayée une fois le service rétabli.

#### 5. Plus facile pour les grandes équipes distribuées

Les équipes peuvent posséder et gérer des services spécifiques de bout en bout, favorisant l'autonomie et réduisant la surcharge de coordination.

**Application réelle** : Netflix, pionnier des microservices, a des milliers de services maintenus par des équipes indépendantes. Chaque équipe est responsable de son service, du développement au déploiement et à l'exploitation. Cette structure organisationnelle permet une innovation rapide et un développement parallèle à travers une main-d'œuvre d'ingénierie massive.

### Inconvénients de l'architecture microservices

#### 1. Complexité accrue

Gérer plusieurs services, leurs interactions, leur déploiement, leur surveillance et la cohérence des données à travers des systèmes distribués introduit une complexité opérationnelle et de développement significative.

**Exemple hypothétique** : Dans notre application touristique, réserver une visite pourrait impliquer des interactions entre le Service de Réservation, le Service de Paiement, le Service de Catalogue de Visites (pour vérifier la disponibilité) et le Service de Notification. Si une réservation échoue, identifier la cause racine pourrait nécessiter de tracer les requêtes à travers plusieurs services, d'examiner les logs de services individuels et de comprendre les protocoles de communication inter-services. C'est bien plus complexe que de déboguer un seul processus monolithique.

#### 2. Défis de gestion des données distribuées

Maintenir la cohérence des données à travers plusieurs bases de données indépendantes peut être difficile. Implémenter des transactions distribuées (comme le pattern Saga) est complexe.

**Exemple** : Lorsqu'un utilisateur réserve une visite, le Service de Réservation doit enregistrer la réservation, et le Service de Catalogue de Visites doit décrémenter les places disponibles. Si le Service de Réservation valide sa transaction mais que la mise à jour dans le Service de Catalogue de Visites échoue (par exemple, erreur réseau), le système entre dans un état incohérent. Gérer de tels scénarios nécessite des patterns sophistiqués comme le two-phase commit ou les sagas, qui ajoutent une complexité considérable.

#### 3. Surcharge de communication inter-services

La latence réseau et le besoin de mécanismes de communication robustes (API, files d'attente de messages) ajoutent une surcharge et des points de défaillance potentiels.

**Exemple** : Chaque interaction entre services dans notre application touristique (par exemple, Service de Réservation appelant le Service de Paiement) implique des appels réseau. Ces appels ont une latence inhérente, peuvent échouer ou expirer. Concevoir pour ces éventualités nécessite des circuit breakers, des tentatives de reconnexion et une gestion d'erreurs robuste, qui ne sont pas des préoccupations dans un seul processus monolithique.

#### 4. Surcharge opérationnelle

Déployer, surveiller et gérer de nombreux services indépendants nécessite une infrastructure sophistiquée (par exemple, orchestration de conteneurs avec Kubernetes, journalisation centralisée, traçage distribué).

**Application réelle** : Opérer un système basé sur les microservices comme la plateforme de covoiturage d'Uber implique de gérer des centaines de services, chacun avec son propre pipeline de déploiement, ses tableaux de bord de surveillance et ses flux de journalisation. Mettre en place et maintenir cette infrastructure nécessite une expertise DevOps spécialisée et un investissement significatif dans les outils et l'automatisation.

#### 5. Défis de tests

Les tests de bout en bout à travers plusieurs services, chacun potentiellement dans un environnement ou une version différente, deviennent plus difficiles.

**Exemple** : Pour tester complètement le flux de réservation dans notre application touristique, vous devriez lancer et configurer correctement les microservices Catalogue de Visites, Réservation, Paiement, Authentification Utilisateur et Notification, ainsi que leurs bases de données respectives. S'assurer que ces services sont tous compatibles et communiquent correctement pour un test d'intégration est beaucoup plus impliqué que d'exécuter des tests contre une seule application monolithique.

---

## Choisir entre monolithe et microservices

La décision d'adopter une architecture monolithique ou microservices n'est pas universelle. Elle dépend fortement de facteurs tels que la taille de l'équipe, la complexité du projet, l'échelle attendue et la structure organisationnelle.

### Tableau comparatif

| Fonctionnalité / Aspect     | Architecture monolithique                                                | Architecture microservices                                                 |
| --------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| **Développement initial**   | Plus simple, plus rapide pour les petites équipes et applications        | Configuration plus complexe, surcharge initiale plus élevée                |
| **Déploiement**             | Artefact unique, application entière redéployée                          | Déploiements indépendants pour chaque service, livraison continue possible |
| **Scalabilité**             | Évolue comme une seule unité (verticale ou horizontale pour toute l'app) | Mise à l'échelle indépendante pour chaque service                          |
| **Flexibilité**             | Faible, difficile d'introduire de nouvelles technologies                 | Élevée, développement polyglotte possible                                  |
| **Taille/Structure équipe** | Petites équipes colocalisées bénéficient le plus                         | Grandes équipes distribuées avec propriété spécialisée                     |
| **Tolérance aux pannes**    | Faible, défaillance dans une partie peut impacter tout le système        | Élevée, défaillance isolée aux services individuels                        |
| **Complexité**              | Faible (initialement), augmente avec la croissance de l'application      | Élevée (intrinsèquement), due à la nature distribuée                       |
| **Gestion des données**     | Base de données unique et partagée est courante                          | Décentralisée, chaque service gère ses propres données                     |
| **Communication**           | Appels de fonction dans le processus                                     | Appels réseau (HTTP, RPC, files d'attente de messages)                     |
| **Refactoring**             | Difficile en raison du couplage serré                                    | Plus facile dans les limites du service, plus difficile entre services     |

### Quand envisager un monolithe

#### 1. Applications petites et simples

Pour les applications avec des fonctionnalités limitées et une croissance attendue, un monolithe peut être le choix le plus efficace initialement.

**Exemple** : Une startup construisant son premier MVP (Produit Minimum Viable) pour un marché de niche. Ils doivent arriver sur le marché rapidement pour valider leur idée. Une approche monolithique réduit le temps de configuration initial et la complexité.

#### 2. Petites équipes

Une petite équipe (par exemple, 2-5 développeurs) peut gérer efficacement une seule base de code sans surcharge de coordination significative.

#### 3. Budget/Ressources limités

La surcharge opérationnelle des microservices nécessite souvent des ingénieurs DevOps plus qualifiés et un investissement en infrastructure. Un monolithe peut être plus rentable pour des budgets plus petits.

#### 4. Startups en phase initiale

Lorsque les exigences métier évoluent encore et que le domaine n'est pas encore pleinement compris, un monolithe permet une itération et des changements rapides sans la surcharge de ré-architecturer plusieurs services.

### Quand envisager les microservices

#### 1. Applications complexes à grande échelle

Pour les applications avec de nombreuses capacités métier distinctes et un grand nombre de fonctionnalités.

**Exemple (contexte de l'application touristique)** : Notre application touristique fullstack, qui inclut Catalogue de Visites, Gestion de Réservation, Authentification Utilisateur, Traitement des Paiements, Notification, et potentiellement Gestion des Avis, Moteur de Recommandation, etc., est un candidat de premier choix pour les microservices en raison de sa complexité inhérente et du besoin d'évolution indépendante de ces domaines distincts.

#### 2. Grandes équipes distribuées

Lorsque plusieurs équipes indépendantes doivent travailler sur différentes parties du système simultanément sans se bloquer mutuellement.

#### 3. Exigences élevées de scalabilité

Si des parties spécifiques de l'application devraient subir une charge disproportionnellement élevée et doivent évoluer indépendamment.

#### 4. Besoins technologiques divers

Lorsque différentes capacités métier peuvent bénéficier de manière significative de différents langages de programmation, frameworks ou bases de données.

#### 5. Besoin d'isolation des pannes élevée

Pour les systèmes où la défaillance d'un composant ne doit pas impacter la disponibilité de l'ensemble de l'application.

---

## Exercices

### 1. Analyse de scénario : évolution de l'application touristique

Imaginez que notre application de réservation touristique commence comme un monolithe. Décrivez **trois défis spécifiques** qui apparaîtraient probablement à mesure que l'application grandit pour supporter des millions d'utilisateurs, des centaines de visites et de nouvelles fonctionnalités comme le support de chat en temps réel et les recommandations personnalisées. Pour chaque défi, expliquez comment une architecture microservices pourrait l'atténuer.

### 2. Identification des compromis

Vous êtes chargé de construire un nouveau système interne pour gérer les demandes de congés des employés pour une petite entreprise (50 employés). Le système aura des fonctionnalités de base : connexion des employés, soumission de demandes de congés, approbation par le manager et un tableau de bord RH.

**Questions** :

a) Recommanderiez-vous une architecture monolithique ou microservices pour ce système ? Justifiez votre choix en listant **au moins deux avantages** et **un inconvénient** de l'architecture choisie dans ce contexte spécifique.

### 3. Implications de la pile technologique

Considérez une architecture monolithique construite principalement avec Node.js et une seule base de données PostgreSQL. Imaginez maintenant une architecture microservices où le service "Authentification Utilisateur" est en Node.js avec MongoDB, et le service "Gestion de Réservation" est en Java avec PostgreSQL.

**Tâches** :

a) Identifiez **un avantage spécifique** et **un inconvénient spécifique** de l'approche microservices concernant la pile technologique dans ce scénario, par rapport à la configuration monolithique.

---

## Applications réelles

De nombreuses entreprises de premier plan ont transitionné d'architectures monolithiques vers des microservices pour atteindre une plus grande agilité, scalabilité et résilience.

### Netflix

Netflix a déplacé son architecture d'une seule application monolithique vers une vaste architecture microservices. À mesure que leur base d'utilisateurs grandissait mondialement et que les demandes de streaming s'intensifiaient, le monolithe est devenu un goulot d'étranglement pour le développement et le déploiement. Le passage leur a permis de mettre à l'échelle des composants individuels (par exemple, moteur de recommandation, encodage vidéo, authentification utilisateur) indépendamment, de résister aux défaillances dans des services spécifiques sans impacter l'ensemble de la plateforme, et de permettre à des milliers d'ingénieurs de travailler sur différentes fonctionnalités simultanément. Leur décision était motivée par le besoin d'une scalabilité extrême, d'une livraison rapide de fonctionnalités et d'une haute disponibilité à travers une infrastructure mondiale.

### Amazon

L'architecture initiale d'Amazon.com était largement monolithique. À mesure que le géant du commerce électronique élargissait son catalogue de produits, sa base d'utilisateurs et sa gamme de services, l'approche monolithique est devenue insoutenable. Ils ont progressivement décomposé leur système en centaines, et maintenant des milliers, de petits services indépendants. Cette décomposition était cruciale pour gérer l'échelle massive de leurs opérations, permettant à diverses équipes d'innover indépendamment et d'intégrer divers services tiers. Par exemple, la fonctionnalité de panier d'achat pourrait être un service distinct du catalogue de produits ou du service de traitement des paiements, permettant à chacun d'évoluer et de se mettre à l'échelle de manière autonome.

Ces entreprises illustrent que, bien que commencer par un monolithe puisse être efficace, une croissance soutenue et des besoins métier évolutifs poussent souvent les systèmes vers une approche plus distribuée, basée sur les microservices, pour surmonter les limitations d'un système étroitement couplé.

---

## Conclusion

Comprendre les différences fondamentales entre les architectures monolithiques et microservices, ainsi que leurs compromis respectifs, est essentiel pour tout développeur web moderne. Cette leçon a couvert les caractéristiques principales, les avantages et les inconvénients de chacune, en utilisant l'application touristique comme exemple fil rouge. Nous avons exploré comment des facteurs comme la scalabilité, l'agilité de développement, la structure d'équipe et la tolérance aux pannes jouent un rôle crucial dans les décisions architecturales.

Dans les prochaines leçons, nous plongerons plus profondément dans la construction de notre application touristique fullstack basée sur les microservices. Le **Module 2** se concentrera sur la conception et l'implémentation de microservices principaux comme le Catalogue de Visites et la Gestion de Réservation, en introduisant des concepts tels que le Domain-Driven Design et des implémentations d'API spécifiques. Cette compréhension fondamentale des styles architecturaux sera critique lorsque nous commencerons à concevoir et construire les services de notre application, en faisant des choix conscients concernant leurs limites et leurs interactions.

---

## Navigation

- **⬅️ Précédent** : [Leçon 1.5 - Introduction à l'architecture microservices](lecon-5-microservices-intro.md)
- **➡️ Suivant** : [Module 2 - Leçon 2.1 : Domain-Driven Design](../module-2/lecon-1-domain-driven-design-bounded-contexts.md)
- **🏠 Retour** : [Sommaire du Module 1](README.md)

---

🎉 **Félicitations !** Vous avez terminé le **Module 1 : Fondements du Développement Web Moderne et des Microservices**.

Vous êtes maintenant prêt à passer à l'implémentation concrète des microservices.

**Module complété** ✅
