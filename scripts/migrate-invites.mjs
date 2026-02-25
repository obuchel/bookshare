import { createClient } from "@libsql/client";
import { readFileSync } from "fs";

try {
  const env = readFileSync(".env.local", "utf8");
  for (const line of env.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx > 0) process.env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
} catch { }

const db = createClient({ url: process.env.TURSO_URL, authToken: process.env.TURSO_AUTH_TOKEN });

const migrations = [
  `CREATE TABLE IF NOT EXISTS invites (
    id TEXT PRIMARY KEY,
    inviter_id TEXT NOT NULL REFERENCES users(id),
    email TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'pending',
    invited_user_id TEXT REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    accepted_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    user_a TEXT NOT NULL REFERENCES users(id),
    user_b TEXT NOT NULL REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_a, user_b)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_invites_token ON invites(token)`,
  `CREATE INDEX IF NOT EXISTS idx_invites_inviter ON invites(inviter_id)`,
  `CREATE INDEX IF NOT EXISTS idx_contacts_users ON contacts(user_a, user_b)`,
];

async function migrate() {
  console.log("🚀 Running invite/contact migrations...\n");
  for (const sql of migrations) {
    const name = sql.match(/(TABLE|INDEX).*?(\w+)\s*[\(\n]/)?.[2] || "?";
    await db.execute(sql);
    console.log(`  ✓ ${name}`);
  }
  console.log("\n✅ Done!");
  process.exit(0);
}

migrate().catch((e) => { console.error("❌", e); process.exit(1); });
