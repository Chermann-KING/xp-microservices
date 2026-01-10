# Leçon 6.2 - Orchestration avec Docker Compose et Fondamentaux de Kubernetes

**Module 6** : Déploiement, surveillance et évolutivité

---

## Objectifs pédagogiques

- Comprendre les principes de l'orchestration de conteneurs et son importance pour les microservices
- Maîtriser Docker Compose pour orchestrer des applications multi-conteneurs en local
- Définir et gérer des services, réseaux et volumes avec docker-compose.yml
- Découvrir les concepts fondamentaux de Kubernetes (K8s)
- Comprendre les ressources Kubernetes : Pods, Deployments, Services, Ingress
- Identifier quand utiliser Docker Compose vs Kubernetes

## Prérequis

- Leçon 6.1 : Containerisation avec Docker
- Modules 1-5 : Architecture microservices et communication entre services
- Docker Desktop installé avec support Kubernetes (optionnel pour les exercices K8s)
- Connaissance de YAML (format de fichier de configuration)

---

## Introduction

La containerisation avec Docker, couverte dans la leçon précédente, fournit des environnements isolés pour nos microservices. Cependant, gérer plusieurs conteneurs pour différents services de notre application de réservation touristique—comme Tour Catalog, Booking Management, Payment Gateway et Notification—devient complexe. Cette complexité inclut la communication entre services, le scaling selon les besoins, et la maintenance de leur cycle de vie.

**Les outils d'orchestration résolvent ces défis** en automatisant le déploiement, le scaling, la mise en réseau et la gestion des applications containerisées.

---

## 1. Introduction à l'Orchestration de Conteneurs

L'**orchestration de conteneurs** fait référence à la gestion automatisée des applications containerisées, en se concentrant sur des tâches telles que le déploiement, le scaling, la mise en réseau et la disponibilité.

### 1.1 Le Problème de la Gestion Manuelle

Pour une architecture microservices comme notre application de réservation touristique, où des dizaines voire des centaines de conteneurs peuvent s'exécuter sur plusieurs machines, la gestion manuelle est impraticable et sujette aux erreurs.

**Considérons notre application de réservation touristique :**

- **Tour Catalog Microservice** : Nécessite une base de données (PostgreSQL) et l'application Node.js
- **Booking Management Microservice** : Nécessite également une base de données et son application Node.js
- **Payment Gateway Microservice** : S'intègre avec une API tierce et sa propre logique applicative
- **Notification Microservice** : Interagit avec une file de messages (RabbitMQ, vu au Module 5)
- **React Frontend** : L'application côté client servie par un serveur web

**Sans orchestration**, vous devriez :

- ✋ Démarrer manuellement chaque conteneur
- 🔗 Lier leurs réseaux manuellement
- ⚙️ Configurer les variables d'environnement
- 👁️ Surveiller leur santé
- 🔄 Redémarrer manuellement les conteneurs en cas de panne

### 1.2 Bénéfices de l'Orchestration

**L'orchestration automatise ces processus**, rendant l'ensemble du système plus robuste et gérable :

✅ **Démarrage ordonné** : Les services démarrent dans le bon ordre (BDD → App → Frontend)  
✅ **Communication facilitée** : Les services se découvrent automatiquement par leur nom  
✅ **Récupération automatique** : Redémarrage automatique en cas de panne  
✅ **Scaling dynamique** : Ajout/suppression d'instances selon la charge  
✅ **Gestion centralisée** : Une seule commande pour tout démarrer ou arrêter

### 1.3 Scénario Hypothétique : Campagne Marketing

Imaginons le lancement d'une campagne marketing qui devrait augmenter significativement le trafic vers les services Tour Catalog et Booking Management.

**Sans orchestration** :

- ⏱️ Plusieurs heures pour provisionner manuellement de nouveaux serveurs
- 🔧 Installation manuelle de Docker sur chaque serveur
- 📦 Pull manuel des images et démarrage des conteneurs
- 😰 Risque de dégradation du service pendant les pics de demande

