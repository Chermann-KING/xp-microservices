# Leçon 6.1 - Containerisation avec Docker pour les Microservices

**Module 6** : Déploiement, surveillance et évolutivité

---

## Objectifs pédagogiques

- Comprendre les principes fondamentaux de la containerisation et son importance pour les microservices
- Maîtriser les concepts clés de Docker : images, conteneurs, Dockerfile, registries
- Créer des Dockerfiles optimisés pour des applications Node.js
- Utiliser les builds multi-stages pour réduire la taille des images
- Construire, exécuter et gérer des conteneurs Docker
- Appliquer les meilleures pratiques de containerisation (caching, .dockerignore)

## Prérequis

- Modules 1-5 : Fondamentaux des microservices et architecture event-driven
- Connaissance de base de Node.js et npm
- Familiarité avec la ligne de commande
- Docker Desktop installé sur votre machine

---

## Introduction

L'architecture microservices, telle qu'implémentée dans notre application de réservation touristique, introduit des défis en matière de déploiement et de cohérence des environnements. La containerisation avec Docker répond à ces défis en emballant les applications et leurs dépendances dans des unités standardisées appelées conteneurs, garantissant qu'elles s'exécutent de manière cohérente dans n'importe quel environnement. Cette leçon explore les fondamentaux de Docker, comment il facilite le déploiement des microservices, et comment définir des images de conteneurs pour nos microservices Node.js.

---

## 1. Comprendre la Containerisation et Docker

La containerisation est une méthode de virtualisation qui emballe une application avec toutes ses dépendances—bibliothèques, frameworks et configurations—dans une unité isolée appelée conteneur. Ce conteneur peut ensuite s'exécuter de manière cohérente sur n'importe quelle infrastructure, d'une machine de développeur local à un serveur de production dans le cloud. **Docker** est la plateforme la plus largement adoptée pour construire, partager et exécuter des conteneurs.

### 1.1 Le Problème que Docker Résout

Considérons le déploiement traditionnel de notre microservice Tour Catalog. C'est une application Node.js, elle nécessite donc une version spécifique de Node.js, divers packages npm, et peut-être des dépendances système pour les pilotes de base de données. Sans Docker, configurer l'environnement exact sur différentes machines (ordinateur portable de développeur, serveur de test, serveur de production) peut être chronophage et sujet aux problèmes du type "ça marche sur ma machine" dus aux différences de versions d'OS, de versions de bibliothèques ou de variables d'environnement.

**Docker résout ce problème en fournissant :**

#### **Isolation**

Chaque conteneur s'exécute de manière isolée des autres conteneurs et du système hôte. Cela empêche les conflits entre les dépendances de différents microservices. Par exemple, si le microservice Tour Catalog nécessite Node.js v16 et le microservice Booking nécessite Node.js v18, ils peuvent tous deux s'exécuter sur la même machine hôte dans leurs conteneurs respectifs sans conflit.

#### **Portabilité**

Une image de conteneur Docker est un package léger, autonome et exécutable qui inclut tout ce qui est nécessaire pour exécuter une application. Cette image peut être partagée et exécutée de manière cohérente sur divers systèmes d'exploitation et infrastructures. Cela signifie que l'image construite par un développeur localement se comportera de manière identique lorsqu'elle sera déployée sur un serveur cloud.

#### **Efficacité**

Les conteneurs sont beaucoup plus légers que les machines virtuelles traditionnelles car ils partagent le noyau du système d'exploitation hôte. Cela réduit la consommation de ressources et accélère les temps de démarrage.

### 1.2 Concepts Clés de Docker

#### **Image Docker**

Un modèle en lecture seule qui contient un ensemble d'instructions pour créer un conteneur. Il inclut le code de l'application, le runtime, les outils système, les bibliothèques système et les paramètres. Les images sont construites à partir d'un Dockerfile. Pensez à une image comme un plan directeur pour une application.

