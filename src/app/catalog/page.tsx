"use client";

import { useState, useEffect, useCallback } from "react";
import Nav from "@/components/Nav";
import BookCard from "@/components/BookCard";
import { useAuth } from "@/contexts/AuthContext";

const GENRES = [
  "Fiction", "Non-Fiction", "Mystery", "Science Fiction", "Fantasy",
  "Biography", "History", "Science", "Philosophy", "Poetry",
  "Romance", "Thriller", "Children", "Young Adult", "Cooking",
];

interface Book {
  id: string;
  title: string;
  author: string;
  cover_url?: string;
  genre?: string;
  condition?: string;
  status?: string;
  owner_name?: string;
  owner_city?: string;
  owner_neighborhood?: string;
  distance_km?: number;
  language?: string;
}

export default function CatalogPage() {
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [genre, setGenre] = useState("");
  const [status, setStatus] = useState("available");
  const [sortByDistance, setSortByDistance] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (genre) params.set("genre", genre);
    if (status) params.set("status", status);
    if (sortByDistance && userCoords) {
      params.set("lat", String(userCoords.lat));
      params.set("lng", String(userCoords.lng));
    }

    const res = await fetch(`/api/books?${params}`);
    const data = await res.json();
    setBooks(data.books || []);
    setLoading(false);
  }, [q, genre, status, sortByDistance, userCoords]);

  useEffect(() => {
    const timer = setTimeout(fetchBooks, 300);
    return () => clearTimeout(timer);
  }, [fetchBooks]);

  // Pre-load user coords from profile
  useEffect(() => {
    if (user?.lat && user?.lng) {
      setUserCoords({ lat: user.lat, lng: user.lng });
    }
  }, [user]);

  const getLocation = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setSortByDistance(true);
    });
  };

  return (
    <div className="min-h-screen">
      <Nav />

      {/* Header */}
      <div className="bg-ink text-white py-8 px-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="font-display text-3xl mb-1">Community Catalog</h1>
          <p className="text-white/50 text-sm">
            All books shared by readers in your community
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="sticky top-14 z-30 bg-white border-b border-[var(--border)] shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3 flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">🔍</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search title, author..."
              className="w-full pl-9 pr-4 py-2 border border-[var(--border)] rounded-xl text-sm focus:border-gold transition-colors"
            />
          </div>

          {/* Genre */}
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="px-3 py-2 border border-[var(--border)] rounded-xl text-sm bg-white focus:border-gold transition-colors"
          >
            <option value="">All genres</option>
            {GENRES.map((g) => <option key={g}>{g}</option>)}
          </select>

          {/* Status */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 border border-[var(--border)] rounded-xl text-sm bg-white focus:border-gold transition-colors"
          >
            <option value="">All statuses</option>
            <option value="available">Available</option>
            <option value="borrowed">On Loan</option>
            <option value="reserved">Reserved</option>
          </select>

          {/* Distance toggle */}
          <button
            onClick={() => {
              if (!userCoords) {
                getLocation();
              } else {
                setSortByDistance(!sortByDistance);
              }
            }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              sortByDistance
                ? "bg-gold text-ink"
                : "border border-[var(--border)] text-muted hover:border-gold hover:text-brown"
            }`}
          >
            📍 Near Me
          </button>

          <span className="text-muted text-sm ml-auto">
            {loading ? "Loading..." : `${books.length} books`}
          </span>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden">
                <div className="skeleton h-48" />
                <div className="p-4 bg-white space-y-2">
                  <div className="skeleton h-4 w-3/4" />
                  <div className="skeleton h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : books.length === 0 ? (
          <div className="text-center py-24">
            <span className="text-6xl">📭</span>
            <p className="font-display text-xl text-ink mt-4">No books found</p>
            <p className="text-muted mt-2">
              Try adjusting your filters or{" "}
              <a href="/my-books/add" className="text-brown underline">
                add your own books
              </a>
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {books.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
