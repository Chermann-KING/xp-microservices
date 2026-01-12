#!/bin/bash
# Script de déploiement Kubernetes - Application de Réservation Touristique
# Module 6 - Leçon 6.2 : Orchestration Kubernetes

set -e  # Exit on error

# Couleurs pour output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "=========================================="
echo "Déploiement Kubernetes - Booking Tourism App"
echo "=========================================="

# Fonction pour afficher les messages
log_info() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

# Vérifier que kubectl est installé
if ! command -v kubectl &> /dev/null; then
    log_error "kubectl n'est pas installé. Veuillez l'installer."
    exit 1
fi

log_info "kubectl trouvé : $(kubectl version --client --short 2>/dev/null || kubectl version --client)"

# Vérifier la connexion au cluster
if ! kubectl cluster-info &> /dev/null; then
    log_error "Impossible de se connecter au cluster Kubernetes"
    exit 1
fi

log_info "Connecté au cluster Kubernetes"

# Demander confirmation
read -p "Voulez-vous déployer l'application ? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_warn "Déploiement annulé"
    exit 0
fi

# 1. Créer le namespace
log_info "Création du namespace..."
kubectl apply -f base/namespace.yaml

# 2. Créer ConfigMaps et Secrets
log_info "Création des ConfigMaps et Secrets..."
kubectl apply -f base/configmap.yaml
kubectl apply -f base/secrets.yaml

# 3. Déployer l'infrastructure (PostgreSQL, RabbitMQ, Redis)
log_info "Déploiement de l'infrastructure..."
kubectl apply -f base/postgres-deployment.yaml
kubectl apply -f base/rabbitmq-deployment.yaml
kubectl apply -f base/redis-deployment.yaml

# 4. Attendre que l'infrastructure soit prête
log_info "Attente de la disponibilité de l'infrastructure (max 5 min)..."
kubectl wait --for=condition=ready pod -l tier=database -n booking-tourism-app --timeout=300s || log_warn "Timeout - certains pods peuvent ne pas être prêts"

# 5. Déployer les services backend
log_info "Déploiement des microservices..."
kubectl apply -f base/auth-deployment.yaml
kubectl apply -f base/payment-deployment.yaml
kubectl apply -f base/booking-deployment.yaml
kubectl apply -f base/tour-deployment.yaml
kubectl apply -f base/notification-deployment.yaml
kubectl apply -f base/websocket-deployment.yaml

# 6. Déployer l'API Gateway
log_info "Déploiement de l'API Gateway..."
kubectl apply -f base/api-gateway-deployment.yaml

# 7. Créer les services Kubernetes
log_info "Création des services..."
kubectl apply -f base/services-app.yaml

# 8. Déployer l'Ingress
log_info "Déploiement de l'Ingress..."
kubectl apply -f base/ingress.yaml

# 9. Déployer les HPAs
log_info "Configuration de l'auto-scaling..."
kubectl apply -f base/hpa.yaml

# Afficher le statut
echo ""
echo "=========================================="
log_info "Déploiement terminé !"
echo "=========================================="
echo ""

# Afficher les pods
echo "Pods déployés :"
kubectl get pods -n booking-tourism-app

echo ""
echo "Services disponibles :"
kubectl get services -n booking-tourism-app

echo ""
echo "Ingress configuré :"
kubectl get ingress -n booking-tourism-app

echo ""
echo "=========================================="
log_info "Pour vérifier le déploiement :"
echo "  kubectl get all -n booking-tourism-app"
echo ""
log_info "Pour voir les logs d'un service :"
echo "  kubectl logs -f deployment/tour-catalog-deployment -n booking-tourism-app"
echo ""
log_info "Pour accéder à l'application :"
echo "  kubectl port-forward service/api-gateway-service 8080:8080 -n booking-tourism-app"
echo "=========================================="
