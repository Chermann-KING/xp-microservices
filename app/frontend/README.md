# Frontend React - Application de Réservation Touristique

Application React moderne avec Vite, incluant gestion d'état avancée, WebSockets temps réel, et résilience frontend.

## 🎯 Modules implémentés

- ✅ **Module 3** : Context API, useReducer, Custom Hooks
- ✅ **Module 5** : WebSocket temps réel, notifications navigateur
- ✅ **Module 6** : Docker, Circuit Breaker UI, Logging ELK, Page Status

## 🏗️ Architecture

```
frontend/
├── src/
│   ├── components/           # Composants réutilisables
│   │   ├── ErrorBoundary.jsx # 🆕 Gestion erreurs Circuit Breaker (M6)
│   │   ├── ErrorBoundary.css
│   │   ├── layout/
│   │   │   ├── Header.jsx
│   │   │   └── Footer.jsx
│   │   ├── payment/
│   │   │   ├── CheckoutForm.jsx
│   │   │   ├── PaymentWrapper.jsx
│   │   │   └── index.js
│   │   ├── tours/
│   │   │   ├── TourCard.jsx
│   │   │   ├── TourFilters.jsx
│   │   │   ├── TourListContainer.jsx
│   │   │   ├── TourAvailabilityAlert.jsx
│   │   │   └── TourAvailabilityBadge.jsx
│   │   └── ui/
│   │       ├── ErrorMessage.jsx
│   │       ├── LoadingSpinner.jsx
│   │       ├── Pagination.jsx
│   │       ├── NotificationContainer.jsx
│   │       ├── NotificationPermissionBanner.jsx
│   │       └── WebSocketStatus.jsx
│   ├── contexts/             # Context API
│   │   ├── AuthContext.jsx
│   │   ├── CartContext.jsx
│   │   ├── CurrencyContext.jsx
│   │   ├── NotificationContext.jsx
│   │   └── WebSocketContext.jsx
│   ├── hooks/                # Custom Hooks
│   │   ├── useApiWithRetry.js # 🆕 API avec retry automatique (M6)
│   │   ├── useWebSocketEvent.js
│   │   ├── useBooking.js
│   │   ├── useTours.js
│   │   ├── useNotifications.js
│   │   ├── useLocalStorage.js
│   │   └── index.js
│   ├── pages/                # Pages de l'application
│   │   ├── SystemStatus.jsx   # 🆕 Page monitoring services (M6)
│   │   ├── SystemStatus.css
│   │   ├── HomePage.jsx
│   │   ├── ToursPage.jsx
│   │   ├── TourDetailPage.jsx
│   │   ├── CartPage.jsx
│   │   ├── CheckoutPage.jsx
│   │   ├── PaymentSuccessPage.jsx
│   │   ├── LoginPage.jsx
│   │   └── RegisterPage.jsx
│   ├── services/             # Services API
│   │   ├── api.js
│   │   ├── authService.js
│   │   └── paymentService.js
│   ├── utils/                # Utilitaires
│   │   └── logger.js          # 🆕 Logger vers Logstash (M6)
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── Dockerfile                # 🆕 Multi-stage build (M6)
├── nginx.conf                # Configuration Nginx
└── package.json
```

## 🚀 Démarrage

### Développement local

```bash
# Installer les dépendances
npm install

# Copier les variables d'environnement
cp .env.example .env

# Démarrer en mode développement
npm run dev
```

Accès : `http://localhost:5173`

### Avec Docker

```bash
# Build de l'image
docker build -t frontend-app \
  --build-arg VITE_API_URL=http://localhost:8080 \
  --build-arg VITE_WS_URL=ws://localhost:8081 \
  .

# Exécuter le conteneur
docker run -p 5173:80 frontend-app
```

### Avec Docker Compose

```bash
# Depuis la racine du projet
cd app
docker-compose up frontend
```

## ⚙️ Variables d'environnement

Créer un fichier `.env` avec :

```env
# API Gateway
VITE_API_URL=http://localhost:8080

# WebSocket Server (Module 5)
VITE_WS_URL=ws://localhost:8081

# Stripe (Module 4)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx

# Logstash (Module 6 - Optionnel)
VITE_LOGSTASH_URL=http://localhost:5000
```

## 🔧 Fonctionnalités Module 6

### 1. Error Boundary & Circuit Breaker

Gestion intelligente des erreurs de services indisponibles :

```jsx
import ErrorBoundary from "./components/ErrorBoundary";

<ErrorBoundary>
  <App />
</ErrorBoundary>;
```

**Fonctionnalités** :

- Détection automatique des erreurs Circuit Breaker
- UI degradée avec instructions utilisateur
- Retry automatique après 30 secondes
- Logs d'erreurs vers Logstash
- Mode Dev avec stack trace détaillée

### 2. Hook `useApiWithRetry`

Requêtes API résilientes avec retry automatique :

