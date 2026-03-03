"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import ImageUpload from "@/components/ImageUpload";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import { useApi } from "@/hooks/useApi";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/Toast";

const PRECISION_LEVELS = [
  { value: 0, label: "Country",      decimals: 1, description: "~100 km" },
  { value: 1, label: "Province",     decimals: 2, description: "~10 km"  },
  { value: 2, label: "City",         decimals: 3, description: "~1 km"   },
  { value: 3, label: "Neighbourhood",decimals: 4, description: "~100 m"  },
];

function roundCoord(value: number, decimals: number) {
  return parseFloat(value.toFixed(decimals));
}

export default function EditProfilePage() {
  const { user, setUser } = useAuth();
  const { t } = useLang();
  const { apiFetch } = useApi();
  const router = useRouter();
  const { toasts, showToast } = useToast();
  const [loading, setLoading]   = useState(false);
  const [fetching, setFetching] = useState(true);
  const [locating, setLocating] = useState(false);
  const [precision, setPrecision] = useState(2);
  const [form, setForm] = useState({
    name: "", city: "", county: "", province: "", country: "",
    bio: "", avatar_url: "",
    lat: null as number | null,
    lng: null as number | null,
  });

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    apiFetch(`/api/users/${user.id}`)
      .then((data) => {
        const u = data.user || data;
        setForm({
          name:       u.name       || "",
          city:       u.city       || "",
          county:     u.county     || "",
          province:   u.province   || "",
          country:    u.country    || "",
          bio:        u.bio        || "",
          avatar_url: u.avatar_url || "",
          lat: u.lat ?? null,
          lng: u.lng ?? null,
        });
      })
      .catch(() => showToast(t.editProfile.loadError, "error"))
      .finally(() => setFetching(false));
  }, [user, router]);

  const set = (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }));

  const detectLocation = () => {
    setLocating(true);
    const timeout = setTimeout(() => {
      setLocating(false);
      showToast("Location detection timed out", "error");
    }, 8000);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timeout);
        const p = PRECISION_LEVELS[precision];
        setForm(prev => ({
          ...prev,
          lat: roundCoord(pos.coords.latitude,  p.decimals),
          lng: roundCoord(pos.coords.longitude, p.decimals),
        }));
        setLocating(false);
      },
      () => {
        clearTimeout(timeout);
        showToast("Could not detect location", "error");
        setLocating(false);
      }
    );
  };

  const handlePrecisionChange = (level: number) => {
    setPrecision(level);
    if (form.lat !== null && form.lng !== null) {
      const p = PRECISION_LEVELS[level];
      setForm(prev => ({
        ...prev,
        lat: roundCoord(prev.lat!, p.decimals),
        lng: roundCoord(prev.lng!, p.decimals),
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updated = await apiFetch(`/api/users/${user!.id}`, {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      setUser?.(updated.user);
      showToast(t.editProfile.saveSuccess);
      setTimeout(() => router.push(`/profile/${user!.id}`), 1000);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!user || fetching) {
    return (
      <div className="min-h-screen"><Nav />
        <div className="flex items-center justify-center py-32 text-muted">{t.common.loading}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Nav /><ToastContainer toasts={toasts} />
      <div className="max-w-lg mx-auto px-6 py-8">
        <h1 className="font-display text-3xl text-ink mb-6">{t.editProfile.title}</h1>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Avatar */}
          <div className="bg-white rounded-2xl border border-[var(--border)] p-6 flex flex-col items-center">
            <h2 className="font-medium text-ink mb-4 self-start">{t.editProfile.photoSection}</h2>
            <ImageUpload type="profile" shape="circle" currentUrl={form.avatar_url}
              onUpload={(url) => setForm(prev => ({ ...prev, avatar_url: url }))} />
            <p className="text-xs text-muted mt-3">{t.editProfile.photoHint}</p>
          </div>

          {/* Info */}
          <div className="bg-white rounded-2xl border border-[var(--border)] p-6 space-y-4">
            <h2 className="font-medium text-ink">{t.editProfile.infoSection}</h2>
            <div>
              <label className="text-sm font-medium text-ink mb-1.5 block">{t.editProfile.name}</label>
              <input required value={form.name} onChange={set("name")}
                className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:border-gold transition-colors" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-ink mb-1.5 block">{t.editProfile.city}</label>
                <input value={form.city} onChange={set("city")} placeholder="London"
                  className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:border-gold transition-colors" />
              </div>
              <div>
                <label className="text-sm font-medium text-ink mb-1.5 block">{t.editProfile.county}</label>
                <input value={form.county} onChange={set("county")} placeholder="Middlesex"
                  className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:border-gold transition-colors" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-ink mb-1.5 block">{t.editProfile.province}</label>
                <input value={form.province} onChange={set("province")} placeholder="Ontario"
                  className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:border-gold transition-colors" />
              </div>
              <div>
                <label className="text-sm font-medium text-ink mb-1.5 block">{t.editProfile.country}</label>
                <input value={form.country} onChange={set("country")} placeholder="Canada"
                  className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:border-gold transition-colors" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-ink mb-1.5 block">{t.editProfile.bio}</label>
              <textarea value={form.bio} onChange={set("bio")} placeholder={t.editProfile.bioPlaceholder}
                rows={4} maxLength={500}
                className="w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm focus:border-gold transition-colors resize-none" />
              <p className="text-xs text-muted mt-1 text-right">{form.bio.length}/500</p>
            </div>
          </div>

          {/* Location */}
          <div className="bg-white rounded-2xl border border-[var(--border)] p-6 space-y-4">
            <div>
              <h2 className="font-medium text-ink">{t.editProfile.locationSection}</h2>
              <p className="text-xs text-muted mt-0.5">{t.editProfile.locationHint}</p>
            </div>

            {/* Precision */}
            <div>
              <label className="text-sm font-medium text-ink mb-2 block">{t.editProfile.precision}</label>
              <div className="grid grid-cols-4 gap-2">
                {PRECISION_LEVELS.map((level) => (
                  <button key={level.value} type="button"
                    onClick={() => handlePrecisionChange(level.value)}
                    className={`py-2 px-1 rounded-xl text-xs font-medium border transition-colors text-center ${
                      precision === level.value
                        ? "bg-ink text-gold border-ink"
                        : "bg-white text-brown border-[var(--border)] hover:bg-cream"
                    }`}>
                    <div>{level.label}</div>
                    <div className={`text-[10px] mt-0.5 ${precision === level.value ? "text-gold/70" : "text-muted"}`}>
                      {level.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* GPS detect */}
            <div className="flex items-center gap-3 p-3 bg-cream rounded-xl">
              <div className="flex-1">
                <p className="text-sm font-medium text-ink">{t.editProfile.coordinates}</p>
                <p className="text-xs text-muted mt-0.5 font-mono">
                  {form.lat !== null && form.lng !== null
                    ? `${form.lat}, ${form.lng}`
                    : t.editProfile.noCoords}
                </p>
              </div>
              <button type="button" onClick={detectLocation} disabled={locating}
                className="px-3 py-1.5 bg-white border border-[var(--border)] rounded-lg text-xs font-medium text-brown hover:bg-cream transition-colors disabled:opacity-50 shrink-0">
                {locating ? t.auth.detecting : form.lat !== null ? t.editProfile.reDetect : t.auth.detect}
              </button>
            </div>

            {/* Manual override */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted mb-1 block">{t.editProfile.latitude}</label>
                <input type="number" step="any" value={form.lat ?? ""}
                  onChange={e => setForm(prev => ({ ...prev, lat: e.target.value ? parseFloat(e.target.value) : null }))}
                  placeholder="51.5074"
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-xl text-sm focus:border-gold transition-colors font-mono" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted mb-1 block">{t.editProfile.longitude}</label>
                <input type="number" step="any" value={form.lng ?? ""}
                  onChange={e => setForm(prev => ({ ...prev, lng: e.target.value ? parseFloat(e.target.value) : null }))}
                  placeholder="-0.1278"
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-xl text-sm focus:border-gold transition-colors font-mono" />
              </div>
            </div>
            {form.lat !== null && (
              <button type="button"
                onClick={() => setForm(prev => ({ ...prev, lat: null, lng: null }))}
                className="text-xs text-rust hover:underline">
                {t.editProfile.clearCoords}
              </button>
            )}
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => router.back()}
              className="flex-1 py-3 border border-[var(--border)] text-brown font-medium rounded-xl hover:bg-cream transition-colors">
              {t.editProfile.cancel}
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-3 bg-ink text-gold font-display font-semibold rounded-xl hover:bg-brown transition-colors disabled:opacity-60">
              {loading ? t.editProfile.saving : t.editProfile.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
