# 🏥 Clinic Appointment Management System (CarePulse)

> **Auriga IT Campus Placement Drive 2026 — Round 2 ("Builder" Round)**  
> **Candidate Name:** Divyansh Khinchi  
> **University Roll No:** 23ESKCS073  
> **College:** Swami Keshvanand Institute of Technology (SKIT), Jaipur  
> **Email:** b230538@skit.ac.in / divyanshkhinchi66@gmail.com  
> **Allotted Problem Code:** `clinic_appointments`  

---

## 🌟 1. Project Overview & Problem Statement

A busy clinic has several doctors. The front desk books patients into time slots, but the system must **NEVER allow a doctor to be double-booked or have overlapping appointments**.

Patients can cancel appointments. If a patient cancels sufficiently early, there is no cancellation fee (₹0). If a patient cancels late, a small cancellation fee (₹100) is applied.

**CarePulse** is a complete full-stack web application built to solve these exact front-desk challenges with backend interval-overlap validation, automated cancellation fee calculations, doctor day view schedule management, patient search lookups, pagination, and sorting.

---

## ⚡ 2. Features & Mandatory Requirements Checklist

- [x] **Real Database Persistence (SQLite):** `database.sqlite` storing users, doctors, appointments, cancellations, outbox messages, and system clock logs.
- [x] **Conflict-Free Double-Booking Prevention:** Backend interval-overlap logic `(new_start < existing_end AND new_end > existing_start)` for the same doctor & date.
- [x] **Late Cancellation Fee Logic:** Cancellations > 2 hours before start time = **₹0 fee**; cancellations <= 2 hours = **₹100 fee**.
- [x] **Role-Based Workflows:** Patient Dashboard & Staff/Front Desk Console.
- [x] **Doctor's Day View:** `GET /api/doctors/:id/appointments?date=YYYY-MM-DD` ordered by `start_time` ASC.
- [x] **Patient Name Search:** `GET /api/appointments/search?patientName=...`.
- [x] **Pagination & Sorting:** Query params `?page=1&limit=10` and `?sortBy=start_time&order=asc`.
- [x] **Level 1 Twist (Reschedule Appointment):** `POST /api/appointments/:id/reschedule` & `PUT /api/appointments/:id` updates slot while keeping patient & doctor same, with conflict-free overlap re-check (excluding current appointment ID).
- [x] **Level 2 Twist (Morning Patient Reminders via Outbox):** `POST /clock` triggers 08:00 AM patient outbox reminder generation; items exposed via `GET /outbox`.
- [x] **Level 3 Twist (Automated 30-Min Post-Start NO_SHOW Transition):** `POST /clock` auto-converts uncompleted `CONFIRMED` appointments past `start_time + 30 min` to `NO_SHOW` with alert outbox messages.
- [x] **One-Page Landing Page Brief:** Includes What it is, Key features, Target audience, How it helps, and 3 Features to build next.

---

## 🛠️ 3. Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** SQLite3 (`database.sqlite`)
- **Authentication:** JSON Web Tokens (JWT) & `bcryptjs` password hashing
- **Frontend:** HTML5, CSS3 Variables & Flexbox/Grid, Vanilla JavaScript SPA

---

## 🗄️ 4. Database Schema

### `users` Table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'patient', -- 'patient' or 'staff'
  phone TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### `doctors` Table
```sql
CREATE TABLE doctors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  specialization TEXT NOT NULL,
  qualification TEXT NOT NULL,
  experience INTEGER NOT NULL,
  fee REAL NOT NULL,
  rating REAL NOT NULL,
  clinic_address TEXT NOT NULL,
  city TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### `appointments` Table
```sql
CREATE TABLE appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  doctor_id INTEGER NOT NULL,
  patient_id INTEGER NOT NULL,
  patient_name TEXT NOT NULL,
  patient_phone TEXT NOT NULL,
  appointment_date TEXT NOT NULL, -- YYYY-MM-DD
  start_time TEXT NOT NULL,       -- HH:MM (e.g. 10:00)
  end_time TEXT NOT NULL,         -- HH:MM (e.g. 10:30)
  symptoms TEXT,
  status TEXT DEFAULT 'CONFIRMED',-- 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'
  reminded_date TEXT,
  cancellation_fee INTEGER DEFAULT 0,
  cancellation_reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES users(id),
  FOREIGN KEY (doctor_id) REFERENCES doctors(id)
);
```

### `outbox` Table (Level 2 & 3 Twist)
```sql
CREATE TABLE outbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  appointment_id INTEGER NOT NULL,
  patient_id INTEGER NOT NULL,
  patient_name TEXT NOT NULL,
  patient_phone TEXT,
  message TEXT NOT NULL,
  notification_type TEXT DEFAULT 'REMINDER', -- 'REMINDER' or 'NO_SHOW_ALERT'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🚀 5. How to Set Up & Run

