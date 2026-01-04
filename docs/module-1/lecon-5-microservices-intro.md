# Leçon 1.5 - Introduction à l'architecture microservices et ses avantages

**Module 1** : Fondements du Développement Web Moderne et des Microservices

---

## Objectifs pédagogiques

- Comprendre les principes fondamentaux de l'architecture microservices
- Identifier les caractéristiques clés qui distinguent les microservices des monolithes
- Reconnaître les avantages et les cas d'utilisation appropriés pour les microservices
- Appliquer les concepts à notre application de réservation touristique

## Prérequis

- [Leçon 1.1 : Introduction à l'étude de cas](lecon-1-introduction-etude-de-cas.md)
- [Leçon 1.2 : Fondamentaux de React](lecon-2-react-fundamentals.md)
- [Leçon 1.3 : Configuration de l'environnement](lecon-3-setup-environnement.md)
- [Leçon 1.4 : Principes de Design d'API RESTful](lecon-4-restful-api-design.md)

## Durée estimée

1 heure 30 minutes

---

## Introduction

Cette leçon présente l'architecture microservices en profondeur, en explorant ses principes clés, ses caractéristiques et les avantages qu'elle offre par rapport aux architectures monolithiques. Nous examinerons des exemples concrets d'entreprises qui utilisent les microservices avec succès et nous décrirons comment notre application de réservation touristique peut bénéficier de cette approche.

---

## Comprendre l'architecture microservices

L'architecture microservices est un style architectural qui structure une application comme une collection de **services faiblement couplés** qui implémentent des capacités métier spécifiques. Chaque service est petit, autonome et peut être développé, déployé et mis à l'échelle de manière indépendante.

Considérez les microservices comme une équipe spécialisée de professionnels travaillant dans une grande organisation. Chaque personne (ou service) a un rôle et une responsabilité spécifiques — un s'occupe de la comptabilité, un autre du marketing, un autre du service client, etc. Ils travaillent de manière indépendante mais collaborent via des interfaces bien définies (réunions, emails, systèmes partagés) pour atteindre les objectifs de l'organisation.

---

## Caractéristiques clés des microservices

### 1. Composantisation via services

Dans une architecture microservices, les composants sont créés sous forme de services indépendants qui communiquent via des protocoles réseau (généralement HTTP/REST ou messagerie). Contrairement aux bibliothèques (liées dans un processus), les services sont déployés indépendamment.

**Exemple pratique** : Dans notre application de réservation touristique, le service de catalogue de visites peut être mis à jour pour ajouter de nouveaux champs (par exemple, options d'accessibilité) sans nécessiter le redéploiement du service de réservation.

### 2. Organisés autour des capacités métier

Les microservices sont organisés autour des capacités métier, et non des couches techniques. Chaque service encapsule toute la pile nécessaire pour une fonction métier spécifique : interface utilisateur, logique métier et stockage de données.

**Exemple dans notre application** :

- **Service de catalogue de visites** : Gère tout ce qui concerne les visites (création, mise à jour, recherche, récupération). Il possède sa propre base de données contenant des informations sur les visites.
- **Service de réservation** : Traite toutes les opérations liées aux réservations (création de réservations, vérification de disponibilité, annulations).
- **Service utilisateur** : Gère l'authentification, les profils et les préférences des utilisateurs.

Cette organisation reflète les domaines métier réels, permettant aux équipes de se concentrer sur des problèmes métier spécifiques.

### 3. Gouvernance décentralisée

Les équipes de microservices ont la liberté de choisir les meilleurs outils et technologies pour leur service spécifique. Si un service bénéficie d'une base de données NoSQL, il peut en utiliser une, tandis qu'un autre pourrait utiliser PostgreSQL.

**Application réelle** : Netflix utilise diverses technologies à travers ses microservices. Certains services utilisent Cassandra pour le stockage de données, d'autres utilisent MySQL ou des bases de données en mémoire selon les besoins spécifiques du service.

**Dans notre application (bien que nous restions principalement sur Node.js et PostgreSQL pour la cohérence)** : Le service de notification pourrait théoriquement utiliser une file d'attente Redis pour un traitement rapide des messages, tandis que le service de catalogue utilise PostgreSQL pour des requêtes complexes.

### 4. Gestion décentralisée des données

Chaque microservice gère sa propre base de données. Cette approche garantit un couplage lâche — les services ne partagent pas de schémas de base de données, éliminant les dépendances serrées.

**Exemple dans notre application** :

- Le service de catalogue de visites a sa base de données `tour_catalog_db`.
- Le service de réservation a sa base de données `booking_db`.
- Le service utilisateur a sa base de données `user_db`.

Si le service de réservation doit afficher les détails d'une visite, il appelle l'API du service de catalogue de visites plutôt que d'interroger directement sa base de données.

**Scénario hypothétique** : Si vous devez mettre à jour le schéma de la base de données du service de catalogue de visites (par exemple, ajouter un champ `virtual_tour_link`), les autres services ne sont pas affectés. Le service de catalogue de visites expose simplement une API mise à jour, et les autres services peuvent choisir d'utiliser ces nouvelles données ou non.

### 5. Déploiement indépendant

Les microservices peuvent être déployés indépendamment sans nécessiter le redéploiement de l'ensemble de l'application. Cela permet des cycles de mise à jour plus rapides et réduit le risque lié aux déploiements.

**Exemple pratique** : Imaginez que vous devez corriger un bug critique dans le service de paiement de l'application de réservation touristique. Avec les microservices, vous pouvez déployer la correction uniquement pour le service de paiement. Les services de catalogue de visites, de réservation et utilisateur continuent de fonctionner sans interruption.

**Application réelle** : Amazon déploie du code toutes les 11,6 secondes en moyenne, selon des rapports. Cette vitesse est possible car les équipes peuvent déployer leurs microservices individuels de manière indépendante.

---

## Avantages de l'architecture microservices

### 1. Évolutivité

Les microservices permettent une mise à l'échelle granulaire. Vous pouvez faire évoluer uniquement les services qui en ont besoin, plutôt que toute l'application.

**Exemple dans notre application** : Pendant la haute saison touristique (par exemple, vacances d'été), le service de réservation peut connaître une forte charge. Vous pouvez faire évoluer uniquement le service de réservation (ajouter plus d'instances de serveur) tout en laissant les autres services fonctionner avec leurs ressources actuelles.

**Application réelle** : Uber met à l'échelle son service de mise en correspondance des chauffeurs de manière indépendante pendant les heures de pointe sans faire évoluer inutilement d'autres services comme la gestion des profils utilisateurs.

### 2. Résilience

Dans une architecture microservices, une défaillance dans un service est moins susceptible de faire tomber l'ensemble du système. Les services peuvent être conçus pour se dégrader gracieusement.

**Scénario hypothétique** : Si le service de notification de votre application tombe en panne, les utilisateurs peuvent toujours rechercher des visites, effectuer des réservations et traiter les paiements. Ils ne recevront tout simplement pas d'emails de confirmation jusqu'à ce que le service de notification soit rétabli. L'ensemble de l'application ne devient pas inutilisable.

**Application réelle** : Netflix a conçu ses microservices pour être résilients. Si un service de recommandation tombe en panne, les utilisateurs peuvent toujours regarder du contenu ; ils verront simplement des recommandations par défaut ou des contenus populaires au lieu de recommandations personnalisées.

### 3. Diversité technologique

Les équipes peuvent choisir la meilleure technologie pour chaque service plutôt que d'être enfermées dans une pile technologique unique pour l'ensemble de l'application.

**Exemple pratique** : Bien que nous utilisions principalement Node.js et Express, vous pourriez choisir d'implémenter un service d'analyse de données gourmand en calculs en Python avec des bibliothèques de machine learning, tandis que vos autres services restent en Node.js.

**Application réelle** : Les microservices de Twitter sont écrits dans plusieurs langages — certains en Scala, d'autres en Java, et d'autres en Ruby — selon ce qui convient le mieux à chaque service.

### 4. Développement et déploiement indépendants

Différentes équipes peuvent travailler sur différents services simultanément sans interférer les unes avec les autres. Cela accélère les cycles de développement.

**Scénario hypothétique** : Votre équipe de catalogue de visites peut travailler sur l'ajout d'une nouvelle fonctionnalité de filtrage avancé, tandis que votre équipe de paiement se concentre sur l'intégration d'une nouvelle passerelle de paiement. Elles se déploient toutes deux indépendamment sans se gêner.

### 5. Facilité de compréhension et de maintenance

Étant donné que chaque microservice est petit et ciblé, il est plus facile pour les développeurs de comprendre et de maintenir un service individuel.

**Exemple pratique** : Un nouveau développeur rejoignant le projet peut commencer à travailler sur le service de catalogue de visites sans avoir à comprendre toute la complexité du service de paiement ou du moteur de réservation.

---

## Exemples concrets de microservices

### Netflix

Netflix est l'un des pionniers de l'architecture microservices. Ils sont passés d'une architecture monolithique à des centaines de microservices.

**Services clés** :

- **Service de recommandation** : Recommande du contenu en fonction de l'historique de visionnage
- **Service de streaming vidéo** : Gère la livraison de contenu vidéo
- **Service de facturation** : Traite les abonnements et les paiements
- **Service d'authentification** : Gère la connexion et l'authentification des utilisateurs

**Résultat** : Netflix peut diffuser du contenu à plus de 200 millions d'abonnés dans le monde avec une disponibilité et une fiabilité exceptionnelles.

### Amazon

Amazon a été l'un des premiers à adopter les microservices et attribue à cette architecture sa capacité à évoluer et à innover rapidement.

**Services clés** :

- **Service de catalogue de produits** : Gère les listes de produits
- **Service de panier d'achat** : Gère les paniers d'achat des utilisateurs
- **Service de traitement des commandes** : Gère l'exécution des commandes
- **Service de recommandation** : Fournit des recommandations de produits

### Uber

Uber utilise une architecture microservices pour gérer sa plateforme de covoiturage massive.

**Services clés** :

- **Service de mise en correspondance** : Met en relation les passagers avec les chauffeurs
- **Service de tarification** : Calcule les tarifs de course
- **Service de cartographie** : Fournit des informations de navigation et de carte
- **Service de paiement** : Traite les paiements
- **Service de notification** : Envoie des notifications aux passagers et chauffeurs

**Impact** : L'architecture microservices d'Uber lui permet de gérer des millions de courses par jour dans des centaines de villes à travers le monde.

---

## Application à notre application de réservation touristique

Appliquons maintenant les concepts de microservices à notre application de réservation touristique :

### Microservices de notre application

1. **Service de catalogue de visites**

   - Gère les données de visites (créer, lire, mettre à jour, supprimer des visites)
   - Fournit des fonctionnalités de recherche et de filtrage
   - Base de données : `tour_catalog_db`

2. **Service de réservation**

   - Gère les processus de réservation
   - Vérifie la disponibilité
   - Traite les annulations et modifications
   - Base de données : `booking_db`

3. **Service utilisateur**

   - Gère l'authentification des utilisateurs (inscription, connexion)
   - Stocke les profils utilisateurs
   - Base de données : `user_db`

4. **Service de paiement**

   - S'intègre avec des passerelles de paiement tierces (par exemple, Stripe)
   - Traite les transactions de paiement
   - Gère les états de paiement

5. **Service de notification** (modules ultérieurs)

   - Envoie des emails, SMS et notifications push
   - Traite les confirmations de réservation et les rappels

6. **API Gateway** (modules ultérieurs)
   - Point d'entrée unique pour toutes les demandes des clients
   - Achemine les demandes vers les microservices appropriés
   - Gère les préoccupations transversales (authentification, limitation de débit)

### Scénario : Flux de réservation d'une visite

Imaginons un utilisateur réservant une visite. Voici comment les microservices interagiraient :

1. **L'utilisateur recherche des visites** → L'application frontend appelle le **service de catalogue de visites** pour obtenir les visites disponibles.
2. **L'utilisateur sélectionne une visite et démarre la réservation** → Le frontend appelle le **service de réservation** pour vérifier la disponibilité et créer une réservation provisoire.
3. **L'utilisateur saisit les informations de paiement** → Le frontend appelle le **service de paiement** pour traiter la transaction.
4. **Le paiement réussit** → Le service de paiement notifie le **service de réservation** pour confirmer la réservation.
5. **La réservation est confirmée** → Le service de réservation déclenche le **service de notification** pour envoyer un email de confirmation à l'utilisateur.

Chacune de ces étapes implique un microservice différent, chacun effectuant sa responsabilité spécifique de manière indépendante.

---

## Défis des microservices (aperçu bref)

Bien que les microservices offrent de nombreux avantages, ils introduisent également de la complexité :

- **Complexité de communication** : Les services doivent communiquer sur le réseau, introduisant une latence et des problèmes de réseau potentiels.
- **Cohérence des données** : Maintenir la cohérence des données à travers plusieurs services et bases de données peut être difficile.
- **Surveillance et débogage** : Tracer les requêtes à travers plusieurs services est plus complexe que dans un monolithe.
- **Surcharge de déploiement** : Gérer le déploiement de dizaines ou de centaines de services nécessite une automatisation et une orchestration robustes.

Nous aborderons ces défis et leurs solutions dans les modules ultérieurs.

---

## Exercices

### 1. Identification des microservices

Pour chacune des fonctionnalités de l'application de réservation touristique ci-dessous, identifiez quel(s) microservice(s) serai(en)t responsable(s) de sa gestion :

**Fonctionnalités** :

a) Permettre aux utilisateurs de laisser des avis et des notes sur une visite
b) Envoyer un rappel par email à un utilisateur 24 heures avant sa visite programmée
c) Calculer le prix total d'une réservation incluant les taxes et les remises
d) Afficher une liste de toutes les visites disponibles à Paris

