# MixLink - PRD

## Statut : P0 + Fonctionnalités Premium Complétés (Mars 2026)

## Problème Original
Application web/mobile de mise en relation entre DJs et organisateurs d'événements.
Nom : MixLink. Thème : Neon sur fond sombre.

## Rôles Utilisateurs
- **DJ** : Profil, disponibilités, portfolio, réservations, portefeuille, **mise en avant Vedette**
- **Organisateur** : Créer événements, rechercher DJs, réserver, payer
- **Admin** : Panel complet de gestion (utilisateurs, avis, retraits, stats)

---

## Architecture Backend
```
/app/backend/
├── server.py              # API principale (~2600 lignes)
├── services/
│   ├── paypal_service.py  # PayPal Payouts
│   ├── email_service.py   # Email (Brevo) - VÉRIFICATION + PASSWORD RESET + WELCOME
│   └── push_service.py    # Push Notifications (Expo, scaffolded)
├── routes/                # Structure pour refactoring futur
├── models/                # Modèles Pydantic
└── tests/
    └── test_stripe_email_featured.py  # Tests Stripe + email + vedette
```

## Architecture Frontend
```
/app/frontend/app/
├── (auth)/
│   ├── login.tsx
│   ├── register.tsx
│   ├── forgot-password.tsx
│   └── reset-password.tsx
├── (tabs)/
│   ├── index.tsx
│   ├── search.tsx
│   ├── bookings.tsx
│   ├── messages.tsx
│   └── profile.tsx            # UPDATED: price (pas hourly_rate)
├── admin/
│   ├── index.tsx              # Dashboard admin
│   ├── users.tsx
│   ├── reviews.tsx
│   └── withdrawals.tsx
├── dj/
│   ├── [id].tsx               # UPDATED: price display
│   ├── wallet.tsx             # UPDATED: Section DJ Vedette
│   ├── withdrawal.tsx
│   └── withdrawal-history.tsx # (BLOQUÉ WebSocket)
├── booking/[id].tsx
├── event/
│   ├── [id].tsx
│   └── create.tsx
├── messages/[partnerId].tsx
├── verify-email.tsx           # NOUVEAU: Page de vérification email
└── payment/
    ├── checkout.tsx
    ├── success.tsx
    ├── cancel.tsx
    └── feature-success.tsx    # NOUVEAU: Page succès paiement vedette
```

---

## Modèle de données clés

### djs collection
```json
{
  "price": 500.0,          // Migré de hourly_rate (Mars 2026)
  "is_featured": false,    // NOUVEAU: DJ Vedette
  "featured_until": null,  // NOUVEAU: Expiration mise en avant
  "is_verified": false
}
```

### users collection
```json
{
  "is_email_verified": false,  // NOUVEAU: vérification email
  "email_verify_token": "...", // NOUVEAU: token de vérification (supprimé après vérif)
  "user_type": "dj|organizer|admin"
}
```

---

## API Endpoints principaux

| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/register` | Inscription + envoi email de vérification (Brevo) |
| `GET /api/auth/verify-email/{token}` | Vérifier l'email avec le token |
| `POST /api/auth/login` | Connexion (tous rôles) |
| `POST /api/auth/forgot-password` | Mot de passe oublié |
| `POST /api/auth/reset-password/{token}` | Réinitialiser mot de passe |
| `GET /api/dj/profiles` | Lister DJs - **Vedettes en premier** |
| `POST /api/dj/profile` | Créer profil DJ (champ: price) |
| `PUT /api/dj/profile` | Modifier profil DJ |
| `POST /api/dj/feature/checkout` | Créer checkout Stripe 49€ pour mise en avant |
| `GET /api/dj/feature/status/{session_id}` | Activer statut Vedette après paiement |
| `POST /api/payments/stripe/checkout` | Checkout réservation |
| `GET /api/payments/stripe/status/{session_id}` | Status paiement réservation |
| `GET /api/admin/stats` | Stats admin (JWT user_type=admin) |
| `GET /api/admin/v2/users` | Gestion utilisateurs |
| `GET /api/admin/v2/reviews` | Modération avis |
| `GET /api/admin/v2/withdrawals` | Gestion retraits |

---

## Intégrations
- **Stripe** : Paiements réservations + **mise en avant DJ Vedette (49€/30 jours)** ✅
- **PayPal** : Retraits DJs ✅
- **Brevo** : Emails transactionnels (vérification email, reset mdp, confirmations) ✅
- **JWT** : Authentification ✅

---

## Credentials de Test
- **Admin MixLink** : `admin@mixlink.com` / `admin123456`
- **Admin Legacy** : `admin@djbooking.com` / `admin123456`
- **DJ Test** : `testprice@test.com` / `test123456` (DJ vedette actif pour démo)
- **Organisateur Test** : `org_stripe_test@test.com` / `test123456`

---

## Fonctionnalités Implémentées

### ✅ Authentification
- Login/Register avec JWT
- **Email de vérification** à l'inscription via Brevo (Mars 2026)
- Mot de passe oublié + réinitialisation (email Brevo)
- Redirection basée sur le rôle

### ✅ Profils DJ
- **Prix par prestation** (champ `price`) — migré Mars 2026
- Portfolio, réseaux sociaux, styles musicaux
- Notation et avis

### ✅ DJ Vedette (Nouveau - Mars 2026)
- Les DJs paient **49€ via Stripe** pour 30 jours de mise en avant
- **Badge doré VEDETTE** visible sur DJCard et profil
- **Tri automatique** : DJs vedettes en tête des résultats de recherche
- Page de succès après paiement (`/payment/feature-success`)

### ✅ Stripe Flux Complet
- Clé Stripe corrigée (clé corrompue remplacée par sk_test_emergent)
- Checkout réservation : crée URL Stripe, redirige, active paiement
- Checkout vedette : 49€ fixe, active `is_featured` en BDD

### ✅ Recherche et Découverte
- Recherche DJs par ville, style, budget
- **DJs vedettes prioritaires** dans les résultats
- Algorithme de matching DJ/événement

### ✅ Réservations et Paiements
- Flux complet : proposition → acceptation → paiement Stripe → commission 15%

### ✅ Portefeuille DJ
- Solde disponible / en attente
- Retraits (IBAN / PayPal)
- **Section Mise en avant** dans le portefeuille

### ✅ Panel Admin Complet
- Dashboard stats, gestion utilisateurs, avis, retraits
- Login via `admin@mixlink.com`

### ✅ Messagerie
- Chat entre DJs et organisateurs

### ✅ Branding MixLink

---

## MOCKED / Non Fonctionnel
- **WebSocket** : Chat temps réel — 502 Kubernetes ingress (bloqué infra)
- **Push Notifications** : Service prêt, non intégré
- **`is_email_verified`** : Champ présent mais connexion non bloquée si non vérifié (optionnel)

---

## Backlog P1/P2

### P1
- Bloquer connexion si email non vérifié (actuellement non bloquant)
- Intégrer WebSocket quand l'infra le permet
- Tester flux Stripe bout en bout en production (avec vrai paiement)

### P2
- Refactoring `server.py` → modules séparés (`routes/`)
- Intégrer notifications push Expo dans les flows
- Renouvellement automatique de la Vedette (subscription mensuelle)
- Admin: gérer les DJs vedettes depuis le panel

### Future
- Système de disponibilités calendrier
- Vérification identité DJ
- Système de favoris
- Recommandations IA basées sur historique
