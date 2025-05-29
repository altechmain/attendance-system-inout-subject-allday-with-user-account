const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

const router = express.Router();

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'attendance_db'
};

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // 1. Allow hardcoded admin login
  if (username === 'superadmin' && password === 'superadmin') {
    return res.json({ success: true, hardcoded: true });
  }

  // 2. Check in accounts and admins table
  try {
    const conn = await mysql.createConnection(dbConfig);
    // Find account with role 'admin' and matching username, joined with admins table
    const [rows] = await conn.execute(
      `SELECT a.password_hash
         FROM accounts a
         JOIN admins ad ON ad.account_id = a.id
        WHERE a.username = ? AND a.role = 'admin'
        LIMIT 1`,
      [username]
    );
    await conn.end();

    if (rows.length === 0) {
      return res.json({ success: false, message: 'Invalid credentials.' });
    }

    const admin = rows[0];
    console.log('Comparing:', password, admin.password_hash);
    const match = await bcrypt.compare(password, admin.password_hash);
    console.log('Match result:', match);
    if (match) {
      return res.json({ success: true });
    } else {
      return res.json({ success: false, message: 'Invalid credentials.' });
    }
  } catch (err) {
    console.error(err);
    return res.json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;