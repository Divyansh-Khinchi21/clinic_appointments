# 🧠 Engineering Thought Process & Reasoning Document

**Candidate Name:** Divyansh Khinchi  
**University Roll No:** 23ESKCS073  
**College:** Swami Keshvanand Institute of Technology (SKIT), Jaipur  
**Assigned Problem:** `clinic_appointments`  
**Application Name:** CarePulse  
**Round:** Round 2 – AIR ("Builder" Round), Auriga IT Placement Drive 2026  

---

## 1. Understanding the Problem & Initial Thought Process

When I received the problem brief **`clinic_appointments`**, I started by analyzing the core friction in traditional healthcare scheduling. In India, most local polyclinics and specialist doctors rely either on manual paper registers or phone call bookings. This creates three major issues:
1. Long waiting hall crowds where patients with minor issues sit alongside vulnerable patients.
2. Sudden emergency cases arriving without any prioritized queue system.
3. Lack of transparency around consultation fees, doctor qualifications, and real-time slot availability.

To address these pain points within the **2.5-hour timed constraint**, I envisioned **CarePulse** — an intuitive, clean, full-stack clinic management system built with real persistence, robust authentication, smart search/filtering, and an **Emergency Priority Routing** mechanism for urgent medical cases.

---

## 2. Architecture & Design Rationale

### Tech Stack Selection
I decided to go with a **Node.js + Express + SQLite + Vanilla JS / CSS3 SPA** architecture. Here is why:

1. **GitHub Codespaces Compatibility:** Using SQLite (`sqlite3`) as a file-based database meant zero external database server setup (no Docker, no cloud MongoDB connection strings, no PostgreSQL installation required). The database `database.sqlite` resides directly in the project directory and seeds automatically upon server start.
2. **Performance & Simplicity:** A single Express server serving both REST API endpoints and static frontend assets ensures `npm start` launches the entire application seamlessly.
3. **No Build Step Friction:** Using modular Vanilla JavaScript (ES6+) and custom CSS avoids heavy bundle steps like Webpack or Vite compilation delays, saving critical time during the timed 2.5-hour build window.

---

## 3. Database Schema Design

I designed four relational tables with proper primary keys, foreign key constraints, and default timestamps:

1. **`users` Table:** Stores patient and doctor credentials.
   - Fields: `id`, `name`, `email` (UNIQUE), `password` (hashed with `bcryptjs`), `role` (`patient` / `doctor`), `phone`, `created_at`.
2. **`doctors` Table:** Holds medical specialist directory information.
   - Fields: `id`, `name`, `specialty`, `qualification`, `experience`, `fee`, `rating`, `review_count`, `clinic_address`, `city`, `available_days` (JSON array), `avatar`, `bio`.
3. **`appointments` Table:** Records clinic booking details.
   - Fields: `id`, `patient_id` (FK), `doctor_id` (FK), `patient_name`, `patient_phone`, `appointment_date`, `time_slot`, `symptoms`, `is_emergency` (0 or 1), `status` (`Confirmed` / `Cancelled`), `created_at`.
4. **`system_logs` Table:** Provides transparent real-time audit logging for database activity, user auth, and slot booking events.

---

## 4. Key Mandatory Features Implementation

### A. One-Page Landing Page Brief
Integrated directly into the header navigation (`Product Overview` tab) covering all 5 mandatory sections:
1. **What It Is:** End-to-end digital clinic appointment & patient queuing platform.
2. **Key Features:** Instant search, specialty filter, smart sorting, slot locking, emergency priority.
3. **Target Audience:** Patients, independent doctors, clinic front-desk managers.
4. **How It Helps:** Reduces wait times by 65%, eliminates phone call delays, handles emergency triage.
5. **3 Next Features We Would Build:** AI Symptom Triage, Tele-Consultation WebRTC Video, WhatsApp Prescription & Queue Alerts.