**Pour chaque fonctionnalité, indiquez** :

- Le microservice principal responsable
- Tout microservice supplémentaire qui pourrait être impliqué
- Comment ces services communiqueraient

### 2. Scénario de résilience

Imaginez que le **service de paiement** de votre application de réservation touristique tombe en panne temporairement en raison d'un problème avec votre fournisseur de passerelle de paiement tiers.

**Questions** :

a) Quelles parties de l'application continueraient de fonctionner normalement ?
b) Quelles fonctionnalités seraient affectées ?
c) Comment pourriez-vous concevoir le système pour gérer cette défaillance gracieusement ? (Indice : pensez aux files d'attente de messages, aux mécanismes de nouvelle tentative ou aux pages d'erreur conviviales)

### 3. Stratégie de mise à l'échelle

Votre application de réservation touristique connaît les modèles d'utilisation suivants :

- Le **service de catalogue de visites** reçoit beaucoup de trafic de lecture (navigation) mais peu d'opérations d'écriture
- Le **service de réservation** connaît des pics de trafic pendant les heures de bureau (9h-17h) et les week-ends
- Le **service utilisateur** a un trafic relativement stable tout au long de la journée

**Tâches** :

a) Expliquez comment vous mettriez à l'échelle chaque service différemment en fonction de son modèle d'utilisation.
b) Quels seraient les avantages d'une mise à l'échelle indépendante par rapport à la mise à l'échelle de l'ensemble de l'application comme un monolithe ?
c) Quels mécanismes de mise à l'échelle (mise à l'échelle horizontale, mise à l'échelle verticale, mise à l'échelle automatique) utiliseriez-vous pour chaque service ?

---

## Prochaines étapes

Dans cette leçon, vous avez découvert les concepts fondamentaux de l'architecture microservices, ses caractéristiques clés et les avantages significatifs qu'elle offre. Nous avons exploré des exemples concrets d'entreprises de premier plan utilisant les microservices et avons commencé à voir comment notre application de réservation touristique peut être structurée en utilisant cette approche.

La prochaine leçon approfondira la **comparaison entre architecture monolithique et microservices**, vous aidant à comprendre quand utiliser chaque approche et comment migrer d'un monolithe vers des microservices.

---

## Navigation

- **⬅️ Précédent** : [Leçon 1.4 - Principes de Design d'API RESTful](lecon-4-restful-api-design.md)
- **➡️ Suivant** : [Leçon 1.6 - Monolithe vs Microservices](lecon-6-monolithe-vs-microservices.md)
- **🏠 Retour** : [Sommaire du Module 1](README.md)

---

**Leçon complétée** ✅
