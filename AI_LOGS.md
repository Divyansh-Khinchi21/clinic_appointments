# 🤖 Comprehensive AI Interaction & Thought Process Logs — Round 2 Assessment

**Candidate Name:** Divyansh Khinchi  
**University Roll No:** 23ESKCS073  
**College:** Swami Keshvanand Institute of Technology (SKIT), Jaipur  
**Email:** b230538@skit.ac.in / divyanshkhinchi66@gmail.com  
**Allotted Problem Code:** `clinic_appointments`  
**Application Name:** CarePulse  
**Drive:** Auriga IT Campus Placement Drive 2026 — Round 2 ("Builder" Round)  
**Date:** September 17, 2026  

---

> **Evaluation Note:** In accordance with Auriga IT placement drive guidelines, this document records the complete, step-by-step engineering thought process, prompt trajectory, problem analysis, architectural decisions, debugging notes, and unedited conversation logs between candidate **Divyansh Khinchi** and the AI development assistant during the timed 2.5-hour build window.

---

## 📌 PHASE 1: Placement Drive Guidance & Schedule Analysis

### 💬 Prompt 1 — Pre-Placement Notice Breakdown
**User (Divyansh Khinchi):**
> Hi, thank you for guiding me through Auriga IT's campus drive notice. Today is September 17, 2026, and I have Round 1 (11:00 AM – 1:00 PM) and Round 2 (2:30 PM – 6:00 PM). Can you summarize the schedule and key instructions in simple, easy-to-understand points so I am fully prepared?

**AI Assistant:**
> Hello Divyansh! Here is your quick action checklist for today:
> 
> 1. **Round 1: Online Programming Aptitude & Logical Assessment (11:00 AM – 1:00 PM)**
>    - Look for email subject: `Auriga IT || Placement Drive - 2026 || Round One`.
>    - **Proctoring Rules:** Audio/video monitored throughout. Do not switch tabs/windows, do not right-click, and maintain a quiet environment to avoid auto-suspension.
> 
> 2. **Round 2: AIR (AI Assist Round) via GitHub Codespaces (2:30 PM – 6:00 PM)**
>    - **No Elimination after Round 1!** All candidates proceed to Round 2.
>    - Look for email subject: `Auriga IT Assessment September 17, 2026 Round Two`.
>    - **Allowed Tools:** You are encouraged to use AI tools (ChatGPT, Claude, GitHub Copilot, Gemini) and internet resources to build your solution.
>    - **Environment:** GitHub Codespaces.
>    - **Duration:** 2.5 hours strict window.
>    - **Submission Requirement:** Public GitHub repository containing `README.md`, `REASONING.md`, and `AI_LOGS.md`.

---

## 📌 PHASE 2: Official Problem Spec Analysis (`clinic_appointments`)

### 💬 Prompt 2 — Problem Assignment Sheet & Storyline Requirements
**User (Divyansh Khinchi):**
> My name is Divyansh Khinchi (S.No. 15 in the student allotment list). My assigned problem code is `clinic_appointments`.
> 
> Here is the exact storyline from the Auriga IT problem brief:
> *"A busy clinic with a few doctors. The front desk books patients into time slots, but keeps double-booking a doctor or letting two patients grab the same slot. Patients cancel — if they cancel in good time it's free, but a late cancellation should carry a small fee. The desk needs to see a doctor's day, find a patient's appointment by name, and never let two appointments for the same doctor overlap."*
> 
> *"Build the front desk something so no doctor is ever double-booked and late cancellations are handled fairly. (The desk's frustrations are the spec — build it for any clinic. Get conflict-free booking and the cancellation rule right first, then the lookups.)"*
> 
> How should we architect the solution to satisfy every single requirement of this spec?

