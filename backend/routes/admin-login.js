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

module.exports = router;