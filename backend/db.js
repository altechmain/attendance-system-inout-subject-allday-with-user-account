const mysql = require('mysql2');
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '', // change to your MySQL root password
  database: 'attendance_db'
});
connection.connect(err => {
  if (err) throw err;
  console.log('MySQL connected.');
});
module.exports = connection;