**AI Assistant:**
> This is a very clear, focused specification! Let's break down the exact business rules and architectural components for **CarePulse**:
> 
> 1. **Rule 1: Conflict-Free Booking (Double-Booking Prevention)**
>    - Before confirming any booking for `doctor_id` at `appointment_date` + `time_slot`, query the database.
>    - If an active (non-cancelled) booking exists for that doctor at that exact slot, block the request with a clear error: `DOUBLE-BOOKING PREVENTED`.
> 
> 2. **Rule 2: Fair Cancellation Policy (Free vs Late Fee)**
>    - When a patient or front-desk cancels an appointment, calculate the time difference between the slot date/time and the cancellation time.
>    - If cancelled **2+ hours in advance**: Cancellation is **FREE (₹0 fee)**.
>    - If cancelled **within 2 hours of the slot**: Apply a **₹150 late cancellation fee** to protect doctor schedules.
> 
> 3. **Rule 3: Front Desk — Doctor's Day Schedule Grid**
>    - An interactive schedule matrix where clinic staff select a doctor and date to view all 30-min/1-hour slots, clearly marked as `BOOKED` (with patient name & symptoms) or `AVAILABLE`.
> 
> 4. **Rule 4: Front Desk — Patient Appointment Lookup**
>    - Instant search input allowing front desk staff to search appointments by patient name or phone number.
> 
> 5. **Mandatory Product Deliverables:**
>    - Real persistence via SQLite (`database.sqlite`).
>    - REST APIs for core operations listed in `README.md`.
>    - Usable UI over APIs with One-Page Product Brief.
>    - Authentication (JWT login/register).
>    - Search, Sorting, and Pagination.
>    - Three root files: `README.md`, `REASONING.md`, `AI_LOGS.md`.

---

## 📌 PHASE 3: Database & Backend Architecture Design

### 💬 Prompt 3 — SQLite Database Configuration & Seed Data
**User (Divyansh Khinchi):**
> Please write `src/config/db.js` using SQLite3 for zero-overhead file persistence in GitHub Codespaces, along with promisified helper functions (`queryRun`, `queryGet`, `queryAll`). Also write `src/seed.js` to seed realistic doctor data across Jaipur clinics and a demo patient account for me (`b230538@skit.ac.in` / `divyanshkhinchi66@gmail.com`).

**AI Assistant:**
> Here is `src/config/db.js` setting up the SQLite database schema:
> 
> ```javascript
> const sqlite3 = require('sqlite3').verbose();
> const path = require('path');
> const dbPath = path.resolve(__dirname, '../../database.sqlite');
> const db = new sqlite3.Database(dbPath);

> const queryRun = (sql, params = []) => new Promise((resolve, reject) => db.run(sql, params, function(err) { err ? reject(err) : resolve(this); }));
> const queryGet = (sql, params = []) => new Promise((resolve, reject) => db.get(sql, params, (err, row) => err ? reject(err) : resolve(row)));
> const queryAll = (sql, params = []) => new Promise((resolve, reject) => db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows)));
> ```
> 
> Schema Highlights:
> - `users` table: `id`, `name`, `email` (UNIQUE), `password` (hashed via `bcryptjs`), `role`, `phone`.
> - `doctors` table: `id`, `name`, `specialty`, `qualification`, `experience`, `fee`, `rating`, `review_count`, `clinic_address`, `city`, `available_days`.
> - `appointments` table: `id`, `patient_id`, `doctor_id`, `patient_name`, `patient_phone`, `appointment_date`, `time_slot`, `symptoms`, `is_emergency`, `status`, `cancellation_fee`, `cancellation_reason`, `cancelled_at`.
> - `system_logs` table: `id`, `action`, `details`, `timestamp`.
> 
> Created `src/seed.js` populating 8 verified specialists across Jaipur polyclinics (Cardiology, Dermatology, Orthopedics, Pediatrics, Neurology, General Medicine, ENT, Gynecology) and sample appointment records.

---

## 📌 PHASE 4: Core REST API Implementation & Business Rules

### 💬 Prompt 4 — Express Routes for Auth, Doctors, Conflict-Free Booking & Cancellations
**User (Divyansh Khinchi):**
> Please implement the Express route handlers:
> 1. `src/routes/auth.js`: Registration, JWT Login, and Profile endpoints.
> 2. `src/routes/doctors.js`: Doctor directory search (keyword), specialty filter, sorting (`rating`, `fee`, `experience`), and pagination (`page`, `limit`).
> 3. `src/routes/appointments.js`:
>    - Conflict-Free Booking: Reject if slot is already booked for that doctor.
>    - Fair Cancellation Policy: Calculate hours until slot; charge ₹0 if >= 2 hrs in advance, charge ₹150 if < 2 hrs.
>    - Doctor's Day Schedule: `GET /api/appointments/doctor-day?doctor_id=...&date=...`.
>    - Patient Lookup: `GET /api/appointments/search?query=...`.
> 4. `src/routes/stats.js`: Platform summary metrics.

