# MixLink - PRD

## Statut : Phase P1-P2 Complétée (Mars 2025)

## Résumé des Implémentations

### ✅ P1 - Historique Retraits Temps Réel
- Page `/dj/withdrawal-history` avec WebSocket
- Statistiques (total, complétés, en cours)
- Badges de statut colorés
- Bouton "Temps réel" sur page wallet

### ✅ P1 - Messagerie Temps Réel
- WebSocket intégré dans le chat
- Indicateur de statut en ligne
- Broadcast automatique des messages

### ✅ P2 - Panel Admin Complet
- Dashboard avec statistiques globales (`/admin/stats`)
- Gestion utilisateurs (`/admin/v2/users`)
- Modération avis (`/admin/v2/reviews`)
- Gestion retraits (`/admin/v2/withdrawals`)
- Gestion profils DJ (`/admin/v2/dj-profiles`)
- Actions: ban/unban, approver/rejeter, supprimer

### ✅ P2 - Services Backend
- Email Service (Mock) - Templates pour: password reset, booking confirmation, withdrawal notification
- Push Notification Service (Expo) - Templates pour: new booking, message, withdrawal status, review

### ✅ Structure Refactoring
- `/backend/routes/` - Structure modulaire préparée
- `/backend/models/` - Modèles Pydantic centralisés
- `/backend/services/email_service.py` - Service email
- `/backend/services/push_service.py` - Notifications push

## API Endpoints Admin (v2)
| Endpoint | Description |
|----------|-------------|
| `GET /api/admin/stats` | Statistiques globales |
| `GET /api/admin/v2/users` | Liste utilisateurs |
| `PUT /api/admin/v2/users/{id}/status` | Ban/Unban |
| `DELETE /api/admin/v2/users/{id}` | Supprimer user |
| `GET /api/admin/v2/reviews` | Liste avis |
| `PUT /api/admin/v2/reviews/{id}` | Modérer avis |
| `DELETE /api/admin/v2/reviews/{id}` | Supprimer avis |
| `GET /api/admin/v2/withdrawals` | Liste retraits |
| `PUT /api/admin/v2/withdrawals/{id}` | Approuver/Rejeter |
| `GET /api/admin/v2/dj-profiles` | Liste profils DJ |

## Credentials Test
- Admin: admin@djbooking.com / admin123456
- DJ Test: reset-test@djbooking.com / newpassword123

## Architecture Backend
```
/app/backend/
├── server.py              # API principale (~2700 lignes)
├── services/
│   ├── paypal_service.py  # PayPal Payouts
│   ├── email_service.py   # Email (Mock)
│   └── push_service.py    # Push Notifications (Expo)
├── routes/                # Structure pour refactoring
└── models/                # Modèles Pydantic
```

## Architecture Frontend
```
/app/frontend/app/
├── admin/
│   ├── index.tsx          # Dashboard admin
│   ├── users.tsx          # Gestion utilisateurs
│   ├── reviews.tsx        # Modération avis
│   └── withdrawals.tsx    # Gestion retraits
├── dj/
│   ├── wallet.tsx         # Portefeuille
│   └── withdrawal-history.tsx  # Historique temps réel
└── messages/
    └── [partnerId].tsx    # Chat temps réel
```

## MOCKED / Non Fonctionnel
- **Email**: Templates créés mais pas d'envoi réel (mock logging)
- **Push Notifications**: Service prêt, nécessite tokens Expo des devices
- **WebSocket externe**: 502 via Kubernetes ingress (fonctionne en interne)

## Backlog Futur
1. Configurer ingress Kubernetes pour WebSocket
2. Intégrer SendGrid/Mailgun pour vrais emails
3. Configurer Expo Push pour notifications réelles
4. Migrer code de server.py vers modules routes/
