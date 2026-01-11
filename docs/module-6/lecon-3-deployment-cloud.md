# Leçon 6.3 - Déploiement de Microservices sur Plateformes Cloud

**Module 6** : Déploiement, surveillance et évolutivité

---

## Objectifs pédagogiques

- Comprendre les modèles de déploiement cloud : IaaS, PaaS, CaaS
- Maîtriser le déploiement de microservices sur AWS, Azure et GCP
- Configurer l'infrastructure réseau, les bases de données et la sécurité dans le cloud
- Déployer des conteneurs avec AWS ECS Fargate, GKE et AKS
- Implémenter des stratégies de monitoring, logging et sécurité cloud
- Concevoir des architectures cloud scalables et résilientes

## Prérequis

- Leçon 6.1 : Containerisation avec Docker
- Leçon 6.2 : Orchestration avec Docker Compose et Kubernetes
- Module 5 : Architecture Event-Driven et RabbitMQ
- Compte AWS/Azure/GCP (niveau gratuit suffisant pour les exercices)
- AWS CLI, Azure CLI ou gcloud SDK installé

---

## Introduction

Le déploiement de microservices sur des plateformes cloud comme AWS, Azure ou GCP implique le provisionnement d'infrastructure, la configuration de services et la gestion du cycle de vie des applications. Ce processus exploite l'élasticité, la scalabilité et les services managés offerts par les fournisseurs cloud pour héberger efficacement des systèmes distribués.

**Pour notre Application de Tourisme**, nous devons déployer :

- 🏨 **Tour Catalog Service** : Gestion du catalogue de tours
- 📅 **Booking Management Service** : Gestion des réservations
- 💳 **Payment Gateway Service** : Traitement des paiements
- 📧 **Notification Service** : Envoi de notifications
- 🔐 **Auth Service** : Authentification et autorisation
- ⚛️ **React Frontend** : Interface utilisateur

---

## 1. Modèles de Déploiement Cloud

Les plateformes cloud offrent divers modèles de déploiement adaptés aux microservices, chacun avec ses avantages et considérations.

### 1.1 Infrastructure as a Service (IaaS)

**IaaS** fournit des ressources informatiques virtualisées sur Internet. Les utilisateurs gèrent les systèmes d'exploitation, applications et middleware, tandis que le fournisseur cloud gère l'infrastructure sous-jacente (serveurs, virtualisation, stockage, réseau).

#### **Exemples**

**Amazon EC2 (Elastic Compute Cloud)** :

- Machines virtuelles (instances) avec contrôle total sur l'OS
- Configuration réseau et logiciels installés personnalisables
- Pour notre app, chaque microservice (Tour Catalog, Booking, Payment) pourrait tourner sur des instances EC2 séparées
- Nécessite configuration manuelle de Node.js, dépendances et gestion de processus (PM2)

**Azure Virtual Machines** :

- VMs Windows ou Linux provisionnables
- Déploiement manuel de RabbitMQ et applications Node.js
- Contrôle granulaire mais augmentation de la charge opérationnelle

**Google Compute Engine** :

- Instances de machines virtuelles personnalisables
- Disques persistants et réseaux VPC configurables
- Intégration avec d'autres services GCP

#### **Scénario Hypothétique : Startup avec MVP**

Une petite startup construisant un MVP pour une application microservices pourrait choisir IaaS initialement pour avoir le contrôle complet sur leur environnement :

```
┌───────────────────────────────────────────────┐
│         Amazon EC2 / Azure VM / GCE           │
│                                               │
│  ┌──────────────┐  ┌──────────────┐           │
│  │  VM 1        │  │  VM 2        │           │
│  │  Tour        │  │  Booking     │           │
│  │  Catalog     │  │  Service     │           │
│  │  + Node.js   │  │  + Node.js   │           │
│  │  + PostgreSQL│  │  + PostgreSQL│           │
│  └──────────────┘  └──────────────┘           │
│                                               │
│  ┌──────────────┐  ┌──────────────┐           │
│  │  VM 3        │  │  VM 4        │           │
│  │  Payment     │  │  Notification│           │
│  │  Service     │  │  + RabbitMQ  │           │
│  └──────────────┘  └──────────────┘           │
│                                               │
│  Configuration manuelle, patching, scaling    │
└───────────────────────────────────────────────┘
```

**Avantages** :

- ✅ Contrôle total sur l'environnement
- ✅ Flexibilité maximale pour configurations spécifiques
- ✅ Support de logiciels legacy ou propriétaires

**Inconvénients** :

- ❌ Charge opérationnelle élevée (patching, monitoring, scaling)
- ❌ Responsabilité de la sécurité et des mises à jour
- ❌ Temps de déploiement plus long

### 1.2 Platform as a Service (PaaS)

**PaaS** fournit un environnement complet de développement et déploiement, incluant runtime, système d'exploitation et matériel. Les utilisateurs se concentrent sur le code, tandis que le fournisseur gère l'infrastructure, le scaling et la maintenance.

