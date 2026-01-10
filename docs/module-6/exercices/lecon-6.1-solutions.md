# Exercices - Leçon 6.1 Containerisation avec Docker pour les Microservices

## Exercice 1 : Containeriser le Microservice Payment Gateway

### Énoncé

**Contexte** : Le microservice Payment Gateway du Module 4 gère les transactions de paiement avec Stripe. Ce service est critique pour notre application de tourisme car il traite les paiements des réservations.

**Spécifications du service** :

- Fichier principal : `server.js`
- Port d'écoute : `3004`
- Dépendances : Express, Stripe SDK, dotenv, etc.
- Structure standard Node.js avec dossier `src/`

**Tâches** :

1. Créez un **Dockerfile** optimisé pour le microservice Payment Gateway
2. Créez un fichier **`.dockerignore`** approprié
3. Construisez l'image Docker avec le tag `payment-gateway-service:1.0`
4. Exécutez un conteneur en mappant le port 3004
5. Vérifiez que les trois microservices tournent simultanément

---

### Solution

#### 1. Dockerfile pour Payment Gateway Service

**Fichier : `app/payment-service/Dockerfile`**

```dockerfile
# ============================================
# Dockerfile - Payment Gateway Microservice
# ============================================
# Ce Dockerfile utilise un build multi-stage pour optimiser
# la taille de l'image finale et améliorer la sécurité

# ============================================
# STAGE 1: Builder - Installation des dépendances
# ============================================
FROM node:18-alpine AS builder

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances en premier
# Cela optimise le cache Docker : si package.json ne change pas,
# cette couche sera réutilisée et npm install ne sera pas ré-exécuté
COPY package.json ./
COPY package-lock.json ./

# Installer uniquement les dépendances de production
# --production exclut les devDependencies pour réduire la taille
RUN npm ci --production --quiet

# Copier le code source de l'application
COPY . .

# ============================================
# STAGE 2: Production - Image finale optimisée
# ============================================
FROM node:18-alpine

# Ajouter des métadonnées à l'image
LABEL maintainer="tourism-app-team"
LABEL service="payment-gateway"
LABEL version="1.0"

# Installer dumb-init pour une gestion propre des signaux
# dumb-init est un init system minimal pour les conteneurs Docker
RUN apk add --no-cache dumb-init

# Créer un utilisateur non-root pour la sécurité
# Les processus ne doivent pas s'exécuter en tant que root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copier les fichiers depuis le stage builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nodejs:nodejs /app/package-lock.json ./package-lock.json
COPY --from=builder --chown=nodejs:nodejs /app/src ./src
COPY --from=builder --chown=nodejs:nodejs /app/server.js ./server.js
COPY --from=builder --chown=nodejs:nodejs /app/.env.example ./.env.example

# Passer à l'utilisateur non-root
USER nodejs

# Exposer le port sur lequel le service écoute
# Ceci est purement documentaire
EXPOSE 3004

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV PORT=3004

# Point de santé pour les health checks
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3004/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Utiliser dumb-init comme PID 1 pour gérer proprement les signaux
ENTRYPOINT ["dumb-init", "--"]

# Commande pour démarrer l'application
CMD ["node", "server.js"]
```

**Explications des optimisations** :

🔸 **Multi-stage build** : Sépare la construction et l'exécution pour une image finale plus légère  
🔸 **npm ci** : Plus rapide et déterministe que `npm install`  
🔸 **--production** : Exclut les devDependencies  
🔸 **Utilisateur non-root** : Améliore la sécurité  
🔸 **dumb-init** : Gère correctement les signaux SIGTERM pour un arrêt gracieux  
🔸 **HEALTHCHECK** : Permet à Docker/Kubernetes de vérifier la santé du service  
🔸 **--chown** : Définit les bonnes permissions dès la copie

#### 2. Fichier .dockerignore

**Fichier : `app/payment-service/.dockerignore`**