**Avec orchestration** :

- ⚡ Définition de règles de scaling
- 🚀 Ajout automatique d'instances pour gérer la charge
- 😌 Expérience utilisateur fluide garantie

---

## 2. Docker Compose pour l'Orchestration Multi-Services Locale

**Docker Compose** est un outil pour définir et exécuter des applications Docker multi-conteneurs. Avec Compose, vous utilisez un fichier YAML pour configurer les services, réseaux et volumes de votre application. Ensuite, avec une seule commande, vous créez et démarrez tous les services.

### 2.1 Concepts Clés de Docker Compose

#### **Services**

Chaque service dans un fichier Compose représente un conteneur qui exécute une partie spécifique de votre application. Pour notre app, nous aurions :

- `tour-catalog-service`
- `booking-service`
- `payment-service`
- `notification-service`
- `react-frontend`
- `tour-catalog-db`
- `booking-db`
- `rabbitmq`

#### **Réseaux**

Compose crée un réseau par défaut pour votre application, permettant à tous les services de communiquer entre eux en utilisant leurs noms de service comme noms d'hôte. Cela simplifie considérablement la communication inter-services.

**Exemple** : Le service `booking-service` peut appeler `http://tour-catalog-service:3001` au lieu d'utiliser une IP.

#### **Volumes**

Les volumes sont utilisés pour persister les données générées par les conteneurs Docker. Pour les bases de données comme PostgreSQL, il est crucial d'utiliser des volumes pour garantir que les données ne sont pas perdues lorsque les conteneurs sont arrêtés ou supprimés.

#### **docker-compose.yml**

Ce fichier YAML définit l'ensemble de l'application multi-conteneurs. Il spécifie l'image pour chaque service, les ports à exposer, les variables d'environnement, les dépendances, etc.

### 2.2 Exemple Pratique : Docker Compose pour l'application de réservation touristique

Commençons avec une version simplifiée incluant le service Tour Catalog et sa base de données PostgreSQL.

**Fichier : `app/docker-compose.yml`**

```yaml
# ============================================
# Docker Compose - application de réservation touristique
# ============================================
# Ce fichier définit l'orchestration locale de tous nos microservices

version: "3.8" # Version du format de fichier Compose

services:
  # ============================================
  # BASE DE DONNÉES - Tour Catalog
  # ============================================
  tour-catalog-db:
    image: postgres:15-alpine # PostgreSQL 15 sur Alpine (image légère)
    container_name: tour-catalog-postgres
    restart: unless-stopped # Redémarrage automatique sauf si arrêté manuellement
    environment:
      POSTGRES_DB: tour_catalog_db
      POSTGRES_USER: catalog_user
      POSTGRES_PASSWORD: catalog_password_dev
      # En production, utiliser des secrets Docker ou des fichiers .env sécurisés
    ports:
      - "5432:5432" # Exposer pour accès externe (pgAdmin, DBeaver, etc.)
    volumes:
      - tour-catalog-data:/var/lib/postgresql/data # Persistance des données
    networks:
      - booking-tourism-app-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U catalog_user -d tour_catalog_db"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ============================================
  # MICROSERVICE - Tour Catalog
  # ============================================
  tour-catalog-service:
    build:
      context: ./tour-catalog-service # Chemin vers le Dockerfile
      dockerfile: Dockerfile
    container_name: tour-catalog-api
    restart: unless-stopped
    environment:
      # Connexion à la base de données (utilisation du nom de service)
      DATABASE_URL: postgresql://catalog_user:catalog_password_dev@tour-catalog-db:5432/tour_catalog_db
      NODE_ENV: development
      PORT: 3001
      # Variables pour RabbitMQ (Module 5)
      RABBITMQ_URL: amqp://rabbitmq:5672
    ports:
      - "3001:3001" # Port exposé sur l'hôte
    depends_on:
      tour-catalog-db:
        condition: service_healthy # Attend que la BDD soit prête
    networks:
      - booking-tourism-app-network
    volumes:
      # Mount du code source pour hot-reload en développement
      - ./tour-catalog-service/src:/app/src:ro
    command: npm run dev # Commande pour le mode développement

# ============================================
# RÉSEAUX
# ============================================
networks:
  booking-tourism-app-network:
    driver: bridge # Driver par défaut pour la communication locale

# ============================================
# VOLUMES
# ============================================
volumes:
  tour-catalog-data: # Volume nommé pour la persistance PostgreSQL
```

