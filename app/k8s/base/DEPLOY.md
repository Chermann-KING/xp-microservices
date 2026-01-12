# Guide de Déploiement Kubernetes - Booking Tourism App

## Vue d'ensemble

Ce répertoire contient tous les manifests Kubernetes nécessaires pour déployer l'application de réservation touristique complète.

## Architecture Déployée

### Infrastructure

- **PostgreSQL** (4 instances) - Bases de données pour chaque service
- **RabbitMQ** - Message broker pour communication asynchrone
- **Redis** - Cache et stockage de sessions

### Microservices Backend

- **Auth Service** (Port 3003) - Authentification et autorisation
- **Tour Service** (Port 3001) - Catalogue de tours
- **Booking Service** (Port 3002) - Gestion des réservations
- **Payment Service** (Port 3004) - Traitement des paiements
- **Notification Service** (Port 3006) - Envoi d'emails/notifications
- **WebSocket Service** (Port 3007) - Communication temps réel

### Frontend

- **API Gateway** (Port 3000) - Point d'entrée unique, routage, rate limiting

## Prérequis

1. **Cluster Kubernetes** fonctionnel:

   - Minikube (développement local)
   - Kind (développement local)
   - EKS/GKE/AKS (production cloud)

2. **Outils installés**:

   ```bash
   # kubectl
   kubectl version --client

   # kustomize (optionnel, intégré à kubectl)
   kubectl kustomize --help

   # Ingress Controller (NGINX)
   kubectl get ingressclass
   ```

3. **Images Docker** buildées et pushées:

   ```bash
   # Remplacer 'your-docker-username' par votre username Docker Hub
   docker build -t your-docker-username/auth-service:latest ./auth-service
   docker push your-docker-username/auth-service:latest

   # Répéter pour tous les services...
   ```

## Déploiement Complet

### Option 1: Déploiement avec Kustomize (Recommandé)

```bash
# Depuis le répertoire racine du projet
cd app/k8s/base

# 1. Preview des ressources qui seront créées
kubectl kustomize . | less

# 2. Appliquer toutes les ressources
kubectl apply -k .

# 3. Vérifier le déploiement
kubectl get all -n booking-tourism-app
```

### Option 2: Déploiement Manuel (Étape par Étape)

```bash
cd app/k8s/base

# 1. Créer le namespace
kubectl apply -f namespace.yaml

# 2. Créer les ConfigMaps et Secrets
kubectl apply -f configmap.yaml
kubectl apply -f secrets.yaml

# 3. Déployer l'infrastructure
kubectl apply -f postgres-deployment.yaml
kubectl apply -f redis-deployment.yaml
kubectl apply -f rabbitmq-deployment.yaml

# Attendre que l'infrastructure soit prête
kubectl wait --for=condition=ready pod -l tier=database -n booking-tourism-app --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis -n booking-tourism-app --timeout=120s
kubectl wait --for=condition=ready pod -l app=rabbitmq -n booking-tourism-app --timeout=120s

# 4. Déployer les microservices
kubectl apply -f auth-deployment.yaml
kubectl apply -f tour-deployment.yaml
kubectl apply -f booking-deployment.yaml
kubectl apply -f payment-deployment.yaml
kubectl apply -f notification-deployment.yaml
kubectl apply -f websocket-deployment.yaml

# 5. Déployer l'API Gateway
kubectl apply -f api-gateway-deployment.yaml

# 6. Créer les Services Kubernetes
kubectl apply -f services-app.yaml

# 7. Créer l'Ingress (exposition externe)
kubectl apply -f ingress.yaml

# 8. Activer l'autoscaling
kubectl apply -f hpa.yaml
```

## Vérification du Déploiement

### 1. État des Pods

```bash
# Voir tous les pods
kubectl get pods -n booking-tourism-app

# Voir les pods avec plus de détails
kubectl get pods -n booking-tourism-app -o wide

# Suivre les logs d'un pod
kubectl logs -f <pod-name> -n booking-tourism-app

# Voir les logs de tous les pods d'un service
kubectl logs -l app=tour-service -n booking-tourism-app --tail=100
```

