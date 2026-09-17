const express = require('express');
const router = express.Router();
const { queryAll, queryGet, queryRun } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// POST /api/appointments - Book Appointment
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { doctor_id, patient_name, patient_phone, appointment_date, time_slot, symptoms, is_emergency } = req.body;
    const patient_id = req.user.id;

    if (!doctor_id || !patient_name || !patient_phone || !appointment_date || !time_slot) {
      return res.status(400).json({
        success: false,
        message: 'Doctor ID, patient name, phone, appointment date and time slot are required.'
      });
    }

    // Verify Doctor exists
    const doctor = await queryGet('SELECT id, name FROM doctors WHERE id = ?', [doctor_id]);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Selected doctor not found.' });
    }

    // Check slot collision (if not emergency)
    if (!is_emergency) {
      const existingAppt = await queryGet(
        'SELECT id FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND time_slot = ? AND status != ?',
        [doctor_id, appointment_date, time_slot, 'Cancelled']
      );

      if (existingAppt) {
        return res.status(400).json({
          success: false,
          message: `Time slot ${time_slot} on ${appointment_date} is already booked for Dr. ${doctor.name}. Please select a different slot or select Emergency Priority.`
        });
      }
    }

    const emergencyFlag = is_emergency ? 1 : 0;

    const result = await queryRun(
      `INSERT INTO appointments 
       (patient_id, doctor_id, patient_name, patient_phone, appointment_date, time_slot, symptoms, is_emergency, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

    // Log action
    await queryRun('INSERT INTO system_logs (action, details) VALUES (?, ?)', [
      'BOOK_APPOINTMENT',
      `Appointment #${result.lastID} booked by ${patient_name} with Dr. ${doctor.name} for ${appointment_date} (${time_slot})${emergencyFlag ? ' [EMERGENCY PRIORITY]' : ''}`
    ]);

    res.status(201).json({
      success: true,
      message: emergencyFlag ? 'Emergency Priority Appointment Booked Successfully!' : 'Appointment Booked Successfully!',
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

// GET /api/appointments/my - Get user appointments
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
    res.status(500).json({ success: false, message: 'Failed to fetch appointments.' });
  }
});

// PATCH /api/appointments/:id/cancel
router.patch('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const patient_id = req.user.id;

    const appointment = await queryGet('SELECT * FROM appointments WHERE id = ? AND patient_id = ?', [id, patient_id]);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found or unauthorized.' });
    }

    if (appointment.status === 'Cancelled') {
      return res.status(400).json({ success: false, message: 'Appointment is already cancelled.' });
    }

    await queryRun('UPDATE appointments SET status = ? WHERE id = ?', ['Cancelled', id]);

    await queryRun('INSERT INTO system_logs (action, details) VALUES (?, ?)', [
      'CANCEL_APPOINTMENT',
      `Appointment #${id} cancelled by user ID ${patient_id}`
    ]);

    res.json({ success: true, message: 'Appointment cancelled successfully.' });
  } catch (error) {
    console.error('Cancel Appointment Error:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel appointment.' });
  }
});

// PATCH /api/appointments/:id/reschedule
router.patch('/:id/reschedule', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { appointment_date, time_slot } = req.body;
    const patient_id = req.user.id;

    if (!appointment_date || !time_slot) {
      return res.status(400).json({ success: false, message: 'New date and time slot are required.' });
    }

    const appointment = await queryGet('SELECT * FROM appointments WHERE id = ? AND patient_id = ?', [id, patient_id]);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found or unauthorized.' });
    }

    // Check conflict
    const existing = await queryGet(
      'SELECT id FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND time_slot = ? AND status != ? AND id != ?',
      [appointment.doctor_id, appointment_date, time_slot, 'Cancelled', id]
    );

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Slot ${time_slot} on ${appointment_date} is unavailable. Please select another.`
      });
    }

    await queryRun('UPDATE appointments SET appointment_date = ?, time_slot = ?, status = ? WHERE id = ?', [
      appointment_date,
      time_slot,
      'Confirmed',
      id
    ]);

    await queryRun('INSERT INTO system_logs (action, details) VALUES (?, ?)', [
      'RESCHEDULE_APPOINTMENT',
      `Appointment #${id} rescheduled to ${appointment_date} ${time_slot}`
    ]);

    res.json({ success: true, message: 'Appointment rescheduled successfully.' });
  } catch (error) {
    console.error('Reschedule Appointment Error:', error);
    res.status(500).json({ success: false, message: 'Failed to reschedule appointment.' });
  }
});

module.exports = router;