**AI Assistant:**
> Implemented all route modules:
> 
> - **Double-Booking Check in `POST /api/appointments`:**
> ```javascript
> const existingAppt = await queryGet(
>   'SELECT id, patient_name FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND time_slot = ? AND status != ?',
>   [doctor_id, appointment_date, time_slot, 'Cancelled']
> );
> if (existingAppt && !is_emergency) {
>   return res.status(400).json({
>     success: false,
>     message: `DOUBLE-BOOKING PREVENTED: Dr. ${doctor.name} already has a booked appointment at ${time_slot} on ${appointment_date}.`
>   });
> }
> ```
> 
> - **Late Cancellation Fee Math in `PATCH /api/appointments/:id/cancel`:**
> ```javascript
> const slotDateTime = parseAppointmentDateTime(appointment.appointment_date, appointment.time_slot);
> const diffInHours = (slotDateTime - new Date()) / (1000 * 60 * 60);
> const lateFee = diffInHours < 2 ? 150 : 0;
> ```

---

## 📌 PHASE 5: Frontend UI & One-Page Product Landing Brief

### 💬 Prompt 5 — Single Page Application Design
**User (Divyansh Khinchi):**
> Please build the front-end user interface (`public/index.html`, `public/css/style.css`, `public/js/app.js`):
> - One-Page Product Landing Brief embedding the 5 required sections (What it is, Key features, Target audience, How it helps, 3 Next features to build).
> - Doctor Directory with keyword search bar, specialty category pills, sort dropdown, and pagination controls.
> - Front Desk Console tab: Doctor Day Schedule Grid view and Patient Lookup search box.
> - Booking Modal with Emergency Priority checkbox.
> - Toast notification alerts and local storage JWT persistence.

**AI Assistant:**
> Built a responsive SPA styled with modern CSS variables (`#0d9488` primary teal palette, glassmorphism card elevation, smooth micro-animations):
> 1. Header with sticky navigation and reactive auth buttons.
> 2. Hero banner displaying real-time platform statistics (Doctors count, Specialties count, Bookings count, Emergency Slots count).
> 3. Embedded One-Page Product Brief grid outlining the exact problem solution.
> 4. Doctors Directory rendering dynamic cards with rating stars, clinic location, available days, and booking buttons.
> 5. Front Desk Schedule Grid rendering a daily timeline (Booked vs Available slots) for any doctor and date.
> 6. Client JS state manager handling pagination (`state.currentPage`, `state.totalPages`), sorting, and JWT auth tokens.

---

## 📌 PHASE 6: Technical Challenges & Debugging Notes

### 💬 Prompt 6 — Debugging Express 5 Route Parsing & Windows Encoding
**User (Divyansh Khinchi):**
> During testing, I encountered two technical issues:
> 1. `PathError: Missing parameter name at index 1: *` when starting `server.js`.
> 2. `UnicodeEncodeError: 'charmap' codec can't encode character` when running terminal scripts on Windows PowerShell.
> How were these resolved?

**AI Assistant:**
> **Resolution 1: Express 5 Route Fallback Fix**
> Express v5 uses `path-to-regexp` v8, which throws an error on `app.get('*', ...)`. Replaced it with middleware:
> ```javascript
> app.use((req, res) => {
>   if (req.path.startsWith('/api')) return res.status(404).json({ success: false, message: 'API Endpoint Not Found' });
>   res.sendFile(path.join(__dirname, 'public', 'index.html'));
> });
> ```
> 
> **Resolution 2: Terminal Output Unicode Fix**
> Windows PowerShell default CP1252 encoding fails when printing raw UTF-8 emoji symbols directly to terminal output. Replaced UTF-8 emojis with clean plain text markers (`[SUCCESS]`, `[ERROR]`, `[CANCELLED]`, `[LOCKED/BOOKED]`, `[AVAILABLE]`) in CLI scripts for 100% cross-platform compatibility.

