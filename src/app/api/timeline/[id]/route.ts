import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") || "all"; // all | discussions | new_books
    const cursor = searchParams.get("cursor") || null;
    const limit = 20;

    // Discussions (user posts)
    let postsSql = `
      SELECT p.id, p.type, p.body, p.book_id, p.created_at,
             u.id as user_id, u.name as user_name, u.avatar_url as user_avatar,
             b.title as book_title, b.author as book_author, b.cover_url as book_cover,
             (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) as like_count,
             (SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id = p.id) as comment_count
             ${user ? ", (SELECT COUNT(*) FROM post_likes pl2 WHERE pl2.post_id = p.id AND pl2.user_id = ?) as liked_by_me" : ", 0 as liked_by_me"}
      FROM posts p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN books b ON p.book_id = b.id
      WHERE p.type = 'discussion'
      ${cursor ? "AND p.created_at < ?" : ""}
      ORDER BY p.created_at DESC LIMIT ?
    `;

    // New book activity
    let booksSql = `
      SELECT b.id, 'new_book' as type, b.created_at,
             u.id as user_id, u.name as user_name, u.avatar_url as user_avatar,
             b.title as book_title, b.author as book_author, b.cover_url as book_cover,
             b.genre as book_genre, b.language as book_language
      FROM books b
      JOIN users u ON b.owner_id = u.id
      ${cursor ? "WHERE b.created_at < ?" : ""}
      ORDER BY b.created_at DESC LIMIT ?
    `;

    const postsArgs: any[] = [];
    const booksArgs: any[] = [];
    if (user) postsArgs.push(user.id);
    if (cursor) { postsArgs.push(cursor); booksArgs.push(cursor); }
    postsArgs.push(limit);
    booksArgs.push(limit);

    let items: any[] = [];

    if (filter === "all" || filter === "discussions") {
      const posts = await db.execute({ sql: postsSql, args: postsArgs });
      items.push(...posts.rows.map(r => ({ ...r, item_type: "discussion" })));
    }

    if (filter === "all" || filter === "new_books") {
      const books = await db.execute({ sql: booksSql, args: booksArgs });
      items.push(...books.rows.map(r => ({ ...r, item_type: "new_book" })));
    }

    // Sort merged results by date, take limit
    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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
      sql: `INSERT INTO posts (id, user_id, type, body, book_id, created_at)
            VALUES (?, ?, 'discussion', ?, ?, datetime('now'))`,
      args: [id, user.id, body.trim(), book_id || null],
    });

    const result = await db.execute({
      sql: `SELECT p.*, u.name as user_name, u.avatar_url as user_avatar,
                   b.title as book_title, b.author as book_author, b.cover_url as book_cover
            FROM posts p JOIN users u ON p.user_id = u.id
            LEFT JOIN books b ON p.book_id = b.id
            WHERE p.id = ?`,
      args: [id],
    });

    return NextResponse.json({ post: { ...result.rows[0], like_count: 0, comment_count: 0, liked_by_me: 0, item_type: "discussion" } }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