```
# Dépendances
node_modules/
npm-debug.log
yarn-error.log

# Fichiers de développement
.env
.env.local
.env.*.local

# Contrôle de version
.git/
.gitignore
.gitattributes

# IDE et éditeurs
.vscode/
.idea/
*.swp
*.swo
*~
.DS_Store

# Tests et coverage
coverage/
.nyc_output/
*.test.js
*.spec.js
__tests__/
test/
tests/

# Build et dist
dist/
build/
out/

# Documentation
README.md
CHANGELOG.md
docs/
*.md

# CI/CD
.github/
.gitlab-ci.yml
.travis.yml
Jenkinsfile

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Fichiers temporaires
tmp/
temp/
*.tmp

# Autres
.dockerignore
Dockerfile
docker-compose.yml
```

**Pourquoi ces exclusions ?**

- **node_modules** : Sera installé dans le conteneur, pas besoin de copier celui de l'hôte
- **Fichiers .env** : Les secrets ne doivent jamais être dans l'image
- **Tests et docs** : Inutiles en production
- **Logs** : Ne doivent pas être inclus dans l'image

#### 3. Construction de l'image

```bash
# Se positionner dans le répertoire du service
cd app/payment-service

# Construire l'image avec le tag spécifié
docker build -t payment-gateway-service:1.0 .

# Afficher les détails de l'image construite
docker images payment-gateway-service:1.0
```

**Sortie attendue** :

```
[+] Building 45.2s (18/18) FINISHED
 => [internal] load build definition from Dockerfile
 => => transferring dockerfile: 1.23kB
 => [internal] load .dockerignore
 => => transferring context: 234B
 => [internal] load metadata for docker.io/library/node:18-alpine
 => [builder 1/6] FROM node:18-alpine
 => [internal] load build context
 => => transferring context: 45.67kB
 => [builder 2/6] WORKDIR /app
 => [builder 3/6] COPY package.json ./
 => [builder 4/6] COPY package-lock.json ./
 => [builder 5/6] RUN npm ci --production --quiet
 => [builder 6/6] COPY . .
 => [stage-1 2/8] RUN apk add --no-cache dumb-init
 => [stage-1 3/8] RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
 => [stage-1 4/8] WORKDIR /app
 => [stage-1 5/8] COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
 => [stage-1 6/8] COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json
 => [stage-1 7/8] COPY --from=builder --chown=nodejs:nodejs /app/src ./src
 => [stage-1 8/8] COPY --from=builder --chown=nodejs:nodejs /app/server.js ./server.js
 => exporting to image
 => => exporting layers
 => => writing image sha256:abc123...
 => => naming to docker.io/library/payment-gateway-service:1.0
```

**Vérification de l'image** :

```bash
docker images payment-gateway-service:1.0
```

**Résultat** :

```
REPOSITORY                  TAG    IMAGE ID       CREATED          SIZE
payment-gateway-service     1.0    abc123def456   30 seconds ago   145MB
```

#### 4. Exécution du conteneur

**Option A : Avec variables d'environnement en ligne de commande**

```bash
docker run -d \
  -p 3004:3004 \
  --name payment-gateway \
  --env PORT=3004 \
  --env NODE_ENV=production \
  --env STRIPE_SECRET_KEY=sk_test_your_key \
  --env STRIPE_WEBHOOK_SECRET=whsec_your_secret \
  --env DATABASE_URL=postgresql://user:pass@db:5432/payment \
  --restart unless-stopped \
  payment-gateway-service:1.0
```

**Option B : Avec fichier .env (recommandé pour le développement)**

```bash
# Créer un fichier .env.docker avec les variables nécessaires
cat > .env.docker << EOF
PORT=3004
NODE_ENV=production
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret
DATABASE_URL=postgresql://user:pass@db:5432/payment
EOF

# Exécuter avec le fichier d'environnement
docker run -d \
  -p 3004:3004 \
  --name payment-gateway \
  --env-file .env.docker \
  --restart unless-stopped \
  payment-gateway-service:1.0
```

