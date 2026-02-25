# 📚 BookShare

> A community book-lending platform — share your home library, discover books nearby, and connect with fellow readers.

![BookShare](https://img.shields.io/badge/stack-Next.js%20%2B%20Turso-C89B3C?style=for-the-badge)

## Features

- **Community Catalog** — browse all shared books in one unified catalog
- **Distance-Based Search** — filter books by proximity using geolocation
- **Borrow Requests** — request books, owners approve/reject with one click
- **Circulation Management** — track borrowed/returned status, due dates, overdue alerts
- **Real-time Messaging** — contact owners directly from book pages
- **User Profiles** — public shelves, ratings, lending history
- **ISBN Lookup** — auto-fill book details via Open Library API
- **Responsive Design** — works on mobile and desktop

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 14](https://nextjs.org) (App Router) |
| Database | [Turso](https://turso.tech) (libSQL / SQLite edge) |
| Auth | JWT via `jose` + HTTP-only cookies |
| Styling | Tailwind CSS + custom design tokens |
| Deployment | [Vercel](https://vercel.com) |

## Getting Started

### Prerequisites

- Node.js 18+
- A [Turso](https://turso.tech) database (free tier works great)

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/bookshare.git
cd bookshare
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
TURSO_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your_turso_token
JWT_SECRET=your_long_random_secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Run Database Migrations

```bash
npm run migrate
```

This creates all the tables: `users`, `books`, `borrow_requests`, `messages`, `reviews`.

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment (Vercel)

1. Push this repo to GitHub
2. Import to [Vercel](https://vercel.com/new)
3. Add environment variables in Vercel dashboard:
   - `TURSO_URL`
   - `TURSO_AUTH_TOKEN`  
   - `JWT_SECRET`
4. Deploy — done!

## Database Schema

```
users            — profiles, location (lat/lng), ratings
books            — catalog entries, condition, status, owner
borrow_requests  — request lifecycle (pending → approved → borrowed → returned)
messages         — per-conversation threads, linked to books
reviews          — ratings after a loan completes
```

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in |
| POST | `/api/auth/logout` | Sign out |
| GET | `/api/books` | List books (search, genre, distance filter) |
| POST | `/api/books` | Add a book |
| GET | `/api/books/:id` | Book detail |
| PATCH | `/api/books/:id` | Update book |
| DELETE | `/api/books/:id` | Remove book |
| GET | `/api/requests` | List borrow requests |
| POST | `/api/requests` | Create borrow request |
| PATCH | `/api/requests/:id` | Approve/reject/mark borrowed/returned |
| GET | `/api/messages` | Threads or conversation |
| POST | `/api/messages` | Send message |
| GET | `/api/users/:id` | User profile |
| PATCH | `/api/users/:id` | Update profile |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `TURSO_URL` | Your Turso database URL |
| `TURSO_AUTH_TOKEN` | Turso auth token (read-write) |
| `JWT_SECRET` | Secret for signing JWTs (min 32 chars) |
| `NEXT_PUBLIC_APP_URL` | Public app URL |

## Contributing

PRs welcome! Please open an issue first to discuss major changes.

## License

MIT
