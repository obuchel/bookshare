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

interface TimelineItem {
  id: string;
  item_type: "discussion" | "new_book";
  type?: string;
  body?: string;
  book_id?: string;
  created_at: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  book_title?: string;
  book_author?: string;
  book_cover?: string;
  book_genre?: string;
  book_language?: string;
  like_count?: number;
  comment_count?: number;
  liked_by_me?: number;
}

interface Comment {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
}

function Avatar({ name, url, size = "md" }: { name: string; url?: string; size?: "sm" | "md" }) {
  const sz = size === "sm" ? "w-7 h-7 text-xs" : "w-9 h-9 text-sm";
  return url ? (
    <img src={url} alt={name} className={`${sz} rounded-full object-cover shrink-0`} />
  ) : (
    <div className={`${sz} rounded-full bg-gold flex items-center justify-center text-ink font-semibold shrink-0`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function timeAgo(date: string, t: any) {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return t.justNow;
  if (diff < 3600) return `${Math.floor(diff / 60)}${t.minutesAgo}`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}${t.hoursAgo}`;
  return `${Math.floor(diff / 86400)}${t.daysAgo}`;
}

function CommentSection({ postId, initialCount, user, t, apiFetch }: any) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    const data = await apiFetch(`/api/timeline/${postId}/comments`);
    setComments(data.comments || []);
    setLoaded(true);
  }, [postId, apiFetch]);

  const toggle = () => {
    if (!open && !loaded) load();
    setOpen(o => !o);
    if (!open) setTimeout(() => inputRef.current?.focus(), 150);
  };

  const submit = async () => {
    if (!body.trim() || submitting) return;
    setSubmitting(true);
    try {
      const data = await apiFetch(`/api/timeline/${postId}/comments`, {
        method: "POST",
        body: JSON.stringify({ body }),
      });
      setComments(prev => [...prev, data.comment]);
      setBody("");
    } catch { /* silent */ }
    finally { setSubmitting(false); }
  };

  const remove = async (commentId: string) => {
    await apiFetch(`/api/timeline/comments/${commentId}`, { method: "DELETE" });
    setComments(prev => prev.filter(c => c.id !== commentId));
  };

  const count = loaded ? comments.length : initialCount;

  return (
    <div className="mt-3 border-t border-[var(--border)] pt-3">
      <button onClick={toggle}
        className="text-xs text-muted hover:text-brown transition-colors">
        💬 {count > 0 ? `${count} ${t.replies}` : t.reply}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {comments.map(c => (
            <div key={c.id} className="flex gap-2.5 group">
              <Avatar name={c.user_name} url={c.user_avatar} size="sm" />
              <div className="flex-1 bg-cream rounded-xl px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-ink">{c.user_name}</span>
                  <span className="text-xs text-muted">{timeAgo(c.created_at, t)}</span>
                </div>
                <p className="text-sm text-ink mt-0.5 whitespace-pre-wrap">{c.body}</p>
              </div>
              {user?.id === c.user_id && (
                <button onClick={() => remove(c.id)}
                  className="opacity-0 group-hover:opacity-100 text-xs text-red-400 hover:text-red-600 transition-all self-start mt-1">✕</button>
              )}
            </div>
          ))}

          {user && (
            <div className="flex gap-2.5">
              <Avatar name={user.name} url={user.avatar_url} size="sm" />
              <div className="flex-1 flex gap-2">
                <textarea
                  ref={inputRef}
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
                  placeholder={t.replyPlaceholder}
                  rows={1}
                  className="flex-1 px-3 py-2 border border-[var(--border)] rounded-xl text-sm focus:border-gold transition-colors resize-none"
                />
                <button onClick={submit} disabled={!body.trim() || submitting}
                  className="px-3 py-2 bg-ink text-gold text-xs font-medium rounded-xl hover:bg-brown transition-colors disabled:opacity-40">
                  {t.send}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PostCard({ item, user, t, apiFetch, onDelete }: any) {
  const [likeCount, setLikeCount] = useState(Number(item.like_count) || 0);
  const [liked, setLiked] = useState(Number(item.liked_by_me) > 0);
  const [liking, setLiking] = useState(false);

  const toggleLike = async () => {
    if (!user || liking) return;
    setLiking(true);
    const prev = liked;
    setLiked(!prev);
    setLikeCount(c => prev ? c - 1 : c + 1);
    try {
      await apiFetch(`/api/timeline/${item.id}/like`, { method: "POST" });
    } catch {
      setLiked(prev);
      setLikeCount(c => prev ? c + 1 : c - 1);
    }
    setLiking(false);
  };

  if (item.item_type === "new_book") {
    return (
      <div className="bg-white rounded-2xl border border-[var(--border)] p-5">
        <div className="flex items-center gap-3 mb-3">
          <Avatar name={item.user_name} url={item.user_avatar} />
          <div>
            <span className="font-medium text-ink text-sm">{item.user_name}</span>
            <span className="text-muted text-sm"> {t.newBook}</span>
            <p className="text-xs text-muted">{timeAgo(item.created_at, t)}</p>
          </div>
        </div>
        <Link href={`/books/${item.id}`}>
          <div className="flex gap-3 p-3 bg-cream rounded-xl hover:bg-amber-50 transition-colors">
            {item.book_cover ? (
              <img src={item.book_cover} alt={item.book_title} className="w-12 h-16 object-cover rounded-lg shrink-0" />
            ) : (
              <div className="w-12 h-16 bg-gold/20 rounded-lg flex items-center justify-center text-xl shrink-0">📖</div>
            )}
            <div className="min-w-0">
              <p className="font-display font-semibold text-ink">{item.book_title}</p>
              <p className="text-sm text-muted">{item.book_author}</p>
              {item.book_genre && <span className="text-xs bg-gold/15 text-brown px-2 py-0.5 rounded-full mt-1 inline-block">{item.book_genre}</span>}
            </div>
          </div>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[var(--border)] p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <Avatar name={item.user_name} url={item.user_avatar} />
          <div>
            <Link href={`/profile/${item.user_id}`} className="font-medium text-ink text-sm hover:text-brown transition-colors">
              {item.user_name}
            </Link>
            <p className="text-xs text-muted">{timeAgo(item.created_at, t)}</p>
          </div>
        </div>
        {user?.id === item.user_id && (
          <button onClick={() => onDelete(item.id)}
            className="text-xs text-muted hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50">
            {t.deletePost}
          </button>
        )}
      </div>

      <p className="mt-3 text-ink text-sm whitespace-pre-wrap leading-relaxed">{item.body}</p>

      {item.book_id && item.book_title && (
        <Link href={`/books/${item.book_id}`}
          className="flex items-center gap-2 mt-3 p-2.5 bg-cream rounded-xl hover:bg-amber-50 transition-colors">
          {item.book_cover ? (
            <img src={item.book_cover} alt={item.book_title} className="w-8 h-10 object-cover rounded shrink-0" />
          ) : (
            <div className="w-8 h-10 bg-gold/20 rounded flex items-center justify-center text-sm shrink-0">📖</div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-semibold text-ink truncate">{item.book_title}</p>
            <p className="text-xs text-muted truncate">{item.book_author}</p>
          </div>
        </Link>
      )}

      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[var(--border)]">
        <button onClick={toggleLike} disabled={!user}
          className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${liked ? "text-red-500" : "text-muted hover:text-red-400"}`}>
          {liked ? "❤️" : "🤍"} {likeCount > 0 ? likeCount : ""} {likeCount > 0 ? t.likes : t.like}
        </button>
      </div>

      <CommentSection
        postId={item.id}
        initialCount={Number(item.comment_count) || 0}
        user={user}
        t={t}
        apiFetch={apiFetch}
      />
    </div>
  );
}

