// server/routes/admin.js
const express = require("express");
const admin = require("firebase-admin");
const router = express.Router();

// Simple middleware to protect admin routes
const verifyAdmin = async (req, res, next) => {
  const idToken = req.headers.authorization?.split("Bearer ")[1];
  if (!idToken) return res.status(403).json({ error: "No token" });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const user = await admin.auth().getUser(decoded.uid);

    // Only allow users with a specific admin claim
    if (user.customClaims && user.customClaims.admin === true) {
      next();
    } else {
      res.status(403).json({ error: "Access denied" });
    }
  } catch (err) {
    console.error("Admin verification failed:", err);
    res.status(401).json({ error: "Unauthorized" });
  }
};

// Example admin-only endpoint
router.get("/stats", verifyAdmin, async (req, res) => {
  try {
    const listUsers = await admin.auth().listUsers(100);
    res.json({ totalUsers: listUsers.users.length });
  } catch (error) {
    res.status(500).json({ error: "Failed to load admin stats" });
  }
});

module.exports = router;
