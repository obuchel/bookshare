import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const withUserId = searchParams.get("with");
    const bookId = searchParams.get("bookId");

    if (withUserId) {
      // Get conversation with a specific user
      let sql = `SELECT m.*, u.name as sender_name, u.avatar_url as sender_avatar
                 FROM messages m JOIN users u ON m.sender_id = u.id
                 WHERE ((m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?))`;
      const args: string[] = [user.id, withUserId, withUserId, user.id];
      if (bookId) { sql += " AND m.book_id = ?"; args.push(bookId); }
      sql += " ORDER BY m.created_at ASC";

      const result = await db.execute({ sql, args });

      // Mark messages as read
      await db.execute({
        sql: "UPDATE messages SET read=1 WHERE receiver_id=? AND sender_id=? AND read=0",
        args: [user.id, withUserId],
      });

      // Get the other user's info
      const otherUser = await db.execute({ sql: "SELECT id, name, avatar_url FROM users WHERE id=?", args: [withUserId] });

      return NextResponse.json({ messages: result.rows, with: otherUser.rows[0] });
    } else {
      // Get all conversations (inbox)
      const sql = `
        SELECT m.*, 
               CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END as other_id,
               u.name as other_name, u.avatar_url as other_avatar,
               b.title as book_title
        FROM messages m
        JOIN users u ON u.id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END
        LEFT JOIN books b ON m.book_id = b.id
        WHERE m.sender_id = ? OR m.receiver_id = ?
        GROUP BY CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END
        ORDER BY m.created_at DESC
      `;
      const result = await db.execute({ sql, args: [user.id, user.id, user.id, user.id, user.id] });
      return NextResponse.json({ conversations: result.rows });
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { receiver_id, content, book_id } = await req.json();
    if (!receiver_id || !content) return NextResponse.json({ error: "receiver_id and content required" }, { status: 400 });

    const id = randomUUID();
    await db.execute({
      sql: "INSERT INTO messages (id, sender_id, receiver_id, book_id, content) VALUES (?, ?, ?, ?, ?)",
      args: [id, user.id, receiver_id, book_id || null, content],
    });

    const message = await db.execute({ sql: "SELECT * FROM messages WHERE id=?", args: [id] });
    return NextResponse.json({ message: message.rows[0] }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
