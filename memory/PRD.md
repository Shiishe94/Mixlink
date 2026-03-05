# DJ Booking Platform - PRD

## Original Problem Statement
Application mobile et web pour la réservation de DJs pour événements.

### User Roles
- **DJs**: Créent leur profil, gèrent leurs disponibilités, reçoivent des paiements
- **Organisateurs**: Recherchent des DJs, créent des événements, effectuent des réservations
- **Admin**: Gère les commissions et les transactions

### Core Features
1. **Profils DJ**: Style musical, expérience, vidéos, réseaux sociaux (inclus TikTok)
2. **Découverte**: Recherche et filtrage de DJs et événements
3. **Réservation**: Flow complet de réservation avec page de checkout dédiée
4. **Paiements**:
   - Stripe pour les paiements organisateurs
   - Commission 15% (7.5% DJ + 7.5% organisateur)
   - Fonds en attente 24h après confirmation prestation
   - Retrait minimum 50€ vers IBAN
5. **Messagerie**: Communication DJ/Organisateurs
6. **UI/UX**: Thème Neon avec fond sombre

## Tech Stack
- **Frontend**: React Native (Expo), TypeScript, Expo Router
- **Backend**: FastAPI, Python
- **Database**: MongoDB
- **Payments**: Stripe (clés LIVE configurées)

## Implemented Features (March 2025)

### Page de Retrait Sécurisée (/dj/withdrawal) - COMPLÉTÉ
- Titre "Retrait de fonds"
- Champ IBAN avec validation ISO 7064 Mod 97-10
- Champ montant avec minimum 50€
- Encadré d'avertissement de sécurité visible
- Confirmation popup avant envoi
- Message de succès après validation
- Design fintech moderne

### Fonctionnalités Existantes
- Authentification JWT
- Profils DJ avec réseaux sociaux
- Système de réservation complet
- Paiement Stripe intégré
- Page wallet DJ avec solde disponible/en attente
- Design responsive web/mobile
- Navbar web pour desktop

## API Endpoints Clés
- `POST /api/dj/withdrawal` - Demande de retrait
- `GET /api/dj/wallet` - Solde et gains
- `GET /api/dj/withdrawals` - Historique retraits
- `PUT /api/bookings/{id}/complete` - Confirmer prestation

## Files Reference
- `/app/frontend/app/dj/withdrawal.tsx` - Page de retrait
- `/app/frontend/app/dj/wallet.tsx` - Page portefeuille
- `/app/backend/server.py` - API backend
- `/app/frontend/src/services/api.ts` - Client API

## Upcoming Tasks
1. **PayPal Payouts** - Permettre retraits via PayPal
2. **Animations Neon** - Lignes néon animées en fond
3. **Messagerie temps réel** - WebSockets

## Test Credentials
- Email: dj-test@example.com
- Password: test123456
- Type: DJ
