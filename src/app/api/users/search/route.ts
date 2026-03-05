import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";

    if (!q.trim()) return NextResponse.json({ users: [] });

    const result = await db.execute({
      sql: `SELECT u.id, u.name, u.city, u.county, u.province, u.country,
                   u.avatar_url, u.rating, u.books_shared,
                   CASE WHEN c.contact_id IS NOT NULL THEN 1 ELSE 0 END as is_contact
            FROM users u
            LEFT JOIN contacts c ON c.user_id = ? AND c.contact_id = u.id
            WHERE u.id != ?
              AND (u.name LIKE ? OR u.city LIKE ? OR u.county LIKE ?)
            ORDER BY u.name ASC
            LIMIT 20`,
      args: [user.id, user.id, `%${q}%`, `%${q}%`, `%${q}%`],
    });

    return NextResponse.json({ users: result.rows });
  } catch (err) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
