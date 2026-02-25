"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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
  description?: string;
  genre?: string;
  language?: string;
  condition?: string;
  status: string;
  max_borrow_days: number;
  owner_id: string;
  owner_name?: string;
  owner_city?: string;
  owner_neighborhood?: string;
  owner_rating?: number;
  owner_bio?: string;
  owner_books_shared?: number;
  owner_avatar?: string;
  created_at?: string;
}

const CONDITION_COLORS: Record<string, string> = {
  "Like New": "text-green-700 bg-green-50",
  "Good": "text-blue-700 bg-blue-50",
  "Fair": "text-yellow-700 bg-yellow-50",
  "Worn": "text-orange-700 bg-orange-50",
};

export default function BookPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { apiFetch } = useApi();
  const router = useRouter();
  const { toasts, showToast } = useToast();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [borrowDays, setBorrowDays] = useState(14);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    fetch(`/api/books/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setBook(d.book);
        setLoading(false);
      });
  }, [id]);

  const handleBorrowRequest = async () => {
    if (!user) { router.push("/login"); return; }
    setRequesting(true);
    try {
      await apiFetch("/api/requests", {
        method: "POST",
        body: JSON.stringify({
          book_id: id,
          message: requestMessage,
          borrow_days: borrowDays,
        }),
      });
      showToast("Borrow request sent!");
      setShowRequestModal(false);
      setRequestMessage("");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Request failed", "error");
    } finally {
      setRequesting(false);
    }
  };

  const handleMessage = () => {
    if (!user) { router.push("/login"); return; }
    if (book) router.push(`/messages?with=${book.owner_id}&bookId=${id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Nav />
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-[280px_1fr] gap-8">
            <div className="skeleton h-96 rounded-2xl" />
            <div className="space-y-4">
              <div className="skeleton h-8 w-3/4" />
              <div className="skeleton h-5 w-1/2" />
              <div className="skeleton h-32 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen">
        <Nav />
        <div className="text-center py-24">
          <p className="font-display text-2xl">Book not found</p>
          <Link href="/catalog" className="text-brown underline mt-4 block">← Back to catalog</Link>
        </div>
      </div>
    );
  }

  const isOwner = user?.id === book.owner_id;
  const isAvailable = book.status === "available";

  return (
    <div className="min-h-screen bg-parchment">
      <Nav />
      <ToastContainer toasts={toasts} />

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Back */}
        <Link href="/catalog" className="text-sm text-muted hover:text-brown flex items-center gap-1 mb-6">
          ← Back to catalog
        </Link>

        <div className="grid md:grid-cols-[280px_1fr] gap-8">
          {/* Cover */}
          <div className="flex flex-col gap-4">
            <div className="aspect-[2/3] bg-gradient-to-br from-amber-50 to-orange-100 rounded-2xl overflow-hidden border border-[var(--border)] shadow-md">
              {book.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-center p-6">
                  <span className="text-6xl mb-4">📖</span>
                  <p className="font-display text-lg text-brown">{book.title}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            {!isOwner && (
              <div className="space-y-2">
                {isAvailable ? (
                  <button
                    onClick={() => setShowRequestModal(true)}
                    className="w-full py-3 bg-ink text-gold font-display font-semibold rounded-xl hover:bg-brown transition-colors"
                  >
                    Request to Borrow
                  </button>
                ) : (
                  <div className="w-full py-3 bg-gray-100 text-gray-500 font-medium rounded-xl text-center text-sm">
                    {book.status === "borrowed" ? "Currently on loan" : "Reserved"}
                  </div>
                )}
                <button
                  onClick={handleMessage}
                  className="w-full py-2.5 border border-[var(--border)] text-brown font-medium rounded-xl hover:bg-cream transition-colors text-sm"
                >
                  ✉ Message {book.owner_name?.split(" ")[0]}
                </button>
              </div>
            )}
            {isOwner && (
              <Link
                href={`/my-books/${id}/edit`}
                className="block text-center py-2.5 border border-[var(--border)] text-brown font-medium rounded-xl hover:bg-cream transition-colors text-sm"
              >
                ✏ Edit Book
              </Link>
            )}
          </div>

          {/* Details */}
          <div>
            {/* Status */}
            <div className="flex items-center gap-2 mb-3">
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  isAvailable ? "badge-available" : book.status === "borrowed" ? "badge-borrowed" : "badge-reserved"
                }`}
              >
                {isAvailable ? "Available" : book.status === "borrowed" ? "On Loan" : "Reserved"}
              </span>
              {book.genre && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800">
                  {book.genre}
                </span>
              )}
            </div>

            <h1 className="font-display text-3xl text-ink leading-tight mb-1">
              {book.title}
            </h1>
            <p className="text-brown text-lg mb-4">{book.author}</p>

            {/* Meta */}
            <div className="grid grid-cols-2 gap-3 mb-6 p-4 bg-white rounded-xl border border-[var(--border)]">
              {[
                { label: "Condition", value: book.condition || "Good" },
                { label: "Language", value: book.language || "English" },
                { label: "Max borrow", value: `${book.max_borrow_days} days` },
              ].map((m) => (
                <div key={m.label}>
                  <p className="text-xs text-muted uppercase tracking-widest">{m.label}</p>
                  <p className={`text-sm font-medium mt-0.5 px-2 py-0.5 rounded-md inline-block ${CONDITION_COLORS[m.value] || "text-ink"}`}>
                    {m.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Description */}
            {book.description && (
              <div className="mb-6">
                <h3 className="font-display text-lg mb-2">About this book</h3>
                <p className="text-muted text-sm leading-relaxed">{book.description}</p>
              </div>
            )}

            {/* Owner card */}
            <div className="bg-white rounded-xl border border-[var(--border)] p-4">
              <p className="text-xs text-muted uppercase tracking-widest mb-3">Shared by</p>
              <Link href={`/profile/${book.owner_id}`} className="flex items-center gap-3 group">
                <div className="w-10 h-10 rounded-full bg-gold flex items-center justify-center text-ink font-semibold text-sm shrink-0">
                  {book.owner_name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-ink group-hover:text-brown transition-colors">
                    {book.owner_name}
                  </p>
                  <p className="text-xs text-muted">
                    📍 {book.owner_neighborhood || book.owner_city || "Unknown location"}
                    {book.owner_rating && ` · ⭐ ${Number(book.owner_rating).toFixed(1)}`}
                    {book.owner_books_shared && ` · ${book.owner_books_shared} books shared`}
                  </p>
                </div>
              </Link>
              {book.owner_bio && (
                <p className="text-xs text-muted mt-3 leading-relaxed border-t border-[var(--border)] pt-3">
                  {book.owner_bio}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md animate-slide-up">
            <h2 className="font-display text-xl mb-1">Request to Borrow</h2>
            <p className="text-muted text-sm mb-4">
              <em>{book.title}</em> by {book.author}
            </p>

            <div className="mb-4">
              <label className="text-sm font-medium text-ink mb-1.5 block">
                How many days? (max {book.max_borrow_days})
              </label>
              <input
                type="number"
                min={1}
                max={book.max_borrow_days}
                value={borrowDays}
                onChange={(e) => setBorrowDays(Number(e.target.value))}
                className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:border-gold transition-colors"
              />
            </div>

            <div className="mb-6">
              <label className="text-sm font-medium text-ink mb-1.5 block">
                Message to owner{" "}
                <span className="text-muted font-normal">(optional)</span>
              </label>
              <textarea
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                rows={3}
                placeholder="Hi! I'd love to borrow this book..."
                className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:border-gold transition-colors resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowRequestModal(false)}
                className="flex-1 py-2.5 border border-[var(--border)] rounded-xl text-sm text-muted hover:bg-cream transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBorrowRequest}
                disabled={requesting}
                className="flex-1 py-2.5 bg-ink text-gold font-medium rounded-xl text-sm hover:bg-brown transition-colors disabled:opacity-60"
              >
                {requesting ? "Sending..." : "Send Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