#### **Dockerfile**

Un fichier texte qui contient toutes les commandes qu'un utilisateur pourrait appeler en ligne de commande pour assembler une image. Il définit l'image de base, copie le code de l'application, installe les dépendances, expose les ports et spécifie la commande pour exécuter l'application.

#### **Conteneur Docker**

Une instance exécutable d'une image Docker. Lorsque vous exécutez une image, elle devient un conteneur. Un conteneur est un package léger, autonome et exécutable de logiciel qui inclut tout ce qui est nécessaire pour exécuter une application. Plusieurs conteneurs peuvent s'exécuter à partir de la même image.

#### **Docker Hub/Registry**

Un service pour stocker et partager des images Docker. Docker Hub est le registre public de Docker, où les utilisateurs peuvent trouver des images officielles (par exemple, Node.js, PostgreSQL) et héberger leurs propres images. Les registres privés sont également courants pour les organisations.

---

## 2. Créer des Dockerfiles pour Nos Microservices

Un Dockerfile est le composant central pour containeriser une application. Nous allons créer un Dockerfile pour notre microservice Tour Catalog. Les principes s'appliquent de manière similaire aux autres microservices Node.js comme Booking Management ou Payment Gateway.

### 2.1 Anatomie d'un Dockerfile

Un Dockerfile se compose d'une série d'instructions. Chaque instruction crée une nouvelle couche dans l'image Docker. Lorsque des modifications sont apportées, seules les couches modifiées sont reconstruites, améliorant l'efficacité de la construction.

Décomposons un Dockerfile typique pour une application Node.js :

```dockerfile
# Stage 1: Construction de l'application (si nécessaire, pour les langages compilés ou les builds frontend)
# Pour une API Node.js simple, cette étape peut être combinée avec l'étape finale
FROM node:18-alpine AS build

# Définir le répertoire de travail à l'intérieur du conteneur
WORKDIR /app

# Copier package.json et package-lock.json en premier pour tirer parti du cache des couches Docker
# Cela garantit que npm install ne s'exécute que si ces fichiers changent
COPY package.json ./
COPY package-lock.json ./

# Installer les dépendances de l'application
RUN npm install

# Copier le reste du code de l'application
COPY . .

# S'il y a une étape de build (par exemple, Babel pour la transpilation ou Webpack pour le frontend)
# RUN npm run build

# Stage 2: Créer une image plus petite, prête pour la production
FROM node:18-alpine

# Définir le répertoire de travail
WORKDIR /app

# Copier uniquement les fichiers nécessaires depuis l'étape de build (si applicable, typiquement pour les images optimisées)
# Pour Node.js, nous copions souvent simplement depuis la première étape si elle inclut node_modules
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json ./package-lock.json
COPY --from=build /app/src ./src # En supposant que votre code source est dans un répertoire 'src'
COPY --from=build /app/server.js ./server.js # Fichier d'entrée principal

# Exposer le port sur lequel le microservice écoute
# Cela ne publie pas le port, il le documente seulement
EXPOSE 3001

# Commande pour exécuter l'application lorsque le conteneur démarre
CMD ["node", "server.js"] # Ou ["npm", "start"] si votre package.json a un script start
```

### 2.2 Explication des Instructions Dockerfile

#### **FROM node:18-alpine**

Cela spécifie l'image de base. `node:18-alpine` signifie que nous utilisons Node.js version 18 s'exécutant sur Alpine Linux. Alpine est une distribution Linux très petite et sécurisée, créant des images Docker plus petites.

#### **WORKDIR /app**

Définit le répertoire de travail à l'intérieur du conteneur. Toutes les commandes suivantes seront exécutées dans ce répertoire sauf indication contraire.

#### **COPY package.json ./** et **COPY package-lock.json ./**

