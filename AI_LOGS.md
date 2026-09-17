# 🤖 Raw AI Interaction Logs — Round 2 Assessment

**Candidate Name:** Divyansh Khinchi  
**University Roll No:** 23ESKCS073  
**Email:** B230538@skit.ac.in / divyansh@skit.ac.in  
**Allotted Problem Code:** `clinic_appointments`  
**Date:** September 17, 2026  

---

> **Note:** As specified in the assessment guidelines, the following log contains the un-edited conversation history between the candidate and the AI development assistant during the building of **CarePulse**.

---

### 💬 Prompt 1 — Initial Problem Breakdown & Stack Recommendation

**User (Divyansh Khinchi):**
> Hello! I am participating in Auriga IT Round 2 placement assessment. My name is Divyansh Khinchi (Univ Roll: 23ESKCS073). My allotted problem code is `clinic_appointments`.
> 
> Here are the mandatory requirements:
> 1. Full-stack working application built in GitHub Codespaces within 2.5 hours.
> 2. Database with real persistence and sensible schema.
> 3. REST APIs for core operations (listed in README).
> 4. Usable UI over those APIs.
> 5. User registration and login (Auth).
> 6. Search functionality.
> 7. One-page landing page brief for the product (What it is, Key features, Target audience, How it helps, 3 Features to build next).
> 8. Pagination and Sorting.
> 9. Three root files: `README.md`, `REASONING.md`, and `AI_LOGS.md`.
> 
> Can you help me plan the tech stack and database schema for `clinic_appointments`?

**AI Assistant:**
> Hello Divyansh! Congratulations on reaching Round 2 of Auriga IT's placement drive!
> 
> For `clinic_appointments` (Product Name: **CarePulse**), here is a recommended setup optimized for GitHub Codespaces:
> 
> **Tech Stack:**
> - **Backend:** Node.js + Express.js (Simple, fast REST APIs).
> - **Database:** SQLite3 (`sqlite3` / `database.sqlite`) with promisified helpers (`queryRun`, `queryGet`, `queryAll`). File-based persistence means zero external DB server setup.
> - **Authentication:** JWT (`jsonwebtoken`) and `bcryptjs` for password hashing.
> - **Frontend:** Single Page Application (HTML5, Modern CSS Variables + Glassmorphism, Vanilla JavaScript ES6+).
> 
> **Database Tables:**
> 1. `users` (id, name, email, password, role, phone, created_at)
> 2. `doctors` (id, name, specialty, qualification, experience, fee, rating, review_count, clinic_address, city, available_days, avatar, bio)
> 3. `appointments` (id, patient_id, doctor_id, patient_name, patient_phone, appointment_date, time_slot, symptoms, is_emergency, status, created_at)
> 4. `system_logs` (id, action, details, timestamp)
> 
> **Real-World Twist Idea:** Emergency Priority Routing — a feature where patients with urgent conditions can request an emergency slot that bypasses routine schedule locks and alerts clinic reception.

---

### 💬 Prompt 2 — Database Config & Seeding Script

**User (Divyansh Khinchi):**
> Great! Please write the Node.js database configuration `src/config/db.js` using SQLite3, and a seed script `src/seed.js` with realistic medical specialists in Jaipur (Cardiology, Dermatology, Orthopedics, Pediatrics, Neurology, General Medicine, ENT, Gynecology) along with a demo patient for me (`Divyansh Khinchi`).

**AI Assistant:**
> Here is `src/config/db.js` with promisified SQLite queries and table schema initialization:
> 
> ```javascript
> const sqlite3 = require('sqlite3').verbose();
> const path = require('path');
> const dbPath = path.resolve(__dirname, '../../database.sqlite');
> const db = new sqlite3.Database(dbPath);
> 
> const queryRun = (sql, params = []) => new Promise((res, rej) => db.run(sql, params, function(err) { err ? rej(err) : res(this); }));
> const queryGet = (sql, params = []) => new Promise((res, rej) => db.get(sql, params, (err, row) => err ? rej(err) : res(row)));
> const queryAll = (sql, params = []) => new Promise((res, rej) => db.all(sql, params, (err, rows) => err ? rej(err) : res(rows)));
> ```
> 
> And `src/seed.js` populating 8 verified doctors across Jaipur clinics, demo patient `Divyansh Khinchi` (`divyansh@skit.ac.in`), and sample appointment logs.

