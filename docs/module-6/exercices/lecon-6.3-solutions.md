# Solutions - Leçon 6.3 : Déploiement de Microservices sur Plateformes Cloud

> **Note importante sur le choix des régions** : Toutes les configurations de ce document utilisent des régions européennes proches de Bruxelles pour :
>
> - ✅ **Réduire la latence** : Proximité géographique pour de meilleures performances
> - ✅ **Conformité RGPD** : Stockage des données dans l'Union Européenne
> - ✅ **Coûts optimisés** : Éviter les frais de transfert de données inter-régions
>
> **Régions utilisées** :
>
> - **Azure** : `westeurope` (Pays-Bas) et `francecentral` (France)
> - **GCP** : `europe-west1` (Belgique - St. Ghislain) - région la plus proche de Bruxelles
> - **AWS** : `eu-west-3` (Paris, France) - région la plus proche de Bruxelles

---

## Exercice 1 - Planification de Scénario

### Énoncé

Vous êtes chargé de déployer le Notification Microservice pour notre application de réservation touristique. Ce service utilise RabbitMQ (Module 5) pour consommer des événements et une base de données NoSQL pour les préférences utilisateurs.

**Tâche** : Décrivez une stratégie de déploiement appropriée en utilisant :

- **Option A** : Azure App Service (PaaS)
- **Option B** : Google Kubernetes Engine (GKE)

Détaillez les étapes, le choix de la base de données, les considérations réseau et comment sécuriser la connexion RabbitMQ.

---

### Solution

#### Option A : Déploiement avec Azure App Service (PaaS)

##### 1. Vue d'Ensemble de l'Architecture

```
┌───────────────────────────────────────────────────────┐
│              Azure App Service (PaaS)                 │
│                                                       │
│  ┌────────────────────────────────────────────────┐   │
│  │     App Service Plan (Standard S1)             │   │
│  │     ├─ Notification Service (Node.js)          │   │
│  │     ├─ Auto-scaling (1-10 instances)           │   │
│  │     └─ Health checks intégrés                  │   │
│  └────────────────────────────────────────────────┘   │
│                           │                           │
│         ┌─────────────────┼─────────────────┐         │
│         ▼                 ▼                 ▼         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Azure Service│  │ Cosmos DB    │  │ Virtual      │ │
│  │ Bus (RabbitMQ│  │ (NoSQL)      │  │ Network      │ │
│  │ alternative) │  │              │  │ (VNet)       │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└───────────────────────────────────────────────────────┘
```

##### 2. Choix de la Base de Données

**Azure Cosmos DB (NoSQL)** :

- ✅ Fully managed, auto-scaling
- ✅ Support de l'API MongoDB ou SQL (Document)
- ✅ Distribution globale avec réplication multi-région
- ✅ SLA 99.999% de disponibilité
- ✅ Parfait pour les préférences utilisateurs (structure flexible)

**Configuration Cosmos DB** :

```bash
# Créer un compte Cosmos DB
az cosmosdb create \
  --name booking-tourism-notification-db \
  --resource-group booking-tourism-app-rg \
  --default-consistency-level Session \
  --locations regionName=westeurope failoverPriority=0 \
  --locations regionName=francecentral failoverPriority=1

# Créer une base de données
az cosmosdb sql database create \
  --account-name booking-tourism-notification-db \
  --resource-group booking-tourism-app-rg \
  --name notification-preferences

# Créer un conteneur pour les préférences
az cosmosdb sql container create \
  --account-name booking-tourism-notification-db \
  --resource-group booking-tourism-app-rg \
  --database-name notification-preferences \
  --name user-preferences \
  --partition-key-path "/userId" \
  --throughput 400
```

##### 3. Configuration RabbitMQ / Service Bus

**Option 1 : Azure Service Bus (Alternative managée à RabbitMQ)** :

Azure Service Bus est un service de messagerie managé qui peut remplacer RabbitMQ :

```bash
# Créer un namespace Service Bus
az servicebus namespace create \
  --name booking-tourism-notification-sb \
  --resource-group booking-tourism-app-rg \
  --location westeurope \
  --sku Standard

# Créer une queue pour les événements de notification
az servicebus queue create \
  --namespace-name booking-tourism-notification-sb \
  --resource-group booking-tourism-app-rg \
  --name notification-events \
  --max-delivery-count 10 \
  --lock-duration PT5M
```

**Option 2 : RabbitMQ sur Azure Container Instances (si RabbitMQ est requis)** :

Si vous devez absolument utiliser RabbitMQ, déployez-le sur Azure Container Instances :

```bash
# Créer un groupe de conteneurs pour RabbitMQ
az container create \
  --name rabbitmq-container \
  --resource-group booking-tourism-app-rg \
  --image rabbitmq:3.12-management-alpine \
  --cpu 1 \
  --memory 1.5 \
  --ports 5672 15672 \
  --environment-variables \
    RABBITMQ_DEFAULT_USER=rabbitmq_user \
    RABBITMQ_DEFAULT_PASS=SecurePassword123! \
  --ip-address Private \
  --vnet tourism-app-vnet \
  --subnet app-subnet
```

##### 4. Création de l'App Service

