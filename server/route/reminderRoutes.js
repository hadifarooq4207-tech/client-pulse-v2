/**
 * routes/reminderRoutes.js
 * /api/reminders routes
 * - schedule reminders
 * - run-now
 * - list reminders
 * Scheduler loop (server-side) will be created here.
 */

const express = require('express');
const router = express.Router();
const data = require('../utils/dataHelper');
const emailSvc = require('../utils/emailService');

// simple in-memory scheduling map for quick timers (works with both memory and firestore)
const activeTimers = new Map();

function msUntil(iso) {
  const t = new Date(iso).getTime() - Date.now();
  return t;
}

// attempt to schedule a single reminder (if soon)
function trySchedule(reminder) {
  // cancel existing
  if (activeTimers.has(reminder.id)) {
    clearTimeout(activeTimers.get(reminder.id));
    activeTimers.delete(reminder.id);
  }
  const ms = msUntil(reminder.datetimeISO);
  if (ms <= 0) return; // past due; scheduler loop handles it
  // schedule within reasonable limit (max 24h per setTimeout to avoid overflow) - safe for MVP
  const timeout = setTimeout(async () => {
    try {
      await sendReminder(reminder);
    } catch (err) {
      console.error('sendReminder error:', err);
    } finally {
      activeTimers.delete(reminder.id);
    }
  }, Math.min(ms, 24*60*60*1000));
  activeTimers.set(reminder.id, timeout);
}

// low-frequency poll: check DB for reminders that need scheduling
let POLL_RUNNING = false;
async function pollAndSchedule() {
  if (POLL_RUNNING) return;
  POLL_RUNNING = true;
  try {
    const rems = await data.listReminders();
    for (const r of rems) {
      if (r.status === 'scheduled') {
        // if due in next minute — schedule
        const ms = msUntil(r.datetimeISO);
        if (ms <= 60*1000 && ms > -60*1000) {
          // immediate/soon — schedule short timer
          trySchedule(r);
        } else if (ms > 60*1000 && ms < 24*60*60*1000) {
          trySchedule(r);
        }
      }
    }
  } catch (err) {
    console.error('pollAndSchedule err', err);
  } finally {
    POLL_RUNNING = false;
  }
}
// start polling loop
setInterval(() => pollAndSchedule().catch(err=>console.error(err)), 20*1000);

// send reminder helper
async function sendReminder(rem) {
  const client = await data.getClientById(rem.clientId);
  if (!client) {
    await data.updateReminder(rem.id, { status: 'failed' });
    await data.addLog({ type: 'Reminder', detail: `Client missing for reminder ${rem.id}` });
    return { ok: false, error: 'client missing' };
  }
  const subject = `Follow-up: ${client.name}`;
  const text = `Hi ${client.name},\n\n${rem.message}\n\n— Sent by ClientPulse`;
  const result = await emailSvc.sendEmail({ to: client.email, subject, text });
  if (result.ok) {
    await data.updateReminder(rem.id, { lastSentAt: new Date().toISOString() });
    if (rem.repeat === 'none') {
      await data.updateReminder(rem.id, { status: 'sent' });
    } else {
      // reschedule next occurrence in DB (daily/weekly)
      const next = new Date(rem.datetimeISO);
      if (rem.repeat === 'daily') next.setDate(next.getDate() + 1);
      if (rem.repeat === 'weekly') next.setDate(next.getDate() + 7);
      await data.updateReminder(rem.id, { datetimeISO: next.toISOString() });
      await data.addLog({ type: 'Reminder', detail: `Rescheduled ${rem.id} to ${next.toISOString()}` });
    }
    await data.addLog({ type: 'Send', detail: `Sent reminder ${rem.id} to ${client.email}` });
    return { ok: true };
  } else {
    await data.updateReminder(rem.id, { status: 'failed' });
    await data.addLog({ type: 'Send', detail: `Failed to send ${rem.id} to ${client.email}: ${result.error}` });
    return { ok: false, error: result.error };
  }
}

// GET / -> reminders list
router.get('/', async (req, res, next) => {
  try {
    const list = await data.listReminders();
    res.json(list);
  } catch (err) { next(err); }
});

// POST / -> add reminder { clientId, datetimeISO, message, repeat }
router.post('/', async (req, res, next) => {
  try {
    const { clientId, datetimeISO, message, repeat } = req.body || {};
    if (!clientId || !datetimeISO || !message) return res.status(400).json({ error: 'clientId, datetimeISO and message required' });
    const client = await data.getClientById(clientId);
    if (!client) return res.status(404).json({ error: 'client not found' });

    const dt = new Date(datetimeISO);
    if (isNaN(dt.getTime())) return res.status(400).json({ error: 'invalid date' });
    if (dt.getTime() < Date.now() - 60*1000) return res.status(400).json({ error: 'reminder must be in the future' });

    const rem = await data.addReminder({ clientId, datetimeISO: dt.toISOString(), message, repeat: ['none','daily','weekly'].includes(repeat) ? repeat : 'none' });
    await data.addLog({ type: 'Reminder', detail: `Scheduled reminder ${rem.id} for client ${client.email} at ${rem.datetimeISO}` });
    // try schedule immediately
    trySchedule(rem);
    res.json(rem);
  } catch (err) { next(err); }
});

// POST /run-now { reminderId }
router.post('/run-now', async (req, res, next) => {
  try {
    const { reminderId } = req.body || {};
    if (!reminderId) return res.status(400).json({ error: 'reminderId required' });
    const remList = await data.listReminders();
    const rem = remList.find(r => r.id === reminderId) || remList.find(r => r.id === String(reminderId));
    if (!rem) return res.status(404).json({ error: 'reminder not found' });
    const r = await sendReminder(rem);
    if (r.ok) return res.json({ ok: true });
    return res.status(500).json({ ok: false, error: r.error || 'send failed' });
  } catch (err) { next(err); }
});

module.exports = router;
