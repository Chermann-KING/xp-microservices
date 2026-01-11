# Solutions – Leçon 6.5 : Logging et Monitoring Centralisés avec la Stack ELK

---

## Exercice 1 : Configurer le logging structuré

**Exemple de logger structuré avec Winston (Node.js) :**

```js
// tour-catalog-service/src/logger.js
import winston from "winston";

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
  defaultMeta: { service: "tour-catalog-service" },
});

export default logger;
```

**Utilisation dans un contrôleur :**

```js
import logger from "./logger.js";

app.get("/api/v1/tours/:id", (req, res) => {
  const tourId = req.params.id;
  logger.info("Received request for tour details", {
    tourId,
    userId: req.user?.id,
  });
  try {
    // ...
    res.json({ tourId, name: "Adventure Tour" });
    logger.info("Successfully fetched tour details", { tourId, status: 200 });
  } catch (error) {
    logger.error("Failed to fetch tour details", {
      tourId,
      error: error.message,
    });
    res.status(500).send("Internal Server Error");
  }
});
```

**À vérifier :**

- Les logs sont bien au format JSON
- Les champs `timestamp`, `level`, `service`, `message`, et les contextes (ex : `tourId`, `userId`) sont présents

---

## Exercice 2 : Créer un pipeline Logstash personnalisé

**Étapes :**

1. **Ajouter le microservice** (ex : notification-service) dans `docker-compose.elk.yml` :

```yaml
notification-service:
  build: ./notification-service
  volumes:
    - ./notification-service/logs:/app/logs
  depends_on:
    - logstash
  networks:
    - elk-network
```

2. **Configurer Filebeat** pour ce service :

```yaml
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /app/logs/*.log
    fields:
      service: "notification-service"
output.logstash:
  hosts: ["logstash:5044"]
```

3. **Créer la pipeline Logstash dédiée** (`logstash/pipeline/notification-service.conf`) :

```conf
input {
  beats {
    port => 5044
  }
}
filter {
  if [fields][service] == "notification-service" {
    json {
      source => "message"
      target => "json_parsed"
    }
    mutate {
      rename => { "[json_parsed][user_id]" => "user_id" }
      add_field => { "service_name" => "notification-service" }
    }
  }
}
output {
  elasticsearch {
    hosts => ["http://elasticsearch:9200"]
    index => "booking-tourism-app-logs-%{+YYYY.MM.dd}"
  }
}
```

4. **Vérifier dans Kibana** :

- Les logs du notification-service apparaissent dans l’index
- Le champ `user_id` est bien extrait et visible

---

## Exercice 3 : Construire un dashboard Kibana

**Étapes :**

1. Créez un index pattern : `booking-tourism-app-logs-*`
2. Dans Kibana, créez un nouveau dashboard "Tourism App Health Monitor"
3. Ajoutez :
   - **Métrique** : Total des logs `log_level: ERROR` (visualization type: Metric)
   - **Bar chart** : Breakdown de `log_level` par `service_name` (visualization type: Vertical Bar)
   - **Tableau** : Top 5 des messages d’erreur (`message` ou `error.message`) (visualization type: Data Table, filter: `log_level: ERROR`)
   - **Line graph** : Volume de logs par service dans le temps (visualization type: Line, X: @timestamp, Split series: service_name)
4. Exportez ou partagez la configuration du dashboard (JSON ou capture d’écran)

**Exemple de requête KQL pour filtrer les erreurs :**

```
log_level: "ERROR" AND service_name: "payment-service"
```

---

## Conseils supplémentaires

- Utilisez des champs personnalisés pour enrichir vos logs (ex : `env`, `request_id`, `correlation_id`)
- Pensez à la rotation et la rétention des indices Elasticsearch
- Sécurisez l’accès à Kibana en production
