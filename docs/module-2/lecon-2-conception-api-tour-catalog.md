# Leçon 2.2 - Conception de l'API du Microservice Tour Catalog

**Module 2** : Conception et Implémentation des Microservices Principaux

---

## Vue d'ensemble

La conception de l'API pour le microservice Tour Catalog nécessite une compréhension claire de son Bounded Context et des ressources spécifiques qu'il gère. Ce microservice est responsable de maintenir toutes les informations relatives aux visites disponibles, y compris leurs descriptions, itinéraires, prix, disponibilités et médias associés. L'API sert d'interface principale pour que d'autres microservices et clients externes interagissent avec ces données.

---

## Comprendre le Bounded Context et la Portée de l'API

Dans le Domain-Driven Design (DDD), un Bounded Context définit les limites à l'intérieur desquelles un modèle particulier est applicable. Pour le microservice Tour Catalog, son Bounded Context englobe tout ce qui concerne la définition et la présentation des visites.