#### **Exemples**

**AWS Elastic Beanstalk** :

- Simplifie le déploiement et scaling d'applications web et services
- Upload du code → déploiement automatique
- Gère provisionnement de capacité, load balancing, auto-scaling, monitoring
- Notre Booking Management Service pourrait y être déployé

**Azure App Service** :

- Plateforme fully managed pour web apps, backends mobiles et APIs RESTful
- Gère OS, runtime et scaling automatiquement
- Réduit significativement la charge opérationnelle vs IaaS

**Google App Engine** :

- Service PaaS entièrement managé
- Auto-scaling et load balancing automatiques
- Support de Node.js, Python, Java, Go, etc.

#### **Scénario Hypothétique : Entreprise Moyenne avec Équipes Multiples**

Une entreprise de taille moyenne avec plusieurs équipes de développement souhaite accélérer les cycles de déploiement :

```
┌────────────────────────────────────────────────┐
│    AWS Elastic Beanstalk / Azure App Service   │
│                                                │
│  ┌──────────────────────────────────────────┐  │
│  │  App 1: Tour Catalog Service             │  │
│  │  ├─ Auto-scaling (2-10 instances)        │  │
│  │  ├─ Load Balancer                        │  │
│  │  └─ Health monitoring                    │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  ┌──────────────────────────────────────────┐  │
│  │  App 2: Booking Management Service       │  │
│  │  ├─ Auto-scaling (3-15 instances)        │  │
│  │  ├─ Load Balancer                        │  │
│  │  └─ Health monitoring                    │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  Déploiement : git push ou CLI                 │
│  Infrastructure gérée automatiquement          │
└────────────────────────────────────────────────┘
```

**Avantages** :

- ✅ Déploiement rapide (push code → déploiement)
- ✅ Auto-scaling et load balancing inclus
- ✅ Monitoring et health checks automatiques
- ✅ Réduction du time-to-market

**Inconvénients** :

- ❌ Moins de contrôle sur l'infrastructure
- ❌ Peut être plus coûteux que IaaS pour grandes charges
- ❌ Limites sur configurations personnalisées

### 1.3 Container as a Service (CaaS) / Plateformes d'Orchestration

**CaaS** fournit un environnement managé pour déployer, exécuter et scaler des applications containerisées. Ces plateformes sont souvent construites sur des technologies d'orchestration de conteneurs.

#### **Exemples**

**AWS ECS (Elastic Container Service) avec Fargate** :

- Service de gestion de conteneurs hautement scalable et rapide
- Fargate = moteur de calcul serverless pour conteneurs (pas de gestion de serveurs)
- Containeriser chaque service avec Docker → déployer sur ECS Fargate
- Fargate gère automatiquement l'infrastructure sous-jacente

**Google Kubernetes Engine (GKE)** :

- Environnement managé pour déployer, gérer et scaler des applications containerisées avec Kubernetes
- Automatise déploiement, scaling et opérations
- Pour notre Tourism App avec nombreux microservices, GKE offre des capacités d'orchestration robustes

**Azure Kubernetes Service (AKS)** :

- Simplifie le déploiement d'un cluster Kubernetes managé dans Azure
- Réduit complexité et charge opérationnelle de gestion Kubernetes
- Azure gère le control plane Kubernetes

**AWS App Runner** :

- Service entièrement managé pour déployer des applications containerisées
- Auto-scaling et load balancing automatiques
- Plus simple que ECS mais moins de contrôle

#### **Scénario Hypothétique : Entreprise Établie avec Suite de Microservices**

Une entreprise établie avec une suite croissante de microservices fait face à des défis de scaling et gestion :

```
┌───────────────────────────────────────────────────────┐
│         GKE / AKS / EKS (Managed Kubernetes)          │
│                                                       │
│  ┌───────────────────────────────────────────────┐    │
│  │  Namespace: tourism-app                       │    │
│  │                                               │    │
│  │  ┌───────────────┐  ┌───────────────┐         │    │
│  │  │ Deployment    │  │ Deployment    │         │    │
│  │  │ tour-catalog  │  │ booking       │         │    │
│  │  │ (5 Pods)      │  │ (8 Pods)      │         │    │
│  │  └───────────────┘  └───────────────┘         │    │
│  │                                               │    │
│  │  ┌───────────────┐  ┌───────────────┐         │    │
│  │  │ Deployment    │  │ StatefulSet   │         │    │
│  │  │ payment       │  │ rabbitmq      │         │    │
│  │  │ (3 Pods)      │  │ (3 Pods)      │         │    │
│  │  └───────────────┘  └───────────────┘         │    │
│  │                                               │    │
│  │  Service Mesh (Istio/Linkerd) pour comms      │    │
│  │  Auto-scaling policies (HPA, VPA)             │    │
│  └───────────────────────────────────────────────┘    │
│                                                       │
│  Control Plane managé par le cloud provider           │
└───────────────────────────────────────────────────────┘
```