**Explications des options** :

- **`-d`** : Mode détaché (arrière-plan)
- **`-p 3004:3004`** : Mapping de port HOST:CONTAINER
- **`--name payment-gateway`** : Nom lisible pour le conteneur
- **`--env`** : Définir une variable d'environnement
- **`--env-file`** : Charger les variables depuis un fichier
- **`--restart unless-stopped`** : Redémarrage automatique sauf si arrêté manuellement

#### 5. Vérification des trois microservices

**Commande pour lister tous les conteneurs** :

```bash
docker ps
```

**Sortie attendue** :

```
CONTAINER ID   IMAGE                          COMMAND                  CREATED          STATUS                    PORTS                    NAMES
9f8a7b6c5d4e   payment-gateway-service:1.0    "dumb-init -- node s…"   10 seconds ago   Up 8 seconds (healthy)    0.0.0.0:3004->3004/tcp   payment-gateway
8e7a6b5c4d3f   booking-service:1.0            "dumb-init -- node s…"   2 minutes ago    Up 2 minutes (healthy)    0.0.0.0:3002->3002/tcp   booking-service
7d6a5b4c3e2f   tour-catalog-service:1.0       "dumb-init -- node s…"   5 minutes ago    Up 5 minutes (healthy)    0.0.0.0:3001->3001/tcp   tour-catalog
```

**Vérification détaillée de chaque service** :

```bash
# Vérifier les logs du Payment Gateway
docker logs payment-gateway

# Tester l'endpoint de santé
curl http://localhost:3004/health

# Vérifier l'utilisation des ressources
docker stats --no-stream payment-gateway booking-service tour-catalog
```

**Sortie de docker stats** :

```
CONTAINER ID   NAME              CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O   PIDS
9f8a7b6c5d4e   payment-gateway   0.15%     45.23MiB / 1.952GiB   2.26%     1.2kB / 850B      0B / 0B     11
8e7a6b5c4d3f   booking-service   0.12%     42.18MiB / 1.952GiB   2.11%     950B / 720B       0B / 0B     11
7d6a5b4c3e2f   tour-catalog      0.10%     38.45MiB / 1.952GiB   1.92%     820B / 650B       0B / 0B     11
```

**Tests d'intégration entre services** :

```bash
# Test complet : Créer une réservation et traiter le paiement
# 1. Créer une réservation via Booking Service
curl -X POST http://localhost:3002/api/v1/booking-management/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "tourId": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "startDate": "2026-03-15",
    "numberOfSeats": 2
  }'

# 2. Créer un paiement via Payment Gateway
curl -X POST http://localhost:3004/api/v1/payments/create-session \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": "booking-id-from-previous-response",
    "amount": 29900,
    "currency": "eur"
  }'
```

#### 6. Inspection approfondie du conteneur

```bash
# Voir les détails complets du conteneur
docker inspect payment-gateway

# Exécuter une commande dans le conteneur en cours d'exécution
docker exec -it payment-gateway sh

# Une fois dans le conteneur, vérifier :
$ whoami  # Devrait afficher "nodejs" (utilisateur non-root)
$ pwd     # Devrait afficher "/app"
$ ls -la  # Lister les fichiers
$ ps aux  # Voir les processus (dumb-init devrait être PID 1)
$ exit    # Sortir du conteneur
```

---

## Exercice 2 : Expérimenter avec le Cache du Dockerfile

### Énoncé

**Objectif** : Comprendre comment fonctionne le système de cache de Docker et comment l'ordre des instructions dans le Dockerfile affecte les performances de build.

**Tâches** :

1. Modifier uniquement un fichier dans `src/` du tour-catalog-service
2. Reconstruire l'image et observer le cache
3. Modifier `package.json` (ajouter puis supprimer une dépendance)
4. Reconstruire et observer la ré-exécution de `npm install`

---

### Solution

#### 1. Modification d'un fichier source