### 2.3 Explication Détaillée

#### **Section `tour-catalog-db`**

```yaml
tour-catalog-db:
  image: postgres:15-alpine
```

- Utilise l'image officielle PostgreSQL 15 sur Alpine (plus légère)

```yaml
restart: unless-stopped
```

- Le conteneur redémarre automatiquement en cas de crash
- Ne redémarre pas si arrêté manuellement avec `docker-compose stop`

```yaml
environment:
  POSTGRES_DB: tour_catalog_db
  POSTGRES_USER: catalog_user
  POSTGRES_PASSWORD: catalog_password_dev
```

- Configure les credentials de la base de données
- ⚠️ **Important** : Utiliser des secrets en production, pas de mots de passe en clair

```yaml
ports:
  - "5432:5432"
```

- Expose PostgreSQL sur le port 5432 de l'hôte
- Permet la connexion avec des outils externes (pgAdmin, DBeaver)

```yaml
volumes:
  - tour-catalog-data:/var/lib/postgresql/data
```

- Monte un volume nommé pour persister les données
- Les données survivent aux arrêts/redémarrages du conteneur

```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U catalog_user -d tour_catalog_db"]
  interval: 10s
  timeout: 5s
  retries: 5
```

- Vérifie régulièrement que PostgreSQL est prêt à accepter des connexions
- Utile pour `depends_on` avec `condition: service_healthy`

#### **Section `tour-catalog-service`**

```yaml
build:
  context: ./tour-catalog-service
  dockerfile: Dockerfile
```

- Construit l'image à partir du Dockerfile local
- Alternative : utiliser `image: yourusername/tour-catalog-service:1.0` si l'image est sur un registry

```yaml
environment:
  DATABASE_URL: postgresql://catalog_user:catalog_password_dev@tour-catalog-db:5432/tour_catalog_db
```

- **`tour-catalog-db`** : Nom du service utilisé comme hostname
- Docker Compose gère la résolution DNS automatiquement

```yaml
depends_on:
  tour-catalog-db:
    condition: service_healthy
```

- Attend que `tour-catalog-db` soit "healthy" avant de démarrer
- Garantit que la BDD est prête à accepter des connexions

```yaml
volumes:
  - ./tour-catalog-service/src:/app/src:ro
```

- Monte le code source en lecture seule (`:ro`)
- Permet le hot-reload en développement (avec nodemon)

### 2.4 Commandes Docker Compose Essentielles

#### **Démarrer tous les services**

```bash
# En mode détaché (arrière-plan)
docker-compose up -d

# Avec logs visibles (premier plan)
docker-compose up

# Reconstruire les images avant de démarrer
docker-compose up -d --build

# Démarrer un service spécifique
docker-compose up -d tour-catalog-service
```

#### **Voir les logs**

```bash
# Logs de tous les services
docker-compose logs

# Logs d'un service spécifique
docker-compose logs tour-catalog-service

# Suivre les logs en temps réel
docker-compose logs -f

# Dernières 100 lignes de logs
docker-compose logs --tail=100
```

#### **Vérifier l'état des services**

```bash
# Liste des conteneurs et leur état
docker-compose ps

# Détails de tous les services
docker-compose ps -a
```

#### **Arrêter et supprimer**

