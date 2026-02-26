"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/hooks/useApi";
import { useLang } from "@/contexts/LangContext";

interface Message {
  id: string; sender_id: string; receiver_id: string;
  content: string; created_at: string; read: number;
  sender_name?: string; sender_avatar?: string;
  book_id?: string;
}

interface Conversation {
  other_id: string; other_name: string; other_avatar?: string;
  content: string; created_at: string; read: number; book_title?: string;
}

interface OtherUser {
  id: string; name: string; avatar_url?: string;
}

function MessagesContent() {
  const { user } = useAuth();
  const { apiFetch } = useApi();
  const router = useRouter();
  const searchParams = useSearchParams();
  const withUserId = searchParams.get("with");
  const bookId = searchParams.get("bookId");

  const { t } = useLang();
  const m = t.messages;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchConversations = useCallback(async () => {
    try {
      const data = await apiFetch("/api/messages");
      setConversations(data.conversations || []);
    } catch { /* ignore */ }
  }, [apiFetch]);

  const fetchMessages = useCallback(async () => {
    if (!withUserId) return;
    setLoading(true);
    try {
      const url = `/api/messages?with=${withUserId}${bookId ? `&bookId=${bookId}` : ""}`;
      const data = await apiFetch(url);
      setMessages(data.messages || []);
      setOtherUser(data.with || null);
    } catch { /* ignore */ }
    setLoading(false);
  }, [withUserId, bookId, apiFetch]);

  useEffect(() => { if (!user) { router.push("/login"); return; } fetchConversations(); }, [user, router, fetchConversations]);
  useEffect(() => { fetchMessages(); }, [fetchMessages]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !withUserId) return;
    setSending(true);
    try {
      await apiFetch("/api/messages", {
        method: "POST",
        body: JSON.stringify({ receiver_id: withUserId, content: input.trim(), book_id: bookId }),
      });
      setInput("");
      fetchMessages();
      fetchConversations();
    } catch { /* ignore */ }
    setSending(false);
  };

  const formatTime = (d: string) => new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const formatDate = (d: string) => new Date(d).toLocaleDateString([], { month: "short", day: "numeric" });

  if (!user) return null;

  return (
    <div className="min-h-screen">
      <Nav />
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex gap-4 h-[calc(100vh-140px)]">

          {/* Conversations sidebar */}
          <div className={`w-72 shrink-0 bg-white rounded-2xl border border-[var(--border)] overflow-hidden flex flex-col ${withUserId ? "hidden md:flex" : "flex"}`}>
            <div className="p-4 border-b border-[var(--border)]">
              <h2 className="font-display text-lg text-ink">{m.title}</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <span className="text-3xl">💬</span>
                  <p className="text-sm text-muted mt-2">{m.noConversations}</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <Link key={conv.other_id} href={`/messages?with=${conv.other_id}`}
                    className={`flex items-center gap-3 px-4 py-3 hover:bg-cream transition-colors border-b border-[var(--border)] ${withUserId === conv.other_id ? "bg-cream" : ""}`}>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-50 to-orange-100 shrink-0 flex items-center justify-center font-medium text-brown">
                      {conv.other_avatar
                        ? <img src={conv.other_avatar} alt="" className="w-full h-full object-cover rounded-full" />
                        : conv.other_name?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{conv.other_name}</p>
                      <p className="text-xs text-muted truncate">{conv.content}</p>
                    </div>
                    {!conv.read && conv.other_id !== user.id && (
                      <div className="w-2 h-2 rounded-full bg-gold shrink-0" />
                    )}
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Chat area */}
          {withUserId ? (
            <div className="flex-1 bg-white rounded-2xl border border-[var(--border)] flex flex-col overflow-hidden">
              {/* Header */}
              <div className="px-5 py-4 border-b border-[var(--border)] flex items-center gap-3">
                <Link href="/messages" className="md:hidden text-muted hover:text-brown">←</Link>
                {otherUser && (
                  <>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center font-medium text-brown text-sm">
                      {(otherUser as any).avatar_url
                        ? <img src={(otherUser as any).avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                        : otherUser.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-ink text-sm">{otherUser.name}</p>
                    </div>
                  </>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loading ? (
                  <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" /></div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12">
                    <span className="text-3xl">👋</span>
                    <p className="text-sm text-muted mt-2">{m.noConversations}</p>
                  </div>
                ) : (
                  messages.map((msg, i) => {
                    const isMine = msg.sender_id === user.id;
                    const showDate = i === 0 || formatDate(messages[i-1].created_at) !== formatDate(msg.created_at);
                    return (
                      <div key={msg.id}>
                        {showDate && (
                          <div className="text-center my-3">
                            <span className="text-xs text-muted bg-cream px-3 py-1 rounded-full">{formatDate(msg.created_at)}</span>
                          </div>
                        )}
                        <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm ${isMine ? "bg-ink text-white rounded-br-sm" : "bg-cream text-ink rounded-bl-sm"}`}>
                            <p>{msg.content}</p>
                            <p className={`text-xs mt-1 ${isMine ? "text-white/50" : "text-muted"}`}>{formatTime(msg.created_at)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-[var(--border)] flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:border-gold transition-colors"
                />
                <button onClick={sendMessage} disabled={sending || !input.trim()}
                  className="px-4 py-2.5 bg-ink text-gold font-medium rounded-xl hover:bg-brown transition-colors disabled:opacity-50 text-sm">
                  Send
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 hidden md:flex items-center justify-center bg-white rounded-2xl border border-[var(--border)]">
              <div className="text-center">
                <span className="text-5xl">💬</span>
                <p className="font-display text-xl mt-4">{m.selectConversation}</p>
                <p className="text-muted text-sm mt-2">{m.selectSub}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return <Suspense><MessagesContent /></Suspense>;
}
