# 🧠 Engineering Thought Process & Implementation Reasoning

**Candidate Name:** Divyansh Khinchi  
**University Roll No:** 23ESKCS073  
**College:** Swami Keshvanand Institute of Technology (SKIT), Jaipur  
**Email:** b230538@skit.ac.in / divyanshkhinchi66@gmail.com  
**Assigned Problem:** `clinic_appointments`  
**Application Name:** CarePulse  
**Round:** Round 2 – AIR ("Builder" Round), Auriga IT Placement Drive 2026  

---

## 1. Problem Understanding & Spec Analysis

The core requirement of **`clinic_appointments`** is to solve front-desk scheduling friction in busy clinics:

1. **Conflict-Free Appointment Booking:** Never allow overlapping appointments for the same doctor on the same date.
2. **Fair Late-Cancellation Handling:**
   - Cancel > 2 hours before start time ➔ **₹0 fee**.
   - Cancel <= 2 hours before start time ➔ **₹100 fee**.
3. **Doctor Schedule Management:** Front desk must be able to view any doctor's daily appointments ordered by `start_time`.
4. **Patient Search & Pagination:** Instant patient search by name, with paginated (`page`, `limit`) and sorted (`sortBy`, `order`) API responses.

---

## 2. Key Architectural Decisions

### Tech Stack Selection
- **Backend:** Node.js + Express.js (High performance, clean RESTful endpoints).
- **Database:** SQLite3 (`database.sqlite`) with promisified async/await wrappers (`queryRun`, `queryGet`, `queryAll`). Chosen for zero external database server overhead in GitHub Codespaces.
- **Authentication:** JWT (`jsonwebtoken`) & `bcryptjs` password hashing with role support (`patient` vs `staff`).
- **Frontend:** Single Page Web Application (HTML5, Modern CSS Variables, Vanilla JavaScript SPA).

---

## 3. Database Schema Design

I designed six relational tables:
- `users`: `id`, `name`, `email` (UNIQUE), `password`, `role` (`patient`/`staff`), `phone`, `created_at`.
- `doctors`: `id`, `name`, `specialization`, `qualification`, `experience`, `fee`, `rating`, `clinic_address`, `city`, `created_at`.
- `appointments`: `id`, `doctor_id`, `patient_id`, `patient_name`, `patient_phone`, `appointment_date`, `start_time` (HH:MM), `end_time` (HH:MM), `symptoms`, `status` (`CONFIRMED`/`CANCELLED`/`COMPLETED`/`NO_SHOW`), `reminded_date`, `cancellation_fee`, `cancellation_reason`, `created_at`.
- `cancellations`: `id`, `appointment_id`, `cancelled_at`, `cancellation_fee`.
- `outbox`: `id`, `appointment_id`, `patient_id`, `patient_name`, `patient_phone`, `message`, `notification_type` (`REMINDER`/`NO_SHOW_ALERT`), `created_at`.
- `system_clock`: `id`, `simulated_timestamp`, `updated_at`.

---

## 4. Business Logic Implementation Details

### A. Backend Interval Overlap Logic (Double-Booking Prevention)
To prevent double-booking on the backend, I implemented mathematical interval-overlap checking:

An overlap between existing interval `(start_A, end_A)` and new interval `(start_B, end_B)` occurs if:
$$\text{start}_B < \text{end}_A \quad \text{AND} \quad \text{end}_B > \text{start}_A$$

In SQL (`src/routes/appointments.js`):
```sql
SELECT id, patient_name FROM appointments 
WHERE doctor_id = ? 
  AND appointment_date = ? 
  AND status = 'CONFIRMED'
  AND (start_time < ? AND end_time > ?)
```
- **Overlap Case (Test 2):** Existing `10:00 - 10:30` + New `10:15 - 10:45` ➔ Evaluates to `TRUE` (`10:15 < 10:30` AND `10:45 > 10:00`). Rejected with `400 Bad Request`.
- **Boundary Touch Case (Test 3):** Existing `10:00 - 10:30` + New `10:30 - 11:00` ➔ Evaluates to `FALSE` (`10:30 < 10:30` is False). Allowed!

