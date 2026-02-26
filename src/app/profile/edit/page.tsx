"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import ImageUpload from "@/components/ImageUpload";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/hooks/useApi";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/Toast";

export default function EditProfilePage() {
  const { user, setUser } = useAuth();
  const { apiFetch } = useApi();
  const router = useRouter();
  const { toasts, showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "", city: "", neighborhood: "", bio: "", avatar_url: "",
  });

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    setForm({
      name: user.name || "",
      city: user.city || "",
      neighborhood: user.neighborhood || "",
      bio: user.bio || "",
      avatar_url: user.avatar_url || "",
    });
  }, [user, router]);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updated = await apiFetch(`/api/users/${user!.id}`, {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      setUser?.(updated.user);
      showToast("Profile updated!");
      setTimeout(() => router.push("/profile"), 1000);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen">
      <Nav /><ToastContainer toasts={toasts} />
      <div className="max-w-lg mx-auto px-6 py-8">
        <h1 className="font-display text-3xl text-ink mb-6">Edit Profile</h1>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Avatar */}
          <div className="bg-white rounded-2xl border border-[var(--border)] p-6 flex flex-col items-center">
            <h2 className="font-medium text-ink mb-4 self-start">Profile Photo</h2>
            <ImageUpload
              type="profile"
              shape="circle"
              currentUrl={form.avatar_url}
              onUpload={(url) => setForm(prev => ({ ...prev, avatar_url: url }))}
            />
            <p className="text-xs text-muted mt-3">Click your photo to change it</p>
          </div>

          {/* Info */}
          <div className="bg-white rounded-2xl border border-[var(--border)] p-6 space-y-4">
            <h2 className="font-medium text-ink">Your Info</h2>
            <div>
              <label className="text-sm font-medium text-ink mb-1.5 block">Name</label>
              <input required value={form.name} onChange={set("name")}
                className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:border-gold transition-colors" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-ink mb-1.5 block">City</label>
                <input value={form.city} onChange={set("city")} placeholder="Kyiv"
                  className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:border-gold transition-colors" />
              </div>
              <div>
                <label className="text-sm font-medium text-ink mb-1.5 block">Neighbourhood</label>
                <input value={form.neighborhood} onChange={set("neighborhood")} placeholder="Podil"
                  className="w-full px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm focus:border-gold transition-colors" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-ink mb-1.5 block">Bio</label>
              <textarea value={form.bio} onChange={set("bio")}
                placeholder="Tell others a bit about yourself and what you like to read..."
                rows={4} maxLength={500}
                className="w-full px-4 py-3 border border-[var(--border)] rounded-xl text-sm focus:border-gold transition-colors resize-none" />
              <p className="text-xs text-muted mt-1 text-right">{form.bio.length}/500</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => router.back()}
              className="flex-1 py-3 border border-[var(--border)] text-brown font-medium rounded-xl hover:bg-cream transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-3 bg-ink text-gold font-display font-semibold rounded-xl hover:bg-brown transition-colors disabled:opacity-60">
              {loading ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
