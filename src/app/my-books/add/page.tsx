"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import ImageUpload from "@/components/ImageUpload";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/hooks/useApi";
import { useLang } from "@/contexts/LangContext";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/Toast";

const GENRES = ["Fiction","Non-Fiction","Mystery","Science Fiction","Fantasy","Biography",
  "History","Science","Philosophy","Poetry","Romance","Thriller","Children","Young Adult","Cooking"];

const CONDITION_KEYS = ["New","Like New","Very Good","Good","Fair","Poor"] as const;
type ConditionKey = typeof CONDITION_KEYS[number];

interface BookForm {
  title: string;
  author: string;
  genre: string;
  condition: string;
  description: string;
  language: string;
  isbn: string;
  cover_url: string;
  borrow_days: number;
}

export default function AddBookPage() {
  const { user } = useAuth();
  const { apiFetch } = useApi();
  const { t } = useLang();
  const router = useRouter();
  const { toasts, showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isbnLoading, setIsbnLoading] = useState(false);
  const [form, setForm] = useState<BookForm>({
    title: "", author: "", genre: "", condition: "Good",
    description: "", language: "", isbn: "", cover_url: "", borrow_days: 14,
  });

  useEffect(() => { if (!user) router.push("/login"); }, [user, router]);

  const set = (field: keyof BookForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  // Auto-fill from ISBN via Open Library
  const lookupISBN = async () => {
    if (!form.isbn) return;
    setIsbnLoading(true);
    try {
      const res = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${form.isbn}&format=json&jscmd=data`);
      const data = await res.json();
      const book = data[`ISBN:${form.isbn}`];
      if (book) {
        setForm(prev => ({
          ...prev,
          title: book.title || prev.title,
          author: book.authors?.[0]?.name || prev.author,
          description: book.notes?.value || book.excerpts?.[0]?.text || prev.description,
          cover_url: book.cover?.large || book.cover?.medium || prev.cover_url,
        }));
        showToast("Book details filled from ISBN!");
      } else {
        showToast("ISBN not found", "error");
      }
    } catch {
      showToast("ISBN lookup failed", "error");
    } finally {
      setIsbnLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.author) { showToast("Title and author are required", "error"); return; }
    setLoading(true);
    try {
      await apiFetch("/api/books", { method: "POST", body: JSON.stringify(form) });
      showToast("Book added!");
      setTimeout(() => router.push("/my-books"), 1000);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to add book", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen">
      <Nav /><ToastContainer toasts={toasts} />
      <div className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="font-display text-3xl text-ink mb-6">{t.addBook.title}</h1>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Cover Image */}
          <div className="bg-white rounded-2xl border border-[var(--border)] p-6">
            <h2 className="font-medium text-ink mb-4">{t.addBook.coverImageLabel}</h2>
            <ImageUpload
              type="book"
              currentUrl={form.cover_url}
              onUpload={(url) => setForm(prev => ({ ...prev, cover_url: url }))}
              placeholder={t.addBook.uploadCover}
            />
            {form.cover_url && (
              <button type="button" onClick={() => setForm(prev => ({ ...prev, cover_url: "" }))}
                className="mt-2 text-xs text-red-500 hover:underline">Remove image</button>
            )}
          </div>

          {/* ISBN Lookup */}
          <div className="bg-white rounded-2xl border border-[var(--border)] p-6">
            <h2 className="font-medium text-ink mb-4">{t.addBook.isbnTitle}</h2>
            <div className="flex gap-2">
              <input value={form.isbn} onChange={set("isbn")} placeholder={t.addBook.isbnPlaceholder}
                className="flex-1 px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:border-gold transition-colors" />
              <button type="button" onClick={lookupISBN} disabled={isbnLoading || !form.isbn}
                className="px-4 py-2.5 bg-ink text-gold text-sm font-medium rounded-xl hover:bg-brown transition-colors disabled:opacity-50">
                {isbnLoading ? "..." : t.addBook.lookup}
              </button>
            </div>
          </div>

          {/* Basic Info */}
          <div className="bg-white rounded-2xl border border-[var(--border)] p-6 space-y-4">
            <h2 className="font-medium text-ink">{t.addBook.bookDetails}</h2>
            <div>
              <label className="text-sm font-medium text-ink mb-1.5 block">{t.addBook.titleLabel} *</label>
              <input required value={form.title} onChange={set("title")} placeholder={t.addBook.titleLabel}
                className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:border-gold transition-colors" />
            </div>
            <div>
              <label className="text-sm font-medium text-ink mb-1.5 block">{t.addBook.authorLabel} *</label>
              <input required value={form.author} onChange={set("author")} placeholder={t.addBook.authorLabel}
                className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:border-gold transition-colors" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-ink mb-1.5 block">{t.addBook.genre}</label>
                <select value={form.genre} onChange={set("genre")}
                  className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm bg-white focus:border-gold transition-colors">
                  <option value="">{t.addBook.selectGenre}</option>
                  {GENRES.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-ink mb-1.5 block">{t.addBook.condition}</label>
                <select value={form.condition} onChange={set("condition")}
                  className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm bg-white focus:border-gold transition-colors">
                  {CONDITION_KEYS.map(c => (
                    <option key={c} value={c}>{t.addBook.conditions[c]}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-ink mb-1.5 block">{t.addBook.language}</label>
                <input value={form.language} onChange={set("language")} placeholder={t.addBook.languagePlaceholder}
                  className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:border-gold transition-colors" />
              </div>
              <div>
                <label className="text-sm font-medium text-ink mb-1.5 block">{t.addBook.maxBorrow}</label>
                <input type="number" min={1} max={90} value={form.borrow_days}
                  onChange={set("borrow_days")}
                  className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:border-gold transition-colors" />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-white rounded-2xl border border-[var(--border)] p-6">
            <h2 className="font-medium text-ink mb-4">{t.addBook.description}</h2>
            <textarea
              value={form.description}
              onChange={set("description")}
              placeholder={t.addBook.description}
              rows={6}
              maxLength={2000}
              className="w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm focus:border-gold transition-colors resize-none"
            />
            <p className="text-xs text-muted mt-1 text-right">{form.description.length}/2000</p>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => router.back()}
              className="flex-1 py-3 border border-[var(--border)] text-brown font-medium rounded-xl hover:bg-cream transition-colors">
              {t.addBook.cancel}
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-3 bg-ink text-gold font-display font-semibold rounded-xl hover:bg-brown transition-colors disabled:opacity-60">
              {loading ? t.addBook.submitting : t.addBook.submit}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
