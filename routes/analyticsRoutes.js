/**
 * routes/analyticsRoutes.js
 * Provides simple analytics: reminders sent per day, active clients count, failed sends.
 *
 * This is lightweight: data is aggregated from logs & reminders list.
 */

const express = require('express');
const router = express.Router();
const data = require('../utils/dataHelper');

router.get('/overview', async (req, res, next) => {
  try {
    const [clients, reminders, logs] = await Promise.all([data.listClients(), data.listReminders(), data.listLogs(500)]);
    const activeClients = clients.length;
    const totalReminders = reminders.length;
    const sent = reminders.filter(r => r.status === 'sent').length;
    const failed = reminders.filter(r => r.status === 'failed').length;

    // simple "sent per day" from logs (count Send entries per day)
    const sends = logs.filter(l => l.type === 'Send');
    const perDay = {};
    sends.forEach(s => {
      const day = new Date(s.timeISO).toISOString().slice(0,10);
      perDay[day] = (perDay[day]||0) + 1;
    });

    res.json({ activeClients, totalReminders, sent, failed, sentPerDay: perDay });
  } catch (err) { next(err); }
});

module.exports = router;q
