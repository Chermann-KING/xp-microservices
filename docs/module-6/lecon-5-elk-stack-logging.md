# Leçon 6.5 – Logging et Monitoring Centralisés avec la Stack ELK (Elasticsearch, Logstash, Kibana)

---

## Objectifs pédagogiques

- Comprendre le rôle de la Stack ELK pour la supervision des microservices
- Savoir configurer la collecte, le traitement et la visualisation des logs
- Mettre en place un pipeline de logs structuré pour l’application de tourisme
- Créer des dashboards de monitoring dans Kibana

---

## Introduction

Les architectures microservices, comme notre application de réservation touristique, génèrent de grandes quantités de logs et de métriques répartis sur de nombreux services. Le logging et le monitoring centralisés deviennent essentiels pour comprendre le comportement du système, diagnostiquer les problèmes et garantir la santé opérationnelle. La Stack **ELK** (Elasticsearch, Logstash, Kibana) offre une solution open source puissante pour agréger, traiter, stocker et visualiser ces données distribuées.

---

## 1. Présentation de la Stack ELK

La Stack ELK regroupe trois produits open source d’Elastic, conçus pour fonctionner ensemble et fournir une solution robuste de gestion et d’analyse des logs :

- **Elasticsearch** : moteur de recherche et d’analytique distribué, stockage centralisé des logs
- **Logstash** : pipeline de collecte, transformation et enrichissement des logs
- **Kibana** : interface web de visualisation, d’exploration et de dashboarding

### 1.1 Elasticsearch : Moteur de Recherche et d’Analytique

- Stocke les logs sous forme de documents JSON, sans schéma strict
- Permet la recherche temps réel, l’agrégation et l’analyse rapide de gros volumes de données
- Distribué et scalable : les données sont réparties sur plusieurs nœuds (sharding/réplication)
- API RESTful pour l’indexation, la recherche et la récupération des données
- Les logs de chaque microservice (ex : Tour Catalog, Booking Management) sont indexés dans des indices dédiés ou par date (ex : `booking-tourism-app-logs-2026.01.11`)

### 1.2 Logstash : Pipeline de Collecte et de Traitement

- Ingestion de données depuis de multiples sources (fichiers, Filebeat, TCP, Kafka, RabbitMQ…)
- Filtres puissants pour parser, transformer et enrichir les logs (grok, mutate, date, json, geoip…)
- Envoie les données traitées vers Elasticsearch (ou d’autres destinations)
- Architecture à plugins (inputs, filters, outputs)

**Exemple de configuration Logstash pour logs d’un microservice :**

```conf
input {
  file {
    path => "/var/log/tour-catalog/app.log"
    start_position => "beginning"
    sincedb_path => "/dev/null"
  }
}
filter {
  grok {
    match => { "message" => "\[%{TIMESTAMP_ISO8601:timestamp}\] %{LOGLEVEL:log_level} %{WORD:service_name} - Request %{WORD:http_method} %{URIPATH:request_path} from user: %{WORD:user_id} completed with status %{NUMBER:http_status}" }
  }
  date {
    match => [ "timestamp", "ISO8601" ]
    target => "@timestamp"
  }
  mutate {
    add_field => { "application" => "TourismApp" }
    add_field => { "service" => "TourCatalog" }
    convert => { "http_status" => "integer" }
  }
}
output {
  elasticsearch {
    hosts => ["http://elasticsearch:9200"]
    index => "booking-tourism-app-logs-%{+YYYY.MM.dd}"
  }
  stdout { codec => rubydebug }
}
```

### 1.3 Kibana : Visualisation et Dashboarding

- Interface web pour explorer, filtrer et visualiser les logs
- Création de dashboards personnalisés (graphiques, tableaux, cartes…)
- Outils de recherche avancée (KQL, Lucene)
- Monitoring de la santé des services, analyse des erreurs, suivi des performances

---

## 2. Mettre en place le Logging Centralisé pour l’App de Tourisme

### 2.1 Stratégie de collecte des logs

- Utiliser **Filebeat** (ou un équivalent) sur chaque hôte ou conteneur microservice pour expédier les logs vers Logstash
- Les microservices doivent produire des logs structurés (JSON recommandé) pour faciliter le parsing

**Exemple avec Winston (Node.js) :**

```js
// tour-catalog-service/src/logger.js
const winston = require("winston");
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
  defaultMeta: { service: "tour-catalog-service" },
});
module.exports = logger;
```