```bash
# Arrêter tous les services (garde les volumes)
docker-compose stop

# Arrêter et supprimer les conteneurs (garde les volumes)
docker-compose down

# Arrêter, supprimer conteneurs ET volumes
docker-compose down -v

# Supprimer aussi les images construites
docker-compose down --rmi all
```

#### **Exécuter des commandes dans un service**

```bash
# Ouvrir un shell dans le conteneur
docker-compose exec tour-catalog-service sh

# Exécuter une commande spécifique
docker-compose exec tour-catalog-db psql -U catalog_user -d tour_catalog_db

# Exécuter npm install dans le service
docker-compose exec tour-catalog-service npm install
```

### 2.5 Ajouter Plus de Services

Étendons notre `docker-compose.yml` pour inclure le Booking Management Service :

```yaml
# ... services précédents ...

  # ============================================
  # BASE DE DONNÉES - Booking Management
  # ============================================
  booking-db:
    image: postgres:15-alpine
    container_name: booking-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: booking_db
      POSTGRES_USER: booking_user
      POSTGRES_PASSWORD: booking_password_dev
    ports:
      - "5433:5432" # Port différent pour éviter les conflits
    volumes:
      - booking-data:/var/lib/postgresql/data
    networks:
      - booking-tourism-app-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U booking_user -d booking_db"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ============================================
  # MICROSERVICE - Booking Management
  # ============================================
  booking-service:
    build:
      context: ./booking-management-service
      dockerfile: Dockerfile
    container_name: booking-api
    restart: unless-stopped
    environment:
      DATABASE_URL: postgresql://booking_user:booking_password_dev@booking-db:5432/booking_db
      # Communication inter-services
      TOUR_CATALOG_SERVICE_URL: http://tour-catalog-service:3001
      PAYMENT_SERVICE_URL: http://payment-service:3004
      NODE_ENV: development
      PORT: 3002
      RABBITMQ_URL: amqp://rabbitmq:5672
    ports:
      - "3002:3002"
    depends_on:
      booking-db:
        condition: service_healthy
      tour-catalog-service:
        condition: service_started # Booking dépend du catalog
    networks:
      - booking-tourism-app-network
    volumes:
      - ./booking-management-service/src:/app/src:ro

volumes:
  tour-catalog-data:
  booking-data: # Nouveau volume pour Booking DB
```

**Points clés** :

- Port 5433 pour `booking-db` pour éviter le conflit avec `tour-catalog-db`
- Variables d'environnement pour la communication inter-services
- `depends_on` inclut `tour-catalog-service` car Booking en dépend

---

## 3. Fondamentaux de Kubernetes : Scaling au-delà du Développement Local

Alors que Docker Compose est excellent pour le développement local et les tests d'applications multi-conteneurs, il n'est **pas conçu pour les déploiements à grande échelle en production** sur des clusters de machines.

Pour cela, nous nous tournons vers **Kubernetes (K8s)**, un système d'orchestration de conteneurs open-source pour automatiser le déploiement, le scaling et la gestion d'applications containerisées.

### 3.1 Pourquoi Kubernetes pour les Microservices ?

Imaginons que notre application de réservation touristique connaît une croissance significative. Nous devons :

- 🌍 Déployer sur plusieurs serveurs cloud
- ⚡ Assurer une haute disponibilité
- 📈 Scaler automatiquement selon le trafic en temps réel
- 🛡️ Gérer les pannes de manière gracieuse

**Kubernetes offre les capacités pour atteindre ces objectifs** :

#### **Déploiement Automatisé et Rollbacks**

Kubernetes automatise le déploiement de nouvelles versions de nos microservices et peut revenir aux versions précédentes si des problèmes surviennent.

#### **Auto-guérison (Self-healing)**

Si un conteneur échoue, Kubernetes le remplace automatiquement. Si un nœud (serveur) meurt, il déplace les conteneurs de ce nœud vers des nœuds sains.

