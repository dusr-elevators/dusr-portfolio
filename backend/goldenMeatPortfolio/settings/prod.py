import os

from .base import *  # noqa: F403


DEBUG = False

if not os.environ.get("DJANGO_SECRET_KEY"):
    raise RuntimeError("DJANGO_SECRET_KEY must be set for production.")

allowed_hosts = os.environ.get("DJANGO_ALLOWED_HOSTS", "")
ALLOWED_HOSTS = [host.strip() for host in allowed_hosts.split(",") if host.strip()]
if not ALLOWED_HOSTS:
    ALLOWED_HOSTS = ["dusr.sa", "www.dusr.sa", "82.223.81.234"]

trusted_origins = os.environ.get(
    "DJANGO_CSRF_TRUSTED_ORIGINS",
    "https://dusr.sa,https://www.dusr.sa,http://82.223.81.234",
)
CSRF_TRUSTED_ORIGINS = [
    origin.strip() for origin in trusted_origins.split(",") if origin.strip()
]

SECURE_SSL_REDIRECT = os.environ.get(
    "DJANGO_SECURE_SSL_REDIRECT",
    "true",
).lower() == "true"

SECURE_HSTS_SECONDS = int(os.environ.get("DJANGO_SECURE_HSTS_SECONDS", "31536000"))
SECURE_HSTS_INCLUDE_SUBDOMAINS = os.environ.get(
    "DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS",
    "true",
).lower() == "true"
SECURE_HSTS_PRELOAD = os.environ.get(
    "DJANGO_SECURE_HSTS_PRELOAD",
    "true",
).lower() == "true"

SECURE_REFERRER_POLICY = os.environ.get(
    "DJANGO_SECURE_REFERRER_POLICY",
    "same-origin",
)
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = os.environ.get("DJANGO_X_FRAME_OPTIONS", "DENY")

SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True

if os.environ.get("DJANGO_SECURE_PROXY_SSL_HEADER", "true").lower() == "true":
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"