### 2.2 Déploiement de la Stack ELK avec Docker Compose

**Exemple de fichier docker-compose.elk.yml :**

```yaml
version: "3.8"
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.9.0
    environment:
      - xpack.security.enabled=false
      - discovery.type=single-node
      - ES_JAVA_OPTS=-Xms512m -Xmx512m
    ulimits:
      memlock:
        soft: -1
        hard: -1
    volumes:
      - esdata:/usr/share/elasticsearch/data
    ports:
      - 9200:9200
      - 9300:9300
    networks:
      - elk-network
  logstash:
    image: docker.elastic.co/logstash/logstash:8.9.0
    build:
      context: ./logstash
      dockerfile: Dockerfile
    volumes:
      - ./logstash/config/logstash.yml:/usr/share/logstash/config/logstash.yml:ro
      - ./logstash/pipeline:/usr/share/logstash/pipeline:ro
      - ./tour-catalog-service/logs:/var/log/tour-catalog:ro
    ports:
      - 5044:5044
    environment:
      - LS_JAVA_OPTS=-Xms256m -Xmx256m
    depends_on:
      - elasticsearch
    networks:
      - elk-network
  kibana:
    image: docker.elastic.co/kibana/kibana:8.9.0
    ports:
      - 5601:5601
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    depends_on:
      - elasticsearch
    networks:
      - elk-network
  filebeat:
    image: docker.elastic.co/beats/filebeat:8.9.0
    user: root
    volumes:
      - ./filebeat/filebeat.yml:/usr/share/filebeat/filebeat.yml:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
    environment:
      - LOGSTASH_HOST=logstash
      - LOGSTASH_PORT=5044
    depends_on:
      - logstash
    networks:
      - elk-network
volumes:
  esdata:
networks:
  elk-network:
    driver: bridge
```

---

## 3. Monitoring et Visualisation dans Kibana

### 3.1 Découverte et recherche de logs

- Créer un index pattern (ex : `booking-tourism-app-logs-*`)
- Utiliser l’onglet "Discover" pour explorer les logs bruts, filtrer par service, niveau, utilisateur, etc.
- Exemple : `service_name: "BookingManagement" AND log_level: "ERROR"`

### 3.2 Création de dashboards

- Histogramme de la distribution des temps de réponse
- Métrique du nombre d’erreurs sur 15 minutes
- Tableau des messages d’erreur les plus fréquents
- Bar chart du volume de logs par service et par niveau
- Dashboard "Tourism App Health Monitor" combinant plusieurs visualisations

---

## 4. Exercices pratiques

### Exercice 1 : Configurer le logging structuré

- Modifiez le fichier `logger.js` d’un microservice Node.js pour produire des logs JSON avec Winston ou Pino.
- Assurez-vous d’inclure : timestamp, level, service_name, message, et des champs contextuels (ex : tourId, userId).

### Exercice 2 : Créer un pipeline Logstash personnalisé

- Ajoutez un microservice (ex : notification-service) à votre `docker-compose.elk.yml`.
- Créez une configuration Filebeat pour ce service.
- Écrivez une configuration Logstash dédiée (ex : `notification-service.conf`) pour parser ses logs et extraire le champ user_id.
- Vérifiez dans Kibana que les logs apparaissent correctement.

### Exercice 3 : Construire un dashboard Kibana

- Créez un dashboard "Tourism App Health Monitor" dans Kibana.
- Ajoutez :
  - Une métrique du nombre total d’erreurs
  - Un bar chart du breakdown log_level/service_name
  - Un tableau des messages d’erreur les plus fréquents
  - Un graphe du volume de logs par service dans le temps
- Exportez ou partagez la configuration du dashboard.

---

## 5. Prochaines étapes

Le logging centralisé avec la Stack ELK offre une visibilité essentielle sur vos microservices. Les prochaines leçons aborderont les techniques avancées de scaling, la montée en charge de la stack ELK elle-même, et l’utilisation des logs pour le debugging et la validation du comportement système.

---

## Navigation

- **⬅️ Précédent** : [Leçon 6.4 – Implémentation d’un API Gateway](lecon-4-api-gateway-implementation.md)
- **➡️ Suivant** : [Leçon 6.6 – Scaling avancé des microservices](lecon-6-scaling-advanced.md)
- **🏠 Sommaire** : [Retour au README](README.md)

---
