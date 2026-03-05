# DJ Booking Platform - PRD

## Original Problem Statement
Application mobile et web pour la réservation de DJs pour événements.

### User Roles
- **DJs**: Créent leur profil, gèrent leurs disponibilités, reçoivent des paiements
- **Organisateurs**: Recherchent des DJs, créent des événements, effectuent des réservations
- **Admin**: Gère les commissions et les transactions

### Core Features
1. **Profils DJ**: Style musical, expérience, vidéos, réseaux sociaux (TikTok inclus)
2. **Découverte**: Recherche et filtrage de DJs et événements
3. **Réservation**: Flow complet de réservation avec page de checkout dédiée
4. **Paiements**:
   - Stripe pour les paiements organisateurs
   - Commission 15% (7.5% DJ + 7.5% organisateur)
   - Fonds en attente 24h après confirmation prestation
   - Retrait minimum 50€ vers IBAN ou PayPal
5. **Messagerie**: Communication DJ/Organisateurs
6. **UI/UX**: Thème Neon avec fond sombre et animations électriques

## Tech Stack
- **Frontend**: React Native (Expo), TypeScript, Expo Router, react-native-reanimated
- **Backend**: FastAPI, Python
- **Database**: MongoDB
- **Payments**: Stripe, PayPal Payouts
- **Real-time**: WebSockets

## Implemented Features

### ✅ Système de Réinitialisation de Mot de Passe (Mars 2025)
- **Backend Endpoints**:
  - `POST /api/auth/forgot-password` - Génère un token de reset (expire 1h)
  - `POST /api/auth/reset-password/{token}` - Réinitialise le mot de passe
- **Frontend Pages**:
  - `/forgot-password` - Formulaire de demande de reset
  - `/reset-password` - Formulaire de nouveau mot de passe
- **Sécurité**:
  - Token sécurisé avec expiration 1 heure
  - Prévention réutilisation de token
  - Message générique (anti-enumération email)
  - Validation mot de passe minimum 6 caractères
  - Indicateur de force du mot de passe
- **MOCKED**: Envoi d'email (token retourné dans la réponse API pour tests)

### ✅ Page de Retrait Sécurisée avec PayPal
- Choix méthode: Virement IBAN ou PayPal
- Validation IBAN ISO 7064 Mod 97-10
- Validation email PayPal
- Minimum 50€ enforced
- Confirmation popup avant envoi
- Messages adaptés selon méthode
- Design fintech moderne avec thème néon

### ✅ Intégration PayPal Payouts
- Service PayPal `/app/backend/services/paypal_service.py`
- Authentification OAuth 2.0
- Création de payouts instantanés
- Mode sandbox configuré
- Clés API stockées en variables d'environnement

### ✅ Animations Néon Électriques
- Composant `NeonBackground` avec effets dynamiques
- Lignes néon animées (react-native-reanimated)
- Orbes lumineux pulsants (cyan, magenta, vert)
- Effets électriques flash
- Compatible mobile et web
- Présent sur: login, register, withdrawal, forgot-password, reset-password

### ✅ Système d'Avis et Notes
- API POST /api/reviews - Créer un avis (1-5 étoiles)
- API GET /api/reviews/dj/{dj_id} - Récupérer les avis
- API GET /api/reviews/pending - Avis en attente
- Commentaire optionnel
- Note moyenne calculée automatiquement
- Sécurité: réservation complétée requise

### ✅ WebSocket Real-time
- Endpoint /ws/{user_id}
- Mises à jour de statut de retrait
- Ping/pong health check
- Broadcast par utilisateur

### Fonctionnalités Existantes
- Authentification JWT
- Profils DJ avec réseaux sociaux (TikTok)
- Système de réservation complet
- Paiement Stripe intégré (clés LIVE)
- Page wallet DJ avec solde disponible/en attente
- Design responsive web/mobile
- Navbar web pour desktop

## API Endpoints Clés
- `POST /api/auth/forgot-password` - Demande reset mot de passe
- `POST /api/auth/reset-password/{token}` - Réinitialiser mot de passe
- `POST /api/dj/withdrawal` - Demande de retrait (IBAN ou PayPal)
- `GET /api/dj/wallet` - Solde et gains
- `GET /api/dj/withdrawals` - Historique retraits
- `POST /api/reviews` - Créer un avis
- `GET /api/reviews/dj/{dj_id}` - Avis d'un DJ
- `WS /ws/{user_id}` - Connexion WebSocket

## Files Reference
- `/app/frontend/app/(auth)/login.tsx` - Page de connexion avec lien "Mot de passe oublié"
- `/app/frontend/app/(auth)/forgot-password.tsx` - Page demande reset
- `/app/frontend/app/(auth)/reset-password.tsx` - Page nouveau mot de passe
- `/app/frontend/app/dj/withdrawal.tsx` - Page de retrait
- `/app/frontend/app/dj/wallet.tsx` - Page portefeuille
- `/app/frontend/src/components/NeonBackground.tsx` - Animations néon
- `/app/backend/server.py` - API backend (endpoints auth, reset password, etc.)
- `/app/backend/services/paypal_service.py` - Service PayPal
- `/app/frontend/src/services/api.ts` - Client API

## Test Results (Iteration 3)
- **Backend**: 100% (11/11 tests passed)
- **Frontend**: 100% fonctionnel
- **Test file**: `/app/backend/tests/test_password_reset.py`

## Test Credentials
- Email: reset-test@djbooking.com
- Password: newpassword123
- Type: DJ (ou organizer pour tests)

## Configuration
### PayPal (Sandbox)
- Client ID: Configuré dans backend/.env
- Secret: Configuré dans backend/.env
- Mode: sandbox

### Stripe (Live)
- API Key: Configuré dans backend/.env
- Publishable Key: Configuré dans backend/.env

## Backlog / Future Tasks

### P1 - En attente (Frontend à implémenter)
- **Frontend Système d'Avis DJ**: Créer le formulaire de notation et affichage des avis sur profil DJ
- **Frontend Historique Retraits Temps Réel**: Connecter WebSocket pour mises à jour live des statuts

### P2 - Futures tâches
- Messagerie temps réel (WebSocket chat)
- Notifications push
- Panel admin pour gestion commissions
- Envoi réel d'email pour password reset (supprimer le mock)

### Refactoring suggéré
- Décomposer `server.py` en modules séparés (auth.py, payments.py, reviews.py)
- Ajouter encodeur JSON global pour ObjectId MongoDB
