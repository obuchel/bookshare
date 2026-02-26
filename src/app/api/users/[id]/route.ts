import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id === "me" ? (await getAuthUser(req))?.id : params.id;
    if (!id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const result = await db.execute({
      sql: "SELECT id, name, email, city, neighborhood, bio, avatar_url, lat, lng, rating, rating_count, books_shared, books_borrowed, created_at FROM users WHERE id=?",
      args: [id],
    });
    if (!result.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Get their books
    const books = await db.execute({
      sql: "SELECT * FROM books WHERE owner_id=? ORDER BY created_at DESC",
      args: [id],
    });

    return NextResponse.json({ user: result.rows[0], books: books.rows });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.id !== params.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { name, city, neighborhood, bio, avatar_url, lat, lng } = await req.json();

    await db.execute({
      sql: `UPDATE users SET
              name=COALESCE(?,name),
              city=COALESCE(?,city),
              neighborhood=COALESCE(?,neighborhood),
              bio=COALESCE(?,bio),
              avatar_url=COALESCE(?,avatar_url),
              lat=COALESCE(?,lat),
              lng=COALESCE(?,lng)
            WHERE id=?`,
      args: [name, city, neighborhood, bio, avatar_url, lat, lng, user.id],
    });

    const updated = await db.execute({
      sql: "SELECT id, name, email, city, neighborhood, bio, avatar_url, lat, lng, rating, books_shared, books_borrowed FROM users WHERE id=?",
      args: [user.id],
    });

    return NextResponse.json({ user: updated.rows[0] });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
