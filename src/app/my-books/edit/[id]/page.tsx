"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Nav from "@/components/Nav";
import ImageUpload from "@/components/ImageUpload";
import ContributorsField, { Contributor } from "@/components/ContributorsField";
import TagsField from "@/components/TagsField";
import RelatedBooksField, { RelatedBook } from "@/components/RelatedBooksField";
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
  title: string; author: string; genre: string; condition: string;
  description: string; language: string; cover_url: string; borrow_days: number;
  pub_year: string; publisher: string; pub_place: string; isbn: string; series: string;
}

export default function EditBookPage() {
  const { user } = useAuth();
  const { apiFetch } = useApi();
  const { t } = useLang();
  const router = useRouter();
  const params = useParams();
  const bookId = params.id as string;
  const { toasts, showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [isbnLoading, setIsbnLoading] = useState(false);
  const [related, setRelated] = useState<RelatedBook[]>([]);
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [form, setForm] = useState<BookForm>({
    title: "", author: "", genre: "", condition: "Good",
    description: "", language: "", cover_url: "", borrow_days: 14,
    pub_year: "", publisher: "", pub_place: "", isbn: "", series: "", tags: [],
  });

  useEffect(() => { if (!user) router.push("/login"); }, [user, router]);

  useEffect(() => {
    if (!bookId) return;
    const load = async () => {
      try {
        const data = await apiFetch(`/api/books/${bookId}`);
        const b = data.book;
        setForm({
          title: b.title || "",
          author: b.author || "",
          genre: b.genre || "",
          condition: b.condition || "Good",
          description: b.description || "",
          language: b.language || "",
          cover_url: b.cover_url || "",
          borrow_days: b.max_borrow_days || 14,
          pub_year: b.pub_year ? String(b.pub_year) : "",
          publisher: b.publisher || "",
          pub_place: b.pub_place || "",
          isbn: b.isbn || "",
          series: b.series || "",
        });
        if (Array.isArray(b.tags)) setForm(prev => ({ ...prev, tags: b.tags }));
        if (Array.isArray(b.related)) setRelated(b.related);
        if (b.contributors?.length) {
          setContributors(b.contributors);
        } else if (b.author) {
          setContributors([{ id: crypto.randomUUID(), name: b.author, role: "author", position: 1 }]);
        }
      } catch {
        showToast("Failed to load book", "error");
        router.push("/my-books");
      } finally {
        setFetching(false);
      }
    };
    load();
  }, [bookId, apiFetch, router, showToast]);

  const set = (field: keyof BookForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }));

  const lookupISBN = async () => {
    if (!form.isbn) return;
    setIsbnLoading(true);
    try {
      const res = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${form.isbn}&format=json&jscmd=data`);
      const data = await res.json();
      const book = data[`ISBN:${form.isbn}`];
      if (book) {
        const firstAuthor = book.authors?.[0]?.name || "";
        setForm(prev => ({
          ...prev,
          title: book.title || prev.title,
          author: firstAuthor || prev.author,
          description: book.notes?.value || book.excerpts?.[0]?.text || prev.description,
          cover_url: book.cover?.large || book.cover?.medium || prev.cover_url,
          pub_year: book.publish_date ? book.publish_date.replace(/\D/g, "").slice(0, 4) : prev.pub_year,
          publisher: book.publishers?.[0]?.name || prev.publisher,
          pub_place: book.publish_places?.[0]?.name || prev.pub_place,
          series: book.series?.[0] || prev.series,
        }));
        if (firstAuthor && contributors[0]?.name === "") {
          setContributors([{ id: crypto.randomUUID(), name: firstAuthor, role: "author", position: 1 }]);
        }
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
    const validContributors = contributors.filter(c => c.name.trim());
    if (!form.title || validContributors.length === 0) {
      showToast("Title and at least one contributor are required", "error"); return;
    }
    setLoading(true);
    try {
      await apiFetch(`/api/books/${bookId}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...form,
          author: validContributors.map(c => c.name).join(", "),
          contributors: validContributors,
          pub_year: form.pub_year ? parseInt(form.pub_year) : null,
        }),
      });
      showToast(t.myBooks.saveChanges + "!");
      setTimeout(() => router.push("/my-books"), 800);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!user || fetching) return (
    <div className="min-h-screen"><Nav />
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <Nav /><ToastContainer toasts={toasts} />
      <div className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="font-display text-3xl text-ink mb-6">{t.myBooks.editTitle}</h1>

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
                className="mt-2 text-xs text-red-500 hover:underline">
                {t.myBooks.removeCover}
              </button>
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

          {/* Contributors */}
          <div className="bg-white rounded-2xl border border-[var(--border)] p-6 space-y-4">
            <h2 className="font-medium text-ink">{t.addBook.contributors}</h2>
            <ContributorsField contributors={contributors} onChange={setContributors} />
          </div>

          {/* Basic Info */}
          <div className="bg-white rounded-2xl border border-[var(--border)] p-6 space-y-4">
            <h2 className="font-medium text-ink">{t.addBook.bookDetails}</h2>
            <div>
              <label className="text-sm font-medium text-ink mb-1.5 block">{t.addBook.titleLabel} *</label>
              <input required value={form.title} onChange={set("title")}
                className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:border-gold transition-colors" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-ink mb-1.5 block">{t.addBook.genre}</label>
                <select value={form.genre} onChange={set("genre")}
                  className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm bg-white focus:border-gold transition-colors">
                  <option value="">{t.addBook.selectGenre}</option>
                  {GENRES.map(g => (
                    <option key={g} value={g}>{t.addBook.genres[g as keyof typeof t.addBook.genres] ?? g}</option>
                  ))}
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
                <select value={form.language} onChange={set("language")}
                  className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm bg-white focus:border-gold transition-colors">
                  <option value="">{t.addBook.languagePlaceholder}</option>
                  {(t.addBook.languages as readonly {value: string; label: string}[]).map(l => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-ink mb-1.5 block">{t.addBook.maxBorrow}</label>
                <input type="number" min={1} max={90} value={form.borrow_days} onChange={set("borrow_days")}
                  className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:border-gold transition-colors" />
              </div>
            </div>
          </div>

          {/* Publication Info */}
          <div className="bg-white rounded-2xl border border-[var(--border)] p-6 space-y-4">
            <h2 className="font-medium text-ink">{t.addBook.publicationInfo}</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-ink mb-1.5 block">{t.addBook.pubYear}</label>
                <input type="number" min={1000} max={new Date().getFullYear()} value={form.pub_year}
                  onChange={set("pub_year")} placeholder="2023"
                  className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:border-gold transition-colors" />
              </div>
              <div>
                <label className="text-sm font-medium text-ink mb-1.5 block">{t.addBook.pubPlace}</label>
                <input value={form.pub_place} onChange={set("pub_place")} placeholder="Kyiv"
                  className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:border-gold transition-colors" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-ink mb-1.5 block">{t.addBook.publisher}</label>
              <input value={form.publisher} onChange={set("publisher")} placeholder="Vydavnytstvo"
                className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:border-gold transition-colors" />
            </div>
            <div>
              <label className="text-sm font-medium text-ink mb-1.5 block">{t.addBook.series}</label>
              <input value={form.series} onChange={set("series")} placeholder={t.addBook.seriesPlaceholder}
                className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:border-gold transition-colors" />
            </div>
          </div>

          {/* Tags */}
          <div className="bg-white rounded-2xl border border-[var(--border)] p-6 space-y-4">
            <h2 className="font-medium text-ink">{t.addBook.tags}</h2>
            <TagsField tags={form.tags} onChange={(tags) => setForm(prev => ({ ...prev, tags }))} />
          </div>

          {/* Related Books */}
          <div className="bg-white rounded-2xl border border-[var(--border)] p-6 space-y-4">
            <h2 className="font-medium text-ink">{t.addBook.relatedBooks}</h2>
            <RelatedBooksField related={related} currentBookId={bookId} onChange={setRelated} />
          </div>

          {/* Description */}
          <div className="bg-white rounded-2xl border border-[var(--border)] p-6">
            <h2 className="font-medium text-ink mb-4">{t.addBook.description}</h2>
            <textarea value={form.description} onChange={set("description")}
              placeholder={t.addBook.description} rows={6} maxLength={2000}
              className="w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm focus:border-gold transition-colors resize-none" />
            <p className="text-xs text-muted mt-1 text-right">{form.description.length}/2000</p>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => router.back()}
              className="flex-1 py-3 border border-[var(--border)] text-brown font-medium rounded-xl hover:bg-cream transition-colors">
              {t.addBook.cancel}
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-3 bg-ink text-gold font-display font-semibold rounded-xl hover:bg-brown transition-colors disabled:opacity-60">
              {loading ? t.addBook.submitting : t.myBooks.saveChanges}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
