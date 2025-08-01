const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const upload = multer({ dest: 'uploads/' });

router.post('/upload', upload.single('csv'), (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded.');

  const teacher_id = req.body.teacher_id; // <-- get teacher_id from form
  if (!teacher_id) {
    fs.unlinkSync(req.file.path);
    return res.status(400).send('Teacher ID is required.');
  }

  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(csv(['id_number', 'rfid_number', 'lastname', 'firstname', 'middle_initial', 'course', 'email']))
    .on('data', (data) => results.push(data))
    .on('end', () => {
      const values = results.map(row => [
        row.id_number,
        row.rfid_number || null,
        row.lastname,
        row.firstname,
        row.middle_initial,
        row.course,
        row.email,
        teacher_id // <-- add teacher_id to each row
      ]);
      db.query(
        'INSERT IGNORE INTO students (id_number, rfid_number, lastname, firstname, middle_initial, course, email, teacher_id) VALUES ?',
        [values],
        (err, result) => {
          fs.unlinkSync(req.file.path); // Clean up
          if (err) return res.status(500).send('Database error.');
          res.send(`Students uploaded successfully. Total processed: ${values.length}, newly added: ${result.affectedRows}`);
        }
      );
    });
});

router.post('/register', (req, res) => {
  const { id_number, rfid_number, lastname, firstname, middle_initial, course, email } = req.body;
  if (!id_number || !lastname || !firstname || !middle_initial || !course || !email) {
    return res.status(400).json({ error: 'missing_fields', message: 'All fields except RFID number are required.' });
  }
  const sql = `INSERT INTO students (id_number, rfid_number, lastname, firstname, middle_initial, course, email)
               VALUES (?, ?, ?, ?, ?, ?, ?)`;
  const values = [id_number, rfid_number || null, lastname, firstname, middle_initial, course, email];
  db.query(sql, values, (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        if (err.sqlMessage && err.sqlMessage.includes('rfid_number')) {
          return res.status(409).json({ error: 'rfid_exists', message: 'RFID number already exists.' });
        }
        if (err.sqlMessage && err.sqlMessage.includes('id_number')) {
          return res.status(409).json({ error: 'id_exists', message: 'Student ID number already exists.' });
        }
        return res.status(409).json({ error: 'duplicate_entry', message: 'Duplicate entry.' });
      }
      return res.status(500).json({ error: 'db_error', message: 'Database error.' });
    }
    res.json({ success: true, message: 'Student registered successfully.' });
  });
});

router.post('/update', (req, res) => {
  const { id, rfid_number, id_number, lastname, firstname, middle_initial, course, email } = req.body;
  if (!id || !id_number || !lastname || !firstname || !course || !email) {
    return res.status(400).send('Missing required fields.');
  }
  const sql = `UPDATE students SET rfid_number=?, id_number=?, lastname=?, firstname=?, middle_initial=?, course=?, email=? WHERE id=?`;
  const values = [rfid_number || null, id_number, lastname, firstname, middle_initial, course, email, id];
  db.query(sql, values, (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        // Check which field is duplicated
        if (err.sqlMessage && err.sqlMessage.includes('rfid_number')) {
          return res.status(409).send('RFID number already exists.');
        }
        if (err.sqlMessage && err.sqlMessage.includes('id_number')) {
          return res.status(409).send('Student ID number already exists.');
        }
        return res.status(409).send('Duplicate entry.');
      }
      console.error('Update error:', err);
      return res.status(500).send('Database error.');
    }
    res.send('Student updated successfully.');
  });
});

router.delete('/delete/:id', (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM students WHERE id = ?', [id], (err, result) => {
    if (err) {
      // Check for foreign key constraint error
      if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.errno === 1451) {
        return res.status(409).send('Cannot delete this student because they have attendance records or related data. Please remove those records first.');
      }
      console.error('Delete error:', err);
      return res.status(500).send('Database error.');
    }
    if (result.affectedRows === 0) {
      return res.status(404).send('Student not found.');
    }
    res.send('Student deleted successfully.');
  });
});

// GET all students
router.get('/', (req, res) => {
  const { role, teacher_id } = req.query;
  let query = 'SELECT * FROM students';
  let params = [];
  if (role === 'teacher' && teacher_id) {
    query += ' WHERE teacher_id = ?';
    params.push(teacher_id);
  }
  db.query(query, params, (err, rows) => {
    if (err) return res.status(500).send('Database error.');
    res.json(rows);
  });
});

router.post('/add', (req, res) => {
  const { id_number, rfid_number, lastname, firstname, middle_initial, course, email, teacher_id } = req.body;
  db.query(
    'INSERT INTO students (id_number, rfid_number, lastname, firstname, middle_initial, course, email, teacher_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id_number, rfid_number, lastname, firstname, middle_initial, course, email, teacher_id],
    (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          if (err.sqlMessage && err.sqlMessage.includes('rfid_number')) {
            return res.status(409).send('RFID number already exists.');
          }
          if (err.sqlMessage && err.sqlMessage.includes('id_number')) {
            return res.status(409).send('Student ID number already exists.');
          }
          return res.status(409).send('Duplicate entry.');
        }
        return res.status(500).send('Database error.');
      }
      res.json({ success: true });
    }
  );
});

module.exports = router;
