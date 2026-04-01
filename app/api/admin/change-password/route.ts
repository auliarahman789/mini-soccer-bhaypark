import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getUserByUsername, verifyPassword, changePassword } from "@/lib/db-users";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Semua field wajib diisi" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Password baru minimal 6 karakter" },
        { status: 400 }
      );
    }

    const user = await getUserByUsername(session.username);
    if (!user) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    const valid = await verifyPassword(currentPassword, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "Password saat ini salah" }, { status: 401 });
    }

    await changePassword(user.id, newPassword);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/admin/change-password error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}