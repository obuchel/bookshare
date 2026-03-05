"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import { useAuth } from "@/contexts/AuthContext";

interface Summary { total: number; unique: number; days: number; }
interface DayRow { day: string; visits: number; unique_ips: number; }
interface PageRow { page: string; visits: number; }
interface IPRow { ip: string; visits: number; last_seen: string; }
interface RecentRow { ip: string; page: string; user_agent: string; visited_at: string; }

interface Analytics {
  summary: Summary;
  byDay: DayRow[];
  byPage: PageRow[];
  topIPs: IPRow[];
  recent: RecentRow[];
}

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "";

export default function AdminAnalyticsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [tab, setTab] = useState<"overview" | "ips" | "recent">("overview");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    const adminEmail = ADMIN_EMAIL || "";
    if (adminEmail && user.email !== adminEmail) { router.push("/catalog"); return; }
  }, [user, router]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const token = localStorage.getItem("bs_token");
        const res = await fetch(`/api/analytics/visit?days=${days}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) { setError("Access denied"); return; }
        setData(await res.json());
      } catch {
        setError("Failed to load analytics");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, days]);

  if (!user) return null;

  const maxVisits = data?.byDay[0] ? Math.max(...data.byDay.map(d => d.visits)) : 1;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Nav />

      {/* Header */}
      <div className="bg-ink text-white py-8 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display text-3xl mb-1">📊 Site Analytics</h1>
            <p className="text-white/50 text-sm">Visitor tracking · Admin only</p>
          </div>
          <div className="flex gap-2">
            {[7, 14, 30, 90].map(d => (
              <button key={d} onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${days === d ? "bg-gold text-ink" : "bg-white/10 text-white hover:bg-white/20"}`}>
                {d}d
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">{error}</div>}

        {loading ? (
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[1,2,3].map(i => <div key={i} className="skeleton h-24 rounded-2xl" />)}
          </div>
        ) : data && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Total Visits", value: data.summary.total.toLocaleString(), icon: "👁" },
                { label: "Unique IPs", value: data.summary.unique.toLocaleString(), icon: "🌐" },
                { label: "Avg/Day", value: data.byDay.length ? Math.round(data.summary.total / data.byDay.length) : 0, icon: "📅" },
                { label: "Pages Tracked", value: data.byPage.length, icon: "📄" },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-2xl border border-[var(--border)] p-5">
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <div className="font-display text-2xl text-ink">{s.value}</div>
                  <div className="text-xs text-muted mt-0.5 uppercase tracking-wide">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-[var(--border)]">
              {(["overview", "ips", "recent"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${tab === t ? "border-gold text-ink" : "border-transparent text-muted hover:text-brown"}`}>
                  {t === "overview" ? "📈 Overview" : t === "ips" ? "🌐 Top IPs" : "🕐 Recent"}
                </button>
              ))}
            </div>

            {/* Overview tab */}
            {tab === "overview" && (
              <div className="space-y-6">
                {/* Daily chart */}
                <div className="bg-white rounded-2xl border border-[var(--border)] p-6">
                  <h2 className="font-medium text-ink mb-4">Daily Visits (last {days} days)</h2>
                  <div className="space-y-2">
                    {data.byDay.slice(0, 14).map(row => (
                      <div key={row.day} className="flex items-center gap-3">
                        <span className="text-xs text-muted w-20 shrink-0">{new Date(row.day + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                        <div className="flex-1 bg-cream rounded-full h-5 overflow-hidden">
                          <div
                            className="h-full bg-gold rounded-full transition-all"
                            style={{ width: `${Math.max(2, (row.visits / maxVisits) * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-ink w-8 text-right">{row.visits}</span>
                        <span className="text-xs text-muted w-16">({row.unique_ips} uniq)</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pages breakdown */}
                <div className="bg-white rounded-2xl border border-[var(--border)] p-6">
                  <h2 className="font-medium text-ink mb-4">Pages</h2>
                  <div className="space-y-2">
                    {data.byPage.map(row => (
                      <div key={row.page} className="flex items-center justify-between py-1.5 border-b border-[var(--border)] last:border-0">
                        <span className="text-sm text-ink font-mono">{row.page}</span>
                        <span className="text-sm font-medium text-brown">{row.visits}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Top IPs tab */}
            {tab === "ips" && (
              <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-cream">
                    <tr>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wide">#</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wide">IP Address</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Visits</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Last Seen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topIPs.map((row, i) => (
                      <tr key={row.ip} className="border-t border-[var(--border)] hover:bg-cream/50">
                        <td className="px-5 py-3 text-muted">{i + 1}</td>
                        <td className="px-5 py-3 font-mono text-ink">{row.ip}</td>
                        <td className="px-5 py-3 font-medium text-brown">{row.visits}</td>
                        <td className="px-5 py-3 text-muted text-xs">{new Date(row.last_seen).toLocaleString("en-GB")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Recent visits tab */}
            {tab === "recent" && (
              <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-cream">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Time</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">IP</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Page</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide hidden sm:table-cell">User Agent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent.map((row, i) => (
                      <tr key={i} className="border-t border-[var(--border)] hover:bg-cream/50">
                        <td className="px-4 py-2.5 text-xs text-muted whitespace-nowrap">
                          {new Date(row.visited_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-ink">{row.ip}</td>
                        <td className="px-4 py-2.5 text-xs font-mono text-brown">{row.page}</td>
                        <td className="px-4 py-2.5 text-xs text-muted hidden sm:table-cell max-w-xs truncate">{row.user_agent}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
