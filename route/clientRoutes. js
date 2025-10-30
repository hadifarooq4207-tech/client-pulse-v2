/**
 * routes/clientRoutes.js
 * /api/clients routes
 */

const express = require('express');
const router = express.Router();
const data = require('../utils/dataHelper');

// GET / -> list clients
router.get('/', async (req, res, next) => {
  try {
    const list = await data.listClients();
    res.json(list);
  } catch (err) { next(err); }
});

// POST / -> add client
// body: { name, email, phone?, notes? }
router.post('/', async (req, res, next) => {
  try {
    const { name, email, phone, notes } = req.body || {};
    if (!name || !email) return res.status(400).json({ error: 'name and email required' });
    const client = await data.addClient({ name, email, phone, notes });
    await data.addLog({ type: 'Client', detail: `Added ${client.name} (${client.email})` });
    res.json(client);
  } catch (err) { next(err); }
});

module.exports = router;
