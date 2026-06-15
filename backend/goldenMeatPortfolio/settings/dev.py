import os

from .base import *  # noqa: F403


DEBUG = True
ALLOWED_HOSTS = ['*']

# Allow common local frontend dev origins (Vite) to post to the API in dev mode.
trusted_origins = os.environ.get(
    "DJANGO_CSRF_TRUSTED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173",
)
CSRF_TRUSTED_ORIGINS = [
    origin.strip() for origin in trusted_origins.split(",") if origin.strip()
]
