# Solutions - Leçon 1.5 : Introduction aux Microservices

**Module 1** : Fondements du Développement Web Moderne et des Microservices

---

## Exercice 1 : Identification des microservices

### a) Permettre aux utilisateurs de laisser des avis et notes sur une visite

**Microservice principal** : **Review Service** (Service d'Avis)

**Microservices supplémentaires impliqués** :
1. **User Service** - Vérifier l'identité de l'utilisateur
2. **Booking Service** - Vérifier que l'utilisateur a bien réservé cette visite
3. **Tour Catalog Service** - Mettre à jour la note moyenne de la visite
4. **Notification Service** - Notifier le tour-opérateur du nouvel avis

**Communication entre services** :

```
[Frontend] → POST /v1/tours/{tour-id}/reviews
          ↓
[API Gateway]
          ↓
[Review Service]
          ├─→ [User Service] GET /v1/users/{user-id} (vérifier user authentifié)
          ├─→ [Booking Service] GET /v1/bookings?user={user-id}&tour={tour-id} (vérifier réservation)
          ├─→ [Tour Catalog Service] PATCH /v1/tours/{tour-id}/rating (mettre à jour note)
          └─→ [Notification Service] POST /v1/notifications (notifier tour-opérateur)
```

**Flux détaillé** :
1. Utilisateur soumet un avis (rating + commentaire)
2. Review Service valide l'authenticité (appel User Service)
3. Review Service vérifie que l'utilisateur a réservé (appel Booking Service)
4. Review Service sauvegarde l'avis dans sa propre base de données
5. Review Service notifie Tour Catalog Service pour recalculer la moyenne
6. Review Service déclenche une notification au tour-opérateur

---

### b) Envoyer un rappel email 24h avant la visite programmée

**Microservice principal** : **Notification Service**

**Microservices supplémentaires impliqués** :
1. **Booking Service** - Fournir la liste des réservations à venir
2. **User Service** - Obtenir les emails des utilisateurs
3. **Tour Catalog Service** - Obtenir les détails de la visite (nom, heure, lieu)

**Communication entre services** :

```
[Scheduled Job / Cron] (exécuté toutes les heures)
          ↓
[Notification Service]
          ├─→ [Booking Service] GET /v1/bookings?upcoming=24h (réservations dans 24h)
          ├─→ [User Service] GET /v1/users/{user-id} (email utilisateur)
          ├─→ [Tour Catalog Service] GET /v1/tours/{tour-id} (détails visite)
          └─→ [Email Provider API] (SendGrid, Mailgun) → Envoi email
```

**Architecture asynchrone avec Message Queue** :

```
[Scheduler] → Publie événement "check-upcoming-bookings" toutes les heures
              ↓
[Message Queue: RabbitMQ/Kafka]
              ↓
[Notification Service Worker] → Consomme événements
              ├─→ Récupère réservations dans 24h
              ├─→ Pour chaque réservation:
              │     - Enrichit avec données user/tour
              │     - Génère email personnalisé
              │     - Envoie via fournisseur email
              └─→ Log résultat (succès/échec)
```

**Avantages de cette approche** :
- Résilience : Si Notification Service est down, les messages sont en queue
- Retry automatique en cas d'échec d'envoi
- Scalable : Plusieurs workers peuvent consommer la queue

---

### c) Calculer le prix total d'une réservation (taxes + remises)

**Microservice principal** : **Booking Service**

**Microservices supplémentaires impliqués** :
1. **Tour Catalog Service** - Obtenir le prix de base de la visite
2. **Pricing Service** (optionnel) - Service dédié aux règles de tarification complexes
3. **Promotion Service** (optionnel) - Vérifier les codes promo et remises applicables

**Communication entre services** :

**Option 1 : Logique dans Booking Service (simple)** :
```
[Frontend] → POST /v1/bookings/calculate-price
          ↓
[Booking Service]
          ├─→ [Tour Catalog Service] GET /v1/tours/{tour-id} (prix de base)
          ├─→ [Promotion Service] GET /v1/promotions/validate?code=SUMMER2025
          └─→ Calcul interne :
                base_price × nb_personnes
                + taxes (TVA 20%)
                - remise promo
                = prix total
```

**Option 2 : Service dédié (architecture avancée)** :
```
[Frontend] → POST /v1/pricing/calculate
          ↓
[Pricing Service] (microservice dédié au pricing)
          ├─→ [Tour Catalog Service] GET /v1/tours/{tour-id}
          ├─→ [Promotion Service] GET /v1/promotions/active?user={user-id}
          └─→ Logique complexe :
                - Prix de base selon saison (high/low season)
                - Remises early bird
                - Prix groupe (si > 5 personnes)
                - Taxes selon pays de résidence
                - Codes promo cumulables ou non
```

**Exemple de calcul** :
```javascript
// Dans Booking Service
async function calculateTotalPrice(tourId, numberOfTravelers, promoCode, userCountry) {
  // 1. Obtenir prix de base
  const tour = await tourCatalogService.getTour(tourId);
  let totalPrice = tour.price * numberOfTravelers;

  // 2. Appliquer remise promo
  if (promoCode) {
    const promo = await promotionService.validatePromo(promoCode);
    if (promo.isValid) {
      totalPrice -= (totalPrice * promo.discountPercentage / 100);
    }
  }

  // 3. Calculer taxes selon pays
  const taxRate = getTaxRateForCountry(userCountry); // 20% FR, 19% DE, etc.
  const taxes = totalPrice * taxRate;
  totalPrice += taxes;

  return {
    basePrice: tour.price * numberOfTravelers,
    discount: promo?.amount || 0,
    subtotal: totalPrice - taxes,
    taxes: taxes,
    total: totalPrice
  };
}
```

---

### d) Afficher une liste de toutes les visites disponibles à Paris

**Microservice principal** : **Tour Catalog Service**

**Microservices supplémentaires impliqués** :
- Aucun autre service nécessaire (données autonomes)
- Optionnel : **Search Service** (Elasticsearch) pour recherche avancée

**Communication** :

**Architecture simple** :
```
[Frontend] → GET /v1/tours?destination=Paris&available=true
          ↓
[API Gateway]
          ↓
[Tour Catalog Service]
          └─→ Query DB: SELECT * FROM tours WHERE destination = 'Paris' AND available = true
```

**Architecture avancée avec cache et search** :
```
[Frontend] → GET /v1/tours?destination=Paris
          ↓
[API Gateway]
          ↓
[Cache Layer: Redis]
          ├─→ HIT: Retourne résultat cached
          └─→ MISS:
                ↓
       [Tour Catalog Service]
                ├─→ [PostgreSQL] (données source)
                └─→ [Elasticsearch] (recherche full-text, filtres)
                      → Cache résultat dans Redis (TTL: 5min)
```

**Avantages du cache** :
- Requête "tours à Paris" très fréquente → cache améliore performance
- TTL court (5 min) pour données fraîches
- Réduit la charge sur la base de données

---

## Exercice 2 : Scénario de résilience

### Scénario : Payment Service tombe en panne

#### a) Parties de l'application qui continueraient de fonctionner

**✅ Services opérationnels** :

1. **Tour Catalog Service**
   - Navigation et recherche de visites
   - Consultation des détails de visites
   - Visualisation des avis

2. **User Service**
   - Connexion / Inscription
   - Gestion du profil
   - Consultation de l'historique de réservations passées

3. **Booking Service** (partiellement)
   - Consultation des réservations existantes
   - Modification de réservations sans nouveau paiement
   - Annulations (avec remboursement en attente)

4. **Review Service**
   - Laisser des avis sur des visites passées
   - Consulter les avis

**Impact utilisateur** :
- Les utilisateurs peuvent toujours parcourir le site
- Ils peuvent planifier et sauvegarder des visites favorites
- Ils peuvent consulter leurs anciennes réservations

---

#### b) Fonctionnalités affectées

**❌ Services impactés** :

1. **Nouvelle réservation avec paiement**
   - Impossible de finaliser une réservation nécessitant un paiement immédiat
   - Processus de checkout bloqué à l'étape paiement

2. **Remboursements**
   - Annulations ne peuvent pas être traitées immédiatement
   - Remboursements en attente

3. **Modifications nécessitant un paiement supplémentaire**
   - Upgrade de réservation (ex: ajouter des personnes)

**Message utilisateur** :
```
"Le service de paiement est temporairement indisponible.
Vous pouvez continuer à parcourir nos visites et nous vous
notifierons dès que les réservations seront à nouveau possibles."
```

---

#### c) Conception pour gérer la défaillance gracieusement

**Stratégies de résilience** :

#### 1. Circuit Breaker Pattern

```javascript
// Dans Booking Service
const circuitBreaker = new CircuitBreaker(paymentService.processPayment, {
  timeout: 5000,          // 5 secondes max
  errorThresholdPercentage: 50,  // 50% d'échecs
  resetTimeout: 30000     // Réessayer après 30s
});

try {
  const paymentResult = await circuitBreaker.fire(paymentData);
  // Paiement réussi
} catch (err) {
  if (circuitBreaker.isOpen()) {
    // Circuit ouvert : service down
    return handlePaymentServiceDown(bookingData);
  }
}
```

**États du Circuit Breaker** :
- **Closed** (normal) : Requêtes passent normalement
- **Open** (défaillance détectée) : Requêtes échouent immédiatement, pas d'appel au service
- **Half-Open** (test de récupération) : Quelques requêtes test passent

---

#### 2. Message Queue avec Retry

```javascript
// Booking Service publie dans une queue
async function createBooking(bookingData) {
  // 1. Créer réservation en statut PENDING
  const booking = await db.bookings.create({
    ...bookingData,
    status: 'PENDING_PAYMENT',
    paymentAttempts: 0
  });

  // 2. Publier message dans queue pour traitement paiement
  await messageQueue.publish('payments', {
    bookingId: booking.id,
    amount: booking.totalPrice,
    userId: booking.userId
  });

  return booking;
}

// Worker qui consomme la queue
messageQueue.subscribe('payments', async (message) => {
  try {
    const payment = await paymentService.processPayment(message);

    // Succès : Mettre à jour booking
    await db.bookings.update(message.bookingId, {
      status: 'CONFIRMED',
      paymentId: payment.id
    });

    // Envoyer notification
    await notificationService.sendConfirmation(message.userId);

  } catch (err) {
    // Échec : Retry avec backoff exponentiel
    const attempts = message.attempts || 0;

    if (attempts < 5) {
      // Republier avec délai
      const delay = Math.pow(2, attempts) * 1000; // 1s, 2s, 4s, 8s, 16s
      await messageQueue.publishDelayed('payments', message, delay);
    } else {
      // Après 5 tentatives : mettre en échec manuel
      await db.bookings.update(message.bookingId, {
        status: 'PAYMENT_FAILED',
        requiresManualIntervention: true
      });

      // Notifier équipe support
      await notificationService.alertSupport({
        bookingId: message.bookingId,
        error: 'Payment failed after 5 retries'
      });
    }
  }
});
```

**Avantages** :
- Réservation créée immédiatement (meilleure UX)
- Paiement traité de manière asynchrone
- Retry automatique en cas d'échec temporaire
- Aucune perte de commande

---

#### 3. Fallback : Réservation "Payer Plus Tard"

```javascript
// Option de secours quand Payment Service est down
async function handlePaymentServiceDown(bookingData) {
  // 1. Créer réservation avec statut spécial
  const booking = await db.bookings.create({
    ...bookingData,
    status: 'RESERVED_PENDING_PAYMENT',
    expiresAt: Date.now() + (24 * 60 * 60 * 1000), // Expire dans 24h
    paymentMethod: 'DEFERRED'
  });

  // 2. Envoyer email avec lien de paiement
  await notificationService.sendEmail(bookingData.userId, {
    subject: 'Votre réservation est en attente de paiement',
    template: 'pending-payment',
    data: {
      bookingId: booking.id,
      paymentLink: `https://app.com/bookings/${booking.id}/pay`,
      expiresIn: '24 heures'
    }
  });

  return {
    booking,
    message: 'Réservation créée. Vous recevrez un lien de paiement par email sous peu.'
  };
}
```

---

#### 4. Page d'erreur conviviale avec alternatives

```javascript
// Frontend
function PaymentPage({ booking }) {
  const [paymentStatus, setPaymentStatus] = useState('loading');

  useEffect(() => {
    checkPaymentServiceHealth()
      .then(() => setPaymentStatus('available'))
      .catch(() => setPaymentStatus('unavailable'));
  }, []);

  if (paymentStatus === 'unavailable') {
    return (
      <div className="payment-error">
        <h2>Service de paiement temporairement indisponible</h2>
        <p>Nous rencontrons actuellement un problème technique.</p>

        <div className="alternatives">
          <h3>Options disponibles :</h3>
          <ul>
            <li>
              <button onClick={() => saveBookingForLater(booking)}>
                💾 Sauvegarder ma réservation
              </button>
              <p>Nous vous enverrons un lien de paiement par email dès que possible</p>
            </li>
            <li>
              <button onClick={() => contactSupport(booking)}>
                📞 Contacter le support
              </button>
              <p>Notre équipe peut traiter votre réservation manuellement</p>
            </li>
            <li>
              <button onClick={() => retryLater()}>
                🔄 Réessayer plus tard
              </button>
            </li>
          </ul>
        </div>
      </div>
    );
  }

  return <PaymentForm booking={booking} />;
}
```

---

#### 5. Monitoring et alertes

```javascript
// Health Check endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: 'UP',
    services: {}
  };

  try {
    await paymentService.ping();
    health.services.payment = { status: 'UP' };
  } catch (err) {
    health.services.payment = { status: 'DOWN', error: err.message };
    health.status = 'DEGRADED'; // Au lieu de DOWN complet

    // Alerter l'équipe
    await alerting.notify({
      severity: 'HIGH',
      service: 'Payment Service',
      message: 'Payment Service is DOWN',
      timestamp: new Date()
    });
  }

  res.status(health.status === 'UP' ? 200 : 503).json(health);
});
```

**Dashboard de monitoring** :
- Affiche le statut de chaque microservice en temps réel
- Alerte automatique (Slack, PagerDuty) si un service est down
- Permet une réaction rapide de l'équipe

---

## Exercice 3 : Stratégie de mise à l'échelle

### Patterns d'utilisation

| Service | Pattern | Charge type |
|---------|---------|-------------|
| **Tour Catalog** | Beaucoup de lectures, peu d'écritures | Read-heavy |
| **Booking Service** | Pics 9h-17h + week-ends | Peak-time traffic |
| **User Service** | Trafic stable | Steady traffic |

---

### a) Stratégies de mise à l'échelle par service

#### Tour Catalog Service (Read-Heavy)

**Stratégie** : Cache distribué + répliques lecture seule

```
[Frontend] → [Load Balancer]
                    ↓
            ┌───────┴───────┐
            ↓               ↓
    [Redis Cache]    [CDN: Images]
            ↓
    ┌───────┴───────┬───────────┬───────────┐
    ↓               ↓           ↓           ↓
