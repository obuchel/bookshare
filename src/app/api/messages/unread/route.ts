import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ count: 0 });

    const result = await db.execute({
      sql: "SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND read = 0",
      args: [user.id],
    });

    return NextResponse.json({ count: result.rows[0].count });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
