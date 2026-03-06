import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await db.execute({
      sql: `SELECT c.id, c.body, c.created_at,
                   u.id as user_id, u.name as user_name, u.avatar_url as user_avatar
            FROM post_comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.post_id = ?
            ORDER BY c.created_at ASC`,
      args: [params.id],
    });
    return NextResponse.json({ comments: result.rows });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { body } = await req.json();
    if (!body?.trim()) return NextResponse.json({ error: "Body required" }, { status: 400 });

    const id = randomUUID();
    await db.execute({
      sql: `INSERT INTO post_comments (id, post_id, user_id, body, created_at)
            VALUES (?, ?, ?, ?, datetime('now'))`,
      args: [id, params.id, user.id, body.trim()],
    });

    return NextResponse.json({
      comment: { id, body: body.trim(), created_at: new Date().toISOString(), user_id: user.id, user_name: (user as any).name, user_avatar: (user as any).avatar_url }
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // params.id here is comment id (route is /api/timeline/comments/[id])
    const comment = await db.execute({ sql: "SELECT * FROM post_comments WHERE id = ?", args: [params.id] });
    if (!comment.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if ((comment.rows[0] as any).user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await db.execute({ sql: "DELETE FROM post_comments WHERE id = ?", args: [params.id] });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