Copie les fichiers `package.json` et `package-lock.json` de l'hôte vers le répertoire de travail actuel (`/app`) dans le conteneur. Faire cela avant de copier le reste du code optimise le cache. Si ces fichiers ne changent pas, Docker peut réutiliser la couche `npm install` d'une construction précédente.

#### **RUN npm install**

Exécute `npm install` à l'intérieur du conteneur pour installer toutes les dépendances Node.js.

#### **COPY . .**

Copie le code d'application restant du répertoire actuel sur la machine hôte vers le répertoire `/app` dans le conteneur.

#### **EXPOSE 3001**

Informe Docker que le conteneur écoute sur le port réseau spécifié au moment de l'exécution. Ceci est purement déclaratif et ne publie pas le port. La publication du port se fait lors de l'exécution du conteneur (par exemple, avec le flag `-p`). Pour notre microservice Tour Catalog, il écoute sur le port 3001.

#### **CMD ["node", "server.js"]**

Spécifie la commande à exécuter lorsque le conteneur démarre. C'est le processus principal qui maintient le conteneur en vie. Pour notre application Node.js, c'est `node server.js`. Si votre `package.json` a un script start, vous pouvez utiliser `CMD ["npm", "start"]`.

### 2.3 Builds Multi-Stages (Optionnel mais Recommandé)

L'exemple de Dockerfile ci-dessus démontre un build multi-stage. C'est une meilleure pratique pour créer des images de production plus petites et plus sécurisées.

- **Stage 1 (build)** : Utilisé pour compiler le code, installer les dépendances de dev ou construire les assets frontend. La ligne `node:18-alpine AS build` nomme cette étape `build`.
- **Stage 2 (Image Finale)** : Part d'une image de base fraîche et minimale (par exemple, `node:18-alpine`) et copie uniquement les artefacts nécessaires pour exécuter l'application depuis l'étape précédente. Cela réduit significativement la taille de l'image finale en excluant les outils de build, les dépendances de dev et les fichiers temporaires.

Pour une API Node.js simple, le principal avantage est souvent simplement d'exclure les `devDependencies`.

### 2.4 Exemple : Dockerfile du Microservice Tour Catalog

Supposons que notre microservice Tour Catalog (du Module 2) ait son point d'entrée principal à `src/server.js` et les dépendances définies dans `package.json`.

**Structure de répertoire :**

```
tour-catalog-service/
├── src/
│   ├── routes/
│   ├── controllers/
│   ├── models/
│   └── server.js
├── package.json
├── package-lock.json
├── .dockerignore
└── Dockerfile
```

**Dockerfile (tour-catalog-service/Dockerfile) :**

```dockerfile
# Stage 1: Stage de construction
FROM node:18-alpine AS builder

WORKDIR /app

# Copier package.json et package-lock.json en premier pour un cache efficace
COPY package.json ./
COPY package-lock.json ./

# Installer les dépendances de production
RUN npm install --production

# Copier le reste du code source de l'application
COPY . .

# Stage 2: Image de production
FROM node:18-alpine

WORKDIR /app

# Copier uniquement les fichiers nécessaires depuis l'étape de construction
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/src ./src
COPY --from=builder /app/.env.example ./.env.example # Si vous avez un fichier .env exemple

# Exposer le port sur lequel l'application s'exécute
EXPOSE 3001

# Commande pour exécuter l'application
CMD ["node", "src/server.js"]
```

### 2.5 Utiliser .dockerignore

Similaire à `.gitignore`, un fichier `.dockerignore` spécifie les fichiers et répertoires à exclure lors de la construction d'une image Docker. Cela empêche les fichiers inutiles (comme `node_modules` sur l'hôte, les répertoires `.git`, les logs ou les fichiers temporaires) d'être copiés dans l'image, réduisant la taille de l'image et le temps de construction.

**Exemple .dockerignore pour une application Node.js :**

```
node_modules
npm-debug.log
.git
.vscode
.env
dist
build
tmp/
tempnpm-cache/
*.log
.DS_Store
coverage/
.github/
README.md
```

