const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const app = express();
const cors = require('cors');
const path = require('path');

// ADD THIS:
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'attendance_db'
};

//==========
const studentsRouter = require('./routes/students');
const attendanceRoutes = require('./routes/attendance');
const subjectsRouter = require('./routes/subjects');
const adminLoginRouter = require('./routes/admin-login');
const addAdminRouter = require('./routes/add-admin');
const addTeacherRouter = require('./routes/add-teacher');

require('./emailCron');

app.use(cors());
app.use(express.json());
app.use('/api/students', studentsRouter);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/subjects', subjectsRouter);
app.use('/api/admin', adminLoginRouter);
app.use('/api/admin', addAdminRouter);
app.use('/api/admin', addTeacherRouter);
//added to serve without using go live in vscode
// Serve static frontend files
//app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Serve frontend files (no directory listing)
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath, { index: false }));

// Block /frontend and /frontend/
app.get('/frontend', (req, res) => res.status(404).send('Not found'));
app.get('/frontend/', (req, res) => res.status(404).send('Not found'));

// Block any directory listing for any folder
app.use((req, res, next) => {
  if (req.path.match(/\/$/)) {
    return res.status(404).send('Not found');
  }
  next();
});
//==========


app.listen(3000, () => console.log('Server running on port 3000'));


