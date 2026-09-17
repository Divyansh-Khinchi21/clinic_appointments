const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initDB } = require('./src/config/db');
const seedData = require('./src/seed');

const authRoutes = require('./src/routes/auth');
const doctorRoutes = require('./src/routes/doctors');
const appointmentRoutes = require('./src/routes/appointments');
const statsRoutes = require('./src/routes/stats');
const clockRoutes = require('./src/routes/clock');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/stats', statsRoutes);

// Level 2 & 3 Twist Endpoints (POST /clock, GET /outbox)
app.use('/clock', clockRoutes);
app.use('/api/clock', clockRoutes);
app.use('/outbox', clockRoutes);
app.use('/api/outbox', clockRoutes);

// Fallback to index.html for SPA routing
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'API Endpoint Not Found' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize DB, seed data, and start server
const startServer = async () => {
  try {
    await initDB();
    await seedData();
    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(` 🏥 CarePulse Clinic Appointment Server is Running `);
      console.log(` 🚀 URL: http://localhost:${PORT}`);
      console.log(` ⏰ Level 2 /outbox & Level 3 /clock Enabled      `);
      console.log(` 👤 Student Allotted: Divyansh Khinchi (23ESKCS073)`);
      console.log(`====================================================`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
};

startServer();
