# CivicTrack Nagpur: Verified Civic Resolution & Ward Performance Analytics

> **One-Line Pitch:** Existing tools collect complaints. CivicTrack verifies that fixes actually happened through citizen confirmation and transparently ranks wards on performance.

---

## 1. Overview & Academic Context

**CivicTrack Nagpur** is an academic mini-project designed to cover four interconnected engineering modules:

1. **Module 1: Business Intelligence & Power BI Dashboards** — Analytical MySQL views (`v_ward_metrics`, `v_hotspots`, `v_category_trend`, etc.) connected to Power BI Desktop to rank municipal wards and visualize civic hotspots.
2. **Module 2: React Front-End Application** — Vite React 18 single-page application featuring distinct Citizen and Officer portals, interactive OpenStreetMap GIS pinning, status badge color coordination, and full audit timelines.
3. **Module 3: Express & MySQL 8 Back-End** — REST API enforcing role-based authentication, a strict status state machine, duplicate complaint merging via the Haversine formula, SLA overdue tracking, and automated background closing jobs via `node-cron`.
4. **Module 4: Git & Docker Deployment** — Containerized multi-service deployment (`docker-compose.yml`) coordinating MySQL 8, Node.js API, and Nginx-served React front-end with healthchecks and seed automation.

---

## 2. Core Differentiators & Business Rules

1. **Citizen-Confirmed Resolution**:
   - Ward officers cannot unilaterally close complaints. An officer marks an issue *Resolved*, transitioning it to `Pending Confirmation`.
   - Only the citizen who originally reported the problem can **Confirm** (transitions to `Closed`) or **Reject** with a mandatory explanation (transitions to `Reopened`, incrementing `reopen_count`).
   - If a citizen does not respond within 7 days, an automated cron job auto-closes the complaint with `closed_unverified = TRUE`.
2. **Geospatial Nagpur Boundary Enforcement**:
   - Pinned coordinates are strictly validated against Nagpur's bounding box: `[[20.95, 78.90], [21.30, 79.30]]`. Coordinates outside this perimeter are rejected with HTTP 400.
3. **Automated Haversine Duplicate Merging & Priority Scoring**:
   - When a citizen files a complaint within 150 meters and 14 days of an existing non-closed parent complaint in the same ward and category, it merges into the parent.
   - The parent's `affected_count` increments, and its `priority_score` increases automatically:
     $$\text{Priority} = \text{Severity Weight} + (\text{Age in Days} \times 1) + (\text{Affected Citizens} \times 2)$$
4. **Objective Ward Performance Index (0 to 100)**:
   - Municipal wards are objectively scored and ranked:
     $$\text{Score} = 100 - \left(30 \times \frac{\min(\text{avg\_time}, 14)}{14}\right) - (30 \times \text{overdue\_share}) - (40 \times \text{reopen\_rate})$$
   - Wards with zero complaints return `null` (*"No data"*), preventing false 100% scores.

---

## 3. Tech Stack

| Layer | Technologies |
|---|---|
| **Front-End** | React 18 (Vite), React Router 6, Axios, Leaflet, React-Leaflet, Leaflet.markercluster |
| **Back-End** | Node.js 20, Express, mysql2 (promises), jsonwebtoken (JWT), bcrypt, express-validator, node-cron, cors |
| **Database** | MySQL 8.0 with dedicated analytical views and read-only Power BI user |
| **Analytics** | Power BI Desktop connected via MySQL Connector |
| **Deployment** | Docker, Docker Compose (3 services: `db`, `backend`, `frontend`), Git |
| **Testing** | Jest, Supertest (23 automated integration & boundary tests) |

---

## 4. Default Seeded Credentials

The database is seeded with synthetic test data across 20 wards, 10 zones, and 250+ complaints:

### Head Officer (City-Wide Access)
- **Portal URL**: `/officer/login`
- **Email**: `head.officer@civictrack.test`
- **Password**: `Officer@123`

### Ward Officers (Wards 1 through 20)
- **Portal URL**: `/officer/login`
- **Email**: `officer1@civictrack.test` (Ward 1 - Pratap Nagar), `officer2@civictrack.test` ... `officer20@civictrack.test`
- **Password**: `Officer@123`

### Citizens
- **Portal URL**: `/login` (or self-register at `/register`)
- **Email**: `citizen1@civictrack.test` through `citizen40@civictrack.test`
- **Password**: `Citizen@123`

### Power BI Read-Only User
- **Host**: `localhost:3306`
- **Database**: `civictrack`
- **Username**: `powerbi_ro`
- **Password**: `PowerBI@123`

---

## 5. Quickstart & Deployment

### Option A: Running with Docker Compose (Recommended)

1. Clone repository and navigate to root:
   ```bash
   git clone https://github.com/your-username/civictrack.git
   cd civictrack
   ```
2. Copy environment configuration:
   ```bash
   cp .env.example .env
   ```
3. Build and launch all three containers:
   ```bash
   docker-compose up --build
   ```