```bash
# Créer un App Service Plan
az appservice plan create \
  --name notification-service-plan \
  --resource-group booking-tourism-app-rg \
  --sku S1 \
  --is-linux

# Créer l'App Service
az webapp create \
  --name booking-tourism-notification-service \
  --resource-group booking-tourism-app-rg \
  --plan notification-service-plan \
  --runtime "NODE|18-lts"

# Configurer les variables d'environnement
az webapp config appsettings set \
  --name booking-tourism-notification-service \
  --resource-group booking-tourism-app-rg \
  --settings \
    NODE_ENV=production \
    PORT=8080 \
    COSMOS_DB_ENDPOINT="https://booking-tourism-notification-db.documents.azure.com:443/" \
    COSMOS_DB_KEY="<key-from-azure-portal>" \
    COSMOS_DB_DATABASE="notification-preferences" \
    COSMOS_DB_CONTAINER="user-preferences" \
    SERVICE_BUS_CONNECTION_STRING="<connection-string>" \
    SERVICE_BUS_QUEUE_NAME="notification-events"
```

##### 5. Configuration Réseau et Sécurité

**Virtual Network Integration** :

```bash
# Intégrer l'App Service au VNet pour accès privé
az webapp vnet-integration add \
  --name booking-tourism-notification-service \
  --resource-group booking-tourism-app-rg \
  --vnet tourism-app-vnet \
  --subnet app-subnet
```

**Private Endpoint pour Cosmos DB** :

```bash
# Créer un Private Endpoint pour Cosmos DB
az network private-endpoint create \
  --name cosmos-db-pe \
  --resource-group booking-tourism-app-rg \
  --vnet-name tourism-app-vnet \
  --subnet app-subnet \
  --private-connection-resource-id "/subscriptions/<sub-id>/resourceGroups/booking-tourism-app-rg/providers/Microsoft.DocumentDB/databaseAccounts/booking-tourism-notification-db" \
  --group-id Sql \
  --connection-name cosmos-db-connection
```

**Managed Identity pour accès sécurisé** :

```bash
# Activer Managed Identity
az webapp identity assign \
  --name booking-tourism-notification-service \
  --resource-group booking-tourism-app-rg

# Accorder l'accès à Cosmos DB via Managed Identity
az cosmosdb sql role assignment create \
  --account-name booking-tourism-notification-db \
  --resource-group booking-tourism-app-rg \
  --role-definition-name "Cosmos DB Built-in Data Contributor" \
  --principal-id "<managed-identity-principal-id>"
```

##### 6. Code d'Intégration

**Fichier : `src/config/azureConfig.js`**

```javascript
const { CosmosClient } = require("@azure/cosmos");
const { ServiceBusClient } = require("@azure/service-bus");

// Configuration Cosmos DB
const cosmosClient = new CosmosClient({
  endpoint: process.env.COSMOS_DB_ENDPOINT,
  key: process.env.COSMOS_DB_KEY, // Ou utiliser Managed Identity
});

const database = cosmosClient.database(process.env.COSMOS_DB_DATABASE);
const container = database.container(process.env.COSMOS_DB_CONTAINER);

// Configuration Service Bus
const serviceBusClient = new ServiceBusClient(
  process.env.SERVICE_BUS_CONNECTION_STRING
);
const receiver = serviceBusClient.createReceiver(
  process.env.SERVICE_BUS_QUEUE_NAME
);

// Consommer les messages
async function consumeNotifications() {
  const messages = await receiver.receiveMessages(10, {
    maxWaitTimeInMs: 5000,
  });

  for (const message of messages) {
    try {
      await processNotification(message.body);
      await receiver.completeMessage(message);
    } catch (error) {
      console.error("Error processing notification:", error);
      await receiver.abandonMessage(message);
    }
  }
}

module.exports = {
  cosmosClient,
  container,
  serviceBusClient,
  receiver,
  consumeNotifications,
};
```

##### 7. Déploiement

```bash
# Déployer via Azure CLI (depuis le répertoire du service)
az webapp up \
  --name booking-tourism-notification-service \
  --resource-group booking-tourism-app-rg \
  --runtime "NODE|18-lts"

# Ou via Git
az webapp deployment source config-local-git \
  --name booking-tourism-notification-service \
  --resource-group booking-tourism-app-rg

# Push vers le repository Git
git remote add azure <git-url-from-azure>
git push azure main
```

##### 8. Monitoring et Logging

```bash
# Activer Application Insights
az monitor app-insights component create \
  --app booking-tourism-notification-insights \
  --location westeurope \
  --resource-group booking-tourism-app-rg

# Lier Application Insights à l'App Service
az webapp config appsettings set \
  --name booking-tourism-notification-service \
  --resource-group booking-tourism-app-rg \
  --settings \
    APPINSIGHTS_INSTRUMENTATIONKEY="<instrumentation-key>"
```

**Avantages de l'Option A (Azure App Service)** :

- ✅ Déploiement rapide et simple
- ✅ Auto-scaling intégré
- ✅ Gestion automatique des mises à jour et patching
- ✅ Intégration native avec les services Azure
- ✅ Monitoring avec Application Insights

**Inconvénients** :

- ❌ Moins de contrôle sur l'infrastructure
- ❌ Coût potentiellement plus élevé à grande échelle
- ❌ Migration de RabbitMQ vers Service Bus peut nécessiter des modifications de code

