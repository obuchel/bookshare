"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/hooks/useApi";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/Toast";

const GENRES = [
  "Fiction", "Non-Fiction", "Mystery", "Science Fiction", "Fantasy",
  "Biography", "History", "Science", "Philosophy", "Poetry",
  "Romance", "Thriller", "Children", "Young Adult", "Cooking", "Other",
];
const CONDITIONS = ["Like New", "Good", "Fair", "Worn"];
const LANGUAGES = ["English", "Spanish", "French", "German", "Portuguese", "Italian", "Dutch", "Polish", "Other"];

export default function AddBookPage() {
  const { user } = useAuth();
  const { apiFetch } = useApi();
  const router = useRouter();
  const { toasts, showToast } = useToast();

  const [form, setForm] = useState({
    title: "",
    author: "",
    isbn: "",
    cover_url: "",
    description: "",
    genre: "",
    language: "English",
    condition: "Good",
    max_borrow_days: 30,
  });
  const [loading, setLoading] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);

  if (!user) { router.push("/login"); return null; }

  const set = (field: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const lookupISBN = async () => {
    if (!form.isbn) return;
    setLookingUp(true);
    try {
      const res = await fetch(
        `https://openlibrary.org/api/books?bibkeys=ISBN:${form.isbn}&format=json&jscmd=data`
      );
      const data = await res.json();
      const book = data[`ISBN:${form.isbn}`];
      if (book) {
        setForm((prev) => ({
          ...prev,
          title: book.title || prev.title,
          author: book.authors?.[0]?.name || prev.author,
          description: book.notes?.value || book.excerpts?.[0]?.text || prev.description,
          cover_url: book.cover?.large || book.cover?.medium || prev.cover_url,
        }));
        showToast("Book details filled from Open Library!");
      } else {
        showToast("ISBN not found in Open Library", "error");
      }
    } catch {
      showToast("Lookup failed — fill in manually", "error");
    } finally {
      setLookingUp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.author) return;
    setLoading(true);
    try {
      const data = await apiFetch("/api/books", {
        method: "POST",
        body: JSON.stringify({ ...form, max_borrow_days: Number(form.max_borrow_days) }),
      });
      showToast("Book added to your library!");
      setTimeout(() => router.push(`/books/${data.book.id}`), 800);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to add book", "error");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Nav />
      <ToastContainer toasts={toasts} />

      <div className="max-w-2xl mx-auto px-6 py-10">
        <Link href="/my-books" className="text-sm text-muted hover:text-brown flex items-center gap-1 mb-6">
          ← My Library
        </Link>

        <h1 className="font-display text-3xl text-ink mb-8">Add a Book</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ISBN lookup */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm font-medium text-ink mb-3">
              📷 Have the ISBN? Auto-fill details
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.isbn}
                onChange={set("isbn")}
                placeholder="e.g. 9780593311233"
                className="flex-1 px-3 py-2 border border-[var(--border)] rounded-lg text-sm focus:border-gold transition-colors"
              />
              <button
                type="button"
                onClick={lookupISBN}
                disabled={lookingUp || !form.isbn}
                className="px-4 py-2 bg-gold text-ink font-medium rounded-lg text-sm hover:bg-yellow-400 transition-colors disabled:opacity-50"
              >
                {lookingUp ? "Looking up..." : "Lookup"}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[var(--border)] p-6 space-y-5">
            <div className="grid grid-cols-1 gap-5">
              <div>
                <label className="text-sm font-medium text-ink mb-1.5 block">
                  Title <span className="text-rust">*</span>
                </label>
                <input
                  required
                  value={form.title}
                  onChange={set("title")}
                  placeholder="The Name of the Wind"
                  className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:border-gold transition-colors"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-ink mb-1.5 block">
                  Author <span className="text-rust">*</span>
                </label>
                <input
                  required
                  value={form.author}
                  onChange={set("author")}
                  placeholder="Patrick Rothfuss"
                  className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:border-gold transition-colors"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-ink mb-1.5 block">
                  Cover Image URL
                </label>
                <div className="flex gap-3 items-start">
                  <input
                    value={form.cover_url}
                    onChange={set("cover_url")}
                    placeholder="https://..."
                    className="flex-1 px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:border-gold transition-colors"
                  />
                  {form.cover_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={form.cover_url}
                      alt="cover preview"
                      className="w-12 h-16 object-cover rounded-lg border border-[var(--border)]"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-ink mb-1.5 block">Description</label>
                <textarea
                  value={form.description}
                  onChange={set("description")}
                  rows={3}
                  placeholder="A brief description of the book..."
                  className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:border-gold transition-colors resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-ink mb-1.5 block">Genre</label>
                  <select
                    value={form.genre}
                    onChange={set("genre")}
                    className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm bg-white focus:border-gold transition-colors"
                  >
                    <option value="">Select genre</option>
                    {GENRES.map((g) => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-ink mb-1.5 block">Language</label>
                  <select
                    value={form.language}
                    onChange={set("language")}
                    className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm bg-white focus:border-gold transition-colors"
                  >
                    {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-ink mb-1.5 block">Condition</label>
                  <select
                    value={form.condition}
                    onChange={set("condition")}
                    className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm bg-white focus:border-gold transition-colors"
                  >
                    {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-ink mb-1.5 block">
                    Max borrow (days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={form.max_borrow_days}
                    onChange={set("max_borrow_days")}
                    className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:border-gold transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Link
              href="/my-books"
              className="flex-1 py-3 border border-[var(--border)] text-muted rounded-xl text-center text-sm hover:bg-cream transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-ink text-gold font-display font-semibold rounded-xl hover:bg-brown transition-colors disabled:opacity-60"
            >
              {loading ? "Adding..." : "Add to My Library →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
