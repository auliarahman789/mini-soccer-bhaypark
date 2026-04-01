// scripts/migrate.js
// Run: node scripts/migrate.js
// Make sure DATABASE_URL is set in your environment

import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
dotenv.config({ path: ".env" });

async function migrate() {
  if (!process.env.DATABASE_URL) {
    console.error("❌  DATABASE_URL is not set in .env");
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);

  console.log("🚀  Running migrations...");

  try {
    // ── timetable ──────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS timetable (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        time_from TIME NOT NULL,
        time_to TIME NOT NULL,
        is_booking BOOLEAN NOT NULL DEFAULT false,
        booking_by TEXT,
        phone_number TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log("✅  Table 'timetable' is ready.");

    // ── users ──────────────────────────────────────────────────
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log("✅  Table 'users' is ready.");

    // ── Seed admin ─────────────────────────────────────────────
    const existing = await sql`SELECT id FROM users WHERE username = 'admin'`;
    if (existing.length === 0) {
      const hash = await bcrypt.hash("admin123", 10);
      await sql`
        INSERT INTO users (username, password_hash)
        VALUES ('admin', ${hash})
      `;
      console.log(
        "🌱  Admin user seeded. (username: admin / password: admin123)",
      );
    } else {
      console.log("ℹ️   Admin user already exists, skipping seed.");
    }

    console.log("\n🎉  Migration complete!");
  } catch (err) {
    console.error("❌  Migration failed:", err.message);
    process.exit(1);
  }
}

migrate();
