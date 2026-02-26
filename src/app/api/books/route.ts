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
    const lat = parseFloat(searchParams.get("lat") || "0");
    const lng = parseFloat(searchParams.get("lng") || "0");

    let sql = `
      SELECT b.*, u.name as owner_name, u.city as owner_city, u.neighborhood as owner_neighborhood,
             u.lat as owner_lat, u.lng as owner_lng, u.avatar_url as owner_avatar
      FROM books b
      JOIN users u ON b.owner_id = u.id
      WHERE 1=1
    `;
    const args: (string | number)[] = [];

    if (q) { sql += " AND (b.title LIKE ? OR b.author LIKE ?)"; args.push(`%${q}%`, `%${q}%`); }
    if (genre) { sql += " AND b.genre = ?"; args.push(genre); }
    if (status) { sql += " AND b.status = ?"; args.push(status); }

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

    const { title, author, genre, condition, description, language, isbn, cover_url, borrow_days } = await req.json();
    if (!title || !author) return NextResponse.json({ error: "Title and author required" }, { status: 400 });

    // Get owner location
    const ownerResult = await db.execute({ sql: "SELECT lat, lng, city, neighborhood FROM users WHERE id = ?", args: [user.id] });
    const owner = ownerResult.rows[0];

    const id = randomUUID();
    await db.execute({
      sql: `INSERT INTO books (id, owner_id, title, author, genre, condition, description, language, isbn, cover_url, max_borrow_days, lat, lng, city, neighborhood)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, user.id, title, author, genre || "", condition || "Good", description || "",
             language || "English", isbn || "", cover_url || "",
             borrow_days || 14, owner?.lat || 0, owner?.lng || 0,
             owner?.city || "", owner?.neighborhood || ""],
    });

    // Update books_shared count
    await db.execute({ sql: "UPDATE users SET books_shared = books_shared + 1 WHERE id = ?", args: [user.id] });

    const book = await db.execute({ sql: "SELECT * FROM books WHERE id = ?", args: [id] });
    return NextResponse.json({ book: book.rows[0] }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