**Avantages** :

- ✅ Orchestration robuste et mature (Kubernetes)
- ✅ Auto-scaling avancé (Horizontal Pod Autoscaler, Vertical Pod Autoscaler)
- ✅ Self-healing et rolling updates
- ✅ Service mesh pour communication inter-services sécurisée
- ✅ Standardisation des déploiements

**Inconvénients** :

- ❌ Courbe d'apprentissage élevée (Kubernetes)
- ❌ Complexité accrue pour petites applications
- ❌ Coût potentiellement élevé pour petites charges

---

## 2. Considérations Clés pour le Déploiement

Lors du déploiement de microservices dans le cloud, plusieurs aspects cruciaux nécessitent une planification et implémentation minutieuses.

### 2.1 Réseau (Networking)

Les microservices communiquent entre eux et avec des clients externes. Les services réseau cloud sont essentiels pour activer cette communication de manière sécurisée et efficace.

#### **Virtual Private Cloud (VPC) / Virtual Network (VNet)**

Environnements réseau isolés dans le cloud fournissant un contrôle sur les plages d'adresses IP, sous-réseaux, tables de routage et passerelles réseau.

**Architecture type pour notre Tourism App** :

```
┌────────────────────────────────────────────────────────┐
│                   VPC / VNet                           │
│  CIDR: 10.0.0.0/16                                     │
│                                                        │
│  ┌────────────────────────────────────────────────┐    │
│  │  Public Subnet (10.0.1.0/24)                   │    │
│  │  ├─ Internet Gateway                           │    │
│  │  ├─ Load Balancer (ALB/NLB)                    │    │
│  │  └─ NAT Gateway                                │    │
│  └────────────────────────────────────────────────┘    │
│                                                        │
│  ┌────────────────────────────────────────────────┐    │
│  │  Private Subnet - App Tier (10.0.2.0/24)       │    │
│  │  ├─ Tour Catalog Service                       │    │
│  │  ├─ Booking Service                            │    │
│  │  ├─ Payment Service                            │    │
│  │  └─ Notification Service                       │    │
│  └────────────────────────────────────────────────┘    │
│                                                        │
│  ┌────────────────────────────────────────────────┐    │
│  │  Private Subnet - Data Tier (10.0.3.0/24)      │    │
│  │  ├─ RDS PostgreSQL (Tour Catalog DB)           │    │
│  │  ├─ RDS PostgreSQL (Booking DB)                │    │
│  │  ├─ RabbitMQ Cluster                           │    │
│  │  └─ ElastiCache Redis                          │    │
│  └────────────────────────────────────────────────┘    │
│                                                        │
│  Route Tables, NACLs, Security Groups                  │
└────────────────────────────────────────────────────────┘
```

**Principes clés** :

