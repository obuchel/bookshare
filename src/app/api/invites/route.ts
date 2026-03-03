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

    const body = await req.json();
    const { emails, refId } = body;

    // Handle refId case: new user registered via invite link
    if (refId) {
      const inviterResult = await db.execute({
        sql: "SELECT id FROM users WHERE id = ?",
        args: [refId],
      });
      if (!inviterResult.rows[0])
        return NextResponse.json({ error: "Inviter not found" }, { status: 404 });

      await ensureContact(user.id, refId);

      // Mark any pending invite from this inviter to this user's email as accepted
      await db.execute({
        sql: `UPDATE invites SET status = 'accepted', invited_user_id = ?, accepted_at = datetime('now')
              WHERE inviter_id = ? AND email = ? AND status = 'pending'`,
        args: [user.id, refId, user.email],
      });

      return NextResponse.json({ ok: true, connected: true });
    }

    // Handle email invites
    if (!emails?.length)
      return NextResponse.json({ error: "No emails provided" }, { status: 400 });

    const created = [];
    for (const email of emails.slice(0, 20)) {
      const trimmed = email.trim().toLowerCase();
      if (!trimmed || !trimmed.includes("@")) continue;
      if (trimmed === user.email) continue;

      const existing = await db.execute({
        sql: "SELECT id, name FROM users WHERE email = ?",
        args: [trimmed],
      });
      const existingUser = existing.rows[0];

      const alreadyInvited = await db.execute({
        sql: "SELECT id, status FROM invites WHERE inviter_id = ? AND email = ?",
        args: [user.id, trimmed],
      });

      if (alreadyInvited.rows.length > 0) {
        // If they've since registered but contact wasn't created, fix it now
        if (existingUser && alreadyInvited.rows[0].status === "pending") {
          await ensureContact(user.id, existingUser.id as string);
          await db.execute({
            sql: `UPDATE invites SET status = 'accepted', invited_user_id = ?, accepted_at = datetime('now')
                  WHERE inviter_id = ? AND email = ?`,
            args: [existingUser.id, user.id, trimmed],
          });
        }
        continue;
      }

      const id = uuidv4();
      const token = uuidv4().replace(/-/g, "") + uuidv4().replace(/-/g, "");

      await db.execute({
        sql: `INSERT INTO invites (id, inviter_id, email, token, status, invited_user_id)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [id, user.id, trimmed, token,
               existingUser ? "joined" : "pending",
               existingUser?.id || null],
      });

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
