// scripts/migrate.mjs
import { createClient } from "@libsql/client";
import { readFileSync } from "fs";

// Parse .env.local without needing dotenv
try {
  const env = readFileSync(".env.local", "utf8");
  for (const line of env.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx > 0) process.env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
} catch { /* rely on env already set */ }

const db = createClient({
  url: process.env.TURSO_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const migrations = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    bio TEXT DEFAULT '',
    avatar_url TEXT DEFAULT '',
    city TEXT DEFAULT '',
    neighborhood TEXT DEFAULT '',
    lat REAL DEFAULT 0,
    lng REAL DEFAULT 0,
    books_shared INTEGER DEFAULT 0,
    books_borrowed INTEGER DEFAULT 0,
    rating REAL DEFAULT 5.0,
    rating_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    isbn TEXT DEFAULT '',
    cover_url TEXT DEFAULT '',
    description TEXT DEFAULT '',
    genre TEXT DEFAULT '',
    language TEXT DEFAULT 'English',
    condition TEXT DEFAULT 'Good',
    status TEXT DEFAULT 'available',
    max_borrow_days INTEGER DEFAULT 30,
    lat REAL DEFAULT 0,
    lng REAL DEFAULT 0,
    city TEXT DEFAULT '',
    neighborhood TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS borrow_requests (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL REFERENCES books(id),
    requester_id TEXT NOT NULL REFERENCES users(id),
    owner_id TEXT NOT NULL REFERENCES users(id),
    status TEXT DEFAULT 'pending',
    message TEXT DEFAULT '',
    borrow_days INTEGER DEFAULT 14,
    requested_at TEXT DEFAULT (datetime('now')),
    responded_at TEXT,
    borrowed_at TEXT,
    due_date TEXT,
    returned_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL REFERENCES users(id),
    receiver_id TEXT NOT NULL REFERENCES users(id),
    book_id TEXT REFERENCES books(id),
    borrow_request_id TEXT REFERENCES borrow_requests(id),
    content TEXT NOT NULL,
    read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    reviewer_id TEXT NOT NULL REFERENCES users(id),
    reviewed_id TEXT NOT NULL REFERENCES users(id),
    borrow_request_id TEXT NOT NULL REFERENCES borrow_requests(id),
    rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
    comment TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  )`,
];

async function migrate() {
  console.log("🚀 Running BookShare migrations...\n");
  for (const sql of migrations) {
    const tableName = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1];
    await db.execute(sql);
    console.log(`  ✓ Table '${tableName}' ready`);
  }
  console.log("\n✅ All migrations complete!");
  process.exit(0);
}

migrate().catch((e) => {
  console.error("❌ Migration failed:", e);
  process.exit(1);
});
