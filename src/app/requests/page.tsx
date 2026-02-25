"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/hooks/useApi";
import { useLang } from "@/contexts/LangContext";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/Toast";

interface BorrowRequest {
  id: string; book_id: string; book_title: string; book_cover?: string;
  requester_id: string; requester_name: string; owner_id: string; owner_name: string;
  status: string; message?: string; borrow_days: number; requested_at: string;
  due_date?: string; borrowed_at?: string; returned_at?: string;
}

type Tab = "incoming" | "outgoing";

export default function RequestsPage() {
  const { user } = useAuth();
  const { apiFetch } = useApi();
  const { t } = useLang();
  const r = t.requests;
  const router = useRouter();
  const { toasts, showToast } = useToast();
  const [tab, setTab] = useState<Tab>("incoming");
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
    pending:  { label: r.statuses.pending,  class: "bg-yellow-50 text-yellow-700 border border-yellow-200" },
    approved: { label: r.statuses.approved, class: "bg-blue-50 text-blue-700 border border-blue-200" },
    rejected: { label: r.statuses.rejected, class: "bg-red-50 text-red-600 border border-red-200" },
    borrowed: { label: r.statuses.borrowed, class: "badge-borrowed border border-orange-200" },
    returned: { label: r.statuses.returned, class: "badge-available border border-green-200" },
  };

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const role = tab === "incoming" ? "owner" : "requester";
    const data = await apiFetch(`/api/requests?role=${role}`);
    setRequests(data.requests || []);
    setLoading(false);
  }, [tab, apiFetch]);

  useEffect(() => { if (!user) { router.push("/login"); return; } fetchRequests(); }, [user, router, fetchRequests]);

  const act = async (id: string, action: string) => {
    try {
      await apiFetch(`/api/requests/${id}`, { method: "PATCH", body: JSON.stringify({ action }) });
      const labels: Record<string, string> = { approve: r.statuses.approved, reject: r.statuses.rejected, mark_borrowed: r.statuses.borrowed, mark_returned: r.statuses.returned };
      showToast(labels[action] || "Updated");
      fetchRequests();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Action failed", "error");
    }
  };

  const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString("uk", { month: "short", day: "numeric" }) : "—";
  const isOverdue = (req: BorrowRequest) => req.status === "borrowed" && req.due_date && new Date(req.due_date) < new Date();

  if (!user) return null;

  return (
    <div className="min-h-screen">
      <Nav /><ToastContainer toasts={toasts} />
      <div className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="font-display text-3xl text-ink mb-6">{r.title}</h1>
        <div className="flex border-b border-[var(--border)] mb-6">
          {(["incoming", "outgoing"] as Tab[]).map((tabKey) => (
            <button key={tabKey} onClick={() => setTab(tabKey)} className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === tabKey ? "text-brown border-gold" : "text-muted border-transparent hover:text-brown"}`}>
              {tabKey === "incoming" ? r.incoming : r.outgoing}
            </button>
          ))}
        </div>
        {loading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-28 rounded-xl" />)}</div>
        ) : requests.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-[var(--border)]">
            <span className="text-5xl">📭</span>
            <p className="font-display text-xl mt-4 mb-2">{r.noRequestsTitle}</p>
            <p className="text-muted text-sm">{tab === "incoming" ? r.noIncoming : r.noOutgoing}</p>
            {tab === "outgoing" && <Link href="/catalog" className="inline-block mt-4 px-5 py-2.5 bg-ink text-gold font-medium rounded-xl hover:bg-brown transition-colors text-sm">{r.browseCatalog}</Link>}
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <div key={req.id} className={`bg-white rounded-xl border p-5 ${isOverdue(req) ? "border-red-300 bg-red-50/30" : "border-[var(--border)]"}`}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-14 rounded-lg bg-gradient-to-br from-amber-50 to-orange-100 shrink-0 overflow-hidden">
                    {req.book_cover ? <img src={req.book_cover} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-lg">📖</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link href={`/books/${req.book_id}`}><h3 className="font-medium text-ink hover:text-brown transition-colors">{req.book_title}</h3></Link>
                        <p className="text-xs text-muted mt-0.5">
                          {tab === "incoming" ? <>{r.from}{" "}<Link href={`/messages?with=${req.requester_id}`} className="text-brown hover:underline">{req.requester_name}</Link></> : <>{r.owner}:{" "}<Link href={`/messages?with=${req.owner_id}`} className="text-brown hover:underline">{req.owner_name}</Link></>}
                          {" · "}{req.borrow_days} {r.days} · {r.requested} {formatDate(req.requested_at)}
                        </p>
                        {req.due_date && req.status === "borrowed" && <p className={`text-xs mt-1 font-medium ${isOverdue(req) ? "text-red-600" : "text-sage"}`}>{isOverdue(req) ? r.overdue : r.due} {formatDate(req.due_date)}</p>}
                        {req.returned_at && <p className="text-xs mt-1 text-sage">{r.returned} {formatDate(req.returned_at)}</p>}
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${STATUS_CONFIG[req.status]?.class || "bg-gray-100 text-gray-600"}`}>{STATUS_CONFIG[req.status]?.label || req.status}</span>
                    </div>
                    {req.message && <p className="text-xs text-muted mt-2 italic border-l-2 border-[var(--border)] pl-2">"{req.message}"</p>}
                    {tab === "incoming" && (
                      <div className="flex items-center gap-2 mt-3">
                        {req.status === "pending" && <><button onClick={() => act(req.id, "approve")} className="px-3 py-1.5 bg-sage text-white text-xs font-medium rounded-lg hover:opacity-90">{r.approve}</button><button onClick={() => act(req.id, "reject")} className="px-3 py-1.5 bg-white border border-red-300 text-red-600 text-xs font-medium rounded-lg hover:bg-red-50">{r.reject}</button></>}
                        {req.status === "approved" && <button onClick={() => act(req.id, "mark_borrowed")} className="px-3 py-1.5 bg-gold text-ink text-xs font-medium rounded-lg hover:bg-yellow-400">{r.markGiven}</button>}
                        {req.status === "borrowed" && <button onClick={() => act(req.id, "mark_returned")} className="px-3 py-1.5 bg-sage text-white text-xs font-medium rounded-lg hover:opacity-90">{r.markReturned}</button>}
                        <Link href={`/messages?with=${req.requester_id}&bookId=${req.book_id}`} className="px-3 py-1.5 border border-[var(--border)] text-brown text-xs font-medium rounded-lg hover:bg-cream">{r.message}</Link>
                      </div>
                    )}
                    {tab === "outgoing" && req.status === "borrowed" && (
                      <div className="flex items-center gap-2 mt-3">
                        <button onClick={() => act(req.id, "mark_returned")} className="px-3 py-1.5 bg-sage text-white text-xs font-medium rounded-lg hover:opacity-90">{r.iReturned}</button>
                        <Link href={`/messages?with=${req.owner_id}&bookId=${req.book_id}`} className="px-3 py-1.5 border border-[var(--border)] text-brown text-xs font-medium rounded-lg hover:bg-cream">{r.messageOwner}</Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
