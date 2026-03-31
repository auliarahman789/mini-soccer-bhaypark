import { NextRequest, NextResponse } from "next/server";
import {
  getTimetables,
  createTimetable,
  initDB,
} from "@/lib/db";

// Initialize DB on cold start
let dbInitialized = false;
async function ensureDB() {
  if (!dbInitialized) {
    await initDB();
    dbInitialized = true;
  }
}

/**
 * GET /api/timetable
 * Query params:
 *   - date: string (YYYY-MM-DD) — filter by date
 *
 * Returns array of timetable entries
 */
export async function GET(request: NextRequest) {
  try {
    await ensureDB();

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") ?? undefined;

    // Validate date format if provided
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    const data = await getTimetables(date);

    return NextResponse.json({
      success: true,
      data,
      count: data.length,
      filter: date ? { date } : null,
    });
  } catch (error) {
    console.error("GET /api/timetable error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/timetable
 * Body: { date, time_from, time_to, is_booking? }
 *
 * Creates a new timetable entry
 */
export async function POST(request: NextRequest) {
  try {
    await ensureDB();

    const body = await request.json();
    const { date, time_from, time_to, is_booking } = body;

    // Validation
    if (!date || !time_from || !time_to) {
      return NextResponse.json(
        { error: "date, time_from, and time_to are required" },
        { status: 400 }
      );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(time_from) || !/^\d{2}:\d{2}(:\d{2})?$/.test(time_to)) {
      return NextResponse.json(
        { error: "Invalid time format. Use HH:MM or HH:MM:SS" },
        { status: 400 }
      );
    }

    if (time_from >= time_to) {
      return NextResponse.json(
        { error: "time_from must be before time_to" },
        { status: 400 }
      );
    }

    const created = await createTimetable({
      date,
      time_from,
      time_to,
      is_booking: is_booking ?? false,
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    console.error("POST /api/timetable error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
