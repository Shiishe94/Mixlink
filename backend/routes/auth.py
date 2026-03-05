# Authentication Routes
# This module will contain all auth-related endpoints
# For now, the logic remains in server.py for stability
# This file serves as a placeholder for future refactoring

from fastapi import APIRouter

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Note: Current auth endpoints are in server.py
# They will be migrated here in a future refactoring phase
