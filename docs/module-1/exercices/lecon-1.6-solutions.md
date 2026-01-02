# Solutions - Leçon 1.6 : Monolithe vs Microservices

**Module 1** : Fondements du Développement Web Moderne et des Microservices

---

## Exercice 1 : Analyse de scénario - Évolution de l'application touristique

### Contexte

L'application de réservation touristique démarre comme un monolithe et grandit pour supporter :
- Des millions d'utilisateurs
- Des centaines de visites
- Chat en temps réel
- Recommandations personnalisées (IA/ML)

---

### Défi 1 : Scalabilité inégale des composants

#### Le problème avec le monolithe

**Scénario réel** :
```
Utilisation moyenne quotidienne:
- Recherche de visites (Tour Catalog) : 1 million de requêtes/jour
- Réservations (Booking)          : 50 000 requêtes/jour
- Chat en temps réel              : 200 000 messages/jour
- Recommandations IA              : 500 000 calculs/jour
- Gestion profils (User)          : 100 000 requêtes/jour
```

**Impact sur le monolithe** :

```
┌─────────────────────────────────────────┐
│  Monolithe (une seule application)      │
│                                         │
│  ┌──────────────┐  ┌─────────────────┐ │
│  │Tour Catalog  │  │ Booking Service │ │
│  │ CPU: 85%     │  │ CPU: 30%        │ │
│  │ RAM: 6GB     │  │ RAM: 1GB        │ │
│  └──────────────┘  └─────────────────┘ │
│                                         │
│  ┌──────────────┐  ┌─────────────────┐ │
│  │ Chat Service │  │ ML Recommender  │ │
│  │ CPU: 95%     │  │ CPU: 90%        │ │
│  │ RAM: 4GB     │  │ RAM: 8GB        │ │
│  │ (WebSocket)  │  │ (Python libs)   │ │
│  └──────────────┘  └─────────────────┘ │
│                                         │
│  TOTAL : CPU 75% / RAM 19GB            │
│  → Nécessite scaler TOUTE l'app !      │
└─────────────────────────────────────────┘
```

