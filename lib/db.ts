import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

export const sql = neon(process.env.DATABASE_URL);

// Initialize table
export async function initDB() {
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
}

export type Timetable = {
  id: number;
  date: string;
  time_from: string;
  time_to: string;
  is_booking: boolean;
  booking_by: string;
  created_at: string;
  updated_at: string;
};

export type CreateTimetableInput = {
  date: string;
  time_from: string;
  time_to: string;
  is_booking?: boolean;
  booking_by?: string;
};

export type UpdateTimetableInput = Partial<CreateTimetableInput>;

// GET all
export async function getTimetables(date?: string): Promise<Timetable[]> {
  if (date) {
    const rows = await sql`
      SELECT id,
             date::text,
             time_from::text,
             time_to::text,
             is_booking,
             booking_by::text,
             created_at,
             updated_at
      FROM timetable
      WHERE date = ${date}::date
      ORDER BY time_from ASC
    `;
    return rows as Timetable[];
  }

  const rows = await sql`
    SELECT id,
           date::text,
           time_from::text,
           time_to::text,
           is_booking,
           booking_by::text,
           created_at,
           updated_at
    FROM timetable
    ORDER BY date ASC, time_from ASC
  `;
  return rows as Timetable[];
}

// GET by id
export async function getTimetableById(id: number): Promise<Timetable | null> {
  const rows = await sql`
    SELECT id,
           date::text,
           time_from::text,
           time_to::text,
           is_booking,
           booking_by::text,
           created_at,
           updated_at
    FROM timetable WHERE id = ${id}
  `;
  return (rows[0] as Timetable) ?? null;
}

// CREATE
export async function createTimetable(
  input: CreateTimetableInput,
): Promise<Timetable> {
  const rows = await sql`
    INSERT INTO timetable (date, time_from, time_to, is_booking)
    VALUES (
      ${input.date}::date,
      ${input.time_from}::time,
      ${input.time_to}::time,
      ${input.is_booking ?? false}
    )
    RETURNING id,
              date::text,
              time_from::text,
              time_to::text,
              is_booking,
              created_at,
              updated_at
  `;
  return rows[0] as Timetable;
}

// UPDATE
export async function updateTimetable(
  id: number,
  input: UpdateTimetableInput,
): Promise<Timetable | null> {
  const existing = await getTimetableById(id);
  if (!existing) return null;

  const rows = await sql`
    UPDATE timetable SET
      date       = ${input.date ?? existing.date}::date,
      time_from  = ${input.time_from ?? existing.time_from}::time,
      time_to    = ${input.time_to ?? existing.time_to}::time,
      is_booking = ${input.is_booking ?? existing.is_booking},
      booking_by = ${input.booking_by ?? existing.booking_by},
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING id,
              date::text,
              time_from::text,
              time_to::text,
              is_booking,
              created_at,
              updated_at
  `;
  return rows[0] as Timetable;
}

// DELETE timetable
export async function deleteTimetable(id: number): Promise<boolean> {
  const rows = await sql`
    DELETE FROM timetable WHERE id = ${id} RETURNING id
  `;
  return rows.length > 0;
}
