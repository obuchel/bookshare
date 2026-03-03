import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, city, county, province, country, lat, lng } = await req.json();

    if (!name || !email || !password)
      return NextResponse.json({ error: "Name, email and password are required" }, { status: 400 });
    if (password.length < 6)
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });

    // Check if email already taken
    const existing = await db.execute({
      sql: "SELECT id FROM users WHERE email = ?",
      args: [email],
    });
    if (existing.rows[0])
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });

    const id = randomUUID();
    const password_hash = await bcrypt.hash(password, 10);

    await db.execute({
      sql: `INSERT INTO users (id, name, email, password_hash, city, county, province, country, lat, lng, books_shared, books_borrowed)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`,
      args: [id, name, email, password_hash,
             city || "", county || "", province || "", country || "",
             lat ?? null, lng ?? null],
    });

    const token = await signToken({ id, email, name });

    const response = NextResponse.json({
      token,
      user: { id, name, email, city, county, province, country, lat, lng,
              bio: null, avatar_url: null, rating: null,
              books_shared: 0, books_borrowed: 0 },
    }, { status: 201 });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });

    return response;
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error" }, { status: 500 });
  }
}
