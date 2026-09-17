const express = require('express');
const router = express.Router();
const { queryAll, queryGet } = require('../config/db');

// GET /api/doctors (List all doctors)
router.get('/', async (req, res) => {
  try {
    const { search = '', specialization = '' } = req.query;
    let whereClause = 'WHERE 1=1';
    let params = [];

    if (search.trim() !== '') {
      whereClause += ' AND (name LIKE ? OR specialization LIKE ? OR city LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    if (specialization.trim() !== '' && specialization !== 'All') {
      whereClause += ' AND specialization = ?';
      params.push(specialization.trim());
    }

    const doctors = await queryAll(`SELECT * FROM doctors ${whereClause} ORDER BY rating DESC`, params);
    res.json({ success: true, count: doctors.length, data: doctors });
  } catch (error) {
    console.error('Fetch Doctors Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch doctors.' });
  }
});

// GET /api/doctors/:id (Doctor Details)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const doctor = await queryGet('SELECT * FROM doctors WHERE id = ?', [id]);

    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found.' });
    }

    res.json({ success: true, doctor });
  } catch (error) {
    console.error('Fetch Doctor Error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching doctor.' });
  }
});

// GET /api/doctors/:id/appointments?date=YYYY-MM-DD (DOCTOR'S DAY VIEW ORDERED BY START_TIME)
router.get('/:id/appointments', async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ success: false, message: 'Query parameter date (YYYY-MM-DD) is required.' });
    }

    const doctor = await queryGet('SELECT id, name, specialization, fee FROM doctors WHERE id = ?', [id]);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found.' });
    }

    // Fetch all active/confirmed & cancelled appointments for this doctor on date, ordered by start_time
    const sql = `
      SELECT 
        a.id, 
        a.doctor_id,
        a.patient_id,
        a.patient_name,
        a.patient_phone,
        a.appointment_date,
        a.start_time,
        a.end_time,
        a.symptoms,
        a.status,
        a.cancellation_fee
      FROM appointments a
      WHERE a.doctor_id = ? AND a.appointment_date = ?
      ORDER BY a.start_time ASC
    `;

    const appointments = await queryAll(sql, [id, date]);

    res.json({
      success: true,
      doctor,
      date,
      count: appointments.length,
      appointments
    });
  } catch (error) {
    console.error('Doctor Day Schedule Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch doctor day schedule.' });
  }
});

module.exports = router;