---

#### Option B : Déploiement avec Google Kubernetes Engine (GKE)

##### 1. Vue d'Ensemble de l'Architecture

```
┌────────────────────────────────────────────────────────┐
│         Google Kubernetes Engine (GKE)                 │
│                                                        │
│  ┌────────────────────────────────────────────────┐    │
│  │  Namespace: notification-service               │    │
│  │                                                │    │
│  │  ┌──────────────────────────────────────────┐  │    │
│  │  │  Deployment: notification-service        │  │    │
│  │  │  Replicas: 3 (auto-scaled 1-10)          │  │    │
│  │  │  ┌─────────┐  ┌─────────┐  ┌─────────┐   │  │    │
│  │  │  │ Pod 1   │  │ Pod 2   │  │ Pod 3   │   │  │    │
│  │  │  │ [App]   │  │ [App]   │  │ [App]   │   │  │    │
│  │  │  └─────────┘  └─────────┘  └─────────┘   │  │    │
│  │  │                                          │  │    │
│  │  │  Service: ClusterIP (internal)           │  │    │
│  │  │  Ingress: Load Balancer (external)       │  │    │
│  │  └──────────────────────────────────────────┘  │    │
│  │                                                │    │
│  │  ┌──────────────────────────────────────────┐  │    │
│  │  │  StatefulSet: rabbitmq                   │  │    │
│  │  │  Replicas: 3 (cluster)                   │  │    │
│  │  │  ┌─────────┐  ┌─────────┐  ┌─────────┐   │  │    │
│  │  │  │ Pod 1   │  │ Pod 2   │  │ Pod 3   │   │  │    │
│  │  │  │ [Rabbit]│  │ [Rabbit]│  │ [Rabbit]│   │  │    │
│  │  │  └─────────┘  └─────────┘  └─────────┘   │  │    │
│  │  └──────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────┘    │
│                           │                            │
│         ┌─────────────────┼─────────────────┐          │
│         ▼                 ▼                 ▼          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Cloud        │  │ Cloud SQL    │  │ Cloud        │  │
│  │ Firestore    │  │ (PostgreSQL) │  │ Monitoring   │  │
│  │ (NoSQL)      │  │ (optionnel)  │  │ & Logging    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└────────────────────────────────────────────────────────┘
```

##### 2. Création du Cluster GKE

```bash
# Créer un cluster GKE
gcloud container clusters create notification-cluster \
  --num-nodes=3 \
  --machine-type=e2-medium \
  --region=europe-west1 \
  --enable-autoscaling \
  --min-nodes=1 \
  --max-nodes=10 \
  --enable-autorepair \
  --enable-autoupgrade \
  --network=tourism-app-vpc \
  --subnetwork=app-subnet

# Se connecter au cluster
gcloud container clusters get-credentials notification-cluster \
  --region=europe-west1
```

##### 3. Choix de la Base de Données

**Cloud Firestore (NoSQL)** :

- ✅ Fully managed, serverless
- ✅ Auto-scaling illimité
- ✅ Réplication globale
- ✅ Temps réel et offline support
- ✅ Parfait pour les préférences utilisateurs

**Configuration Cloud Firestore** :

```bash
# Activer l'API Firestore
gcloud services enable firestore.googleapis.com

# Créer une base de données Firestore (mode natif)
gcloud firestore databases create \
  --location=europe-west1 \
  --type=firestore-native
```

**Alternative : Cloud SQL (PostgreSQL)** si structure relationnelle nécessaire :

```bash
# Créer une instance Cloud SQL PostgreSQL
# Note: europe-west1 (Belgique) pour proximité avec Bruxelles
gcloud sql instances create notification-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=europe-west1 \
  --network=tourism-app-vpc \
  --no-assign-ip
```

##### 4. Déploiement de RabbitMQ sur GKE

**Fichier : `k8s/rabbitmq-statefulset.yaml`**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: rabbitmq
  namespace: notification-service
spec:
  type: ClusterIP
  ports:
    - port: 5672
      name: amqp
    - port: 15672
      name: management
  selector:
    app: rabbitmq
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: rabbitmq
  namespace: notification-service
spec:
  serviceName: rabbitmq
  replicas: 3
  selector:
    matchLabels:
      app: rabbitmq
  template:
    metadata:
      labels:
        app: rabbitmq
    spec:
      containers:
        - name: rabbitmq
          image: rabbitmq:3.12-management-alpine
          ports:
            - containerPort: 5672
              name: amqp
            - containerPort: 15672
              name: management
          env:
            - name: RABBITMQ_ERLANG_COOKIE
              valueFrom:
                secretKeyRef:
                  name: rabbitmq-secret
                  key: erlang-cookie
            - name: RABBITMQ_DEFAULT_USER
              valueFrom:
                secretKeyRef:
                  name: rabbitmq-secret
                  key: username
            - name: RABBITMQ_DEFAULT_PASS
              valueFrom:
                secretKeyRef:
                  name: rabbitmq-secret
                  key: password
          volumeMounts:
            - name: rabbitmq-data
              mountPath: /var/lib/rabbitmq
  volumeClaimTemplates:
    - metadata:
        name: rabbitmq-data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: standard-rwo
        resources:
          requests:
            storage: 10Gi
