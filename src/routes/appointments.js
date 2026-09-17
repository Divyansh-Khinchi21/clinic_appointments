const express = require('express');
const router = express.Router();
const { queryAll, queryGet, queryRun } = require('../config/db');
const { authenticateToken, optionalToken } = require('../middleware/auth');

// Helper to parse appointment date + time slot string into Date object
const parseAppointmentDateTime = (dateStr, timeSlotStr) => {
  try {
    // timeSlotStr format e.g. "10:00 AM" or "02:30 PM"
    const [time, modifier] = timeSlotStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);

    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;

    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day, hours, minutes, 0);
  } catch (e) {
    return new Date(dateStr);
  }
};

// 1. POST /api/appointments - CONFLICT-FREE BOOKING ENFORCEMENT
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { doctor_id, patient_name, patient_phone, appointment_date, time_slot, symptoms, is_emergency } = req.body;
    const patient_id = req.user.id;

    if (!doctor_id || !patient_name || !patient_phone || !appointment_date || !time_slot) {
      return res.status(400).json({
        success: false,
        message: 'Doctor ID, patient name, phone, date, and time slot are required.'
      });
    }

    // Verify Doctor exists
    const doctor = await queryGet('SELECT id, name, fee FROM doctors WHERE id = ?', [doctor_id]);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Selected doctor not found.' });
    }

    // STRICT DOUBLE BOOKING PREVENTION (Front Desk Rule #1)
    // Query if ANY active (non-cancelled) appointment exists for this doctor, date & time slot
    const existingAppt = await queryGet(
      'SELECT id, patient_name FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND time_slot = ? AND status != ?',
      [doctor_id, appointment_date, time_slot, 'Cancelled']
    );

    if (existingAppt && !is_emergency) {
      return res.status(400).json({
        success: false,
        message: `🚫 DOUBLE-BOOKING PREVENTED: Dr. ${doctor.name} already has a booked appointment at ${time_slot} on ${appointment_date} (Patient: ${existingAppt.patient_name}). Double-booking is strictly prohibited.`
      });
    }

    const emergencyFlag = is_emergency ? 1 : 0;

    const result = await queryRun(
      `INSERT INTO appointments 
       (patient_id, doctor_id, patient_name, patient_phone, appointment_date, time_slot, symptoms, is_emergency, status, cancellation_fee)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        patient_id,
        doctor_id,
        patient_name.trim(),
        patient_phone.trim(),
        appointment_date,
        time_slot,
        symptoms ? symptoms.trim() : '',
        emergencyFlag,
        'Confirmed'
      ]
    );

    // Audit log
    await queryRun('INSERT INTO system_logs (action, details) VALUES (?, ?)', [
      'CONFLICT_FREE_BOOKING',
      `Appointment #${result.lastID} booked for ${patient_name} with Dr. ${doctor.name} on ${appointment_date} at ${time_slot}${emergencyFlag ? ' [EMERGENCY OVERRIDE]' : ''}`
    ]);

    res.status(201).json({
      success: true,
      message: emergencyFlag ? '🚨 Emergency Priority Appointment Booked!' : '✅ Appointment Booked Successfully (Conflict-Free)!',
      appointment: {
        id: result.lastID,
        doctor_name: doctor.name,
        appointment_date,
        time_slot,
        is_emergency: emergencyFlag,
        status: 'Confirmed'
      }
    });
  } catch (error) {
    console.error('Book Appointment Error:', error);
    res.status(500).json({ success: false, message: 'Server error while booking appointment.' });
  }
});

