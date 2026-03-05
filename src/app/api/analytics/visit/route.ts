import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST — called client-side on catalog load
export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const ua = req.headers.get("user-agent") || "";
    const { page, referrer } = await req.json().catch(() => ({ page: "/catalog", referrer: "" }));

    if (/bot|crawler|spider|slurp|facebookexternalhit|preview/i.test(ua)) {
      return NextResponse.json({ ok: true });
    }

    await db.execute({
      sql: `INSERT INTO page_visits (ip, page, referrer, user_agent, visited_at)
            VALUES (?, ?, ?, ?, datetime('now'))`,
      args: [ip, page || "/catalog", referrer || "", ua],
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}

// GET — admin only
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const adminEmail = process.env.ADMIN_EMAIL || "";
    if (!adminEmail || (user as any).email !== adminEmail) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "30");

    const [total, unique, byDay, byPage, topIPs, recent] = await Promise.all([
      db.execute({ sql: "SELECT COUNT(*) as count FROM page_visits WHERE visited_at >= datetime('now', ?)", args: [`-${days} days`] }),
      db.execute({ sql: "SELECT COUNT(DISTINCT ip) as count FROM page_visits WHERE visited_at >= datetime('now', ?)", args: [`-${days} days`] }),
      db.execute({
        sql: `SELECT date(visited_at) as day, COUNT(*) as visits, COUNT(DISTINCT ip) as unique_ips
              FROM page_visits WHERE visited_at >= datetime('now', ?)
              GROUP BY day ORDER BY day DESC LIMIT 30`,
        args: [`-${days} days`],
      }),
      db.execute({
        sql: `SELECT page, COUNT(*) as visits FROM page_visits
              WHERE visited_at >= datetime('now', ?)
              GROUP BY page ORDER BY visits DESC LIMIT 10`,
        args: [`-${days} days`],
      }),
      db.execute({
        sql: `SELECT ip, COUNT(*) as visits, MAX(visited_at) as last_seen
              FROM page_visits WHERE visited_at >= datetime('now', ?)
              GROUP BY ip ORDER BY visits DESC LIMIT 50`,
        args: [`-${days} days`],
      }),
      db.execute({
        sql: `SELECT ip, page, user_agent, visited_at FROM page_visits ORDER BY visited_at DESC LIMIT 100`,
        args: [],
      }),
    ]);

    return NextResponse.json({
      summary: { total: (total.rows[0] as any)?.count || 0, unique: (unique.rows[0] as any)?.count || 0, days },
      byDay: byDay.rows,
      byPage: byPage.rows,
      topIPs: topIPs.rows,
      recent: recent.rows,
    });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
