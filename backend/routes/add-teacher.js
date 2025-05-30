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

router.post('/add-teacher', async (req, res) => {
  const { firstname, lastname, email, username, password } = req.body;
  if (!firstname || !lastname || !email || !username || !password) {
    return res.json({ success: false, message: 'All fields are required.' });
  }

  try {
    const conn = await mysql.createConnection(dbConfig);

    // Check if username already exists in accounts
    const [userRows] = await conn.execute(
      'SELECT id FROM accounts WHERE username = ?',
      [username]
    );
    if (userRows.length > 0) {
      await conn.end();
      return res.json({ success: false, message: 'Username already exists.' });
    }

    // Check if email already exists in teachers
    const [emailRows] = await conn.execute(
      'SELECT id FROM teachers WHERE email = ?',
      [email]
    );
    if (emailRows.length > 0) {
      await conn.end();
      return res.json({ success: false, message: 'Email already exists.' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Insert into accounts
    const [accountResult] = await conn.execute(
      'INSERT INTO accounts (username, password_hash, role) VALUES (?, ?, ?)',
      [username, password_hash, 'teacher']
    );
    const account_id = accountResult.insertId;

    // Insert into teachers
    await conn.execute(
      'INSERT INTO teachers (firstname, lastname, email, account_id) VALUES (?, ?, ?, ?)',
      [firstname, lastname, email, account_id]
    );

    await conn.end();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;