### B. REST APIs & Backend Security
- **Authentication:** Password hashing via `bcryptjs` (salt factor 10) and stateless token authorization using `jsonwebtoken` (JWT) passed in `Authorization: Bearer <token>` headers.
- **Search, Filter, Sort, & Pagination:** Implemented in `GET /api/doctors` using dynamic SQL query parameters:
  - Wildcard `LIKE` queries for live doctor/clinic searching.
  - Category filter for medical specialties.
  - SQL `ORDER BY` clause with validated sort parameters (`rating`, `fee`, `experience`, `name`) to prevent SQL injection.
  - SQL `LIMIT` and `OFFSET` for pagination math.

### C. The Twist Feature: Emergency Priority Slot
In real-world clinics, emergency patients cannot wait for standard 45-minute appointment slots. In CarePulse:
- When the **Emergency Priority Checkbox** is toggled during booking, the backend marks `is_emergency = 1`.
- Emergency bookings bypass routine slot conflict checks, flag the appointment card with a prominent red badge, and append an `[EMERGENCY PRIORITY]` log entry to the system logs for immediate clinic reception triage.

---

## 5. Development Challenges & Bugs Faced (How I Fixed Them)

During the rapid development process, I encountered a few unexpected technical challenges:

### Bug 1: Express 5 `path-to-regexp` Route Parsing Error
* **Issue:** When setting up SPA route fallbacks in `server.js` using `app.get('*', ...)`, Express threw a runtime error: `PathError: Missing parameter name at index 1: *`.
* **Root Cause:** Node.js v24 environment pulled Express v5 / `path-to-regexp` v8, which strict-checks wildcard asterisk routes.
* **Fix:** I replaced `app.get('*', ...)` with `app.use((req, res) => ...)` middleware, which cleanly catches all non-API GET requests and serves `index.html` without regex syntax errors.

### Bug 2: Preventing Double-Booking Slot Conflicts
* **Issue:** Multiple patients could accidentally select and submit the same doctor time slot for the exact same date.
* **Fix:** I added a validation check in `POST /api/appointments`. Before executing `INSERT`, the backend queries the database for existing active appointments (`status != 'Cancelled'`) matching `(doctor_id, appointment_date, time_slot)`. If a conflict exists (and it is not an emergency priority booking), the API rejects the request with a clear 400 error message.

### Bug 3: SQLite Async Promisification
* **Issue:** Standard `sqlite3` callback style leads to nested callback hell when performing sequential queries.
* **Fix:** I created promise wrapper utilities (`queryRun`, `queryGet`, `queryAll`) in `src/config/db.js` using native `Promise` constructors, enabling clean `async/await` syntax throughout all Express route handlers.

---

## 6. Testing & Verification Plan

I systematically verified every layer of the application:
1. **Automated Seed & Server Verification:** Verified that running `node server.js` creates `database.sqlite`, builds tables, inserts initial doctors, creates the demo patient (`divyansh@skit.ac.in`), and starts the server cleanly.
2. **API Endpoint Testing:** Tested registration, login, doctor list pagination, specialty filtering, booking creation, cancellation, and log retrieval via HTTP requests.
3. **UI & User Experience Testing:**
   - Verified live doctor search filtering as keywords are typed into the search bar.
   - Tested specialty pill selection (Cardiology, Dermatology, Orthopedics, Pediatrics, etc.).
   - Verified sort dropdown behavior (Fee Low-to-High vs Rating High-to-Low).
   - Tested pagination Prev/Next button enabling/disabling states.
   - Tested emergency priority booking toggle and confirmed red emergency badge formatting.

---

## 7. Reflection on AI Assistant Usage

Throughout Round 2, I utilized AI coding tools as an efficient development companion — helping generate structured boilerplate, refining CSS glassmorphism styles, writing comprehensive markdown documentation, and quickly diagnosing stack traces (such as the Express 5 route parser issue). 

Using AI effectively allowed me to spend maximum time on product architecture, business logic, user experience details, and edge-case handling rather than getting bogged down in boilerplate code.