[TC Instance 1] [TC Inst 2] [TC Inst 3] [TC Inst 4]
    └───────┬───────┴───────────┴───────────┘
            ↓
    [PostgreSQL Primary]
            ├─→ [Read Replica 1]
            ├─→ [Read Replica 2]
            └─→ [Read Replica 3]
```

**Configuration** :
- **4 instances** de Tour Catalog Service
- **Redis cache** avec TTL court (5 min) pour requêtes fréquentes
- **3 read replicas** PostgreSQL pour distribuer les lectures
- **CDN** pour images de visites (CloudFlare, CloudFront)

**Coût mensuel estimé** :
- 4 × Tour Catalog instances (2GB RAM) : 4 × $20 = $80
- Redis cache (2GB) : $30
- PostgreSQL Primary + 3 replicas : $150
- CDN : $20
- **Total : $280/mois**

---

#### Booking Service (Peak-Time Traffic)

**Stratégie** : Auto-scaling basé sur le temps + métriques

```
[Auto-Scaler] (Kubernetes HPA)
       ↓
┌──────┴──────────────────────┐
│ Scaling Rules:              │
│ - 9h-17h : min 5, max 10    │
│ - 17h-9h : min 2, max 4     │
│ - Week-end : min 7, max 15  │
│ - CPU > 70% : +1 instance   │
│ - Queue depth > 100 : +2    │
└─────────────────────────────┘
       ↓
