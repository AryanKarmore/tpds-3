# Acknowledgements & Project Disclosures

This academic class project, **CivicTrack Nagpur**, was designed to demonstrate end-to-end full-stack software engineering, business rule enforcement, containerized deployment, and business intelligence analytics across four modules.

---

## 1. Reused Open-Source Libraries

We gratefully acknowledge the developers and open-source communities behind the following libraries:

### Frontend
- **React 18** (Meta Open Source) - Frontend component library.
- **Vite** (Evan You & Contributors) - Next-generation frontend build tooling.
- **React Router 6** (Remix Software) - Declarative client-side routing.
- **Axios** (Matt Zabriskie) - Promise-based HTTP client for API communication.
- **Leaflet & React-Leaflet** (Vladimir Agafonkin, Paul Le Cam) - Lightweight mobile-friendly interactive maps.
- **Leaflet.markercluster** (Dave Leaver) - Animated marker clustering functionality for Leaflet.

### Backend & Database
- **Node.js** (OpenJS Foundation) - JavaScript runtime environment.
- **Express** (TJ Holowaychuk & Contributors) - REST API web framework.
- **mysql2** (Andrey Sidorov) - Fast MySQL driver supporting connection pooling and async/await promises.
- **bcrypt** (Kelektiv) - Cryptographic password hashing (10 salt rounds).
- **jsonwebtoken (JWT)** (Auth0) - Stateless token-based session management.
- **express-validator** (Gustavo Henke) - Request payload sanitization and validation middleware.
- **node-cron** (Lucas Motta) - In-process cron scheduler for background SLA checks.
- **Jest & Supertest** (Meta Open Source, Visionmedia) - Automated unit and HTTP integration testing harness.

---

## 2. Geospatial Data & Mapping Attributions

- **Map Tiles**: Map data &copy; [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, available under the Open Database License (ODbL).
- **Map Rendering**: Powered by [Leaflet.js](https://leafletjs.com/).

### Important Disclosure: Approximate Ward Centroids
Official Nagpur Municipal Corporation (NMC) ward boundary GIS polygon files (GeoJSON) are not publicly bundled with this repository. In accordance with the project specification:
- Representative ward centroids (`latitude`, `longitude`) were derived to approximate ward central hubs distributed across Nagpur's 10 administrative zones.
- The platform uses these centroids for Haversine distance nearest-ward auto-selection.
- *Future implementation note*: The database schema and map components are structured to readily accept official NMC polygon boundaries via a `nagpur-wards.geojson` overlay if published.

---

## 3. Synthetic Data Declaration

All complaint records, citizen profiles, officer contact numbers, and historical maintenance timeline events contained in `backend/scripts/seed.js` and loaded into MySQL are **entirely synthetic simulations**. 

They were procedurally generated across a 4-month simulated operational timeline with intentional statistical variance to model diverse municipal operating conditions (high-performing wards vs. backlogged wards) for rigorous testing and Power BI analytical evaluation. No actual citizen data or NMC operational records were used.

---

## 4. AI Assistance Disclosure

In compliance with academic integrity guidelines, **Claude Code** (Anthropic) was utilized as an AI pair programming and code-generation assistant to author the codebase, write unit and boundary tests, build Docker configurations, and generate documentation according to the detailed user build specifications. The project architecture, business rules, database schema, and test validations have been thoroughly reviewed, run, and verified by the development team.
