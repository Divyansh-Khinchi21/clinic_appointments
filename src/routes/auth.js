const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { queryGet, queryRun } = require('../config/db');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required.' });
    }

    // Check if user already exists
    const existingUser = await queryGet('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userRole = role || 'patient';
    const userPhone = phone || '';

    const result = await queryRun(
      'INSERT INTO users (name, email, password, role, phone) VALUES (?, ?, ?, ?, ?)',
      [name.trim(), email.toLowerCase().trim(), hashedPassword, userRole, userPhone.trim()]
    );

    const user = {
      id: result.lastID,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      role: userRole,
      phone: userPhone.trim()
    };

    // Sign JWT
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });

    // Log registration
    await queryRun('INSERT INTO system_logs (action, details) VALUES (?, ?)', [
      'USER_REGISTER',
      `New user registered: ${user.email} (${user.name})`
    ]);

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user
    });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await queryGet('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const userPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone
    };

    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });

    // Log login
    await queryRun('INSERT INTO system_logs (action, details) VALUES (?, ?)', [
      'USER_LOGIN',
      `User logged in: ${user.email}`
    ]);

    res.json({
      success: true,
      message: 'Login successful!',
      token,
      user: userPayload
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await queryGet('SELECT id, name, email, role, phone, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching user profile.' });
  }
});

module.exports = router;