export default function TimelinePage() {
  const { user } = useAuth();
  const { apiFetch } = useApi();
  const { t } = useLang();
  const router = useRouter();
  const { toasts, showToast } = useToast();
  const tl = (t as any).timeline ?? {
    title: "Book Discussions",
    sub: "Share thoughts, ask questions, discuss books",
    composePlaceholder: "Share a thought, review, or question about a book...",
    linkBook: "Link a book", post: "Post", posting: "Posting...",
    likes: "likes", like: "Like", liked: "Liked",
    reply: "Reply", replies: "replies",
    replyPlaceholder: "Write a reply...", send: "Send",
    noPostsTitle: "No posts yet", noPostsSub: "Be the first to start a discussion!",
    deletePost: "Delete", deleteComment: "Delete",
    justNow: "just now", minutesAgo: "m ago", hoursAgo: "h ago", daysAgo: "d ago",
    about: "about", loadMore: "Load more", searchBook: "Search for a book...",
    newBook: "added a new book", filterAll: "All",
    filterDiscussions: "Discussions", filterNewBooks: "New books",
  };

  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "discussions" | "new_books">("all");
  const [body, setBody] = useState("");
  const [linkedBook, setLinkedBook] = useState<{ id: string; title: string; cover_url?: string } | null>(null);
  const [bookSearch, setBookSearch] = useState("");
  const [bookResults, setBookResults] = useState<any[]>([]);
  const [showBookSearch, setShowBookSearch] = useState(false);
  const [posting, setPosting] = useState(false);
  const bookSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!user) router.push("/login"); }, [user, router]);

  const fetchItems = useCallback(async (reset = false) => {
    if (reset) setLoading(true); else setLoadingMore(true);
    try {
      const params = new URLSearchParams({ filter });
      if (!reset && cursor) params.set("cursor", cursor);
      const data = await apiFetch(`/api/timeline?${params}`);
      if (reset) setItems(data.items || []);
      else setItems(prev => [...prev, ...(data.items || [])]);
      setCursor(data.nextCursor);
    } catch { /* silent */ }
    finally { reset ? setLoading(false) : setLoadingMore(false); }
  }, [filter, cursor, apiFetch]);

  useEffect(() => { if (user) fetchItems(true); }, [user, filter]);

  // Book search debounce
  useEffect(() => {
    if (!bookSearch.trim()) { setBookResults([]); return; }
    const t = setTimeout(async () => {
      const data = await apiFetch(`/api/books?q=${encodeURIComponent(bookSearch)}`).catch(() => ({ books: [] }));
      setBookResults((data.books || []).slice(0, 5));
    }, 300);
    return () => clearTimeout(t);
  }, [bookSearch, apiFetch]);

  // Close book search on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bookSearchRef.current && !bookSearchRef.current.contains(e.target as Node)) setShowBookSearch(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const submitPost = async () => {
    if (!body.trim() || posting) return;
    setPosting(true);
    try {
      const data = await apiFetch("/api/timeline", {
        method: "POST",
        body: JSON.stringify({ body, book_id: linkedBook?.id || null }),
      });
      setItems(prev => [data.post, ...prev]);
      setBody("");
      setLinkedBook(null);
      setBookSearch("");
    } catch { showToast("Failed to post", "error"); }
    finally { setPosting(false); }
  };

  const deletePost = async (id: string) => {
    await apiFetch(`/api/timeline/${id}`, { method: "DELETE" });
    setItems(prev => prev.filter(i => i.id !== id));
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Nav />
      <ToastContainer toasts={toasts} />

      {/* Header */}
      <div className="bg-ink text-white py-8 px-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-display text-3xl mb-1">{tl.title}</h1>
          <p className="text-white/50 text-sm">{tl.sub}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Compose */}
        <div className="bg-white rounded-2xl border border-[var(--border)] p-5">
          <div className="flex gap-3">
            <Avatar name={user.name} url={(user as any).avatar_url} />
            <div className="flex-1">
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder={tl.composePlaceholder}
                rows={3}
                maxLength={2000}
                className="w-full text-sm text-ink placeholder:text-muted resize-none outline-none leading-relaxed"
              />

              {linkedBook && (
                <div className="flex items-center gap-2 mt-2 p-2 bg-cream rounded-xl">
                  {linkedBook.cover_url && <img src={linkedBook.cover_url} alt="" className="w-6 h-8 object-cover rounded shrink-0" />}
                  <span className="text-xs text-brown font-medium flex-1 truncate">📖 {linkedBook.title}</span>
                  <button onClick={() => setLinkedBook(null)} className="text-xs text-muted hover:text-red-500">✕</button>
                </div>
              )}

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--border)]">
                <div className="relative" ref={bookSearchRef}>
                  <button
                    onClick={() => setShowBookSearch(s => !s)}
                    className="flex items-center gap-1.5 text-xs text-muted hover:text-brown transition-colors px-2 py-1.5 rounded-lg hover:bg-cream">
                    📖 {tl.linkBook}
                  </button>
                  {showBookSearch && (
                    <div className="absolute left-0 top-full mt-1 w-72 bg-white border border-[var(--border)] rounded-xl shadow-xl z-50">
                      <input
                        autoFocus
                        value={bookSearch}
                        onChange={e => setBookSearch(e.target.value)}
                        placeholder={tl.searchBook}
                        className="w-full px-3 py-2.5 text-sm border-b border-[var(--border)] outline-none rounded-t-xl"
                      />
                      <div className="max-h-48 overflow-y-auto">
                        {bookResults.map(b => (
                          <button key={b.id} onClick={() => { setLinkedBook(b); setShowBookSearch(false); setBookSearch(""); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-cream text-left transition-colors">
                            {b.cover_url ? <img src={b.cover_url} alt="" className="w-6 h-8 object-cover rounded shrink-0" /> : <div className="w-6 h-8 bg-gold/20 rounded shrink-0" />}
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-ink truncate">{b.title}</p>
                              <p className="text-xs text-muted truncate">{b.author}</p>
                            </div>
                          </button>
                        ))}
                        {bookSearch && bookResults.length === 0 && (
                          <p className="text-xs text-muted px-3 py-3">{(t as any).addBook?.noResults ?? "No books found"}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted">{body.length}/2000</span>
                  <button onClick={submitPost} disabled={!body.trim() || posting}
                    className="px-4 py-1.5 bg-ink text-gold text-sm font-medium rounded-xl hover:bg-brown transition-colors disabled:opacity-40">
                    {posting ? tl.posting : tl.post}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          {([["all", tl.filterAll], ["discussions", tl.filterDiscussions], ["new_books", tl.filterNewBooks]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setFilter(key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === key ? "bg-ink text-gold" : "bg-white border border-[var(--border)] text-muted hover:text-brown"}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Feed */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="skeleton h-40 rounded-2xl" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-[var(--border)]">
            <span className="text-5xl">💬</span>
            <h2 className="font-display text-xl mt-4 mb-2">{tl.noPostsTitle}</h2>
            <p className="text-muted text-sm">{tl.noPostsSub}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map(item => (
              <PostCard key={`${item.item_type}-${item.id}`} item={item} user={user} t={tl} apiFetch={apiFetch} onDelete={deletePost} />
            ))}
            {cursor && (
              <button onClick={() => fetchItems(false)} disabled={loadingMore}
                className="w-full py-3 border border-[var(--border)] text-brown text-sm font-medium rounded-xl hover:bg-cream transition-colors disabled:opacity-50">
                {loadingMore ? "..." : tl.loadMore}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
