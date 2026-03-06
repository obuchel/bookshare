import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const post = await db.execute({ sql: "SELECT * FROM posts WHERE id = ?", args: [params.id] });
    if (!post.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if ((post.rows[0] as any).user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await db.execute({ sql: "DELETE FROM posts WHERE id = ?", args: [params.id] });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