```

**Créer le Secret pour RabbitMQ** :

```bash
# Créer un namespace
kubectl create namespace notification-service

# Créer le secret
kubectl create secret generic rabbitmq-secret \
  --from-literal=username=rabbitmq_user \
  --from-literal=password=SecurePassword123! \
  --from-literal=erlang-cookie=secret-cookie \
  --namespace=notification-service

# Déployer RabbitMQ
kubectl apply -f k8s/rabbitmq-statefulset.yaml
```

##### 5. Déploiement du Notification Service

**Fichier : `k8s/notification-service-deployment.yaml`**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: notification-service
  namespace: notification-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: notification-service
  template:
    metadata:
      labels:
        app: notification-service
    spec:
      containers:
        - name: notification-service
          image: gcr.io/tourism-app/notification-service:latest
          ports:
            - containerPort: 3006
          env:
            - name: NODE_ENV
              value: "production"
            - name: PORT
              value: "3006"
            - name: RABBITMQ_URL
              value: "amqp://rabbitmq_user:SecurePassword123!@rabbitmq:5672"
            - name: FIRESTORE_PROJECT_ID
              value: "tourism-app-project"
            - name: GOOGLE_APPLICATION_CREDENTIALS
              value: "/var/secrets/google/key.json"
          volumeMounts:
            - name: google-cloud-key
              mountPath: /var/secrets/google
              readOnly: true
          resources:
            requests:
              cpu: "200m"
              memory: "512Mi"
            limits:
              cpu: "1000m"
              memory: "1Gi"
          livenessProbe:
            httpGet:
              path: /api/health
              port: 3006
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /api/health
              port: 3006
            initialDelaySeconds: 10
            periodSeconds: 5
      volumes:
        - name: google-cloud-key
          secret:
            secretName: google-cloud-key
---
apiVersion: v1
kind: Service
metadata:
  name: notification-service
  namespace: notification-service
spec:
  type: ClusterIP
  ports:
    - port: 80
      targetPort: 3006
  selector:
    app: notification-service
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: notification-service-hpa
  namespace: notification-service
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: notification-service
  minReplicas: 3
  maxReplicas: 10
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
```

**Créer le Secret pour les Credentials Google Cloud** :

```bash
# Créer un Service Account
gcloud iam service-accounts create notification-service-sa \
  --display-name="Notification Service Service Account"

# Accorder les permissions Firestore
gcloud projects add-iam-policy-binding tourism-app-project \
  --member="serviceAccount:notification-service-sa@tourism-app-project.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

# Créer et télécharger la clé
gcloud iam service-accounts keys create key.json \
  --iam-account=notification-service-sa@tourism-app-project.iam.gserviceaccount.com

# Créer le secret Kubernetes
kubectl create secret generic google-cloud-key \
  --from-file=key.json=key.json \
  --namespace=notification-service

# Supprimer le fichier local pour sécurité
rm key.json
```

##### 6. Configuration Réseau et Sécurité

**Network Policy pour isoler le trafic** :

**Fichier : `k8s/network-policy.yaml`**

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: notification-service-policy
  namespace: notification-service
spec:
  podSelector:
    matchLabels:
      app: notification-service
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: api-gateway
        - podSelector:
            matchLabels:
              app: api-gateway
      ports:
        - protocol: TCP
          port: 3005
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: rabbitmq
      ports:
        - protocol: TCP
          port: 5672
    - to:
        - namespaceSelector: {}
      ports:
        - protocol: TCP
          port: 443 # Pour Firestore
```

**Private GKE Cluster (optionnel pour sécurité renforcée)** :

```bash
# Créer un cluster privé
gcloud container clusters create notification-cluster-private \
  --num-nodes=3 \
  --machine-type=e2-medium \
  --region=europe-west1 \
  --enable-private-nodes \
  --master-ipv4-cidr=172.16.0.0/28 \
  --enable-ip-alias \
  --network=tourism-app-vpc \
  --subnetwork=app-subnet
```

##### 7. Build et Push de l'Image Docker

```bash
# Configurer Docker pour utiliser gcloud
gcloud auth configure-docker

# Build l'image
docker build -t notification-service:latest ./notification-service

# Tag pour GCR
docker tag notification-service:latest \
  gcr.io/tourism-app-project/notification-service:latest

# Push vers Google Container Registry
docker push gcr.io/tourism-app-project/notification-service:latest
```

##### 8. Déploiement

```bash
# Déployer le service
kubectl apply -f k8s/notification-service-deployment.yaml

# Vérifier le statut
kubectl get pods -n notification-service
kubectl get services -n notification-service

# Voir les logs
kubectl logs -f deployment/notification-service -n notification-service
```

##### 9. Configuration Ingress pour Accès Externe

**Fichier : `k8s/ingress.yaml`**

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: notification-service-ingress
  namespace: notification-service
  annotations:
    kubernetes.io/ingress.global-static-ip-name: "notification-service-ip"
    networking.gke.io/managed-certificates: "notification-service-cert"
spec:
  rules:
    - host: notifications.tourism-app.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: notification-service
                port:
                  number: 80
```

**Créer l'Ingress** :

