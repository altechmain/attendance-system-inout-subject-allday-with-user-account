const express = require('express');
const router = express.Router();
const db = require('../db');

// Register a new subject
router.post('/register', (req, res) => {
  const { subject_code, subject_description } = req.body;
  if (!subject_code || !subject_description) {
    return res.status(400).send('All fields are required.');
  }
  db.query(
    'INSERT INTO subjects (subject_code, subject_description) VALUES (?, ?)',
    [subject_code, subject_description],
    (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(409).send('Subject already exists.');
        }
        console.error('Database error:', err); // Log the actual error
        return res.status(500).send('Database error.');
      }
      res.send('Subject registered successfully.');
    }
  );
});

// Get all subjects
router.get('/', (req, res) => {
  const { code } = req.query;
  if (code) {
    db.query('SELECT * FROM subjects WHERE subject_code = ?', [code], (err, results) => {
      if (err) return res.status(500).send('Database error.');
      res.json(results);
    });
  } else {
    db.query('SELECT * FROM subjects', (err, results) => {
      if (err) return res.status(500).send('Database error.');
      res.json(results);
    });
  }
});

// Update an existing subject
router.post('/update', (req, res) => {
  const { id, subject_code, subject_description } = req.body;
  if (!id || !subject_code || !subject_description) {
    return res.status(400).send('Missing required fields.');
  }
  const sql = 'UPDATE subjects SET subject_code=?, subject_description=? WHERE id=?';
  db.query(sql, [subject_code, subject_description, id], (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).send('Subject code already exists.');
      }
      return res.status(500).send('Database error.');
    }
    res.send('Subject updated successfully.');
  });
});

// Delete a subject by id
router.delete('/delete/:id', (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM subjects WHERE id = ?', [id], (err, result) => {
    if (err) {
      // Handle foreign key constraint error
      if (err.code === 'ER_ROW_IS_REFERENCED_2' || (err.errno === 1451)) {
        return res.status(409).send('Cannot delete subject: it is still referenced by attendance records.');
      }
      console.error('Delete error:', err);
      return res.status(500).send('Database error.');
    }
    if (result.affectedRows === 0) {
      return res.status(404).send('Subject not found.');
    }
    res.send('Subject deleted successfully.');
  });
});

module.exports = router;