- 🔒 **Isolation logique** : Chaque microservice dans un segment VPC/VNet sécurisé
- 🌐 **Sous-réseaux publics** : Pour load balancers et NAT gateways
- 🔐 **Sous-réseaux privés** : Pour microservices et bases de données (pas d'accès Internet direct)
- 🚦 **Tables de routage** : Contrôle du trafic entre sous-réseaux

#### **Load Balancers**

Distribuent le trafic applicatif entrant entre plusieurs cibles (instances EC2, conteneurs, VMs).

**Types de Load Balancers** :

| Type                               | AWS          | Azure               | GCP                   | Cas d'usage                                 |
| ---------------------------------- | ------------ | ------------------- | --------------------- | ------------------------------------------- |
| **Application Load Balancer (L7)** | ALB          | Application Gateway | HTTP(S) Load Balancer | HTTP/HTTPS, routage basé sur URL, WebSocket |
| **Network Load Balancer (L4)**     | NLB          | Load Balancer       | Network Load Balancer | TCP/UDP, ultra-haute performance            |
| **Classic Load Balancer**          | CLB (legacy) | -                   | -                     | Legacy, pas recommandé                      |

**Exemple pour Tourism App** :

- **ALB externe** : Distribue requêtes clients → API Gateway ou directement aux microservices
- **ALB internes** : Pour communication inter-services (booking → tour-catalog)

#### **Firewalls / Security Groups / Network Security Groups**

Contrôlent le trafic entrant et sortant vers/depuis les interfaces réseau, instances ou sous-réseaux.

**Exemple de règles pour Tour Catalog Service** :

```yaml
# Security Group: tour-catalog-sg
Inbound Rules:
  - Type: HTTP
    Protocol: TCP
    Port: 3001
    Source: alb-sg (Security Group du Load Balancer)

  - Type: SSH
    Protocol: TCP
    Port: 22
    Source: bastion-sg (Bastion host pour admin uniquement)

Outbound Rules:
  - Type: PostgreSQL
    Protocol: TCP
    Port: 5432
    Destination: tour-catalog-db-sg

  - Type: HTTPS
    Protocol: TCP
    Port: 443
    Destination: 0.0.0.0/0 (pour appels API externes)

  - Type: AMQP
    Protocol: TCP
    Port: 5672
    Destination: rabbitmq-sg
```

**Principe de moindre privilège** : Ouvrir uniquement les ports nécessaires depuis les sources autorisées.

### 2.2 Bases de Données

Chaque microservice possède typiquement son propre data store pour assurer le couplage lâche. Les fournisseurs cloud offrent des services de bases de données managées simplifiant l'administration.

#### **Bases de Données Relationnelles Managées**

**AWS RDS (Relational Database Service)** :

- PostgreSQL, MySQL, MariaDB, Oracle, SQL Server
- Backup automatiques, patching, réplication
- Multi-AZ pour haute disponibilité

**Azure SQL Database / Azure Database for PostgreSQL** :

- Fully managed, haute disponibilité intégrée
- Scaling automatique (serverless tiers)
- Sécurité avancée (TDE, Always Encrypted)

**Google Cloud SQL** :

- PostgreSQL, MySQL, SQL Server
- Réplication automatique, backups
- Intégration avec VPC et IAM

**Architecture pour Tourism App** :

```
Tour Catalog Service → RDS PostgreSQL Instance 1 (tour_catalog_db)
Booking Service      → RDS PostgreSQL Instance 2 (booking_db)
Auth Service         → RDS PostgreSQL Instance 3 (auth_db)
```

**Avantages** :

- ✅ Backups automatiques et restauration point-in-time
- ✅ Patching et mises à jour gérés
- ✅ Réplication et haute disponibilité
- ✅ Monitoring et métriques inclus

#### **Bases de Données NoSQL Managées**

**AWS DynamoDB** :

- Base NoSQL clé-valeur et document
- Performance en millisecondes à un chiffre
- Auto-scaling illimité
- Cas d'usage : Préférences utilisateurs, sessions, cache

**Azure Cosmos DB** :

- Base multi-modèle (document, clé-valeur, graph, column-family)
- Distribution globale avec réplication multi-région
- SLA 99.999% de disponibilité

**Google Cloud Firestore** :

- Base NoSQL document
- Synchronisation en temps réel
- Scaling automatique

**Exemple pour Notification Service** :

```javascript
// Stocker les préférences de notification dans DynamoDB
const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB.DocumentClient();

async function saveUserPreferences(userId, preferences) {
  const params = {
    TableName: "UserNotificationPreferences",
    Item: {
      userId: userId,
      emailEnabled: preferences.emailEnabled,
      smsEnabled: preferences.smsEnabled,
      pushEnabled: preferences.pushEnabled,
      updatedAt: new Date().toISOString(),
    },
  };

  await dynamodb.put(params).promise();
}
```

### 2.3 Monitoring et Logging

La visibilité sur la santé et les performances des microservices est critique pour l'excellence opérationnelle.

#### **Logging Centralisé**

Agrège les logs de tous les microservices dans un système central.

**Solutions Cloud** :

| AWS                 | Azure                   | GCP                         |
| ------------------- | ----------------------- | --------------------------- |
| CloudWatch Logs     | Azure Monitor Logs      | Cloud Logging (Stackdriver) |
| CloudWatch Insights | Log Analytics           | Logs Explorer               |
| S3 pour archivage   | Log Analytics Workspace | BigQuery pour analyse       |

**Architecture de logging** :

```
┌────────────────────────────────────────────────┐
│          Microservices (Containers/VMs)        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │Tour      │  │Booking   │  │Payment   │      │
│  │Catalog   │  │Service   │  │Service   │      │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘      │
│       │             │              │           │
│       │ stdout/     │ stdout/      │ stdout/   │
│       │ stderr      │ stderr       │ stderr    │
│       ▼             ▼              ▼           │
│  ┌──────────────────────────────────────┐      │
│  │  Log Agent (Fluentd/CloudWatch Agent)│      │
│  └───────────────────┬──────────────────┘      │
└────────────────────────┼───────────────────────┘
                         │
                         ▼
         ┌───────────────────────────────┐
         │  Centralized Logging Service  │
         │  (CloudWatch / Azure Monitor) │
         └───────────────┬───────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
    ┌─────────┐    ┌─────────┐    ┌─────────┐
    │ Search  │    │ Alerts  │    │ Archive │
    │ & Query │    │         │    │ (S3)    │
    └─────────┘    └─────────┘    └─────────┘
```

**Exemple de configuration CloudWatch pour ECS** :

```json
{
  "logConfiguration": {
    "logDriver": "awslogs",
    "options": {
      "awslogs-group": "/ecs/tourism-app",
      "awslogs-region": "us-east-1",
      "awslogs-stream-prefix": "tour-catalog",
      "awslogs-create-group": "true"
    }
  }
}
```

#### **Application Performance Monitoring (APM)**

Outils et services surveillant les performances d'applications, fournissant des insights sur latence, taux d'erreurs et utilisation des ressources.

**Solutions** :

**AWS X-Ray** :

- Traçage distribué des requêtes à travers microservices
- Visualisation des dépendances et bottlenecks
- Intégration avec Lambda, ECS, EC2, API Gateway

**Azure Application Insights** :

- APM pour applications Azure
- Détection automatique des anomalies
- Live Metrics Stream en temps réel

**Google Cloud Trace / Profiler** :

- Traçage des requêtes distribuées
- Analyse de latence end-to-end
- Profiling CPU et mémoire

**Outils tiers** :

- **Datadog** : Monitoring full-stack
- **New Relic** : APM et observabilité
- **Dynatrace** : AI-powered APM

**Exemple d'intégration X-Ray dans Node.js** :

```javascript
// Installer : npm install aws-xray-sdk
const AWSXRay = require("aws-xray-sdk");
const express = require("express");

// Wrapper Express avec X-Ray
const app = express();
app.use(AWSXRay.express.openSegment("TourCatalogService"));

// Route avec traçage
app.get("/api/tours", async (req, res) => {
  // Créer un sous-segment pour tracer l'appel BDD
  const segment = AWSXRay.getSegment();
  const subsegment = segment.addNewSubsegment("database-query");

  try {
    const tours = await db.query("SELECT * FROM tours");
    subsegment.close();
    res.json(tours);
  } catch (error) {
    subsegment.addError(error);
    subsegment.close();
    res.status(500).json({ error: error.message });
  }
});

app.use(AWSXRay.express.closeSegment());
```

### 2.4 Sécurité

Implémenter des mesures de sécurité robustes est primordial lors du déploiement de microservices dans le cloud.

#### **Identity and Access Management (IAM)**

Contrôle qui peut faire quoi avec les ressources cloud. Chaque microservice devrait avoir un rôle IAM avec les permissions minimales nécessaires (principe du moindre privilège).

**Exemple de rôle IAM pour Booking Service (AWS)** :

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["rds:DescribeDBInstances", "rds:Connect"],
      "Resource": "arn:aws:rds:us-east-1:123456789012:db:booking-db"
    },
    {
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue"],
      "Resource": "arn:aws:secretsmanager:us-east-1:123456789012:secret:booking-db-credentials-*"
    },
    {
      "Effect": "Allow",
      "Action": ["sqs:SendMessage", "sqs:ReceiveMessage"],
      "Resource": "arn:aws:sqs:us-east-1:123456789012:booking-events-queue"
    }
  ]
}
```

#### **Secrets Management**

Stocker et gérer de manière sécurisée les informations sensibles comme clés API, credentials de bases de données et certificats.

**Solutions** :

| Service                                 | Provider    | Fonctionnalités                                |
| --------------------------------------- | ----------- | ---------------------------------------------- |
| **AWS Secrets Manager**                 | AWS         | Rotation automatique, versioning, audit        |
| **AWS Systems Manager Parameter Store** | AWS         | Gratuit (standard), intégration CloudFormation |
| **Azure Key Vault**                     | Azure       | Clés, secrets, certificats, HSM                |
| **Google Secret Manager**               | GCP         | Versioning, audit, IAM intégration             |
| **HashiCorp Vault**                     | Multi-cloud | Dynamic secrets, encryption as a service       |

**Exemple : Récupérer un secret dans Payment Service** :

```javascript
// AWS Secrets Manager
const AWS = require("aws-sdk");
const secretsManager = new AWS.SecretsManager({ region: "us-east-1" });

