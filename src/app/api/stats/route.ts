import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  try {
    const [booksResult, usersResult, distResult] = await Promise.all([
      db.execute({ sql: "SELECT COUNT(*) as count FROM books", args: [] }),
      db.execute({ sql: "SELECT COUNT(*) as count FROM users", args: [] }),
      db.execute({
        sql: `SELECT AVG(
                6371 * 2 * ASIN(SQRT(
                  POWER(SIN((b.lat - u.lat) * 0.008727), 2) +
                  COS(u.lat * 0.01745) * COS(b.lat * 0.01745) *
                  POWER(SIN((b.lng - u.lng) * 0.008727), 2)
                ))
              ) as avg_km
              FROM books b
              JOIN users u ON b.owner_id != u.id
              WHERE b.lat != 0 AND u.lat != 0
              LIMIT 1000`,
        args: [],
      }),
    ]);

    const books = Number(booksResult.rows[0]?.count ?? 0);
    const readers = Number(usersResult.rows[0]?.count ?? 0);
    const avgKm = Number(distResult.rows[0]?.avg_km ?? 0);

    return NextResponse.json({
      books,
      readers,
      avg_km: avgKm > 0 ? Math.round(avgKm) : null,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