---

## 3. Construire et Exécuter des Images Docker

Une fois qu'un Dockerfile est défini, vous utilisez la CLI Docker pour construire une image puis exécuter un conteneur à partir de cette image.

### 3.1 Construire une Image

Naviguez vers le répertoire contenant votre Dockerfile (par exemple, `tour-catalog-service/`) et exécutez la commande `docker build` :

```bash
docker build -t tour-catalog-service:1.0 .
```

- **`-t tour-catalog-service:1.0`** : Cela tagge l'image avec un nom (`tour-catalog-service`) et une version (`1.0`). Les tags aident à identifier les images. Vous pouvez aussi spécifier juste `tour-catalog-service` qui par défaut utilise le tag `latest`.
- **`.`** : Cela spécifie le contexte de build, qui est le chemin vers le répertoire contenant le Dockerfile et le code de l'application. Ici, `.` signifie le répertoire actuel.

Docker exécutera chaque instruction dans le Dockerfile, créant des couches et produisant finalement une nouvelle image.

### 3.2 Exécuter un Conteneur

Après avoir construit l'image, vous pouvez exécuter un conteneur à partir de celle-ci :

```bash
docker run -p 3001:3001 --name tour-catalog tour-catalog-service:1.0
```

- **`-p 3001:3001`** : Cela publie le port du conteneur vers l'hôte. Le format est `HOST_PORT:CONTAINER_PORT`. Il mappe le port 3001 sur votre machine hôte au port 3001 à l'intérieur du conteneur. Cela vous permet d'accéder au microservice via `http://localhost:3001` depuis votre hôte.
- **`--name tour-catalog`** : Assigne un nom lisible par l'homme au conteneur (`tour-catalog`), facilitant sa référence ultérieure (par exemple, pour l'arrêter ou le supprimer).
- **`tour-catalog-service:1.0`** : Spécifie l'image à utiliser pour créer le conteneur.

Pour exécuter le conteneur en arrière-plan (mode détaché) :

```bash
docker run -d -p 3001:3001 --name tour-catalog tour-catalog-service:1.0
```

- **`-d`** : Exécute le conteneur en mode détaché. Le conteneur s'exécute en arrière-plan et vous récupérez le contrôle de votre terminal.

### 3.3 Vérifier le Statut du Conteneur

Vous pouvez vérifier le statut des conteneurs en cours d'exécution :

```bash
docker ps
```

Cette commande liste tous les conteneurs actuellement en cours d'exécution, montrant leurs IDs, images, commandes, temps de création, statut, ports et noms.

