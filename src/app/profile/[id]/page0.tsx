"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/hooks/useApi";
import { useLang } from "@/contexts/LangContext";

interface ProfileUser {
  id: string;
  name: string;
  city?: string;
  neighborhood?: string;
  bio?: string;
  avatar_url?: string;
  rating?: number;
  books_shared?: number;
  books_borrowed?: number;
  created_at?: string;
}

interface Book {
  id: string;
  title: string;
  author: string;
  cover_url?: string;
  status: string;
  genre?: string;
}

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();
  const { apiFetch } = useApi();
  const { t } = useLang();
  const router = useRouter();

  const [profile, setProfile] = useState<ProfileUser | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  const isOwnProfile = currentUser?.id === id;

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const [userData, booksData] = await Promise.all([
          apiFetch(`/api/users/${id}`),
          apiFetch(`/api/books?user_id=${id}`),
        ]);
        setProfile(userData.user || userData);
        setBooks(booksData.books || []);
      } catch {
        router.push("/catalog");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchProfile();
  }, [id, apiFetch, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-parchment">
        <Nav />
        <div className="flex items-center justify-center py-32 text-muted">{t.common.loading}</div>
      </div>
    );
  }

  if (!profile) return null;

  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString("uk-UA", { month: "long", year: "numeric" })
    : null;

  const statusColor = (status: string) => {
    if (status === "available") return "bg-green-50 text-green-700";
    if (status === "borrowed") return "bg-yellow-50 text-yellow-700";
    return "bg-gray-50 text-gray-500";
  };

  const statusLabel = (status: string) => {
    if (status === "available") return t.catalog.available;
    if (status === "borrowed") return t.catalog.onLoan;
    return t.catalog.reserved;
  };

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
              📍 {profile.city && profile.neighborhood
                ? `${profile.neighborhood}, ${profile.city}`
                : profile.city || profile.neighborhood || t.profile.locationNotSet}
            </p>
            {profile.bio && (
              <p className="text-white/70 text-sm max-w-lg mb-4">{profile.bio}</p>
            )}
            {memberSince && (
              <p className="text-white/40 text-xs">{t.profile.memberSince} {memberSince}</p>
            )}
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
      </div>

      {/* Books */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        <h2 className="font-display text-xl text-ink mb-5">
          {isOwnProfile ? t.profile.myLibrary : t.profile.library}
        </h2>

        {books.length === 0 ? (
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
              <Link key={book.id} href={`/catalog/${book.id}`}
                className="bg-white rounded-xl border border-[var(--border)] overflow-hidden hover:shadow-md transition-shadow group">
                {book.cover_url ? (
                  <img src={book.cover_url} alt={book.title}
                    className="w-full h-40 object-cover group-hover:opacity-90 transition-opacity" />
                ) : (
                  <div className="w-full h-40 bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center text-4xl">
                    📖
                  </div>
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
        )}
      </div>
    </div>
  );
}
