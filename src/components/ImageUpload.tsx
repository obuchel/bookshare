"use client";

import { useState, useRef } from "react";

interface ImageUploadProps {
  type: "profile" | "book";
  currentUrl?: string;
  onUpload: (url: string) => void;
  shape?: "circle" | "rect";
  placeholder?: string;
}

export default function ImageUpload({ type, currentUrl, onUpload, shape = "rect", placeholder }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) { setError("Only images allowed"); return; }
    if (file.size > 5 * 1024 * 1024) { setError("Max 5MB"); return; }

    setError("");
    setUploading(true);

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Upload failed");
      onUpload(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setPreview(currentUrl || null);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  if (shape === "circle") {
    return (
      <div className="flex flex-col items-center gap-3">
        <div
          className="relative w-24 h-24 rounded-full cursor-pointer group"
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          {preview ? (
            <img src={preview} alt="" className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-50 to-orange-100 border-4 border-white shadow-md flex items-center justify-center text-3xl">
              👤
            </div>
          )}
          <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            {uploading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span className="text-white text-xs font-medium">Change</span>
            )}
          </div>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        className={`relative border-2 border-dashed rounded-xl transition-colors cursor-pointer ${uploading ? "border-gold bg-amber-50/50" : "border-[var(--border)] hover:border-gold hover:bg-amber-50/30"}`}
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        {preview ? (
          <div className="relative">
            <img src={preview} alt="" className="w-full h-48 object-cover rounded-xl" />
            <div className="absolute inset-0 rounded-xl bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {uploading ? "Uploading..." : "Click to change"}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            {uploading ? (
              <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin mb-2" />
            ) : (
              <span className="text-3xl mb-2">🖼️</span>
            )}
            <p className="text-sm font-medium text-ink">{uploading ? "Uploading..." : placeholder || "Upload cover image"}</p>
            <p className="text-xs text-muted mt-1">PNG, JPG up to 5MB · drag & drop or click</p>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
    </div>
  );
}