```bash
# Réserver une IP statique
gcloud compute addresses create notification-service-ip \
  --global

# Créer un certificat SSL managé
kubectl apply -f - <<EOF
apiVersion: networking.gke.io/v1
kind: ManagedCertificate
metadata:
  name: notification-service-cert
  namespace: notification-service
spec:
  domains:
    - notifications.tourism-app.com
EOF

# Déployer l'Ingress
kubectl apply -f k8s/ingress.yaml
```

##### 10. Monitoring et Logging

**Cloud Monitoring et Logging sont automatiquement activés** :

```javascript
// Intégration dans le code Node.js
const { Logging } = require("@google-cloud/logging");
const logging = new Logging({
  projectId: "tourism-app-project",
});

const log = logging.log("notification-service");

async function logNotificationEvent(event) {
  const entry = log.entry(
    {
      severity: "INFO",
      resource: {
        type: "gke_container",
        labels: {
          cluster_name: "notification-cluster",
          namespace_name: "notification-service",
        },
      },
    },
    {
      eventType: event.type,
      userId: event.userId,
      timestamp: new Date().toISOString(),
    }
  );

  await log.write(entry);
}
```

**Avantages de l'Option B (GKE)** :

- ✅ Orchestration robuste avec Kubernetes
- ✅ Auto-scaling avancé (HPA, VPA)
- ✅ Self-healing automatique
- ✅ Rolling updates sans interruption
- ✅ Flexibilité maximale pour configurations complexes
- ✅ Support natif de RabbitMQ avec StatefulSet

**Inconvénients** :

- ❌ Courbe d'apprentissage plus élevée
- ❌ Complexité opérationnelle accrue
- ❌ Coût potentiellement plus élevé pour petites charges

---

## Exercice 2 - Création de Task Definition

### Énoncé

En utilisant le Dockerfile fourni pour le Booking Management Service, rédigez une Task Definition AWS ECS Fargate simplifiée (format JSON) pour un hypothétique Payment Gateway Microservice.

**Spécifications** :

- Image Docker : `payment-service:latest` poussée vers votre ECR
- Port : 3002
- Ressources : 512 CPU units, 1024 MiB memory
- Variable d'environnement : `STRIPE_API_KEY` (valeur peut être placeholder)
- Logging vers CloudWatch Log Group `/ecs/payment-service`

---

### Solution

#### Task Definition Complète

**Fichier : `payment-service-task-definition.json`**

> **Note sur le choix de la région** : `eu-west-3` (Paris) est la région AWS la plus proche de Bruxelles, offrant une latence réduite et la conformité RGPD pour les données européennes.

```json
{
  "family": "payment-service-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::123456789012:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::123456789012:role/paymentServiceTaskRole",
  "containerDefinitions": [
    {
      "name": "payment-service-container",
      "image": "123456789012.dkr.ecr.eu-west-3.amazonaws.com/payment-service:latest",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 3002,
          "protocol": "tcp",
          "hostPort": 3002
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "PORT",
          "value": "3002"
        },
        {
          "name": "STRIPE_API_KEY",
          "value": "sk_test_placeholder_key_replace_with_secret"
        },
        {
          "name": "BOOKING_SERVICE_URL",
          "value": "http://booking-management-service.internal:3002"
        },
        {
          "name": "TOUR_CATALOG_SERVICE_URL",
          "value": "http://tour-catalog-service.internal:3001"
        }
      ],
      "secrets": [
        {
          "name": "STRIPE_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:eu-west-3:123456789012:secret:payment-service/stripe-api-key:API_KEY::"
        },
        {
          "name": "STRIPE_WEBHOOK_SECRET",
          "valueFrom": "arn:aws:secretsmanager:eu-west-3:123456789012:secret:payment-service/stripe-webhook-secret:WEBHOOK_SECRET::"
        },
        {
          "name": "DB_HOST",
          "valueFrom": "arn:aws:secretsmanager:eu-west-3:123456789012:secret:payment-service/db-credentials:host::"
        },
        {
          "name": "DB_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:eu-west-3:123456789012:secret:payment-service/db-credentials:password::"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/payment-service",
          "awslogs-region": "eu-west-3",
          "awslogs-stream-prefix": "ecs",
          "awslogs-create-group": "true"
        }
      },
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "curl -f http://localhost:3002/api/health || exit 1"
        ],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      },
      "ulimits": [
        {
          "name": "nofile",
          "softLimit": 65536,
          "hardLimit": 65536
        }
      ],
      "mountPoints": [],
      "volumesFrom": [],
      "stopTimeout": 30,
      "dockerLabels": {
        "service": "payment-gateway",
        "version": "1.0.0",
        "environment": "production"
      }
    }
  ],
  "tags": [
    {
      "key": "Service",
      "value": "PaymentGateway"
    },
    {
      "key": "Environment",
      "value": "Production"
    },
    {
      "key": "ManagedBy",
      "value": "Terraform"
    }
  ]
}
```

#### Explication des Champs Clés

**1. Ressources** :

```json
"cpu": "512",        // 0.5 vCPU (512 CPU units = 0.5 vCPU)
"memory": "1024",    // 1 GB de RAM
```

**2. Secrets Management** :