#### **Service Discovery et Load Balancing**

Kubernetes assigne automatiquement des adresses IP et des noms DNS aux conteneurs et peut équilibrer la charge entre plusieurs instances d'un service. Si nous avons 10 instances de `tour-catalog-service`, Kubernetes distribue les requêtes entrantes entre elles.

#### **Scaling Horizontal**

Facilement scaler les microservices vers le haut ou le bas en fonction de l'utilisation CPU ou de métriques personnalisées. Si notre Booking Management Service connaît une charge élevée, Kubernetes peut lancer plus d'instances automatiquement.

#### **Orchestration du Stockage**

Monte des systèmes de stockage (local, cloud providers comme AWS EBS, Azure Disks, GCP Persistent Disks) vers les conteneurs.

#### **Gestion de Configuration et Secrets**

Gère les données de configuration et les informations sensibles (mots de passe de bases de données, clés API) de manière sécurisée, en les injectant dans les conteneurs selon les besoins.

### 3.2 Concepts Fondamentaux de Kubernetes

Kubernetes possède un ensemble riche d'abstractions et de composants. Comprendre ces blocs de construction fondamentaux est crucial.

#### **Cluster**

Un ensemble de machines de travail, appelées nœuds (nodes), qui exécutent des applications containerisées. Chaque cluster possède au moins un nœud de travail et un nœud maître (control plane).

**Architecture d'un cluster Kubernetes** :

```
┌──────────────────────────────────────────────────────┐
│                    CONTROL PLANE                     │
│  ┌───────────────┐  ┌─────────┐  ┌────────────────┐  │
│  │ kube-apiserver│  │  etcd   │  │ kube-scheduler │  │
│  └───────────────┘  └─────────┘  └────────────────┘  │
│  ┌──────────────────────────────────────────────┐    │
│  │       kube-controller-manager                │    │
│  └──────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
┌───────▼──────┐  ┌───────▼──────┐  ┌──────▼───────┐
│  WORKER NODE │  │  WORKER NODE │  │ WORKER NODE  │
│  ┌─────────┐ │  │  ┌─────────┐ │  │ ┌─────────┐  │
│  │ kubelet │ │  │  │ kubelet │ │  │ │ kubelet │  │
│  ├─────────┤ │  │  ├─────────┤ │  │ ├─────────┤  │
│  │Container│ │  │  │Container│ │  │ │Container│  │
│  │ Runtime │ │  │  │ Runtime │ │  │ │ Runtime │  │
│  ├─────────┤ │  │  ├─────────┤ │  │ ├─────────┤  │
│  │kube-proxy│ │ │  │kube-proxy│ │ │ │kube-proxy│ │
│  └─────────┘ │  │  └─────────┘ │  │ └─────────┘  │
│              │  │              │  │              │
│  [Pods...]   │  │  [Pods...]   │  │  [Pods...]   │
└──────────────┘  └──────────────┘  └──────────────┘
```

**Master Node (Control Plane)** :

- `kube-apiserver` : Expose l'API Kubernetes
- `etcd` : Stockage de données du cluster
- `kube-scheduler` : Assigne les Pods aux nœuds
- `kube-controller-manager` : Exécute les processus de contrôleurs

**Worker Node** :

- `kubelet` : Agent pour le master
- `Container runtime` : Docker, containerd, etc.
- `kube-proxy` : Proxy réseau

#### **Pod**

La plus petite unité déployable dans Kubernetes. Un Pod est une abstraction sur un conteneur. Il peut contenir un ou plusieurs conteneurs qui partagent le réseau, le stockage et le cycle de vie.

**Caractéristiques d'un Pod** :

- 📦 Encapsule un ou plusieurs conteneurs
- 🌐 Partage la même adresse IP et le même espace de port
- 💾 Peut partager des volumes de stockage
- 🔄 Éphémère par nature (peut être recréé à tout moment)

