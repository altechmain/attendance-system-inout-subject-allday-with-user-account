const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const sendEmail = require('../sendEmail');

const router = express.Router();

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'attendance_db'
};

const resetTokensAdmin = {};

// Login route
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // 1. Hardcoded superadmin login
  if (username === 'superadmin' && password === 'superadmin') {
    return res.json({ success: true, role: 'admin' });
  }

  try {
    const conn = await mysql.createConnection(dbConfig);

    // Find account by username
    const [accounts] = await conn.execute(
      'SELECT * FROM accounts WHERE username = ? LIMIT 1',
      [username]
    );

    if (accounts.length === 0) {
      await conn.end();
      return res.json({ success: false, message: 'Invalid username or password.' });
    }

    const account = accounts[0];
    const match = await bcrypt.compare(password, account.password_hash);

    if (!match) {
      await conn.end();
      return res.json({ success: false, message: 'Invalid username or password.' });
    }

    // If teacher, get teacher_id
    if (account.role === 'teacher') {
      const [teachers] = await conn.execute(
        'SELECT id FROM teachers WHERE account_id = ? LIMIT 1',
        [account.id]
      );
      await conn.end();
      if (teachers.length === 0) {
        return res.json({ success: false, message: 'Teacher profile not found.' });
      }
      return res.json({
        success: true,
        role: 'teacher',
        teacher_id: teachers[0].id
      });
    }

    // If admin
    await conn.end();
    return res.json({ success: true, role: 'admin' });

  } catch (err) {
    console.error(err);
    return res.json({ success: false, message: 'Server error.' });
  }
});

// Forgot password for admin
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  let conn;
  try {
    conn = await mysql.createConnection(dbConfig);
    // Find admin by email
    const [rows] = await conn.execute(
      `SELECT a.id, a.username, ad.email
       FROM accounts a
       JOIN admins ad ON ad.account_id = a.id
       WHERE ad.email = ? AND a.role = "admin" LIMIT 1`,
      [email]
    );
    if (rows.length === 0) {
      await conn.end();
      return res.json({ success: true });
    }
    const admin = rows[0];
    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    resetTokensAdmin[token] = { admin_id: admin.id, expires: Date.now() + 1000 * 60 * 15 }; // 15 min

    // Build reset link
    const resetLink = `http://localhost:3000/reset-password.html?token=${token}&admin=1`;

    // Send email using sendEmail.js
    await sendEmail(
      email,
      'Admin Password Reset Request',
      `Hello ${admin.username},\n\nClick the link below to reset your password:\n${resetLink}\n\nIf you did not request this, ignore this email.`,
      `<p>Hello ${admin.username},</p>
      <p>Click the link below to reset your password:</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>If you did not request this, ignore this email.</p>`
    );

    await conn.end();
    res.json({ success: true });
  } catch (err) {
    if (conn) await conn.end();
    console.error(err);
    res.json({ success: false, message: 'Server error.' });
  }
});

// Reset password for admin
router.post('/reset-password', async (req, res) => {
  const { token, new_password } = req.body;
  const entry = resetTokensAdmin[token];
  if (!entry || entry.expires < Date.now()) {
    return res.json({ success: false, message: 'Invalid or expired token.' });
  }
  try {
    const conn = await mysql.createConnection(dbConfig);
    const new_hash = await bcrypt.hash(new_password, 10);
    await conn.execute('UPDATE accounts SET password_hash = ? WHERE id = ?', [new_hash, entry.admin_id]);
    delete resetTokensAdmin[token];
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;