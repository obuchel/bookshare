import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const result = await db.execute({
      sql: `SELECT i.*, u.name as invited_name, u.avatar_url as invited_avatar, u.city as invited_city
            FROM invites i
            LEFT JOIN users u ON i.invited_user_id = u.id
            WHERE i.inviter_id = ?
            ORDER BY i.created_at DESC`,
      args: [user.id],
    });

    return NextResponse.json({ invites: result.rows });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { emails } = await req.json();
    if (!emails?.length) return NextResponse.json({ error: "No emails provided" }, { status: 400 });

    const created = [];
    for (const email of emails.slice(0, 20)) {
      const trimmed = email.trim().toLowerCase();
      if (!trimmed || !trimmed.includes("@")) continue;

      // Don't invite yourself
      if (trimmed === user.email) continue;

      // Check if already a user
      const existing = await db.execute({
        sql: "SELECT id, name FROM users WHERE email = ?",
        args: [trimmed],
      });

      // Skip if already invited
      const alreadyInvited = await db.execute({
        sql: "SELECT id FROM invites WHERE inviter_id = ? AND email = ?",
        args: [user.id, trimmed],
      });
      if (alreadyInvited.rows.length > 0) continue;

      const id = uuidv4();
      const token = uuidv4().replace(/-/g, "") + uuidv4().replace(/-/g, "");
      const existingUser = existing.rows[0];

      await db.execute({
        sql: `INSERT INTO invites (id, inviter_id, email, token, status, invited_user_id)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [id, user.id, trimmed, token, existingUser ? "joined" : "pending", existingUser?.id || null],
      });

      // If already a user, auto-connect
      if (existingUser) {
        await ensureContact(user.id, existingUser.id as string);
      }

      created.push({ id, email: trimmed, token, status: existingUser ? "joined" : "pending" });
    }

    return NextResponse.json({ created, count: created.length }, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

async function ensureContact(userA: string, userB: string) {
  const [a, b] = [userA, userB].sort();
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
}
