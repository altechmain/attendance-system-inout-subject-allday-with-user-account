const express = require('express');
const router = express.Router();
const db = require('../db');
const sendEmail = require('../sendEmail');

router.post('/mark', async (req, res) => {
  const { rfid_number, subject_id } = req.body;
  if (!rfid_number || !subject_id) {
    return res.status(400).json({ status: 'error', message: 'Missing RFID number or subject.' });
  }
  const now = new Date();
  const today = now.toISOString().slice(0, 10); // YYYY-MM-DD

  db.query('SELECT * FROM students WHERE rfid_number = ?', [rfid_number], (err, results) => {
    if (err) return res.status(500).json({ status: 'error', message: err.message || 'Internal server error' });
    if (results.length === 0) return res.status(404).send('Student not found');

    const student = results[0];
    const fullName = `${student.firstname} ${student.middle_initial ? student.middle_initial + '. ' : ''}${student.lastname}`;

    // Fetch subject name
    db.query('SELECT subject_description FROM subjects WHERE id = ?', [subject_id], (err, subjectRows) => {
      if (err) return res.status(500).json({ status: 'error', message: err.message || 'Internal server error' });
      if (subjectRows.length === 0) return res.status(404).send('Subject not found');
      const activeSubject = subjectRows[0].subject_description;

      // Check for today's attendance for this subject
      db.query(
        'SELECT * FROM attendance WHERE student_id = ? AND subject_id = ? AND date = ? ORDER BY id DESC LIMIT 1',
        [student.id, subject_id, today],
        (err, attendanceRows) => {
          if (err) return res.status(500).json({ status: 'error', message: err.message || 'Internal server error' });

          if (attendanceRows.length === 0 || attendanceRows[0].time_out !== null) {
            // TIME IN (new record)
            db.query(
              'INSERT INTO attendance (student_id, subject_id, date, time_in) VALUES (?, ?, ?, ?)',
              [student.id, subject_id, today, now],
              async (err) => {
                if (err) return res.status(500).json({ status: 'error', message: err.message || 'Internal server error' });

                const subject = `Time In Notification for ${fullName}`;
                const message = `Hello ${fullName},\n\nYou have timed IN at ${now.toLocaleString()}.\n\nActive Subject: ${activeSubject}\n\nIf this wasn't you, contact admin.`;
                const htmlMessage = `<p>Hello ${fullName},</p><p>You have <b>timed IN</b> at <b>${now.toLocaleString()}</b>.</p><br><strong>Active Subject:</strong> ${activeSubject}`;
                const sendAt = new Date(now.getTime() + 1 * 60000); // 1 minute later

                db.query(
                  'INSERT INTO pending_emails (to_email, subject, message, html_message, send_at, active_subject) VALUES (?, ?, ?, ?, ?, ?)',
                  [student.email, subject, message, htmlMessage, sendAt, activeSubject],
                  (err) => {
                    if (err) return res.status(500).json({ status: 'error', message: 'Time IN recorded but failed to queue email.' });
                    res.json({
                      status: 'success',
                      message: `Time IN recorded for ${fullName} at ${now.toLocaleString()}. Email will be sent in 1 minute.`,
                      type: 'IN',
                      time: now.toLocaleString(),
                      name: fullName
                    });
                  }
                );
              }
            );
          } else if (attendanceRows[0].time_out === null) {
            // TIME OUT (update last record)
            db.query(
              'UPDATE attendance SET time_out = ? WHERE id = ?',
              [now, attendanceRows[0].id],
              async (err) => {
                if (err) return res.status(500).json({ status: 'error', message: err.message || 'Internal server error' });

                const subject = `Time Out Notification for ${fullName}`;
                const message = `Hello ${fullName},\n\nYou have timed OUT at ${now.toLocaleString()}.\n\nActive Subject: ${activeSubject}\n\nIf this wasn't you, contact admin.`;
                const htmlMessage = `<p>Hello ${fullName},</p><p>You have <b>timed OUT</b> at <b>${now.toLocaleString()}</b>.</p><br><strong>Active Subject:</strong> ${activeSubject}`;
                const sendAt = new Date(now.getTime() + 1 * 60000); // 1 minute later

                db.query(
                  'INSERT INTO pending_emails (to_email, subject, message, html_message, send_at, active_subject) VALUES (?, ?, ?, ?, ?, ?)',
                  [student.email, subject, message, htmlMessage, sendAt, activeSubject],
                  (err) => {
                    if (err) return res.status(500).json({ status: 'error', message: 'Time OUT recorded but failed to queue email.' });
                    res.json({
                      status: 'success',
                      message: `Time OUT recorded for ${fullName} at ${now.toLocaleString()}. Email will be sent in 1 minute.`,
                      type: 'OUT',
                      time: now.toLocaleString(),
                      name: fullName
                    });
                  }
                );
              }
            );
          } else {
            // For attendance already complete
            res.status(400).json({ status: 'error', message: 'Attendance for this subject today is already complete.' });
          }
        }
      );
    });
  });
});

router.get('/report', (req, res) => {
  const { subject_id, date } = req.query;
  db.query(
    `SELECT s.lastname, s.firstname, s.middle_initial, s.course, s.id_number, a.time_in, a.time_out
     FROM attendance a
     JOIN students s ON a.student_id = s.id
     WHERE a.subject_id = ? AND a.date = ?
     ORDER BY s.lastname ASC, s.firstname ASC`,
    [subject_id, date],
    (err, rows) => {
      if (err) return res.status(500).json({ status: 'error', message: err.message });
      res.json(rows);
    }
  );
});

module.exports = router;
