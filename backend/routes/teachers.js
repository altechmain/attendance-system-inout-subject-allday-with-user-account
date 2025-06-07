const express = require('express');
const db = require('../db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const sendEmail = require('../sendEmail');
const router = express.Router();

// In-memory store for reset tokens (for demo; use DB in production)
const resetTokens = {};

// Get teacher profile by teacher_id
router.get('/profile/:teacher_id', async (req, res) => {
  const { teacher_id } = req.params;
  try {
    const [rows] = await db.query(
      'SELECT firstname, lastname, email, account_id FROM teachers WHERE id = ?',
      [teacher_id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Teacher not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update teacher profile
router.post('/profile/update', async (req, res) => {
  const { teacher_id, firstname, lastname, email } = req.body;
  try {
    await db.query(
      'UPDATE teachers SET firstname = ?, lastname = ?, email = ? WHERE id = ?',
      [firstname, lastname, email, teacher_id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Change password
router.post('/profile/change-password', async (req, res) => {
  const { teacher_id, old_password, new_password } = req.body;
  try {
    // Get account_id for this teacher
    const [teacherRows] = await db.query('SELECT account_id FROM teachers WHERE id = ?', [teacher_id]);
    if (teacherRows.length === 0) return res.status(404).json({ error: 'Teacher not found' });
    const account_id = teacherRows[0].account_id;

    // Get current password hash
    const [accountRows] = await db.query('SELECT password_hash FROM accounts WHERE id = ?', [account_id]);
    if (accountRows.length === 0) return res.status(404).json({ error: 'Account not found' });

    const match = await bcrypt.compare(old_password, accountRows[0].password_hash);
    if (!match) return res.json({ success: false, message: 'Old password is incorrect.' });

    const new_hash = await bcrypt.hash(new_password, 10);
    await db.query('UPDATE accounts SET password_hash = ? WHERE id = ?', [new_hash, account_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Forgot password endpoint
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    // Find teacher by email
    const [rows] = await db.query('SELECT id, account_id, firstname FROM teachers WHERE email = ?', [email]);
    if (rows.length === 0) {
      // Always respond success for security
      return res.json({ success: true });
    }
    const teacher = rows[0];
    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    resetTokens[token] = { teacher_id: teacher.id, expires: Date.now() + 1000 * 60 * 15 }; // 15 min

    // Build reset link
    const resetLink = `http://localhost:3000/reset-password.html?token=${token}`;

    // Send email using sendEmail.js
    await sendEmail(
      email,
      'Password Reset Request',
      `Hello ${teacher.firstname},\n\nClick the link below to reset your password:\n${resetLink}\n\nIf you did not request this, ignore this email.`,
      `<p>Hello ${teacher.firstname},</p>
      <p>Click the link below to reset your password:</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>If you did not request this, ignore this email.</p>`
    );

    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, message: 'Server error.' });
  }
});

// Reset password endpoint
router.post('/reset-password', async (req, res) => {
  const { token, new_password } = req.body;
  const entry = resetTokens[token];
  if (!entry || entry.expires < Date.now()) {
    return res.json({ success: false, message: 'Invalid or expired token.' });
  }
  try {
    // Get account_id for this teacher
    const [teacherRows] = await db.query('SELECT account_id FROM teachers WHERE id = ?', [entry.teacher_id]);
    if (teacherRows.length === 0) return res.json({ success: false, message: 'Teacher not found.' });
    const account_id = teacherRows[0].account_id;
    const new_hash = await bcrypt.hash(new_password, 10);
    await db.query('UPDATE accounts SET password_hash = ? WHERE id = ?', [new_hash, account_id]);
    delete resetTokens[token];
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;