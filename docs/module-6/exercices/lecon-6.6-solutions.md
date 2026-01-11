# Solutions – Leçon 6.6 : Scaling horizontal et vertical des microservices

---

## Exercice 1 : Analyse de scénario de scaling

**Contexte : Recommendation Engine**

1. **Stratégie de scaling pour les instances applicatives :**

   - **Recommandation : Scaling horizontal**
   - **Justification :**
     - Service intensif en CPU, pics d’usage, besoin de haute disponibilité
     - Le scaling horizontal permet d’ajouter dynamiquement des instances selon la charge (ex : Kubernetes, Docker Swarm)
     - Permet d’absorber les pics sans interruption, et de répartir la charge
     - Si le service est stateless (préférable), chaque instance peut traiter n’importe quelle requête

2. **Stratégie pour la base de données dédiée :**

   - **Recommandation : Scaling vertical au départ, puis hybride**
   - **Explication :**
     - Les bases relationnelles classiques scalent d’abord verticalement (plus de CPU/RAM)
     - Pour aller plus loin : read replicas (scaling horizontal en lecture), sharding (partitionnement horizontal)
     - Compromis : complexité accrue pour le sharding, mais nécessaire à grande échelle

3. **Auto-scaling applicatif avec Kubernetes HPA :**
   - **Implémentation :**
     - Déployer le service dans un Deployment Kubernetes
     - Définir un HPA basé sur l’utilisation CPU et/ou mémoire
     - Exemple :

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: recommendation-engine-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: recommendation-engine-deployment
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

- **Métriques à cibler :** CPU, mémoire, éventuellement nombre de requêtes/s
- **Min/max :** min 2 (haute dispo), max selon budget et charge attendue (ex : 10)

---

## Exercice 2 : Identifier les goulots d’étranglement

**Contexte : Payment Processing Integration (Stripe)**

1. **Goulots d’étranglement internes adressables par le scaling :**

   - Saturation CPU/RAM de l’application
   - File d’attente interne (ex : jobs de paiement en attente)
   - Connexions DB locales (si le service stocke des logs ou des statuts)
   - Limite de threads/processus
   - Scaling horizontal permet d’absorber plus de requêtes simultanées

2. **Goulots d’étranglement externes non résolus par le scaling :**
   - Limites de l’API Stripe (rate limiting, quotas)
   - Latence réseau externe
   - Dépendance à la disponibilité de Stripe
   - **Atténuation :**
     - Implémenter du retry/backoff
     - Circuit breaker pour éviter de surcharger Stripe
     - Mise en cache des réponses non critiques
     - Monitoring des erreurs externes

---

## Exercice 3 : Stateless vs Stateful pour le scaling

**Contexte : User Authentication microservice**

1. **Pourquoi un design stateless (JWT) simplifie le scaling horizontal ?**

   - Aucune session stockée côté serveur : chaque instance peut traiter n’importe quelle requête
   - Pas besoin d’affinité de session (sticky sessions)
   - Permet d’ajouter/retirer des instances à la volée
   - Haute disponibilité et tolérance aux pannes

2. **Composants restant stateful et leur scaling :**
   - **Base de données utilisateurs** : scaling vertical (plus de ressources), puis read replicas/sharding pour le scaling horizontal
   - **Blacklist de tokens (si utilisée)** : stockée dans un cache distribué (Redis, etc.) pour permettre le partage entre instances
   - **Logs/audit** : centralisation (ELK, cloud logging)
