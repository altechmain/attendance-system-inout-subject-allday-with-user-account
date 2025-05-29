const express = require('express');
const app = express();
const cors = require('cors');
//added to serve without using go live in vscode
const path = require('path');
//==========
const studentsRouter = require('./routes/students');
const attendanceRoutes = require('./routes/attendance');
const subjectsRouter = require('./routes/subjects');

require('./emailCron');

app.use(cors());
app.use(express.json());
app.use('/api/students', studentsRouter);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/subjects', subjectsRouter);
//added to serve without using go live in vscode
// Serve static frontend files
app.use(express.static(path.join(__dirname, 'frontend')));
//==========
app.listen(3000, () => console.log('Server running on port 3000'));