**Exemple** : Pour notre app, un Pod pourrait contenir le conteneur de l'application Node.js `tour-catalog-service`.

Si vous avez un conteneur d'application principal et un conteneur "sidecar" (par exemple, un agent de logging) qui doivent toujours s'exécuter ensemble, ils seraient généralement dans le même Pod.

#### **Deployment**

Une abstraction de niveau supérieur qui gère le déploiement et le scaling d'un ensemble de Pods identiques. Les Deployments garantissent qu'un nombre spécifié de répliques de Pods sont en cours d'exécution et disponibles à tout moment.

**Cas d'usage** :

- ✅ Créer un Deployment pour `tour-catalog-service` pour garantir 3 instances en cours d'exécution
- ✅ Gérer les mises à jour vers de nouvelles versions
- ✅ Effectuer des rollbacks vers des versions précédentes

**Exemple** : Si nous voulons mettre à jour `tour-catalog-service` de v1 à v2, le Deployment remplacera gracieusement les Pods v1 par des Pods v2 sans interruption de service.

**Rolling Update** :

```
État Initial: [v1] [v1] [v1]
              ↓
Étape 1:      [v1] [v1] [v2] (démarre v2)
              ↓
Étape 2:      [v1] [v2] [v2] (termine v1)
              ↓
État Final:   [v2] [v2] [v2] (tous mis à jour)
```

#### **Service**

Une manière abstraite d'exposer une application s'exécutant sur un ensemble de Pods comme un service réseau. Les Services permettent aux Pods de communiquer entre eux (communication interne) et exposent également les applications au monde extérieur (communication externe).

**Types de Services** :

**ClusterIP (par défaut)** :

- Expose le Service sur une IP interne du cluster
- Accessible uniquement depuis l'intérieur du cluster
- Idéal pour la communication inter-microservices
- Exemple : `booking-service` appelant `tour-catalog-service`

**NodePort** :

- Expose le Service sur l'IP de chaque nœud à un port statique
- Rend le service accessible depuis l'extérieur du cluster via `NodeIP:NodePort`
- Utilisé pour exposer des services quand un load balancer externe n'est pas disponible

**LoadBalancer** :

- Expose le Service en externe via le load balancer du cloud provider
- Manière standard d'exposer des microservices publics dans le cloud
- Exemple : Notre React frontend ou une API Gateway publique

**ExternalName** :

- Mappe le Service vers le contenu du champ `externalName` (un enregistrement CNAME)

**Exemple de configuration** :

- `tour-catalog-service` → Service ClusterIP pour communication interne
- `react-frontend` → Service LoadBalancer pour accès public

#### **Ingress**

Gère l'accès externe aux services dans un cluster, typiquement HTTP/HTTPS. Ingress fournit un routage basé sur URL, un routage basé sur l'hôte, la terminaison SSL, et plus encore.

**Avantages** :

- 🔀 Routage basé sur le chemin : `/tours` → `tour-catalog-service`
- 🌐 Routage basé sur l'hôte : `api.example.com` vs `www.example.com`
- 🔒 Terminaison SSL centralisée
- 💰 Un seul LoadBalancer au lieu de plusieurs

**Au lieu de créer plusieurs Services LoadBalancer** pour chaque microservice public, nous déployons généralement un seul contrôleur Ingress et définissons des règles Ingress pour router le trafic vers des Services backend spécifiques.

**Exemple de routage** :

```
https://booking-tourism-app.com/api/tours     → tour-catalog-service
https://booking-tourism-app.com/api/bookings  → booking-service
https://booking-tourism-app.com/api/payments  → payment-service
https://booking-tourism-app.com/               → react-frontend
```

#### **ConfigMap et Secret**

**ConfigMap** :

- Stocke des données de configuration non sensibles en paires clé-valeur
- Exemples : URLs d'API, niveaux de logging, feature flags
- Permet de découpler la configuration des images de conteneurs

**Secret** :

