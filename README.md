# 🏥 CarePulse — Conflict-Free Clinic Front-Desk Platform

> **Auriga IT Campus Placement Drive 2026 — Round 2 ("Builder" Round)**  
> **Candidate Name:** Divyansh Khinchi  
> **University Roll No:** 23ESKCS073  
> **College:** SKIT Jaipur (CSE)  
> **Email:** B230538@skit.ac.in / divyansh@skit.ac.in  
> **Allotted Problem Code:** `clinic_appointments`  

---

## 🌟 Executive Summary & Problem Specification Alignment

**CarePulse** is built directly from the official **`clinic_appointments`** problem specification provided by Auriga IT:

> *"A busy clinic with a few doctors. The front desk books patients into time slots, but keeps double-booking a doctor or letting two patients grab the same slot. Patients cancel — if they cancel in good time it's free, but a late cancellation should carry a small fee. The desk needs to see a doctor's day, find a patient's appointment by name, and never let two appointments for the same doctor overlap."*

### 🎯 Key Business Rules Implemented
1. **Conflict-Free Booking:** Strictly prevents double-booking a doctor or letting two patients grab the same time slot.
2. **Fair Cancellation Policy:**
   - **Cancellation in good time (2+ hours before slot):** **FREE (₹0 fee)**.
   - **Late cancellation (within 2 hours of slot):** **₹150 fee** applied to protect doctor schedule slots.
3. **Front Desk Lookups:**
   - **See a Doctor's Day Schedule:** Interactive daily timeline grid showing Booked vs Available slots.
   - **Find Patient Appointment by Name:** Instant search lookup by patient name or phone number.
4. **Emergency Priority Override:** Emergency triage slot reservation for urgent medical cases.

---

## 🛠️ Tech Stack & Architecture

- **Backend:** Node.js, Express.js (REST APIs, CORS, Middleware)
- **Database:** SQLite3 (`database.sqlite`) with relational schema & foreign key integrity
- **Authentication:** JSON Web Tokens (JWT) & `bcryptjs` password hashing
- **Frontend:** Single Page Web Application (HTML5, Modern CSS Variables, Flexbox/Grid, Vanilla JavaScript SPA)
- **Python Reference Script:** `clinic_appointments.py` (CLI script implementing double-booking prevention & late cancellation rules)

---

## 🚀 How to Set Up, Run, and Debug

```bash
# 1. Install dependencies
npm install

# 2. Seed Database & Start Server
npm start
```
Open in browser / GitHub Codespaces preview at:  
👉 **`http://localhost:3000`**

---

## 📋 Complete REST API Specification

### 1. Conflict-Free Booking: `POST /api/appointments`
- Checks if the doctor already has a booked slot at that date & time.
- If booked (and not an emergency), rejects with `400 Bad Request`: `"DOUBLE-BOOKING PREVENTED: Dr. [Name] already has a booked appointment at [Slot]."`

### 2. Fair Cancellation: `PATCH /api/appointments/:id/cancel`
- Compares slot date/time with current cancellation time.
- If > 2 hours in advance ➔ `cancellation_fee = 0` (*"Cancelled for FREE in good time"*).
- If ≤ 2 hours in advance ➔ `cancellation_fee = 150` (*"Late cancellation fee applied"*).

### 3. Front Desk - Doctor's Day Schedule: `GET /api/appointments/doctor-day?doctor_id=1&date=2026-09-18`
- Returns all daily slots (09:00 AM – 06:00 PM) for the selected doctor, indicating `BOOKED` (with patient details) or `AVAILABLE`.

### 4. Front Desk - Patient Lookup: `GET /api/appointments/search?query=Divyansh`
- Performs wildcard search across `patient_name` and `patient_phone`.

---

## 📄 Root Submission Files Checklist

- [x] `README.md` — Setup, run instructions, API endpoints, spec alignment.
- [x] `REASONING.md` — Architectural reasoning, problem analysis, debugging notes, written in candidate Divyansh Khinchi's natural humanized style.
- [x] `AI_LOGS.md` — Raw un-edited AI interaction log.
