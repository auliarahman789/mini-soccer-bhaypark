import { sql } from "@/lib/db";
import bcrypt from "bcryptjs";

export type User = {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
};

// Create users table + seed default admin if empty
export async function initUsersDB() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `;

  // Seed default admin: username=admin password=admin123
  const existing = await sql`SELECT id FROM users WHERE username = 'admin'`;
  if (existing.length === 0) {
    const hash = await bcrypt.hash("admin123", 10);
    await sql`
      INSERT INTO users (username, password_hash)
      VALUES ('admin', ${hash})
    `;
  }
}

export async function getUserByUsername(
  username: string,
): Promise<User | null> {
  const rows = await sql`
    SELECT id, username, password_hash, created_at, updated_at
    FROM users WHERE username = ${username}
  `;
  return (rows[0] as User) ?? null;
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function changePassword(
  userId: number,
  newPassword: string,
): Promise<boolean> {
  const hash = await bcrypt.hash(newPassword, 10);
  const rows = await sql`
    UPDATE users SET password_hash = ${hash}, updated_at = NOW()
    WHERE id = ${userId}
    RETURNING id
  `;
  return rows.length > 0;
}
