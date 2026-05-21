# TheMealDB Explorer

A full-stack local app that explores meals from TheMealDB through a REST API and a responsive React UI.

## Features
- REST backend for TheMealDB data
- In-memory caching with expiry and max size
- Search meals by name
- Browse meals by category
- Random meal picker
- Meal details with ingredients, instructions, and YouTube embed
- Responsive UI

## Local Setup

### 1) Backend
```bash
cd backend
npm install
npm start
```

Backend runs on `http://localhost:5000`.

### 2) Frontend
Open a new terminal:
```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

## API Endpoints
- `GET /api/categories`
- `GET /api/categories/:name`
- `GET /api/meals/search?q=...`
- `GET /api/meals/random`
- `GET /api/meals/:id`