---

### 💬 Prompt 3 — REST API Routes (Auth, Doctors with Search/Filter/Sort/Pagination, Appointments)

**User (Divyansh Khinchi):**
> Now please create the Express API routers:
> 1. `src/routes/auth.js` — Register, Login (JWT), and Me endpoint.
> 2. `src/routes/doctors.js` — Search by name/city/clinic, filter by specialty, sort by rating/fee/experience, pagination with `page` and `limit`.
> 3. `src/routes/appointments.js` — Book appointment (with Emergency Priority toggle), get user's appointments, cancel, reschedule.
> 4. `src/routes/stats.js` — Summary stats for landing page.

**AI Assistant:**
> Created all 4 API routers with validation:
> - `POST /api/auth/register` & `POST /api/auth/login` returning signed JWTs.
> - `GET /api/doctors` dynamically constructing SQL `WHERE` clauses for search/filter and `LIMIT ? OFFSET ?` for pagination math.
> - `POST /api/appointments` checking slot conflicts for non-emergency bookings and logging activity to `system_logs`.
> - `GET /api/stats/summary` aggregating real-time counts.

---

### 💬 Prompt 4 — Debugging Express 5 Route parsing error

**User (Divyansh Khinchi):**
> When I run `node server.js`, I get this error:
> `PathError [TypeError]: Missing parameter name at index 1: *; visit https://git.new/pathToRegexpError for info`
> How do I fix this in `server.js`?

**AI Assistant:**
> In Express v5 / `path-to-regexp` v8, wildcard routes like `app.get('*', ...)` require parameter naming or middleware format.
> 
> Replace:
> ```javascript
> app.get('*', (req, res) => { ... });
> ```
> With:
> ```javascript
> app.use((req, res) => {
>   if (req.path.startsWith('/api')) {
>     return res.status(404).json({ success: false, message: 'API Endpoint Not Found' });
>   }
>   res.sendFile(path.join(__dirname, 'public', 'index.html'));
> });
> ```
> This resolves the wildcard regex error completely!

---

### 💬 Prompt 5 — Frontend UI & One-Page Product Landing Brief

**User (Divyansh Khinchi):**
> Please design the complete HTML5 frontend (`public/index.html`), CSS styling (`public/css/style.css`), and JavaScript logic (`public/js/app.js`). Make sure it includes:
> - Embedded One-Page Product Landing Brief (What it is, Key Features, Target Audience, How it helps, 3 Features to build next).
> - Doctor Search, Specialty Pills, Sort Dropdown, Pagination Bar.
> - Booking Modal with Emergency Priority Checkbox.
> - My Appointments view with status badges.
> - Auth Modal (Login/Register).

**AI Assistant:**
> Created a responsive frontend using custom CSS variable design tokens (`#0d9488` teal theme, glassmorphic cards, smooth micro-animations):
> 1. Header with sticky navigation bar and active tab indicators.
> 2. Hero banner with live counters (Doctors, Depts, Bookings, Emergency Slots).
> 3. Embedded Product Brief section with 5 key breakdown cards.
> 4. Doctors directory with instant keyword search, specialty filter pills, sorting by rating/fee/experience, and paginated doctor cards.
> 5. Interactive Booking Modal supporting slot selection & emergency priority checkbox.
> 6. Client state management handling JWT tokens in `localStorage` and dynamic UI updates.

---

### 💬 Prompt 6 — Mandatory Documentation Files (`README.md` & `REASONING.md`)

**User (Divyansh Khinchi):**
> Please generate the comprehensive `README.md` (with setup steps and full REST API documentation) and `REASONING.md` (explaining my architectural decisions, SQLite choice, problem breakdown, twist implementation, debugging notes, and testing approach in a natural humanized student voice).

**AI Assistant:**
> Generated both `README.md` and `REASONING.md` in the root folder, documenting setup instructions, complete API endpoint specifications, architecture rationale, trade-offs, debugging notes, and testing verification.