// 2. PATCH /api/appointments/:id/cancel - FAIR CANCELLATION POLICY (FREE VS LATE FEE)
router.patch('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const patient_id = req.user.id;

    const appointment = await queryGet(
      'SELECT a.*, d.fee as doctor_fee, d.name as doctor_name FROM appointments a JOIN doctors d ON a.doctor_id = d.id WHERE a.id = ?',
      [id]
    );

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }

    if (appointment.status === 'Cancelled') {
      return res.status(400).json({ success: false, message: 'Appointment is already cancelled.' });
    }

    // CALCULATE LATE CANCELLATION RULE
    // Slot time vs current cancellation time
    const slotDateTime = parseAppointmentDateTime(appointment.appointment_date, appointment.time_slot);
    const now = new Date();
    const diffInHours = (slotDateTime - now) / (1000 * 60 * 60);

    let lateFee = 0;
    let feeNotice = '';

    // If cancelled less than 2 hours before the slot, apply a late cancellation fee of ₹150 (or 20% of fee)
    if (diffInHours < 2) {
      lateFee = Math.min(150, Math.round(appointment.doctor_fee * 0.25));
      if (lateFee === 0) lateFee = 100;
      feeNotice = `Late cancellation (within 2 hours of slot). A late cancellation fee of ₹${lateFee} has been charged.`;
    } else {
      lateFee = 0;
      feeNotice = `Cancelled in good time (more than 2 hours in advance). Cancellation is FREE (₹0 fee).`;
    }

    const cancelTimeStr = new Date().toISOString();

    await queryRun(
      'UPDATE appointments SET status = ?, cancellation_fee = ?, cancellation_reason = ?, cancelled_at = ? WHERE id = ?',
      ['Cancelled', lateFee, reason || feeNotice, cancelTimeStr, id]
    );

    await queryRun('INSERT INTO system_logs (action, details) VALUES (?, ?)', [
      'APPOINTMENT_CANCELLED',
      `Appointment #${id} for ${appointment.patient_name} cancelled. ${feeNotice}`
    ]);

    res.json({
      success: true,
      message: `Appointment Cancelled! ${feeNotice}`,
      cancellation_fee: lateFee,
      is_late_cancellation: diffInHours < 2,
      fee_notice: feeNotice
    });
  } catch (error) {
    console.error('Cancel Appointment Error:', error);
    res.status(500).json({ success: false, message: 'Failed to process cancellation.' });
  }
});

// 3. GET /api/appointments/doctor-day - FRONT DESK: SEE A DOCTOR'S DAY SCHEDULE
router.get('/doctor-day', async (req, res) => {
  try {
    const { doctor_id, date } = req.query;

    if (!doctor_id || !date) {
      return res.status(400).json({ success: false, message: 'Doctor ID and date are required.' });
    }

    const doctor = await queryGet('SELECT id, name, specialty, fee FROM doctors WHERE id = ?', [doctor_id]);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found.' });
    }

    // Standard clinic time slots for the day
    const standardSlots = [
      '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
      '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM'
    ];

    // Fetch active bookings for this doctor on this date
    const bookedAppts = await queryAll(
      'SELECT * FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND status != ?',
      [doctor_id, date, 'Cancelled']
    );

    // Map schedule grid
    const schedule = standardSlots.map((slot) => {
      const match = bookedAppts.find((a) => a.time_slot === slot);
      if (match) {
        return {
          time_slot: slot,
          status: 'BOOKED',
          patient_name: match.patient_name,
          patient_phone: match.patient_phone,
          symptoms: match.symptoms,
          is_emergency: match.is_emergency === 1,
          appointment_id: match.id
        };
      } else {
        return {
          time_slot: slot,
          status: 'AVAILABLE',
          patient_name: null
        };
      }
    });

    res.json({
      success: true,
      doctor,
      date,
      total_slots: standardSlots.length,
      booked_count: bookedAppts.length,
      available_count: standardSlots.length - bookedAppts.length,
      schedule
    });
  } catch (error) {
    console.error('Doctor Day Schedule Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch doctor day schedule.' });
  }
});

// 4. GET /api/appointments/search - FRONT DESK: FIND PATIENT APPOINTMENT BY NAME OR PHONE
router.get('/search', async (req, res) => {
  try {
    const { query = '' } = req.query;

    if (!query.trim()) {
      return res.status(400).json({ success: false, message: 'Search query is required.' });
    }

    const searchTerm = `%${query.trim()}%`;
    const sql = `
      SELECT 
        a.*, 
        d.name as doctor_name, 
        d.specialty as doctor_specialty, 
        d.clinic_address
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      WHERE a.patient_name LIKE ? OR a.patient_phone LIKE ?
      ORDER BY a.appointment_date DESC, a.created_at DESC
    `;

    const appointments = await queryAll(sql, [searchTerm, searchTerm]);
    res.json({ success: true, count: appointments.length, appointments });
  } catch (error) {
    console.error('Front Desk Patient Search Error:', error);
    res.status(500).json({ success: false, message: 'Search failed.' });
  }
});

// 5. GET /api/appointments/my - Get user logged-in appointments
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const patient_id = req.user.id;

    const sql = `
      SELECT 
        a.*, 
        d.name as doctor_name, 
        d.specialty as doctor_specialty, 
        d.fee as doctor_fee, 
        d.clinic_address,
        d.avatar as doctor_avatar
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      WHERE a.patient_id = ?
      ORDER BY a.appointment_date DESC, a.created_at DESC
    `;

    const appointments = await queryAll(sql, [patient_id]);
    res.json({ success: true, count: appointments.length, appointments });
  } catch (error) {
    console.error('Fetch My Appointments Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user appointments.' });
  }
});

module.exports = router;
