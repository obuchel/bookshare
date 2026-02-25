"use client";

import { useLang } from "@/contexts/LangContext";

export default function LangSwitcher() {
  const { locale, setLocale } = useLang();

  return (
    <button
      onClick={() => setLocale(locale === "en" ? "uk" : "en")}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm"
      title={locale === "en" ? "Переключити на українську" : "Switch to English"}
    >
      <span className="text-base leading-none">
        {locale === "en" ? "🇺🇦" : "🇬🇧"}
      </span>
      <span className="text-white/80 text-xs font-medium">
        {locale === "en" ? "UA" : "EN"}
      </span>
    </button>
  );
}