**Étape 1 : Modifier un fichier dans src/**

```bash
# Aller dans le répertoire du service
cd app/tour-catalog-service

# Modifier un contrôleur (ajout d'un log par exemple)
cat >> src/controllers/tourController.js << 'EOF'

// Ajout d'un simple log pour tester le cache
console.log('Controller loaded - version 2.0');
EOF
```

**Étape 2 : Reconstruire l'image avec un nouveau tag**

```bash
docker build -t tour-catalog-service:2.0 .
```

**Sortie observée** (notez les lignes "CACHED") :

```
[+] Building 3.2s (16/16) FINISHED
 => [internal] load build definition from Dockerfile                         0.0s
 => => transferring dockerfile: 1.08kB                                       0.0s
 => [internal] load .dockerignore                                            0.0s
 => => transferring context: 234B                                            0.0s
 => [internal] load metadata for docker.io/library/node:18-alpine            0.8s
 => [builder 1/6] FROM node:18-alpine                                        0.0s
 => [internal] load build context                                            0.1s
 => => transferring context: 2.45kB                                          0.1s
 => CACHED [builder 2/6] WORKDIR /app                                        0.0s
 => CACHED [builder 3/6] COPY package.json ./                                0.0s
 => CACHED [builder 4/6] COPY package-lock.json ./                           0.0s
 => CACHED [builder 5/6] RUN npm ci --production                             0.0s
 => [builder 6/6] COPY . .                                                   0.2s  ← SEULE ÉTAPE RE-EXÉCUTÉE
 => CACHED [stage-1 2/8] RUN apk add --no-cache dumb-init                   0.0s
 => CACHED [stage-1 3/8] RUN addgroup -g 1001 -S nodejs ...                 0.0s
 => CACHED [stage-1 4/8] WORKDIR /app                                        0.0s
 => [stage-1 5/8] COPY --from=builder /app/node_modules ./node_modules      0.8s
 => [stage-1 6/8] COPY --from=builder /app/package.json ./package.json      0.1s
 => [stage-1 7/8] COPY --from=builder /app/src ./src                        0.4s
 => [stage-1 8/8] COPY --from=builder /app/server.js ./server.js            0.1s
 => exporting to image                                                       0.6s
 => => exporting layers                                                      0.6s
 => => writing image sha256:def456...                                        0.0s
 => => naming to docker.io/library/tour-catalog-service:2.0                 0.0s
```

**🔍 Analyse** :

- ✅ Les étapes `COPY package.json`, `COPY package-lock.json` et `RUN npm ci` sont **CACHED**
- ✅ Seule l'étape `COPY . .` est ré-exécutée
- ✅ Le build est **beaucoup plus rapide** : 3.2s vs 45s lors du premier build
- ✅ Les 500+ MB de `node_modules` n'ont pas été réinstallés

**Comparaison des temps** :

```bash
# Premier build (sans cache)
docker build -t tour-catalog-service:1.0 .
# Time: ~45 secondes

# Second build (avec modification de src/)
docker build -t tour-catalog-service:2.0 .
# Time: ~3 secondes

# Gain de temps : 93% !
```

#### 2. Modification de package.json

**Étape 1 : Ajouter une dépendance dans package.json**

```bash
# Ouvrir package.json et ajouter une dépendance factice
cat > temp_package.json << 'EOF'
{
  "name": "tour-catalog-service",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.18.2",
    "sequelize": "^6.32.1",
    "pg": "^8.11.0",
    "dotenv": "^16.3.1",
    "lodash": "^4.17.21"
  }
}
EOF

# Remplacer temporairement package.json
cp package.json package.json.backup
cp temp_package.json package.json
```

**Étape 2 : Reconstruire l'image**

```bash
docker build -t tour-catalog-service:2.1 .
```

**Sortie observée** :

```
[+] Building 38.5s (16/16) FINISHED
 => [internal] load build definition from Dockerfile                         0.0s
 => [internal] load .dockerignore                                            0.0s
 => [internal] load metadata for docker.io/library/node:18-alpine            0.8s
 => [builder 1/6] FROM node:18-alpine                                        0.0s
 => [internal] load build context                                            0.1s
 => CACHED [builder 2/6] WORKDIR /app                                        0.0s
 => [builder 3/6] COPY package.json ./                                       0.1s  ← FICHIER CHANGÉ
 => [builder 4/6] COPY package-lock.json ./                                  0.1s
 => [builder 5/6] RUN npm ci --production                                   32.4s  ← RÉ-EXÉCUTÉ !
 => [builder 6/6] COPY . .                                                   0.3s
 => [stage-1 2/8] RUN apk add --no-cache dumb-init                           2.1s
 => [stage-1 3/8] RUN addgroup -g 1001 -S nodejs ...                         0.4s
 => [stage-1 4/8] WORKDIR /app                                               0.0s
 => [stage-1 5/8] COPY --from=builder /app/node_modules ./node_modules      1.2s
 => [stage-1 6/8] COPY --from=builder /app/package.json ./package.json      0.1s
 => [stage-1 7/8] COPY --from=builder /app/src ./src                        0.5s
 => [stage-1 8/8] COPY --from=builder /app/server.js ./server.js            0.1s
 => exporting to image                                                       1.3s
```

**🔍 Analyse** :

- ❌ L'étape `RUN npm ci --production` est **ré-exécutée** (32.4s)
- ❌ Toutes les étapes suivantes sont aussi ré-exécutées (invalidation du cache)
- ❌ Le build redevient lent (~38s)

**Restaurer package.json** :

```bash
# Restaurer le fichier original
cp package.json.backup package.json
rm temp_package.json
```

#### 3. Démonstration de l'importance de l'ordre

**❌ Mauvais Dockerfile (ordre inefficace)** :

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app

# ❌ ERREUR : Copier tout le code en premier
COPY . .

# Cette étape sera ré-exécutée à CHAQUE modification de code
RUN npm ci --production
```

**✅ Bon Dockerfile (ordre optimisé)** :

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app

# ✅ CORRECT : Copier les fichiers de dépendances en premier
COPY package.json ./
COPY package-lock.json ./

# Cette étape sera en cache tant que package.json ne change pas
RUN npm ci --production

# Le code source est copié en dernier
COPY . .
```

**Tableau comparatif** :

| Scénario                       | Mauvais Ordre | Bon Ordre |
| ------------------------------ | ------------- | --------- |
| Premier build                  | 45s           | 45s       |
| Modification d'un fichier src/ | 45s           | 3s        |
| Ajout d'une dépendance         | 45s           | 38s       |
| **Gain moyen**                 | -             | **85%**   |

#### 4. Visualisation du cache avec --progress=plain

```bash
# Build avec sortie détaillée
docker build --progress=plain -t tour-catalog-service:2.2 . 2>&1 | grep -E "(CACHED|RUN)"
```

**Sortie** :

```
#5 [builder 2/6] WORKDIR /app
#5 CACHED
#6 [builder 3/6] COPY package.json ./
#6 CACHED
#7 [builder 4/6] COPY package-lock.json ./
#7 CACHED
#8 [builder 5/6] RUN npm ci --production
#8 CACHED
#9 [builder 6/6] COPY . .
#9 0.234s
```

---

## Exercice 3 : Nettoyer les Ressources Docker

### Énoncé

**Objectif** : Apprendre à gérer l'espace disque et nettoyer les ressources Docker inutilisées.

**Contexte** : Après avoir créé plusieurs images et conteneurs pour les exercices, il est important de savoir comment nettoyer proprement les ressources pour libérer de l'espace disque.

**Tâches** :

1. Arrêter tous les conteneurs de microservices
2. Supprimer tous les conteneurs
3. Supprimer toutes les images créées
4. Vérifier que tout est nettoyé

---

### Solution

#### 1. Inventaire des ressources avant nettoyage

**Lister tous les conteneurs (actifs et arrêtés)** :

```bash
docker ps -a
```

**Sortie exemple** :

```
CONTAINER ID   IMAGE                          STATUS                      NAMES
9f8a7b6c5d4e   payment-gateway-service:1.0    Up 30 minutes              payment-gateway
8e7a6b5c4d3f   booking-service:1.0            Up 32 minutes              booking-service
7d6a5b4c3e2f   tour-catalog-service:1.0       Up 35 minutes              tour-catalog
6c5b4a3d2e1f   tour-catalog-service:2.0       Exited (0) 10 minutes ago  tour-catalog-test
5b4a3c2d1e0f   tour-catalog-service:2.1       Exited (0) 5 minutes ago   tour-catalog-cache-test
```

**Lister toutes les images** :

```bash
docker images
```

**Sortie exemple** :

```
REPOSITORY                  TAG       IMAGE ID       CREATED          SIZE
payment-gateway-service     1.0       abc123def456   35 minutes ago   145MB
booking-service             1.0       bcd234efg567   40 minutes ago   142MB
tour-catalog-service        2.2       cde345fgh678   2 minutes ago    138MB
tour-catalog-service        2.1       def456ghi789   10 minutes ago   138MB
tour-catalog-service        2.0       efg567hij890   20 minutes ago   138MB
tour-catalog-service        1.0       fgh678ijk901   45 minutes ago   138MB
node                        18-alpine ghi789jkl012   2 weeks ago      120MB
```

**Vérifier l'espace disque utilisé** :

```bash
docker system df
```

**Sortie** :

```
TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE
Images          7         3         850MB     450MB (52%)
Containers      5         3         12.5MB    8.2MB (65%)
Local Volumes   0         0         0B        0B
Build Cache     45        0         2.3GB     2.3GB
```

#### 2. Arrêter tous les conteneurs

**Méthode 1 : Arrêter individuellement** :

```bash
# Arrêter chaque conteneur par son nom
docker stop payment-gateway
docker stop booking-service
docker stop tour-catalog
docker stop tour-catalog-test
docker stop tour-catalog-cache-test
```

**Méthode 2 : Arrêter tous les conteneurs en une commande** :

```bash
# Récupérer les IDs de tous les conteneurs en cours d'exécution et les arrêter
docker stop $(docker ps -q)
```

**Méthode 3 : Arrêter avec timeout personnalisé** :

```bash
# Arrêter avec un timeout de 5 secondes (pour les tests)
docker stop -t 5 $(docker ps -q)
```

**Vérification** :

```bash
docker ps
```

**Sortie** (aucun conteneur ne devrait être en cours d'exécution) :

```
CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS    PORTS     NAMES
```

#### 3. Supprimer tous les conteneurs

**Méthode 1 : Supprimer individuellement** :

```bash
docker rm payment-gateway
docker rm booking-service
docker rm tour-catalog
docker rm tour-catalog-test
docker rm tour-catalog-cache-test
```

**Méthode 2 : Supprimer tous les conteneurs arrêtés** :

```bash
docker rm $(docker ps -a -q)
```

**Méthode 3 : Forcer la suppression des conteneurs en cours d'exécution** :

```bash
# ATTENTION : Cela arrête ET supprime tous les conteneurs
docker rm -f $(docker ps -a -q)
```

**Vérification** :

```bash
docker ps -a
```

**Sortie** (devrait être vide) :

```
CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS    PORTS     NAMES
```

#### 4. Supprimer toutes les images

**Méthode 1 : Supprimer les images spécifiques par tag** :

```bash
# Supprimer les images des microservices
docker rmi payment-gateway-service:1.0
docker rmi booking-service:1.0
docker rmi tour-catalog-service:1.0
docker rmi tour-catalog-service:2.0
docker rmi tour-catalog-service:2.1
docker rmi tour-catalog-service:2.2
```

**Méthode 2 : Supprimer toutes les images d'un repository** :

```bash
# Supprimer toutes les versions de tour-catalog-service
docker rmi $(docker images tour-catalog-service -q)
```

**Méthode 3 : Supprimer toutes les images non utilisées (dangling)** :

```bash
# Supprimer les images sans tag (<none>)
docker image prune
```

**Méthode 4 : Supprimer TOUTES les images** :

```bash
# ATTENTION : Cela supprime toutes les images non utilisées par des conteneurs
docker image prune -a
```

**Vérification** :

```bash
docker images
```

**Sortie** (ne devrait montrer que les images de base) :

```
REPOSITORY   TAG       IMAGE ID       CREATED       SIZE
node         18-alpine ghi789jkl012   2 weeks ago   120MB
```

#### 5. Nettoyage complet du système

**Option 1 : Nettoyage interactif (recommandé)** :

```bash
# Supprimer les conteneurs arrêtés
docker container prune

# Supprimer les images non utilisées
docker image prune -a

# Supprimer les volumes non utilisés
docker volume prune

# Supprimer les réseaux non utilisés
docker network prune

# Supprimer le cache de build
docker builder prune
```

**Option 2 : Nettoyage total en une commande** :

```bash
# ⚠️ ATTENTION : Cela supprime TOUT ce qui n'est pas utilisé
docker system prune -a --volumes
```

**Confirmation demandée** :

```
WARNING! This will remove:
  - all stopped containers
  - all networks not used by at least one container
  - all volumes not used by at least one container
  - all images without at least one container associated to them
  - all build cache

Are you sure you want to continue? [y/N]
```

**Après confirmation** :

```
Deleted Containers:
9f8a7b6c5d4e
8e7a6b5c4d3f
7d6a5b4c3e2f
6c5b4a3d2e1f
5b4a3c2d1e0f

Deleted Images:
untagged: payment-gateway-service:1.0
deleted: sha256:abc123...
untagged: booking-service:1.0
deleted: sha256:bcd234...
untagged: tour-catalog-service:1.0
deleted: sha256:cde345...
untagged: tour-catalog-service:2.0
deleted: sha256:def456...
untagged: tour-catalog-service:2.1
deleted: sha256:efg567...
untagged: tour-catalog-service:2.2
deleted: sha256:fgh678...

Total reclaimed space: 850MB
```

#### 6. Vérification finale

**Vérifier qu'il ne reste aucun conteneur** :

```bash
docker ps -a
```

**Sortie** :

```
CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS    PORTS     NAMES
```

**Vérifier les images restantes** :

```bash
docker images
```

**Sortie** (seulement les images de base) :

```
REPOSITORY   TAG       IMAGE ID       CREATED       SIZE
node         18-alpine ghi789jkl012   2 weeks ago   120MB
```

**Vérifier l'espace disque libéré** :

```bash
docker system df
```

**Sortie** :

```
TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE
Images          1         0         120MB     120MB (100%)
Containers      0         0         0B        0B
Local Volumes   0         0         0B        0B
Build Cache     0         0         0B        0B
```

**Espace libéré** : **~850 MB** 🎉

#### 7. Script de nettoyage automatique

Pour faciliter le nettoyage régulier, créez un script :

**Fichier : `scripts/docker-cleanup.sh`**

```bash
#!/bin/bash

# Script de nettoyage Docker pour le projet xp-microservices
# Usage: ./scripts/docker-cleanup.sh

set -e

echo "🧹 Nettoyage des ressources Docker..."
echo ""

# Fonction pour afficher l'espace utilisé
show_disk_usage() {
    echo "📊 Espace disque Docker:"
    docker system df
    echo ""
}

# Afficher l'utilisation avant nettoyage
echo "=== AVANT NETTOYAGE ==="
show_disk_usage

# Demander confirmation
read -p "Voulez-vous continuer avec le nettoyage ? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Nettoyage annulé."
    exit 1
fi

# Arrêter tous les conteneurs en cours d'exécution
echo "⏹️  Arrêt des conteneurs en cours d'exécution..."
if [ "$(docker ps -q)" ]; then
    docker stop $(docker ps -q)
    echo "✅ Conteneurs arrêtés"
else
    echo "ℹ️  Aucun conteneur en cours d'exécution"
fi
echo ""

# Supprimer tous les conteneurs
echo "🗑️  Suppression des conteneurs..."
if [ "$(docker ps -a -q)" ]; then
    docker rm $(docker ps -a -q)
    echo "✅ Conteneurs supprimés"
else
    echo "ℹ️  Aucun conteneur à supprimer"
fi
echo ""

# Supprimer les images non utilisées
echo "🖼️  Suppression des images non utilisées..."
docker image prune -a -f
echo "✅ Images nettoyées"
echo ""

# Supprimer les volumes non utilisés
echo "💾 Suppression des volumes non utilisés..."
docker volume prune -f
echo "✅ Volumes nettoyés"
echo ""

# Supprimer les réseaux non utilisés
echo "🌐 Suppression des réseaux non utilisés..."
docker network prune -f
echo "✅ Réseaux nettoyés"
echo ""

# Supprimer le cache de build
echo "🏗️  Suppression du cache de build..."
docker builder prune -a -f
echo "✅ Cache de build nettoyé"
echo ""

# Afficher l'utilisation après nettoyage
echo "=== APRÈS NETTOYAGE ==="
show_disk_usage

echo "✨ Nettoyage terminé avec succès!"
```

**Rendre le script exécutable** :

```bash
chmod +x scripts/docker-cleanup.sh
```

**Utilisation** :

```bash
./scripts/docker-cleanup.sh
```

---

## Résumé des Exercices

### Exercice 6.1.1 : Containerisation Payment Gateway

✅ Dockerfile multi-stage créé avec optimisations de sécurité  
✅ .dockerignore configuré pour exclure les fichiers inutiles  
✅ Image construite et taguée correctement  
✅ Conteneur exécuté avec mapping de port et variables d'environnement  
✅ Trois microservices fonctionnent simultanément

**Concepts clés** : Multi-stage builds, utilisateur non-root, health checks, dumb-init

### Exercice 6.1.2 : Cache Docker

✅ Démonstration du cache avec modification de code source (gain 93%)  
✅ Impact de la modification de package.json sur le cache  
✅ Importance de l'ordre des instructions  
✅ Visualisation du cache avec --progress=plain

**Concepts clés** : Layer caching, invalidation de cache, optimisation de build

### Exercice 6.1.3 : Nettoyage

✅ Arrêt et suppression de tous les conteneurs  
✅ Suppression de toutes les images créées  
✅ Nettoyage complet avec docker system prune  
✅ Script de nettoyage automatisé  
✅ ~850 MB d'espace disque libéré

**Concepts clés** : Gestion des ressources, docker prune, bonnes pratiques d'entretien

---

## Points Clés à Retenir

🎯 **Dockerfiles optimisés** :

- Multi-stage builds pour réduire la taille finale
- Ordre des instructions crucial pour le cache
- Utilisateur non-root pour la sécurité

🚀 **Performance** :

- Le cache de Docker peut réduire les temps de build de 85-95%
- COPY package.json AVANT COPY . . est essentiel
- npm ci --production est plus rapide que npm install

🔒 **Sécurité** :

- Ne jamais inclure de secrets dans les images
- Utiliser .dockerignore comme .gitignore
- Scanner les images avec docker scan

🧹 **Maintenance** :

- Nettoyer régulièrement les ressources inutilisées
- Automatiser le nettoyage avec des scripts
- Surveiller l'espace disque avec docker system df

---

## Prochaines Étapes

Dans la **Leçon 6.2**, nous apprendrons à orchestrer ces conteneurs avec **Docker Compose** pour gérer l'ensemble de notre architecture microservices (incluant bases de données, RabbitMQ, Redis) comme une seule application cohérente.

Puis nous explorerons **Kubernetes** pour l'orchestration en production à grande échelle ! 🚢

---

**Félicitations ! Vous maîtrisez maintenant la containerisation Docker pour microservices !** 🎉