async function getStripeApiKey() {
  try {
    const data = await secretsManager
      .getSecretValue({
        SecretId: "payment-service/stripe-api-key",
      })
      .promise();

    return JSON.parse(data.SecretString).apiKey;
  } catch (error) {
    console.error("Failed to retrieve secret:", error);
    throw error;
  }
}

// Utilisation
const stripeApiKey = await getStripeApiKey();
const stripe = require("stripe")(stripeApiKey);
```

#### **Network Security**

Utiliser firewalls, security groups et listes de contrôle d'accès réseau (ACLs) pour restreindre le trafic.

**Bonnes pratiques** :

- 🔒 **Principe du moindre privilège** : Ouvrir uniquement les ports nécessaires
- 🔐 **Chiffrement en transit** : HTTPS/TLS pour toutes communications
- 🛡️ **WAF (Web Application Firewall)** : Protection contre attaques courantes (OWASP Top 10)
- 🌐 **VPN/PrivateLink** : Connexions privées entre VPCs ou vers services AWS

---

## 3. Scénarios de Déploiement Pratiques

Considérons le déploiement de notre Application de Tourisme Fullstack avec React dans le cloud, en utilisant AWS comme exemple (les principes s'appliquent aux autres fournisseurs).

### 3.1 Scénario 1 : Déploiement avec AWS Elastic Beanstalk (PaaS)

Cette approche est plus simple pour des microservices individuels, surtout si vous n'êtes pas prêt pour une orchestration complète de conteneurs.

#### **Étapes de Déploiement**

**1. Containeriser les Microservices** (optionnel mais recommandé)

Même avec PaaS comme Elastic Beanstalk, utiliser des images Docker peut fournir une cohérence d'environnement.

**Fichier : `tour-catalog-service/Dockerfile`**

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

**2. Créer une Application Elastic Beanstalk**

Pour chaque microservice (Tour Catalog, Booking Management, Payment Gateway), créer une application Elastic Beanstalk séparée.

```bash
# Installer EB CLI
pip install awsebcli

