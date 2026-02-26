import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "bookshare-secret");
export interface JWTPayload { id: string; email: string; name: string; }

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("30d").sign(secret);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try { const { payload } = await jwtVerify(token, secret); return payload as unknown as JWTPayload; } catch { return null; }
}

export async function getAuthUser(req?: NextRequest): Promise<JWTPayload | null> {
  let token: string | undefined;
  if (req) { token = req.headers.get("authorization")?.split(" ")[1]; }
  else { const cookieStore = cookies(); token = cookieStore.get("token")?.value; }
  if (!token) return null;
  return verifyToken(token);
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