### B. Level 1 Twist — Reschedule Appointment (T6 Lifecycle)
When rescheduling via `POST /api/appointments/:id/reschedule` or `PUT /api/appointments/:id`:
- Keeps `doctor_id` and `patient_id` unchanged.
- Re-executes the overlap query with `AND id != ?` so that the appointment being rescheduled does not conflict with its own current slot.
- Updates `appointment_date`, `start_time`, and `end_time` if conflict-free.

### C. Level 2 Twist — Morning Patient Reminders via Outbox (T1 Integrate)
When simulated clock is set or advanced via `POST /clock`:
- Finds all `CONFIRMED` appointments on the simulated date that haven't been reminded today.
- Generates a reminder message and inserts it into the `outbox` table (`notification_type = 'REMINDER'`).
- Outbox notifications are fetched via `GET /outbox` and rendered in the frontend outbox feed.

### D. Level 3 Twist — Automated 30-Min Post-Start NO_SHOW Transition (T2 Automation)
When simulated clock is advanced via `POST /clock`:
- Scans active `CONFIRMED` appointments.
- Compares simulated clock time against `start_time + 30 minutes`.
- If clock time >= `start_time + 30 min` and status is still `CONFIRMED` (i.e. patient did not check in or complete visit), auto-updates status to `NO_SHOW` and logs an alert message to `outbox`.

---

## 5. Testing & Verification Summary

All 14 test scenarios were executed via an automated test script (`scratch/test_suite.js`) against the live server:

1. **TEST 1 (Dr. Sharma 10:00-10:30 Patient A):** `HTTP 201 Created` — Confirmed.
2. **TEST 2 (Dr. Sharma 10:15-10:45 Patient B):** `HTTP 400 Bad Request` — REJECTED (Overlap).
3. **TEST 3 (Dr. Sharma 10:30-11:00 Patient B):** `HTTP 201 Created` — ALLOWED (Boundary touch).
4. **TEST 4 (Dr. Mehta 10:15-10:45 Patient C):** `HTTP 201 Created` — ALLOWED (Different doctor).
5. **TEST 5 (Cancel >2h before):** `CANCELLED`, Fee = **₹0**.
6. **TEST 6 (Cancel <=2h before):** `CANCELLED`, Fee = **₹100**.
7. **TEST 7 (Patient Name Search):** Matching records returned.
8. **TEST 8 (Pagination `?page=1&limit=10`):** Paginated output with metadata.
9. **TEST 9 (Sorting `?sortBy=start_time&order=asc`):** Appointments ordered by start time.
10. **TEST 10 (Start time >= End time):** `HTTP 400 Bad Request` — Validation Error.
11. **TEST 11 [Level 1 Twist - Reschedule Slot]:** `HTTP 200 OK` — Appointment rescheduled to conflict-free time.
12. **TEST 12 [Level 1 Twist - Overlapping Reschedule Rejection]:** `HTTP 400 Bad Request` — Rejected when overlapping.
13. **TEST 13 [Level 2 Twist - Morning Outbox Reminders]:** `POST /clock` generates morning reminders in `GET /outbox`.
14. **TEST 14 [Level 3 Twist - Auto NO_SHOW Transition]:** `POST /clock` past `start_time + 30 min` marks `NO_SHOW`.

---

## 6. Problems Encountered & How They Were Fixed

### Problem 1: Express 5 Route Parsing Error
- **Symptom:** Server crashed on `app.get('*', ...)` with `PathError: Missing parameter name at index 1: *`.
- **Fix:** Replaced wildcard regex string with Express 5 middleware fallback `app.use((req, res) => ...)` to serve SPA index file cleanly.

### Problem 2: Reschedule Self-Conflict False Positive
- **Symptom:** Rescheduling an appointment to a overlapping range of its own original time failed.
- **Fix:** Added `AND id != ?` to SQL interval overlap check during reschedule operations.
