# Module 4 - Intégration et Sécurité du Traitement des Paiements

## 🎯 Objectifs du Module

Ce module aborde les aspects critiques de la **sécurité** et du **traitement des paiements** dans une architecture microservices. Vous apprendrez à intégrer un système de paiement professionnel (Stripe), à sécuriser les communications entre services, et à implémenter une authentification robuste.

---

## 📚 Ce que vous allez apprendre

### Architecture de Paiement

- Concevoir une **passerelle de paiement** (Payment Gateway)
- Comprendre les différents **processeurs de paiement** (Stripe, PayPal)
- Implémenter des patterns de **haute disponibilité** (Circuit Breaker, Retry)
- Assurer la **conformité PCI-DSS**

### Intégration Stripe

- Configurer un compte **Stripe** et gérer les clés API
- Créer des **PaymentIntents** côté serveur
- Intégrer **Stripe Elements** dans React
- Gérer les **cartes de test** et scénarios d'erreur

### Webhooks de Paiement

- Comprendre le modèle **événementiel** de Stripe
- Valider les **signatures** de webhooks
- Implémenter l'**idempotence** des traitements
- Synchroniser les **statuts de paiement** avec les réservations

### Stratégies d'Authentification

- Différencier **authentification** et **autorisation**
- Maîtriser les **JSON Web Tokens (JWT)**
- Comprendre **OAuth2** et **PKCE** pour les SPA
- Concevoir des stratégies adaptées aux microservices

### Microservice d'Authentification

- Sécuriser le stockage des mots de passe avec **bcrypt**
- Implémenter **register** et **login**
- Gérer les **access tokens** et **refresh tokens**
- Créer un **middleware de validation** réutilisable

### Communication Sécurisée

- Configurer une **API Gateway** comme point d'entrée unique
- Implémenter le **rate limiting** et la validation des entrées
- Sécuriser avec **HTTPS** et comprendre **TLS**
- Introduction au **mTLS** (Mutual TLS)

---

## 📖 Leçons du Module