### 2. État des Services

```bash
# Lister tous les services
kubectl get services -n booking-tourism-app

# Détails d'un service
kubectl describe service api-gateway -n booking-tourism-app
```

### 3. État des Deployments

```bash
# Lister tous les deployments
kubectl get deployments -n booking-tourism-app

# Détails d'un deployment
kubectl describe deployment tour-service -n booking-tourism-app

# Historique des rollouts
kubectl rollout history deployment/tour-service -n booking-tourism-app
```

### 4. État de l'Ingress

```bash
# Voir l'Ingress
kubectl get ingress -n booking-tourism-app

# Détails de l'Ingress
kubectl describe ingress booking-tourism-app-ingress -n booking-tourism-app
```

### 5. État des HPA (Autoscalers)

```bash
# Voir tous les HPA
kubectl get hpa -n booking-tourism-app

# Détails d'un HPA
kubectl describe hpa api-gateway-hpa -n booking-tourism-app
```

## Tests de Fonctionnement

### 1. Test depuis l'intérieur du cluster

```bash
# Créer un pod temporaire pour tester
kubectl run test-pod --rm -it --image=curlimages/curl -n booking-tourism-app -- sh

# Dans le pod, tester les services
curl http://api-gateway:3000/health
curl http://tour-service:3001/health
curl http://booking-service:3002/health
curl http://auth-service:3003/health
curl http://payment-service:3004/health
curl http://notification-service:3006/health
curl http://websocket-service:3007/health

# Sortir du pod
exit
```

### 2. Test depuis l'extérieur (avec Ingress)

```bash
# Obtenir l'IP de l'Ingress
kubectl get ingress -n booking-tourism-app

# Tester avec curl (remplacer <INGRESS_IP> par l'IP obtenue)
curl http://<INGRESS_IP>/api/health

# Ou avec le nom de domaine (si configuré dans /etc/hosts)
curl http://booking-tourism-app.com/api/health
```

### 3. Test avec Minikube

```bash
# Activer l'addon Ingress
minikube addons enable ingress

# Obtenir l'URL du service
minikube service api-gateway -n booking-tourism-app --url

# Ou utiliser le tunnel Minikube
minikube tunnel

# Dans un autre terminal
curl http://$(minikube ip)/api/health
```

## Configuration Post-Déploiement

### 1. Configurer les DNS (Production)

Pointer votre domaine vers l'adresse IP de l'Ingress:

```bash
# Obtenir l'IP publique de l'Ingress
kubectl get ingress -n booking-tourism-app

# Configurer dans votre DNS provider:
# A record: booking-tourism-app.com -> <INGRESS_IP>
# A record: www.booking-tourism-app.com -> <INGRESS_IP>
# A record: api.booking-tourism-app.com -> <INGRESS_IP>
```

### 2. Configurer SSL/TLS avec Cert-Manager

```bash
# Installer cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Créer un ClusterIssuer pour Let's Encrypt
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF

# Les certificats seront automatiquement créés par l'annotation dans ingress.yaml
```

## Scaling Manuel

```bash
# Scaler un deployment manuellement
kubectl scale deployment tour-service --replicas=5 -n booking-tourism-app

# Vérifier
kubectl get deployment tour-service -n booking-tourism-app
```

## Mise à Jour d'un Service

```bash
# Mettre à jour l'image d'un service
kubectl set image deployment/tour-service \
  tour-service=your-docker-username/tour-service:v2.0.0 \
  -n booking-tourism-app

# Suivre le rollout
kubectl rollout status deployment/tour-service -n booking-tourism-app

# Voir l'historique des rollouts
kubectl rollout history deployment/tour-service -n booking-tourism-app

# Rollback en cas de problème
kubectl rollout undo deployment/tour-service -n booking-tourism-app

# Rollback vers une révision spécifique
kubectl rollout undo deployment/tour-service --to-revision=2 -n booking-tourism-app
```

