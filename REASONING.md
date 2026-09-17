# 🧠 Engineering Thought Process & Reasoning Document

**Candidate Name:** Divyansh Khinchi  
**University Roll No:** 23ESKCS073  
**Email:** divyanshkhinchi66@gmail.com  
**College:** Swami Keshvanand Institute of Technology (SKIT), Jaipur  
**Assigned Problem:** `clinic_appointments`  
**Application Name:** CarePulse  
**Round:** Round 2 – AIR ("Builder" Round), Auriga IT Placement Drive 2026  

---

## 1. Analyzing the Official Spec & Problem Storyline

When reviewing the official Auriga IT problem assignment sheet for **`clinic_appointments`**, the core requirement was clear:

> *"The desk's frustrations are the spec — build it for any clinic. Get conflict-free booking and the cancellation rule right first, then the lookups."*

I broke this problem statement into four explicit implementation requirements:
1. **Never let two appointments for the same doctor overlap (Conflict-Free Booking):** Strict backend validation blocking any duplicate booking for the same doctor, date, and time slot.
2. **Fair Cancellation Policy (Free vs Late Fee):**
   - Cancelling in good time (more than 2 hours before the slot) ➔ **FREE (₹0 fee)**.
   - Late cancellation (within 2 hours of the slot) ➔ **Small ₹150 fee** to compensate the clinic/doctor.
3. **See a Doctor's Day Schedule:** Dedicated Front Desk Console displaying a doctor's full timeline for any given date, marking slots as `BOOKED` or `AVAILABLE`.
4. **Find a Patient's Appointment by Name:** Fast lookup search bar across patient names and phone numbers.

---

## 2. Technical Architecture & Database Schema

I built **CarePulse** as a modern Node.js + Express + SQLite + HTML5/CSS3/Vanilla JS single page application.

### SQLite Database Design
I updated `database.sqlite` with 4 relational tables:
- `users` (Authentication & roles: patient/doctor/admin)
- `doctors` (Directory, specialties, fees, clinic locations, qualifications)
- `appointments` (Patient ID, Doctor ID, Date, Slot, Symptoms, Emergency Flag, Status, `cancellation_fee`, `cancellation_reason`, `cancelled_at`)
- `system_logs` (Audit logging for conflict-free bookings and cancellation fees)

---

## 3. Implementation of Core Business Logic

### A. Conflict-Free Booking Validation
In `src/routes/appointments.js`, before executing any `INSERT` query into `appointments`, the backend performs a check:
```javascript
const existingAppt = await queryGet(
  'SELECT id, patient_name FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND time_slot = ? AND status != ?',
  [doctor_id, appointment_date, time_slot, 'Cancelled']
);
```
If an active appointment already exists, the server blocks the request with a `400 Bad Request` response:
> `🚫 DOUBLE-BOOKING PREVENTED: Dr. Rajesh Sharma already has a booked appointment at 10:00 AM on 2026-09-18.`

### B. Late Cancellation Fee Logic
When a patient or front desk cancels an appointment:
1. The backend parses `appointment_date` + `time_slot` into a JavaScript `Date` object (`slotDateTime`).
2. It calculates `diffInHours = (slotDateTime - Date.now()) / (1000 * 60 * 60)`.
3. If `diffInHours >= 2`, cancellation is **FREE (`cancellation_fee = 0`)**.
4. If `diffInHours < 2`, it applies a **₹150 late cancellation fee** and records the reason in SQLite.

### C. Front Desk Lookups
1. **Doctor's Day Schedule Grid:** `GET /api/appointments/doctor-day` generates a complete schedule matrix for the doctor on that date, showing open vs locked slots.
2. **Patient Lookup:** `GET /api/appointments/search` allows front desk receptionists to search appointments instantly by patient name or phone number.

---

## 4. Development Challenges & Debugging (How I Fixed Them)

### Challenge 1: Express 5 Wildcard Route Crash
- **Symptom:** Server threw `PathError: Missing parameter name at index 1: *` on launch.
- **Fix:** Replaced legacy `app.get('*', ...)` with `app.use((req, res) => ...)` middleware to properly fallback non-API routes to `index.html`.

### Challenge 2: Date & Time Parsing for Cancellation Calculation
- **Symptom:** Comparing ISO strings directly led to incorrect hours calculation when determining late cancellation fees.
- **Fix:** Built a helper `parseAppointmentDateTime(dateStr, timeSlotStr)` that converts strings like `"2026-09-18"` and `"10:00 AM"` into accurate native JavaScript timestamps for subtraction math.

---

## 5. Verification & Testing

1. **Conflict Testing:** Attempted to book two appointments for Dr. Rajesh Sharma at 10:00 AM on the same date. Verified that the 2nd booking was blocked with the double-booking error message.
2. **Cancellation Testing:** Cancelled a slot scheduled for the next day (verified ₹0 fee), then tested cancelling a slot within 1 hour (verified ₹150 late cancellation fee applied).
3. **Front Desk Lookups Testing:** Checked doctor day schedule grid for date 2026-09-18 and searched patient name "Divyansh" to confirm instant appointment retrieval.

---

## 6. Reflection

By prioritizing the core spec — **conflict-free booking, cancellation rules, and front-desk lookups** — I was able to deliver a robust, production-ready solution within the 2.5-hour constraint.
