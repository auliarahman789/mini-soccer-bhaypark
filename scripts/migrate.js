// scripts/migrate.js
// Run: node scripts/migrate.js
// Make sure DATABASE_URL is set in your environment

import { neon } from "@neondatabase/serverless";
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
    await sql`
      CREATE TABLE IF NOT EXISTS timetable (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        time_from TIME NOT NULL,
        time_to TIME NOT NULL,
        is_booking BOOLEAN NOT NULL DEFAULT false,
        booking_by TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    console.log("✅  Table 'timetable' is ready.");

    // // Seed sample data
    // const existing = await sql`SELECT COUNT(*) FROM timetable`;
    // if (parseInt(existing[0].count) === 0) {
    //   console.log("🌱  Seeding sample data...");
    //   const today = new Date().toISOString().slice(0, 10);
    //   await sql`
    //     INSERT INTO timetable (date, time_from, time_to, is_booking) VALUES
    //       (${today}::date, '08:00', '09:00', false),
    //       (${today}::date, '09:00', '10:00', true),
    //       (${today}::date, '10:00', '11:00', false),
    //       (${today}::date, '13:00', '14:00', true),
    //       (${today}::date, '14:00', '15:00', false)
    //   `;
    //   console.log("✅  Sample data seeded.");
    // }

    console.log("\n🎉  Migration complete!");
  } catch (err) {
    console.error("❌  Migration failed:", err.message);
    process.exit(1);
  }
}

migrate();