## Debugging

### Problèmes Courants

#### 1. Pods en CrashLoopBackOff

```bash
# Voir les logs
kubectl logs <pod-name> -n booking-tourism-app

# Voir les logs du conteneur précédent (si redémarré)
kubectl logs <pod-name> --previous -n booking-tourism-app

# Décrire le pod pour voir les events
kubectl describe pod <pod-name> -n booking-tourism-app
```

#### 2. Service non accessible

```bash
# Vérifier que le pod est ready
kubectl get pods -n booking-tourism-app

# Vérifier les endpoints du service
kubectl get endpoints <service-name> -n booking-tourism-app

# Vérifier la configuration du service
kubectl describe service <service-name> -n booking-tourism-app
```

#### 3. Base de données non accessible

```bash
# Vérifier le StatefulSet PostgreSQL
kubectl get statefulset -n booking-tourism-app

# Tester la connexion depuis un pod
kubectl run pg-test --rm -it --image=postgres:15-alpine -n booking-tourism-app -- \
  psql postgresql://postgres:postgres@postgres-tour-service:5432/tour_service_db -c "SELECT 1"
```

#### 4. Ingress ne fonctionne pas

```bash
# Vérifier l'Ingress Controller
kubectl get pods -n ingress-nginx

# Vérifier les logs de l'Ingress Controller
kubectl logs -n ingress-nginx <ingress-controller-pod-name>

# Vérifier la configuration de l'Ingress
kubectl describe ingress booking-tourism-app-ingress -n booking-tourism-app
```

## Nettoyage

### Supprimer toutes les ressources

```bash
# Avec Kustomize
kubectl delete -k app/k8s/base

# Ou manuellement
kubectl delete namespace booking-tourism-app

# Vérifier que tout est supprimé
kubectl get all -n booking-tourism-app
```

### Supprimer seulement les déploiements (garder les données)

```bash
kubectl delete deployment --all -n booking-tourism-app
kubectl delete hpa --all -n booking-tourism-app
kubectl delete ingress --all -n booking-tourism-app
```

## Monitoring et Observabilité

### 1. Métriques avec Metrics Server

```bash
# Installer Metrics Server (si pas déjà installé)
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Voir les métriques des pods
kubectl top pods -n booking-tourism-app

# Voir les métriques des nœuds
kubectl top nodes
```

### 2. Dashboard Kubernetes

```bash
# Installer le Dashboard
kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.7.0/aio/deploy/recommended.yaml

# Créer un utilisateur admin
kubectl create serviceaccount dashboard-admin -n kubernetes-dashboard
kubectl create clusterrolebinding dashboard-admin \
  --clusterrole=cluster-admin \
  --serviceaccount=kubernetes-dashboard:dashboard-admin

# Obtenir le token
kubectl create token dashboard-admin -n kubernetes-dashboard

# Lancer le proxy
kubectl proxy

# Accéder au Dashboard: http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/
```

## Sécurité

### 1. Rotation des Secrets

```bash
# Encoder une nouvelle valeur en base64
echo -n "nouveau-secret" | base64

# Éditer le secret
kubectl edit secret jwt-secrets -n booking-tourism-app

# Redémarrer les pods pour charger le nouveau secret
kubectl rollout restart deployment auth-service -n booking-tourism-app
```

### 2. Network Policies (Isolation réseau)

```bash
# Appliquer des Network Policies pour isoler les services
# Voir le fichier network-policies.yaml (à créer)
kubectl apply -f network-policies.yaml
```

## Support et Documentation

- **Documentation Kubernetes**: https://kubernetes.io/docs/
- **Kustomize**: https://kustomize.io/
- **NGINX Ingress Controller**: https://kubernetes.github.io/ingress-nginx/
- **Cert-Manager**: https://cert-manager.io/docs/
