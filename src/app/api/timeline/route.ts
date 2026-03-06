import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const { searchParams } = new URL(req.url);
    const filter  = searchParams.get("filter")  || "all";
    const userId  = searchParams.get("user_id") || null;   // filter by profile owner
    const cursor  = searchParams.get("cursor")  || null;
    const limit   = 20;

    let items: any[] = [];

    // ── Discussions ──────────────────────────────────────────────────────────
    if (filter === "all" || filter === "discussions") {
      const args: any[] = [];
      let sql = `
        SELECT p.id, 'discussion' as item_type, p.body, p.book_id, p.created_at,
               u.id as user_id, u.name as user_name, u.avatar_url as user_avatar,
               b.title as book_title, b.author as book_author, b.cover_url as book_cover,
               (SELECT COUNT(*) FROM post_likes   pl WHERE pl.post_id = p.id) as like_count,
               (SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id = p.id) as comment_count,
               ${user ? "(SELECT COUNT(*) FROM post_likes pl2 WHERE pl2.post_id = p.id AND pl2.user_id = ?)" : "0"} as liked_by_me
        FROM posts p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN books b ON p.book_id = b.id
        WHERE p.type = 'discussion'
      `;
      if (user) args.push(user.id);
      if (userId) { sql += " AND p.user_id = ?"; args.push(userId); }
      if (cursor) { sql += " AND p.created_at < ?"; args.push(cursor); }
      sql += ` ORDER BY p.created_at DESC LIMIT ${limit}`;

      const rows = await db.execute({ sql, args });
      items.push(...rows.rows);
    }

    // ── New books ─────────────────────────────────────────────────────────────
    if (filter === "all" || filter === "new_books") {
      const args: any[] = [];
      let sql = `
        SELECT b.id, 'new_book' as item_type, b.created_at,
               u.id as user_id, u.name as user_name, u.avatar_url as user_avatar,
               b.title as book_title, b.author as book_author, b.cover_url as book_cover,
               b.genre as book_genre, b.language as book_language,
               0 as like_count, 0 as comment_count, 0 as liked_by_me
        FROM books b
        JOIN users u ON b.owner_id = u.id
        WHERE 1=1
      `;
      if (userId) { sql += " AND b.owner_id = ?"; args.push(userId); }
      if (cursor) { sql += " AND b.created_at < ?"; args.push(cursor); }
      sql += ` ORDER BY b.created_at DESC LIMIT ${limit}`;

      const rows = await db.execute({ sql, args });
      items.push(...rows.rows);
    }

    // Sort merged, slice to limit
    items.sort((a, b) => new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime());
    items = items.slice(0, limit);

    const nextCursor = items.length === limit ? items[items.length - 1].created_at : null;
    return NextResponse.json({ items, nextCursor });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { body, book_id } = await req.json();
    if (!body?.trim()) return NextResponse.json({ error: "Body required" }, { status: 400 });
    if (body.length > 2000) return NextResponse.json({ error: "Too long" }, { status: 400 });

    const id = randomUUID();
    await db.execute({
      sql: `INSERT INTO posts (id, user_id, type, body, book_id, created_at) VALUES (?, ?, 'discussion', ?, ?, datetime('now'))`,
      args: [id, user.id, body.trim(), book_id || null],
    });

    const result = await db.execute({
      sql: `SELECT p.*, u.name as user_name, u.avatar_url as user_avatar,
                   b.title as book_title, b.author as book_author, b.cover_url as book_cover
            FROM posts p JOIN users u ON p.user_id = u.id LEFT JOIN books b ON p.book_id = b.id
            WHERE p.id = ?`,
      args: [id],
    });

    return NextResponse.json({
      post: { ...result.rows[0], like_count: 0, comment_count: 0, liked_by_me: 0, item_type: "discussion" }
    }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