# Initialiser Elastic Beanstalk dans le répertoire du service
cd tour-catalog-service
eb init -p node.js-18 tour-catalog-app --region us-east-1

# Créer un environnement
eb create tour-catalog-env \
  --instance-type t3.medium \
  --min-instances 2 \
  --max-instances 10 \
  --envvars DB_HOST=tour-catalog-db.abc123.us-east-1.rds.amazonaws.com,DB_NAME=tour_catalog_db
```

**3. Configurer l'Environnement**

```yaml
# .ebextensions/options.config
option_settings:
  aws:elasticbeanstalk:environment:
    EnvironmentType: LoadBalanced
    ServiceRole: aws-elasticbeanstalk-service-role

  aws:elasticbeanstalk:environment:process:default:
    HealthCheckPath: /api/health
    Port: 3001
    Protocol: HTTP

  aws:autoscaling:launchconfiguration:
    InstanceType: t3.medium
    IamInstanceProfile: aws-elasticbeanstalk-ec2-role

  aws:autoscaling:asg:
    MinSize: 2
    MaxSize: 10

  aws:autoscaling:trigger:
    MeasureName: CPUUtilization
    Unit: Percent
    UpperThreshold: 70
    LowerThreshold: 30
```

**4. Provisionner les Bases de Données**

```bash
# Créer une instance RDS PostgreSQL
aws rds create-db-instance \
  --db-instance-identifier tour-catalog-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username dbadmin \
  --master-user-password SecurePassword123! \
  --allocated-storage 20 \
  --vpc-security-group-ids sg-0123456789abcdef0 \
  --db-subnet-group-name tour-catalog-subnet-group \
  --backup-retention-period 7 \
  --multi-az
```

**5. Déployer**

```bash
# Déployer le code
eb deploy

# Vérifier le statut
eb status

# Voir les logs
eb logs
```

**Architecture résultante** :

```
┌────────────────────────────────────────────────────────┐
│                  AWS Elastic Beanstalk                 │
│                                                        │
│  ┌────────────────────────────────────────────────┐    │
│  │  Tour Catalog Environment                      │    │
│  │  ├─ Application Load Balancer                  │    │
│  │  ├─ Auto Scaling Group (2-10 EC2 instances)    │    │
│  │  │  └─ Docker container (tour-catalog:latest)  │    │
│  │  └─ CloudWatch monitoring                      │    │
│  └────────────────────────────────────────────────┘    │
│                           │                            │
│                           ▼                            │
│  ┌────────────────────────────────────────────────┐    │
│  │  RDS PostgreSQL                                │    │
│  │  tour-catalog-db (Multi-AZ)                    │    │
│  └────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────┘
```

### 3.2 Scénario 2 : Déploiement avec AWS ECS Fargate (CaaS/Serverless)

Cette approche moderne exploite la containerisation et le calcul serverless pour les microservices.

#### **Étapes de Déploiement**

**1. Containeriser Tous les Microservices**

Chaque microservice doit avoir un Dockerfile et être construit en image Docker.

**2. Pousser les Images vers ECR**

```bash
# Se connecter à ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  123456789012.dkr.ecr.us-east-1.amazonaws.com

# Créer un repository ECR
aws ecr create-repository --repository-name booking-management-service

# Build et tag l'image
docker build -t booking-management-service:latest ./booking-management-service

docker tag booking-management-service:latest \
  123456789012.dkr.ecr.us-east-1.amazonaws.com/booking-management-service:latest

