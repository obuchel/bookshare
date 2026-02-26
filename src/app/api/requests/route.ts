import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = new URL(req.url).searchParams.get("role") || "requester";

    const sql = role === "owner"
      ? `SELECT r.*, b.title as book_title, b.cover_url as book_cover,
               u.name as requester_name, o.name as owner_name
         FROM borrow_requests r
         JOIN books b ON r.book_id = b.id
         JOIN users u ON r.requester_id = u.id
         JOIN users o ON r.owner_id = o.id
         WHERE r.owner_id = ? ORDER BY r.requested_at DESC`
      : `SELECT r.*, b.title as book_title, b.cover_url as book_cover,
               u.name as requester_name, o.name as owner_name
         FROM borrow_requests r
         JOIN books b ON r.book_id = b.id
         JOIN users u ON r.requester_id = u.id
         JOIN users o ON r.owner_id = o.id
         WHERE r.requester_id = ? ORDER BY r.requested_at DESC`;

    const result = await db.execute({ sql, args: [user.id] });
    return NextResponse.json({ requests: result.rows });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { book_id, message, borrow_days } = await req.json();
    if (!book_id) return NextResponse.json({ error: "book_id required" }, { status: 400 });

    const bookResult = await db.execute({ sql: "SELECT * FROM books WHERE id = ?", args: [book_id] });
    const book = bookResult.rows[0];
    if (!book) return NextResponse.json({ error: "Book not found" }, { status: 404 });
    if (book.owner_id === user.id) return NextResponse.json({ error: "Cannot request your own book" }, { status: 400 });
    if (book.status !== "available") return NextResponse.json({ error: "Book not available" }, { status: 400 });

    // Check for existing pending request
    const existing = await db.execute({
      sql: "SELECT id FROM borrow_requests WHERE book_id = ? AND requester_id = ? AND status = 'pending'",
      args: [book_id, user.id],
    });
    if (existing.rows.length > 0) return NextResponse.json({ error: "You already have a pending request" }, { status: 409 });

    const id = randomUUID();
    await db.execute({
      sql: `INSERT INTO borrow_requests (id, book_id, requester_id, owner_id, message, borrow_days)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [id, book_id, user.id, book.owner_id as string, message || "", borrow_days || book.max_borrow_days || 14],
    });

    const request = await db.execute({ sql: "SELECT * FROM borrow_requests WHERE id = ?", args: [id] });
    return NextResponse.json({ request: request.rows[0] }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
