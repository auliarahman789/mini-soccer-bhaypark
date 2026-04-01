import { NextRequest, NextResponse } from "next/server";
import { initUsersDB, getUserByUsername, verifyPassword } from "@/lib/db-users";
import { createSession, setSessionCookie } from "@/lib/session";

let initialized = false;
async function ensureDB() {
  if (!initialized) {
    await initUsersDB();
    initialized = true;
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureDB();
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username dan password wajib diisi" },
        { status: 400 },
      );
    }

    const user = await getUserByUsername(username);
    if (!user) {
      return NextResponse.json(
        { error: "Username atau password salah" },
        { status: 401 },
      );
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json(
        { error: "Username atau password salah" },
        { status: 401 },
      );
    }

    const token = await createSession({
      userId: user.id,
      username: user.username,
    });
    await setSessionCookie(token);

    return NextResponse.json({ success: true, username: user.username });
  } catch (err) {
    console.error("POST /api/admin/login error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