**Problèmes** :
- Le Chat et le ML consomment beaucoup de ressources mais ne représentent que 20% du trafic
- Impossible de scaler uniquement les composants qui en ont besoin
- Gaspillage de ressources (scaler Booking qui n'en a pas besoin)

**Solution microservices** :

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│Tour Catalog  │  │Booking       │  │User Service  │
│10 instances  │  │2 instances   │  │3 instances   │
│2GB each      │  │2GB each      │  │1GB each      │
│= 20GB        │  │= 4GB         │  │= 3GB         │
└──────────────┘  └──────────────┘  └──────────────┘

┌──────────────┐  ┌──────────────┐
│Chat Service  │  │ML Recomm.    │
│5 instances   │  │3 instances   │
│4GB each      │  │8GB each      │
│= 20GB        │  │= 24GB        │
│(WebSocket)   │  │(GPU-enabled) │
└──────────────┘  └──────────────┘

TOTAL : 71GB distribuées intelligemment
vs Monolithe : 190GB (10 instances × 19GB) pour même charge
→ Économie : 63% de ressources
```

**Résultat** :
- Chaque service scale selon ses besoins spécifiques
- Chat Service peut utiliser des instances optimisées WebSocket
- ML Service peut utiliser des instances GPU pour calculs rapides
- Tour Catalog utilise des instances CPU standard avec cache

---

### Défi 2 : Déploiements risqués et bloquants

#### Le problème avec le monolithe

**Scénario** : Black Friday approche, 3 équipes travaillent en parallèle

```
Équipe Tour Catalog :
- Feature : Filtres avancés (prête)
- Feature : Réalité virtuelle preview (en développement, 40% done)

Équipe Booking :
- Bugfix CRITIQUE : Double booking (prêt, testé)
- Feature : Multi-currency (prête)

Équipe ML :
- Feature : Recommandations améliorées (prête)
- Migration vers TensorFlow 2.x (en cours, non testée)
```

**Problème avec monolithe** :

```
Options de déploiement :

Option A : Déployer tout ce qui est prêt
┌─────────────────────────────────────────┐
│ v2.5.0 : Tout déployer                  │
├─────────────────────────────────────────┤
│ ✅ Filtres avancés                       │
│ ❌ VR preview (pas fini)                │
│ ✅ Bugfix double booking                │
│ ✅ Multi-currency                        │
│ ✅ Reco améliorées                       │
│ ❌ TensorFlow migration (pas testée)    │
└─────────────────────────────────────────┘
RÉSULTAT : IMPOSSIBLE - features incomplètes

Option B : Déployer seulement le bugfix
→ IMPOSSIBLE : Code partagé, dépendances croisées
→ Ne peut pas isoler le bugfix du reste

Option C : Attendre que tout soit prêt
→ Bugfix critique non déployé pendant 2 semaines
→ Pertes business : double bookings continuent
→ Black Friday arrive avec bug non corrigé
```

**Impact business** :
- 2 semaines d'attente = 500 double bookings
- Coût support client : 500 × 2h × $30/h = $30,000
- Perte de confiance clients
- Bad reviews en ligne

**Solution microservices** :

```
Déploiements indépendants :

Jour 1 (Lundi) :
  └─ Booking Service v1.2.1
      └─ Bugfix double booking déployé
      └─ Impact : 0 autre service
      └─ Temps déploiement : 5 minutes
      └─ Rollback possible en 30 secondes

Jour 3 (Mercredi) :
  ├─ Tour Catalog Service v2.1.0
  │   └─ Filtres avancés déployés
  │   └─ VR preview : reste en v2.0.5 (pas prête)
  └─ Booking Service v1.3.0
      └─ Multi-currency déployée

Jour 5 (Vendredi) :
  └─ ML Recommender Service v3.0.0
      └─ Reco améliorées déployées
      └─ TensorFlow migration : branch séparée, continue dev

Black Friday (J+10) :
  └─ TOUT est déployé progressivement, testé en prod
  └─ Bug critique corrigé depuis J+1
  └─ Zéro risque, zéro blocage
```

**Résultat** :
- Bugfix déployé en 1 jour vs 14 jours
- Économie : $30,000 de coûts support évités
- Chaque équipe travaille à son rythme
- Déploiements fréquents = petits changements = moins de risque

---

### Défi 3 : Diversité technologique et innovation

#### Le problème avec le monolithe

**Scénario** : Nouvelles features nécessitent technologies spécialisées

```
Feature 1 : Chat en temps réel
Besoin   : WebSocket persistent connections
Meilleur choix : Node.js + Socket.io
Monolithe (Node.js) : ✅ OK mais charge tout le serveur

Feature 2 : Recommandations ML
Besoin   : Machine Learning, calculs matriciels
Meilleur choix : Python + TensorFlow/PyTorch + GPU
Monolithe (Node.js) : ❌ Librairies ML Node.js limitées

Feature 3 : Traitement paiements
Besoin   : Sécurité maximale, transactions ACID
Meilleur choix : Java + Spring Boot (enterprise-grade)
Monolithe (Node.js) : ⚠️ Possible mais moins optimal

Feature 4 : Traitement images (upload photos visites)
Besoin   : Compression, redimensionnement, watermarking
Meilleur choix : Go (performance) ou Python (PIL/Pillow)
Monolithe (Node.js) : ⚠️ Librairies moins performantes
```

**Implémentation dans le monolithe** :

```javascript
// Monolithe Node.js : Tout doit être en JavaScript

// ML Recommender (suboptimal)
const brain = require('brain.js'); // Librairie JS basique
// vs TensorFlow (Python) : 100x plus puissant

// Image Processing (suboptimal)
const sharp = require('sharp'); // OK mais moins performant
// vs Python PIL + OpenCV : Plus de features

// Paiements (OK mais verbose)
const stripe = require('stripe');
// vs Java Spring Boot : Plus robuste pour transactions

// Chat (optimal)
const io = require('socket.io'); // ✅ Parfait pour Node.js
```

**Problèmes** :
- Recommandations ML médiocres (brain.js vs TensorFlow)
- Impossible d'utiliser GPU pour calculs ML
- Image processing lent
- Équipe ML (experts Python) doit apprendre JavaScript
- Tout nouveau dev doit connaître Node.js uniquement

**Solution microservices** :

```
┌────────────────────────────────────────────────┐
│ Architecture Polyglotte                         │
├────────────────────────────────────────────────┤
│                                                 │
│  Tour Catalog Service        : Node.js         │
│  Booking Service             : Node.js         │
│  User Service                : Node.js         │
│  API Gateway                 : Node.js         │
│                                                 │
│  Chat Service                : Node.js         │
│    └─ Socket.io WebSocket    : ✅ Optimal      │
│                                                 │
│  ML Recommender Service      : Python          │
│    ├─ TensorFlow + GPU       : ✅ Optimal      │
│    ├─ Pandas, NumPy          : ✅ Data science │
│    └─ Flask API wrapper      : Interface REST  │
│                                                 │
│  Payment Service             : Java            │
│    ├─ Spring Boot            : ✅ Enterprise   │
│    ├─ Strong typing          : ✅ Sécurité     │
│    └─ JPA/Hibernate          : ✅ Transactions │
│                                                 │
│  Image Processing Service    : Go              │
│    ├─ Concurrency native     : ✅ Performance  │
│    ├─ Low memory footprint   : ✅ Efficace     │
│    └─ Fast compilation       : ✅ Deploy rapid │
│                                                 │
└────────────────────────────────────────────────┘
```

**Communication inter-services** :

```
[Frontend] → [API Gateway: Node.js]
                    ↓
    ┌───────────────┼───────────────┐
    ↓               ↓               ↓
[Node.js]     [Python ML]      [Java Pay]
    │               │               │
    └───── HTTP REST / gRPC ────────┘
```

**Résultat** :
- ML Recommender 10x plus performant (TensorFlow vs brain.js)
- Équipe ML utilise Python (leur expertise)
- Équipe Payment utilise Java (sécurité maximale)
- Image processing rapide (Go concurrency)
- Innovation facilitée : chaque équipe choisit le meilleur outil

---

## Exercice 2 : Identification des compromis

### Système de gestion des congés (50 employés)

#### Analyse du besoin

**Complexité** :
- Fonctionnalités simples et bien définies
- Peu d'évolution prévue
- Trafic faible (50 utilisateurs max)
- Pas de pic de charge
- Équipe de développement petite (1-2 devs)

#### Recommandation : **ARCHITECTURE MONOLITHIQUE**

---

### Avantages du monolithe pour ce cas

#### Avantage 1 : Simplicité et rapidité de développement

**Justification** :
- Application simple = architecture simple
- Toute la logique dans un seul projet
- Pas de complexité de communication inter-services
- Un seul déploiement

**Structure proposée** :
```
leave-management-app/
├── src/
│   ├── routes/
│   │   ├── auth.js         (login, register)
│   │   ├── leaves.js       (submit, approve)
│   │   └── dashboard.js    (RH dashboard)
│   ├── models/
│   │   ├── User.js
│   │   ├── LeaveRequest.js
│   │   └── Approval.js
│   ├── middleware/
│   │   └── auth.js
│   └── server.js
├── views/                   (si SSR)
├── package.json
└── .env

Base de données unique : PostgreSQL
Déploiement : Heroku / AWS Elastic Beanstalk (1 clic)
```

**Temps de développement** :
- Monolithe : 2-3 semaines
- Microservices : 6-8 semaines (setup infrastructure, communication, etc.)

**Coût de développement** :
- Monolithe : $10,000 (3 semaines × $50/h × 8h/j × 7j)
- Microservices : $30,000+

---

#### Avantage 2 : Coût d'infrastructure minimal

**Justification** :
- 50 employés = trafic très faible
- Un seul serveur suffit largement
- Une seule base de données
- Pas besoin d'orchestration (Kubernetes)

**Coût comparatif mensuel** :

**Monolithe** :
```
- 1 serveur VPS (2GB RAM)    : $20/mois
- PostgreSQL hébergé (1GB)   : $15/mois
- Domaine + SSL              : $2/mois
─────────────────────────────────────
TOTAL                        : $37/mois
```

**Microservices** :
```
- Auth Service (1 instance)         : $15/mois
- Leave Service (1 instance)        : $15/mois
- Dashboard Service (1 instance)    : $15/mois
- API Gateway                       : $20/mois
- PostgreSQL (3 bases séparées)     : $45/mois
- Load Balancer                     : $15/mois
- Kubernetes cluster (min)          : $50/mois
- Monitoring (Datadog/New Relic)    : $30/mois
─────────────────────────────────────
TOTAL                              : $205/mois
```

**Économie annuelle** : ($205 - $37) × 12 = **$2,016/an**

Pour une PME de 50 employés, cette économie est significative.

---

### Inconvénient du monolithe

#### Inconvénient : Évolutivité future limitée

**Scénario** : L'entreprise grandit à 500 employés

**Problèmes potentiels** :
1. **Performance** : Base de code unique devient volumineuse
2. **Nouvelles features complexes** :
   - Intégration avec systèmes RH externes (SAP, Workday)
   - Module de paie complexe
   - Analytics avancées
3. **Équipe grandit** : 5+ développeurs travaillent sur le même code
   - Risque de conflits de merge
   - Déploiements plus risqués

**Mitigation** :
```
Phase 1 (0-2 ans) : Monolithe
  └─ Développement rapide, coût minimal

Phase 2 (2-3 ans) : Si croissance > 200 employés
  └─ Évaluer migration vers microservices
      └─ Extraction progressive :
          1. Module de paie → Service indépendant
          2. Analytics → Service dédié
          3. Core leave management reste monolithe
```

**Stratégie de migration** :
- Ne pas tout migrer : seulement les parties qui en bénéficient
- "Strangler Fig Pattern" : étrangler progressivement le monolithe
- Garder les features simples dans le monolithe

---

### Conclusion pour l'exercice 2

**Pour ce système de gestion de congés (50 employés)** :

✅ **Monolithe est le bon choix** car :
1. Simplicité et rapidité de développement
2. Coût minimal (infrastructure et maintenance)
3. Équipe petite peut gérer facilement
4. Fonctionnalités stables et prévisibles

⚠️ **Anticiper** :
- Documenter bien le code pour future migration éventuelle
- Séparer les préoccupations (layers clairs)
- Utiliser des modules bien définis (préparation microservices)

**Architecture monolithe bien structurée** :
```javascript
// Structure modulaire (prête pour extraction future)
src/
├── modules/
│   ├── auth/
│   │   ├── auth.controller.js
│   │   ├── auth.service.js
│   │   └── auth.model.js
│   ├── leaves/
│   │   ├── leaves.controller.js
│   │   ├── leaves.service.js
│   │   └── leaves.model.js
│   └── dashboard/
│       ├── dashboard.controller.js
│       └── dashboard.service.js
└── shared/
    ├── database.js
    └── middleware/

// Chaque module est autonome
// Si besoin futur : extraire module → microservice
```

---

## Exercice 3 : Implications de la pile technologique

### Scénario

**Monolithe** : Node.js + PostgreSQL unique

**Microservices** :
- Auth Service : Node.js + MongoDB
- Booking Service : Java + PostgreSQL

---

### Avantage spécifique des microservices

**Optimisation technologique par cas d'usage**

**Auth Service : Node.js + MongoDB**

**Justification** :
```javascript
// Données utilisateur : Structure flexible
const user = {
  id: "user_123",
  email: "leia.organa@rebellion.com",
  password: "hashed_password",
  profile: {
    firstName: "Leia",
    lastName: "Organa",
    preferences: {
      language: "fr",
      notifications: {
        email: true,
        sms: false,
        push: true
      },
      theme: "dark"
    },
    socialLogins: {
      google: { id: "google_xyz", email: "..." },
      facebook: { id: "fb_abc", ... }
    }
  },
  sessions: [
    { token: "...", device: "iPhone", lastSeen: "..." },
    { token: "...", device: "Chrome Desktop", lastSeen: "..." }
  ]
}

// MongoDB excelle pour :
// - Structure flexible (socialLogins peut varier)
// - Schéma évolutif (ajouter fields sans migration)
// - Lectures rapides (sessions, profils)
// - Scaling horizontal facile (sharding)
```

**Booking Service : Java + PostgreSQL**

**Justification** :
```java
// Données de réservation : Forte intégrité transactionnelle
public class Booking {
    private Long id;
    private Long tourId;
    private Long userId;
    private LocalDate bookingDate;
    private Integer numberOfTravelers;
    private BigDecimal totalPrice;
    private PaymentStatus paymentStatus;
    private BookingStatus status;
}

// PostgreSQL excelle pour :
// - ACID garanti (paiement critique)
// - Joins complexes (booking + tour + user + payment)
// - Contraintes d'intégrité référentielle
// - Transactions multi-tables atomiques
```

**Exemple de transaction critique** :
```java
@Transactional
public Booking createBooking(BookingRequest request) {
    // 1. Vérifier disponibilité
    Tour tour = tourRepository.findById(request.getTourId());
    if (tour.getAvailableSeats() < request.getNumberOfTravelers()) {
        throw new NotEnoughSeatsException();
    }

    // 2. Créer réservation
    Booking booking = new Booking(request);
    bookingRepository.save(booking);

    // 3. Décrémenter disponibilité
    tour.setAvailableSeats(tour.getAvailableSeats() - request.getNumberOfTravelers());
    tourRepository.save(tour);

    // 4. Traiter paiement
    Payment payment = paymentService.process(booking);

    // TOUT réussit OU TOUT échoue (rollback)
    return booking;
}
```

Si paiement échoue → rollback complet, seats non décrémentés.

**Avec MongoDB** : Transactions multi-documents plus complexes, moins mature.

---

### Inconvénient spécifique des microservices

**Complexité de la gestion des données distribuées**

**Problème 1 : Pas de JOIN entre bases de données**

**Scénario** : Afficher l'historique de réservations avec détails utilisateur

**Monolithe (simple)** :
```sql
-- Une seule requête SQL
SELECT
    b.id,
    b.booking_date,
    b.total_price,
    u.first_name,
    u.last_name,
    u.email,
    t.name as tour_name
FROM bookings b
JOIN users u ON b.user_id = u.id
JOIN tours t ON b.tour_id = t.id
WHERE u.id = 123
ORDER BY b.booking_date DESC;

-- Résultat : 1 requête, toutes les données
```

**Microservices (complexe)** :
```javascript
// Ne PEUT PAS faire de JOIN entre MongoDB (Auth) et PostgreSQL (Booking)
// Nécessite plusieurs appels réseau

async function getUserBookingsWithDetails(userId) {
  // 1. Appel Auth Service (MongoDB) pour user
  const user = await authService.getUser(userId);
  // Latence réseau : ~50ms

  // 2. Appel Booking Service (PostgreSQL) pour bookings
  const bookings = await bookingService.getUserBookings(userId);
  // Latence réseau : ~50ms

  // 3. Pour chaque booking, récupérer tour details
  const enrichedBookings = await Promise.all(
    bookings.map(async (booking) => {
      const tour = await tourCatalogService.getTour(booking.tourId);
      // Latence réseau : ~50ms × N bookings
      return {
        ...booking,
        tourName: tour.name,
        userEmail: user.email
      };
    })
  );

  // Total latence : 50 + 50 + (50 × 10 bookings) = 600ms
  // vs Monolithe : 20ms (une seule query SQL)
  return enrichedBookings;
}
```

**Impact** :
- **Performance** : 600ms vs 20ms (30x plus lent)
- **Complexité** : Code d'agrégation dans l'application
- **Erreurs possibles** : Si un service est down, données incomplètes

---

**Problème 2 : Cohérence des données difficile**

**Scénario** : Utilisateur change son email

**Monolithe (simple)** :
```sql
BEGIN TRANSACTION;
  UPDATE users SET email = 'new@email.com' WHERE id = 123;
  -- Toutes les foreign keys sont automatiquement cohérentes
COMMIT;
```

**Microservices (complexe)** :
```javascript
// Utilisateur change email dans Auth Service (MongoDB)
async function updateEmail(userId, newEmail) {
  // 1. Update dans Auth Service
  await authService.updateUser(userId, { email: newEmail });

  // 2. Propager vers autres services
  // Booking Service a peut-être caché l'ancien email
  await bookingService.invalidateUserCache(userId);

  // 3. Publier événement pour autres services
  await eventBus.publish('user.email.updated', {
    userId,
    newEmail,
    oldEmail
  });

  // Problème : Si étape 2 ou 3 échoue ?
  // → Incohérence temporaire entre services
}

// Booking Service écoute l'événement
eventBus.subscribe('user.email.updated', async (event) => {
  // Update cache local
  cache.set(`user:${event.userId}:email`, event.newEmail);

  // Update notifications déjà envoyées ? (impossible)
});
```

**Impact** :
- **Cohérence éventuelle** au lieu de cohérence immédiate
- **Complexité** : Event sourcing, SAGA pattern nécessaires
- **Debugging difficile** : Données peuvent être temporairement incohérentes

---

**Mitigation de l'inconvénient** :

1. **API Composition Pattern** :
```javascript
// API Gateway agrège les données
app.get('/api/user-bookings/:userId', async (req, res) => {
  const [user, bookings] = await Promise.all([
    authService.getUser(req.params.userId),
    bookingService.getUserBookings(req.params.userId)
  ]);

  const tourIds = bookings.map(b => b.tourId);
  const tours = await tourCatalogService.getTours(tourIds); // Batch request

  const enriched = bookings.map(b => ({
    ...b,
    tour: tours.find(t => t.id === b.tourId),
    user: { email: user.email, name: user.name }
  }));

  res.json(enriched);
});
```

2. **Caching agressif** :
```javascript
// Cache les données fréquemment jointes
const cachedUser = await redis.get(`user:${userId}`);
if (cachedUser) return cachedUser; // Évite appel Auth Service
```

3. **Data Replication** :
```javascript
// Booking Service réplique données user essentielles
// (dénormalisation)
const booking = {
  id: 1,
  userId: 123,
  userEmail: "leia.organa@rebellion.com", // Répliqué depuis Auth Service
  tourId: 456,
  tourName: "Paris Tour" // Répliqué depuis Tour Catalog
};
// Trade-off : Cohérence éventuelle vs Performance
```

---

## Conclusion générale

Ces exercices ont démontré que le choix entre monolithe et microservices dépend fortement du contexte :

**Monolithe adapté pour** :
- Petites applications (< 100k utilisateurs)
- Équipes petites (< 5 développeurs)
- Budget limité
- Fonctionnalités stables

**Microservices adaptés pour** :
- Applications complexes à grande échelle
- Équipes multiples indépendantes
- Besoins de scalabilité différenciée
- Innovation technologique requise

**Règle d'or** : Commencer simple (monolithe), migrer vers microservices quand la complexité le justifie.

---

**🎉 Félicitations !**

Vous avez terminé tous les exercices du **Module 1 : Fondements du Développement Web Moderne et des Microservices**.

**Retour à la leçon** : [Leçon 1.6 - Monolithe vs Microservices](../lecon-6-monolithe-vs-microservices.md)

**Prochaine étape** : Implémenter le code pratique de chaque leçon du Module 1
