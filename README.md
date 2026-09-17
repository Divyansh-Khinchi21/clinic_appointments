# 🏥 CarePulse — Modern Clinic Appointment & Health Queue Platform

> **Auriga IT Campus Placement Drive 2026 — Round 2 ("Builder" Round)**  
> **Candidate Name:** Divyansh Khinchi  
> **University Roll No:** 23ESKCS073  
> **Email:** B230538@skit.ac.in / divyansh@skit.ac.in  
> **Allotted Problem Code:** `clinic_appointments`  

---

## 🌟 Executive Summary

**CarePulse** is a full-stack digital clinic appointment booking and real-time patient queue management platform. Built to solve the friction of traditional clinic walk-ins and phone calls, CarePulse allows patients to search verified medical specialists, filter by department, compare consultation fees, view live availability, and lock appointment slots seamlessly.

### 🚨 Real-World Twist: Emergency Priority Routing
To handle critical situations, CarePulse includes an **Emergency Priority Slot** system. Patients with urgent conditions can request emergency routing, which bypasses routine schedule slot locks, flags the patient card in high-priority red/orange triage, and logs an alert directly into the system logs for clinic front-desk visibility.

---

## 🛠️ Tech Stack Overview

- **Backend:** Node.js, Express.js (REST APIs, CORS, Middleware)
- **Database:** SQLite3 (`database.sqlite`) with relational schema & PRAGMA foreign keys
- **Authentication:** JSON Web Tokens (JWT) & `bcryptjs` password hashing
- **Frontend:** HTML5, Modern CSS3 (CSS Variables, Flexbox/Grid, Glassmorphism), Vanilla JavaScript SPA
- **Environment:** Compatible with GitHub Codespaces & Node v18+

---

## 🚀 How to Set Up, Run, and Debug

### 1. Prerequisites
- Node.js (v18.0.0 or higher)
- npm (v9.0.0 or higher)
- GitHub Account / GitHub Codespaces

### 2. Installation & Quick Start

```bash
# 1. Clone or open repository in GitHub Codespaces
git clone https://github.com/your-username/carepulse-aurigait.git
cd carepulse-aurigait

# 2. Install dependencies
npm install

# 3. Seed Database & Start Express Server
npm start
```

Once started, open your browser or GitHub Codespaces forwarded port preview at:
👉 **`http://localhost:3000`**

### 3. Debugging Commands
- **Check Server Logs:** Server outputs colored activity logs and SQLite errors in the terminal console.
- **Inspect DB Tables:** SQLite database file is generated automatically at `./database.sqlite`. You can inspect tables using `sqlite3 database.sqlite` or VS Code SQLite extension.
- **Re-seed Data:** Run `node src/seed.js` anytime to reset initial doctors and demo user data.

---

## 📋 Comprehensive REST API Reference

All API responses follow the standard JSON format: `{ "success": boolean, ... }`.

### 🔑 Authentication Endpoints

#### 1. `POST /api/auth/register`
Creates a new user account (Patient / Doctor).
- **Request Body:**
  ```json
  {
    "name": "Divyansh Khinchi",
    "email": "divyansh@skit.ac.in",
    "password": "password123",
    "phone": "+91 9667066366",
    "role": "patient"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Account created successfully!",
    "token": "<JWT_BEARER_TOKEN>",
    "user": { "id": 1, "name": "Divyansh Khinchi", "email": "divyansh@skit.ac.in", "role": "patient" }
  }
  ```

#### 2. `POST /api/auth/login`
Authenticates a user and returns a signed JWT token.
- **Request Body:**
  ```json
  {
    "email": "divyansh@skit.ac.in",
    "password": "password123"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "token": "<JWT_BEARER_TOKEN>",
    "user": { "id": 1, "name": "Divyansh Khinchi", "email": "divyansh@skit.ac.in" }
  }
  ```

#### 3. `GET /api/auth/me`
Retrieves the logged-in user profile.
- **Headers:** `Authorization: Bearer <JWT_TOKEN>`

---

### 👩‍⚕️ Doctor & Directory Endpoints

#### 4. `GET /api/doctors`
Searches, filters, sorts, and paginates verified doctors.
- **Query Parameters:**
  - `search` (optional): Keyword for doctor name, specialty, or clinic city (e.g. `Cardiology` or `Jaipur`).
  - `specialty` (optional): Filter by department (e.g. `Dermatology`, `Pediatrics`, or `All`).
  - `sortBy` (optional): `rating` | `fee` | `experience` | `name` (default: `rating`).
  - `order` (optional): `ASC` | `DESC` (default: `DESC`).
  - `page` (optional): Page number (default: `1`).
  - `limit` (optional): Doctors per page (default: `6`).
- **Sample Response:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 1,
        "name": "Dr. Rajesh Sharma",
        "specialty": "Cardiology",
        "qualification": "MBBS, MD, DM (Cardiology)",
        "experience": 15,
        "fee": 800,
        "rating": 4.9,
        "review_count": 124,
        "clinic_address": "Apex Heart Care Clinic, Malviya Nagar",
        "city": "Jaipur",
        "available_days": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
      }
    ],
    "pagination": {
      "totalRecords": 8,
      "totalPages": 2,
      "currentPage": 1,
      "limit": 6,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
  ```

#### 5. `GET /api/doctors/specialties/all`
Returns a list of all unique doctor specialties available in the database.

#### 6. `GET /api/doctors/:id`
Fetches full details for a specific doctor by ID.

---

### 📅 Appointment Endpoints

#### 7. `POST /api/appointments`
Books a new clinic consultation.
- **Headers:** `Authorization: Bearer <JWT_TOKEN>`
- **Request Body:**
  ```json
  {
    "doctor_id": 1,
    "patient_name": "Divyansh Khinchi",
    "patient_phone": "+91 9667066366",
    "appointment_date": "2026-09-18",
    "time_slot": "10:30 AM",
    "symptoms": "Routine BP checkup and ECG review.",
    "is_emergency": 0
  }
  ```

#### 8. `GET /api/appointments/my`
Retrieves all appointments belonging to the logged-in patient.
- **Headers:** `Authorization: Bearer <JWT_TOKEN>`

#### 9. `PATCH /api/appointments/:id/cancel`
Cancels an active appointment.
- **Headers:** `Authorization: Bearer <JWT_TOKEN>`

#### 10. `PATCH /api/appointments/:id/reschedule`
Reschedules an appointment to a new date and time slot.
- **Headers:** `Authorization: Bearer <JWT_TOKEN>`

---

### 📊 System Stats & Logs Endpoints

#### 11. `GET /api/stats/summary`
Returns real-time platform metrics (total doctors, departments, total bookings, emergency count).

#### 12. `GET /api/stats/logs`
Returns transparent system persistence activity logs.

---

## 📄 Mandatory Submitted Files Checklist

- [x] `README.md` — Setup, run instructions, API endpoints.
- [x] `REASONING.md` — Architecture decisions, problem analysis, debugging notes, testing methodology.
- [x] `AI_LOGS.md` — Complete conversation log with AI assistant.
