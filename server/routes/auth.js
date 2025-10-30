// server/routes/auth.js
const express = require("express");
const admin = require("firebase-admin");
const router = express.Router();

// Verify Firebase ID token (sent by client)
router.post("/verify", async (req, res) => {
  const idToken = req.body.token;
  if (!idToken) {
    return res.status(400).json({ error: "No token provided" });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    res.status(200).json({ uid: decoded.uid, email: decoded.email });
  } catch (error) {
    console.error("Token verification failed:", error);
    res.status(401).json({ error: "Invalid or expired token" });
  }
});

module.exports = router;
