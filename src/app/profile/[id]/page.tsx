"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import BookCard from "@/components/BookCard";
import { useAuth } from "@/contexts/AuthContext";

interface UserProfile {
  id: string;
  name: string;
  bio?: string;
  avatar_url?: string;
  city?: string;
  neighborhood?: string;
  rating?: number;
  rating_count?: number;
  books_shared?: number;
  books_borrowed?: number;
  created_at?: string;
}

interface Book {
  id: string;
  title: string;
  author: string;
  cover_url?: string;
  genre?: string;
  status?: string;
  owner_name?: string;
  owner_city?: string;
  owner_neighborhood?: string;
}

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/users/${id}`).then((r) => r.json()),
      fetch(`/api/books?ownerId=${id}&status=`).then((r) => r.json()),
    ]).then(([userData, booksData]) => {
      setProfile(userData.user);
      setBooks(booksData.books || []);
      setLoading(false);
    });
  }, [id]);

  const isMe = user?.id === id;

  if (loading) {
    return (
      <div className="min-h-screen">
        <Nav />
        <div className="max-w-4xl mx-auto px-6 py-10 space-y-4">
          <div className="skeleton h-40 rounded-2xl" />
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton h-24 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen">
        <Nav />
        <div className="text-center py-24">
          <p className="font-display text-2xl">User not found</p>
        </div>
      </div>
    );
  }

  const memberSince = profile.created_at
    ? new Date(profile.created_at).getFullYear()
    : "—";

  return (
    <div className="min-h-screen">
      <Nav />

      {/* Profile header */}
      <div className="bg-ink text-white">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl bg-gold flex items-center justify-center text-ink text-3xl font-bold shrink-0">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="w-full h-full rounded-2xl object-cover"
                />
              ) : (
                profile.name.charAt(0).toUpperCase()
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="font-display text-3xl">{profile.name}</h1>
              <p className="text-white/50 text-sm mt-1">
                📍 {profile.neighborhood || profile.city || "Location not set"}
                {" · "}Member since {memberSince}
              </p>
              {profile.bio && (
                <p className="text-white/70 text-sm mt-3 max-w-lg leading-relaxed">
                  {profile.bio}
                </p>
              )}

              <div className="flex items-center gap-3 mt-4">
                {isMe ? (
                  <Link
                    href="/settings"
                    className="px-4 py-2 bg-white/10 hover:bg-white/15 transition-colors rounded-lg text-sm"
                  >
                    Edit Profile
                  </Link>
                ) : (
                  <Link
                    href={`/messages?with=${profile.id}`}
                    className="px-4 py-2 bg-gold text-ink font-medium hover:bg-yellow-400 transition-colors rounded-lg text-sm"
                  >
                    ✉ Message
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-white/10">
            {[
              { num: profile.books_shared || 0, label: "Books shared" },
              { num: profile.books_borrowed || 0, label: "Books borrowed" },
              {
                num: profile.rating_count
                  ? `${Number(profile.rating).toFixed(1)} ⭐`
                  : "No reviews",
                label: "Rating",
              },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="font-display text-2xl text-gold">{s.num}</p>
                <p className="text-white/40 text-xs mt-1 uppercase tracking-widest">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Books */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <h2 className="font-display text-2xl text-ink mb-6">
          {isMe ? "My Library" : `${profile.name.split(" ")[0]}'s Library`}
          <span className="text-muted font-sans text-base ml-2">
            ({books.length})
          </span>
        </h2>

        {books.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-[var(--border)]">
            <span className="text-4xl">📚</span>
            <p className="text-muted mt-3">
              {isMe ? "You haven't added any books yet." : "No books shared yet."}
            </p>
            {isMe && (
              <Link
                href="/my-books/add"
                className="inline-block mt-4 px-5 py-2.5 bg-ink text-gold font-medium rounded-xl hover:bg-brown transition-colors text-sm"
              >
                Add a Book →
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {books.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
