import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const existing = await db.execute({
      sql: "SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?",
      args: [params.id, user.id],
    });

    if (existing.rows.length > 0) {
      await db.execute({ sql: "DELETE FROM post_likes WHERE post_id = ? AND user_id = ?", args: [params.id, user.id] });
    } else {
      await db.execute({
        sql: "INSERT INTO post_likes (post_id, user_id, created_at) VALUES (?, ?, datetime('now'))",
        args: [params.id, user.id],
      });
    }

    const count = await db.execute({ sql: "SELECT COUNT(*) as c FROM post_likes WHERE post_id = ?", args: [params.id] });
    return NextResponse.json({ liked: existing.rows.length === 0, count: (count.rows[0] as any).c });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
