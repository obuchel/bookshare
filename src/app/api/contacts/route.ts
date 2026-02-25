import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const result = await db.execute({
      sql: `SELECT 
              CASE WHEN c.user_a = ? THEN c.user_b ELSE c.user_a END as contact_id,
              u.name, u.city, u.neighborhood, u.avatar_url, u.rating,
              u.books_shared, u.books_borrowed, c.created_at as connected_at
            FROM contacts c
            JOIN users u ON u.id = CASE WHEN c.user_a = ? THEN c.user_b ELSE c.user_a END
            WHERE c.user_a = ? OR c.user_b = ?
            ORDER BY u.name ASC`,
      args: [user.id, user.id, user.id, user.id],
    });

    return NextResponse.json({ contacts: result.rows });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
