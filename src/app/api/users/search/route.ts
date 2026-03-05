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

    // Simple search - no contacts join to avoid table schema issues
    const result = await db.execute({
      sql: `SELECT id, name, city, county, province, country,
                   avatar_url, rating, books_shared
            FROM users
            WHERE id != ?
              AND (name LIKE ? OR city LIKE ? OR county LIKE ?)
            ORDER BY name ASC
            LIMIT 20`,
      args: [user.id, `%${q}%`, `%${q}%`, `%${q}%`],
    });

    // Check which are already contacts
    const contactCheck = await db.execute({
      sql: `SELECT contact_id FROM contacts WHERE user_id = ?`,
      args: [user.id],
    }).catch(() => ({ rows: [] }));

    const contactIds = new Set(contactCheck.rows.map((r: any) => r.contact_id));

    const users = result.rows.map((u: any) => ({
      ...u,
      is_contact: contactIds.has(u.id) ? 1 : 0,
    }));

    return NextResponse.json({ users });
  } catch (err) {
    console.error("User search error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}