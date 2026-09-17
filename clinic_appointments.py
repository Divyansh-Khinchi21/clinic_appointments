"""
CarePulse — Clinic Appointment & Front-Desk Management System
Python 3 Reference Implementation for Auriga IT Round 2/3 Placement Assessment
Candidate: Divyansh Khinchi (Univ Roll: 23ESKCS073, SKIT Jaipur)
Topic: clinic_appointments
"""

import sqlite3

class ClinicSystem:
    def __init__(self, db_name="clinic_python.db"):
        self.conn = sqlite3.connect(db_name)
        self.create_tables()
        self.seed_doctors()

    def create_tables(self):
        """Initialize database schema for doctors and appointments."""
        with self.conn:
            self.conn.execute("""
                CREATE TABLE IF NOT EXISTS doctors (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    specialty TEXT NOT NULL,
                    fee REAL NOT NULL
                )
            """)
            self.conn.execute("""
                CREATE TABLE IF NOT EXISTS appointments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    doctor_id INTEGER NOT NULL,
                    patient_name TEXT NOT NULL,
                    patient_phone TEXT NOT NULL,
                    appointment_date TEXT NOT NULL,
                    time_slot TEXT NOT NULL,
                    status TEXT DEFAULT 'Confirmed',
                    cancellation_fee REAL DEFAULT 0,
                    is_emergency INTEGER DEFAULT 0,
                    FOREIGN KEY (doctor_id) REFERENCES doctors(id)
                )
            """)

    def seed_doctors(self):
        """Seed initial verified specialists."""
        cursor = self.conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM doctors")
        if cursor.fetchone()[0] == 0:
            doctors = [
                ("Dr. Rajesh Sharma", "Cardiology", 800),
                ("Dr. Priya Nair", "Dermatology", 600),
                ("Dr. Amit Verma", "Orthopedics", 750),
                ("Dr. Sneha Mathur", "Pediatrics", 500),
            ]
            cursor.executemany("INSERT INTO doctors (name, specialty, fee) VALUES (?, ?, ?)", doctors)
            self.conn.commit()

    # 1. CONFLICT-FREE BOOKING (STRICT DOUBLE BOOKING BLOCK)
    def book_appointment(self, doctor_id, patient_name, patient_phone, date_str, time_slot, is_emergency=False):
        cursor = self.conn.cursor()
        
        # Check if slot is already booked for this doctor
        cursor.execute("""
            SELECT id, patient_name FROM appointments 
            WHERE doctor_id = ? AND appointment_date = ? AND time_slot = ? AND status != 'Cancelled'
        """, (doctor_id, date_str, time_slot))
        
        existing = cursor.fetchone()
        if existing and not is_emergency:
            print(f"\n[DOUBLE-BOOKING BLOCKED] Doctor already has an appointment at {time_slot} on {date_str} (Booked by: {existing[1]}).")
            return False

        # Execute booking
        emergency_flag = 1 if is_emergency else 0
        cursor.execute("""
            INSERT INTO appointments (doctor_id, patient_name, patient_phone, appointment_date, time_slot, status, is_emergency)
            VALUES (?, ?, ?, ?, ?, 'Confirmed', ?)
        """, (doctor_id, patient_name, patient_phone, date_str, time_slot, emergency_flag))
        self.conn.commit()
        
        tag = " [EMERGENCY PRIORITY]" if is_emergency else ""
        print(f"\n[SUCCESS] Appointment booked for {patient_name} at {time_slot} on {date_str}.{tag}")
        return True

    # 2. FAIR CANCELLATION POLICY (FREE > 2 HOURS vs LATE CANCELLATION FEE RS 150)
    def cancel_appointment(self, appointment_id, hours_in_advance):
        cursor = self.conn.cursor()
        cursor.execute("SELECT a.id, a.patient_name, a.status, d.fee FROM appointments a JOIN doctors d ON a.doctor_id = d.id WHERE a.id = ?", (appointment_id,))
        appt = cursor.fetchone()

        if not appt:
            print(f"\n[ERROR] Appointment ID #{appointment_id} not found.")
            return

        if appt[2] == 'Cancelled':
            print(f"\n[NOTICE] Appointment #{appointment_id} is already cancelled.")
            return

        # Calculate late fee rule
        if hours_in_advance >= 2:
            late_fee = 0.0
            notice = "FREE Cancellation (in good time 2+ hours prior)."
        else:
            late_fee = 150.0  # Small late cancellation fee
            notice = "Late Cancellation Fee of Rs 150 applied (cancelled within 2 hours of slot)."

        cursor.execute("""
            UPDATE appointments 
            SET status = 'Cancelled', cancellation_fee = ? 
            WHERE id = ?
        """, (late_fee, appointment_id))
        self.conn.commit()

        print(f"\n[CANCELLED] Appointment #{appointment_id} cancelled.")
        print(f"Fee: Rs {late_fee} ({notice})")

    # 3. FRONT DESK: SEE A DOCTOR'S DAY SCHEDULE
    def view_doctor_day_schedule(self, doctor_id, date_str):
        cursor = self.conn.cursor()
        cursor.execute("SELECT name, specialty FROM doctors WHERE id = ?", (doctor_id,))
        doc = cursor.fetchone()
        if not doc:
            print("Doctor not found.")
            return

        print(f"\n=======================================================")
        print(f" DAY SCHEDULE GRID: {doc[0]} ({doc[1]}) -- Date: {date_str}")
        print(f"=======================================================")

        slots = ["09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM"]
        
        cursor.execute("""
            SELECT time_slot, patient_name, is_emergency FROM appointments 
            WHERE doctor_id = ? AND appointment_date = ? AND status != 'Cancelled'
        """, (doctor_id, date_str))
        bookings = {row[0]: (row[1], row[2]) for row in cursor.fetchall()}

        for slot in slots:
            if slot in bookings:
                p_name, is_em = bookings[slot]
                em_tag = " [EMERGENCY]" if is_em else ""
                print(f"  Slot {slot} --> [LOCKED/BOOKED] Patient: {p_name}{em_tag}")
            else:
                print(f"  Slot {slot} --> [AVAILABLE]")

    # 4. FRONT DESK: FIND PATIENT APPOINTMENT BY NAME
    def find_patient_appointment(self, patient_name):
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT a.id, a.patient_name, d.name, a.appointment_date, a.time_slot, a.status, a.cancellation_fee
            FROM appointments a 
            JOIN doctors d ON a.doctor_id = d.id
            WHERE a.patient_name LIKE ?
        """, (f"%{patient_name}%",))
        
        results = cursor.fetchall()
        print(f"\n[SEARCH RESULTS] Patient Name '{patient_name}':")
        if not results:
            print("  No appointments found.")
            return

        for r in results:
            fee_info = f" (Late Fee Charged: Rs {r[6]})" if r[6] > 0 else ""
            print(f"  * Appt #{r[0]}: {r[1]} with {r[2]} on {r[3]} @ {r[4]} [{r[5]}]{fee_info}")

# Demo Execution
if __name__ == "__main__":
    clinic = ClinicSystem()

    print("--- 1. BOOKING APPOINTMENTS ---")
    clinic.book_appointment(1, "Divyansh Khinchi", "9667066366", "2026-09-18", "10:00 AM")
    
    print("\n--- 2. ATTEMPTING DOUBLE-BOOKING ---")
    clinic.book_appointment(1, "Rohan Sharma", "9829012345", "2026-09-18", "10:00 AM")  # Blocked!

    print("\n--- 3. FRONT DESK DAY GRID VIEW ---")
    clinic.view_doctor_day_schedule(1, "2026-09-18")

    print("\n--- 4. FAIR CANCELLATION DEMO ---")
    clinic.cancel_appointment(1, hours_in_advance=1)  # Late cancellation -> Rs 150 fee

    print("\n--- 5. PATIENT LOOKUP SEARCH ---")
    clinic.find_patient_appointment("Divyansh")
