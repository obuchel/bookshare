"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/hooks/useApi";
import { useLang } from "@/contexts/LangContext";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/Toast";

interface Book {
  id: string; title: string; author: string; cover_url?: string;
  genre?: string; condition?: string; status?: string; description?: string;
  language?: string; max_borrow_days?: number; isbn?: string;
  owner_id?: string; owner_name?: string; owner_city?: string;
  owner_county?: string; owner_province?: string; owner_country?: string;
  owner_avatar?: string; owner_rating?: number; owner_books_shared?: number;
  distance_km?: number;
}

const CONDITION_COLORS: Record<string, string> = {
  "New": "bg-green-50 text-green-700",
  "Like New": "bg-green-50 text-green-700",
  "Very Good": "bg-blue-50 text-blue-700",
  "Good": "bg-blue-50 text-blue-700",
  "Fair": "bg-yellow-50 text-yellow-700",
  "Poor": "bg-red-50 text-red-600",
};

export default function BookDetailPage() {
  const { user } = useAuth();
  const { apiFetch } = useApi();
  const { t } = useLang();
  const router = useRouter();
  const params = useParams();
  const bookId = params.id as string;
  const { toasts, showToast } = useToast();

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [message, setMessage] = useState("");
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [alreadyRequested, setAlreadyRequested] = useState(false);

  useEffect(() => {
    if (!bookId) return;
    const load = async () => {
      try {
        const data = await apiFetch(`/api/books/${bookId}`);
        setBook(data.book);
      } catch {
        showToast("Book not found", "error");
        router.push("/catalog");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [bookId]);

  useEffect(() => {
    if (!user || !bookId) return;
    // Check if already requested
    apiFetch(`/api/requests?role=requester`).then(data => {
      const reqs = data.requests || [];
      const active = reqs.find((r: { book_id: string; status: string }) =>
        r.book_id === bookId && !["rejected", "returned"].includes(r.status)
      );
      if (active) setAlreadyRequested(true);
    }).catch(() => {});
  }, [user, bookId]);

  const handleRequest = async () => {
    if (!user) { router.push("/login"); return; }
    setRequesting(true);
    try {
      await apiFetch("/api/requests", {
        method: "POST",
        body: JSON.stringify({ book_id: bookId, message, borrow_days: book?.max_borrow_days || 14 }),
      });
      showToast(t.bookDetail.requestSent);
      setAlreadyRequested(true);
      setShowRequestForm(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to request", "error");
    } finally {
      setRequesting(false);
    }
  };

  const isOwner = user?.id === book?.owner_id;
  const canRequest = user && !isOwner && !alreadyRequested;

  const ownerLocation = [book?.owner_city, book?.owner_province]
    .filter(Boolean).join(", ");

  const genreLabel = book?.genre
    ? (t.addBook.genres[book.genre as keyof typeof t.addBook.genres] ?? book.genre)
    : null;

  const conditionLabel = book?.condition
    ? (t.addBook.conditions[book.condition as keyof typeof t.addBook.conditions] ?? book.condition)
    : null;

  if (loading) return (
    <div className="min-h-screen"><Nav />
      <div className="max-w-4xl mx-auto px-6 py-8 grid md:grid-cols-[280px_1fr] gap-8">
        <div className="skeleton h-96 rounded-2xl" />
        <div className="space-y-4">
          <div className="skeleton h-10 w-3/4 rounded-xl" />
          <div className="skeleton h-6 w-1/2 rounded-xl" />
          <div className="skeleton h-32 rounded-xl" />
        </div>
      </div>
    </div>
  );

  if (!book) return null;

  return (
    <div className="min-h-screen bg-parchment">
      <Nav /><ToastContainer toasts={toasts} />
      <div className="max-w-4xl mx-auto px-6 py-8">

        {/* Back */}
        <Link href="/catalog" className="text-sm text-muted hover:text-brown transition-colors mb-6 inline-flex items-center gap-1">
          ← {t.bookDetail.backToCatalog}
        </Link>

        <div className="grid md:grid-cols-[280px_1fr] gap-8 mt-4">

          {/* Cover */}
          <div className="space-y-4">
            <div className="rounded-2xl overflow-hidden border border-[var(--border)] bg-gradient-to-br from-amber-50 to-orange-100 aspect-[2/3]">
              {book.cover_url
                ? <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-6xl">📖</div>}
            </div>

            {/* Status */}
            <div className={`text-center py-2 rounded-xl text-sm font-medium ${
              book.status === "available" ? "bg-green-50 text-green-700 border border-green-200"
              : book.status === "borrowed" ? "bg-orange-50 text-orange-700 border border-orange-200"
              : "bg-blue-50 text-blue-700 border border-blue-200"
            }`}>
              {book.status === "available" ? t.catalog.available
               : book.status === "borrowed" ? t.catalog.onLoan
               : t.catalog.reserved}
            </div>

            {/* Owner card */}
            {book.owner_name && (
              <div className="bg-white rounded-2xl border border-[var(--border)] p-4">
                <p className="text-xs text-muted mb-2 uppercase tracking-wider">{t.bookDetail.sharedBy}</p>
                <Link href={`/profile/${book.owner_id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                  <div className="w-10 h-10 rounded-full bg-gold flex items-center justify-center text-ink font-semibold shrink-0 overflow-hidden">
                    {book.owner_avatar
                      ? <img src={book.owner_avatar} alt="" className="w-full h-full object-cover" />
                      : book.owner_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-ink text-sm">{book.owner_name}</p>
                    {ownerLocation && <p className="text-xs text-muted">📍 {ownerLocation}</p>}
                    {book.owner_rating && <p className="text-xs text-muted">⭐ {Number(book.owner_rating).toFixed(1)}</p>}
                  </div>
                </Link>
                {book.distance_km !== undefined && (
                  <p className="text-xs text-muted mt-2 border-t border-[var(--border)] pt-2">
                    📏 {book.distance_km < 1
                      ? `${Math.round(book.distance_km * 1000)}m ${t.bookDetail.away}`
                      : `${book.distance_km.toFixed(1)}km ${t.bookDetail.away}`}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-6">
            <div>
              <h1 className="font-display text-3xl text-ink">{book.title}</h1>
              <p className="text-lg text-muted mt-1">{book.author}</p>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {genreLabel && (
                <span className="px-3 py-1 bg-cream text-brown text-sm rounded-full">{genreLabel}</span>
              )}
              {conditionLabel && (
                <span className={`px-3 py-1 text-sm rounded-full ${CONDITION_COLORS[book.condition || ""] || "bg-gray-50 text-gray-600"}`}>
                  {t.bookDetail.condition}: {conditionLabel}
                </span>
              )}
              {book.language && (
                <span className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full">
                  {t.addBook.languages && (t.addBook.languages as {value: string; label: string}[]).find(l => l.value === book.language)?.label || book.language}
                </span>
              )}
              {book.max_borrow_days && (
                <span className="px-3 py-1 bg-purple-50 text-purple-700 text-sm rounded-full">
                  {t.bookDetail.upTo} {book.max_borrow_days} {t.requests.days}
                </span>
              )}
            </div>

            {/* Description */}
            {book.description && (
              <div className="bg-white rounded-2xl border border-[var(--border)] p-5">
                <h2 className="font-medium text-ink mb-2">{t.bookDetail.about}</h2>
                <p className="text-sm text-muted leading-relaxed">{book.description}</p>
              </div>
            )}

            {/* Request section */}
            {!isOwner && (
              <div className="bg-white rounded-2xl border border-[var(--border)] p-5">
                {alreadyRequested ? (
                  <div className="text-center py-2">
                    <span className="text-2xl">✅</span>
                    <p className="font-medium text-ink mt-2">{t.bookDetail.alreadyRequested}</p>
                    <Link href="/requests" className="text-sm text-brown hover:underline mt-1 inline-block">
                      {t.bookDetail.viewRequests}
                    </Link>
                  </div>
                ) : book.status === "available" ? (
                  <>
                    {!showRequestForm ? (
                      <button
                        onClick={() => user ? setShowRequestForm(true) : router.push("/login")}
                        className="w-full py-3 bg-ink text-gold font-display font-semibold rounded-xl hover:bg-brown transition-colors"
                      >
                        {t.bookDetail.requestBook}
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <h2 className="font-medium text-ink">{t.bookDetail.requestBook}</h2>
                        <textarea
                          value={message}
                          onChange={e => setMessage(e.target.value)}
                          placeholder={t.bookDetail.messagePlaceholder}
                          rows={3}
                          className="w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm focus:border-gold transition-colors resize-none"
                        />
                        <div className="flex gap-2">
                          <button onClick={() => setShowRequestForm(false)}
                            className="flex-1 py-2.5 border border-[var(--border)] text-brown rounded-xl text-sm hover:bg-cream transition-colors">
                            {t.addBook.cancel}
                          </button>
                          <button onClick={handleRequest} disabled={requesting}
                            className="flex-1 py-2.5 bg-ink text-gold font-medium rounded-xl text-sm hover:bg-brown transition-colors disabled:opacity-60">
                            {requesting ? "..." : t.bookDetail.sendRequest}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-2">
                    <p className="text-muted text-sm">{t.bookDetail.notAvailable}</p>
                    <button
                      onClick={() => user ? handleRequest() : router.push("/login")}
                      className="mt-3 w-full py-2.5 border border-[var(--border)] text-brown font-medium rounded-xl text-sm hover:bg-cream transition-colors"
                    >
                      {t.bookDetail.joinWaitlist}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Owner actions */}
            {isOwner && (
              <Link href={`/my-books/edit/${book.id}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-[var(--border)] text-brown rounded-xl text-sm hover:bg-cream transition-colors">
                ✏️ {t.myBooks.edit}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
