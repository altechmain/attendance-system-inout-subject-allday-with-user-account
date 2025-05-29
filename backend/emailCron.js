const cron = require('node-cron');
const db = require('./db');
const sendEmail = require('./sendEmail');

cron.schedule('* * * * *', () => {
  // Runs every minute
  const now = new Date();
  db.query(
    'SELECT * FROM pending_emails WHERE sent = 0 AND send_at <= ?',
    [now],
    async (err, emails) => {
      if (err) return console.error('Cron DB error:', err);
      for (const email of emails) {
        try {
          await sendEmail(email.to_email, email.subject, email.message, email.html_message);
          db.query('UPDATE pending_emails SET sent = 1 WHERE id = ?', [email.id]);
        } catch (e) {
          console.error('Failed to send queued email:', e);
        }
      }
    }
  );
});

console.log('Email cron job started.');