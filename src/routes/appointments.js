const express = require('express');
const router = express.Router();
const { queryAll, queryGet, queryRun } = require('../config/db');
const { authenticateToken, optionalToken } = require('../middleware/auth');

// Helper to validate HH:MM time format
const isValidTimeFormat = (timeStr) => {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(timeStr);
};

// Helper to parse date string + HH:MM time string into Date object
const parseDateTime = (dateStr, timeStr) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0);
};

// 1. POST /api/appointments - BOOK APPOINTMENT WITH BACKEND INTERVAL OVERLAP LOGIC
router.post('/', optionalToken, async (req, res) => {
  try {
    const { doctor_id, patient_id, patient_name, patient_phone, appointment_date, start_time, end_time, symptoms } = req.body;

    const actualPatientId = req.user ? req.user.id : (patient_id || 1);

    if (!doctor_id || !patient_name || !appointment_date || !start_time || !end_time) {
      return res.status(400).json({
        success: false,
        message: 'doctor_id, patient_name, appointment_date, start_time (HH:MM), and end_time (HH:MM) are required.'
      });
    }

    if (!isValidTimeFormat(start_time) || !isValidTimeFormat(end_time)) {
      return res.status(400).json({
        success: false,
        message: 'Time format must be HH:MM in 24-hour format (e.g. 10:00, 10:30).'
      });
    }

    // RULE 5 & TEST 10: start_time must be earlier than end_time
    if (start_time >= end_time) {
      return res.status(400).json({
        success: false,
        message: 'Validation Error: start_time must be earlier than end_time.'
      });
    }

    // Verify Doctor existence
    const doctor = await queryGet('SELECT id, name, fee FROM doctors WHERE id = ?', [doctor_id]);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Selected doctor not found.' });
    }

    // RULE 1 & TESTS 1-4: BACKEND INTERVAL OVERLAP DETECTION
    // An overlap occurs if (new_start < existing_end AND new_end > existing_start) for same doctor & date
    const overlapSql = `
      SELECT id, patient_name, start_time, end_time 
      FROM appointments 
      WHERE doctor_id = ? 
        AND appointment_date = ? 
        AND status = 'CONFIRMED'
        AND (start_time < ? AND end_time > ?)
    `;

    const existingOverlap = await queryGet(overlapSql, [doctor_id, appointment_date, end_time, start_time]);

    if (existingOverlap) {
      return res.status(400).json({
        success: false,
        error: 'REJECTED_OVERLAP',
        message: `REJECTED: Appointment overlaps with an existing appointment for ${doctor.name} (${existingOverlap.start_time} - ${existingOverlap.end_time}, Patient: ${existingOverlap.patient_name}).`
      });
    }

    // Insert Appointment
    const result = await queryRun(
      `INSERT INTO appointments 
       (doctor_id, patient_id, patient_name, patient_phone, appointment_date, start_time, end_time, symptoms, status, cancellation_fee)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', 0)`,
      [
        doctor_id,
        actualPatientId,
        patient_name.trim(),
        patient_phone ? patient_phone.trim() : '',
        appointment_date,
        start_time,
        end_time,
        symptoms ? symptoms.trim() : ''
      ]
    );

    // Audit Log
    await queryRun('INSERT INTO system_logs (action, details) VALUES (?, ?)', [
      'BOOK_APPOINTMENT',
      `Appointment #${result.lastID} booked for ${patient_name} with ${doctor.name} on ${appointment_date} (${start_time} - ${end_time})`
    ]);

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully!',
      appointment: {
        id: result.lastID,
        doctor_id,
        doctor_name: doctor.name,
        patient_name,
        appointment_date,
        start_time,
        end_time,
        status: 'CONFIRMED'
      }
    });
  } catch (error) {
    console.error('Book Appointment Error:', error);
    res.status(500).json({ success: false, message: 'Server error while booking appointment.' });
  }
});

// 2. GET /api/appointments/search?patientName=... (PATIENT NAME SEARCH)
router.get('/search', async (req, res) => {
  try {
    const { patientName = '', query = '' } = req.query;
    const searchTerm = patientName || query;

    if (!searchTerm.trim()) {
      return res.status(400).json({ success: false, message: 'Query parameter patientName is required.' });
    }

    const sql = `
      SELECT 
        a.*, 
        d.name as doctor_name, 
        d.specialization as doctor_specialization,
        d.fee as doctor_fee,
        d.clinic_address
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      WHERE a.patient_name LIKE ?
      ORDER BY a.appointment_date DESC, a.start_time ASC
    `;

    const appointments = await queryAll(sql, [`%${searchTerm.trim()}%`]);
    res.json({ success: true, count: appointments.length, appointments });
  } catch (error) {
    console.error('Patient Search Error:', error);
    res.status(500).json({ success: false, message: 'Search failed.' });
  }
});