[Load Balancer]
       ↓
┌──────┴──────┬─────────┬─────────┐
↓             ↓         ↓         ↓
[BS Inst 1] [BS 2]   [BS 3]  ... [BS N]
└──────┬──────┴─────────┴─────────┘
       ↓
[PostgreSQL] (optimisé pour écritures)
```

**Configuration Kubernetes** :
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: booking-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: booking-service
  minReplicas: 2
  maxReplicas: 15
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Pods
        value: 1
        periodSeconds: 120
```

**Coût avec auto-scaling** :
- Heures creuses (17h-9h) : 2 instances × 14h = 28h × $0.03 = $0.84/jour
- Heures de pointe (9h-17h) : 7 instances × 8h = 56h × $0.03 = $1.68/jour
- **Total/jour : $2.52 → ~$76/mois**

Vs monolithe : $300/mois (10 instances 24/7) → **Économie de 75%**

---

#### User Service (Steady Traffic)

**Stratégie** : Configuration stable avec haute disponibilité

```
[Load Balancer]
       ↓
┌──────┴──────┬──────────┐
↓             ↓          ↓
[US Inst 1] [US 2]   [US 3]
(Active)    (Active) (Standby)
└──────┬──────┴──────────┘
       ↓
[PostgreSQL Primary]
       └─→ [Standby Replica] (failover)
```

