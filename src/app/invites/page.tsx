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



interface Invite {
  id: string;
  email: string;
  status: string;
  invited_name?: string;
  invited_city?: string;
  created_at: string;
  accepted_at?: string;
}


export default function InvitesPage() {
  const { user } = useAuth();
  const { t } = useLang();
  const { apiFetch } = useApi();
  const router = useRouter();
  const { toasts, showToast } = useToast();

  const [invites, setInvites] = useState<Invite[]>([]);
  const [copied, setCopied] = useState(false);
  const [mailTo, setMailTo] = useState("");
  const [sending, setSending] = useState(false);

  const inviteLink = typeof window !== "undefined"
    ? `${window.location.origin}/register?ref=${user?.id}`
    : "";

  const fetchData = useCallback(async () => {
    try {
      const [invData] = await Promise.all([
        apiFetch("/api/invites"),
      ]);
      setInvites(invData.invites || []);
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

  const shareViaMail = async () => {
    if (!mailTo || !mailTo.includes("@")) {
      showToast("Please enter a valid email address", "error");
      return;
    }
    setSending(true);
    try {
      // 1. Save to DB
      await apiFetch("/api/invites", {
        method: "POST",
        body: JSON.stringify({ emails: [mailTo] }),
      });

      // 2. Send email via Nodemailer
      const res = await fetch("/api/invites/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_email:    mailTo,
          from_name:   user?.name ?? "Someone",
          invite_link: inviteLink,
        }),
      });
      if (!res.ok) throw new Error("Failed to send email");

      showToast(`Invite sent to ${mailTo}!`);
      setMailTo("");
      fetchData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to send invite", "error");
    } finally {
      setSending(false);
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

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
              { num: invites.filter(i => i.status === "accepted" || i.status === "joined").length, label: t.invite.joined },
              { num: invites.filter(i => i.status === "pending").length, label: t.invite.pending },
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
        <div>
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
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={mailTo}
                    onChange={e => setMailTo(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && shareViaMail()}
                    placeholder="recipient@email.com"
                    required
                    className={`flex-1 px-4 py-2 border rounded-xl text-sm focus:outline-none transition-colors ${
                      mailTo && !mailTo.includes("@")
                        ? "border-red-300 focus:border-red-400"
                        : "border-[var(--border)] focus:border-gold"
                    }`}
                  />
                  <button
                    onClick={shareViaMail}
                    disabled={!mailTo || sending}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span>✉</span> {sending ? t.invite.sending : t.invite.shareMail}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={shareViaWhatsApp} className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm font-medium hover:bg-green-100 transition-colors">
                    <span>💬</span> WhatsApp
                  </button>
                  <button onClick={shareViaTelegram} className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl text-sm font-medium hover:bg-blue-100 transition-colors">
                    <span>✈</span> Telegram
                  </button>
                </div>
              </div>
            </div>




            {/* Pending invites */}
            {invites.filter(i => i.status === "pending").length > 0 && (
              <div className="bg-white rounded-2xl border border-[var(--border)] p-6">
                <h2 className="font-display text-lg text-ink mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block"></span>
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
                          <p className="text-xs text-muted">
                            {t.invite.invitedOn} {formatDate(invite.created_at)}
                          </p>
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
                  <span className="w-2 h-2 rounded-full bg-green-400 inline-block"></span>
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
        </div>
      </div>
    </div>
  );
}
