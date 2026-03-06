"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/hooks/useApi";
import { useLang } from "@/contexts/LangContext";

interface ProfileUser {
  id: string; name: string; city?: string; county?: string;
  province?: string; country?: string; bio?: string;
  avatar_url?: string; rating?: number; books_shared?: number;
  books_borrowed?: number; created_at?: string;
}

interface Book {
  id: string; title: string; author: string;
  cover_url?: string; status: string; genre?: string;
}

interface TimelineItem {
  id: string; item_type: "discussion" | "new_book"; body?: string;
  book_id?: string; created_at: string; user_id: string;
  user_name: string; user_avatar?: string;
  book_title?: string; book_author?: string; book_cover?: string; book_genre?: string;
  like_count?: number; comment_count?: number; liked_by_me?: number;
}

interface Comment {
  id: string; body: string; created_at: string;
  user_id: string; user_name: string; user_avatar?: string;
}

function Avatar({ name, url, size = "sm" }: { name: string; url?: string; size?: "sm" | "xs" }) {
  const sz = size === "xs" ? "w-6 h-6 text-xs" : "w-8 h-8 text-sm";
  return url ? (
    <img src={url} alt={name} className={`${sz} rounded-full object-cover shrink-0`} />
  ) : (
    <div className={`${sz} rounded-full bg-gold flex items-center justify-center text-ink font-semibold shrink-0`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function timeAgo(date: string) {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function CommentSection({ postId, initialCount, currentUser, apiFetch }: any) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const data = await apiFetch(`/api/timeline/${postId}/comments`);
    setComments(data.comments || []);
    setLoaded(true);
  }, [postId, apiFetch]);

  const toggle = () => { if (!open && !loaded) load(); setOpen(o => !o); };

  const submit = async () => {
    if (!body.trim() || submitting) return;
    setSubmitting(true);
    try {
      const data = await apiFetch(`/api/timeline/${postId}/comments`, {
        method: "POST", body: JSON.stringify({ body }),
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
      <button onClick={toggle} className="text-xs text-muted hover:text-brown transition-colors">
        💬 {count > 0 ? `${count} replies` : "Reply"}
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          {comments.map(c => (
            <div key={c.id} className="flex gap-2 group">
              <Avatar name={c.user_name} url={c.user_avatar} size="xs" />
              <div className="flex-1 bg-cream rounded-xl px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink">{c.user_name}</span>
                  <span className="text-xs text-muted">{timeAgo(c.created_at)}</span>
                </div>
                <p className="text-sm text-ink mt-0.5">{c.body}</p>
              </div>
              {currentUser?.id === c.user_id && (
                <button onClick={() => remove(c.id)}
                  className="opacity-0 group-hover:opacity-100 text-xs text-red-400 hover:text-red-600 self-start mt-1">✕</button>
              )}
            </div>
          ))}
          {currentUser && (
            <div className="flex gap-2">
              <Avatar name={currentUser.name} url={currentUser.avatar_url} size="xs" />
              <div className="flex-1 flex gap-2">
                <input value={body} onChange={e => setBody(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); submit(); } }}
                  placeholder="Write a reply..." maxLength={500}
                  className="flex-1 px-3 py-1.5 border border-[var(--border)] rounded-xl text-xs focus:border-gold transition-colors" />
                <button onClick={submit} disabled={!body.trim() || submitting}
                  className="px-3 py-1.5 bg-ink text-gold text-xs rounded-xl hover:bg-brown transition-colors disabled:opacity-40">
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PostCard({ item, currentUser, apiFetch, onDelete }: any) {
  const [likeCount, setLikeCount] = useState(Number(item.like_count) || 0);
  const [liked, setLiked] = useState(Number(item.liked_by_me) > 0);

  const toggleLike = async () => {
    if (!currentUser) return;
    const prev = liked;
    setLiked(!prev); setLikeCount(c => prev ? c - 1 : c + 1);
    try { await apiFetch(`/api/timeline/${item.id}/like`, { method: "POST" }); }
    catch { setLiked(prev); setLikeCount(c => prev ? c + 1 : c - 1); }
  };

  if (item.item_type === "new_book") {
    return (
      <div className="bg-white rounded-2xl border border-[var(--border)] p-4">
        <p className="text-xs text-muted mb-3">{timeAgo(item.created_at)} · added a book</p>
        <Link href={`/books/${item.id}`}>
          <div className="flex gap-3 p-3 bg-cream rounded-xl hover:bg-amber-50 transition-colors">
            {item.book_cover
              ? <img src={item.book_cover} alt={item.book_title} className="w-10 h-14 object-cover rounded-lg shrink-0" />
              : <div className="w-10 h-14 bg-gold/20 rounded-lg flex items-center justify-center text-lg shrink-0">📖</div>}
            <div className="min-w-0">
              <p className="font-display font-semibold text-ink text-sm">{item.book_title}</p>
              <p className="text-xs text-muted">{item.book_author}</p>
              {item.book_genre && <span className="text-xs bg-gold/15 text-brown px-2 py-0.5 rounded-full mt-1 inline-block">{item.book_genre}</span>}
            </div>
          </div>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[var(--border)] p-4">
      <div className="flex items-start justify-between">
        <p className="text-xs text-muted">{timeAgo(item.created_at)}</p>
        {currentUser?.id === item.user_id && (
          <button onClick={() => onDelete(item.id)}
            className="text-xs text-muted hover:text-red-500 transition-colors px-1">✕</button>
        )}
      </div>
      <p className="text-sm text-ink mt-2 whitespace-pre-wrap leading-relaxed">{item.body}</p>
      {item.book_id && item.book_title && (
        <Link href={`/books/${item.book_id}`}
          className="flex items-center gap-2 mt-2 p-2 bg-cream rounded-xl hover:bg-amber-50 transition-colors">
          {item.book_cover
            ? <img src={item.book_cover} alt={item.book_title} className="w-7 h-9 object-cover rounded shrink-0" />
            : <div className="w-7 h-9 bg-gold/20 rounded shrink-0" />}
          <div className="min-w-0">
            <p className="text-xs font-semibold text-ink truncate">{item.book_title}</p>
            <p className="text-xs text-muted truncate">{item.book_author}</p>
          </div>
        </Link>
      )}
      <div className="flex items-center gap-3 mt-3 pt-2 border-t border-[var(--border)]">
        <button onClick={toggleLike} disabled={!currentUser}
          className={`text-xs flex items-center gap-1 transition-colors ${liked ? "text-red-500" : "text-muted hover:text-red-400"}`}>
          {liked ? "❤️" : "🤍"} {likeCount > 0 ? likeCount : "Like"}
        </button>
      </div>
      <CommentSection postId={item.id} initialCount={Number(item.comment_count) || 0} currentUser={currentUser} apiFetch={apiFetch} />
    </div>
  );
}

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const { apiFetch } = useApi();
  const { t } = useLang();
  const router = useRouter();

  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [tab, setTab] = useState<"library" | "timeline">("library");
  const [tlItems, setTlItems] = useState<TimelineItem[]>([]);
  const [tlLoading, setTlLoading] = useState(false);
  const [tlLoaded, setTlLoaded] = useState(false);
  const [tlCursor, setTlCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState("");
  const [posting, setPosting] = useState(false);

  const isOwnProfile = currentUser?.id === id;

  useEffect(() => {
    if (!id) return;
    const fetchProfile = async () => {
      try {
        const [userData, booksData] = await Promise.all([
          apiFetch(`/api/users/${id}`),
          apiFetch(`/api/books?owner=${id}`),
        ]);
        setProfile(userData.user || userData);
        setBooks(booksData.books || []);
      } catch { router.push("/catalog"); }
      finally { setLoading(false); }
    };
    fetchProfile();
  }, [id, apiFetch, router]);

  const loadTimeline = useCallback(async (reset = false) => {
    setTlLoading(true);
    try {
      const params = new URLSearchParams({ filter: "all", user_id: id as string });
      if (!reset && tlCursor) params.set("cursor", tlCursor);
      const data = await apiFetch(`/api/timeline?${params}`);
      if (reset) setTlItems(data.items || []);
      else setTlItems(prev => [...prev, ...(data.items || [])]);
      setTlCursor(data.nextCursor);
      setTlLoaded(true);
    } catch { /* silent */ }
    finally { setTlLoading(false); }
  }, [id, tlCursor, apiFetch]);

  useEffect(() => {
    if (tab === "timeline" && !tlLoaded) loadTimeline(true);
  }, [tab, tlLoaded, loadTimeline]);

  const submitPost = async () => {
    if (!newPost.trim() || posting) return;
    setPosting(true);
    try {
      const data = await apiFetch("/api/timeline", {
        method: "POST", body: JSON.stringify({ body: newPost }),
      });
      setTlItems(prev => [data.post, ...prev]);
      setNewPost("");
    } catch { /* silent */ }
    finally { setPosting(false); }
  };

  const deletePost = async (postId: string) => {
    await apiFetch(`/api/timeline/${postId}`, { method: "DELETE" });
    setTlItems(prev => prev.filter(i => i.id !== postId));
  };

  if (loading) return (
    <div className="min-h-screen"><Nav />
      <div className="flex items-center justify-center py-32 text-muted">{t.common.loading}</div>
    </div>
  );

  if (!profile) return null;

  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString("uk-UA", { month: "long", year: "numeric" })
    : null;

  const statusColor = (s: string) =>
    s === "available" ? "bg-green-50 text-green-700" : s === "borrowed" ? "bg-yellow-50 text-yellow-700" : "bg-gray-50 text-gray-500";

  const statusLabel = (s: string) =>
    s === "available" ? t.catalog.available : s === "borrowed" ? t.catalog.onLoan : t.catalog.reserved;

  return (
    <div className="min-h-screen bg-parchment">
      <Nav />

      {/* Header */}
      <div className="bg-ink text-white py-10 px-6">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar */}
          <div className="shrink-0">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.name}
                className="w-24 h-24 rounded-full object-cover border-2 border-gold" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gold flex items-center justify-center text-ink text-3xl font-semibold border-2 border-gold">
                {profile.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left">
            <h1 className="font-display text-3xl text-white mb-1">{profile.name}</h1>
            <p className="text-white/50 text-sm mb-3">
              📍 {[profile.city, profile.county, profile.province, profile.country].filter(Boolean).join(", ") || t.profile.locationNotSet}
            </p>
            {profile.bio && <p className="text-white/70 text-sm max-w-lg mb-4">{profile.bio}</p>}
            {memberSince && <p className="text-white/40 text-xs">{t.profile.memberSince} {memberSince}</p>}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 shrink-0">
            {isOwnProfile ? (
              <Link href="/profile/edit"
                className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-xl transition-colors text-center">
                ✏ {t.profile.editProfile}
              </Link>
            ) : (
              <Link href={`/messages?with=${profile.id}`}
                className="px-5 py-2.5 bg-gold text-ink text-sm font-medium rounded-xl hover:bg-yellow-400 transition-colors text-center">
                {t.profile.message}
              </Link>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="max-w-3xl mx-auto mt-8 flex gap-8 justify-center sm:justify-start">
          {[
            { num: profile.books_shared ?? 0, label: t.profile.booksShared },
            { num: profile.books_borrowed ?? 0, label: t.profile.booksBorrowed },
            { num: profile.rating ? Number(profile.rating).toFixed(1) : "—", label: t.profile.rating },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className="font-display text-2xl text-gold">{s.num}</div>
              <div className="text-white/40 text-xs mt-0.5 uppercase tracking-widest">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs — inside dark header */}
        <div className="max-w-3xl mx-auto mt-8 flex gap-1">
          {([
            ["library", `📚 ${isOwnProfile ? t.profile.myLibrary : t.profile.library}`, books.length],
            ["timeline", `💬 ${t.nav.timeline}`, null],
          ] as const).map(([key, label, count]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-5 py-2 rounded-t-xl text-sm font-medium transition-colors ${tab === key ? "bg-[var(--bg)] text-ink" : "text-white/50 hover:text-white hover:bg-white/10"}`}>
              {label}
              {count !== null && count > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-gold/20 text-gold text-xs rounded-full">{count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-3xl mx-auto px-6 py-8">

        {/* Library tab */}
        {tab === "library" && (
          books.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-[var(--border)]">
              <span className="text-5xl">📚</span>
              <p className="text-muted mt-4 text-sm">
                {isOwnProfile ? t.profile.emptyLibrary : t.profile.emptyOther}
              </p>
              {isOwnProfile && (
                <Link href="/my-books/add"
                  className="inline-block mt-4 px-5 py-2.5 bg-ink text-gold text-sm font-medium rounded-xl hover:bg-brown transition-colors">
                  {t.profile.addBook}
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {books.map(book => (
                <Link key={book.id}
                  href={isOwnProfile ? `/my-books/edit/${book.id}` : `/catalog/${book.id}`}
                  className="bg-white rounded-xl border border-[var(--border)] overflow-hidden hover:shadow-md transition-shadow group">
                  {book.cover_url ? (
                    <img src={book.cover_url} alt={book.title}
                      className="w-full h-40 object-cover group-hover:opacity-90 transition-opacity" />
                  ) : (
                    <div className="w-full h-40 bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center text-4xl">📖</div>
                  )}
                  <div className="p-3">
                    <p className="font-medium text-ink text-sm truncate">{book.title}</p>
                    <p className="text-muted text-xs truncate mt-0.5">{book.author}</p>
                    <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(book.status)}`}>
                      {statusLabel(book.status)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )
        )}

        {/* Timeline tab */}
        {tab === "timeline" && (
          <div className="space-y-4">
            {/* Compose — only on own profile */}
            {isOwnProfile && (
              <div className="bg-white rounded-2xl border border-[var(--border)] p-4">
                <div className="flex gap-3">
                  <Avatar name={profile.name} url={profile.avatar_url} />
                  <div className="flex-1">
                    <textarea value={newPost} onChange={e => setNewPost(e.target.value)}
                      placeholder={t.timeline.composePlaceholder}
                      rows={3} maxLength={2000}
                      className="w-full text-sm text-ink placeholder:text-muted resize-none outline-none" />
                    <div className="flex justify-between items-center pt-3 border-t border-[var(--border)]">
                      <span className="text-xs text-muted">{newPost.length}/2000</span>
                      <button onClick={submitPost} disabled={!newPost.trim() || posting}
                        className="px-4 py-1.5 bg-ink text-gold text-sm font-medium rounded-xl hover:bg-brown transition-colors disabled:opacity-40">
                        {posting ? t.timeline.posting : t.timeline.post}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tlLoading && !tlLoaded ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="skeleton h-32 rounded-2xl" />)}
              </div>
            ) : tlItems.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-[var(--border)]">
                <span className="text-5xl">💬</span>
                <p className="text-muted mt-4 text-sm">{t.timeline.noPostsTitle}</p>
              </div>
            ) : (
              <>
                {tlItems.map(item => (
                  <PostCard key={`${item.item_type}-${item.id}`} item={item}
                    currentUser={currentUser} apiFetch={apiFetch} onDelete={deletePost} />
                ))}
                {tlCursor && (
                  <button onClick={() => loadTimeline(false)} disabled={tlLoading}
                    className="w-full py-3 border border-[var(--border)] text-brown text-sm font-medium rounded-xl hover:bg-cream transition-colors disabled:opacity-50">
                    {tlLoading ? "..." : t.timeline.loadMore}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
