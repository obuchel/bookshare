import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import db from "@/lib/db";
import { signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, city, neighborhood, lat, lng } =
      await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email and password are required" },
        { status: 400 }
      );
    }

    const existing = await db.execute({
      sql: "SELECT id FROM users WHERE email = ?",
      args: [email],
    });
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    const id = uuidv4();
    const password_hash = await bcrypt.hash(password, 10);

    await db.execute({
      sql: `INSERT INTO users (id, name, email, password_hash, city, neighborhood, lat, lng)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        name,
        email,
        password_hash,
        city || "",
        neighborhood || "",
        lat || 0,
        lng || 0,
      ],
    });

    const token = await signToken({ id, email, name });
    const response = NextResponse.json({
      token,
      user: { id, name, email, city, neighborhood, lat, lng },
    });
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    return response;
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error }, { status: 500 });
  }
}