4. Access the applications:
   - **Citizen & Public Web App**: `http://localhost:3000`
   - **Officer Portal**: `http://localhost:3000/officer/login`
   - **Backend API Health Check**: `http://localhost:5000/api/health`
   - **MySQL Port**: `localhost:3306`

---

### Option B: Running Locally (Node.js & Local MySQL)

1. **Configure Database**:
   - Ensure MySQL 8.0 is running on `localhost:3306`.
   - Execute the initialization scripts:
     ```bash
     mysql -u root -p < db/schema.sql
     mysql -u root -p < db/views.sql
     ```
2. **Start Backend**:
   ```bash
   cd backend
   npm install
   npm run seed:reset     # Seeds initial test data
   npm run dev            # Runs API on http://localhost:5000
   ```
3. **Start Frontend**:
   ```bash
   cd ../frontend
   npm install
   npm run dev            # Runs Vite dev server on http://localhost:3000
   ```

---

## 6. Running Automated Tests

The test suite validates authentication, cross-role security, input constraints, duplicate merging, SLA boundaries, and hand-calculated mathematical scores:

```bash
cd backend
npm test
```

Expected output:
```
PASS tests/auth.test.js
PASS tests/complaints.test.js
PASS tests/rules_boundary.test.js

Test Suites: 3 passed, 3 total
Tests:       23 passed, 23 total
Snapshots:   0 total
Time:        ~3.5s
```

Detailed test documentation is located in [`docs/test-cases.md`](docs/test-cases.md).

---

## 7. Connecting Power BI Desktop

1. Open Power BI Desktop $\rightarrow$ **Get Data** $\rightarrow$ **MySQL Database**.
2. Enter Server: `localhost:3306`, Database: `civictrack`.
3. Provide user: `powerbi_ro`, Password: `PowerBI@123`.
4. Load the 5 analytical views (`v_ward_metrics`, `v_category_trend`, `v_hotspots`, `v_monthly_summary`, `v_complaints_flat`).
5. Follow the visual layout guide in [`docs/powerbi-setup.md`](docs/powerbi-setup.md).

---

## 8. Repository Structure

```
civictrack/
├── docker-compose.yml       # 3-container orchestration (db, backend, frontend)
├── .env.example             # Template environment variables
├── README.md                # Project documentation
├── docs/
│   ├── test-cases.md        # Comprehensive 23-scenario test results table
│   ├── powerbi-setup.md     # 5-page Power BI construction guide
│   └── ACKNOWLEDGEMENTS.md  # Attributions, disclosures, and acknowledgements
├── db/
│   ├── schema.sql           # MySQL 8 schema with tables, FKs, indexes & powerbi_ro user
│   └── views.sql            # 5 analytical views for Power BI reporting
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── scripts/seed.js      # Procedural 250+ synthetic complaints seed generator
│   ├── src/
│   │   ├── server.js        # Server bootstrap, seed check & cron startup
│   │   ├── app.js           # Express app, middleware & route mounting
│   │   ├── config/db.js     # MySQL2 connection pooling
│   │   ├── middleware/      # auth.js, requireRole.js, validate.js, errorHandler.js
│   │   ├── routes/          # auth.js, complaints.js, wards.js, categories.js, stats.js, map.js, public.js
│   │   ├── services/        # complaintService.js, ruleEngine.js, scoreService.js
│   │   └── jobs/scheduler.js# node-cron recurring auto-close & SLA checks
│   └── tests/               # auth.test.js, complaints.test.js, rules_boundary.test.js
└── frontend/
    ├── Dockerfile           # Multi-stage production build (Vite + Nginx)
    ├── nginx.conf           # Reverse proxy configuration (/api -> backend:5000)
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx, App.jsx, App.css
        ├── api/client.js    # Axios with JWT bearer interceptors
        ├── context/AuthContext.jsx
        ├── components/      # Navbar, ProtectedRoute, StatusBadge, StatusTimeline,
        │                    # MapPicker, ComplaintMap, ComplaintCard, Loader, EmptyState, ErrorBanner
        ├── pages/
        │   ├── Landing.jsx  # Public landing with dual-portal buttons
        │   ├── PublicMap.jsx# Public map with rankings sidebar
        │   ├── citizen/     # CitizenLogin, CitizenRegister, Dashboard, NewComplaint, MyComplaints, ComplaintDetail
        │   └── officer/     # OfficerLogin, OfficerDashboard, OfficerQueue, OfficerMap, OfficerComplaintDetail
        └── utils/           # constants.js, nagpur.js (Haversine & bounding box)
```

---

## 9. Limitations & Acknowledgements

- **Approximate Ward Centroids**: NMC official GIS polygon boundary files are not publicly distributed; approximate ward centroids are used for distance calculations.
- **Synthetic Data**: All complaint descriptions, citizen identities, and coordinates are simulated test data.
- Full details and AI generation disclosures are available in [`docs/ACKNOWLEDGEMENTS.md`](docs/ACKNOWLEDGEMENTS.md).
