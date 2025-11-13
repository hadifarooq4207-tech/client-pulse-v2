// server/routes/admin.js
import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import { verifyAdmin } from "../middleware/verifyAdmin.js";

const router = express.Router();

// Mock database for admins and banned admins
let admins = [{ uid: process.env.MAIN_ADMIN_UID, name: "Main Admin" }];
let bannedAdmins = [];

// ✅ GET all admins
router.get("/admins", verifyToken, (req, res) => {
  const visibleAdmins = admins.map(admin => ({ uid: admin.uid, name: admin.name }));
  res.json({ admins: visibleAdmins });
});

// ✅ ADD admin (only main admin)
router.post("/admins/add", verifyToken, verifyAdmin, (req, res) => {
  const { uid, name } = req.body;
  if (!uid || !name) return res.status(400).json({ message: "UID and name required" });

  const exists = admins.find(admin => admin.uid === uid);
  if (exists) return res.status(400).json({ message: "Admin already exists" });

  admins.push({ uid, name });
  res.json({ message: "Admin added successfully", admins });
});

// ✅ REMOVE admin (only main admin)
router.post("/admins/remove", verifyToken, verifyAdmin, (req, res) => {
  const { uid } = req.body;
  if (!uid) return res.status(400).json({ message: "UID required" });

  if (uid === process.env.MAIN_ADMIN_UID) {
    return res.status(403).json({ message: "Cannot remove main admin" });
  }

  admins = admins.filter(admin => admin.uid !== uid);
  res.json({ message: "Admin removed successfully", admins });
});

// ✅ VIEW subscriptions (all admins can view)
router.get("/subscriptions", verifyToken, (req, res) => {
  // Mock example data, replace with Stripe API integration
  const subscriptions = [
    { user: "user1@gmail.com", plan: "Premium", status: "active" },
    { user: "user2@gmail.com", plan: "Premium", status: "active" },
  ];
  res.json({ subscriptions });
});

// ⚠ BAN admin (prepare for future)
router.post("/admins/ban", verifyToken, verifyAdmin, (req, res) => {
  const { uid } = req.body;
  if (!uid) return res.status(400).json({ message: "UID required" });

  bannedAdmins.push(uid);
  res.json({ message: `Admin ${uid} banned successfully`, bannedAdmins });
});

export default router;
