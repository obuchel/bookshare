"use client";

import { useState, useEffect, useRef } from "react";
import { useLang } from "@/contexts/LangContext";

export interface RelatedBook {
  id: string;
  title: string;
  author: string;
  cover_url?: string;
}

interface RelatedBooksFieldProps {
  related: RelatedBook[];
  currentBookId?: string;
  onChange: (books: RelatedBook[]) => void;
}

export default function RelatedBooksField({ related, currentBookId, onChange }: RelatedBooksFieldProps) {
  const { t } = useLang();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RelatedBook[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/books?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        const filtered = (data.books || []).filter((b: RelatedBook) =>
          b.id !== currentBookId && !related.find(r => r.id === b.id)
        );
        setResults(filtered.slice(0, 6));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, currentBookId, related]);

  const add = (book: RelatedBook) => {
    onChange([...related, { id: book.id, title: book.title, author: book.author, cover_url: book.cover_url }]);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  const remove = (id: string) => onChange(related.filter(b => b.id !== id));

  return (
    <div className="space-y-3">
      {/* Selected related books */}
      {related.length > 0 && (
        <div className="space-y-2">
          {related.map(book => (
            <div key={book.id} className="flex items-center gap-3 p-2.5 bg-cream rounded-xl border border-[var(--border)]">
              {book.cover_url ? (
                <img src={book.cover_url} alt={book.title} className="w-8 h-10 object-cover rounded-md shrink-0" />
              ) : (
                <div className="w-8 h-10 bg-gold/20 rounded-md flex items-center justify-center text-sm shrink-0">📖</div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink truncate">{book.title}</p>
                <p className="text-xs text-muted truncate">{book.author}</p>
              </div>
              <button type="button" onClick={() => remove(book.id)}
                className="text-xs text-red-400 hover:text-red-600 shrink-0 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">
                {t.addBook.removeRelated}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative" ref={ref}>
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={t.addBook.searchBooks}
          className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:border-gold transition-colors"
        />
        {searching && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-xs">...</span>
        )}

        {/* Dropdown results */}
        {open && query && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[var(--border)] rounded-xl shadow-lg z-50 overflow-hidden max-h-64 overflow-y-auto">
            {results.length === 0 && !searching ? (
              <p className="text-sm text-muted px-4 py-3">{t.addBook.noResults}</p>
            ) : results.map(book => (
              <button
                key={book.id}
                type="button"
                onClick={() => add(book)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-cream transition-colors text-left"
              >
                {book.cover_url ? (
                  <img src={book.cover_url} alt={book.title} className="w-7 h-9 object-cover rounded shrink-0" />
                ) : (
                  <div className="w-7 h-9 bg-gold/20 rounded flex items-center justify-center text-xs shrink-0">📖</div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{book.title}</p>
                  <p className="text-xs text-muted truncate">{book.author}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="text-xs text-muted">{t.addBook.relatedBooksHint}</p>
    </div>
  );
}
