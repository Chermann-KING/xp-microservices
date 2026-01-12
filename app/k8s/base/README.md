# Kubernetes Manifests - Application de Réservation Touristique

## Module 6 - Leçon 6.2 : Orchestration avec Kubernetes

Ce dossier contient tous les manifests Kubernetes pour déployer l'application de réservation touristique sur un cluster Kubernetes.

## 📁 Structure

```
k8s/
├── base/                          # Manifests de base (environnement-agnostique)
│   ├── namespace.yaml             # Namespace: booking-tourism-app
│   ├── configmap.yaml             # ConfigMaps (configuration non-sensible)
│   ├── secrets.yaml               # Secrets (données sensibles)
│   ├── postgres-deployment.yaml   # StatefulSets PostgreSQL (4 instances)
│   ├── rabbitmq-deployment.yaml   # Deployment RabbitMQ
│   ├── redis-deployment.yaml      # Deployment Redis
│   ├── services-infra.yaml        # Services pour infrastructure
│   ├── auth-deployment.yaml       # Deployment Auth Service
│   ├── payment-deployment.yaml    # Deployment Payment Service
│   ├── booking-deployment.yaml    # Deployment Booking Service
│   ├── tour-deployment.yaml       # Deployment Tour Catalog Service
│   ├── notification-deployment.yaml # Deployment Notification Service
│   ├── websocket-deployment.yaml  # Deployment WebSocket Server
│   ├── api-gateway-deployment.yaml # Deployment API Gateway
│   ├── services-app.yaml          # Services pour microservices
│   ├── ingress.yaml               # Ingress pour exposition externe
│   ├── hpa.yaml                   # Horizontal Pod Autoscalers
│   └── README.md                  # Ce fichier
│
└── overlays/                      # Configurations spécifiques par environnement
    ├── dev/                       # Développement
    └── prod/                      # Production

```

## 🚀 Déploiement

### Prérequis

- Cluster Kubernetes fonctionnel (minikube, kind, GKE, EKS, AKS)
- kubectl configuré
- Stockage persistant disponible (PersistentVolumes)

### Déploiement complet

```bash
# 1. Créer le namespace
kubectl apply -f base/namespace.yaml

# 2. Créer les ConfigMaps et Secrets
kubectl apply -f base/configmap.yaml
kubectl apply -f base/secrets.yaml

# 3. Déployer l'infrastructure (PostgreSQL, RabbitMQ, Redis)
kubectl apply -f base/postgres-deployment.yaml
kubectl apply -f base/rabbitmq-deployment.yaml
kubectl apply -f base/redis-deployment.yaml
kubectl apply -f base/services-infra.yaml

# 4. Attendre que l'infrastructure soit prête
kubectl wait --for=condition=ready pod -l tier=database -n booking-tourism-app --timeout=300s

# 5. Déployer les microservices
kubectl apply -f base/auth-deployment.yaml
kubectl apply -f base/payment-deployment.yaml
kubectl apply -f base/booking-deployment.yaml
kubectl apply -f base/tour-deployment.yaml
kubectl apply -f base/notification-deployment.yaml
kubectl apply -f base/websocket-deployment.yaml
kubectl apply -f base/api-gateway-deployment.yaml
kubectl apply -f base/services-app.yaml

# 6. Déployer l'Ingress
kubectl apply -f base/ingress.yaml

# 7. Déployer les HPAs
kubectl apply -f base/hpa.yaml
```

### Script de déploiement automatique

```bash
# Déployer tout en une commande
./deploy.sh

# Ou avec kubectl
kubectl apply -k base/
```

## 🔍 Vérification

```bash
# Vérifier tous les pods
kubectl get pods -n booking-tourism-app

# Vérifier les services
kubectl get services -n booking-tourism-app

# Vérifier les deployments
kubectl get deployments -n booking-tourism-app

# Vérifier les ingress
kubectl get ingress -n booking-tourism-app

# Logs d'un service
kubectl logs -f deployment/tour-catalog-deployment -n booking-tourism-app
```

## 🔐 Secrets

**IMPORTANT** : Les secrets dans `secrets.yaml` sont des exemples encodés en base64.
En production, utiliser :

- **Sealed Secrets** (Bitnami)
- **External Secrets Operator**
- **AWS Secrets Manager** / **Azure Key Vault** / **GCP Secret Manager**

### Encoder un secret

```bash
echo -n "ma-valeur-secrete" | base64
```

### Créer un secret depuis la CLI

```bash
kubectl create secret generic jwt-secrets \
  --from-literal=JWT_ACCESS_SECRET=votre-secret-access \
  --from-literal=JWT_REFRESH_SECRET=votre-secret-refresh \
  -n booking-tourism-app
```

## 📊 Horizontal Pod Autoscaling

Les HPAs sont configurés pour :

| Service         | Min Replicas | Max Replicas | CPU Target |
| --------------- | ------------ | ------------ | ---------- |
| API Gateway     | 2            | 10           | 70%        |
| Tour Catalog    | 2            | 8            | 70%        |
| Booking Service | 2            | 8            | 70%        |
| Payment Service | 2            | 6            | 70%        |

```bash
# Vérifier le statut des HPAs
kubectl get hpa -n booking-tourism-app
```

## 🌐 Accès à l'application

Après déploiement de l'Ingress :

- **API Gateway** : `http://api.booking-tourism-app.com`
- **Frontend** : `http://booking-tourism-app.com`
- **RabbitMQ Management** : `http://rabbitmq.booking-tourism-app.com`

## 🧪 Tests

```bash
# Health check API Gateway
kubectl run test --rm -it --image=curlimages/curl -- \
  curl http://api-gateway-service.booking-tourism-app.svc.cluster.local:8080/health

# Test communication inter-services
kubectl run test --rm -it --image=curlimages/curl -- \
  curl http://tour-catalog-service.booking-tourism-app.svc.cluster.local:3001/api/health
```

## 🗑️ Nettoyage

```bash
# Supprimer tous les ressources
kubectl delete namespace booking-tourism-app

# Ou supprimer une par une
kubectl delete -f base/
```

## 📚 Ressources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Kustomize](https://kustomize.io/)
- [Helm Charts](https://helm.sh/)
