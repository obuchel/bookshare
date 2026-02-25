import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role") || "all"; // "owner" | "requester" | "all"

    let sql = `
      SELECT r.*, 
             b.title as book_title, b.author as book_author, b.cover_url as book_cover,
             req.name as requester_name, req.avatar_url as requester_avatar,
             own.name as owner_name, own.avatar_url as owner_avatar
      FROM borrow_requests r
      JOIN books b ON r.book_id = b.id
      JOIN users req ON r.requester_id = req.id
      JOIN users own ON r.owner_id = own.id
      WHERE `;

    if (role === "owner") sql += `r.owner_id = ?`;
    else if (role === "requester") sql += `r.requester_id = ?`;
    else sql += `(r.owner_id = ? OR r.requester_id = ?)`;

    sql += ` ORDER BY r.requested_at DESC`;

    const args = role === "all" ? [user.id, user.id] : [user.id];
    const result = await db.execute({ sql, args });

    return NextResponse.json({ requests: result.rows });
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { book_id, message, borrow_days } = await req.json();
    if (!book_id) return NextResponse.json({ error: "book_id required" }, { status: 400 });

    // Get book and verify availability
    const bookResult = await db.execute({
      sql: "SELECT * FROM books WHERE id = ?",
      args: [book_id],
    });
    const book = bookResult.rows[0];
    if (!book) return NextResponse.json({ error: "Book not found" }, { status: 404 });
    if (book.status !== "available")
      return NextResponse.json({ error: "Book is not available" }, { status: 409 });
    if (book.owner_id === user.id)
      return NextResponse.json({ error: "Cannot borrow your own book" }, { status: 400 });

    // Check no existing pending request
    const existing = await db.execute({
      sql: `SELECT id FROM borrow_requests WHERE book_id = ? AND requester_id = ? AND status = 'pending'`,
      args: [book_id, user.id],
    });
    if (existing.rows.length > 0)
      return NextResponse.json({ error: "Request already pending" }, { status: 409 });

    const id = uuidv4();
    await db.execute({
      sql: `INSERT INTO borrow_requests (id, book_id, requester_id, owner_id, message, borrow_days)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [id, book_id, user.id, book.owner_id as string, message || "", borrow_days || 14],
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error }, { status: 500 });
  }
}
