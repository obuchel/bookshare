import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import db from "@/lib/db";
import { getAuthUser, haversineKm } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const genre = searchParams.get("genre") || "";
    const status = searchParams.get("status") || "available";
    const lat = parseFloat(searchParams.get("lat") || "0");
    const lng = parseFloat(searchParams.get("lng") || "0");
    const maxKm = parseFloat(searchParams.get("maxKm") || "0");
    const ownerId = searchParams.get("ownerId") || "";

    let sql = `
      SELECT b.*, u.name as owner_name, u.city as owner_city, 
             u.neighborhood as owner_neighborhood, u.rating as owner_rating,
             u.avatar_url as owner_avatar
      FROM books b
      JOIN users u ON b.owner_id = u.id
      WHERE 1=1
    `;
    const args: (string | number)[] = [];

    if (q) {
      sql += ` AND (b.title LIKE ? OR b.author LIKE ? OR b.description LIKE ?)`;
      args.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (genre) {
      sql += ` AND b.genre = ?`;
      args.push(genre);
    }
    if (status) {
      sql += ` AND b.status = ?`;
      args.push(status);
    }
    if (ownerId) {
      sql += ` AND b.owner_id = ?`;
      args.push(ownerId);
    }

    sql += ` ORDER BY b.created_at DESC`;

    const result = await db.execute({ sql, args });
    let books = result.rows.map((row) => ({ ...row }));

    // Filter/sort by distance if coords provided
    if (lat && lng) {
      books = books
        .map((b) => ({
          ...b,
          distance_km: haversineKm(
            lat,
            lng,
            b.lat as number,
            b.lng as number
          ),
        }))
        .filter((b) => !maxKm || (b.distance_km as number) <= maxKm)
        .sort(
          (a, b) =>
            (a.distance_km as number) - (b.distance_km as number)
        );
    }

    return NextResponse.json({ books });
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const {
      title, author, isbn, cover_url, description,
      genre, language, condition, max_borrow_days,
    } = await req.json();

    if (!title || !author)
      return NextResponse.json({ error: "Title and author required" }, { status: 400 });

    // Get owner location
    const ownerResult = await db.execute({
      sql: "SELECT lat, lng, city, neighborhood FROM users WHERE id = ?",
      args: [user.id],
    });
    const owner = ownerResult.rows[0];

    const id = uuidv4();
    await db.execute({
      sql: `INSERT INTO books (id, owner_id, title, author, isbn, cover_url, description,
              genre, language, condition, max_borrow_days, lat, lng, city, neighborhood)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id, user.id, title, author, isbn || "", cover_url || "",
        description || "", genre || "", language || "English",
        condition || "Good", max_borrow_days || 30,
        owner?.lat || 0, owner?.lng || 0,
        owner?.city || "", owner?.neighborhood || "",
      ],
    });

    // Update books_shared count
    await db.execute({
      sql: "UPDATE users SET books_shared = books_shared + 1 WHERE id = ?",
      args: [user.id],
    });

    const book = await db.execute({
      sql: `SELECT b.*, u.name as owner_name FROM books b JOIN users u ON b.owner_id = u.id WHERE b.id = ?`,
      args: [id],
    });

    return NextResponse.json({ book: book.rows[0] }, { status: 201 });
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error }, { status: 500 });
  }
}