- Stocke des informations sensibles (mots de passe, clés API, tokens OAuth)
- Encodé en base64 par défaut (pas du chiffrement)
- Pour un vrai chiffrement au repos, des mesures supplémentaires sont nécessaires

**Exemple d'utilisation** :

```yaml
# ConfigMap pour configuration non sensible
apiVersion: v1
kind: ConfigMap
metadata:
  name: tour-catalog-config
data:
  LOG_LEVEL: "info"
  API_VERSION: "v1"

# Secret pour données sensibles
apiVersion: v1
kind: Secret
metadata:
  name: tour-catalog-secrets
type: Opaque
data:
  DATABASE_PASSWORD: Y2F0YWxvZ19wYXNzd29yZA== # base64 encodé
```

#### **Volume**

Un répertoire accessible aux conteneurs dans un Pod, persistant les données au-delà de la vie d'un conteneur. Kubernetes supporte divers types de volumes :

- Local storage
- Network file systems (NFS)
- Cloud-specific storage (AWS EBS, GCP Persistent Disks, Azure Disks)

**Pour nos bases de données PostgreSQL**, nous utiliserions des volumes persistants pour garantir l'intégrité des données à travers les redémarrages ou migrations de Pods.

### 3.3 Scénario Hypothétique : Déploiement sur Kubernetes

Considérons le déploiement de notre `tour-catalog-service` sur Kubernetes :

**Étape 1 : Containerisation (Docker)**
L'application Node.js `tour-catalog-service` est containerisée dans une image Docker (vue dans la Leçon 6.1). Cette image est poussée vers un registre de conteneurs (Docker Hub, AWS ECR, etc.).

**Étape 2 : Définition du Pod**
Kubernetes a besoin de savoir comment exécuter cette image. Une définition de Pod spécifie l'image du conteneur, les ports et les variables d'environnement.

**Étape 3 : Deployment**
Pour garantir plusieurs instances et gérer les mises à jour, nous définissons un Deployment pour `tour-catalog-service`, spécifiant par exemple 3 répliques. Le Deployment garantira que 3 Pods exécutant notre service sont toujours disponibles.

**Étape 4 : Définition du Service**
Pour permettre aux autres microservices (comme `booking-service`) d'atteindre `tour-catalog-service` de manière cohérente, nous définissons un Service ClusterIP. Ce Service obtient une IP interne stable et un nom DNS (`tour-catalog-service.default.svc.cluster.local`).

**Étape 5 : Base de Données**
Pour la base de données (`tour-catalog-db`), nous déploierions un StatefulSet (un contrôleur pour applications avec état, garantissant des identifiants réseau stables et un scaling ordonné) combiné avec des PersistentVolumes et PersistentVolumeClaims pour garantir la persistance des données.

**Architecture résultante** :

```
┌────────────────────────────────────────────────┐
│              KUBERNETES CLUSTER                │
│                                                │
│  ┌──────────────────────────────────────────┐  │
│  │  Ingress (LoadBalancer externe)          │  │
│  │  https://booking-tourism-app.com/*       │  │
│  └─────────────┬────────────────────────────┘  │
│                │                               │
│  ┌─────────────▼──────────────────────────┐    │
│  │  Service: tour-catalog-service         │    │
│  │  Type: ClusterIP                       │    │
│  │  IP: 10.96.0.10                        │    │
│  └─────────────┬──────────────────────────┘    │
│                │                               │
│  ┌─────────────▼─────────────────────────┐     │
│  │  Deployment: tour-catalog-deployment  │     │
│  │  Replicas: 3                          │     │
│  │                                       │     │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐│     │
│  │  │ Pod v1  │  │ Pod v1  │  │ Pod v1  ││     │
│  │  │ [App]   │  │ [App]   │  │ [App]   ││     │
│  │  └─────────┘  └─────────┘  └─────────┘│     │
│  └───────────────────────────────────────┘     │
│                                                │
│  ┌──────────────────────────────────────────┐  │
│  │  StatefulSet: tour-catalog-db            │  │
│  │  ┌─────────┐                             │  │
│  │  │ Pod DB  │ ← PersistentVolume          │  │
│  │  │ [PG]    │                             │  │
│  │  └─────────┘                             │  │
│  └──────────────────────────────────────────┘  │
└────────────────────────────────────────────────┘
```

