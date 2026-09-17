/*
 * CarePulse — Clinic Appointment & Front-Desk Management System
 * C++ Reference Implementation for Auriga IT Round 2/3 Technical Interview
 * Candidate: Divyansh Khinchi (Univ Roll: 23ESKCS073, SKIT Jaipur)
 * Topic: clinic_appointments
 */

#include <iostream>
#include <vector>
#include <string>
#include <map>
#include <algorithm>
#include <iomanip>

using namespace std;

// Data Structure for Doctor
struct Doctor {
    int id;
    string name;
    string specialty;
    double fee;
};

// Data Structure for Appointment
struct Appointment {
    int id;
    int doctor_id;
    string patient_name;
    string patient_phone;
    string date;
    string time_slot;
    string status; // "Confirmed", "Cancelled"
    double cancellation_fee;
    bool is_emergency;
};

// Clinic Front-Desk System Class
class ClinicSystem {
private:
    vector<Doctor> doctors;
    vector<Appointment> appointments;
    int next_appt_id = 1;

public:
    ClinicSystem() {
        // Seed Doctors
        doctors.push_back({1, "Dr. Rajesh Sharma", "Cardiology", 800.0});
        doctors.push_back({2, "Dr. Priya Nair", "Dermatology", 600.0});
        doctors.push_back({3, "Dr. Amit Verma", "Orthopedics", 750.0});
        doctors.push_back({4, "Dr. Sneha Mathur", "Pediatrics", 500.0});
    }

    // 1. CONFLICT-FREE BOOKING (STRICT DOUBLE BOOKING BLOCK)
    bool bookAppointment(int doc_id, string p_name, string p_phone, string date, string slot, bool is_emergency = false) {
        // Find doctor
        auto doc_it = find_if(doctors.begin(), doctors.end(), [doc_id](const Doctor& d) { return d.id == doc_id; });
        if (doc_it == doctors.end()) {
            cout << "\n[ERROR] Doctor ID " << doc_id << " not found.\n";
            return false;
        }

        // STRICT DOUBLE-BOOKING CHECK
        for (const auto& app : appointments) {
            if (app.doctor_id == doc_id && app.date == date && app.time_slot == slot && app.status != "Cancelled") {
                if (!is_emergency) {
                    cout << "\n[DOUBLE-BOOKING BLOCKED] Doctor " << doc_it->name 
                         << " already has a booked appointment at " << slot << " on " << date 
                         << " (Patient: " << app.patient_name << "). Double-booking is strictly prohibited!\n";
                    return false;
                }
            }
        }

        // Book slot
        Appointment app = {
            next_appt_id++,
            doc_id,
            p_name,
            p_phone,
            date,
            slot,
            "Confirmed",
            0.0,
            is_emergency
        };

        appointments.push_back(app);
        string em_tag = is_emergency ? " [EMERGENCY PRIORITY]" : "";
        cout << "\n[SUCCESS] Appointment #" << app.id << " booked for " << p_name 
             << " with " << doc_it->name << " at " << slot << " on " << date << em_tag << "\n";
        return true;
    }

    // 2. FAIR CANCELLATION POLICY (FREE > 2 HOURS vs LATE CANCELLATION FEE RS 150)
    void cancelAppointment(int appt_id, double hours_in_advance) {
        for (auto& app : appointments) {
            if (app.id == appt_id) {
                if (app.status == "Cancelled") {
                    cout << "\n[NOTICE] Appointment #" << appt_id << " is already cancelled.\n";
                    return;
                }

                double late_fee = 0.0;
                string notice = "";

                if (hours_in_advance >= 2.0) {
                    late_fee = 0.0;
                    notice = "FREE Cancellation (made 2+ hours in advance).";
                } else {
                    late_fee = 150.0; // Late cancellation fee
                    notice = "Late Cancellation Fee of Rs 150 applied (cancelled within 2 hours of slot).";
                }

                app.status = "Cancelled";
                app.cancellation_fee = late_fee;

                cout << "\n[CANCELLED] Appointment #" << appt_id << " cancelled successfully.\n";
                cout << "Fee Charged: Rs " << fixed << setprecision(2) << late_fee << " (" << notice << ")\n";
                return;
            }
        }
        cout << "\n[ERROR] Appointment #" << appt_id << " not found.\n";
    }

    // 3. FRONT DESK: SEE A DOCTOR'S DAY SCHEDULE GRID
    void viewDoctorDaySchedule(int doc_id, string date) {
        auto doc_it = find_if(doctors.begin(), doctors.end(), [doc_id](const Doctor& d) { return d.id == doc_id; });
        if (doc_it == doctors.end()) {
            cout << "\nDoctor not found.\n";
            return;
        }

        cout << "\n=======================================================\n";
        cout << " DAY SCHEDULE GRID: " << doc_it->name << " (" << doc_it->specialty << ") -- Date: " << date << "\n";
        cout << "=======================================================\n";

        vector<string> standard_slots = {"09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM"};

        for (const auto& slot : standard_slots) {
            bool found = false;
            for (const auto& app : appointments) {
                if (app.doctor_id == doc_id && app.date == date && app.time_slot == slot && app.status != "Cancelled") {
                    string em = app.is_emergency ? " [EMERGENCY]" : "";
                    cout << "  Slot " << slot << " --> [LOCKED/BOOKED] Patient: " << app.patient_name << em << "\n";
                    found = true;
                    break;
                }
            }
            if (!found) {
                cout << "  Slot " << slot << " --> [AVAILABLE]\n";
            }
        }
    }

    // 4. FRONT DESK: FIND PATIENT APPOINTMENT BY NAME
    void findPatientAppointment(string query) {
        cout << "\n[SEARCH RESULTS] Searching for patient matching '" << query << "':\n";
        bool match_found = false;

        for (const auto& app : appointments) {
            if (app.patient_name.find(query) != string::npos || app.patient_phone.find(query) != string::npos) {
                match_found = true;
                auto doc_it = find_if(doctors.begin(), doctors.end(), [&](const Doctor& d) { return d.id == app.doctor_id; });
                string doc_name = (doc_it != doctors.end()) ? doc_it->name : "Unknown Doctor";

                string fee_str = (app.cancellation_fee > 0) ? " (Late Fee Charged: Rs " + to_string((int)app.cancellation_fee) + ")" : "";
                cout << "  * Appt #" << app.id << ": " << app.patient_name << " with " << doc_name 
                     << " on " << app.date << " @ " << app.time_slot << " [" << app.status << "]" << fee_str << "\n";
            }
        }

        if (!match_found) {
            cout << "  No matching patient appointments found.\n";
        }
    }
};

// Main Function Demonstration
int main() {
    ClinicSystem clinic;

    cout << "--- 1. BOOKING APPOINTMENTS ---\n";
    clinic.bookAppointment(1, "Divyansh Khinchi", "9667066366", "2026-09-18", "10:00 AM");

    cout << "\n--- 2. ATTEMPTING DOUBLE-BOOKING ---\n";
    clinic.bookAppointment(1, "Rohan Sharma", "9829012345", "2026-09-18", "10:00 AM"); // Blocked!

    cout << "\n--- 3. FRONT DESK DAY GRID VIEW ---\n";
    clinic.viewDoctorDaySchedule(1, "2026-09-18");

    cout << "\n--- 4. FAIR CANCELLATION DEMO ---\n";
    clinic.cancelAppointment(1, 1.0); // Late cancellation within 1 hour -> Rs 150 fee

    cout << "\n--- 5. PATIENT LOOKUP SEARCH ---\n";
    clinic.findPatientAppointment("Divyansh");

    return 0;
}