```javascript
import useApiWithRetry from "./hooks/useApiWithRetry";

const MyComponent = () => {
  const { get, loading, error, retryCount } = useApiWithRetry({
    maxRetries: 3,
    retryDelay: 1000,
    timeout: 5000,
  });

  const fetchData = async () => {
    try {
      const data = await get("/api/tours");
      console.log(data);
    } catch (err) {
      // Gestion d'erreur après tous les retries
    }
  };

  return (
    <div>
      {loading && <p>Chargement... (tentative {retryCount})</p>}
      {error && <p>Erreur : {error.message}</p>}
      <button onClick={fetchData}>Charger</button>
    </div>
  );
};
```

**Stratégies** :

- Retry sur erreurs réseau (408, 429, 5xx)
- Exponential backoff (1s, 2s, 4s)
- Timeout configurable (défaut : 5s)
- Callbacks onRetry et onError

### 3. Page System Status

Dashboard de monitoring en temps réel :

- État de tous les services backend
- Statut des Circuit Breakers
- Métriques détaillées (succès, échecs, latence)
- Rafraîchissement automatique (10s)

Accès : `/status`

### 4. Logger Frontend → Logstash

Centralisation des logs frontend dans ELK :

```javascript
import logger from "./utils/logger";

// Logs simples
logger.info("Utilisateur connecté", { userId: 123 });
logger.error("Erreur de paiement", error);

// Logs HTTP
logger.logHttpRequest("GET", "/api/tours", 200, 150);

// Actions utilisateur
logger.logUserAction("tour_booked", { tourId: 456 });

// Performance
logger.logPerformance("page_load", 1234);
```

**Caractéristiques** :

- Batching automatique (10 logs ou 5 secondes)
- Fail-safe (n'impacte pas l'UI si Logstash est down)
- Métadonnées enrichies (URL, userAgent, viewport)
- Niveaux : debug, info, warn, error, fatal

## 📊 Monitoring & Observabilité

### Health Checks

```bash
# Vérifier que l'app est accessible
curl http://localhost:5173

# Vérifier le statut des services
curl http://localhost:8080/health

# Vérifier les circuit breakers
curl http://localhost:8080/circuit-breaker/status
```

### Logs ELK

Les logs frontend sont envoyés vers Logstash et visualisables dans Kibana :

```
Index: microservices-logs-*
Filter: service:frontend
```

**Types de logs** :

- Actions utilisateur
- Erreurs frontend
- Requêtes API (succès/échecs)
- Métriques de performance
- Circuit Breaker events

### Métriques Performance

```javascript
// Mesurer le temps de chargement d'une page
const startTime = performance.now();

// ... chargement de la page ...

const duration = performance.now() - startTime;
logger.logPerformance("page_load_time", duration);
```

## 🎨 Structure des Composants

### Container/Presentational Pattern

- **Containers** : Gèrent la logique et l'état (Context, hooks)
- **Presentational** : Components pure UI (props uniquement)

```jsx
// Container
const TourListContainer = () => {
  const { tours, loading } = useTours();
  return <TourList tours={tours} loading={loading} />;
};

// Presentational
const TourList = ({ tours, loading }) => {
  if (loading) return <Spinner />;
  return tours.map((tour) => <TourCard key={tour.id} tour={tour} />);
};
```

## 🔐 Authentification

JWT tokens gérés via Context API :

```javascript
import { useAuth } from "./contexts/AuthContext";

const MyComponent = () => {
  const { user, login, logout, isAuthenticated } = useAuth();

  // ...
};
```

## 🌐 WebSockets (Module 5)

Notifications temps réel des disponibilités :

```javascript
import useWebSocket from "./hooks/useWebSocket";

const TourList = () => {
  const { data: notification, connected } = useWebSocket(
    import.meta.env.VITE_WS_URL
  );

  useEffect(() => {
    if (notification?.type === "tour.availability.low") {
      showNotification(notification.data);
    }
  }, [notification]);

  // ...
};
```

## 🐳 Docker

### Dockerfile Multi-stage

**Stage 1 - Build** :

- Node.js 20 Alpine
- npm ci (cache optimisé)
- Vite build avec variables d'environnement

**Stage 2 - Production** :

- Nginx Alpine (image légère)
- Fichiers statiques buildés
- Configuration Nginx optimisée
- Health check intégré

### Optimisations

- **Gzip** : Compression des assets
- **Cache** : 1 an pour JS/CSS/images
- **SPA Routing** : Redirection vers index.html
- **Headers sécurité** : X-Frame-Options, X-XSS-Protection

## 🧪 Tests (Module 7 à venir)

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Coverage
npm run test:coverage
```

## 📦 Build Production

```bash
# Build optimisé
npm run build

# Prévisualiser le build
npm run preview

# Analyser la taille du bundle
npm run build -- --report
```

## 🔗 Liens utiles

- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [Module 6 Documentation](../../docs/module-6/README.md)

## 📝 Conventions

- **ES Modules** : import/export (pas de CommonJS)
- **Hooks** : Utiliser les hooks React (pas de class components)
- **PropTypes** : Validation des props (ou TypeScript)
- **Prettier** : Formatage automatique du code
- **ESLint** : Linting avec règles React

## 🎯 Prochaines étapes (Module 7)

- [ ] Unit testing avec Vitest
- [ ] E2E testing avec Cypress
- [ ] CI/CD avec GitHub Actions
- [ ] Performance optimization
- [ ] PWA (Service Workers)
