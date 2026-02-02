import pool from "./db.js";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, password, role, fullName, phone, address } = req.body;

  // Validate required fields
  if (!email || !password || !role || !fullName || !phone) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  // Validate password strength
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  try {
    // Check if user already exists
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rowCount > 0) {
      return res.status(409).json({ error: "Email already registered" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert new user
    const result = await pool.query(
      `INSERT INTO users (email, password, role, full_name, phone, address, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
       RETURNING id, email, role, full_name`,
      [email, hashedPassword, role, fullName, phone, address || null]
    );

    const user = result.rows[0];

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.full_name
      }
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Server error during registration" });
  }
}
