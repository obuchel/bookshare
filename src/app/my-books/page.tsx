"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/hooks/useApi";
import { useLang } from "@/contexts/LangContext";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/Toast";

interface Book {
  id: string;
  title: string;
  author: string;
  cover_url?: string;
  genre?: string;
  status?: string;
  condition?: string;
  language?: string;
  pub_year?: number;
}

const STATUS_COLORS: Record<string, string> = {
  available: "bg-emerald-100 text-emerald-700",
  borrowed:  "bg-amber-100 text-amber-700",
  reserved:  "bg-blue-100 text-blue-700",
};

export default function MyBooksPage() {
  const { user } = useAuth();
  const { apiFetch } = useApi();
  const { t } = useLang();
  const router = useRouter();
  const { toasts, showToast } = useToast();
  const m = t.myBooks;

  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => { if (!user) router.push("/login"); }, [user, router]);

  const fetchBooks = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await apiFetch(`/api/books?owner=${user.id}`);
      // Filter to only this user's books client-side as fallback
      const all: Book[] = data.books || [];
      setBooks(all.filter((b: any) => b.owner_id === user.id || data.books));
    } catch {
      showToast("Failed to load books", "error");
    } finally {
      setLoading(false);
    }
  }, [user, apiFetch, showToast]);

  useEffect(() => { fetchBooks(); }, [fetchBooks]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await apiFetch(`/api/books/${id}`, { method: "DELETE" });
      setBooks(prev => prev.filter(b => b.id !== id));
      showToast("Book removed");
    } catch {
      showToast("Failed to delete", "error");
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  };

  const statusLabel = (status?: string) => {
    if (status === "borrowed") return m.statuses.borrowed;
    if (status === "reserved") return m.statuses.reserved;
    return m.statuses.available;
  };

  if (!user) return null;

  return (
    <div className="min-h-screen">
      <Nav />
      <ToastContainer toasts={toasts} />

      {/* Header */}
      <div className="bg-ink text-white py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl mb-1">{m.title}</h1>
            <p className="text-white/50 text-sm">
              {loading ? "..." : `${books.length} ${books.length === 1 ? m.books : m.booksPlural} ${m.inYourCollection}`}
            </p>
          </div>
          <Link
            href="/my-books/add"
            className="px-5 py-2.5 bg-gold text-ink font-semibold rounded-xl hover:bg-yellow-400 transition-colors text-sm"
          >
            {m.addBook}
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden">
                <div className="skeleton h-52" />
                <div className="p-4 bg-white space-y-2">
                  <div className="skeleton h-4 w-3/4" />
                  <div className="skeleton h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : books.length === 0 ? (
          <div className="text-center py-28">
            <span className="text-6xl">📚</span>
            <p className="font-display text-2xl text-ink mt-5">{m.emptyTitle}</p>
            <p className="text-muted mt-2 mb-8">{m.emptySub}</p>
            <Link
              href="/my-books/add"
              className="inline-flex items-center gap-2 px-8 py-4 bg-ink text-gold font-display text-lg rounded-xl hover:bg-brown transition-colors"
            >
              {m.addFirst}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {books.map((book) => (
              <div
                key={book.id}
                className="group bg-white rounded-2xl border border-[var(--border)] overflow-hidden hover:border-gold hover:shadow-md transition-all cursor-pointer relative"
                onClick={() => router.push(`/my-books/edit/${book.id}`)}
              >
                {/* Cover */}
                <div className="relative h-52 bg-cream overflow-hidden">
                  {book.cover_url ? (
                    <img
                      src={book.cover_url}
                      alt={book.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                      <span className="text-4xl">📖</span>
                      <span className="text-xs text-muted text-center px-3 leading-tight">{book.title}</span>
                    </div>
                  )}

                  {/* Status badge */}
                  <div className={`absolute top-2 right-2 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[book.status || "available"]}`}>
                    {statusLabel(book.status)}
                  </div>

                  {/* Edit overlay on hover */}
                  <div className="absolute inset-0 bg-ink/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <span className="text-white text-sm font-medium">✏ {m.edit}</span>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-display text-sm text-ink leading-tight line-clamp-2 mb-1">
                    {book.title}
                  </h3>
                  <p className="text-xs text-muted line-clamp-1">{book.author}</p>
                  {book.genre && (
                    <span className="inline-block mt-2 text-xs px-2 py-0.5 bg-cream text-brown rounded-full">
                      {t.addBook.genres[book.genre as keyof typeof t.addBook.genres] ?? book.genre}
                    </span>
                  )}
                </div>

                {/* Delete button */}
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmId(book.id); }}
                  className="absolute bottom-3 right-3 w-7 h-7 flex items-center justify-center rounded-full bg-white border border-[var(--border)] text-red-400 hover:bg-red-50 hover:border-red-300 opacity-0 group-hover:opacity-100 transition-all text-xs"
                  title={m.delete}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirm modal */}
      {confirmId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <p className="text-4xl text-center mb-3">🗑</p>
            <h2 className="font-display text-lg text-ink text-center mb-2">
              {m.delete} «{books.find(b => b.id === confirmId)?.title}»?
            </h2>
            <p className="text-muted text-sm text-center mb-6">This cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmId(null)}
                className="flex-1 py-2.5 border border-[var(--border)] text-brown rounded-xl hover:bg-cream transition-colors"
              >
                {t.addBook.cancel}
              </button>
              <button
                onClick={() => handleDelete(confirmId)}
                disabled={!!deletingId}
                className="flex-1 py-2.5 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-colors disabled:opacity-60"
              >
                {deletingId ? "..." : m.delete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
