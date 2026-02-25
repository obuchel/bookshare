import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

// GET /api/messages?withUser=<userId>  — get conversation thread
// GET /api/messages?threads=1          — get all conversation threads
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const withUser = searchParams.get("withUser");
    const threads = searchParams.get("threads");

    if (threads) {
      // Get latest message per conversation partner
      const result = await db.execute({
        sql: `
          SELECT m.*,
                 s.name as sender_name, s.avatar_url as sender_avatar,
                 r.name as receiver_name, r.avatar_url as receiver_avatar,
                 b.title as book_title
          FROM messages m
          JOIN users s ON m.sender_id = s.id
          JOIN users r ON m.receiver_id = r.id
          LEFT JOIN books b ON m.book_id = b.id
          WHERE m.sender_id = ? OR m.receiver_id = ?
          ORDER BY m.created_at DESC
        `,
        args: [user.id, user.id],
      });

      // Deduplicate by conversation pair
      const seen = new Set<string>();
      const threads = result.rows.filter((msg) => {
        const key = [msg.sender_id, msg.receiver_id].sort().join(":");
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      return NextResponse.json({ threads });
    }

    if (withUser) {
      // Mark messages as read
      await db.execute({
        sql: `UPDATE messages SET read = 1 WHERE sender_id = ? AND receiver_id = ? AND read = 0`,
        args: [withUser, user.id],
      });

      const result = await db.execute({
        sql: `
          SELECT m.*, s.name as sender_name, s.avatar_url as sender_avatar,
                 b.title as book_title
          FROM messages m
          JOIN users s ON m.sender_id = s.id
          LEFT JOIN books b ON m.book_id = b.id
          WHERE (m.sender_id = ? AND m.receiver_id = ?)
             OR (m.sender_id = ? AND m.receiver_id = ?)
          ORDER BY m.created_at ASC
        `,
        args: [user.id, withUser, withUser, user.id],
      });

      return NextResponse.json({ messages: result.rows });
    }

    return NextResponse.json({ error: "Missing query params" }, { status: 400 });
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { receiver_id, content, book_id, borrow_request_id } = await req.json();

    if (!receiver_id || !content)
      return NextResponse.json({ error: "receiver_id and content required" }, { status: 400 });
    if (receiver_id === user.id)
      return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 });

    const id = uuidv4();
    await db.execute({
      sql: `INSERT INTO messages (id, sender_id, receiver_id, content, book_id, borrow_request_id)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [id, user.id, receiver_id, content, book_id || null, borrow_request_id || null],
    });

    const result = await db.execute({
      sql: `SELECT m.*, s.name as sender_name FROM messages m JOIN users s ON m.sender_id = s.id WHERE m.id = ?`,
      args: [id],
    });

    return NextResponse.json({ message: result.rows[0] }, { status: 201 });
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error }, { status: 500 });
  }
}
