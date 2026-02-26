import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    const result = await db.execute({
      sql: "SELECT * FROM users WHERE email = ?",
      args: [email],
    });

    const user = result.rows[0];
    if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    const valid = await bcrypt.compare(password, user.password_hash as string);
    if (!valid) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    const token = await signToken({
      id: user.id as string,
      email: user.email as string,
      name: user.name as string,
    });

    const response = NextResponse.json({
      token,
      user: {
        id: user.id, name: user.name, email: user.email,
        city: user.city, neighborhood: user.neighborhood,
        lat: user.lat, lng: user.lng, bio: user.bio,
        avatar_url: user.avatar_url, rating: user.rating,
        books_shared: user.books_shared, books_borrowed: user.books_borrowed,
      },
    });

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