Les secrets sont récupérés depuis AWS Secrets Manager plutôt que d'être stockés en clair dans les variables d'environnement :

```json
"secrets": [
  {
    "name": "STRIPE_API_KEY",
    "valueFrom": "arn:aws:secretsmanager:eu-west-3:123456789012:secret:payment-service/stripe-api-key:API_KEY::"
  }
]
```

**3. Health Check** :

Le health check vérifie que le service répond sur `/api/health` :

```json
"healthCheck": {
  "command": ["CMD-SHELL", "curl -f http://localhost:3002/api/health || exit 1"],
  "interval": 30,      // Vérifie toutes les 30 secondes
  "timeout": 5,        // Timeout de 5 secondes
  "retries": 3,        // 3 tentatives avant échec
  "startPeriod": 60    // Période de grâce de 60 secondes au démarrage
}
```

#### Prérequis : Créer les Secrets dans AWS Secrets Manager

```bash
# Créer le secret pour la clé API Stripe
aws secretsmanager create-secret \
  --name payment-service/stripe-api-key \
  --secret-string '{"API_KEY":"sk_test_51abc123..."}' \
  --region eu-west-3

# Créer le secret pour le webhook secret
aws secretsmanager create-secret \
  --name payment-service/stripe-webhook-secret \
  --secret-string '{"WEBHOOK_SECRET":"whsec_xyz789..."}' \
  --region eu-west-3

# Créer le secret pour les credentials de base de données
aws secretsmanager create-secret \
  --name payment-service/db-credentials \
  --secret-string '{"host":"payment-db.abc123.eu-west-3.rds.amazonaws.com","password":"SecurePassword123!"}' \
  --region eu-west-3
```

#### Prérequis : Créer le Log Group CloudWatch

```bash
# Créer le log group
aws logs create-log-group \
  --log-group-name /ecs/payment-service \
  --region eu-west-3

# Optionnel : Configurer la rétention des logs (7 jours)
aws logs put-retention-policy \
  --log-group-name /ecs/payment-service \
  --retention-in-days 7 \
  --region eu-west-3
```

#### Enregistrer la Task Definition

```bash
# Enregistrer la task definition
aws ecs register-task-definition \
  --cli-input-json file://payment-service-task-definition.json \
  --region eu-west-3

# Vérifier la task definition
aws ecs describe-task-definition \
  --task-definition payment-service-task \
  --region eu-west-3
```

#### Créer un Service ECS avec cette Task Definition

```bash
# Créer le service
aws ecs create-service \
  --cluster tourism-app-cluster \
  --service-name payment-service \
  --task-definition payment-service-task:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={
    subnets=[subnet-0123456789abcdef0,subnet-0fedcba9876543210],
    securityGroups=[sg-0123456789abcdef0],
    assignPublicIp=DISABLED
  }" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:eu-west-3:123456789012:targetgroup/payment-tg/abc123,containerName=payment-service-container,containerPort=3002" \
  --health-check-grace-period-seconds 60 \
  --region eu-west-3
```

---

## Exercice 3 - Configuration Security Group

### Énoncé

Pour le Tour Catalog microservice déployé sur une instance AWS EC2 (modèle IaaS), il se connecte à une base de données AWS RDS PostgreSQL.

**Tâche** : Décrivez les règles entrantes minimales nécessaires pour :

1. **Security Group de l'instance EC2** (tour-catalog-sg)
2. **Security Group de l'instance RDS** (tour-catalog-db-sg)

**Contraintes** :

- L'instance EC2 est dans un sous-réseau privé
- Accessible uniquement via un load balancer interne
- RDS est également dans un sous-réseau privé

---

### Solution

#### Architecture Réseau

```
┌──────────────────────────────────────────────────────┐
│                    VPC (10.0.0.0/16)                 │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │  Public Subnet (10.0.1.0/24)                   │  │
│  │  ┌──────────────────────────────────────────┐  │  │
│  │  │  Internal Application Load Balancer      │  │  │
│  │  │  Security Group: alb-internal-sg         │  │  │
│  │  └──────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────┘  │
│                           │                          │
│  ┌────────────────────────▼───────────────────────┐  │
│  │  Private Subnet - App Tier (10.0.2.0/24)       │  │
│  │  ┌──────────────────────────────────────────┐  │  │
│  │  │  EC2 Instance: tour-catalog-service      │  │  │
│  │  │  Security Group: tour-catalog-sg         │  │  │
│  │  │  Private IP: 10.0.2.50                   │  │  │
│  │  └──────────────────────────────────────────┘  │  │
│  └────────────────────────┬───────────────────────┘  │
│                           │                          │
│  ┌────────────────────────▼───────────────────────┐  │
│  │  Private Subnet - Data Tier (10.0.3.0/24)      │  │
│  │  ┌──────────────────────────────────────────┐  │  │
│  │  │  RDS PostgreSQL: tour-catalog-db         │  │  │
│  │  │  Security Group: tour-catalog-db-sg      │  │  │
│  │  │  Endpoint: tour-catalog-db.abc123...     │  │  │
│  │  └──────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

#### 1. Security Group pour l'Instance EC2 (tour-catalog-sg)

**Règles Entrantes (Inbound)** :

```bash
# Créer le security group
aws ec2 create-security-group \
  --group-name tour-catalog-sg \
  --description "Security group for Tour Catalog Service EC2 instance" \
  --vpc-id vpc-0123456789abcdef0 \
  --region eu-west-3

