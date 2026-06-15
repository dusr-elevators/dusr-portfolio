# Dusr Elevator Systems Portfolio

Premium high-precision elevator engineering redefined with beautiful custom architectural designs and mechanical mastery.

## Run Locally

**Prerequisites:** Node.js, Python 3.10+, Docker optional

### Frontend

1. Install dependencies:
   `cd frontend`
   `npm install`
2. Run the app:
   `npm run dev`

The Vite dev server proxies `/api/*` requests to Django on `http://localhost:8000`.

### Backend

1. Install dependencies:
   `cd backend`
   `pip install -r requirements.txt`
2. Run migrations:
   `python manage.py migrate`
3. Run the API/admin:
   `python manage.py runserver 0.0.0.0:8000`

### Docker

Run the development stack:
`docker-compose up --build`

Run the production stack after setting `DJANGO_SECRET_KEY`:
`docker-compose -f docker-compose.prod.yml up --build`
