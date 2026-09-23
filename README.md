# Silk Route Manual Booking

A dashboard for managing airport lounge reservations, payments, and bookings — React frontend, Node.js/Express backend, MySQL database.

## Structure

```
silkroute-project/
├── frontend/          React app (Create React App)
│   ├── public/index.html
│   └── src/
│       ├── components/
│       │   ├── Dashboard.jsx   main dashboard screen
│       │   ├── Sidebar.jsx     left navigation
│       │   └── Header.jsx      top bar
│       ├── api/dashboardApi.js fetch helper for the backend
│       ├── styles/Dashboard.css
│       ├── App.jsx
│       └── index.js
├── backend/           Express API
│   ├── config/db.js         MySQL connection pool
│   ├── routes/dashboard.js  GET /api/dashboard
│   ├── server.js
│   └── .env.example
└── database/
    └── schema.sql      tables + seed data matching the dashboard mockup
```

## Getting it running

### 1. Database
```bash
mysql -u root -p < database/schema.sql
```
This creates the `silkroute` database with `reservations`, `activity_log`, and `users` tables, plus five seed reservations so the dashboard has data to show immediately.

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env   # then fill in your MySQL credentials
npm run dev            # or: npm start
```
The API runs on `http://localhost:4000`. `GET /api/dashboard` returns the stat cards, status counts, recent reservations, and recent activity in one payload.

### 3. Frontend
```bash
cd frontend
npm install
npm start
```
Runs on `http://localhost:3000` and calls the backend at `http://localhost:4000/api` (override with `REACT_APP_API_BASE` in a `.env` file if needed).

The dashboard renders sample data immediately even if the API isn't reachable yet, so you can preview the UI before wiring up the database.

## What's built so far

- **Dashboard screen** — stat cards (arrivals, departures, pending payments, confirmed reservations), quick action buttons, reservation status tiles, a recent-reservations table, and a recent-activity feed — matching the layout you shared.
- **One API endpoint** (`/api/dashboard`) that aggregates everything the screen needs from MySQL.
- **Schema** for reservations, activity log, and users, seeded with the same five bookings shown in the mockup.

## Suggested next steps

- Add routes/pages for New Reservation, View Reservations, Refund Reservations, Sales, Reports, etc. — the sidebar links are wired up to call `onNavigate`, so a router (React Router) can be dropped in to switch screens.
- Add authentication (login page + JWT or session) before exposing this beyond local development.
- Add pagination/filtering to `/api/dashboard`'s recent reservations once the table grows past a handful of rows.
