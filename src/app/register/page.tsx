"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import Nav from "@/components/Nav";

interface InviteInfo {
  inviter_name: string;
  inviter_city?: string;
  books_shared?: number;
  email: string;
}

function RegisterPage() {
  const { register } = useAuth();
  const { t } = useLang();
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("token");
  const refId = searchParams.get("ref");
  const a = t.auth;

  const [form, setForm] = useState({ name: "", email: "", password: "", city: "", neighborhood: "" });
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);

  // Load invite info if token present
  useEffect(() => {
    if (inviteToken) {
      fetch(`/api/invites/accept?token=${inviteToken}`)
        .then(r => r.json())
        .then(d => {
          if (d.invite) {
            setInviteInfo(d.invite);
            if (d.invite.email) setForm(prev => ({ ...prev, email: d.invite.email }));
          }
        })
        .catch(() => {});
    }
  }, [inviteToken]);

  const detectLocation = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false); },
      () => { setLocating(false); }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      await register({ ...form, lat: coords?.lat, lng: coords?.lng });

      // Accept invite if token present
      if (inviteToken) {
        const token = localStorage.getItem("bs_token");
        await fetch("/api/invites/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ token: inviteToken }),
        });
      }

      // If ref ID present (direct link invite), also connect
      if (refId && !inviteToken) {
        const token = localStorage.getItem("bs_token");
        // Create a contact directly via invite link ref
        await fetch("/api/invites", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ emails: [], refId }),
        }).catch(() => {});
      }

      router.push(inviteToken || refId ? "/catalog?welcome=1" : "/catalog");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="min-h-screen">
      <Nav />
      <div className="flex items-center justify-center min-h-[calc(100vh-56px)] px-4 py-12">
        <div className="w-full max-w-md animate-slide-up">

          {/* Invite banner */}
          {inviteInfo && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 text-center">
              <p className="text-2xl mb-2">🎉</p>
              <p className="font-medium text-ink">
                <span className="text-brown">{inviteInfo.inviter_name}</span> invited you to BookShare!
              </p>
              <p className="text-sm text-muted mt-1">
                {inviteInfo.inviter_city && `📍 ${inviteInfo.inviter_city} · `}
                {inviteInfo.books_shared ? `${inviteInfo.books_shared} books shared` : ""}
              </p>
              <p className="text-xs text-muted mt-2">
                You'll be auto-connected as contacts when you join
              </p>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-[var(--border)] p-8 shadow-sm">
            <div className="text-center mb-8">
              <span className="text-4xl">📚</span>
              <h1 className="font-display text-2xl text-ink mt-3">{a.joinTitle}</h1>
              <p className="text-muted text-sm mt-1">{a.joinSub}</p>
            </div>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-6">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-ink mb-1.5 block">{a.fullName}</label>
                <input type="text" required value={form.name} onChange={set("name")} placeholder={a.namePlaceholder} className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:border-gold transition-colors" />
              </div>
              <div>
                <label className="text-sm font-medium text-ink mb-1.5 block">{a.email}</label>
                <input type="email" required value={form.email} onChange={set("email")} placeholder="you@example.com" className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:border-gold transition-colors" />
              </div>
              <div>
                <label className="text-sm font-medium text-ink mb-1.5 block">{a.password}</label>
                <input type="password" required value={form.password} onChange={set("password")} placeholder={a.passwordHint} className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:border-gold transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-ink mb-1.5 block">{a.city}</label>
                  <input type="text" value={form.city} onChange={set("city")} placeholder="Kyiv" className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:border-gold transition-colors" />
                </div>
                <div>
                  <label className="text-sm font-medium text-ink mb-1.5 block">{a.neighbourhood}</label>
                  <input type="text" value={form.neighborhood} onChange={set("neighborhood")} placeholder="Podil" className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:border-gold transition-colors" />
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-cream rounded-xl">
                <div className="flex-1">
                  <p className="text-sm font-medium text-ink">{a.location} <span className="text-muted font-normal">{a.locationFor}</span></p>
                  <p className="text-xs text-muted mt-0.5">{coords ? `✓ ${a.locationDetected}` : a.locationSub}</p>
                </div>
                <button type="button" onClick={detectLocation} disabled={locating || !!coords} className="px-3 py-1.5 bg-white border border-[var(--border)] rounded-lg text-xs font-medium text-brown hover:bg-cream transition-colors disabled:opacity-50">
                  {locating ? a.detecting : coords ? a.gotIt : a.detect}
                </button>
              </div>
              <button type="submit" disabled={loading} className="w-full py-3 bg-ink text-gold font-display font-semibold rounded-xl hover:bg-brown transition-colors disabled:opacity-60 mt-2">
                {loading ? a.creating : a.createAccount}
              </button>
            </form>
            <p className="text-center text-sm text-muted mt-6">
              {a.alreadyMember}{" "}<Link href="/login" className="text-brown font-medium hover:underline">{a.signInLink}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
export default function RegisterPageWrapper() {
  return (
    <Suspense>
      <RegisterPage />
    </Suspense>
  );
}