const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.hostinger.com', // Hostinger SMTP server
  port: 465,                  // or 587 for TLS
  secure: true,               // true for port 465, false for 587
  auth: {
    user: 'admin@ccsdepartment.com', // your Hostinger email
    pass: 'Block36Lot9@' // your Hostinger email password
  }
});

// Removed activeSubject parameter
function sendEmail(to, subject, text, html) {
  const mailOptions = {
    from: 'admin@ccsdepartment.com',
    to,
    subject,
    text,
    html,
    replyTo: 'admin@ccsdepartment.com',
    headers: {
      'X-Legit-Check': 'AttendanceSystem'
    }
  };
  return transporter.sendMail(mailOptions);
}

module.exports = sendEmail;