```bash
# 1. Install dependencies
npm install

# 2. Start server (seeds database automatically)
npm start
```

Access in browser at:  
👉 **`http://localhost:3000`**

### Demo Logins:
- **Patient Mode:** `divyanshkhinchi66@gmail.com` / `password123`
- **Staff / Front Desk Mode:** `staff@carepulse.com` / `password123`

---

## 📋 6. Complete REST API Specifications

### Authentication
- `POST /api/auth/register` — Create patient or staff account.
- `POST /api/auth/login` — Authenticate user and receive signed JWT.
- `GET /api/auth/me` — Fetch profile details.

### Doctors
- `GET /api/doctors` — List doctors (supports `search` & `specialization` filters).
- `GET /api/doctors/:id` — Get doctor details.
- `GET /api/doctors/:id/appointments?date=YYYY-MM-DD` — Doctor Day View ordered by `start_time` ASC.

### Appointments & Reschedule (Level 1 Twist)
- `POST /api/appointments` — Book appointment with backend interval-overlap check.
- `GET /api/appointments` — List appointments with pagination (`?page=1&limit=10`) and sorting (`?sortBy=start_time&order=asc`).
- `GET /api/appointments/search?patientName=...` — Search appointments by patient name.
- `GET /api/appointments/:id` — Get single appointment details.
- `POST /api/appointments/:id/reschedule` & `PUT /api/appointments/:id` — Reschedule appointment to new date/time with conflict-free overlap re-check.
- `POST /api/appointments/:id/complete` — Mark appointment COMPLETED (prevents auto NO_SHOW).
- `POST /api/appointments/:id/cancel` — Cancel appointment (calculates ₹0 vs ₹100 fee).

### Clock Simulation & Notification Outbox (Level 2 & 3 Twists)
- `POST /clock` & `POST /api/clock` — Advance simulated clock timestamp. Triggers morning outbox reminders (08:00) and 30-min post-start auto `NO_SHOW` transition.
- `GET /outbox` & `GET /api/outbox` — List notification outbox feed messages.

---

## 🧪 7. Test Scenarios & Verification Results

All 14 test scenarios (10 Core + 4 Twists) pass 100%:

1. **TEST 1 (Dr. Sharma, 10:00 - 10:30, Patient A):** `HTTP 201 Created` — Booking confirmed.
2. **TEST 2 (Dr. Sharma, 10:15 - 10:45, Patient B):** `HTTP 400 Bad Request` — REJECTED due to overlap.
3. **TEST 3 (Dr. Sharma, 10:30 - 11:00, Patient B):** `HTTP 201 Created` — ALLOWED because boundary touches at 10:30.
4. **TEST 4 (Dr. Mehta, 10:15 - 10:45, Patient C):** `HTTP 201 Created` — ALLOWED because doctor is different.
5. **TEST 5 (Cancel > 2 hours in advance):** Status = `CANCELLED`, Fee = **₹0**.
6. **TEST 6 (Cancel <= 2 hours in advance):** Status = `CANCELLED`, Fee = **₹100**.
7. **TEST 7 (Search by patient name):** Matching appointment records returned.
8. **TEST 8 (Pagination `?page=1&limit=10`):** Max 10 records returned with pagination metadata.
9. **TEST 9 (Sorting `?sortBy=start_time&order=asc`):** Returned records ordered by start_time.
10. **TEST 10 (End time before start time `11:00 - 10:30`):** `HTTP 400 Bad Request` — Validation Error.
11. **TEST 11 [Level 1 Twist - Reschedule Slot]:** `HTTP 200 OK` — Appointment rescheduled to conflict-free time (14:00 - 14:30).
12. **TEST 12 [Level 1 Twist - Overlapping Reschedule Rejection]:** `HTTP 400 Bad Request` — Reschedule rejected when overlapping with existing booked appointment.
13. **TEST 13 [Level 2 Twist - Morning Outbox Reminders]:** `POST /clock` at 08:00 generates morning patient reminders in `GET /outbox`.
14. **TEST 14 [Level 3 Twist - Auto NO_SHOW Transition]:** `POST /clock` past `start_time + 30 min` automatically marks uncompleted appointments as `NO_SHOW` and logs outbox alerts.
