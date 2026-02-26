"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/hooks/useApi";
import { useToast } from "@/hooks/useToast";
import { useLang } from "@/contexts/LangContext";
import ToastContainer from "@/components/Toast";

interface Book {
  id: string; title: string; author: string; cover_url?: string;
  genre?: string; condition?: string; status?: string; description?: string;
  max_borrow_days?: number; created_at?: string;
}

export default function MyBooksPage() {
  const { user } = useAuth();
  const { apiFetch } = useApi();
  const { t } = useLang();
  const mb = t.myBooks;
  const router = useRouter();
  const { toasts, showToast } = useToast();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/api/users/${user!.id}`);
      setBooks(data.books || []);
    } catch {
      showToast("Failed to load books", "error");
    } finally {
      setLoading(false);
    }
  }, [user, apiFetch]);

  useEffect(() => { if (!user) { router.push("/login"); return; } fetchBooks(); }, [user, router, fetchBooks]);

  const deleteBook = async (id: string) => {
    if (!confirm("Delete this book?")) return;
    try {
      await apiFetch(`/api/books/${id}`, { method: "DELETE" });
      showToast("Book deleted");
      fetchBooks();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete", "error");
    }
  };

  const STATUS_COLORS: Record<string, string> = {
    available: "bg-green-50 text-green-700 border border-green-200",
    borrowed: "bg-orange-50 text-orange-700 border border-orange-200",
    reserved: "bg-blue-50 text-blue-700 border border-blue-200",
  };

  const STATUS_LABELS: Record<string, string> = {
    available: mb.statuses.available,
    borrowed: mb.statuses.borrowed,
    reserved: mb.statuses.reserved,
  };

  if (!user) return null;

  return (
    <div className="min-h-screen">
      <Nav /><ToastContainer toasts={toasts} />
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-3xl text-ink">{mb.title}</h1>
          <Link href="/my-books/add" className="px-5 py-2.5 bg-ink text-gold font-medium rounded-xl hover:bg-brown transition-colors text-sm">
            {mb.addBook}
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-48 rounded-2xl" />)}
          </div>
        ) : books.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-[var(--border)]">
            <span className="text-5xl">📚</span>
            <p className="font-display text-xl mt-4 mb-2">{mb.emptyTitle}</p>
            <p className="text-muted text-sm mb-6">{mb.emptySub || "Share your first book with the community"}</p>
            <Link href="/my-books/add" className="inline-block px-6 py-3 bg-ink text-gold font-medium rounded-xl hover:bg-brown transition-colors">
              {mb.addFirst}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {books.map((book) => (
              <div key={book.id} className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden group">
                <div className="h-40 bg-gradient-to-br from-amber-50 to-orange-100 relative">
                  {book.cover_url
                    ? <img src={book.cover_url} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-4xl">📖</div>
                  }
                  <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[book.status || "available"] || "bg-gray-100 text-gray-600"}`}>
                    {book.status || "available"}
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-ink truncate">{book.title}</h3>
                  <p className="text-sm text-muted truncate">{book.author}</p>
                  {book.genre && <p className="text-xs text-muted mt-1">{book.genre}</p>}
                  <div className="flex items-center gap-2 mt-3">
                    <Link href={`/my-books/edit/${book.id}`}
                      className="flex-1 py-1.5 text-center text-xs font-medium border border-[var(--border)] text-brown rounded-lg hover:bg-cream transition-colors">
                      Edit
                    </Link>
                    <button onClick={() => deleteBook(book.id)}
                      className="flex-1 py-1.5 text-xs font-medium border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}