**Configuration** :
- **3 instances** : 2 actives + 1 standby (haute disponibilité)
- **PostgreSQL** avec réplication synchrone pour failover rapide
- Pas d'auto-scaling (trafic prévisible)

**Coût mensuel** :
- 3 instances (1GB RAM) : 3 × $15 = $45
- PostgreSQL HA : $80
- **Total : $125/mois**

---

### b) Avantages de la mise à l'échelle indépendante

#### Comparaison Microservices vs Monolithe

**Scénario** : Pic de trafic sur le Black Friday

| Aspect | Monolithe | Microservices |
|--------|-----------|---------------|
| **Ressources nécessaires** | Scaler TOUTE l'app × 10 | Scaler uniquement Booking × 10 |
| **Coût** | 10 × $100 = $1000 | Booking: $200, autres: $150 = $350 |
| **Temps de déploiement** | 15 min (toute l'app) | 3 min (un service) |
| **Risque** | Tout redémarre | Autres services inchangés |
| **Utilisation CPU** | Tour Catalog idle à 90% | Chaque service à 70% |

**Économie réelle** :
- Monolithe Black Friday : $1000 pendant 3 jours = $100
- Microservices Black Friday : $350 pendant 3 jours = $35
- **Économie : $65 (65%)**

---

### c) Mécanismes de mise à l'échelle

#### Tour Catalog Service

**Horizontal Scaling** (Recommandé)
- Ajouter des instances identiques derrière un load balancer
- Idéal pour read-heavy workloads
- Kubernetes HPA basé sur CPU/Memory

**+ Vertical Scaling** (Base de données)
- Upgrade PostgreSQL vers instance plus puissante si nécessaire
- Read replicas pour distribuer les lectures

**+ Caching Strategy**
- Redis/Memcached pour requêtes fréquentes
- CDN pour assets statiques

---

#### Booking Service

**Auto-Scaling Horizontal** (Essentiel)
- Scale-up automatique pendant pics
- Scale-down pour économiser

**Configuration Kubernetes** :
```yaml
# Déploiement
minReplicas: 2   # Toujours au moins 2 (HA)
maxReplicas: 15  # Maximum pendant Black Friday
targetCPU: 70%   # Déclenche scale-up si dépassé
```

**+ Message Queue Buffering**
- RabbitMQ/Kafka pour absorber les pics
- Workers consomment à rythme constant

---

#### User Service

**Horizontal Scaling Modéré**
- 3 instances fixes pour haute disponibilité
- Pas d'auto-scaling (trafic stable)

**+ Database Replication**
- Primary-Standby pour failover automatique
- Réplication synchrone pour zéro perte de données

---

## Conclusion

Ces exercices ont démontré :

1. **Architecture microservices** nécessite une réflexion approfondie sur les responsabilités
2. **Résilience** passe par circuit breakers, retries, et fallbacks gracieux
3. **Scaling** doit être adapté au pattern de chaque service pour optimiser coût et performance

**Retour à la leçon** : [Leçon 1.5 - Introduction aux Microservices](../lecon-5-microservices-intro.md)

**Prochains exercices** : [Leçon 1.6 - Monolithe vs Microservices](lecon-1.6-solutions.md)
