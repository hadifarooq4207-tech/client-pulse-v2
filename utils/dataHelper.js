/**
 * utils/dataHelper.js
 * Abstract data access layer. Uses Firestore collections if firebase enabled,
 * otherwise uses an in-memory store. Exposes CRUD functions for clients, reminders, logs.
 *
 * Reminder structure:
 * {
 *   id: string,
 *   clientId: string,
 *   datetimeISO: string,
 *   message: string,
 *   repeat: 'none'|'daily'|'weekly',
 *   status: 'scheduled'|'sent'|'failed',
 *   createdAt: ISO,
 *   lastSentAt: ISO|null
 * }
 */

const { enabled, db } = require('../firebase');
const { v4: uuidv4 } = require('uuid');

if (!enabled) {
  // in-memory fallback
  const mem = {
    clients: [],
    reminders: [],
    logs: []
  };

  module.exports = {
    // clients
    async listClients() { return mem.clients.slice().reverse(); },
    async addClient({ name, email, phone = '', notes = '' }) {
      const c = { id: uuidv4(), name, email, phone, notes, createdAt: new Date().toISOString() };
      mem.clients.push(c); return c;
    },
    async getClientById(id) { return mem.clients.find(x => x.id === id) || null; },

    // reminders
    async listReminders() { return mem.reminders.slice().reverse(); },
    async addReminder(rem) {
      const r = Object.assign({ id: uuidv4(), status: 'scheduled', createdAt: new Date().toISOString(), lastSentAt: null }, rem);
      mem.reminders.push(r); return r;
    },
    async updateReminder(id, patch) {
      const idx = mem.reminders.findIndex(x => x.id === id); if (idx < 0) return null;
      mem.reminders[idx] = Object.assign(mem.reminders[idx], patch); return mem.reminders[idx];
    },

    // logs
    async addLog({ type, detail }) {
      const l = { id: uuidv4(), timeISO: new Date().toISOString(), type, detail };
      mem.logs.unshift(l); return l;
    },
    async listLogs(limit = 200) { return mem.logs.slice(0, limit); },

    async exportAll() {
      return { clients: mem.clients, reminders: mem.reminders, logs: mem.logs };
    }
  };

} else {
  // Firestore-backed implementation
  const clientsCol = db.collection('clients');
  const remindersCol = db.collection('reminders');
  const logsCol = db.collection('logs');

  module.exports = {
    async listClients() {
      const snap = await clientsCol.orderBy('createdAt', 'desc').get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },
    async addClient({ name, email, phone = '', notes = '' }) {
      const doc = { name, email, phone, notes, createdAt: new Date().toISOString() };
      const ref = await clientsCol.add(doc);
      return { id: ref.id, ...doc };
    },
    async getClientById(id) {
      const doc = await clientsCol.doc(id).get();
      if (!doc.exists) return null; return { id: doc.id, ...doc.data() };
    },

    async listReminders() {
      const snap = await remindersCol.orderBy('createdAt', 'desc').get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },
    async addReminder(rem) {
      const doc = Object.assign({ status: 'scheduled', createdAt: new Date().toISOString(), lastSentAt: null }, rem);
      const ref = await remindersCol.add(doc);
      return { id: ref.id, ...doc };
    },
    async updateReminder(id, patch) {
      await remindersCol.doc(id).set(patch, { merge: true });
      const doc = await remindersCol.doc(id).get();
      return { id: doc.id, ...doc.data() };
    },

    async addLog({ type, detail }) {
      const doc = { type, detail, timeISO: new Date().toISOString() };
      const ref = await logsCol.add(doc);
      return { id: ref.id, ...doc };
    },
    async listLogs(limit = 200) {
      const snap = await logsCol.orderBy('timeISO', 'desc').limit(limit).get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    async exportAll() {
      const [clientsSnap, remindersSnap, logsSnap] = await Promise.all([
        clientsCol.get(), remindersCol.get(), logsCol.get()
      ]);
      return {
        clients: clientsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        reminders: remindersSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        logs: logsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      };
    }
  };
    }
