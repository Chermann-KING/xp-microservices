# Leçon 1.1 - Introduction à l'étude de cas de l'application de réservation touristique

**Module 1** : Fondements du Développement Web Moderne et des Microservices

---

## Vue d'ensemble

Cette leçon présente une étude de cas complète : une **application de réservation touristique**. Cette application servira d'exemple principal tout au long du cours, illustrant comment construire un système fullstack basé sur les microservices en utilisant React pour le frontend et Node.js avec Express pour le backend, tout en respectant les principes SOLID.

L'étude de cas comprend diverses fonctionnalités typiques d'une plateforme de voyage moderne, de la recherche et réservation de tours à la gestion des paiements et des profils utilisateurs.

---

## Comprendre l'application de réservation touristique

L'application de réservation touristique vise à offrir une expérience fluide aux utilisateurs souhaitant découvrir et réserver des expériences de voyage. Cela permettra aux utilisateurs de parcourir différentes visites, de consulter les détails, de vérifier la disponibilité, de réserver et de gérer leurs réservations. Les voyagistes disposeront également d'un moyen de lister et de gérer leurs offres.

---

## Exigences fonctionnelles clés

### 1. Recherche et découverte de visites

**Fonctionnalités** :

- Les utilisateurs peuvent rechercher des visites en fonction de la destination, des dates, des types d'activités et de la fourchette de prix
- Affichez un catalogue des visites disponibles avec les informations essentielles (titre, prix, durée, note)
- Fournissez des pages détaillées des visites incluant itinéraires, inclusions/exclusions, photos et avis

**Exemple** : Un utilisateur recherche "Tours culinaires à Paris en octobre". Le système affiche une liste de visites, chacune avec une brève description, un prix et une note des clients. Cliquer sur une visite spécifique permet d'obtenir un itinéraire jour par jour, un point de rendez-vous et ce qui est inclus dans le prix.

**Scénario hypothétique** : Imaginez une nouvelle fonctionnalité où les utilisateurs peuvent filtrer les visites en fonction de besoins spécifiques d'accessibilité (par exemple, accessibilité en fauteuil roulant, interprète de langue des signes). Cela nécessiterait des points de données supplémentaires pour chaque tournée et un mécanisme pour filtrer les résultats en conséquence.

### 2. Réservation et gestion des réservations

**Fonctionnalités** :

