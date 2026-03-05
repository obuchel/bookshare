"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

interface Invite {
  id: string;
  email: string;
  status: string;
  invited_name?: string;
  invited_city?: string;
  created_at: string;
  accepted_at?: string;
}

function Avatar({ name, url, size = "md" }: { name: string; url?: string; size?: "sm" | "md" }) {
  const sz = size === "sm" ? "w-8 h-8 text-sm" : "w-11 h-11 text-base";
  return url ? (
    <img src={url} alt={name} className={`${sz} rounded-full object-cover shrink-0`} />
  ) : (
    <div className={`${sz} rounded-full bg-gold flex items-center justify-center text-ink font-semibold shrink-0`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function PeoplePageInner() {
  const { user } = useAuth();
  const { apiFetch } = useApi();
  const { t } = useLang();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toasts, showToast } = useToast();
  const searchRef = useRef<HTMLInputElement>(null);

  const p = {
    title: (t as any).people?.title ?? "People",
    sub: (t as any).people?.sub ?? "Your contacts and the BookShare community",
    searchPlaceholder: (t as any).people?.searchPlaceholder ?? "Search by name or city...",
    myContacts: (t as any).people?.myContacts ?? "My Contacts",
    findPeople: (t as any).people?.findPeople ?? "Find People",
    addContact: (t as any).people?.addContact ?? "Add",
    added: (t as any).people?.added ?? "Added",
    noContacts: (t as any).people?.noContacts ?? "No contacts yet",
    noContactsSub: (t as any).people?.noContactsSub ?? "Search for people to add, or invite friends to join",
    noResults: (t as any).people?.noResults ?? "No people found",
    message: (t as any).people?.message ?? "Message",
    viewProfile: (t as any).people?.viewProfile ?? "Profile",
    connected: (t as any).people?.connected ?? "Connected",
    booksShared: (t as any).people?.booksShared ?? "books",
  };

  const initialTab = (searchParams.get("tab") as "contacts" | "find" | "invite") || "contacts";
  const [tab, setTab] = useState<"contacts" | "find" | "invite">(initialTab);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [mailTo, setMailTo] = useState("");
  const [sending, setSending] = useState(false);

  const inviteLink = typeof window !== "undefined"
    ? `${window.location.origin}/register?ref=${user?.id}` : "";

  useEffect(() => { if (!user) router.push("/login"); }, [user, router]);

  const fetchData = useCallback(async () => {
    try {
      const [contactData, invData] = await Promise.all([
        apiFetch("/api/contacts"),
        apiFetch("/api/invites"),
      ]);
      setContacts(contactData.contacts || []);
      setInvites(invData.invites || []);
    } catch { /* silent */ }
  }, [apiFetch]);

  useEffect(() => { if (user) fetchData(); }, [user, fetchData]);

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
      await apiFetch("/api/contacts", { method: "POST", body: JSON.stringify({ contact_id: userId }) });
      setAddedIds(prev => new Set([...prev, userId]));
      setResults(prev => prev.map(u => u.id === userId ? { ...u, is_contact: 1 } : u));
      fetchData();
      showToast("Contact added!");
    } catch { showToast("Failed to add contact", "error"); }
    finally { setAddingId(null); }
  };

  const removeContact = async (contactId: string) => {
    setRemovingId(contactId);
    try {
      await apiFetch(`/api/contacts/${contactId}`, { method: "DELETE" });
      setContacts(prev => prev.filter(c => c.contact_id !== contactId));
      showToast("Contact removed");
    } catch { showToast("Failed to remove", "error"); }
    finally { setRemovingId(null); }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareViaWhatsApp = () => {
    const text = encodeURIComponent(`${user?.name} invites you to BookShare — lend & borrow books in your community! Join here: ${inviteLink}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const shareViaTelegram = () => {
    const text = encodeURIComponent(`Join BookShare — lend & borrow books in your community!`);
    window.open(`https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${text}`, "_blank");
  };

  const shareViaMail = async () => {
    if (!mailTo || !mailTo.includes("@")) { showToast("Please enter a valid email address", "error"); return; }
    setSending(true);
    try {
      await apiFetch("/api/invites", { method: "POST", body: JSON.stringify({ emails: [mailTo] }) });
      const res = await fetch("/api/invites/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to_email: mailTo, from_name: user?.name ?? "Someone", invite_link: inviteLink }),
      });
      if (!res.ok) throw new Error("Failed to send email");
      showToast(`Invite sent to ${mailTo}!`);
      setMailTo("");
      fetchData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to send invite", "error");
    } finally { setSending(false); }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const locationStr = (u: { city?: string; county?: string; province?: string }) =>
    [u.city, u.county, u.province].filter(Boolean).join(", ");

  if (!user) return null;

  const pendingCount = invites.filter(i => i.status === "pending").length;
  const joinedCount = invites.filter(i => i.status === "accepted" || i.status === "joined").length;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Nav />
      <ToastContainer toasts={toasts} />

      {/* Header */}
      <div className="bg-ink text-white py-8 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-display text-3xl mb-1">{p.title}</h1>
          <p className="text-white/50 text-sm mb-5">{p.sub}</p>
          <div className="flex gap-6">
            {[
              { num: contacts.length, label: p.myContacts },
              { num: joinedCount, label: t.invite.joined },
              { num: pendingCount, label: t.invite.pending },
            ].map(s => (
              <div key={s.label}>
                <span className="font-display text-2xl text-gold">{s.num}</span>
                <span className="text-white/40 text-xs ml-2 uppercase tracking-widest">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex border-b border-[var(--border)] mb-6">
          {([
            ["contacts", `👥 ${p.myContacts}`, contacts.length],
            ["find", `🔍 ${p.findPeople}`, null],
            ["invite", `📨 ${t.invite.tabInvitePeople}`, pendingCount],
          ] as const).map(([key, label, count]) => (
            <button key={key}
              onClick={() => { setTab(key); if (key === "find") setTimeout(() => searchRef.current?.focus(), 100); }}
              className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === key ? "text-brown border-gold" : "text-muted border-transparent hover:text-brown"}`}>
              {label}
              {count !== null && count > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-gold text-ink text-xs rounded-full">{count}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── My Contacts ── */}
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
                    <Avatar name={c.name} url={c.avatar_url} />
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
                      <button onClick={() => removeContact(c.contact_id)} disabled={removingId === c.contact_id}
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

        {/* ── Find People ── */}
        {tab === "find" && (
          <div className="space-y-4">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">🔍</span>
              <input ref={searchRef} value={query} onChange={e => setQuery(e.target.value)}
                placeholder={p.searchPlaceholder}
                className="w-full pl-10 pr-4 py-3 border border-[var(--border)] rounded-xl text-sm focus:border-gold transition-colors bg-white" />
              {searching && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted text-xs">...</span>}
            </div>
            {query.trim() ? (
              <div className="space-y-2">
                {results.length === 0 && !searching ? (
                  <div className="text-center py-10 text-muted text-sm bg-white rounded-2xl border border-[var(--border)]">
                    <span className="text-3xl block mb-2">🔍</span>{p.noResults}
                  </div>
                ) : results.map(u => {
                  const isAdded = u.is_contact === 1 || addedIds.has(u.id);
                  return (
                    <div key={u.id} className="bg-white rounded-2xl border border-[var(--border)] p-4 flex items-center gap-4 hover:border-gold/40 transition-colors">
                      <Avatar name={u.name} url={u.avatar_url} />
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
                          <button onClick={() => addContact(u.id)} disabled={addingId === u.id}
                            className="px-3 py-1.5 bg-ink text-gold text-xs font-medium rounded-lg hover:bg-brown transition-colors disabled:opacity-50">
                            {addingId === u.id ? "..." : `+ ${p.addContact}`}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-14 text-muted text-sm">
                <span className="text-4xl block mb-3">👀</span>
                {p.searchPlaceholder}
              </div>
            )}
          </div>
        )}

        {/* ── Invite ── */}
        {tab === "invite" && (
          <div className="space-y-6">
            {/* Invite link */}
            <div className="bg-white rounded-2xl border border-[var(--border)] p-6">
              <h2 className="font-display text-lg text-ink mb-1">{t.invite.inviteLinkTitle}</h2>
              <p className="text-muted text-sm mb-4">{t.invite.inviteLinkSub}</p>
              <div className="flex gap-2 mb-4">
                <input readOnly value={inviteLink}
                  className="flex-1 px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm bg-cream text-muted font-mono" />
                <button onClick={copyLink}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${copied ? "bg-emerald-600 text-white" : "bg-ink text-gold hover:bg-brown"}`}>
                  {copied ? "✓ " + t.invite.copied : t.invite.copy}
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input type="email" value={mailTo} onChange={e => setMailTo(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && shareViaMail()}
                    placeholder="recipient@email.com"
                    className={`flex-1 px-4 py-2 border rounded-xl text-sm focus:outline-none transition-colors ${mailTo && !mailTo.includes("@") ? "border-red-300" : "border-[var(--border)] focus:border-gold"}`} />
                  <button onClick={shareViaMail} disabled={!mailTo || sending}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-40">
                    ✉ {sending ? t.invite.sending : t.invite.shareMail}
                  </button>
                </div>
                <div className="flex gap-2">
                  <button onClick={shareViaWhatsApp}
                    className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm font-medium hover:bg-green-100 transition-colors">
                    💬 WhatsApp
                  </button>
                  <button onClick={shareViaTelegram}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl text-sm font-medium hover:bg-blue-100 transition-colors">
                    ✈ Telegram
                  </button>
                </div>
              </div>
            </div>

            {/* Pending invites */}
            {invites.filter(i => i.status === "pending").length > 0 && (
              <div className="bg-white rounded-2xl border border-[var(--border)] p-6">
                <h2 className="font-display text-lg text-ink mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
                  {t.invite.pendingInvites}
                  <span className="ml-auto text-sm font-normal text-muted">{invites.filter(i => i.status === "pending").length}</span>
                </h2>
                <div className="space-y-2">
                  {invites.filter(i => i.status === "pending").map(invite => (
                    <div key={invite.id} className="flex items-center justify-between py-2.5 border-b border-[var(--border)] last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-yellow-50 border border-yellow-200 flex items-center justify-center text-sm font-medium text-yellow-700">
                          {invite.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-ink">{invite.email}</p>
                          <p className="text-xs text-muted">{t.invite.invitedOn} {formatDate(invite.created_at)}</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
                        {t.invite.awaiting}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Accepted invites */}
            {invites.filter(i => i.status === "accepted" || i.status === "joined").length > 0 && (
              <div className="bg-white rounded-2xl border border-[var(--border)] p-6">
                <h2 className="font-display text-lg text-ink mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                  {t.invite.acceptedInvitations}
                  <span className="ml-auto text-sm font-normal text-muted">{invites.filter(i => i.status === "accepted" || i.status === "joined").length}</span>
                </h2>
                <div className="space-y-2">
                  {invites.filter(i => i.status === "accepted" || i.status === "joined").map(invite => (
                    <div key={invite.id} className="flex items-center justify-between py-2.5 border-b border-[var(--border)] last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-50 border border-green-200 flex items-center justify-center text-sm font-medium text-green-700">
                          {(invite.invited_name || invite.email).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-ink">{invite.invited_name || invite.email}</p>
                          {invite.invited_name && <p className="text-xs text-muted">{invite.email}</p>}
                          <p className="text-xs text-muted">
                            {t.invite.joinedOn} {formatDate(invite.accepted_at || invite.created_at)}
                            {invite.invited_city && ` · 📍 ${invite.invited_city}`}
                          </p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                        ✓ {t.invite.joinedBadge}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PeoplePage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <PeoplePageInner />
    </Suspense>
  );
}