# Solutions - Leçon 1.1 : Introduction à l'étude de cas

**Module 1** : Fondements du Développement Web Moderne et des Microservices

---

## Exercice 1 : Brainstorming de fonctionnalités

**Objectif** : Identifier trois fonctionnalités supplémentaires pour améliorer l'expérience utilisateur de l'application de réservation touristique.

### Solutions proposées

#### Fonctionnalité 1 : Système d'avis et de notations avec photos

**Objectif** : Permettre aux utilisateurs de partager leurs expériences authentiques avec photos et commentaires détaillés.

**Bénéfices utilisateurs** :
- **Transparence** : Les futurs clients peuvent voir des retours réels et des photos prises par d'autres voyageurs
- **Confiance accrue** : Les avis vérifiés (uniquement de clients ayant réellement effectué la visite) augmentent la crédibilité
- **Aide à la décision** : Les utilisateurs peuvent mieux évaluer si une visite correspond à leurs attentes

**Implémentation microservice** : Un microservice `Review Service` dédié qui :
- Stocke les avis, notes et photos
- Vérifie que seuls les utilisateurs ayant réservé peuvent laisser un avis
- Calcule les notes moyennes
- Gère la modération des contenus

---

#### Fonctionnalité 2 : Recommandations personnalisées basées sur l'IA

**Objectif** : Suggérer des visites personnalisées basées sur l'historique, les préférences et le comportement de navigation de l'utilisateur.

**Bénéfices utilisateurs** :
- **Gain de temps** : Les utilisateurs découvrent rapidement des visites qui correspondent à leurs intérêts
- **Découverte** : Exposition à des visites qu'ils n'auraient peut-être pas trouvées par eux-mêmes
- **Expérience personnalisée** : Chaque utilisateur voit des recommandations adaptées à son profil

**Implémentation microservice** : Un microservice `Recommendation Service` qui :
- Analyse l'historique de réservation et de navigation
- Utilise des algorithmes de machine learning (collaborative filtering, content-based filtering)
- S'intègre avec le Tour Catalog Service pour récupérer les détails des visites
- Peut être implémenté en Python pour exploiter les bibliothèques ML (scikit-learn, TensorFlow)

---

#### Fonctionnalité 3 : Wishlist et partage sur les réseaux sociaux

**Objectif** : Permettre aux utilisateurs de sauvegarder des visites favorites et de partager leurs découvertes avec leurs amis.

**Bénéfices utilisateurs** :
- **Organisation** : Les utilisateurs peuvent créer des listes de visites qu'ils souhaitent faire
- **Planification collaborative** : Partager des wishlists avec famille/amis pour planifier ensemble
- **Marketing viral** : Le partage social génère de la visibilité organique pour la plateforme
- **Notifications** : Alertes lorsque les visites en wishlist ont des promotions

**Implémentation microservice** : Un microservice `Wishlist Service` qui :
- Stocke les listes de favoris par utilisateur
- Permet le partage via liens publics ou intégration sociale (Facebook, Twitter, Instagram)
- Gère les notifications de prix et disponibilité
- Peut intégrer avec le Notification Service pour les alertes

---

## Exercice 2 : Identification des microservices

**Objectif** : Identifier un microservice supplémentaire bénéfique pour l'application.

### Solution proposée : Notification Service

#### Responsabilité principale

Le **Notification Service** est responsable de toutes les communications sortantes avec les utilisateurs à travers différents canaux :

