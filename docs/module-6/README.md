# Module 6 – Déploiement, Monitoring et Scalabilité des Microservices

## 🎯 Objectifs du Module

Ce module vous permettra de maîtriser le **déploiement**, le **monitoring** et la **scalabilité** des architectures microservices modernes. Vous apprendrez à automatiser le déploiement, centraliser la supervision, et adapter dynamiquement la capacité de vos services.

---

## 📚 Ce que vous allez apprendre

### Containerisation & Orchestration

- Concevoir des **Dockerfiles** efficaces pour chaque microservice
- Orchestrer des déploiements multi-conteneurs avec **Docker Compose** et **Kubernetes**
- Comprendre les différences entre **IaaS, PaaS, CaaS**

### API Gateway & Préoccupations Transversales

- Mettre en place un **API Gateway** (Express.js, Nginx, Kong)
- Gérer le **routage**, l’**authentification** et le **rate limiting**
- Sécuriser et centraliser l’accès aux microservices

### Logging & Monitoring Centralisés

- Déployer la **stack ELK** (Elasticsearch, Logstash, Kibana)
- Structurer et collecter les logs applicatifs
- Créer des **dashboards** de supervision

### Scalabilité & Auto-scaling

- Différencier **scaling horizontal** et **vertical**
- Mettre en œuvre l’**auto-scaling** (Kubernetes HPA)
- Identifier et traiter les **goulots d’étranglement**

---

## 📖 Leçons du Module

| #   | Leçon                                                                                  | Description                                      | Durée estimée |
| --- | -------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------- |
| 6.1 | [Containerisation avec Docker](lecon-1-docker-containerization.md)                     | Dockerfiles, isolation, bonnes pratiques         | ~2h           |
| 6.2 | [Orchestration avec Compose & Kubernetes](lecon-2-orchestration-compose-kubernetes.md) | Déploiement multi-conteneurs, K8s, cloud         | ~2h30         |
| 6.3 | [Déploiement sur plateformes cloud](lecon-3-deployment-cloud.md)                       | IaaS, PaaS, CaaS, sécurité, réseaux              | ~2h           |
| 6.4 | [Implémentation d’un API Gateway](lecon-4-api-gateway-implementation.md)               | Routage, auth, rate limiting, Express/Nginx/Kong | ~2h           |
| 6.5 | [Logging & Monitoring avec ELK](lecon-5-elk-stack-logging.md)                          | Stack ELK, pipeline de logs, dashboards          | ~2h           |
| 6.6 | [Scaling horizontal & vertical](lecon-6-scaling-advanced.md)                           | Scaling, auto-scaling, goulots d’étranglement    | ~2h           |

**Temps total estimé : ~12 heures**

---

## 🏆 Acquis à la fin du Module

À l’issue de ce module, vous serez capable de :

### Déploiement & Orchestration

- ✅ Automatiser le déploiement de microservices avec Docker & Kubernetes
- ✅ Orchestrer des architectures multi-conteneurs

### API Gateway & Sécurité

- ✅ Mettre en place un point d’entrée unique sécurisé
- ✅ Gérer l’authentification et le contrôle d’accès

### Supervision & Observabilité

- ✅ Centraliser les logs et visualiser l’état du système
- ✅ Créer des dashboards de monitoring

### Scalabilité & Performance

- ✅ Adapter dynamiquement la capacité des services (auto-scaling)

---

## 📝 Exercices et solutions

Pour chaque leçon, des exercices pratiques et leurs solutions détaillées sont disponibles :

- [Exercices du module 6](exercices/)
- [Solutions leçon 6.1](exercices/lecon-6.1-solutions.md)
- [Solutions leçon 6.2](exercices/lecon-6.2-solutions.md)
- [Solutions leçon 6.3](exercices/lecon-6.3-solutions.md)
- [Solutions leçon 6.4](exercices/lecon-6.4-solutions.md)
- [Solutions leçon 6.5](exercices/lecon-6.5-solutions.md)
- [Solutions leçon 6.6](exercices/lecon-6.6-solutions.md)

---

## 🧰 Prérequis

- Modules 1 à 5 (architecture, DDD, event-driven, sécurité)
- Node.js, Docker Desktop, accès à un cloud (AWS/Azure/GCP)
- Notions de base sur les réseaux et la sécurité

---

## 🔗 Ressources complémentaires

- [Documentation Docker](https://docs.docker.com/)
- [Kubernetes Docs](https://kubernetes.io/docs/)
- [Elastic Stack (ELK)](https://www.elastic.co/what-is/elk-stack)
- [Kong Gateway](https://docs.konghq.com/)
- [AWS ECS](https://aws.amazon.com/ecs/), [Azure AKS](https://azure.microsoft.com/fr-fr/services/kubernetes-service/), [GCP GKE](https://cloud.google.com/kubernetes-engine)
- [Microservices Patterns – Chris Richardson](https://microservices.io/)
