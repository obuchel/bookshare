import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    if (!token) return NextResponse.json({ error: "Token required" }, { status: 400 });

    const inviteResult = await db.execute({
      sql: "SELECT * FROM invites WHERE token = ?",
      args: [token],
    });
    const invite = inviteResult.rows[0];
    if (!invite) return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });
    if (invite.status === "accepted") return NextResponse.json({ error: "Invite already used" }, { status: 409 });

    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "You must be logged in" }, { status: 401 });

    await db.execute({
      sql: "UPDATE invites SET status = 'accepted', invited_user_id = ?, accepted_at = datetime('now') WHERE token = ?",
      args: [user.id, token],
    });

    const [a, b] = [invite.inviter_id as string, user.id].sort();
    const existing = await db.execute({
      sql: "SELECT id FROM contacts WHERE user_a = ? AND user_b = ?",
      args: [a, b],
    });
    if (existing.rows.length === 0) {
      await db.execute({
        sql: "INSERT INTO contacts (id, user_a, user_b) VALUES (?, ?, ?)",
        args: [uuidv4(), a, b],
      });
    }

    const inviterResult = await db.execute({
      sql: "SELECT id, name, city, county, province, country FROM users WHERE id = ?",
      args: [invite.inviter_id as string],
    });

    return NextResponse.json({
      ok: true,
      inviter: inviterResult.rows[0],
      message: "You are now connected!",
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");
    if (!token) return NextResponse.json({ error: "Token required" }, { status: 400 });

    const result = await db.execute({
      sql: `SELECT i.email, i.status, u.name as inviter_name, u.city as inviter_city, u.books_shared
            FROM invites i
            JOIN users u ON i.inviter_id = u.id
            WHERE i.token = ?`,
      args: [token],
    });

    if (!result.rows[0]) return NextResponse.json({ error: "Invalid invite" }, { status: 404 });

    return NextResponse.json({ invite: result.rows[0] });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
