/**
 * utils/emailService.js
 * Small wrapper around nodemailer. If SMTP env vars are present we'll create a transporter
 * otherwise functions simulate send and log the message.
 */

const nodemailer = require('nodemailer');
const helper = require('./dataHelper');

const SMTP_ENABLED = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

let transporter = null;
if (SMTP_ENABLED) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: (process.env.SMTP_SECURE === 'true') || false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });

  transporter.verify()
    .then(() => helper.addLog({ type: 'System', detail: 'SMTP verified — real email enabled' }))
    .catch(err => helper.addLog({ type: 'System', detail: `SMTP verify failed: ${err.message}` }));
} else {
  helper.addLog({ type: 'System', detail: 'No SMTP configured — emails will be simulated' });
}

async function sendEmail({ to, subject, text, html }) {
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: process.env.FROM_EMAIL || process.env.SMTP_USER,
        to, subject, text, html
      });
      await helper.addLog({ type: 'Email', detail: `Sent to ${to} (id ${info.messageId})` });
      return { ok: true, info };
    } catch (err) {
      await helper.addLog({ type: 'Email', detail: `Send failed to ${to}: ${err.message}` });
      return { ok: false, error: err.message };
    }
  } else {
    // simulated send
    await helper.addLog({ type: 'Email', detail: `Simulated send to ${to}: ${subject} / ${String(text).slice(0,120)}` });
    return { ok: true, simulated: true };
  }
}

module.exports = { sendEmail, SMTP_ENABLED };