# Règle 1 : HTTP depuis le Load Balancer interne uniquement
aws ec2 authorize-security-group-ingress \
  --group-id sg-0123456789abcdef0 \
  --protocol tcp \
  --port 3001 \
  --source-group sg-alb-internal-sg \
  --region eu-west-3

# Règle 2 : SSH depuis le Bastion Host uniquement (pour administration)
aws ec2 authorize-security-group-ingress \
  --group-id sg-0123456789abcdef0 \
  --protocol tcp \
  --port 22 \
  --source-group sg-bastion-sg \
  --region eu-west-3
```

**Configuration JSON complète** :

```json
{
  "GroupName": "tour-catalog-sg",
  "Description": "Security group for Tour Catalog Service EC2 instance",
  "VpcId": "vpc-0123456789abcdef0",
  "IpPermissions": [
    {
      "IpProtocol": "tcp",
      "FromPort": 3001,
      "ToPort": 3001,
      "UserIdGroupPairs": [
        {
          "GroupId": "sg-alb-internal-sg",
          "Description": "Allow HTTP traffic from internal ALB only"
        }
      ]
    },
    {
      "IpProtocol": "tcp",
      "FromPort": 22,
      "ToPort": 22,
      "UserIdGroupPairs": [
        {
          "GroupId": "sg-bastion-sg",
          "Description": "Allow SSH from bastion host for administration"
        }
      ]
    }
  ],
  "IpPermissionsEgress": [
    {
      "IpProtocol": "-1",
      "IpRanges": [
        {
          "CidrIp": "0.0.0.0/0",
          "Description": "Allow all outbound traffic (will be restricted by RDS security group)"
        }
      ]
    }
  ]
}
```

**Règles Sortantes (Outbound)** :

```bash
# Par défaut, toutes les règles sortantes sont autorisées
# Mais nous pouvons les restreindre pour plus de sécurité :

# HTTPS pour appels API externes (Stripe, etc.)
aws ec2 authorize-security-group-egress \
  --group-id sg-0123456789abcdef0 \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0 \
  --region eu-west-3

# PostgreSQL vers la base de données RDS
aws ec2 authorize-security-group-egress \
  --group-id sg-0123456789abcdef0 \
  --protocol tcp \
  --port 5432 \
  --source-group sg-tour-catalog-db-sg \
  --region eu-west-3

# DNS (pour résolution de noms)
aws ec2 authorize-security-group-egress \
  --group-id sg-0123456789abcdef0 \
  --protocol udp \
  --port 53 \
  --cidr 10.0.0.0/16 \
  --region eu-west-3
```

#### 2. Security Group pour l'Instance RDS (tour-catalog-db-sg)

**Règles Entrantes (Inbound)** :

```bash
# Créer le security group pour RDS
aws ec2 create-security-group \
  --group-name tour-catalog-db-sg \
  --description "Security group for Tour Catalog RDS PostgreSQL database" \
  --vpc-id vpc-0123456789abcdef0 \
  --region eu-west-3

# Règle UNIQUE : PostgreSQL depuis l'instance EC2 uniquement
aws ec2 authorize-security-group-ingress \
  --group-id sg-tour-catalog-db-sg \
  --protocol tcp \
  --port 5432 \
  --source-group sg-tour-catalog-sg \
  --region eu-west-3
```

**Configuration JSON complète** :

```json
{
  "GroupName": "tour-catalog-db-sg",
  "Description": "Security group for Tour Catalog RDS PostgreSQL database",
  "VpcId": "vpc-0123456789abcdef0",
  "IpPermissions": [
    {
      "IpProtocol": "tcp",
      "FromPort": 5432,
      "ToPort": 5432,
      "UserIdGroupPairs": [
        {
          "GroupId": "sg-tour-catalog-sg",
          "Description": "Allow PostgreSQL connections from Tour Catalog EC2 instance only"
        }
      ]
    }
  ],
  "IpPermissionsEgress": [
    {
      "IpProtocol": "-1",
      "IpRanges": [
        {
          "CidrIp": "0.0.0.0/0",
          "Description": "Allow all outbound traffic"
        }
      ]
    }
  ]
}
```

**Important** : RDS n'a besoin d'aucune autre règle entrante. Seule l'instance EC2 du service peut se connecter.

#### 3. Configuration Complète avec Terraform (Optionnel)

**Fichier : `infrastructure/security-groups.tf`**

```hcl
# Security Group pour le Load Balancer Interne
resource "aws_security_group" "alb_internal" {
  name        = "alb-internal-sg"
  description = "Security group for internal Application Load Balancer"
  vpc_id      = aws_vpc.tourism_app.id

  ingress {
    description = "HTTP from VPC"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.tourism_app.cidr_block]
  }

  ingress {
    description = "HTTPS from VPC"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.tourism_app.cidr_block]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "alb-internal-sg"
    Service = "load-balancer"
  }
}

