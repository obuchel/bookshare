"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/hooks/useApi";
import { useLang } from "@/contexts/LangContext";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/Toast";

interface Contact {
  contact_id: string;
  name: string;
  city?: string;
  county?: string;
  province?: string;
  avatar_url?: string;
  rating?: number;
  books_shared?: number;
  connected_at: string;
}

interface SearchUser {
  id: string;
  name: string;
  city?: string;
  county?: string;
  province?: string;
  avatar_url?: string;
  rating?: number;
  books_shared?: number;
  is_contact: number;
}

function Avatar({ name, url, size = "md" }: { name: string; url?: string; size?: "sm" | "md" | "lg" }) {
  const sz = size === "lg" ? "w-14 h-14 text-xl" : size === "sm" ? "w-8 h-8 text-sm" : "w-11 h-11 text-base";
  return url ? (
    <img src={url} alt={name} className={`${sz} rounded-full object-cover shrink-0`} />
  ) : (
    <div className={`${sz} rounded-full bg-gold flex items-center justify-center text-ink font-semibold shrink-0`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function PeoplePage() {
  const { user } = useAuth();
  const { apiFetch } = useApi();
  const { t } = useLang();
  const router = useRouter();
  const { toasts, showToast } = useToast();
  const p = {
    title: (t as any).people?.title ?? "People",
    sub: (t as any).people?.sub ?? "Your contacts and the BookShare community",
    searchPlaceholder: (t as any).people?.searchPlaceholder ?? "Search by name or city...",
    myContacts: (t as any).people?.myContacts ?? "My Contacts",
    findPeople: (t as any).people?.findPeople ?? "Find People",
    addContact: (t as any).people?.addContact ?? "Add",
    added: (t as any).people?.added ?? "Added",
    removeContact: (t as any).people?.removeContact ?? "Remove",
    noContacts: (t as any).people?.noContacts ?? "No contacts yet",
    noContactsSub: (t as any).people?.noContactsSub ?? "Search for people to add, or invite friends to join",
    noResults: (t as any).people?.noResults ?? "No people found",
    message: (t as any).people?.message ?? "Message",
    viewProfile: (t as any).people?.viewProfile ?? "Profile",
    connected: (t as any).people?.connected ?? "Connected",
    booksShared: (t as any).people?.booksShared ?? "books",
  };
  const searchRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<"contacts" | "find">("contacts");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  useEffect(() => { if (!user) router.push("/login"); }, [user, router]);

  const fetchContacts = useCallback(async () => {
    try {
      const data = await apiFetch("/api/contacts");
      setContacts(data.contacts || []);
    } catch { /* silent */ }
  }, [apiFetch]);

  useEffect(() => { if (user) fetchContacts(); }, [user, fetchContacts]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await apiFetch(`/api/users/search?q=${encodeURIComponent(query)}`);
        setResults(data.users || []);
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, apiFetch]);

  const addContact = async (userId: string) => {
    setAddingId(userId);
    try {
      await apiFetch("/api/contacts", {
        method: "POST",
        body: JSON.stringify({ contact_id: userId }),
      });
      setAddedIds(prev => new Set([...prev, userId]));
      setResults(prev => prev.map(u => u.id === userId ? { ...u, is_contact: 1 } : u));
      fetchContacts();
      showToast("Contact added!");
    } catch {
      showToast("Failed to add contact", "error");
    } finally {
      setAddingId(null);
    }
  };

  const removeContact = async (contactId: string) => {
    setRemovingId(contactId);
    try {
      await apiFetch(`/api/contacts/${contactId}`, { method: "DELETE" });
      setContacts(prev => prev.filter(c => c.contact_id !== contactId));
      showToast("Contact removed");
    } catch {
      showToast("Failed to remove", "error");
    } finally {
      setRemovingId(null);
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const locationStr = (u: { city?: string; county?: string; province?: string }) =>
    [u.city, u.county, u.province].filter(Boolean).join(", ") || "";

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Nav />
      <ToastContainer toasts={toasts} />

      {/* Header */}
      <div className="bg-ink text-white py-8 px-6">
        <div className="max-w-3xl mx-auto flex items-end justify-between">
          <div>
            <h1 className="font-display text-3xl mb-1">{p.title}</h1>
            <p className="text-white/50 text-sm">{p.sub}</p>
          </div>
          <div className="font-display text-2xl text-gold">
            {contacts.length}
            <span className="text-white/40 text-xs ml-2 uppercase tracking-widest">{p.myContacts}</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex border-b border-[var(--border)] mb-6">
          {([
            ["contacts", `👥 ${p.myContacts}`, contacts.length],
            ["find", `🔍 ${p.findPeople}`, null],
          ] as const).map(([key, label, count]) => (
            <button key={key} onClick={() => { setTab(key); if (key === "find") setTimeout(() => searchRef.current?.focus(), 100); }}
              className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === key ? "text-brown border-gold" : "text-muted border-transparent hover:text-brown"}`}>
              {label}
              {count !== null && count > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-gold text-ink text-xs rounded-full">{count}</span>
              )}
            </button>
          ))}
        </div>

        {/* My Contacts tab */}
        {tab === "contacts" && (
          <div>
            {contacts.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-[var(--border)]">
                <span className="text-5xl">👥</span>
                <h2 className="font-display text-xl mt-4 mb-2">{p.noContacts}</h2>
                <p className="text-muted text-sm mb-6">{p.noContactsSub}</p>
                <button onClick={() => setTab("find")}
                  className="px-5 py-2.5 bg-ink text-gold font-medium rounded-xl hover:bg-brown transition-colors text-sm">
                  {p.findPeople} →
                </button>
              </div>
            ) : (
              <div className="grid gap-3">
                {contacts.map(c => (
                  <div key={c.contact_id} className="bg-white rounded-2xl border border-[var(--border)] p-4 flex items-center gap-4 hover:border-gold/40 transition-colors">
                    <Avatar name={c.name} url={c.avatar_url} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-ink">{c.name}</p>
                      <p className="text-sm text-muted truncate">
                        {locationStr(c) && `📍 ${locationStr(c)}`}
                        {c.rating ? ` · ⭐ ${Number(c.rating).toFixed(1)}` : ""}
                        {c.books_shared ? ` · ${c.books_shared} ${p.booksShared}` : ""}
                      </p>
                      <p className="text-xs text-muted/70 mt-0.5">{p.connected} {formatDate(c.connected_at)}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Link href={`/messages?with=${c.contact_id}`}
                        className="px-3 py-1.5 border border-[var(--border)] text-brown text-xs font-medium rounded-lg hover:bg-cream transition-colors">
                        ✉ {p.message}
                      </Link>
                      <Link href={`/profile/${c.contact_id}`}
                        className="px-3 py-1.5 border border-[var(--border)] text-brown text-xs font-medium rounded-lg hover:bg-cream transition-colors">
                        {p.viewProfile}
                      </Link>
                      <button
                        onClick={() => removeContact(c.contact_id)}
                        disabled={removingId === c.contact_id}
                        className="px-3 py-1.5 border border-red-200 text-red-400 text-xs font-medium rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50">
                        {removingId === c.contact_id ? "..." : "✕"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Find People tab */}
        {tab === "find" && (
          <div className="space-y-4">
            {/* Search input */}
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">🔍</span>
              <input
                ref={searchRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={p.searchPlaceholder}
                className="w-full pl-10 pr-4 py-3 border border-[var(--border)] rounded-xl text-sm focus:border-gold transition-colors bg-white"
              />
              {searching && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted text-xs">...</span>}
            </div>

            {/* Results */}
            {query.trim() && (
              <div className="space-y-2">
                {results.length === 0 && !searching ? (
                  <div className="text-center py-10 text-muted text-sm bg-white rounded-2xl border border-[var(--border)]">
                    <span className="text-3xl block mb-2">🔍</span>
                    {p.noResults}
                  </div>
                ) : results.map(u => {
                  const isAdded = u.is_contact === 1 || addedIds.has(u.id);
                  return (
                    <div key={u.id} className="bg-white rounded-2xl border border-[var(--border)] p-4 flex items-center gap-4 hover:border-gold/40 transition-colors">
                      <Avatar name={u.name} url={u.avatar_url} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-ink">{u.name}</p>
                        <p className="text-sm text-muted truncate">
                          {locationStr(u) && `📍 ${locationStr(u)}`}
                          {u.rating ? ` · ⭐ ${Number(u.rating).toFixed(1)}` : ""}
                          {u.books_shared ? ` · ${u.books_shared} ${p.booksShared}` : ""}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Link href={`/profile/${u.id}`}
                          className="px-3 py-1.5 border border-[var(--border)] text-brown text-xs font-medium rounded-lg hover:bg-cream transition-colors">
                          {p.viewProfile}
                        </Link>
                        {isAdded ? (
                          <span className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium rounded-lg">
                            ✓ {p.added}
                          </span>
                        ) : (
                          <button
                            onClick={() => addContact(u.id)}
                            disabled={addingId === u.id}
                            className="px-3 py-1.5 bg-ink text-gold text-xs font-medium rounded-lg hover:bg-brown transition-colors disabled:opacity-50">
                            {addingId === u.id ? "..." : `+ ${p.addContact}`}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Prompt when empty */}
            {!query.trim() && (
              <div className="text-center py-14 text-muted text-sm">
                <span className="text-4xl block mb-3">👀</span>
                {p.searchPlaceholder}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}