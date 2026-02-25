import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await db.execute({
      sql: `SELECT b.*, u.name as owner_name, u.city as owner_city,
                   u.neighborhood as owner_neighborhood, u.rating as owner_rating,
                   u.avatar_url as owner_avatar, u.bio as owner_bio,
                   u.books_shared as owner_books_shared
            FROM books b JOIN users u ON b.owner_id = u.id
            WHERE b.id = ?`,
      args: [params.id],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    return NextResponse.json({ book: result.rows[0] });
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const book = await db.execute({
      sql: "SELECT * FROM books WHERE id = ?",
      args: [params.id],
    });
    if (!book.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (book.rows[0].owner_id !== user.id)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const updates = await req.json();
    const allowed = ["title", "author", "description", "genre", "condition",
      "language", "cover_url", "max_borrow_days", "status"];
    const setClauses: string[] = [];
    const args: (string | number)[] = [];

    for (const key of allowed) {
      if (updates[key] !== undefined) {
        setClauses.push(`${key} = ?`);
        args.push(updates[key]);
      }
    }

    if (setClauses.length === 0)
      return NextResponse.json({ error: "No valid fields" }, { status: 400 });

    setClauses.push("updated_at = datetime('now')");
    args.push(params.id);

    await db.execute({
      sql: `UPDATE books SET ${setClauses.join(", ")} WHERE id = ?`,
      args,
    });

    const updated = await db.execute({
      sql: "SELECT * FROM books WHERE id = ?",
      args: [params.id],
    });

    return NextResponse.json({ book: updated.rows[0] });
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const book = await db.execute({
      sql: "SELECT * FROM books WHERE id = ?",
      args: [params.id],
    });
    if (!book.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (book.rows[0].owner_id !== user.id)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await db.execute({ sql: "DELETE FROM books WHERE id = ?", args: [params.id] });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error }, { status: 500 });
  }
}
