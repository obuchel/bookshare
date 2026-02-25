import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await db.execute({
      sql: `SELECT id, name, bio, avatar_url, city, neighborhood, lat, lng,
                   books_shared, books_borrowed, rating, rating_count, created_at
            FROM users WHERE id = ?`,
      args: [params.id],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user: result.rows[0] });
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(req);
    if (!user || user.id !== params.id)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const updates = await req.json();
    const allowed = ["name", "bio", "avatar_url", "city", "neighborhood", "lat", "lng"];
    const setClauses: string[] = [];
    const args: (string | number)[] = [];

    for (const key of allowed) {
      if (updates[key] !== undefined) {
        setClauses.push(`${key} = ?`);
        args.push(updates[key]);
      }
    }

    if (setClauses.length === 0)
      return NextResponse.json({ error: "No valid fields" }, { status: 400 });

    args.push(params.id);
    await db.execute({
      sql: `UPDATE users SET ${setClauses.join(", ")} WHERE id = ?`,
      args,
    });

    const updated = await db.execute({
      sql: `SELECT id, name, bio, avatar_url, city, neighborhood, lat, lng,
                   books_shared, books_borrowed, rating, rating_count FROM users WHERE id = ?`,
      args: [params.id],
    });

    return NextResponse.json({ user: updated.rows[0] });
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error }, { status: 500 });
  }
}