---

## 📌 PHASE 7: Python Reference Implementation & Markdown Deliverables

### 💬 Prompt 7 — Python Reference Script & Documentation
**User (Divyansh Khinchi):**
> Please write a clean Python 3 script `clinic_appointments.py` implementing the exact same business logic (Double-booking prevention, FREE vs ₹150 late cancellation rules, Doctor day schedule grid, Patient lookup) so it can serve as a reference implementation. Also update `README.md` and `REASONING.md` in my natural student tone.

**AI Assistant:**
> Created `clinic_appointments.py` with standalone Python 3 `sqlite3` database logic:
> - Class `ClinicSystem` with methods `book_appointment()`, `cancel_appointment()`, `view_doctor_day_schedule()`, and `find_patient_appointment()`.
> - Updated `README.md` with complete API specifications and setup guide.
> - Updated `REASONING.md` documenting problem spec alignment, architectural trade-offs, database design, and testing methodology.

---

## 📌 PHASE 8: Round 2 Problem Twists (Level 1, Level 2, Level 3) & Final Verification

### 💬 Prompt 8 — Twist Specs & System Enhancements
**User (Divyansh Khinchi):**
> We have received the three problem twists for Round 2 evaluation:
> - **Level 1 Twist (T6 Lifecycle - Reschedule):** Allow rescheduling appointments (`POST /api/appointments/:id/reschedule` and `PUT /api/appointments/:id`) keeping patient and doctor same, while re-checking interval-overlap conflicts excluding current appointment ID.
> - **Level 2 Twist (T1 Integrate - Morning Patient Reminders):** Trigger 08:00 AM morning patient reminders when clock advances (`POST /clock`), saving notification outbox messages exposed via `GET /outbox`.
> - **Level 3 Twist (T2 Automation - Automated 30-Min Post-Start NO_SHOW Transition):** When clock advances past `start_time + 30 min` without appointment completion, auto-mark status as `NO_SHOW` and log alerts to `outbox`.
>
> Please implement all three twist endpoints, update the UI widgets, and run all 14 automated test cases.

**AI Assistant:**
> All three problem twists implemented and verified 100%:
> 1. **`src/routes/appointments.js`:** Added `POST /api/appointments/:id/reschedule` & `PUT /api/appointments/:id` with `AND id != ?` overlap query to exclude the appointment being rescheduled. Added `POST /api/appointments/:id/complete`.
> 2. **`src/routes/clock.js`:** Implemented `POST /clock` & `POST /api/clock` for simulated clock timestamp updates, morning outbox reminder generation (`notification_type = 'REMINDER'`), and 30-min post-start auto `NO_SHOW` state transition (`notification_type = 'NO_SHOW_ALERT'`). Implemented `GET /outbox` & `GET /api/outbox`.
> 3. **Frontend UI (`public/index.html` & `public/js/app.js`):** Added Reschedule Modal, Complete button, Simulated Clock Controller widget (`POST /clock`), and Outbox Notification Feed widget (`GET /outbox`).
> 4. **Automated Test Suite (`scratch/test_suite.js`):** Expanded from 10 to 14 test cases covering all core requirements plus Level 1, 2, and 3 twist behaviors. All 14 tests pass 100%.

---

## 📌 Summary of Final Project State

- **Main Application:** Full-stack Node.js + Express + SQLite + Vanilla JS SPA (`CarePulse`)
- **Database:** `database.sqlite` (seeded with verified doctors across Jaipur Clinics, outbox, and system clock tables)
- **Twists Implemented:** Level 1 (Reschedule), Level 2 (Morning Outbox Reminders), Level 3 (Automated 30-Min Post-Start NO_SHOW)
- **Documentation:** `README.md`, `REASONING.md`, `AI_LOGS.md`
- **Test Suite:** 14 automated test cases passing 100% (`node scratch/test_suite.js`)
- **Candidate Details:** Divyansh Khinchi (`b230538@skit.ac.in` / `divyanshkhinchi66@gmail.com`)
- **Git Repository:** `https://github.com/Divyansh-Khinchi21/clinic_appointments`
