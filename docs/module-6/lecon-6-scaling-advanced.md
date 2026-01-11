# Leçon 6.6 – Scaling horizontal et vertical des microservices

---

## Objectifs pédagogiques

- Comprendre les stratégies de scaling horizontal et vertical
- Savoir choisir la bonne approche selon le contexte (stateless/stateful)
- Mettre en œuvre l’auto-scaling avec Kubernetes HPA
- Identifier les goulots d’étranglement et les limites du scaling

---

## Introduction

La scalabilité est un enjeu majeur pour tout système en production, en particulier dans les architectures microservices où chaque service doit pouvoir gérer des charges variables de façon indépendante. Bien dimensionner et scaler ses microservices garantit la réactivité et la disponibilité de l’application, même lors de pics de trafic ou de traitements intensifs.

---

## 1. Les deux stratégies de scaling

### 1.1 Scaling horizontal (scale out)

- Ajouter des instances identiques d’un service pour répartir la charge
- Aligné avec la philosophie microservices (stateless)
- Haute disponibilité et tolérance aux pannes
- Élasticité : adaptation dynamique à la demande
- Exemples : Load balancer + plusieurs containers/pods (Kubernetes, Docker Swarm)

**Exemple : Tour Catalog Service**

- 1 instance → 100 req/s
- 5 instances + load balancer → 500 req/s, meilleure tolérance aux pannes
- Si une instance tombe, les autres continuent de servir

### 1.2 Scaling vertical (scale up)

- Augmenter les ressources (CPU, RAM) d’une seule instance
- Limité par le matériel, point de défaillance unique
- Souvent utilisé pour les bases de données ou composants stateful
- Peut nécessiter un redémarrage/downtime

**Exemple : Base PostgreSQL Booking Management**

- 8 vCPU, 32Go RAM → 32 vCPU, 128Go RAM pour absorber plus de requêtes
- Gain immédiat, mais plafond matériel atteint rapidement

---

## 2. Quand utiliser chaque stratégie ?

### 2.1 Horizontal

- Services stateless (API, frontend, workers)
- Besoin d’élasticité, haute disponibilité
- Workloads fluctuants (pics saisonniers, campagnes)
- Optimisation coût/cloud

### 2.2 Vertical

- Composants stateful (DB, cache, file storage)
- Tâches critiques non parallélisables
- Systèmes legacy
- Démarrage rapide/prototypage

### 2.3 Approche hybride

- Application : horizontal (Kubernetes, Docker)
- DB : vertical (RDS, VM puissante), puis read replicas/sharding si besoin

---

## 3. Auto-scaling avec Kubernetes HPA

**Horizontal Pod Autoscaler (HPA)**

- Ajuste automatiquement le nombre de pods selon la charge (CPU, RAM, custom metrics)
- Configuration typique :

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: tour-catalog-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: tour-catalog-deployment
  minReplicas: 2
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

- Permet d’absorber les pics de charge et d’optimiser les coûts

---

## 4. Exercices pratiques

### Exercice 1 : Analyse de scénario de scaling

**Contexte : Recommendation Engine**

- Service intensif en CPU, accès DB fréquent, haute disponibilité, pics d’usage

1. Quelle stratégie de scaling recommander pour les instances applicatives ? Justifiez.
2. Quelle stratégie pour la base de données dédiée ? Expliquez les compromis.
3. Comment implémenter l’auto-scaling applicatif avec Kubernetes HPA ? Quelles métriques et min/max ?

### Exercice 2 : Identifier les goulots d’étranglement

**Contexte : Payment Processing Integration (Stripe)**

1. Quels sont les goulots d’étranglement internes adressables par le scaling ?
2. Quels sont les goulots d’étranglement externes non résolus par le scaling ? Comment les atténuer ?

### Exercice 3 : Stateless vs Stateful pour le scaling

**Contexte : User Authentication microservice**

1. Pourquoi un design stateless (JWT) simplifie-t-il le scaling horizontal ?
2. Quels composants restent stateful ? Comment scaler ces composants ?

---

## 5. Cas réels

- Netflix : scaling horizontal massif (microservices stateless, NoSQL sharding)
- Spotify : scaling automatique Kubernetes lors de pics (nouvel album, campagne)
- Hybridation : application horizontale, DB verticale puis sharding/replicas

---

## 6. Conclusion

- Le scaling horizontal est privilégié pour les microservices stateless (API, frontend)
- Le scaling vertical reste utile pour les composants stateful ou legacy
- L’auto-scaling (Kubernetes HPA) permet une adaptation dynamique à la charge
- Combiner les deux stratégies pour une architecture robuste et scalable

---

## Navigation

- **⬅️ Précédent** : [Leçon 6.5 – Logging et Monitoring Centralisés avec la Stack ELK](lecon-5-elk-stack-logging.md)
- **🏠 Sommaire** : [Retour au README](README.md)

---
