import { NextRequest, NextResponse } from "next/server";
import { getTimetableById, updateTimetable, deleteTimetable } from "@/lib/db";

type Params = { params: { id: string } };

/**
 * GET /api/timetable/[id]
 * Returns a single timetable entry by ID
 */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const data = await getTimetableById(id);
    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error(`GET /api/timetable/${params.id} error:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/timetable/[id]
 * Body: { date?, time_from?, time_to?, is_booking? }
 * Updates a timetable entry (partial update supported)
 */
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id: rawId } = await params;
    const id = parseInt(rawId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const body = await request.json();
    const { date, time_from, time_to, is_booking, booking_by } = body;

    // Validate fields if provided
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 },
      );
    }

    if (
      (time_from && !/^\d{2}:\d{2}(:\d{2})?$/.test(time_from)) ||
      (time_to && !/^\d{2}:\d{2}(:\d{2})?$/.test(time_to))
    ) {
      return NextResponse.json(
        { error: "Invalid time format. Use HH:MM or HH:MM:SS" },
        { status: 400 },
      );
    }

    const updated = await updateTimetable(id, {
      date,
      time_from,
      time_to,
      is_booking,
      booking_by,
    });

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error(`PUT /api/timetable/${params.id} error:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/timetable/[id]
 * Deletes a timetable entry by ID
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const deleted = await deleteTimetable(id);
    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Timetable ${id} deleted`,
    });
  } catch (error) {
    console.error(`DELETE /api/timetable/${params.id} error:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
