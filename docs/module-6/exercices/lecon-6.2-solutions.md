# Solutions - Leçon 6.2 : Orchestration avec Docker Compose et Kubernetes

## Exercice 1 - Étendre Docker Compose pour l'Application Complète

### Énoncé

Mettez à jour le fichier `docker-compose.yml` fourni dans la leçon pour inclure les services suivants pour notre application de réservation touristique :

- `booking-db` (PostgreSQL)
- `booking-service` (Application Node.js, dépend de `booking-db` et `tour-catalog-service`)
- `payment-service` (Application Node.js, assume qu'il n'a pas de base de données dédiée pour cet exercice, mais se connecte à une API externe)
- `rabbitmq` (Utilisation de l'image officielle RabbitMQ, comme vu au Module 5)
- `notification-service` (Application Node.js, dépend de `rabbitmq`)
- `react-frontend` (Nginx servant des fichiers statiques, dépend de `tour-catalog-service` et `booking-service` pour les appels API)

**Exigences** :

- Tous les services doivent être sur le réseau `booking-tourism-app-network`
- Configurer les variables d'environnement appropriées pour les connexions aux bases de données (`DATABASE_URL`) et les URLs de communication inter-services
- Mapper les ports hôte pour `booking-service`, `payment-service`, `notification-service` et `react-frontend` pour éviter les conflits
- Ajouter des volumes pour `booking-db` pour la persistance des données
- Construire et exécuter l'application complète avec `docker-compose up -d`
- Vérifier que tous les conteneurs fonctionnent avec `docker ps`
- Arrêter et supprimer les services avec `docker-compose down -v`

### Solution

#### Fichier : `app/docker-compose.yml` (Complet)

```yaml
# ============================================
# Docker Compose - application de réservation touristique Complète
# ============================================
# Orchestration de tous les microservices et dépendances

version: "3.8"

services:
  # ============================================
  # BASES DE DONNÉES
  # ============================================

  # Base de données Tour Catalog
  tour-catalog-db:
    image: postgres:15-alpine
    container_name: tour-catalog-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: tour_catalog_db
      POSTGRES_USER: catalog_user
      POSTGRES_PASSWORD: catalog_password_dev
    ports:
      - "5432:5432"
    volumes:
      - tour-catalog-data:/var/lib/postgresql/data
    networks:
      - booking-tourism-app-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U catalog_user -d tour_catalog_db"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

  # Base de données Booking Management
  booking-db:
    image: postgres:15-alpine
    container_name: booking-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: booking_db
      POSTGRES_USER: booking_user
      POSTGRES_PASSWORD: booking_password_dev
    ports:
      - "5433:5432" # Port différent pour éviter conflit avec tour-catalog-db
    volumes:
      - booking-data:/var/lib/postgresql/data
    networks:
      - booking-tourism-app-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U booking_user -d booking_db"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

  # ============================================
  # MESSAGE BROKER
  # ============================================

  # RabbitMQ pour messaging asynchrone (Module 5)
  rabbitmq:
    image: rabbitmq:3.12-management-alpine # Inclut l'interface de gestion
    container_name: rabbitmq-broker
    restart: unless-stopped
    environment:
      RABBITMQ_DEFAULT_USER: rabbitmq_user
      RABBITMQ_DEFAULT_PASS: rabbitmq_password_dev
      RABBITMQ_DEFAULT_VHOST: /
    ports:
      - "5672:5672" # Port AMQP pour connexions client
      - "15672:15672" # Interface de gestion web (http://localhost:15672)
    volumes:
      - rabbitmq-data:/var/lib/rabbitmq
    networks:
      - booking-tourism-app-network
    healthcheck:
      test: ["CMD-SHELL", "rabbitmq-diagnostics -q ping"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 40s

  # ============================================
  # MICROSERVICES - BACKEND
  # ============================================

  # Tour Catalog Service
  tour-catalog-service:
    build:
      context: ./tour-catalog-service
      dockerfile: Dockerfile
    container_name: tour-catalog-api
    restart: unless-stopped
    environment:
      DATABASE_URL: postgresql://catalog_user:catalog_password_dev@tour-catalog-db:5432/tour_catalog_db
      NODE_ENV: development
      PORT: 3001
      RABBITMQ_URL: amqp://rabbitmq_user:rabbitmq_password_dev@rabbitmq:5672
      # Configuration CORS pour frontend
      CORS_ORIGIN: http://localhost:3000
    ports:
      - "3001:3001"
    depends_on:
      tour-catalog-db:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
    networks:
      - booking-tourism-app-network
    volumes:
      - ./tour-catalog-service/src:/app/src:ro
    command: npm run dev # Hot-reload en développement

  # Booking Management Service
  booking-service:
    build:
      context: ./booking-management-service
      dockerfile: Dockerfile
    container_name: booking-api
    restart: unless-stopped
    environment:
      DATABASE_URL: postgresql://booking_user:booking_password_dev@booking-db:5432/booking_db
      NODE_ENV: development
      PORT: 3002
      # URLs des autres services pour communication inter-services
      TOUR_CATALOG_SERVICE_URL: http://tour-catalog-service:3001
      PAYMENT_SERVICE_URL: http://payment-service:3004
      RABBITMQ_URL: amqp://rabbitmq_user:rabbitmq_password_dev@rabbitmq:5672
      CORS_ORIGIN: http://localhost:3000
    ports:
      - "3002:3002"
    depends_on:
      booking-db:
        condition: service_healthy
      tour-catalog-service:
        condition: service_started
      rabbitmq:
        condition: service_healthy
    networks:
      - booking-tourism-app-network
    volumes:
      - ./booking-management-service/src:/app/src:ro
    command: npm run dev

  # Payment Service
  payment-service:
    build:
      context: ./payment-service
      dockerfile: Dockerfile
    container_name: payment-api
    restart: unless-stopped
    environment:
      NODE_ENV: development
      PORT: 3004
      # Configuration Stripe (API externe)
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY:-sk_test_51xxx...} # Depuis .env ou défaut
      STRIPE_WEBHOOK_SECRET: ${STRIPE_WEBHOOK_SECRET:-whsec_xxx...}
      # URLs des autres services
      BOOKING_SERVICE_URL: http://booking-service:3002
      RABBITMQ_URL: amqp://rabbitmq_user:rabbitmq_password_dev@rabbitmq:5672
      CORS_ORIGIN: http://localhost:3000
    ports:
      - "3004:3004"
    depends_on:
      rabbitmq:
        condition: service_healthy
    networks:
      - booking-tourism-app-network
    volumes:
      - ./payment-service/src:/app/src:ro
    command: npm run dev

  # Notification Service
  notification-service:
    build:
      context: ./notification-service
      dockerfile: Dockerfile
    container_name: notification-api
    restart: unless-stopped
    environment:
      NODE_ENV: development
      PORT: 3005
      RABBITMQ_URL: amqp://rabbitmq_user:rabbitmq_password_dev@rabbitmq:5672
      # Configuration email (exemple avec SendGrid)
      SENDGRID_API_KEY: ${SENDGRID_API_KEY:-SG.xxx...}
      EMAIL_FROM: noreply@booking-tourism-app.com
    ports:
      - "3005:3005"
    depends_on:
      rabbitmq:
        condition: service_healthy
    networks:
      - booking-tourism-app-network
    volumes:
      - ./notification-service/src:/app/src:ro
    command: npm run dev

  # ============================================
  # FRONTEND
  # ============================================

  # React Frontend (Nginx servant les fichiers statiques)
  react-frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      # Dockerfile multi-stage : build React → serve avec Nginx
    container_name: react-frontend-web
    restart: unless-stopped
    environment:
      # Variables d'environnement injectées au build time
      REACT_APP_API_GATEWAY_URL: http://localhost:3000 # API Gateway (si existant)
      REACT_APP_TOUR_CATALOG_URL: http://localhost:3001
      REACT_APP_BOOKING_URL: http://localhost:3002
      REACT_APP_PAYMENT_URL: http://localhost:3004
    ports:
      - "3000:80" # Nginx écoute sur le port 80 interne
    depends_on:
      - tour-catalog-service
      - booking-service
      - payment-service
    networks:
      - booking-tourism-app-network

  # ============================================
  # API GATEWAY (Optionnel, selon implémentation)
  # ============================================

  # api-gateway:
  #   build:
  #     context: ./api-gateway
  #     dockerfile: Dockerfile
  #   container_name: api-gateway
  #   restart: unless-stopped
  #   environment:
  #     NODE_ENV: development
  #     PORT: 3000
  #     TOUR_CATALOG_SERVICE_URL: http://tour-catalog-service:3001
  #     BOOKING_SERVICE_URL: http://booking-service:3002
  #     PAYMENT_SERVICE_URL: http://payment-service:3004
  #   ports:
  #     - "3000:3000"
  #   depends_on:
  #     - tour-catalog-service
  #     - booking-service
  #     - payment-service
  #   networks:
  #     - booking-tourism-app-network
  #   volumes:
  #     - ./api-gateway/src:/app/src:ro
  #   command: npm run dev

# ============================================
# RÉSEAUX
# ============================================
networks:
  booking-tourism-app-network:
    driver: bridge
    # Configuration supplémentaire possible pour isolation

# ============================================
# VOLUMES
# ============================================
volumes:
  tour-catalog-data:
    driver: local
  booking-data:
    driver: local
  rabbitmq-data:
    driver: local
```

#### Fichier : `app/.env` (Variables d'environnement sensibles)

```bash
# ============================================
# Variables d'Environnement - Développement
# ============================================
# À NE PAS commiter en production !
# Utiliser Docker Secrets ou un gestionnaire de secrets

# Stripe API Keys (Obtenues depuis https://dashboard.stripe.com/)
STRIPE_SECRET_KEY=sk_test_51IynYxAbCdEfGhIjKlMnOpQrStUvWxYz...
STRIPE_WEBHOOK_SECRET=whsec_AbCdEfGhIjKlMnOpQrStUvWxYz...

# SendGrid API Key (Obtenue depuis https://app.sendgrid.com/)
SENDGRID_API_KEY=SG.AbCdEfGhIjKlMnOpQrStUvWxYz...

# JWT Secret (Pour Auth Service si implémenté)
JWT_SECRET=votre_secret_jwt_super_securise_dev
JWT_EXPIRES_IN=1h
```

#### Commandes pour Exécuter l'Application

```bash
# 1. Se placer dans le répertoire contenant docker-compose.yml
cd app

# 2. Charger les variables d'environnement (si fichier .env présent)
# Docker Compose charge automatiquement le fichier .env

# 3. Construire toutes les images (première fois ou après modification Dockerfile)
docker-compose build

# 4. Démarrer tous les services en arrière-plan
docker-compose up -d

# 5. Vérifier que tous les conteneurs sont en cours d'exécution
docker-compose ps

# Sortie attendue :
#
# NAME                      IMAGE                              STATUS         PORTS
# booking-api               app_booking-service                Up             0.0.0.0:3002->3002/tcp
# booking-postgres          postgres:15-alpine                 Up (healthy)   0.0.0.0:5433->5432/tcp
# notification-api          app_notification-service           Up             0.0.0.0:3005->3005/tcp
# payment-api               app_payment-service                Up             0.0.0.0:3004->3004/tcp
# rabbitmq-broker           rabbitmq:3.12-management-alpine    Up (healthy)   0.0.0.0:5672->5672/tcp, 0.0.0.0:15672->15672/tcp
# react-frontend-web        app_react-frontend                 Up             0.0.0.0:3000->80/tcp
# tour-catalog-api          app_tour-catalog-service           Up             0.0.0.0:3001->3001/tcp
# tour-catalog-postgres     postgres:15-alpine                 Up (healthy)   0.0.0.0:5432->5432/tcp

# 6. Voir les logs de tous les services
docker-compose logs -f

# Voir les logs d'un service spécifique
docker-compose logs -f booking-service

# 7. Tester les services
# Tour Catalog API
curl http://localhost:3001/api/tours

# Booking API
curl http://localhost:3002/api/bookings

# Payment API
curl http://localhost:3004/api/health

# RabbitMQ Management Interface
# Ouvrir dans le navigateur : http://localhost:15672
# Credentials : rabbitmq_user / rabbitmq_password_dev

# React Frontend
# Ouvrir dans le navigateur : http://localhost:3000

# 8. Arrêter tous les services (garde les volumes)
docker-compose stop

# 9. Arrêter et supprimer les conteneurs, réseaux (garde les volumes)
docker-compose down

# 10. Arrêter et supprimer conteneurs, réseaux ET volumes
docker-compose down -v

# 11. Supprimer aussi les images construites
docker-compose down -v --rmi all

# 12. Nettoyer complètement le système Docker
docker system prune -a --volumes
```

#### Vérification de la Communication Inter-Services

**Script de test : `app/test-services.sh`**

```bash
#!/bin/bash

# ============================================
# Script de Test - Communication Inter-Services
# ============================================

echo "=========================================="
echo "Test de Communication Inter-Services"
echo "=========================================="

# Couleurs pour output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction de test
test_service() {
    local service_name=$1
    local url=$2

    echo -e "\n${YELLOW}Testing $service_name...${NC}"

    response=$(curl -s -o /dev/null -w "%{http_code}" $url)

    if [ $response -eq 200 ]; then
        echo -e "${GREEN}✓ $service_name is running (HTTP $response)${NC}"
        return 0
    else
        echo -e "${RED}✗ $service_name failed (HTTP $response)${NC}"
        return 1
    fi
}

# Test des services
test_service "Tour Catalog Service" "http://localhost:3001/api/health"
test_service "Booking Service" "http://localhost:3002/api/health"
test_service "Payment Service" "http://localhost:3004/api/health"
test_service "Notification Service" "http://localhost:3005/api/health"
test_service "React Frontend" "http://localhost:3000"

# Test RabbitMQ
echo -e "\n${YELLOW}Testing RabbitMQ Management API...${NC}"
rabbitmq_response=$(curl -s -o /dev/null -w "%{http_code}" -u rabbitmq_user:rabbitmq_password_dev http://localhost:15672/api/overview)

if [ $rabbitmq_response -eq 200 ]; then
    echo -e "${GREEN}✓ RabbitMQ is running (HTTP $rabbitmq_response)${NC}"
else
    echo -e "${RED}✗ RabbitMQ failed (HTTP $rabbitmq_response)${NC}"
fi

# Test bases de données
echo -e "\n${YELLOW}Testing PostgreSQL Databases...${NC}"
docker-compose exec -T tour-catalog-db pg_isready -U catalog_user -d tour_catalog_db
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Tour Catalog DB is ready${NC}"
else
    echo -e "${RED}✗ Tour Catalog DB is not ready${NC}"
fi

docker-compose exec -T booking-db pg_isready -U booking_user -d booking_db
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Booking DB is ready${NC}"
else
    echo -e "${RED}✗ Booking DB is not ready${NC}"
fi

echo -e "\n=========================================="
echo -e "${GREEN}Tests completed!${NC}"
echo "=========================================="
```

**Exécution du script** :

```bash
chmod +x app/test-services.sh
./app/test-services.sh
```

#### Explication des Choix de Configuration

**1. Ports Mappés**

| Service                | Port Interne | Port Hôte | Raison                              |
| ---------------------- | ------------ | --------- | ----------------------------------- |
| tour-catalog-db        | 5432         | 5432      | PostgreSQL standard                 |
| booking-db             | 5432         | 5433      | Éviter conflit avec tour-catalog-db |
| rabbitmq (AMQP)        | 5672         | 5672      | Port AMQP standard                  |
| rabbitmq (Management)  | 15672        | 15672     | Interface web                       |
| tour-catalog-service   | 3001         | 3001      | API REST                            |
| booking-service        | 3002         | 3002      | API REST                            |
| payment-service        | 3004         | 3004      | API REST                            |
| notification-service   | 3005         | 3005      | API REST                            |
| react-frontend (Nginx) | 80           | 3000      | Interface utilisateur               |

**2. Health Checks**

Les health checks garantissent que les services dépendants ne démarrent que lorsque les services dont ils dépendent sont vraiment prêts :

```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U catalog_user -d tour_catalog_db"]
  interval: 10s # Vérifier toutes les 10 secondes
  timeout: 5s # Timeout après 5 secondes
  retries: 5 # 5 tentatives avant de marquer comme unhealthy
  start_period: 10s # Période de grâce de 10s au démarrage
```

**3. Depends On avec Conditions**

```yaml
depends_on:
  tour-catalog-db:
    condition: service_healthy # Attend que le service soit healthy
  tour-catalog-service:
    condition: service_started # Attend seulement le démarrage
```

**4. Volumes pour Hot-Reload en Développement**

```yaml
volumes:
  - ./tour-catalog-service/src:/app/src:ro # Read-only
```

Permet à nodemon de détecter les changements de code et de redémarrer automatiquement le serveur.

**5. Variables d'Environnement pour Communication Inter-Services**

```yaml
environment:
  TOUR_CATALOG_SERVICE_URL: http://tour-catalog-service:3001
```

Utilise le **nom du service** comme hostname grâce à la résolution DNS de Docker Compose.

#### Dockerfile Exemple pour React Frontend (Multi-Stage)

**Fichier : `app/frontend/Dockerfile`**

```dockerfile
# ============================================
# Stage 1 : Build de l'application React
# ============================================
FROM node:18-alpine AS builder

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm ci --only=production

# Copier le code source
COPY . .

# Variables d'environnement pour le build
ARG REACT_APP_TOUR_CATALOG_URL
ARG REACT_APP_BOOKING_URL
ARG REACT_APP_PAYMENT_URL
ENV REACT_APP_TOUR_CATALOG_URL=$REACT_APP_TOUR_CATALOG_URL
ENV REACT_APP_BOOKING_URL=$REACT_APP_BOOKING_URL
ENV REACT_APP_PAYMENT_URL=$REACT_APP_PAYMENT_URL

# Build de l'application pour production
RUN npm run build

# ============================================
# Stage 2 : Servir avec Nginx
# ============================================
FROM nginx:1.25-alpine

# Copier la configuration Nginx personnalisée (si nécessaire)
COPY nginx.conf /etc/nginx/nginx.conf

# Copier les fichiers buildés depuis le stage builder
COPY --from=builder /app/build /usr/share/nginx/html

# Exposer le port 80
EXPOSE 80

# Nginx démarre automatiquement avec l'image
CMD ["nginx", "-g", "daemon off;"]
```

**Fichier : `app/frontend/nginx.conf`**

```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Configuration pour React Router (Single Page Application)
    server {
        listen 80;
        server_name localhost;

        root /usr/share/nginx/html;
        index index.html;

        # Gérer les routes React (SPA)
        location / {
            try_files $uri $uri/ /index.html;
        }

        # Configuration pour les assets statiques
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # Disable cache pour index.html
        location = /index.html {
            add_header Cache-Control "no-cache, no-store, must-revalidate";
        }
    }
}
```

---

## Exercice 2 - Identification des Composants Kubernetes

### Énoncé

Pour chaque besoin suivant de notre application de réservation touristique, identifiez la ressource Kubernetes la plus appropriée (Pod, Deployment, Service, Ingress, ConfigMap, Secret, Volume) :

1. Assurer que 5 instances du microservice `payment-service` sont toujours en cours d'exécution et gérer les mises à jour gracieusement
2. Rendre le `tour-catalog-service` accessible en interne aux autres microservices dans le cluster via un nom DNS stable
3. Stocker la clé API Stripe pour le `payment-service` de manière sécurisée
4. Définir le niveau de logging (info, debug) pour le `notification-service` sans reconstruire son image Docker
5. Exposer l'application `react-frontend` à Internet, gérant le trafic http://yourdomain.com/
6. Garantir un stockage persistant pour l'instance PostgreSQL `booking-db`
7. La plus petite unité qui encapsule un seul conteneur `tour-catalog-service` et ses configurations associées

### Solution

| #     | Besoin                                                                                           | Ressource Kubernetes                                    | Justification                                                                                                                                                                                                                    |
| ----- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1** | Assurer 5 instances de `payment-service` toujours en cours d'exécution et gérer les mises à jour | **Deployment**                                          | Un Deployment gère le nombre de répliques (5), assure leur disponibilité et gère les rolling updates et rollbacks. Il crée et supervise automatiquement les Pods.                                                                |
| **2** | Rendre `tour-catalog-service` accessible en interne via un nom DNS stable                        | **Service (ClusterIP)**                                 | Un Service de type ClusterIP expose le service sur une IP interne et fournit un nom DNS stable (`tour-catalog-service.default.svc.cluster.local`). Les autres microservices peuvent l'appeler même si les Pods changent.         |
| **3** | Stocker la clé API Stripe de manière sécurisée                                                   | **Secret**                                              | Les Secrets sont conçus pour stocker des données sensibles comme des clés API, mots de passe, tokens. Ils sont encodés (base64) et peuvent être chiffrés au repos avec des configurations supplémentaires.                       |
| **4** | Définir le niveau de logging sans reconstruire l'image                                           | **ConfigMap**                                           | Un ConfigMap stocke des données de configuration non sensibles (niveaux de log, feature flags, URLs). Il permet de découpler la configuration du code et de la modifier sans rebuild.                                            |
| **5** | Exposer `react-frontend` à Internet via http://yourdomain.com/                                   | **Ingress**                                             | Un Ingress gère l'accès HTTP/HTTPS externe, fournit le routage basé sur l'hôte/chemin, et la terminaison SSL. Il expose l'application publiquement avec un seul point d'entrée.                                                  |
| **6** | Garantir un stockage persistant pour `booking-db` PostgreSQL                                     | **PersistentVolume (PV) + PersistentVolumeClaim (PVC)** | Les PV et PVC fournissent un stockage persistant qui survit aux redémarrages et migrations de Pods. Pour les bases de données, c'est essentiel pour l'intégrité des données. On utilise généralement un StatefulSet avec un PVC. |
| **7** | Plus petite unité encapsulant un conteneur `tour-catalog-service`                                | **Pod**                                                 | Un Pod est la plus petite unité déployable dans Kubernetes. Il encapsule un ou plusieurs conteneurs qui partagent réseau et stockage.                                                                                            |

### Explications Détaillées

#### **1. Deployment pour payment-service**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service-deployment
spec:
  replicas: 5 # 5 instances en permanence
  selector:
    matchLabels:
      app: payment-service
  template:
    metadata:
      labels:
        app: payment-service
    spec:
      containers:
        - name: payment-service
          image: yourusername/payment-service:1.0.0
          ports:
            - containerPort: 3004
```

**Avantages** :

- ✅ Garantit 5 répliques en tout temps
- ✅ Remplace automatiquement les Pods défaillants
- ✅ Rolling updates (déploiement progressif sans downtime)
- ✅ Rollback facile en cas de problème

#### **2. Service ClusterIP pour tour-catalog-service**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: tour-catalog-service
spec:
  type: ClusterIP # Accès interne uniquement
  selector:
    app: tour-catalog-service
  ports:
    - protocol: TCP
      port: 3001 # Port du Service
      targetPort: 3001 # Port du Pod
```

**Accès depuis un autre service** :

```javascript
// Dans booking-service, on peut appeler :
const response = await fetch("http://tour-catalog-service:3001/api/tours");

// Ou avec FQDN complet :
const response = await fetch(
  "http://tour-catalog-service.default.svc.cluster.local:3001/api/tours"
);
```

#### **3. Secret pour clé API Stripe**

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: payment-secrets
type: Opaque
data:
  # Valeurs encodées en base64
  stripe-api-key: c2tfdGVzdF81MUl5bll4QWJDZEVmR2hJaktsTW5PcFFyU3RVdld4WXo=
  stripe-webhook-secret: d2hzZWNfQWJDZEVmR2hJaktsTW5PcFFyU3RVdld4WXo=
```

**Utilisation dans un Pod** :

```yaml
spec:
  containers:
    - name: payment-service
      image: yourusername/payment-service:1.0.0
      env:
        - name: STRIPE_SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: payment-secrets
              key: stripe-api-key
        - name: STRIPE_WEBHOOK_SECRET
          valueFrom:
            secretKeyRef:
              name: payment-secrets
              key: stripe-webhook-secret
```

**Créer le Secret depuis la ligne de commande** :

```bash
# Depuis des valeurs littérales
kubectl create secret generic payment-secrets \
  --from-literal=stripe-api-key=sk_test_51xxx... \
  --from-literal=stripe-webhook-secret=whsec_xxx...

# Depuis un fichier
kubectl create secret generic payment-secrets \
  --from-env-file=.env.production
```

#### **4. ConfigMap pour niveau de logging**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: notification-config
data:
  LOG_LEVEL: "debug" # Peut être changé sans rebuild
  EMAIL_FROM: "noreply@booking-tourism-app.com"
  SMTP_HOST: "smtp.sendgrid.net"
  SMTP_PORT: "587"
```

**Utilisation dans un Pod** :

```yaml
spec:
  containers:
    - name: notification-service
      image: yourusername/notification-service:1.0.0
      envFrom:
        - configMapRef:
            name: notification-config
```

**Modification du niveau de log sans rebuild** :

```bash
# Éditer le ConfigMap
kubectl edit configmap notification-config

# Ou avec patch
kubectl patch configmap notification-config \
  -p '{"data":{"LOG_LEVEL":"info"}}'

# Redémarrer les Pods pour appliquer (pas de rebuild)
kubectl rollout restart deployment notification-service-deployment
```

#### **5. Ingress pour react-frontend**

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: tourism-app-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - booking-tourism-app.com
      secretName: booking-tourism-app-tls
  rules:
    - host: booking-tourism-app.com
      http:
        paths:
          # Frontend React
          - path: /
            pathType: Prefix
            backend:
              service:
                name: react-frontend-service
                port:
                  number: 80
          # API Tour Catalog
          - path: /api/tours
            pathType: Prefix
            backend:
              service:
                name: tour-catalog-service
                port:
                  number: 3001
          # API Bookings
          - path: /api/bookings
            pathType: Prefix
            backend:
              service:
                name: booking-service
                port:
                  number: 3002
          # API Payments
          - path: /api/payments
            pathType: Prefix
            backend:
              service:
                name: payment-service
                port:
                  number: 3004
```

**Flux de requête** :

```
User → https://booking-tourism-app.com/ → Ingress Controller → react-frontend-service → react-frontend Pod
User → https://booking-tourism-app.com/api/tours → Ingress Controller → tour-catalog-service → tour-catalog Pod
```

#### **6. PersistentVolume et PersistentVolumeClaim pour booking-db**

**PersistentVolumeClaim (ce que le Pod demande)** :

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: booking-db-pvc
spec:
  accessModes:
    - ReadWriteOnce # Lecture/écriture par un seul nœud
  resources:
    requests:
      storage: 10Gi # Demande 10 GB
  storageClassName: gp2 # AWS EBS (exemple)
```

**StatefulSet pour booking-db utilisant le PVC** :

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: booking-db
spec:
  serviceName: booking-db-service
  replicas: 1
  selector:
    matchLabels:
      app: booking-db
  template:
    metadata:
      labels:
        app: booking-db
    spec:
      containers:
        - name: postgres
          image: postgres:15-alpine
          env:
            - name: POSTGRES_DB
              value: booking_db
            - name: POSTGRES_USER
              valueFrom:
                secretKeyRef:
                  name: booking-db-secrets
                  key: username
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: booking-db-secrets
                  key: password
          ports:
            - containerPort: 5432
          volumeMounts:
            - name: postgres-data
              mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
    - metadata:
        name: postgres-data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 10Gi
```

**Pourquoi StatefulSet pour les bases de données ?**

- ✅ Identifiants réseau stables (booking-db-0, booking-db-1, etc.)
- ✅ Stockage persistant attaché à chaque Pod
- ✅ Déploiement et scaling ordonnés
- ✅ Garanties pour les applications stateful

#### **7. Pod pour tour-catalog-service**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: tour-catalog-pod
  labels:
    app: tour-catalog-service
spec:
  containers:
    - name: tour-catalog
      image: yourusername/tour-catalog-service:1.0.0
      ports:
        - containerPort: 3001
      env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: tour-catalog-secrets
              key: database-url
        - name: PORT
          value: "3001"
```

**Note** : En pratique, on ne crée jamais de Pods directement. On utilise toujours des contrôleurs comme Deployment ou StatefulSet qui créent et gèrent les Pods.

---

## Exercice 3 - Esquisse de Configuration Kubernetes

### Énoncé

Imaginez que vous préparez le déploiement du `tour-catalog-service` sur Kubernetes. Créez les structures YAML pour un Kubernetes Deployment et un Kubernetes Service qui accompliraient les objectifs suivants :

**Deployment** :

- Nom : `tour-catalog-deployment`
- Répliques : 3
- Image du conteneur : `yourusername/tour-catalog-service:latest`
- Port du conteneur : 3000
- Variable d'environnement : `DATABASE_URL` pointant vers un `tour-catalog-db-service` assumé au port 5432

**Service** :

- Nom : `tour-catalog-service`
- Type : ClusterIP
- Port : 3000
- Port cible du Pod : 3000

### Solution

#### Fichier : `k8s/tour-catalog-deployment.yaml`

```yaml
# ============================================
# Kubernetes Deployment - Tour Catalog Service
# ============================================
# Gère 3 répliques du microservice Tour Catalog

apiVersion: apps/v1
kind: Deployment
metadata:
  name: tour-catalog-deployment
  namespace: default # Ou namespace dédié : tourism-app
  labels:
    app: tour-catalog-service
    tier: backend
    version: v1
spec:
  # Nombre de répliques (instances) du Pod
  replicas: 3

  # Stratégie de déploiement lors des mises à jour
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1 # Max 1 Pod peut être indisponible pendant l'update
      maxSurge: 1 # Max 1 Pod supplémentaire peut être créé pendant l'update

  # Sélecteur pour identifier les Pods gérés par ce Deployment
  selector:
    matchLabels:
      app: tour-catalog-service

  # Template du Pod
  template:
    metadata:
      labels:
        app: tour-catalog-service
        tier: backend
        version: v1
    spec:
      # Configuration des conteneurs
      containers:
        - name: tour-catalog
          image: yourusername/tour-catalog-service:latest
          imagePullPolicy: Always # Toujours pull la dernière version du tag :latest

          # Port exposé par le conteneur
          ports:
            - name: http
              containerPort: 3001
              protocol: TCP

          # Variables d'environnement
          env:
            - name: DATABASE_URL
              value: postgresql://catalog_user:catalog_pass@tour-catalog-db-service:5432/tour_catalog_db
            - name: PORT
              value: "3001"
            - name: NODE_ENV
              value: "production"
            - name: RABBITMQ_URL
              valueFrom:
                configMapKeyRef:
                  name: app-config
                  key: rabbitmq-url

          # Health checks
          # Liveness probe : vérifie que le conteneur est vivant
          livenessProbe:
            httpGet:
              path: /api/health
              port: 3001
            initialDelaySeconds: 30 # Attendre 30s après le démarrage
            periodSeconds: 10 # Vérifier toutes les 10s
            timeoutSeconds: 5 # Timeout après 5s
            failureThreshold: 3 # Redémarrer après 3 échecs consécutifs

          # Readiness probe : vérifie que le conteneur est prêt à recevoir du trafic
          readinessProbe:
            httpGet:
              path: /api/ready
              port: 3001
            initialDelaySeconds: 10
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 3

          # Limites de ressources
          resources:
            requests:
              memory: "256Mi" # Minimum requis
              cpu: "250m" # 0.25 CPU core
            limits:
              memory: "512Mi" # Maximum autorisé
              cpu: "500m" # 0.5 CPU core

          # Variables d'environnement depuis ConfigMap et Secret
          envFrom:
            - configMapRef:
                name: tour-catalog-config
            - secretRef:
                name: tour-catalog-secrets

      # Configuration de redémarrage
      restartPolicy: Always

      # Affinity rules pour distribuer les Pods sur différents nœuds
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchExpressions:
                    - key: app
                      operator: In
                      values:
                        - tour-catalog-service
                topologyKey: kubernetes.io/hostname

---
# ============================================
# ConfigMap - Tour Catalog Configuration
# ============================================
apiVersion: v1
kind: ConfigMap
metadata:
  name: tour-catalog-config
  namespace: default
data:
  LOG_LEVEL: "info"
  API_VERSION: "v1"
  CORS_ORIGIN: "https://booking-tourism-app.com"
  rabbitmq-url: "amqp://rabbitmq-service:5672"

---
# ============================================
# Secret - Tour Catalog Sensitive Data
# ============================================
apiVersion: v1
kind: Secret
metadata:
  name: tour-catalog-secrets
  namespace: default
type: Opaque
data:
  # Valeurs encodées en base64
  # Pour encoder : echo -n 'valeur' | base64
  DATABASE_PASSWORD: Y2F0YWxvZ19wYXNzd29yZA==
  JWT_SECRET: dm90cmVfc2VjcmV0X2p3dF9zdXBlcl9zZWN1cmlzZQ==
```

#### Fichier : `k8s/tour-catalog-service.yaml`

```yaml
# ============================================
# Kubernetes Service - Tour Catalog Service
# ============================================
# Expose le Deployment en interne au cluster

apiVersion: v1
kind: Service
metadata:
  name: tour-catalog-service
  namespace: default
  labels:
    app: tour-catalog-service
    tier: backend
spec:
  # Type de Service : ClusterIP pour accès interne uniquement
  type: ClusterIP

  # Sélecteur pour identifier les Pods backend
  selector:
    app: tour-catalog-service

  # Configuration des ports
  ports:
    - name: http
      protocol: TCP
      port: 3001 # Port sur lequel le Service écoute
      targetPort: 3001 # Port sur lequel le Pod écoute
      # Pas de nodePort car c'est un ClusterIP

  # Session affinity (optionnel)
  sessionAffinity: None # Ou "ClientIP" pour sticky sessions
```

#### Explication Détaillée des Configurations

##### **Deployment - Sections Clés**

**1. Stratégie de Rolling Update**

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxUnavailable: 1
    maxSurge: 1
```

**Comportement** :

- Lors d'une mise à jour de v1 à v2 avec 3 répliques :
  1. Kubernetes lance 1 nouveau Pod v2 (`maxSurge: 1`) → Total : 4 Pods
  2. Une fois v2 ready, termine 1 Pod v1 (`maxUnavailable: 1`) → Total : 3 Pods
  3. Répète jusqu'à ce que tous les Pods soient v2
  4. **Zéro downtime garanti**

**2. Health Checks**

**Liveness Probe** (est-ce que le conteneur fonctionne ?) :

```yaml
livenessProbe:
  httpGet:
    path: /api/health
    port: 3001
  initialDelaySeconds: 30
  periodSeconds: 10
  failureThreshold: 3
```

- Si l'endpoint `/api/health` ne répond pas après 3 tentatives consécutives, Kubernetes **redémarre le Pod**

**Readiness Probe** (est-ce que le conteneur est prêt pour le trafic ?) :

```yaml
readinessProbe:
  httpGet:
    path: /api/ready
    port: 3001
  initialDelaySeconds: 10
  periodSeconds: 5
  failureThreshold: 3
```

- Si l'endpoint `/api/ready` ne répond pas, Kubernetes **retire le Pod du Service** (pas de trafic envoyé)
- Le Pod n'est pas redémarré, juste mis en quarantaine temporairement

**Implémentation dans Node.js** :

```javascript
// src/routes/health.js
const express = require("express");
const router = express.Router();

// Liveness probe
router.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Readiness probe
router.get("/ready", async (req, res) => {
  try {
    // Vérifier la connexion à la base de données
    await db.query("SELECT 1");

    // Vérifier RabbitMQ (si applicable)
    if (rabbitMQConnection && !rabbitMQConnection.isConnected()) {
      throw new Error("RabbitMQ not connected");
    }

    res.status(200).json({ status: "ready" });
  } catch (error) {
    res.status(503).json({ status: "not ready", error: error.message });
  }
});

module.exports = router;
```

**3. Resource Requests et Limits**

```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

**Requests** : Ce dont le Pod a besoin pour démarrer

- Kubernetes planifie le Pod uniquement sur un nœud ayant ces ressources disponibles

**Limits** : Maximum que le Pod peut utiliser

- Si le Pod dépasse la limite mémoire, il est tué (OOMKilled)
- Si le Pod dépasse la limite CPU, il est throttled (ralenti)

**4. Pod Anti-Affinity**

```yaml
affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          labelSelector:
            matchExpressions:
              - key: app
                operator: In
                values:
                  - tour-catalog-service
          topologyKey: kubernetes.io/hostname
```

**Objectif** : Distribuer les 3 Pods sur des nœuds différents pour la haute disponibilité

- Si un nœud tombe, les autres Pods sur d'autres nœuds continuent de fonctionner
- `preferred` : Kubernetes essaie de respecter cette règle, mais ne garantit pas (vs `required`)

##### **Service - Fonctionnement**

**1. ClusterIP** (Type par défaut)

```yaml
type: ClusterIP
```

- Le Service obtient une IP virtuelle interne (ex: 10.96.0.10)
- Accessible uniquement depuis l'intérieur du cluster
- DNS automatique : `tour-catalog-service.default.svc.cluster.local`

**2. Sélecteur**

```yaml
selector:
  app: tour-catalog-service
```

- Le Service route le trafic vers tous les Pods ayant le label `app: tour-catalog-service`
- Load balancing automatique entre les 3 Pods

**3. Port Mapping**

```yaml
ports:
  - port: 3001 # Port du Service
    targetPort: 3001 # Port du Pod
```

**Flux de trafic** :

```
booking-service Pod
    ↓ (appelle http://tour-catalog-service:3001)
tour-catalog-service (10.96.0.10:3001)
    ↓ (load balancing)
    ├→ tour-catalog-pod-1 (10.244.1.5:3001)
    ├→ tour-catalog-pod-2 (10.244.2.8:3001)
    └→ tour-catalog-pod-3 (10.244.3.12:3001)
```

#### Commandes Kubernetes pour Déployer

```bash
# 1. Créer le namespace (optionnel)
kubectl create namespace tourism-app

# 2. Appliquer les configurations
kubectl apply -f k8s/tour-catalog-deployment.yaml -n tourism-app
kubectl apply -f k8s/tour-catalog-service.yaml -n tourism-app

# 3. Vérifier le déploiement
kubectl get deployments -n tourism-app
kubectl get pods -n tourism-app
kubectl get services -n tourism-app

# Sortie attendue :
# NAME                        READY   STATUS    RESTARTS   AGE
# tour-catalog-deployment-xxxx-1   1/1     Running   0          30s
# tour-catalog-deployment-xxxx-2   1/1     Running   0          30s
# tour-catalog-deployment-xxxx-3   1/1     Running   0          30s

# 4. Voir les détails du Deployment
kubectl describe deployment tour-catalog-deployment -n tourism-app

# 5. Voir les détails du Service
kubectl describe service tour-catalog-service -n tourism-app

# 6. Voir les logs d'un Pod
kubectl logs tour-catalog-deployment-xxxx-1 -n tourism-app

# Suivre les logs en temps réel
kubectl logs -f tour-catalog-deployment-xxxx-1 -n tourism-app

# 7. Tester le Service depuis un Pod temporaire
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -n tourism-app -- \
  curl http://tour-catalog-service:3001/api/health

# 8. Mettre à jour le Deployment (nouvelle image)
kubectl set image deployment/tour-catalog-deployment \
  tour-catalog=yourusername/tour-catalog-service:v2.0.0 \
  -n tourism-app

# Voir le statut du rollout
kubectl rollout status deployment/tour-catalog-deployment -n tourism-app

# 9. Rollback si problème
kubectl rollout undo deployment/tour-catalog-deployment -n tourism-app

# 10. Scaler le Deployment
kubectl scale deployment tour-catalog-deployment --replicas=5 -n tourism-app

# 11. Autoscaling basé sur CPU
kubectl autoscale deployment tour-catalog-deployment \
  --min=3 --max=10 --cpu-percent=70 \
  -n tourism-app

# Voir l'état de l'autoscaler
kubectl get hpa -n tourism-app

# 12. Supprimer les ressources
kubectl delete -f k8s/tour-catalog-deployment.yaml -n tourism-app
kubectl delete -f k8s/tour-catalog-service.yaml -n tourism-app
```

#### Fichier : `k8s/kustomization.yaml` (Optionnel - Organisation)

```yaml
# Kustomize permet de gérer plusieurs environnements facilement
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: tourism-app

commonLabels:
  project: tourism-app
  managed-by: kustomize

resources:
  - tour-catalog-deployment.yaml
  - tour-catalog-service.yaml
  - booking-deployment.yaml
  - booking-service.yaml
  - payment-deployment.yaml
  - payment-service.yaml

configMapGenerator:
  - name: app-config
    literals:
      - LOG_LEVEL=info
      - API_VERSION=v1

secretGenerator:
  - name: app-secrets
    envs:
      - secrets.env
```

**Déployer avec Kustomize** :

```bash
kubectl apply -k k8s/
```

---

## Récapitulatif des Exercices

### Compétences Acquises

✅ **Docker Compose** :

- Écriture de fichiers `docker-compose.yml` complexes avec multiples services
- Configuration de réseaux et volumes pour persistance
- Health checks et dépendances entre services
- Variables d'environnement et communication inter-services

✅ **Kubernetes - Compréhension** :

- Identification des ressources appropriées pour chaque besoin
- Distinction entre Pod, Deployment, Service, Ingress, ConfigMap, Secret, Volume
- Compréhension des types de Services (ClusterIP, NodePort, LoadBalancer)

✅ **Kubernetes - Configuration** :

- Écriture de manifests YAML pour Deployment et Service
- Configuration de health checks (liveness, readiness)
- Gestion des ressources (requests, limits)
- Stratégies de déploiement (RollingUpdate)
- Pod affinity/anti-affinity pour haute disponibilité

### Points Clés à Retenir

| Concept            | Docker Compose | Kubernetes       |
| ------------------ | -------------- | ---------------- |
| **Complexité**     | Faible         | Élevée           |
| **Cas d'usage**    | Dev local      | Production cloud |
| **Scaling**        | Manuel         | Automatique      |
| **Haute dispo**    | Non            | Oui              |
| **Self-healing**   | Non            | Oui              |
| **Load balancing** | Basique        | Avancé           |
| **Multi-nœuds**    | Non            | Oui              |
| **Configuration**  | YAML simple    | YAML + kubectl   |

### Prochaines Étapes Suggérées

1. **Déployer sur Minikube** : Installer Minikube et déployer les configurations K8s localement
2. **Ajouter un Ingress** : Exposer les services via un Ingress Controller (Nginx)
3. **Intégrer CI/CD** : Automatiser le déploiement avec GitHub Actions ou GitLab CI
4. **Monitoring** : Ajouter Prometheus et Grafana pour surveiller les métriques
5. **Logging centralisé** : Intégrer ELK Stack (Elasticsearch, Logstash, Kibana)

---

**🎉 Félicitations !** Vous maîtrisez maintenant l'orchestration de conteneurs avec Docker Compose et les fondamentaux de Kubernetes !