- Les utilisateurs peuvent sélectionner des dates et des quantités spécifiques pour une visite
- Traiter les réservations, y compris recueillir les informations utilisateur et les détails de paiement
- Confirmez les réservations et envoyez les notifications
- Les utilisateurs peuvent consulter leurs réservations à venir et passées
- Les utilisateurs peuvent annuler ou modifier les réservations existantes (sous réserve des politiques d'annulation)

**Exemple** : Un utilisateur choisit une "Visite en hélicoptère du Grand Canyon" pour deux personnes à une date précise. Ils accèdent à une page de paiement où ils saisissent les coordonnées du passager et les informations de carte bancaire. En cas de paiement réussi, ils reçoivent un e-mail de confirmation de réservation avec un identifiant de réservation unique et des instructions.

**Application réelle** : De nombreuses agences de voyages en ligne (OTA) comme Expedia ou Booking.com proposent des flux de réservation similaires, souvent intégrés à divers voyagistes et passerelles de paiement.

### 3. Authentification utilisateur et profils

**Fonctionnalités** :

- Les utilisateurs peuvent s'inscrire, se connecter et gérer leur profil
- Sécurisez les comptes utilisateurs avec des mécanismes d'authentification appropriés
- Stockez les préférences des utilisateurs et l'historique des réservations

**Exemple** : Un utilisateur s'inscrit avec son e-mail et son mot de passe. Après s'être connecté, ils peuvent mettre à jour leur photo de profil, changer leur mot de passe et consulter toutes leurs réservations passées et futures sur un tableau de bord personnalisé.

**Application réelle** : Pratiquement tous les services en ligne, des plateformes de réseaux sociaux aux sites de commerce électronique, utilisent l'authentification des utilisateurs pour personnaliser les expériences et sécuriser les données.

### 4. Traitement des paiements

**Fonctionnalités** :

- Intégrez avec une passerelle de paiement pour traiter les paiements par carte de crédit en toute sécurité
- Gérer différents états de paiement (réussi, raté, en attente)

**Exemple** : Lors du paiement, l'utilisateur saisit ses coordonnées de carte bancaire. Ces informations sont transmises de manière sécurisée à un processeur de paiement (comme Stripe ou PayPal), qui valide la carte et traite la transaction. Le système reçoit alors un rappel indiquant le succès ou l'échec du paiement.

---

## Exigences non fonctionnelles clés

1. **Évolutivité** : L'application doit pouvoir gérer un nombre croissant d'utilisateurs et de visites sans dégradation des performances.

2. **Fiabilité** : Le système doit être très disponible et résilient aux pannes, garantissant un service continu.

3. **Sécurité** : Les données des utilisateurs et les informations de paiement doivent être protégées par des mesures de sécurité robustes.

4. **Performance** : Les pages doivent se charger rapidement et les processus de réservation doivent être réactifs.

5. **Maintenabilité** : La base de code doit être bien structurée et facile à comprendre, permettant de futures améliorations et corrections de bugs.

---

## Aperçu de l'architecture système : du monolithe aux microservices

Au départ, on pourrait envisager de construire l'application de réservation touristique comme une application monolithique unique. Dans une architecture monolithique, tous les composants — interface utilisateur, logique métier et accès aux données — sont étroitement couplés au sein d'une seule base de code et déployés comme une seule unité. Bien que plus simple à commencer pour les petits projets, cette approche peut poser des défis à mesure que l'application se développe.

### L'approche monolithique (processus de pensée initial)

**Caractéristiques** :

- **Base de code unique** : Toutes les fonctionnalités (catalogue de visites, réservation, gestion des utilisateurs, paiements) résident dans un seul référentiel
- **Unité de déploiement unique** : L'ensemble de l'application est déployé comme un seul grand service
- **Base de données partagée** : Souvent, une seule base de données remplit toutes les fonctionnalités

**Exemple pratique (Monolithe)** : Imaginez un petit tour-opérateur local construisant son premier système de réservation en ligne. Ils peuvent créer une application Node.js unique qui gère tous les itinéraires : `/tours` pour les annonces, `/reservez` pour les réservations, `/utilisateurs` pour les profils. Toutes ces fonctionnalités peuvent interagir avec une seule base de données PostgreSQL.

**Scénario hypothétique (Monolithe)** : Si ce petit tour-opérateur connaît soudainement une montée virale en popularité et que sa fonction de réservation devient extrêmement chargée, il devient difficile de ne faire évoluer que la partie réservation de l'application. Ils devraient faire évoluer toute l'application, y compris les parties moins utilisées comme le catalogue de tournée, ce qui entraînerait une utilisation inefficace des ressources.

### Transition vers les microservices (l'objectif de notre cours)

Pour une application touristique complexe et évolutive, une architecture de microservices offre des avantages significatifs. Au lieu d'une application monolithique unique, le système est divisé en un ensemble de petits services indépendants, chacun responsable d'une capacité métier spécifique.

**Caractéristiques** :

- **Services décentralisés** : Chaque fonction principale (catalogue de visites, gestion des réservations, service utilisateur, passerelle de paiement) devient un microservice indépendant
- **Déploiement indépendant** : Chaque microservice peut être développé, déployé et mis à l'échelle indépendamment
- **Diversité technologique** : Différents services peuvent utiliser différents langages de programmation ou bases de données si approprié (bien que nous restions principalement sur Node.js/Express et PostgreSQL pour la cohérence dans ce cours)
- **Résilience** : Une défaillance d'un microservice est moins susceptible de faire tomber l'ensemble du système

**Exemple pratique (microservices)** :

- Un **service de catalogue de visites** gère les données de visite (descriptions, prix, disponibilité)
- Un **service de réservation** s'occupe du processus de réservation
- Un **service utilisateur** gère l'authentification des utilisateurs et les profils
- Un **service de paiement** s'intègre avec des passerelles de paiement tierces

Ces services communiquent entre eux, généralement via des API RESTful ou des files d'attente de messages. Lorsqu'un utilisateur réserve une visite, l'interface peut appeler le Service de Catalogue des Visites pour obtenir les détails de la visite, puis le Service de réservation pour créer une réservation, et enfin le Service de Paiement pour traiter le paiement.

**Application réelle** : Des entreprises comme Netflix, Amazon et Uber s'appuient fortement sur les microservices pour gérer leurs vastes et complexes écosystèmes. Par exemple, Netflix dispose de microservices dédiés à l'authentification des utilisateurs, au streaming vidéo, aux moteurs de recommandation et à la facturation, chacun fonctionnant de manière indépendante.

Ce cours vous guidera dans cette transition, en commençant par des concepts fondamentaux et en développant progressivement l'architecture des microservices pour notre application de réservation touristique.

---

## Exercices

### 1. Brainstorming de fonctionnalités

Imaginez que vous êtes chef de produit pour cette application de réservation touristique. Énumérez **trois fonctionnalités supplémentaires** que vous pensez susceptibles d'améliorer significativement l'expérience utilisateur, au-delà de ce qui est déjà décrit. Pour chaque fonctionnalité, expliquez brièvement son objectif et comment elle bénéficierait aux utilisateurs.

### 2. Identification des microservices

En fonction des fonctionnalités principales proposées (recherche et découverte de circuits, gestion des réservations et réservations, authentification et profils utilisateurs, traitement des paiements), identifiez **un microservice potentiel supplémentaire** qui pourrait être bénéfique pour l'application touristique. Décrivez sa responsabilité principale et comment il interagirait avec les autres services.

### 3. Scénario monolithe vs. microservices

Considérez un petit opérateur touristique local qui gère actuellement les réservations manuellement par téléphone et email. Ils veulent construire un système en ligne.

**Questions** :

- Quels pourraient être les **avantages initiaux** pour eux de construire une application monolithique ?
- À mesure que leur activité se développe et qu'ils commencent à proposer des visites dans plusieurs villes à travers le monde, quels **défis spécifiques** rencontreraient-ils probablement avec cette application monolithique, les poussant à envisager une approche microservices ? Donnez au moins **deux exemples concrets**.

---

## Prochaines étapes

Cette première leçon offrait un aperçu général de l'étude de cas de la demande de réservation touristique et introduisait le changement architectural fondamental que nous allons explorer du monolithique aux microservices.

Dans les prochaines leçons, nous plongerons dans les bases du développement web moderne, en commençant par les bases de React. Cela vous dotera des compétences nécessaires pour construire l'interface interactive de notre application. Ensuite, nous mettrons en place l'environnement de développement fullstack, couvrant les outils et technologies essentiels nécessaires au développement frontend et backend, puis nous approfondirons les principes de conception d'API RESTful, essentiels pour une communication efficace des microservices.

**Prochaine leçon** : [Leçon 1.2 - React Fundamentals: Components, Props, and State Management](lecon-2-react-fundamentals.md)
