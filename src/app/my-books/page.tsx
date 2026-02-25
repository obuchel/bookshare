"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/hooks/useApi";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/Toast";

interface Book {
  id: string;
  title: string;
  author: string;
  cover_url?: string;
  genre?: string;
  condition?: string;
  status: string;
  language?: string;
  max_borrow_days?: number;
}

const STATUS_LABELS: Record<string, string> = {
  available: "Available",
  borrowed: "On Loan",
  reserved: "Reserved",
};

export default function MyBooksPage() {
  const { user } = useAuth();
  const { apiFetch } = useApi();
  const router = useRouter();
  const { toasts, showToast } = useToast();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBooks = useCallback(async () => {
    if (!user) return;
    const data = await apiFetch(`/api/books?ownerId=${user.id}&status=`);
    setBooks(data.books || []);
    setLoading(false);
  }, [user, apiFetch]);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    fetchBooks();
  }, [user, router, fetchBooks]);

  const toggleStatus = async (book: Book) => {
    const newStatus = book.status === "available" ? "reserved" : "available";
    try {
      await apiFetch(`/api/books/${book.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      setBooks((prev) =>
        prev.map((b) => (b.id === book.id ? { ...b, status: newStatus } : b))
      );
      showToast(`Book marked as ${STATUS_LABELS[newStatus]}`);
    } catch {
      showToast("Failed to update status", "error");
    }
  };

  const deleteBook = async (id: string) => {
    if (!confirm("Remove this book from your library?")) return;
    try {
      await apiFetch(`/api/books/${id}`, { method: "DELETE" });
      setBooks((prev) => prev.filter((b) => b.id !== id));
      showToast("Book removed");
    } catch {
      showToast("Failed to remove book", "error");
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen">
      <Nav />
      <ToastContainer toasts={toasts} />

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl text-ink">My Library</h1>
            <p className="text-muted text-sm mt-1">
              {books.length} book{books.length !== 1 ? "s" : ""} in your collection
            </p>
          </div>
          <Link
            href="/my-books/add"
            className="px-5 py-2.5 bg-ink text-gold font-medium rounded-xl hover:bg-brown transition-colors text-sm"
          >
            + Add Book
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton h-20 rounded-xl" />
            ))}
          </div>
        ) : books.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-[var(--border)]">
            <span className="text-6xl">📚</span>
            <h2 className="font-display text-2xl mt-4 mb-2">Your shelf is empty</h2>
            <p className="text-muted mb-6">
              Start sharing your home library with the community
            </p>
            <Link
              href="/my-books/add"
              className="inline-block px-6 py-3 bg-ink text-gold font-medium rounded-xl hover:bg-brown transition-colors"
            >
              Add Your First Book →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {books.map((book) => (
              <div
                key={book.id}
                className="bg-white rounded-xl border border-[var(--border)] p-4 flex items-center gap-4 hover:border-gold/50 transition-colors"
              >
                {/* Cover thumbnail */}
                <div className="w-12 h-16 rounded-lg bg-gradient-to-br from-amber-50 to-orange-100 shrink-0 overflow-hidden">
                  {book.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={book.cover_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl">📖</div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <Link href={`/books/${book.id}`}>
                    <h3 className="font-medium text-ink hover:text-brown transition-colors line-clamp-1">
                      {book.title}
                    </h3>
                  </Link>
                  <p className="text-sm text-muted">{book.author}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {book.genre && (
                      <span className="text-xs bg-cream text-brown px-2 py-0.5 rounded-full">
                        {book.genre}
                      </span>
                    )}
                    <span className="text-xs text-muted">{book.condition}</span>
                  </div>
                </div>

                {/* Status */}
                <div className="text-right shrink-0">
                  <span
                    className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
                      book.status === "available"
                        ? "badge-available"
                        : book.status === "borrowed"
                        ? "badge-borrowed"
                        : "badge-reserved"
                    }`}
                  >
                    {STATUS_LABELS[book.status] || book.status}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {book.status !== "borrowed" && (
                    <button
                      onClick={() => toggleStatus(book)}
                      title={book.status === "available" ? "Mark as unavailable" : "Mark as available"}
                      className="p-2 text-muted hover:text-brown hover:bg-cream rounded-lg transition-colors text-sm"
                    >
                      {book.status === "available" ? "⏸" : "▶"}
                    </button>
                  )}
                  <Link
                    href={`/my-books/${book.id}/edit`}
                    className="p-2 text-muted hover:text-brown hover:bg-cream rounded-lg transition-colors text-sm"
                  >
                    ✏
                  </Link>
                  <button
                    onClick={() => deleteBook(book.id)}
                    className="p-2 text-muted hover:text-rust hover:bg-red-50 rounded-lg transition-colors text-sm"
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
