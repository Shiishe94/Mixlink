# MixLink - PRD

## Statut : P0 Complété (Mars 2026)

## Problème Original
Application web/mobile de mise en relation entre DJs et organisateurs d'événements.
Nom : MixLink. Thème : Neon sur fond sombre.

## Rôles Utilisateurs
- **DJ** : Profil, disponibilités, portfolio, réservations, portefeuille
- **Organisateur** : Créer événements, rechercher DJs, réserver, payer
- **Admin** : Panel complet de gestion (utilisateurs, avis, retraits, stats)

---

## Architecture Backend
```
/app/backend/
├── server.py              # API principale (~2500 lignes)
├── services/
│   ├── paypal_service.py  # PayPal Payouts
│   ├── email_service.py   # Email (Brevo)
│   └── push_service.py    # Push Notifications (Expo, scaffolded)
├── routes/                # Structure pour refactoring futur
├── models/                # Modèles Pydantic
└── tests/
    └── test_price_admin_migration.py  # Tests migration pricing
```

## Architecture Frontend
```
/app/frontend/app/
├── (auth)/
│   ├── login.tsx
│   ├── register.tsx
│   ├── forgot-password.tsx    # Nouveau
│   └── reset-password.tsx     # Nouveau
├── (tabs)/
│   ├── index.tsx              # Accueil
│   ├── search.tsx             # Recherche DJs/Events
│   ├── bookings.tsx           # Réservations
│   ├── messages.tsx           # Messagerie
│   └── profile.tsx            # Profil (UPDATED: price)
├── admin/
│   ├── index.tsx              # Dashboard admin
│   ├── users.tsx              # Gestion utilisateurs
│   ├── reviews.tsx            # Modération avis
│   └── withdrawals.tsx        # Gestion retraits
├── dj/
│   ├── [id].tsx               # Profil DJ public (UPDATED: price)
│   ├── wallet.tsx             # Portefeuille DJ
│   ├── withdrawal.tsx         # Demande retrait
│   └── withdrawal-history.tsx # Historique temps réel (BLOQUÉ WebSocket)
├── booking/[id].tsx           # Détail réservation
├── event/
│   ├── [id].tsx               # Détail événement
│   └── create.tsx             # Créer événement
├── messages/[partnerId].tsx   # Chat
└── payment/
    ├── checkout.tsx
    ├── success.tsx
    └── cancel.tsx
```

---

## Modèle de données clés

### djs collection
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "artist_name": "string",
  "price": 500.0,          // MIGRÉ de hourly_rate (Mars 2026)
  "city": "string",
  "music_styles": [],
  "event_types": [],
  "rating": 4.5,
  "booking_count": 12
}
```

### bookings collection
```json
{
  "id": "uuid",
  "dj_id": "uuid",
  "organizer_id": "uuid",
  "event_id": "uuid",
  "proposed_rate": 500.0,
  "total_amount": 500.0,
  "status": "pending|accepted|rejected|paid|completed|cancelled"
}
```

### users collection
```json
{
  "id": "uuid",
  "email": "string",
  "user_type": "dj|organizer|admin",
  "available_balance": 0.0,
  "pending_balance": 0.0,
  "payout_details": {"iban": "...", "paypal_email": "..."}
}
```

---

## API Endpoints principaux

| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/login` | Connexion (tous rôles dont admin) |
| `POST /api/auth/register` | Inscription |
| `POST /api/auth/forgot-password` | Mot de passe oublié |
| `POST /api/auth/reset-password/{token}` | Réinitialiser mot de passe |
| `GET /api/dj/profiles` | Lister DJs (filtre par price, ville, style) |
| `POST /api/dj/profile` | Créer profil DJ (champ: price) |
| `PUT /api/dj/profile` | Modifier profil DJ (champ: price) |
| `POST /api/bookings` | Créer réservation |
| `GET /api/admin/stats` | Stats admin (auth JWT user_type=admin) |
| `GET /api/admin/v2/users` | Gestion utilisateurs |
| `GET /api/admin/v2/reviews` | Modération avis |
| `GET /api/admin/v2/withdrawals` | Gestion retraits |
| `GET /api/admin/v2/dj-profiles` | Gestion profils DJ |
| `GET /api/admin/bookings` | Liste réservations |

---

## Intégrations
- **Stripe** : Paiements réservations
- **PayPal** : Retraits DJs
- **Brevo** : Emails transactionnels (reset mdp, confirmations)
- **JWT** : Authentification

---

## Credentials de Test
- **Admin MixLink** : `admin@mixlink.com` / `admin123456` (NOUVEAU)
- **Admin Legacy** : `admin@djbooking.com` / `admin123456` (toujours actif)

---

## Fonctionnalités Implémentées

### ✅ Authentification
- Login/Register avec JWT
- Mot de passe oublié + réinitialisation (email Brevo)
- Redirection basée sur le rôle

### ✅ Profils DJ
- Création et modification de profil
- **Prix par prestation** (champ `price`, remplaçant `hourly_rate`) — migré en production Mars 2026
- Portfolio, réseaux sociaux, styles musicaux
- Notation et avis

### ✅ Recherche et Découverte
- Recherche DJs par ville, style, budget (utilise `price`)
- Recherche événements ouverts
- Algorithme de matching DJ/événement

### ✅ Réservations et Paiements
- Flux complet : proposition → acceptation → paiement Stripe → commission 15%
- Statuts : pending, accepted, rejected, paid, completed, cancelled

### ✅ Portefeuille DJ
- Solde disponible / en attente
- Demandes de retrait (IBAN / PayPal)

### ✅ Panel Admin Complet
- Dashboard statistiques
- Gestion utilisateurs (ban/unban/supprimer)
- Modération avis
- Gestion retraits
- Route : `/admin` (login via admin@mixlink.com)

### ✅ Messagerie
- Chat entre DJs et organisateurs
- WebSocket implémenté (bloqué infra preview)

### ✅ Branding MixLink
- Application renommée de "DJ Booking" à "MixLink"

---

## MOCKED / Non Fonctionnel
- **WebSocket** : Chat et historique retraits temps réel — 502 via Kubernetes ingress (bloqué infra)
- **Push Notifications** : Service prêt, non intégré aux flows utilisateur

---

## Backlog P1/P2

### P1
- Intégrer WebSocket quand l'infra le permet
- Tester le flux Stripe de bout en bout

### P2
- Refactoring `server.py` → modules séparés (`routes/`)
- Supprimer anciennes routes admin v1 (fait pour login, reste à valider)
- Intégrer notifications push Expo dans les flows (nouvelle réservation, nouveau message, retrait)
- Tests automatisés end-to-end

### Future
- Système de disponibilités calendrier
- Vérification identité DJ
- Système de favoris
- Recommandations IA basées sur historique
