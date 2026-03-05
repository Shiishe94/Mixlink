# Backend Routes Module
# This module organizes API routes into separate files for better maintainability

from .auth import router as auth_router
from .users import router as users_router
from .dj import router as dj_router
from .events import router as events_router
from .bookings import router as bookings_router
from .messages import router as messages_router
from .payments import router as payments_router
from .reviews import router as reviews_router
from .admin import router as admin_router

__all__ = [
    'auth_router',
    'users_router', 
    'dj_router',
    'events_router',
    'bookings_router',
    'messages_router',
    'payments_router',
    'reviews_router',
    'admin_router'
]
