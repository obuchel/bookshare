import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await db.execute({
      sql: `SELECT b.*, u.name as owner_name, u.city as owner_city, u.neighborhood as owner_neighborhood,
                   u.avatar_url as owner_avatar, u.rating as owner_rating, u.books_shared as owner_books_shared
            FROM books b JOIN users u ON b.owner_id = u.id WHERE b.id = ?`,
      args: [params.id],
    });
    if (!result.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ book: result.rows[0] });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const book = await db.execute({ sql: "SELECT * FROM books WHERE id = ?", args: [params.id] });
    if (!book.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (book.rows[0].owner_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { title, author, genre, condition, description, language, isbn, cover_url, borrow_days, status } = await req.json();

    await db.execute({
      sql: `UPDATE books SET title=COALESCE(?,title), author=COALESCE(?,author), genre=COALESCE(?,genre),
            condition=COALESCE(?,condition), description=COALESCE(?,description), language=COALESCE(?,language),
            isbn=COALESCE(?,isbn), cover_url=COALESCE(?,cover_url), max_borrow_days=COALESCE(?,max_borrow_days),
            status=COALESCE(?,status), updated_at=datetime('now') WHERE id=?`,
      args: [title, author, genre, condition, description, language, isbn, cover_url, borrow_days, status, params.id],
    });

    const updated = await db.execute({ sql: "SELECT * FROM books WHERE id = ?", args: [params.id] });
    return NextResponse.json({ book: updated.rows[0] });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const book = await db.execute({ sql: "SELECT * FROM books WHERE id = ?", args: [params.id] });
    if (!book.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (book.rows[0].owner_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await db.execute({ sql: "DELETE FROM books WHERE id = ?", args: [params.id] });
    await db.execute({ sql: "UPDATE users SET books_shared = MAX(0, books_shared - 1) WHERE id = ?", args: [user.id] });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
