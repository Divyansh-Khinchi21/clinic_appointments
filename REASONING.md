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

I designed four relational tables:
- `users`: `id`, `name`, `email` (UNIQUE), `password`, `role` (`patient`/`staff`), `phone`, `created_at`.
- `doctors`: `id`, `name`, `specialization`, `qualification`, `experience`, `fee`, `rating`, `clinic_address`, `city`, `created_at`.
- `appointments`: `id`, `doctor_id`, `patient_id`, `patient_name`, `patient_phone`, `appointment_date`, `start_time` (HH:MM), `end_time` (HH:MM), `symptoms`, `status` (`CONFIRMED`/`CANCELLED`), `cancellation_fee`, `cancellation_reason`, `created_at`.
- `cancellations`: `id`, `appointment_id`, `cancelled_at`, `cancellation_fee`.

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

### B. Late Cancellation Fee Logic
When a cancellation request hits `POST /api/appointments/:id/cancel`:
1. The server parses `appointment_date` + `start_time` into a JavaScript `Date` object (`apptDateTime`).
2. Calculates `diffInHours = (apptDateTime - Date.now()) / (1000 * 60 * 60)`.
3. If `diffInHours > 2`: `cancellation_fee = 0`.
4. If `diffInHours <= 2`: `cancellation_fee = 100`.
5. Updates appointment status to `CANCELLED` (unblocking the slot) and logs a row in `cancellations`.

---

## 5. Testing & Verification Summary

All 10 test scenarios were executed via an automated test script (`scratch/test_suite.js`) against the live server:

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

---

## 6. Problems Encountered & How They Were Fixed

### Problem 1: Express 5 Route Parsing Error
- **Symptom:** Server crashed on `app.get('*', ...)` with `PathError: Missing parameter name at index 1: *`.
- **Fix:** Replaced wildcard regex string with Express 5 middleware fallback `app.use((req, res) => ...)` to serve SPA index file cleanly.

### Problem 2: UTF-8 Unicode Terminal Encoding on Windows
- **Symptom:** Printing emoji symbols in Python CLI caused `UnicodeEncodeError`.
- **Fix:** Replaced UTF-8 emojis with plain text tags (`[SUCCESS]`, `[ERROR]`, `[CANCELLED]`) for cross-platform terminal compatibility.
