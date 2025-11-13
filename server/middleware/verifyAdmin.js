// server/middleware/verifyAdmin.js
import { getAuth } from "firebase-admin/auth";

// Main admin UID (replace with your Firebase UID)
const MAIN_ADMIN_UID = process.env.MAIN_ADMIN_UID;

export const verifyAdmin = async (req, res, next) => {
  try {
    const idToken = req.headers.authorization?.split("Bearer ")[1];
    if (!idToken) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decodedToken = await getAuth().verifyIdToken(idToken);
    req.user = decodedToken;

    if (decodedToken.uid !== MAIN_ADMIN_UID) {
      return res.status(403).json({ message: "Only main admin can perform this action" });
    }

    next();
  } catch (error) {
    console.error("verifyAdmin error:", error);
    return res.status(401).json({ message: "Unauthorized" });
  }
};
