"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Nav from "@/components/Nav";
import BookCard from "@/components/BookCard";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";

const GENRES_EN = ["Fiction","Non-Fiction","Mystery","Science Fiction","Fantasy","Biography","History","Science","Philosophy","Poetry","Romance","Thriller","Children","Young Adult","Cooking"];
const LANGUAGES = ["Ukrainian","English","French","German","Polish","Spanish","Russian","Other"];
const DISTANCE_STEPS = [1, 2, 5, 10, 20, 50, 100];

interface Book {
  id: string; title: string; author: string; cover_url?: string; genre?: string;
  condition?: string; status?: string; owner_name?: string; owner_city?: string;
  owner_neighborhood?: string; distance_km?: number; language?: string;
}

export default function CatalogPage() {
  const { user } = useAuth();
  const { t } = useLang();
  const c = t.catalog;
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [genre, setGenre] = useState("");
  const [status, setStatus] = useState("");
  const [language, setLanguage] = useState("");
  const [sortByDistance, setSortByDistance] = useState(false);
  const [maxDistanceIdx, setMaxDistanceIdx] = useState(DISTANCE_STEPS.length - 1); // default = 100km = "any"
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [showDistanceSlider, setShowDistanceSlider] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  const maxKm = DISTANCE_STEPS[maxDistanceIdx];
  const isAnyDistance = maxDistanceIdx === DISTANCE_STEPS.length - 1;

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (genre) params.set("genre", genre);
    if (status) params.set("status", status);
    if (language) params.set("language", language);
    if (sortByDistance && userCoords) {
      params.set("lat", String(userCoords.lat));
      params.set("lng", String(userCoords.lng));
    }
    const res = await fetch(`/api/books?${params}`);
    const data = await res.json();
    let result: Book[] = data.books || [];
    // Client-side distance filter
    if (sortByDistance && !isAnyDistance) {
      result = result.filter(b => b.distance_km == null || b.distance_km <= maxKm);
    }
    setBooks(result);
    setLoading(false);
  }, [q, genre, status, language, sortByDistance, userCoords, maxKm, isAnyDistance]);

  useEffect(() => { const timer = setTimeout(fetchBooks, 300); return () => clearTimeout(timer); }, [fetchBooks]);
  useEffect(() => { if (user?.lat && user?.lng) setUserCoords({ lat: user.lat, lng: user.lng }); }, [user]);

  // Close slider when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sliderRef.current && !sliderRef.current.contains(e.target as Node)) {
        setShowDistanceSlider(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const getLocation = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSortByDistance(true);
        setLocating(false);
        setShowDistanceSlider(true);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handleNearMeClick = () => {
    if (!userCoords) {
      getLocation();
    } else {
      setSortByDistance(!sortByDistance);
      if (!sortByDistance) setShowDistanceSlider(true);
      else setShowDistanceSlider(false);
    }
  };

  const nearMeLabel = locating
    ? "📍 ..."
    : sortByDistance && !isAnyDistance
      ? `📍 ≤ ${maxKm} ${c.km}`
      : c.nearMe;

  return (
    <div className="min-h-screen">
      <Nav />
      <div className="bg-ink text-white py-8 px-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="font-display text-3xl mb-1">{c.title}</h1>
          <p className="text-white/50 text-sm">{c.sub}</p>
        </div>
      </div>

      {/* Filters bar */}
      <div className="sticky top-14 z-30 bg-white border-b border-[var(--border)] shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3 flex flex-wrap gap-3 items-center">

          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">🔍</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={c.searchPlaceholder}
              className="w-full pl-9 pr-4 py-2 border border-[var(--border)] rounded-xl text-sm focus:border-gold transition-colors"
            />
          </div>

          {/* Genre */}
          <select value={genre} onChange={(e) => setGenre(e.target.value)}
            className="px-3 py-2 border border-[var(--border)] rounded-xl text-sm bg-white focus:border-gold transition-colors">
            <option value="">{c.allGenres}</option>
            {GENRES_EN.map((g) => (
              <option key={g} value={g}>{t.addBook.genres[g as keyof typeof t.addBook.genres] ?? g}</option>
            ))}
          </select>

          {/* Language */}
          <select value={language} onChange={(e) => setLanguage(e.target.value)}
            className="px-3 py-2 border border-[var(--border)] rounded-xl text-sm bg-white focus:border-gold transition-colors">
            <option value="">{c.allLanguages}</option>
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>

          {/* Status */}
          <select value={status} onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 border border-[var(--border)] rounded-xl text-sm bg-white focus:border-gold transition-colors">
            <option value="">{c.allStatuses}</option>
            <option value="available">{c.available}</option>
            <option value="borrowed">{c.onLoan}</option>
            <option value="reserved">{c.reserved}</option>
          </select>

          {/* Near Me + Distance Slider */}
          <div className="relative" ref={sliderRef}>
            <button
              onClick={handleNearMeClick}
              disabled={locating}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                sortByDistance
                  ? "bg-gold text-ink"
                  : "border border-[var(--border)] text-muted hover:border-gold hover:text-brown"
              }`}
            >
              {nearMeLabel}
            </button>

            {/* Distance dropdown */}
            {showDistanceSlider && sortByDistance && (
              <div className="absolute right-0 top-full mt-2 bg-white border border-[var(--border)] rounded-2xl shadow-lg p-4 w-64 z-50">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-medium text-ink">{c.withinKm}</span>
                  <span className="text-sm font-semibold text-gold">
                    {isAnyDistance ? c.anyDistance : `${maxKm} ${c.km}`}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={DISTANCE_STEPS.length - 1}
                  value={maxDistanceIdx}
                  onChange={(e) => setMaxDistanceIdx(Number(e.target.value))}
                  className="w-full accent-[#C89B3C]"
                />
                <div className="flex justify-between text-xs text-muted mt-1">
                  <span>1 {c.km}</span>
                  <span>{c.anyDistance}</span>
                </div>
                {/* Step labels */}
                <div className="flex justify-between mt-3 gap-1 flex-wrap">
                  {DISTANCE_STEPS.map((d, i) => (
                    <button
                      key={d}
                      onClick={() => setMaxDistanceIdx(i)}
                      className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                        maxDistanceIdx === i
                          ? "bg-gold text-ink font-semibold"
                          : "bg-cream text-muted hover:text-brown"
                      }`}
                    >
                      {i === DISTANCE_STEPS.length - 1 ? "∞" : `${d}`}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <span className="text-muted text-sm ml-auto">
            {loading ? c.loading : `${books.length} ${c.books}`}
          </span>
        </div>
      </div>

      {/* Books grid */}
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
            <p className="font-display text-xl text-ink mt-4">{c.noBooks}</p>
            <p className="text-muted mt-2">
              {c.noBooksSub}{" "}
              <a href="/my-books/add" className="text-brown underline">{c.addYourOwn}</a>
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
            {books.map((book) => <BookCard key={book.id} book={book} />)}
          </div>
        )}
      </div>
    </div>
  );
}