// 3. GET /api/appointments (PAGINATION & SORTING)
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = 'start_time',
      order = 'asc',
      patient_id = ''
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const offset = (pageNum - 1) * limitNum;

    let whereClause = 'WHERE 1=1';
    let params = [];

    if (patient_id) {
      whereClause += ' AND a.patient_id = ?';
      params.push(patient_id);
    }

    // Validate sort column to prevent SQL injection
    const allowedSortColumns = {
      start_time: 'a.start_time',
      appointment_date: 'a.appointment_date',
      patient_name: 'a.patient_name',
      doctor_name: 'd.name',
      status: 'a.status'
    };

    const validSortCol = allowedSortColumns[sortBy] || 'a.start_time';
    const validOrder = order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    // Count Total
    const countResult = await queryGet(`SELECT COUNT(*) as total FROM appointments a ${whereClause}`, params);
    const totalRecords = countResult ? countResult.total : 0;
    const totalPages = Math.ceil(totalRecords / limitNum);

    const dataSql = `
      SELECT 
        a.*, 
        d.name as doctor_name, 
        d.specialization as doctor_specialization,
        d.fee as doctor_fee,
        d.clinic_address
      FROM appointments a
      JOIN doctors d ON a.doctor_id = d.id
      ${whereClause}
      ORDER BY ${validSortCol} ${validOrder}, a.appointment_date ASC
      LIMIT ? OFFSET ?
    `;

    const appointments = await queryAll(dataSql, [...params, limitNum, offset]);

    res.json({
      success: true,
      data: appointments,
      pagination: {
        totalRecords,
        totalPages,
        currentPage: pageNum,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      },
      sorting: {
        sortBy,
        order: validOrder
      }
    });
  } catch (error) {
    console.error('Fetch Appointments Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch appointments.' });
  }
});

// 4. GET /api/appointments/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const sql = `
      SELECT a.*, d.name as doctor_name, d.specialization as doctor_specialization, d.fee as doctor_fee 
      FROM appointments a 
      JOIN doctors d ON a.doctor_id = d.id 
      WHERE a.id = ?
    `;
    const appt = await queryGet(sql, [id]);
    if (!appt) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }
    res.json({ success: true, appointment: appt });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch appointment.' });
  }
});

// 5. POST /api/appointments/:id/cancel - LATE CANCELLATION FEE LOGIC (RULE 6 & TESTS 5-6)
router.post('/:id/cancel', optionalToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const appointment = await queryGet('SELECT * FROM appointments WHERE id = ?', [id]);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }

    if (appointment.status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Appointment is already cancelled.' });
    }

    // Calculate time remaining until appointment start
    const apptDateTime = parseDateTime(appointment.appointment_date, appointment.start_time);
    const now = new Date();
    const diffInHours = (apptDateTime - now) / (1000 * 60 * 60);

    // RULE 6: > 2h = ₹0 fee; <= 2h = ₹100 fee
    let cancellationFee = 0;
    let feeNotice = '';

    if (diffInHours > 2) {
      cancellationFee = 0;
      feeNotice = 'Cancelled in good time (more than 2 hours before appointment). Cancellation fee = ₹0.';
    } else {
      cancellationFee = 100;
      feeNotice = 'Late cancellation (within 2 hours of appointment). Late cancellation fee = ₹100.';
    }

    // Update appointment status & fee
    await queryRun(
      'UPDATE appointments SET status = ?, cancellation_fee = ?, cancellation_reason = ? WHERE id = ?',
      ['CANCELLED', cancellationFee, reason || feeNotice, id]
    );

    // Insert into cancellations table
    await queryRun(
      'INSERT INTO cancellations (appointment_id, cancellation_fee) VALUES (?, ?)',
      [id, cancellationFee]
    );

    // Audit log
    await queryRun('INSERT INTO system_logs (action, details) VALUES (?, ?)', [
      'CANCEL_APPOINTMENT',
      `Appointment #${id} cancelled. Status = CANCELLED, Fee = ₹${cancellationFee}`
    ]);

    res.json({
      success: true,
      message: `Appointment cancelled. ${feeNotice}`,
      status: 'CANCELLED',
      cancellation_fee: cancellationFee,
      is_late_cancellation: diffInHours <= 2
    });
  } catch (error) {
    console.error('Cancel Appointment Error:', error);
    res.status(500).json({ success: false, message: 'Failed to process cancellation.' });
  }
});

// 6. PUT /api/appointments/:id
router.put('/:id', optionalToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { appointment_date, start_time, end_time, symptoms } = req.body;

    const appointment = await queryGet('SELECT * FROM appointments WHERE id = ?', [id]);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found.' });
    }

    if (start_time && end_time && start_time >= end_time) {
      return res.status(400).json({ success: false, message: 'Validation Error: start_time must be earlier than end_time.' });
    }

    const newDate = appointment_date || appointment.appointment_date;
    const newStart = start_time || appointment.start_time;
    const newEnd = end_time || appointment.end_time;

    // Check overlap if changing time/date
    const overlapSql = `
      SELECT id FROM appointments 
      WHERE doctor_id = ? AND appointment_date = ? AND status = 'CONFIRMED' AND id != ?
        AND (start_time < ? AND end_time > ?)
    `;

    const existingOverlap = await queryGet(overlapSql, [appointment.doctor_id, newDate, id, newEnd, newStart]);
    if (existingOverlap) {
      return res.status(400).json({ success: false, message: 'REJECTED: Overlaps with an existing appointment.' });
    }

    await queryRun(
      'UPDATE appointments SET appointment_date = ?, start_time = ?, end_time = ?, symptoms = ? WHERE id = ?',
      [newDate, newStart, newEnd, symptoms || appointment.symptoms, id]
    );

    res.json({ success: true, message: 'Appointment updated successfully.' });
  } catch (error) {
    console.error('Update Appointment Error:', error);
    res.status(500).json({ success: false, message: 'Failed to update appointment.' });
  }
});

module.exports = router;
