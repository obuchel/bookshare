"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Nav from "@/components/Nav";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    city: "",
    neighborhood: "",
  });
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);

  const detectLocation = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocating(false);
        setError("Could not detect location — you can add it manually later.");
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await register({
        ...form,
        lat: coords?.lat,
        lng: coords?.lng,
      });
      router.push("/catalog");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="min-h-screen">
      <Nav />
      <div className="flex items-center justify-center min-h-[calc(100vh-56px)] px-4 py-12">
        <div className="w-full max-w-md animate-slide-up">
          <div className="bg-white rounded-2xl border border-[var(--border)] p-8 shadow-sm">
            <div className="text-center mb-8">
              <span className="text-4xl">📚</span>
              <h1 className="font-display text-2xl text-ink mt-3">
                Join BookShare
              </h1>
              <p className="text-muted text-sm mt-1">
                Start lending and borrowing books in your community
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-6">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-ink mb-1.5 block">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={set("name")}
                  placeholder="Jane Austen"
                  className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:border-gold focus:ring-2 focus:ring-gold/20 transition-colors"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-ink mb-1.5 block">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={set("email")}
                  placeholder="you@example.com"
                  className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:border-gold focus:ring-2 focus:ring-gold/20 transition-colors"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-ink mb-1.5 block">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={set("password")}
                  placeholder="At least 6 characters"
                  className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:border-gold focus:ring-2 focus:ring-gold/20 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-ink mb-1.5 block">
                    City
                  </label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={set("city")}
                    placeholder="London"
                    className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:border-gold focus:ring-2 focus:ring-gold/20 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-ink mb-1.5 block">
                    Neighbourhood
                  </label>
                  <input
                    type="text"
                    value={form.neighborhood}
                    onChange={set("neighborhood")}
                    placeholder="Shoreditch"
                    className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:border-gold focus:ring-2 focus:ring-gold/20 transition-colors"
                  />
                </div>
              </div>

              {/* Location */}
              <div className="flex items-center gap-3 p-3 bg-cream rounded-xl">
                <div className="flex-1">
                  <p className="text-sm font-medium text-ink">
                    📍 Location{" "}
                    <span className="text-muted font-normal">(for distance search)</span>
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {coords
                      ? `✓ Location detected (${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)})`
                      : "Help others find books near them"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={locating || !!coords}
                  className="px-3 py-1.5 bg-white border border-[var(--border)] rounded-lg text-xs font-medium text-brown hover:bg-cream transition-colors disabled:opacity-50"
                >
                  {locating ? "Detecting..." : coords ? "✓ Got it" : "Detect"}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-ink text-gold font-display font-semibold rounded-xl hover:bg-brown transition-colors disabled:opacity-60 mt-2"
              >
                {loading ? "Creating account..." : "Create Account →"}
              </button>
            </form>

            <p className="text-center text-sm text-muted mt-6">
              Already a member?{" "}
              <Link href="/login" className="text-brown font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
