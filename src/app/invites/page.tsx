"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/hooks/useApi";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/Toast";

interface Invite {
  id: string;
  email: string;
  status: string;
  invited_name?: string;
  invited_city?: string;
  created_at: string;
  accepted_at?: string;
}

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
  const { apiFetch } = useApi();
  const router = useRouter();
  const { toasts, showToast } = useToast();

  const [invites, setInvites] = useState<Invite[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [emailList, setEmailList] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState<"invite" | "contacts">("invite");
  const [copied, setCopied] = useState(false);
  const [gmailLoading, setGmailLoading] = useState(false);

  const inviteLink = typeof window !== "undefined"
    ? `${window.location.origin}/register?ref=${user?.id}`
    : "";

  const fetchData = useCallback(async () => {
    try {
      const [invData, contactData] = await Promise.all([
        apiFetch("/api/invites"),
        apiFetch("/api/contacts"),
      ]);
      setInvites(invData.invites || []);
      setContacts(contactData.contacts || []);
    } catch { /* silent */ }
  }, [apiFetch]);

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    fetchData();
  }, [user, router, fetchData]);

  const addEmail = () => {
    const emails = emailInput.split(/[,;\s]+/).map(e => e.trim()).filter(e => e.includes("@"));
    if (!emails.length) return;
    setEmailList(prev => [...new Set([...prev, ...emails])]);
    setEmailInput("");
  };

  const removeEmail = (email: string) => setEmailList(prev => prev.filter(e => e !== email));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      addEmail();
    }
  };

  const sendInvites = async () => {
    if (!emailList.length) return;
    setSending(true);
    try {
      const data = await apiFetch("/api/invites", {
        method: "POST",
        body: JSON.stringify({ emails: emailList }),
      });
      showToast(`${data.count} invite${data.count !== 1 ? "s" : ""} sent!`);
      setEmailList([]);
      fetchData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to send", "error");
    } finally {
      setSending(false);
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareViaGmail = () => {
    const subject = encodeURIComponent(`${user?.name} invites you to BookShare`);
    const body = encodeURIComponent(
      `Hi!\n\n${user?.name} has invited you to join BookShare — a community platform for lending and borrowing books with people nearby.\n\nJoin here: ${inviteLink}\n\nSee you there!`
    );
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`, "_blank");
  };

  const shareViaWhatsApp = () => {
    const text = encodeURIComponent(`${user?.name} invites you to BookShare — lend & borrow books in your community! Join here: ${inviteLink}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const shareViaTelegram = () => {
    const text = encodeURIComponent(`Join BookShare — lend & borrow books in your community!`);
    window.open(`https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${text}`, "_blank");
  };

  // Simulated Gmail contact picker (opens Google OAuth in real app)
  const openGmailPicker = () => {
    setGmailLoading(true);
    // In production this would be: window.location.href = "/api/auth/google?redirect=/invites"
    // For now show a helpful message
    setTimeout(() => {
      setGmailLoading(false);
      showToast("Gmail import requires Google OAuth setup — use manual email entry for now", "error");
    }, 1000);
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });

  const pendingCount = invites.filter(i => i.status === "pending").length;
  const joinedCount = invites.filter(i => i.status === "accepted" || i.status === "joined").length;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-parchment">
      <Nav />
      <ToastContainer toasts={toasts} />

      {/* Header */}
      <div className="bg-ink text-white py-8 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-display text-3xl mb-1">Invite Friends</h1>
          <p className="text-white/50 text-sm">
            Grow your reading community — invite people you know
          </p>
          <div className="flex gap-6 mt-5">
            {[
              { num: contacts.length, label: "Contacts" },
              { num: joinedCount, label: "Joined" },
              { num: pendingCount, label: "Pending" },
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
          {([["invite", "📨 Invite People"], ["contacts", "👥 My Contacts"]] as const).map(([key, label]) => (
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
              <h2 className="font-display text-lg text-ink mb-1">Your Invite Link</h2>
              <p className="text-muted text-sm mb-4">Anyone who registers via your link gets auto-connected to you as a contact.</p>

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
                  {copied ? "✓ Copied!" : "Copy"}
                </button>
              </div>

              {/* Share buttons */}
              <div className="flex flex-wrap gap-2">
                <button onClick={shareViaGmail} className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors">
                  <span>✉</span> Gmail
                </button>
                <button onClick={shareViaWhatsApp} className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm font-medium hover:bg-green-100 transition-colors">
                  <span>💬</span> WhatsApp
                </button>
                <button onClick={shareViaTelegram} className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl text-sm font-medium hover:bg-blue-100 transition-colors">
                  <span>✈</span> Telegram
                </button>
                {typeof navigator !== "undefined" && navigator.share && (
                  <button
                    onClick={() => navigator.share({ title: "Join BookShare", text: `${user.name} invites you!`, url: inviteLink })}
                    className="flex items-center gap-2 px-4 py-2 bg-cream border border-[var(--border)] text-brown rounded-xl text-sm font-medium hover:bg-amber-100 transition-colors"
                  >
                    <span>↗</span> Share
                  </button>
                )}
              </div>
            </div>

            {/* Email invite */}
            <div className="bg-white rounded-2xl border border-[var(--border)] p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-display text-lg text-ink">Invite by Email</h2>
                  <p className="text-muted text-sm mt-0.5">Enter email addresses to invite directly</p>
                </div>
                <button
                  onClick={openGmailPicker}
                  disabled={gmailLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  <span className="text-base">G</span>
                  {gmailLoading ? "Loading..." : "Import Gmail"}
                </button>
              </div>

              {/* Email chips */}
              {emailList.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3 p-3 bg-cream rounded-xl">
                  {emailList.map(email => (
                    <span key={email} className="flex items-center gap-1.5 px-3 py-1 bg-white border border-[var(--border)] rounded-full text-sm text-ink">
                      {email}
                      <button onClick={() => removeEmail(email)} className="text-muted hover:text-rust text-xs">✕</button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={addEmail}
                  placeholder="name@example.com, another@email.com..."
                  className="flex-1 px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:border-gold transition-colors"
                />
                <button
                  onClick={addEmail}
                  className="px-4 py-2.5 border border-[var(--border)] text-brown rounded-xl text-sm font-medium hover:bg-cream transition-colors"
                >
                  Add
                </button>
              </div>
              <p className="text-xs text-muted mt-2">Press Enter, comma, or space to add multiple emails</p>

              {emailList.length > 0 && (
                <button
                  onClick={sendInvites}
                  disabled={sending}
                  className="w-full mt-4 py-3 bg-ink text-gold font-display font-semibold rounded-xl hover:bg-brown transition-colors disabled:opacity-60"
                >
                  {sending ? "Sending..." : `Send ${emailList.length} Invite${emailList.length !== 1 ? "s" : ""} →`}
                </button>
              )}
            </div>

            {/* Sent invites history */}
            {invites.length > 0 && (
              <div className="bg-white rounded-2xl border border-[var(--border)] p-6">
                <h2 className="font-display text-lg text-ink mb-4">Sent Invites</h2>
                <div className="space-y-2">
                  {invites.map(invite => (
                    <div key={invite.id} className="flex items-center justify-between py-2.5 border-b border-[var(--border)] last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center text-sm">
                          {invite.invited_name
                            ? invite.invited_name.charAt(0).toUpperCase()
                            : invite.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-ink">
                            {invite.invited_name || invite.email}
                          </p>
                          {invite.invited_name && (
                            <p className="text-xs text-muted">{invite.email}</p>
                          )}
                          {invite.invited_city && (
                            <p className="text-xs text-muted">📍 {invite.invited_city}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          invite.status === "accepted" || invite.status === "joined"
                            ? "badge-available"
                            : "bg-yellow-50 text-yellow-700"
                        }`}>
                          {invite.status === "accepted" || invite.status === "joined" ? "✓ Joined" : "Pending"}
                        </span>
                        <p className="text-xs text-muted mt-1">{formatDate(invite.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "contacts" && (
          <div>
            {contacts.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-[var(--border)]">
                <span className="text-5xl">👥</span>
                <h2 className="font-display text-xl mt-4 mb-2">No contacts yet</h2>
                <p className="text-muted text-sm mb-6">
                  Invite friends and they'll appear here once they join
                </p>
                <button
                  onClick={() => setTab("invite")}
                  className="px-5 py-2.5 bg-ink text-gold font-medium rounded-xl hover:bg-brown transition-colors text-sm"
                >
                  Invite People →
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
                      <p className="text-xs text-muted mt-0.5">Connected {formatDate(contact.connected_at)}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Link
                        href={`/messages?with=${contact.contact_id}`}
                        className="px-3 py-1.5 border border-[var(--border)] text-brown text-xs font-medium rounded-lg hover:bg-cream transition-colors"
                      >
                        ✉ Message
                      </Link>
                      <Link
                        href={`/profile/${contact.contact_id}`}
                        className="px-3 py-1.5 border border-[var(--border)] text-brown text-xs font-medium rounded-lg hover:bg-cream transition-colors"
                      >
                        Profile
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
