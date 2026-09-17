const express = require('express');
const router = express.Router();
const { queryAll, queryGet, queryRun } = require('../config/db');

// Helper to parse date string + HH:MM time string into Date object
const parseDateTime = (dateStr, timeStr) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0);
};

// POST /clock and POST /api/clock — ADVANCE SIMULATED CLOCK & TRIGGER TWIST JOBS
router.post('/', async (req, res) => {
  try {
    const { timestamp, date, time } = req.body;
    let clockDateObj;

    if (timestamp) {
      clockDateObj = new Date(timestamp);
    } else if (date && time) {
      clockDateObj = parseDateTime(date, time);
    } else if (date) {
      clockDateObj = parseDateTime(date, '08:00');
    } else {
      clockDateObj = new Date();
    }

    if (isNaN(clockDateObj.getTime())) {
      clockDateObj = new Date();
    }

    const isoClockStr = clockDateObj.toISOString();
    const currentDateStr = clockDateObj.toISOString().split('T')[0];

    // Save/Update simulated clock
    await queryRun('DELETE FROM system_clock');
    await queryRun('INSERT INTO system_clock (simulated_timestamp) VALUES (?)', [isoClockStr]);

    let remindersGenerated = 0;
    let noShowsMarked = 0;

    // =========================================================================
    // LEVEL 2 — T1 (integrate): MORNING PATIENT REMINDERS VIA OUTBOX
    // =========================================================================
    // Find all CONFIRMED appointments for current simulated date that haven't been reminded
    const morningAppts = await queryAll(
      `SELECT a.*, d.name as doctor_name 
       FROM appointments a 
       JOIN doctors d ON a.doctor_id = d.id 
       WHERE a.appointment_date = ? 
         AND a.status = 'CONFIRMED' 
         AND (a.reminded_date IS NULL OR a.reminded_date != ?)`,
      [currentDateStr, currentDateStr]
    );

    for (const app of morningAppts) {
      const reminderMsg = `Reminder: Hello ${app.patient_name}, you have a clinic appointment today (${app.appointment_date}) with Dr. ${app.doctor_name} at ${app.start_time} - ${app.end_time}.`;
      
      await queryRun(
        `INSERT INTO outbox (appointment_id, patient_id, patient_name, patient_phone, message, notification_type) 
         VALUES (?, ?, ?, ?, ?, 'REMINDER')`,
        [app.id, app.patient_id, app.patient_name, app.patient_phone, reminderMsg]
      );

      await queryRun('UPDATE appointments SET reminded_date = ? WHERE id = ?', [currentDateStr, app.id]);
      remindersGenerated++;
    }

    // =========================================================================
    // LEVEL 3 — T2 (automation): AUTO NO-SHOW 30-MIN POST-START JOB
    // =========================================================================
    // Find all CONFIRMED appointments where clock time >= (start_time + 30 min)
    const activeAppts = await queryAll(
      `SELECT a.*, d.name as doctor_name 
       FROM appointments a 
       JOIN doctors d ON a.doctor_id = d.id 
       WHERE a.status = 'CONFIRMED'`
    );

    for (const app of activeAppts) {
      const startDateTime = parseDateTime(app.appointment_date, app.start_time);
      const noShowCutoffTime = new Date(startDateTime.getTime() + 30 * 60 * 1000); // start + 30 mins

      // If clock advanced past start_time + 30 min and not completed
      if (clockDateObj >= noShowCutoffTime) {
        await queryRun('UPDATE appointments SET status = ? WHERE id = ?', ['NO_SHOW', app.id]);

        const alertMsg = `NO_SHOW ALERT: Appointment #${app.id} for ${app.patient_name} with Dr. ${app.doctor_name} starting at ${app.start_time} was auto-marked as NO_SHOW (30+ min post start).`;

        await queryRun(
          `INSERT INTO outbox (appointment_id, patient_id, patient_name, patient_phone, message, notification_type) 
           VALUES (?, ?, ?, ?, ?, 'NO_SHOW_ALERT')`,
          [app.id, app.patient_id, app.patient_name, app.patient_phone, alertMsg]
        );

        await queryRun('INSERT INTO system_logs (action, details) VALUES (?, ?)', [
          'AUTOMATED_NO_SHOW',
          alertMsg
        ]);

        noShowsMarked++;
      }
    }

    res.json({
      success: true,
      clock: isoClockStr,
      simulated_date: currentDateStr,
      reminders_generated: remindersGenerated,
      no_shows_marked: noShowsMarked
    });
  } catch (error) {
    console.error('Clock advance error:', error);
    res.status(500).json({ success: false, message: 'Clock processing error.' });
  }
});

// GET /outbox and GET /api/outbox — RETURN ALL NOTIFICATION OUTBOX ITEMS
const handleGetOutbox = async (req, res) => {
  try {
    const outboxItems = await queryAll('SELECT * FROM outbox ORDER BY id ASC');
    res.json({
      success: true,
      count: outboxItems.length,
      outbox: outboxItems
    });
  } catch (error) {
    console.error('Fetch outbox error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch outbox items.' });
  }
};

router.get('/', handleGetOutbox);
router.get('/outbox', handleGetOutbox);

module.exports = router;
