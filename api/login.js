import pool from "./db.js";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ error: "Missing credentials" });
  }

  try {
    const result = await pool.query(
      "SELECT id, password, full_name, status FROM users WHERE email = $1 AND role = $2",
      [email, role]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];
    
    // Check if account is active
    if (user.status === 'pending') {
      return res.status(403).json({ 
        error: "Account pending approval. Please wait for verification." 
      });
    }
    
    if (user.status === 'suspended') {
      return res.status(403).json({ 
        error: "Account suspended. Please contact support." 
      });
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    res.status(200).json({
      success: true,
      userId: user.id,
      fullName: user.full_name,
      role: role
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
}
