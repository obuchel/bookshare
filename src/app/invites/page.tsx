"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import { useApi } from "@/hooks/useApi";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/Toast";



interface Contact {
  contact_id: string;
  name: string;
  city?: string;
  neighborhood?: string;
  avatar_url?: string;
  rating?: number;
  books_shared?: number;
  connected_at: string;
}

export default function InvitesPage() {
  const { user } = useAuth();
  const { t } = useLang();
  const { apiFetch } = useApi();
  const router = useRouter();
  const { toasts, showToast } = useToast();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tab, setTab] = useState<"invite" | "contacts">("invite");
  const [copied, setCopied] = useState(false);

  const inviteLink = typeof window !== "undefined"
    ? `${window.location.origin}/register?ref=${user?.id}`
    : "";

  const fetchData = useCallback(async () => {
    try {
      const contactData = await apiFetch("/api/contacts");
      setContacts(contactData.contacts || []);
    } catch { /* silent */ }
  }, [apiFetch]);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    fetchData();
  }, [user, router, fetchData]);

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

  const shareViaMail = () => {
    const subject = encodeURIComponent(`${user?.name} ${t.invite.mailSubject}`);
    const body = encodeURIComponent(`${t.invite.mailBody}\n\n${inviteLink}`);
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });

  if (!user) return null;

  return (
    <div className="min-h-screen bg-parchment">
      <Nav />
      <ToastContainer toasts={toasts} />

      {/* Header */}
      <div className="bg-ink text-white py-8 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-display text-3xl mb-1">{t.invite.pageTitle}</h1>
          <p className="text-white/50 text-sm">
            {t.invite.pageSub}
          </p>
          <div className="flex gap-6 mt-5">
            {[
              { num: contacts.length, label: t.invite.contacts },
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
          {([["invite", "📨 " + t.invite.tabInvitePeople], ["contacts", "👥 " + t.invite.tabMyContacts]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === key ? "text-brown border-gold" : "text-muted border-transparent hover:text-brown"}`}>
              {label}
              {key === "contacts" && contacts.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-gold text-ink text-xs rounded-full">{contacts.length}</span>
              )}
            </button>
          ))}
        </div>

        {tab === "invite" && (
          <div className="space-y-6">

            {/* Personal invite link */}
            <div className="bg-white rounded-2xl border border-[var(--border)] p-6">
              <h2 className="font-display text-lg text-ink mb-1">{t.invite.inviteLinkTitle}</h2>
              <p className="text-muted text-sm mb-4">{t.invite.inviteLinkSub}</p>

              <div className="flex gap-2 mb-4">
                <input
                  readOnly
                  value={inviteLink}
                  className="flex-1 px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm bg-cream text-muted font-mono"
                />
                <button
                  onClick={copyLink}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${copied ? "bg-sage text-white" : "bg-ink text-gold hover:bg-brown"}`}
                >
                  {copied ? "✓ " + t.invite.copied : t.invite.copy}
                </button>
              </div>

              {/* Share buttons */}
              <div className="flex flex-wrap gap-2">
                <button onClick={shareViaMail} className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors">
                  <span>✉</span> {t.invite.shareMail}
                </button>
                <button onClick={shareViaWhatsApp} className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm font-medium hover:bg-green-100 transition-colors">
                  <span>💬</span> WhatsApp
                </button>
                <button onClick={shareViaTelegram} className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl text-sm font-medium hover:bg-blue-100 transition-colors">
                  <span>✈</span> Telegram
                </button>
              </div>
            </div>




          </div>
        )}

        {tab === "contacts" && (
          <div>
            {contacts.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-[var(--border)]">
                <span className="text-5xl">👥</span>
                <h2 className="font-display text-xl mt-4 mb-2">{t.invite.noContacts}</h2>
                <p className="text-muted text-sm mb-6">
                  {t.invite.noContactsSub}
                </p>
                <button
                  onClick={() => setTab("invite")}
                  className="px-5 py-2.5 bg-ink text-gold font-medium rounded-xl hover:bg-brown transition-colors text-sm"
                >
                  {t.invite.tabInvitePeople} →
                </button>
              </div>
            ) : (
              <div className="grid gap-3">
                {contacts.map(contact => (
                  <div key={contact.contact_id} className="bg-white rounded-xl border border-[var(--border)] p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gold flex items-center justify-center text-ink font-semibold text-lg shrink-0">
                      {contact.avatar_url
                        ? <img src={contact.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                        : contact.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-ink">{contact.name}</p>
                      <p className="text-sm text-muted">
                        📍 {contact.neighborhood || contact.city || "Unknown location"}
                        {contact.rating && ` · ⭐ ${Number(contact.rating).toFixed(1)}`}
                        {contact.books_shared ? ` · ${contact.books_shared} books` : ""}
                      </p>
                      <p className="text-xs text-muted mt-0.5">{t.invite.connected} {formatDate(contact.connected_at)}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Link href={`/messages?with=${contact.contact_id}`} className="px-3 py-1.5 border border-[var(--border)] text-brown text-xs font-medium rounded-lg hover:bg-cream transition-colors">
                        ✉ {t.invite.message}
                      </Link>
                      <Link href={`/profile/${contact.contact_id}`} className="px-3 py-1.5 border border-[var(--border)] text-brown text-xs font-medium rounded-lg hover:bg-cream transition-colors">
                        {t.invite.profile}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
