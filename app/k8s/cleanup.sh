#!/bin/bash
# Script de nettoyage Kubernetes - Application de Réservation Touristique
# Module 6 - Leçon 6.2 : Orchestration Kubernetes

set -e

# Couleurs
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

echo "=========================================="
echo "Nettoyage Kubernetes - Booking Tourism App"
echo "=========================================="

log_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_info() {
    echo -e "${GREEN}✓${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

# Vérifier kubectl
if ! command -v kubectl &> /dev/null; then
    log_error "kubectl n'est pas installé"
    exit 1
fi

# Vérifier si le namespace existe
if ! kubectl get namespace booking-tourism-app &> /dev/null; then
    log_warn "Le namespace booking-tourism-app n'existe pas"
    exit 0
fi

# Afficher les ressources actuelles
echo ""
log_info "Ressources actuelles dans booking-tourism-app :"
kubectl get all -n booking-tourism-app

echo ""
log_warn "⚠️  ATTENTION : Cette action va supprimer TOUTES les ressources !"
log_warn "Cela inclut les bases de données et leurs données (PersistentVolumes)"
echo ""
read -p "Êtes-vous sûr de vouloir continuer ? (yes/no) " -r
echo

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    log_info "Nettoyage annulé"
    exit 0
fi

# Supprimer les ressources dans l'ordre inverse du déploiement
log_info "Suppression des HPAs..."
kubectl delete -f base/hpa.yaml --ignore-not-found=true

log_info "Suppression de l'Ingress..."
kubectl delete -f base/ingress.yaml --ignore-not-found=true

log_info "Suppression des services..."
kubectl delete -f base/services-app.yaml --ignore-not-found=true

log_info "Suppression de l'API Gateway..."
kubectl delete -f base/api-gateway-deployment.yaml --ignore-not-found=true

log_info "Suppression des microservices..."
kubectl delete -f base/auth-deployment.yaml --ignore-not-found=true
kubectl delete -f base/payment-deployment.yaml --ignore-not-found=true
kubectl delete -f base/booking-deployment.yaml --ignore-not-found=true
kubectl delete -f base/tour-deployment.yaml --ignore-not-found=true
kubectl delete -f base/notification-deployment.yaml --ignore-not-found=true
kubectl delete -f base/websocket-deployment.yaml --ignore-not-found=true

log_info "Suppression de l'infrastructure..."
kubectl delete -f base/rabbitmq-deployment.yaml --ignore-not-found=true
kubectl delete -f base/redis-deployment.yaml --ignore-not-found=true
kubectl delete -f base/postgres-deployment.yaml --ignore-not-found=true

log_info "Suppression des ConfigMaps et Secrets..."
kubectl delete -f base/configmap.yaml --ignore-not-found=true
kubectl delete -f base/secrets.yaml --ignore-not-found=true

# Demander si on supprime aussi le namespace (et donc les PVCs)
echo ""
read -p "Supprimer aussi le namespace (supprimera les données persistantes) ? (yes/no) " -r
echo

if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    log_warn "Suppression du namespace et des PVCs..."
    kubectl delete namespace booking-tourism-app
    log_info "Namespace supprimé"
else
    log_info "Namespace conservé (les PVCs restent)"
fi

echo ""
echo "=========================================="
log_info "Nettoyage terminé !"
echo "=========================================="