# Push vers ECR
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/booking-management-service:latest
```

**3. Créer un Cluster ECS**

```bash
aws ecs create-cluster --cluster-name tourism-app-cluster
```

**4. Définir une Task Definition**

**Fichier : `booking-management-service-task-definition.json`**

```json
{
  "family": "booking-management-service-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::123456789012:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::123456789012:role/bookingServiceTaskRole",
  "containerDefinitions": [
    {
      "name": "booking-management-service-container",
      "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/booking-management-service:latest",
      "portMappings": [
        {
          "containerPort": 3002,
          "protocol": "tcp"
        }
      ],
      "environment": [
        { "name": "NODE_ENV", "value": "production" },
        { "name": "PORT", "value": "3002" },
        {
          "name": "TOUR_CATALOG_SERVICE_URL",
          "value": "http://tour-catalog-service:3001"
        }
      ],
      "secrets": [
        {
          "name": "DB_HOST",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:booking-db-host"
        },
        {
          "name": "DB_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:booking-db-password"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/booking-management-service",
          "awslogs-region": "us-east-1",
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
      }
    }
  ]
}
```

**Enregistrer la Task Definition** :

```bash
aws ecs register-task-definition \
  --cli-input-json file://booking-management-service-task-definition.json
```

**5. Créer un Service ECS**

```bash
aws ecs create-service \
  --cluster tourism-app-cluster \
  --service-name booking-management-service \
  --task-definition booking-management-service-task:1 \
  --desired-count 3 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={
      subnets=[subnet-0123456789abcdef0,subnet-0fedcba9876543210],
      securityGroups=[sg-0123456789abcdef0],
      assignPublicIp=DISABLED
  }" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/booking-tg/abc123,containerName=booking-management-service-container,containerPort=3002" \
  --health-check-grace-period-seconds 60
```

**6. Configurer Auto-Scaling**

```bash
# Enregistrer la cible scalable
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/tourism-app-cluster/booking-management-service \
  --min-capacity 3 \
  --max-capacity 15

# Créer une politique de scaling basée sur CPU
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/tourism-app-cluster/booking-management-service \
  --policy-name booking-cpu-scaling \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration file://scaling-policy.json
```

**Fichier : `scaling-policy.json`**

```json
{
  "TargetValue": 70.0,
  "PredefinedMetricSpecification": {
    "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
  },
  "ScaleInCooldown": 300,
  "ScaleOutCooldown": 60
}
```

**Architecture résultante** :

```
┌──────────────────────────────────────────────────────┐
│            AWS ECS Fargate Architecture              │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │  Application Load Balancer                     │  │
│  │  (Public subnet)                               │  │
│  └───────────────────┬────────────────────────────┘  │
│                      │                               │
│  ┌───────────────────▼──────────────────────────┐    │
│  │  ECS Service: booking-management-service     │    │
│  │  (Private subnet)                            │    │
│  │                                              │    │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐       │    │
│  │  │ Task 1  │  │ Task 2  │  │ Task 3  │       │    │
│  │  │ [Cont]  │  │ [Cont]  │  │ [Cont]  │       │    │
│  │  │ Fargate │  │ Fargate │  │ Fargate │       │    │
│  │  └─────────┘  └─────────┘  └─────────┘       │    │
│  │                                              │    │
│  │  Auto-scaling: 3-15 tasks                    │    │
│  └─────────────────┬────────────────────────────┘    │
│                    │                                 │
│  ┌─────────────────▼────────────────────────────┐    │
│  │  RDS PostgreSQL Multi-AZ                     │    │
│  │  booking-db (Private subnet)                 │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  CloudWatch Logs ← Logs from all tasks               │
│  AWS Secrets Manager ← DB credentials                │
└──────────────────────────────────────────────────────┘
```

---

## 4. Application Réelle

Une agence de voyage en ligne (OTA) importante comme Booking.com ou Expedia gère un vaste écosystème de microservices, chacun responsable de domaines spécifiques comme recherche de vols, réservations d'hôtels, location de voitures ou traitement des paiements.

**Exemple : Hotel Search Microservice**

Ce service pourrait être déployé sur un service Kubernetes managé comme GKE ou AKS :

```
┌──────────────────────────────────────────────────────┐
│         Google Kubernetes Engine (GKE)               │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │  Deployment: hotel-search                    │    │
│  │  Replicas: 50 (auto-scaled)                  │    │
│  │                                              │    │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐       │    │
│  │  │ Pod 1   │  │ Pod 2   │  │ Pod...50│       │    │
│  │  │ [App]   │  │ [App]   │  │ [App]   │       │    │
│  │  │ [Cache] │  │ [Cache] │  │ [Cache] │       │    │
│  │  └─────────┘  └─────────┘  └─────────┘       │    │
│  │                                              │    │
│  │  HPA: CPU > 70% → scale up                   │    │
│  │       CPU < 30% → scale down                 │    │
│  └────────────────┬─────────────────────────────┘    │
│                   │                                  │
│  ┌────────────────▼──────────────────────────────┐   │
│  │  Cloud Firestore (Global distribution)        │   │
│  │  Hotel inventory, pricing, availability       │   │
│  └───────────────────────────────────────────────┘   │
│                                                      │
│  Cloud Monitoring & Logging                          │
│  Istio Service Mesh (mTLS, traffic management)       │
└──────────────────────────────────────────────────────┘
```

**Caractéristiques** :

- 🌍 **Distribution globale** : Répliques dans multiple régions (us-east, eu-west, ap-southeast)
- 📈 **Auto-scaling agressif** : Pendant vacances et saisons hautes
- 🔄 **Rolling updates** : Déploiements sans interruption
- 🛡️ **Self-healing** : Kubernetes remplace automatiquement les Pods défaillants

---

## 5. Exercices

### Exercice 1 - Planification de Scénario

Vous êtes chargé de déployer le Notification Microservice pour notre Tourism App. Ce service utilise RabbitMQ (Module 5) pour consommer des événements et une base de données NoSQL pour les préférences utilisateurs.

**Tâche** : Décrivez une stratégie de déploiement appropriée en utilisant :

- **Option A** : Azure App Service (PaaS)
- **Option B** : Google Kubernetes Engine (GKE)

Détaillez les étapes, le choix de la base de données, les considérations réseau et comment sécuriser la connexion RabbitMQ.

### Exercice 2 - Création de Task Definition

En utilisant le Dockerfile fourni pour le Booking Management Service, rédigez une Task Definition AWS ECS Fargate simplifiée (format JSON) pour un hypothétique Payment Gateway Microservice.

**Spécifications** :

- Image Docker : `payment-service:latest` poussée vers votre ECR
- Port : 3002
- Ressources : 512 CPU units, 1024 MiB memory
- Variable d'environnement : `STRIPE_API_KEY` (valeur peut être placeholder)
- Logging vers CloudWatch Log Group `/ecs/payment-service`

### Exercice 3 - Configuration Security Group

Pour le Tour Catalog microservice déployé sur une instance AWS EC2 (modèle IaaS), il se connecte à une base de données AWS RDS PostgreSQL.

**Tâche** : Décrivez les règles entrantes minimales nécessaires pour :

1. **Security Group de l'instance EC2** (tour-catalog-sg)
2. **Security Group de l'instance RDS** (tour-catalog-db-sg)

**Contraintes** :

- L'instance EC2 est dans un sous-réseau privé
- Accessible uniquement via un load balancer interne
- RDS est également dans un sous-réseau privé

---

## Résumé de la Leçon

Cette leçon a fourni une vue d'ensemble complète du déploiement de microservices sur des plateformes cloud.

**Points clés à retenir** :

✅ **Modèles de déploiement** : IaaS (contrôle total), PaaS (facilité), CaaS (orchestration)  
✅ **AWS, Azure, GCP** : Offrent des services similaires avec des noms différents  
✅ **Networking** : VPC, Load Balancers, Security Groups essentiels  
✅ **Databases managées** : Réduisent charge opérationnelle (RDS, DynamoDB, Cosmos DB)  
✅ **Monitoring et logging** : CloudWatch, Azure Monitor, Cloud Logging  
✅ **Sécurité** : IAM, Secrets Manager, chiffrement en transit et au repos  
✅ **ECS Fargate** : Serverless containers, pas de gestion de serveurs  
✅ **Managed Kubernetes** : GKE, AKS, EKS pour orchestration robuste

**Comparaison des approches** :

| Aspect             | IaaS (EC2/VM) | PaaS (Elastic Beanstalk) | CaaS (ECS/GKE)     |
| ------------------ | ------------- | ------------------------ | ------------------ |
| **Contrôle**       | Maximum       | Moyen                    | Élevé              |
| **Complexité**     | Élevée        | Faible                   | Moyenne-Élevée     |
| **Maintenance**    | Vous          | Provider                 | Partagée           |
| **Scaling**        | Manuel        | Automatique              | Automatique avancé |
| **Coût initial**   | Faible        | Moyen                    | Moyen-Élevé        |
| **Time-to-market** | Lent          | Rapide                   | Moyen              |

---

## Prochaines Étapes

Dans la leçon suivante, nous explorerons l'**API Gateway avancé** et les patterns de communication pour microservices, incluant circuit breakers, retry policies et API composition. Nous verrons également comment implémenter un logging et monitoring centralisés avec ELK Stack (Elasticsearch, Logstash, Kibana).

---

## Ressources Complémentaires

**AWS** :

- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
- [ECS Best Practices Guide](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/)
- [AWS Security Best Practices](https://aws.amazon.com/security/best-practices/)

**Azure** :

- [Azure Architecture Center](https://docs.microsoft.com/en-us/azure/architecture/)
- [AKS Best Practices](https://docs.microsoft.com/en-us/azure/aks/best-practices)
- [Azure Security Baseline](https://docs.microsoft.com/en-us/security/benchmark/azure/)

**GCP** :

- [Google Cloud Architecture Framework](https://cloud.google.com/architecture/framework)
- [GKE Best Practices](https://cloud.google.com/kubernetes-engine/docs/best-practices)
- [GCP Security Best Practices](https://cloud.google.com/security/best-practices)

**Multi-cloud** :

- [The Twelve-Factor App](https://12factor.net/) (méthodologie pour apps cloud-native)
- [CNCF Cloud Native Trail Map](https://github.com/cncf/trailmap)

---

## Navigation

- **⬅️ Précédent** : [Leçon 6.2 : Orchestration avec Docker Compose et Fondamentaux de Kubernetes](lecon-2-orchestration-compose-kubernetes.md)
- **➡️ Suivant** : [Leçon 6.4 - Mise en œuvre d'une passerelle API pour un accès centralisé](lecon-4-gateaway-centralized-access.md)
- **🏠 Sommaire** : [Retour au README](README.md)

---
