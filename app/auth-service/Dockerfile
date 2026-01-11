# Auth Service - Dockerfile
# Module 6 - Containerisation Docker

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copier le shared auth-middleware d'abord
COPY ../shared ./shared

# Copier les fichiers de dépendances
COPY package.json package-lock.json ./

# Installer les dépendances de production uniquement
RUN npm ci --only=production --ignore-scripts

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Créer un utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copier les dépendances depuis le stage builder
COPY --from=builder /app/node_modules ./node_modules

# Copier le code source
COPY package.json ./
COPY server.js ./
COPY src ./src

# Changer le propriétaire des fichiers
RUN chown -R nodejs:nodejs /app

# Utiliser l'utilisateur non-root
USER nodejs

# Exposer le port du service
EXPOSE 3005

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV PORT=3005

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3005/health || exit 1

# Démarrer le service
CMD ["node", "server.js"]
