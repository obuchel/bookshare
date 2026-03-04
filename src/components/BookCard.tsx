"use client";

import Link from "next/link";
import { useLang } from "@/contexts/LangContext";

interface BookCardProps {
  book: {
    id: string; title: string; author: string; cover_url?: string;
    genre?: string; condition?: string; status?: string;
    owner_name?: string; owner_city?: string;
    distance_km?: number; language?: string;
  };
}

const STATUS_STYLES: Record<string, string> = {
  available: "badge-available",
  borrowed: "badge-borrowed",
  reserved: "badge-reserved",
};

export default function BookCard({ book }: BookCardProps) {
  const { t } = useLang();

  const statusLabel =
    book.status === "available" ? t.catalog.available
    : book.status === "borrowed" ? t.catalog.onLoan
    : t.catalog.reserved;

  const genreLabel = book.genre
    ? (t.addBook.genres[book.genre as keyof typeof t.addBook.genres] ?? book.genre)
    : null;

  return (
    <Link href={`/books/${book.id}`}>
      <div className="book-card bg-white rounded-2xl overflow-hidden border border-[var(--border)] cursor-pointer group">
        <div className="h-48 bg-gradient-to-br from-amber-50 to-orange-100 relative overflow-hidden">
          {book.cover_url ? (
            <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
              <span className="text-4xl mb-2">📖</span>
              <p className="font-display text-sm font-semibold text-brown line-clamp-2">{book.title}</p>
            </div>
          )}
          <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[book.status || "available"] || "badge-available"}`}>
            {statusLabel}
          </span>
        </div>
        <div className="p-4">
          <h3 className="font-display font-semibold text-ink line-clamp-1 group-hover:text-brown transition-colors">{book.title}</h3>
          <p className="text-muted text-sm mt-0.5 line-clamp-1">{book.author}</p>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border)]">
            <div>{genreLabel && <span className="text-xs bg-cream text-brown px-2 py-0.5 rounded-full">{genreLabel}</span>}</div>
            {book.distance_km !== undefined && (
              <span className="text-xs text-muted">
                {book.distance_km < 1 ? `${Math.round(book.distance_km * 1000)}m` : `${book.distance_km.toFixed(1)}km`}
              </span>
            )}
          </div>
          {book.owner_name && (
            <p className="text-xs text-muted mt-2">📍 {book.owner_city || "—"} · {book.owner_name}</p>
          )}
        </div>
      </div>
    </Link>
  );
}
