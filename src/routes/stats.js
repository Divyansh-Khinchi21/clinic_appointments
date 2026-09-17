const express = require('express');
const router = express.Router();
const { queryGet, queryAll } = require('../config/db');

// GET /api/stats/summary
router.get('/summary', async (req, res) => {
  try {
    const totalDoctors = await queryGet('SELECT COUNT(*) as count FROM doctors');
    const totalAppointments = await queryGet('SELECT COUNT(*) as count FROM appointments');
    const emergencyAppointments = await queryGet('SELECT COUNT(*) as count FROM appointments WHERE is_emergency = 1');
    const totalPatients = await queryGet('SELECT COUNT(*) as count FROM users WHERE role = ?', ['patient']);
    const specialtiesCount = await queryGet('SELECT COUNT(DISTINCT specialty) as count FROM doctors');

    res.json({
      success: true,
      stats: {
        totalDoctors: totalDoctors ? totalDoctors.count : 0,
        totalAppointments: totalAppointments ? totalAppointments.count : 0,
        emergencyAppointments: emergencyAppointments ? emergencyAppointments.count : 0,
        totalPatients: totalPatients ? totalPatients.count : 0,
        totalSpecialties: specialtiesCount ? specialtiesCount.count : 0
      }
    });
  } catch (error) {
    console.error('Fetch Stats Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch platform summary.' });
  }
});

// GET /api/stats/logs
router.get('/logs', async (req, res) => {
  try {
    const logs = await queryAll('SELECT * FROM system_logs ORDER BY timestamp DESC LIMIT 20');
    res.json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch logs.' });
  }
});

module.exports = router;