Cette approche structurée rend notre application résiliente, scalable et gérable au niveau du cluster.

---

## 4. Exercices et Activités Pratiques

### Exercice 1 - Étendre Docker Compose pour l'Application Complète

Mettez à jour le fichier `docker-compose.yml` pour inclure tous les services de notre application de réservation touristique.

### Exercice 2 - Identification des Composants Kubernetes

Pour chaque besoin, identifiez la ressource Kubernetes appropriée.

### Exercice 3 - Esquisse de Configuration Kubernetes

Créez les structures YAML pour un Deployment et un Service Kubernetes.

---

## Résumé de la Leçon

Cette leçon a fourni une compréhension fondamentale de l'orchestration de conteneurs, en commençant par Docker Compose pour les environnements locaux et en passant aux concepts de base de Kubernetes pour les déploiements de qualité production.

**Points clés à retenir** :

✅ **Docker Compose** : Idéal pour le développement local et les tests  
✅ **Kubernetes** : Essentiel pour la production à grande échelle  
✅ **Orchestration** : Automatise déploiement, scaling, networking et récupération  
✅ **Services et Réseaux** : Communication simplifiée entre microservices  
✅ **Volumes** : Persistance des données critiques  
✅ **Deployments** : Gestion des mises à jour et de la haute disponibilité

**Comparaison Docker Compose vs Kubernetes** :

| Aspect                     | Docker Compose | Kubernetes       |
| -------------------------- | -------------- | ---------------- |
| **Environnement**          | Local/Dev      | Production/Cloud |
| **Scaling**                | Manuel         | Automatique      |
| **Haute disponibilité**    | Non            | Oui              |
| **Load balancing**         | Basique        | Avancé           |
| **Multi-nœuds**            | Non            | Oui              |
| **Auto-guérison**          | Non            | Oui              |
| **Complexité**             | Faible         | Élevée           |
| **Courbe d'apprentissage** | Faible         | Élevée           |

---

## Prochaines Étapes

Dans les prochaines leçons, nous plongerons plus profondément dans le déploiement de nos microservices sur des plateformes cloud réelles, en tirant largement parti des concepts Kubernetes introduits ici. Nous explorerons comment interagir avec les services Kubernetes managés par le cloud et appliquerons ces principes d'orchestration pour atteindre des déploiements hautement disponibles, scalables et résilients pour notre application de réservation touristique Fullstack.

Nous commencerons également à intégrer d'autres composants essentiels comme les API Gateways et la journalisation et surveillance centralisées, le tout dans cet environnement orchestré.

---

## Ressources Complémentaires

- [Documentation officielle Docker Compose](https://docs.docker.com/compose/)
- [Docker Compose Best Practices](https://docs.docker.com/compose/production/)
- [Documentation officielle Kubernetes](https://kubernetes.io/docs/home/)
- [Kubernetes Interactive Tutorials](https://kubernetes.io/docs/tutorials/)
- [Minikube pour Kubernetes local](https://minikube.sigs.k8s.io/docs/)
- [kubectl Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)

---

## Navigation

- **⬅️ Précédent** : [Leçon 6.1 : Containerisation avec Docker pour les Microservices](lecon-1-docker-containerization.md)
- **➡️ Suivant** : [Leçon 6.3 - Déploiement de microservices sur des plateformes cloud (par exemple, AWS, Azure, GCP)](lecon-3-deloyement-cloud.md)
- **🏠 Sommaire** : [Retour au README](README.md)

---