| #   | Leçon                                                                                                      | Description                                          | Durée estimée |
| --- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------- |
| 4.1 | [Conception du Microservice d'Intégration de la Passerelle de Paiement](lecon-1-payment-gateway-design.md) | Architecture Payment Gateway, patterns de résilience | ~2h           |
| 4.2 | [Implémentation du Traitement Sécurisé des Paiements avec Stripe API](lecon-2-stripe-integration.md)       | Configuration, PaymentIntent, Stripe Elements        | ~2h30         |
| 4.3 | [Gestion des Callbacks et Webhooks de Paiement](lecon-3-payment-webhooks.md)                               | Événements Stripe, signatures, idempotence           | ~2h           |
| 4.4 | [Stratégies d'Authentification et d'Autorisation (JWT, OAuth2)](lecon-4-auth-strategies.md)                | JWT, OAuth2, PKCE, RBAC                              | ~2h30         |
| 4.5 | [Mise en œuvre du Microservice d'Authentification des Utilisateurs](lecon-5-user-auth-microservice.md)     | Register, Login, JWT, middleware                     | ~2h           |
| 4.6 | [Communication Sécurisée entre Microservices (API Gateway, HTTPS)](lecon-6-secure-communication.md)        | API Gateway, HTTPS, Rate Limiting                    | ~2h           |

**Temps total estimé : ~13 heures**

---

## 🏆 Acquis à la fin du Module

À la fin de ce module, vous serez capable de :

### Paiements

- ✅ Concevoir une **architecture de paiement** robuste et conforme
- ✅ Intégrer **Stripe** pour le traitement des paiements
- ✅ Gérer les **webhooks** et la synchronisation des statuts
- ✅ Implémenter l'**idempotence** pour éviter les doublons

### Sécurité

- ✅ Sécuriser les **mots de passe** avec bcrypt
- ✅ Générer et valider des **JWT** (access + refresh tokens)
- ✅ Comprendre **OAuth2 avec PKCE** pour les applications React
- ✅ Implémenter **RBAC** (Role-Based Access Control)

### Infrastructure

- ✅ Configurer une **API Gateway** centralisée
- ✅ Mettre en place le **rate limiting** contre les abus
- ✅ Configurer **HTTPS** avec certificats SSL/TLS
- ✅ Comprendre le **mTLS** pour la sécurité inter-services

---

## 🛠️ Stack Technique

| Technologie             | Version   | Usage                     |
| ----------------------- | --------- | ------------------------- |
| Stripe                  | API v2024 | Processeur de paiement    |
| @stripe/stripe-js       | 2.x       | SDK Frontend              |
| @stripe/react-stripe-js | 2.x       | Composants React          |
| jsonwebtoken            | 9.x       | Génération/Validation JWT |
| bcrypt                  | 5.x       | Hachage mots de passe     |
| express-rate-limit      | 7.x       | Rate limiting             |
| joi                     | 17.x      | Validation des entrées    |
| helmet                  | 7.x       | Headers de sécurité       |

---

## 🏗️ Services Construits

### Payment Gateway (Port 3004)

**Fonctionnalités :**

- Création de PaymentIntent
- Gestion des webhooks Stripe
- Synchronisation avec le service de réservation
- Circuit Breaker et retry logic

**Endpoints principaux :**

```
POST   /api/payments/create-intent     # Créer un PaymentIntent
POST   /api/payments/webhook           # Recevoir les événements Stripe
GET    /api/payments/:id               # Détail d'un paiement
GET    /api/payments/booking/:id       # Paiements d'une réservation
```

### Auth Service (Port 3001)

**Fonctionnalités :**

- Inscription utilisateur (register)
- Connexion (login) avec JWT
- Rafraîchissement de token
- Middleware de validation partagé

**Endpoints principaux :**

```
POST   /auth/register                  # Créer un compte
POST   /auth/login                     # Se connecter
POST   /auth/refresh                   # Rafraîchir le token
POST   /auth/logout                    # Déconnexion
GET    /auth/me                        # Profil utilisateur
```

### API Gateway (Port 8080)

**Fonctionnalités :**

- Point d'entrée unique
- Validation JWT centralisée
- Rate limiting
- Proxy vers les microservices

**Routes exposées :**

```
/api/tours/*        → Tour Catalog Service
/api/bookings/*     → Booking Service
/api/payments/*     → Payment Service
/auth/*             → Auth Service (public)
/health             → Health check
```

---

## 📁 Structure des Fichiers

```
docs/module-4/
├── README.md                              # Ce fichier
├── lecon-1-payment-gateway-design.md      # Architecture paiement
├── lecon-2-stripe-integration.md          # Intégration Stripe
├── lecon-3-payment-webhooks.md            # Webhooks
├── lecon-4-auth-strategies.md             # JWT, OAuth2, PKCE
├── lecon-5-user-auth-microservice.md      # Service Auth
├── lecon-6-secure-communication.md        # API Gateway, HTTPS
└── exercices/
    ├── lecon-4.1-solutions.md             # Solutions Payment Gateway
    ├── lecon-4.2-solutions.md             # Solutions Stripe
    ├── lecon-4.3-solutions.md             # Solutions Webhooks
    ├── lecon-4.4-solutions.md             # Solutions Auth Strategies
    ├── lecon-4.5-solutions.md             # Solutions Auth Service
    └── lecon-4.6-solutions.md             # Solutions Secure Comm
```

---

## 📋 Prérequis

Avant de commencer ce module :

- ✅ Avoir complété les **Modules 1-3**
- ✅ Compte **Stripe** (mode test gratuit)
- ✅ **PostgreSQL** configuré avec les tables utilisateurs
- ✅ Compréhension des **middlewares Express**
- ✅ Notions de base en **cryptographie** (hachage, chiffrement)

**Installations requises :**

```bash
npm install stripe @stripe/stripe-js @stripe/react-stripe-js
npm install jsonwebtoken bcrypt
npm install express-rate-limit joi helmet morgan
```

---

## 🔗 Liens avec les Autres Modules

| Module       | Relation                                        |
| ------------ | ----------------------------------------------- |
| **Module 1** | Base - Fondamentaux Express et PostgreSQL       |
| **Module 2** | Base - Architecture microservices DDD           |
| **Module 3** | Base - Principes SOLID et patterns              |
| **Module 5** | Suite - Orchestration et déploiement Kubernetes |
| **Module 6** | Suite - API Gateway avancée avec Kong/Nginx     |

---

## 💡 Conseils d'Apprentissage

1. **Créez un compte Stripe test** dès la leçon 4.1 - Vous en aurez besoin tout le module
2. **Ne codez jamais les clés en dur** - Utilisez toujours les variables d'environnement
3. **Testez avec les cartes de test Stripe** - `4242 4242 4242 4242` pour succès
4. **Comprenez les webhooks** - Critiques pour la fiabilité des paiements
5. **Implémentez l'idempotence** - Évite les doubles débits

---

## ⚠️ Bonnes Pratiques de Sécurité

| Pratique                                 | Importance   |
| ---------------------------------------- | ------------ |
| **Ne jamais logger les clés API**        | 🔴 Critique  |
| **Valider les signatures webhooks**      | 🔴 Critique  |
| **Hasher les mots de passe (bcrypt)**    | 🔴 Critique  |
| **HTTPS en production**                  | 🔴 Critique  |
| **JWT avec expiration courte**           | 🟠 Important |
| **Rate limiting sur tous les endpoints** | 🟠 Important |
| **Validation des entrées (Joi)**         | 🟠 Important |

---

## ✅ Checklist de Validation

Avant de passer au Module 5, vérifiez que vous avez :

- [ ] Lu et compris les 6 leçons
- [ ] Configuré un compte Stripe en mode test
- [ ] Implémenté un flux de paiement complet (PaymentIntent → Webhook)
- [ ] Créé un service d'authentification avec JWT
- [ ] Testé la validation de token dans un autre service
- [ ] Configuré une API Gateway avec rate limiting
- [ ] Compris la différence entre HTTPS et mTLS
- [ ] Complété au moins 4 exercices sur 6

---

## 🔐 Variables d'Environnement Requises

```env
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# JWT
JWT_SECRET=votre_cle_secrete_tres_longue
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/auth_db

# Services
AUTH_SERVICE_URL=http://localhost:3005
PAYMENT_SERVICE_URL=http://localhost:3004
TOUR_CATALOG_SERVICE_URL=http://localhost:3001
BOOKING_SERVICE_URL=http://localhost:3002
```

---

**Bon apprentissage ! 🚀🔒**