**Fonctionnalités** :
- Envoi d'emails (confirmations, rappels, promotions)
- Notifications SMS (confirmations urgentes, rappels de visite)
- Notifications push (sur l'application mobile)
- Gestion des templates de messages
- Suivi de l'état de livraison des notifications
- Gestion des préférences de notification par utilisateur

#### Interactions avec les autres services

**1. Avec le Booking Service** :
```
Booking Service → Notification Service
Événement : "Réservation confirmée"
Action : Envoyer email de confirmation avec détails de la réservation
```

**2. Avec le Payment Service** :
```
Payment Service → Notification Service
Événement : "Paiement réussi" ou "Paiement échoué"
Action : Notifier l'utilisateur du statut du paiement
```

**3. Avec le User Service** :
```
User Service → Notification Service
Événement : "Nouveau compte créé"
Action : Envoyer email de bienvenue et vérification
```

**4. Avec le Tour Catalog Service** :
```
Tour Catalog Service → Notification Service
Événement : "Nouvelle visite ajoutée dans une destination favorite"
Action : Notifier les utilisateurs intéressés par cette destination
```

#### Avantages de ce microservice

**Isolation des préoccupations** :
- La logique de notification est séparée de la logique métier
- Changements dans les fournisseurs d'email (SendGrid, Mailgun) n'affectent qu'un seul service

**Résilience** :
- Si le service de notification tombe, les réservations continuent de fonctionner
- Les notifications peuvent être mises en file d'attente et réessayées

**Scalabilité** :
- Peut être mis à l'échelle indépendamment pendant les périodes de forte activité (promotions massives)

**Flexibilité technologique** :
- Peut utiliser des systèmes de file d'attente spécialisés (RabbitMQ, Apache Kafka) pour gérer les volumes élevés

#### Pattern de communication

**Communication asynchrone via message queue** :
```
[Booking Service] --publish--> [Message Queue] --consume--> [Notification Service]
```

Avantage : Le Booking Service n'attend pas que l'email soit envoyé, améliorant la performance.

---

## Exercice 3 : Scénario monolithe vs. microservices

**Contexte** : Petit opérateur touristique local passant de la gestion manuelle à un système en ligne.

### Partie A : Avantages initiaux d'une application monolithique

#### 1. Rapidité de développement et mise sur le marché

**Explication** :
- Pour un petit opérateur avec des ressources limitées, une application monolithique permet de démarrer rapidement
- Tout le code est dans un seul projet, facilitant le développement initial
- Pas besoin de gérer la complexité de la communication inter-services

**Exemple concret** :
```
Structure monolithique simple :
/tourism-app
  ├── /routes
  │   ├── tours.js      (GET /tours, POST /tours)
  │   ├── bookings.js   (POST /bookings)
  │   └── users.js      (POST /register, POST /login)
  ├── /models
  │   ├── Tour.js
  │   ├── Booking.js
  │   └── User.js
  └── server.js (serveur Express unique)
```

**Résultat** : L'opérateur peut avoir une application fonctionnelle en quelques semaines.

---

#### 2. Coûts d'infrastructure et d'exploitation réduits

**Explication** :
- Un seul serveur à déployer et maintenir
- Une seule base de données à gérer
- Pas besoin d'expertise DevOps avancée (Kubernetes, Docker orchestration)
- Monitoring et logging simplifiés

**Exemple concret** :
- **Infrastructure monolithe** : 1 serveur VPS ($20/mois) + 1 base de données PostgreSQL ($10/mois) = $30/mois
- **Infrastructure microservices** : 4-5 services conteneurisés + orchestration + load balancer = $150-300/mois minimum

**Pour un petit opérateur démarrant** : L'économie est significative et la simplicité permet à une seule personne de gérer le système.

---

#### 3. Débogage et tests plus simples

**Explication** :
- Tout le code est dans un seul processus, facilitant le débogage
- Tests end-to-end simples (pas de mocking de services distants)
- Traçage des erreurs dans une seule application

**Exemple concret** :
```javascript
// Dans un monolithe, un flux de réservation peut être débogué en une seule session
function processBooking(userId, tourId, date) {
  const tour = getTourById(tourId);        // Appel fonction locale
  const user = getUserById(userId);        // Appel fonction locale
  const booking = createBooking(user, tour, date);  // Appel fonction locale
  processPayment(booking);                 // Appel fonction locale
  sendConfirmation(user.email, booking);   // Appel fonction locale
  return booking;
}
// Breakpoints faciles, stack trace complet, pas de latence réseau
```

---

### Partie B : Défis spécifiques avec la croissance menant aux microservices

#### Défi 1 : Scalabilité géographique et charge inégale

**Scénario** :
L'opérateur qui démarrait avec des visites à Lyon connaît le succès et s'étend à Paris, Nice, Bordeaux, Marseille, puis à l'international (Londres, Barcelone, Rome).

**Problème avec le monolithe** :

**Charge inégale entre fonctionnalités** :
- La recherche de visites (Tour Catalog) reçoit **10 000 requêtes/heure**
- Les réservations (Booking) reçoivent **500 requêtes/heure**
- La gestion des profils utilisateurs reçoit **100 requêtes/heure**

Avec un monolithe :
```
Option 1 : Scaler toute l'application (inefficace)
- Déployer 10 instances complètes de l'application
- Chaque instance contient Tour Catalog + Booking + User Service
- Gaspillage : 90% des ressources des instances servent uniquement Tour Catalog

Option 2 : Ne pas scaler (performance dégradée)
- L'application ralentit pour tous les utilisateurs
- Les réservations deviennent lentes même si la charge vient de la recherche
```

**Solution microservices** :
```
- 10 instances de Tour Catalog Service (forte charge)
- 2 instances de Booking Service (charge moyenne)
- 1 instance de User Service (faible charge)
→ Utilisation optimale des ressources, coût réduit
```

**Exemple concret chiffré** :
- **Monolithe** : 10 serveurs × 8GB RAM × $50/mois = **$500/mois**
- **Microservices** : (10×2GB + 2×4GB + 1×2GB) × $10/GB = **$300/mois** + meilleure performance

---

#### Défi 2 : Déploiements risqués et temps d'arrêt

**Scénario** :
L'équipe veut ajouter une nouvelle fonctionnalité "filtrage par accessibilité" dans le Tour Catalog, mais il y a un bug critique à corriger dans le Payment Service.

**Problème avec le monolithe** :

**Déploiement tout-ou-rien** :
```
Version actuelle : v1.5 (stable)
↓
Développement en parallèle :
- Feature : Filtrage accessibilité (prêt)
- Bugfix : Correction paiement (urgent, prêt)
- Feature : Nouveau tableau de bord utilisateur (en cours, pas prêt)
↓
Décision impossible :
1. Déployer v1.6 avec tout → RISQUE : tableau de bord pas terminé
2. Attendre que tout soit prêt → PROBLÈME : bug paiement non corrigé
3. Déployer seulement certaines features → IMPOSSIBLE avec monolithe
```

**Impact business** :
- Pendant 3 jours, le bug de paiement fait perdre des réservations
- La fonctionnalité d'accessibilité prête ne peut pas être déployée
- L'équipe est bloquée et frustrée

**Solution microservices** :
```
Tour Catalog Service v2.1 (filtrage accessibilité) → Déployer immédiatement
Payment Service v1.3.1 (bugfix) → Déployer immédiatement
User Service v1.5 (tableau de bord) → Continuer développement, déployer quand prêt

Résultat :
- Zéro impact entre services
- Déploiements indépendants
- Pas d'attente, pas de blocage
```

**Exemple concret d'incident** :
```
Monolithe : Déploiement v1.6
├── 14h00 : Déploiement commence
├── 14h15 : Application redémarre
├── 14h20 : Bug détecté dans nouvelle feature
├── 14h25 : Rollback complet vers v1.5
├── 14h40 : Application stable à nouveau
└── Impact : 40 minutes d'interruption totale
    → Perte estimée : 20 réservations = 24 000€

Microservices : Déploiement Payment Service v1.3.1
├── 14h00 : Déploiement Payment Service uniquement
├── 14h02 : Rolling update (zéro downtime)
├── 14h05 : Vérification OK
└── Impact : 0 minute d'interruption
    → Perte : 0€
```

---

#### Défi bonus : Diversité technologique et innovation

**Scénario** :
L'opérateur veut ajouter un système de recommandation intelligent basé sur le machine learning.

**Problème avec le monolithe** :
- L'application est écrite en Node.js
- Les meilleures bibliothèques ML sont en Python (TensorFlow, scikit-learn)
- Options limitées :
  1. Réécrire tout en Python → Coût prohibitif
  2. Utiliser des bibliothèques Node.js ML moins performantes → Résultats médiocres
  3. Créer un processus Python séparé appelé depuis Node.js → Architecture bancale

**Solution microservices** :
```
Recommendation Service (nouveau, Python + TensorFlow)
↓ API REST
Tour Catalog Service (existant, Node.js)
User Service (existant, Node.js)
```

Chaque service utilise la meilleure technologie pour sa fonction spécifique.

---

## Conclusion des exercices

Ces exercices démontrent que :

1. **Les monolithes sont excellents pour démarrer** : Rapidité, simplicité, coût réduit
2. **La croissance révèle les limites** : Scalabilité, déploiements, innovation technologique
3. **Les microservices résolvent ces limitations** : Au prix d'une complexité opérationnelle accrue

**Règle d'or** : Commencez monolithe, migrez vers microservices quand la complexité et l'échelle le justifient.

---

**Retour à la leçon** : [Leçon 1.1 - Introduction à l'étude de cas](../lecon-1-introduction-etude-de-cas.md)

**Prochains exercices** : [Leçon 1.3 - Setup environnement](lecon-1.3-solutions.md)
