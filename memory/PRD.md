# DJ Booking Platform - PRD

## Original Problem Statement
Application mobile et web pour la réservation de DJs pour événements avec système de paiement complet.

### User Roles
- **DJs**: Profil, disponibilités, retraits de fonds
- **Organisateurs**: Recherche DJs, événements, réservations
- **Admin**: Gestion commissions et transactions

### Core Features
1. **Profils DJ**: Style musical, expérience, vidéos, TikTok
2. **Découverte**: Recherche et filtrage DJs/événements
3. **Réservation**: Flow complet avec checkout
4. **Paiements**: Stripe, commission 15%, retraits IBAN/PayPal (min 50€)
5. **Avis et Notes**: Système d'évaluation 1-5 étoiles
6. **Messagerie**: Chat temps réel DJ ↔ Organisateur
7. **UI/UX**: Thème Neon avec animations électriques

## Tech Stack
- **Frontend**: React Native (Expo), TypeScript, Expo Router
- **Backend**: FastAPI, Python, WebSockets
- **Database**: MongoDB
- **Payments**: Stripe, PayPal Payouts

---

## Implemented Features (Mars 2025)

### ✅ Système de Réinitialisation de Mot de Passe
- Endpoints: `/api/auth/forgot-password`, `/api/auth/reset-password/{token}`
- Pages frontend: `/forgot-password`, `/reset-password`
- Lien "Mot de passe oublié ?" sur login
- Token sécurisé (1h expiration), anti-enumération
- **MOCKED**: Envoi d'email simulé

### ✅ Historique des Retraits en Temps Réel (P1)
- Page `/dj/withdrawal-history` avec WebSocket
- Indicateur de connexion WebSocket (vert/rouge)
- Statistiques: total, complétés, en cours
- Badges de statut colorés (en attente, en cours, effectué, rejeté)
- Bouton "Temps réel" sur la page wallet

### ✅ Messagerie Temps Réel (P2)
- WebSocket intégré dans `/messages/[partnerId]`
- Indicateur de statut en ligne
- Messages instantanés via WebSocket
- Fallback polling (10 secondes)

### ✅ Refactoring Backend (Structure)
- Dossier `/app/backend/routes/` créé
- Dossier `/app/backend/models/` créé
- Fichiers placeholder pour migration future
- Logique principale encore dans `server.py`

### ✅ Fonctionnalités Existantes
- Authentification JWT
- Profils DJ complets
- Système de réservation
- Paiement Stripe
- Retraits IBAN et PayPal
- Système d'avis (backend + frontend)
- Animations néon électriques

---

## API Endpoints Clés
| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/forgot-password` | Demande reset mot de passe |
| `POST /api/auth/reset-password/{token}` | Réinitialiser mot de passe |
| `POST /api/dj/withdrawal` | Demande de retrait |
| `GET /api/dj/withdrawals` | Historique des retraits |
| `POST /api/messages` | Envoyer un message (+ broadcast WS) |
| `POST /api/reviews` | Créer un avis |
| `WS /ws/{user_id}` | Connexion WebSocket temps réel |

---

## Files Reference
| Fichier | Description |
|---------|-------------|
| `/app/frontend/app/dj/withdrawal-history.tsx` | Historique retraits temps réel |
| `/app/frontend/app/dj/wallet.tsx` | Portefeuille DJ |
| `/app/frontend/app/messages/[partnerId].tsx` | Chat temps réel |
| `/app/frontend/app/(auth)/forgot-password.tsx` | Page mot de passe oublié |
| `/app/frontend/app/(auth)/reset-password.tsx` | Page reset mot de passe |
| `/app/backend/server.py` | API backend principale |
| `/app/backend/routes/` | Structure pour refactoring |
| `/app/backend/models/` | Modèles Pydantic centralisés |

---

## Test Results (Iteration 4)
- **Backend**: 100% (13/13 tests passed)
- **Frontend**: Pages fonctionnelles
- **WebSocket**: Fonctionne en interne (localhost:8001)
- **Note**: WSS externe retourne 502 (problème infrastructure Kubernetes)

## Test Credentials
- Email: reset-test@djbooking.com
- Password: newpassword123
- Type: DJ

---

## Known Issues
| Issue | Statut | Note |
|-------|--------|------|
| WebSocket externe (WSS) | INFRASTRUCTURE | 502 via ingress, OK en interne |
| Email password reset | MOCKED | Token retourné dans la réponse API |

---

## Backlog / Future Tasks

### P0 - Critique
- Aucun

### P1 - Important
- ✅ ~~Historique retraits temps réel~~
- ✅ ~~Messagerie temps réel~~

### P2 - À venir
- Migration du code `server.py` vers les modules `routes/`
- Configuration ingress pour WebSocket externe

### Futur
- Envoi réel d'emails (SendGrid/Mailgun)
- Notifications push
- Panel admin complet

---

## Code Architecture
```
/app
├── backend/
│   ├── server.py              # API principale
│   ├── routes/                # Structure pour refactoring
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── messages.py
│   │   └── ...
│   ├── models/               # Modèles Pydantic
│   │   └── __init__.py
│   ├── services/
│   │   └── paypal_service.py
│   └── .env
└── frontend/
    ├── app/
    │   ├── (auth)/           # Pages authentification
    │   ├── (tabs)/           # Navigation principale
    │   ├── dj/               # Pages DJ
    │   ├── messages/         # Chat temps réel
    │   └── booking/          # Réservations
    └── src/
        ├── components/       # Composants réutilisables
        └── services/         # API client
```
