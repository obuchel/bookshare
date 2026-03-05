import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import db from "@/lib/db";
import { getAuthUser, haversineKm } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const genre = searchParams.get("genre") || "";
    const status = searchParams.get("status") || "";
    const language = searchParams.get("language") || "";
    const owner = searchParams.get("owner") || "";
    const lat = parseFloat(searchParams.get("lat") || "0");
    const lng = parseFloat(searchParams.get("lng") || "0");

    let sql = `
      SELECT b.*, u.name as owner_name, u.city as owner_city, u.county as owner_county,
             u.province as owner_province, u.country as owner_country,
             u.lat as owner_lat, u.lng as owner_lng, u.avatar_url as owner_avatar
      FROM books b
      JOIN users u ON b.owner_id = u.id
      WHERE 1=1
    `;
    const args: (string | number)[] = [];

    if (q) { sql += " AND (b.title LIKE ? OR b.author LIKE ?)"; args.push(`%${q}%`, `%${q}%`); }
    if (genre) { sql += " AND b.genre = ?"; args.push(genre); }
    if (status) { sql += " AND b.status = ?"; args.push(status); }
    if (language) { sql += " AND b.language = ?"; args.push(language); }
    if (owner) { sql += " AND b.owner_id = ?"; args.push(owner); }

    sql += " ORDER BY b.created_at DESC";

    const result = await db.execute({ sql, args });
    let books = result.rows.map(row => ({
      ...row,
      distance_km: lat && lng && row.owner_lat && row.owner_lng
        ? Math.round(haversineKm(lat, lng, row.owner_lat as number, row.owner_lng as number) * 10) / 10
        : null,
    }));

    if (lat && lng) books = books.sort((a, b) => (a.distance_km ?? 999) - (b.distance_km ?? 999));

    return NextResponse.json({ books });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const {
      title, author, genre, condition, description, language, isbn, cover_url, borrow_days,
      pub_year, publisher, pub_place, series, contributors,
    } = await req.json();

    if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });

    const ownerResult = await db.execute({ sql: "SELECT lat, lng, city FROM users WHERE id = ?", args: [user.id] });
    const owner = ownerResult.rows[0];

    const id = randomUUID();
    await db.execute({
      sql: `INSERT INTO books (id, owner_id, title, author, genre, condition, description, language, isbn,
              cover_url, max_borrow_days, lat, lng, city, pub_year, publisher, pub_place, series)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id, user.id, title,
        author || (contributors?.[0]?.name ?? ""),
        genre || "", condition || "Good", description || "",
        language || "English", isbn || "", cover_url || "",
        borrow_days || 14,
        owner?.lat ?? null, owner?.lng ?? null, owner?.city || "",
        pub_year ?? null, publisher || null, pub_place || null, series || null,
      ],
    });

    // Insert contributors
    if (Array.isArray(contributors)) {
      for (const c of contributors) {
        if (c.name?.trim()) {
          await db.execute({
            sql: `INSERT INTO book_contributors (id, book_id, name, role, position) VALUES (?, ?, ?, ?, ?)`,
            args: [randomUUID(), id, c.name.trim(), c.role || "author", c.position || 1],
          });
        }
      }
    }

    await db.execute({ sql: "UPDATE users SET books_shared = books_shared + 1 WHERE id = ?", args: [user.id] });

    const book = await db.execute({ sql: "SELECT * FROM books WHERE id = ?", args: [id] });
    const bookContributors = await db.execute({
      sql: "SELECT * FROM book_contributors WHERE book_id = ? ORDER BY position",
      args: [id],
    });
    return NextResponse.json({ book: { ...book.rows[0], contributors: bookContributors.rows } }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
