"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/hooks/useApi";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  sender_name: string;
  book_title?: string;
  book_id?: string;
  created_at: string;
  read: number;
}

interface Thread {
  id: string;
  sender_id: string;
  receiver_id: string;
  sender_name: string;
  receiver_name: string;
  sender_avatar?: string;
  receiver_avatar?: string;
  content: string;
  book_title?: string;
  created_at: string;
  read: number;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const { apiFetch } = useApi();
  const router = useRouter();
  const searchParams = useSearchParams();
  const withUserId = searchParams.get("with");
  const bookId = searchParams.get("bookId");

  const [threads, setThreads] = useState<Thread[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeUser, setActiveUser] = useState<{ id: string; name: string } | null>(null);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchThreads = useCallback(async () => {
    const data = await apiFetch("/api/messages?threads=1");
    setThreads(data.threads || []);
    setLoadingThreads(false);
  }, [apiFetch]);

  const fetchMessages = useCallback(
    async (userId: string) => {
      const data = await apiFetch(`/api/messages?withUser=${userId}`);
      setMessages(data.messages || []);
    },
    [apiFetch]
  );

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    fetchThreads();
  }, [user, router, fetchThreads]);

  useEffect(() => {
    if (withUserId && user) {
      // Find the other person's name from threads
      const thread = threads.find(
        (t) => t.sender_id === withUserId || t.receiver_id === withUserId
      );
      const name =
        thread?.sender_id === withUserId
          ? thread.sender_name
          : thread?.receiver_name || "User";
      setActiveUser({ id: withUserId, name });
      fetchMessages(withUserId);
    }
  }, [withUserId, threads, user, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const openConversation = (thread: Thread) => {
    const otherId =
      thread.sender_id === user?.id ? thread.receiver_id : thread.sender_id;
    const otherName =
      thread.sender_id === user?.id ? thread.receiver_name : thread.sender_name;
    setActiveUser({ id: otherId, name: otherName });
    router.push(`/messages?with=${otherId}`);
    fetchMessages(otherId);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim() || !activeUser || sending) return;
    setSending(true);
    try {
      await apiFetch("/api/messages", {
        method: "POST",
        body: JSON.stringify({
          receiver_id: activeUser.id,
          content: newMsg.trim(),
          book_id: bookId || undefined,
        }),
      });
      setNewMsg("");
      fetchMessages(activeUser.id);
      fetchThreads();
    } finally {
      setSending(false);
    }
  };

  const formatTime = (d: string) =>
    new Date(d).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" });
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en", { month: "short", day: "numeric" });

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <div className="flex flex-1 max-w-5xl mx-auto w-full px-4 py-6 gap-4 min-h-0">
        {/* Thread list */}
        <div className="w-72 shrink-0 bg-white rounded-2xl border border-[var(--border)] flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[var(--border)]">
            <h2 className="font-display text-lg text-ink">Messages</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingThreads ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="skeleton h-14 rounded-xl" />
                ))}
              </div>
            ) : threads.length === 0 ? (
              <div className="p-6 text-center text-muted text-sm">
                <p className="text-3xl mb-2">💬</p>
                No conversations yet
              </div>
            ) : (
              threads.map((thread) => {
                const otherId =
                  thread.sender_id === user.id
                    ? thread.receiver_id
                    : thread.sender_id;
                const otherName =
                  thread.sender_id === user.id
                    ? thread.receiver_name
                    : thread.sender_name;
                const isActive = activeUser?.id === otherId;
                const isUnread = thread.receiver_id === user.id && !thread.read;

                return (
                  <button
                    key={thread.id}
                    onClick={() => openConversation(thread)}
                    className={`w-full text-left p-4 border-b border-[var(--border)] hover:bg-cream transition-colors ${
                      isActive ? "bg-amber-50" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gold flex items-center justify-center text-ink text-sm font-semibold shrink-0">
                        {otherName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className={`text-sm ${isUnread ? "font-semibold text-ink" : "font-medium text-ink"}`}>
                            {otherName}
                          </p>
                          <span className="text-xs text-muted">
                            {formatDate(thread.created_at)}
                          </span>
                        </div>
                        {thread.book_title && (
                          <p className="text-xs text-gold truncate">📖 {thread.book_title}</p>
                        )}
                        <p className={`text-xs truncate ${isUnread ? "text-ink font-medium" : "text-muted"}`}>
                          {thread.sender_id === user.id ? "You: " : ""}
                          {thread.content}
                        </p>
                      </div>
                      {isUnread && (
                        <div className="w-2 h-2 rounded-full bg-gold shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1 bg-white rounded-2xl border border-[var(--border)] flex flex-col overflow-hidden">
          {activeUser ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-[var(--border)] flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center text-ink text-sm font-semibold">
                  {activeUser.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-ink">{activeUser.name}</p>
                  <Link
                    href={`/profile/${activeUser.id}`}
                    className="text-xs text-muted hover:text-brown transition-colors"
                  >
                    View profile →
                  </Link>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg, i) => {
                  const isMine = msg.sender_id === user.id;
                  const showDate =
                    i === 0 ||
                    formatDate(messages[i - 1].created_at) !== formatDate(msg.created_at);

                  return (
                    <div key={msg.id}>
                      {showDate && (
                        <div className="text-center my-2">
                          <span className="text-xs text-muted bg-cream px-3 py-1 rounded-full">
                            {formatDate(msg.created_at)}
                          </span>
                        </div>
                      )}
                      {msg.book_title && i === 0 && (
                        <div className="text-center mb-3">
                          <span className="text-xs text-gold bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                            📖 About: {msg.book_title}
                          </span>
                        </div>
                      )}
                      <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                            isMine
                              ? "bg-ink text-white rounded-br-md"
                              : "bg-cream text-ink rounded-bl-md"
                          }`}
                        >
                          {msg.content}
                          <p className={`text-xs mt-1 ${isMine ? "text-white/50" : "text-muted"}`}>
                            {formatTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={sendMessage} className="p-4 border-t border-[var(--border)] flex gap-2">
                <input
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  placeholder={`Message ${activeUser.name}...`}
                  className="flex-1 px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:border-gold transition-colors"
                />
                <button
                  type="submit"
                  disabled={!newMsg.trim() || sending}
                  className="px-5 py-2.5 bg-ink text-gold font-medium rounded-xl hover:bg-brown transition-colors disabled:opacity-50 text-sm"
                >
                  Send
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-muted">
              <span className="text-6xl mb-4">💬</span>
              <p className="font-display text-xl text-ink">Your messages</p>
              <p className="text-sm mt-2">
                Select a conversation or message a book owner from a book page
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