# Security Group pour l'instance EC2 Tour Catalog
resource "aws_security_group" "tour_catalog" {
  name        = "tour-catalog-sg"
  description = "Security group for Tour Catalog Service EC2 instance"
  vpc_id      = aws_vpc.tourism_app.id

  # HTTP depuis le Load Balancer interne uniquement
  ingress {
    description     = "HTTP from internal ALB"
    from_port       = 3001
    to_port         = 3001
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_internal.id]
  }

  # SSH depuis le Bastion Host uniquement
  ingress {
    description     = "SSH from bastion host"
    from_port       = 22
    to_port         = 22
    protocol        = "tcp"
    security_groups = [aws_security_group.bastion.id]
  }

  # HTTPS pour appels API externes
  egress {
    description = "HTTPS to internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # PostgreSQL vers RDS
  egress {
    description     = "PostgreSQL to RDS"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.tour_catalog_db.id]
  }

  # DNS
  egress {
    description = "DNS"
    from_port   = 53
    to_port     = 53
    protocol    = "udp"
    cidr_blocks = [aws_vpc.tourism_app.cidr_block]
  }

  tags = {
    Name = "tour-catalog-sg"
    Service = "tour-catalog"
  }
}

# Security Group pour RDS PostgreSQL
resource "aws_security_group" "tour_catalog_db" {
  name        = "tour-catalog-db-sg"
  description = "Security group for Tour Catalog RDS PostgreSQL database"
  vpc_id      = aws_vpc.tourism_app.id

  # PostgreSQL depuis l'instance EC2 uniquement
  ingress {
    description     = "PostgreSQL from Tour Catalog EC2"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.tour_catalog.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "tour-catalog-db-sg"
    Service = "database"
  }
}
```

#### 4. Vérification et Tests

**Vérifier les règles de sécurité** :

```bash
# Vérifier le security group EC2
aws ec2 describe-security-groups \
  --group-ids sg-tour-catalog-sg \
  --region eu-west-3

# Vérifier le security group RDS
aws ec2 describe-security-groups \
  --group-ids sg-tour-catalog-db-sg \
  --region eu-west-3

# Tester la connectivité depuis l'instance EC2 vers RDS
ssh -i key.pem ec2-user@10.0.2.50
psql -h tour-catalog-db.abc123.eu-west-3.rds.amazonaws.com -U dbadmin -d tour_catalog_db
```

#### 5. Bonnes Pratiques Appliquées

✅ **Principe du moindre privilège** : Seuls les ports nécessaires sont ouverts  
✅ **Isolation réseau** : Services dans des sous-réseaux privés  
✅ **Références par Security Group** : Utilisation de références plutôt que de CIDR pour plus de sécurité  
✅ **Pas d'accès Internet direct** : Les instances EC2 et RDS sont dans des sous-réseaux privés  
✅ **Accès administratif contrôlé** : SSH uniquement depuis le bastion host  
✅ **Communication inter-services sécurisée** : Via références de security groups

#### 6. Diagramme de Flux de Trafic

```
┌──────────────────────────────────────────────────────┐
│                    FLUX DE TRAFIC                    │
└──────────────────────────────────────────────────────┘

Client (VPC)
    │
    ▼
Internal ALB (alb-internal-sg)
    │ Port 80/443
    │ Source: VPC CIDR
    ▼
EC2 Instance (tour-catalog-sg)
    │ Port 3001
    │ Source: alb-internal-sg
    │
    ├─► HTTPS (Port 443)
    │   Destination: Internet (APIs externes)
    │
    └─► PostgreSQL (Port 5432)
        Destination: tour-catalog-db-sg
            │
            ▼
        RDS PostgreSQL (tour-catalog-db-sg)
            │ Port 5432
            │ Source: tour-catalog-sg
            └─► Connexion autorisée ✅
```

---

## Résumé des Exercices

### Exercice 1 - Planification de Scénario

- ✅ **Option A (Azure App Service)** : Solution PaaS simple avec Cosmos DB et Service Bus
- ✅ **Option B (GKE)** : Solution Kubernetes robuste avec Firestore et RabbitMQ StatefulSet
- ✅ Détails complets sur le networking, la sécurité et le monitoring

### Exercice 2 - Création de Task Definition

- ✅ Task Definition ECS Fargate complète avec toutes les configurations
- ✅ Gestion des secrets via AWS Secrets Manager
- ✅ Health checks et logging CloudWatch configurés
- ✅ Instructions de déploiement

### Exercice 3 - Configuration Security Group

- ✅ Security Groups pour EC2 et RDS avec règles minimales
- ✅ Principe du moindre privilège appliqué
- ✅ Configuration Terraform optionnelle
- ✅ Diagrammes de flux de trafic

---

## Points Clés à Retenir

| Aspect              | Recommandation                                                          |
| ------------------- | ----------------------------------------------------------------------- |
| **Sécurité réseau** | Toujours utiliser des références de Security Groups plutôt que des CIDR |
| **Isolation**       | Placer les services dans des sous-réseaux privés                        |
| **Secrets**         | Utiliser AWS Secrets Manager / Azure Key Vault / GCP Secret Manager     |
| **Monitoring**      | Activer les logs et métriques dès le déploiement                        |
| **Health checks**   | Configurer des health checks pour tous les services                     |
| **Auto-scaling**    | Configurer l'auto-scaling selon les besoins                             |

---

Excellent travail ! 🎉
