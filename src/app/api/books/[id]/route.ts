import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await db.execute({
      sql: `SELECT b.*, u.name as owner_name, u.city as owner_city, u.county as owner_county,
                   u.province as owner_province, u.country as owner_country,
                   u.avatar_url as owner_avatar, u.rating as owner_rating, u.books_shared as owner_books_shared
            FROM books b JOIN users u ON b.owner_id = u.id WHERE b.id = ?`,
      args: [params.id],
    });
    if (!result.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const contributors = await db.execute({
      sql: "SELECT * FROM book_contributors WHERE book_id = ? ORDER BY position",
      args: [params.id],
    });

    return NextResponse.json({ book: { ...result.rows[0], contributors: contributors.rows } });
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

    const {
      title, author, genre, condition, description, language, isbn, cover_url,
      borrow_days, status, pub_year, publisher, pub_place, contributors,
    } = await req.json();

    await db.execute({
      sql: `UPDATE books SET
              title=COALESCE(?,title), author=COALESCE(?,author), genre=COALESCE(?,genre),
              condition=COALESCE(?,condition), description=COALESCE(?,description),
              language=COALESCE(?,language), isbn=COALESCE(?,isbn),
              cover_url=?, max_borrow_days=COALESCE(?,max_borrow_days),
              status=COALESCE(?,status),
              pub_year=COALESCE(?,pub_year), publisher=COALESCE(?,publisher),
              pub_place=COALESCE(?,pub_place),
              updated_at=datetime('now') WHERE id=?`,
      args: [
        title ?? null, author ?? null, genre ?? null, condition ?? null,
        description ?? null, language ?? null, isbn ?? null,
        cover_url ?? book.rows[0].cover_url,
        borrow_days ?? null, status ?? null,
        pub_year ?? null, publisher ?? null, pub_place ?? null,
        params.id,
      ],
    });

    // Replace contributors if provided
    if (Array.isArray(contributors)) {
      await db.execute({ sql: "DELETE FROM book_contributors WHERE book_id = ?", args: [params.id] });
      for (const c of contributors) {
        if (c.name?.trim()) {
          await db.execute({
            sql: `INSERT INTO book_contributors (id, book_id, name, role, position) VALUES (?, ?, ?, ?, ?)`,
            args: [c.id || randomUUID(), params.id, c.name.trim(), c.role || "author", c.position || 1],
          });
        }
      }
    }

    const updated = await db.execute({ sql: "SELECT * FROM books WHERE id = ?", args: [params.id] });
    const updatedContributors = await db.execute({
      sql: "SELECT * FROM book_contributors WHERE book_id = ? ORDER BY position",
      args: [params.id],
    });
    return NextResponse.json({ book: { ...updated.rows[0], contributors: updatedContributors.rows } });
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