Pour voir tous les conteneurs (en cours d'exécution et arrêtés) :

```bash
docker ps -a
```

### 3.4 Afficher les Logs du Conteneur

Pour voir les logs d'un conteneur en cours d'exécution :

```bash
docker logs tour-catalog
```

Pour suivre les logs en temps réel :

```bash
docker logs -f tour-catalog
```

### 3.5 Arrêter et Supprimer des Conteneurs et Images

**Arrêter un conteneur :**

```bash
docker stop tour-catalog # Par nom
docker stop <container_id> # Par ID
```

**Supprimer un conteneur :**

```bash
docker rm tour-catalog # Par nom
docker rm <container_id> # Par ID
```

Vous devez arrêter un conteneur avant de le supprimer. Utilisez `docker rm -f tour-catalog` pour forcer la suppression d'un conteneur en cours d'exécution.

**Supprimer une image :**

```bash
docker rmi tour-catalog-service:1.0 # Par nom et tag
docker rmi <image_id> # Par ID
```

Vous devez supprimer tous les conteneurs basés sur une image avant de supprimer l'image elle-même.

---

## 4. Exemple Pratique : Containeriser le Microservice Booking Management

Appliquons ces concepts à notre microservice Booking Management. Supposons qu'il s'agit d'une application Node.js écoutant sur le port 3002, avec son point d'entrée principal à `src/server.js`.

**Structure de répertoire :**

```
booking-management-service/
├── src/
│   ├── routes/
│   ├── controllers/
│   ├── models/
│   └── server.js # Fichier d'entrée principal
├── package.json
├── package-lock.json
├── .dockerignore
└── Dockerfile
```

**Dockerfile (booking-management-service/Dockerfile) :**

```dockerfile
# Stage 1: Stage de construction pour installer les dépendances
FROM node:18-alpine AS builder

WORKDIR /app

# Copier package.json et package-lock.json en premier
COPY package.json ./
COPY package-lock.json ./

# Installer les dépendances de production
RUN npm install --production

# Copier le reste du code source de l'application
COPY . .

# Stage 2: Image de production
FROM node:18-alpine

WORKDIR /app

# Copier uniquement les fichiers nécessaires depuis l'étape de construction
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/src ./src

# Exposer le port sur lequel l'application s'exécute
EXPOSE 3002 # Le microservice Booking écoute sur le port 3002

# Commande pour exécuter l'application
CMD ["node", "src/server.js"]
```

**Étapes pour construire et exécuter :**

1. Naviguez vers `booking-management-service/`
2. Construisez l'image :
   ```bash
   docker build -t booking-service:1.0 .
   ```
3. Exécutez le conteneur :
   ```bash
   docker run -d -p 3002:3002 --name booking-service booking-service:1.0
   ```
4. Vérifiez qu'il s'exécute :
   ```bash
   docker ps
   ```

Vous devriez voir les deux conteneurs `tour-catalog` et `booking-service` en cours d'exécution.

---

## 5. Meilleures Pratiques Docker

### 5.1 Optimisation du Cache des Couches

L'ordre des instructions dans le Dockerfile est crucial pour l'efficacité du cache. Placez les instructions qui changent rarement (comme `COPY package.json` et `RUN npm install`) avant celles qui changent fréquemment (comme `COPY . .`).

### 5.2 Utiliser des Images de Base Légères

Utilisez des variantes Alpine des images officielles (par exemple, `node:18-alpine`) pour réduire la taille de l'image et améliorer la sécurité.

### 5.3 Minimiser le Nombre de Couches

Combinez les commandes RUN lorsque cela est logique pour réduire le nombre de couches :

```dockerfile
RUN apt-get update && \
    apt-get install -y curl && \
    rm -rf /var/lib/apt/lists/*
```

### 5.4 Ne Jamais Stocker de Secrets dans les Images

N'incluez jamais de secrets (clés API, mots de passe) directement dans le Dockerfile ou les fichiers copiés. Utilisez des variables d'environnement ou des secrets Docker.

### 5.5 Utiliser .dockerignore

Excluez les fichiers inutiles pour réduire la taille de l'image et le temps de construction.

### 5.6 Scanner les Vulnérabilités

Utilisez des outils comme `docker scan` ou Trivy pour scanner les images à la recherche de vulnérabilités de sécurité.

---

## 6. Exercices et Activités Pratiques

### Exercice 1 - Containeriser le Microservice Payment Gateway

1. Localisez le microservice Payment Gateway du Module 4. Supposons que son fichier principal est `server.js` et qu'il écoute sur le port 3004.
2. Créez un Dockerfile pour ce service.
3. Créez un fichier `.dockerignore` approprié.
4. Construisez l'image Docker avec un tag comme `payment-gateway-service:1.0`.
5. Exécutez un conteneur à partir de cette image, en mappant le port 3004 de l'hôte au conteneur.
6. Vérifiez que les trois conteneurs de microservices (`tour-catalog`, `booking-service`, `payment-gateway-service`) sont en cours d'exécution avec `docker ps`.

### Exercice 2 - Expérimenter avec le Cache du Dockerfile

1. Apportez une modification mineure uniquement à un fichier dans le répertoire `src` de votre `tour-catalog-service`.
2. Reconstruisez l'image `tour-catalog-service` (`docker build -t tour-catalog-service:2.0 .`). Observez la sortie de construction. Remarquez comment Docker réutilise les couches pour `COPY package.json` et `RUN npm install`.
3. Maintenant, modifiez `package.json` (par exemple, ajoutez une nouvelle dépendance factice, puis supprimez-la).
4. Reconstruisez l'image (`docker build -t tour-catalog-service:2.1 .`). Observez que l'étape `RUN npm install` est maintenant ré-exécutée car ses dépendances (la couche `COPY package.json`) ont changé. Cela démontre l'importance de l'ordre des instructions dans un Dockerfile.

### Exercice 3 - Nettoyer les Ressources Docker

1. Arrêtez et supprimez tous les conteneurs de microservices que vous avez créés.
2. Supprimez toutes les images Docker associées.
3. Vérifiez avec `docker ps -a` et `docker images` que tous les conteneurs et images associés à cet exercice ont été nettoyés.

**Commandes utiles :**

```bash
# Arrêter tous les conteneurs en cours d'exécution
docker stop $(docker ps -q)

# Supprimer tous les conteneurs arrêtés
docker rm $(docker ps -a -q)

# Supprimer toutes les images non utilisées
docker image prune -a

# Nettoyer complètement le système Docker (attention : supprime tout)
docker system prune -a --volumes
```

---

## Résumé de la Leçon

Cette leçon a fourni une plongée approfondie dans la containerisation avec Docker, couvrant ses concepts de base, ses avantages pour les microservices et les étapes pratiques pour définir, construire et exécuter des images Docker. Nous avons créé des Dockerfiles pour nos microservices Node.js, en comprenant le rôle de chaque instruction et l'importance des builds multi-stages et du `.dockerignore` pour une création d'image efficace.

**Points clés à retenir :**

✅ **Isolation** : Docker permet d'exécuter plusieurs versions de dépendances sans conflit  
✅ **Portabilité** : Les conteneurs s'exécutent de manière identique partout  
✅ **Efficacité** : Les conteneurs sont légers et démarrent rapidement  
✅ **Reproductibilité** : Le Dockerfile documente exactement comment l'environnement est configuré  
✅ **Optimisation** : Le cache des couches et les builds multi-stages réduisent les temps de build

En containerisant nos microservices Tour Catalog et Booking Management, nous avons assuré des environnements cohérents et isolés pour nos applications.

---

## Prochaines Étapes

Dans la prochaine leçon, nous passerons de la gestion de conteneurs individuels à l'orchestration de plusieurs conteneurs avec **Docker Compose**. Cela nous permettra de définir et d'exécuter notre application de microservices multi-conteneurs comme une seule unité, incluant les dépendances comme les bases de données, simplifiant le développement local et les tests sur l'ensemble de notre application de réservation touristique.

Nous introduirons également les fondamentaux de **Kubernetes**, une plateforme d'orchestration de conteneurs plus avancée, essentielle pour les déploiements en production à grande échelle.

---

## Ressources Complémentaires

- [Documentation officielle Docker](https://docs.docker.com/)
- [Dockerfile Best Practices](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
- [Docker Hub](https://hub.docker.com/) - Registre d'images Docker
- [Multi-stage builds](https://docs.docker.com/build/building/multi-stage/)
- [Node.js Docker Best Practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)

---

## Navigation

- **⬅️ Précédent** : [Module 5 - Leçon 5.6 : Création de Fonctionnalités Temps Réel avec WebSockets pour la Disponibilité des Tours](../../module-5/lecon-6-websockets-realtime.md)
- **➡️ Suivant** : [Leçon 6.2 - Orchestration avec Docker Compose et principes fondamentaux de Kubernetes](lecon-2-orchestration-compose-kubernetes.md)
- **🏠 Sommaire** : [Retour au README](README.md)

---
