"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { translations, Locale, Translations } from "@/i18n/translations";

interface LangCtx { locale: Locale; t: Translations; setLocale: (l: Locale) => void; }
const LangContext = createContext<LangCtx | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  useEffect(() => { const saved = localStorage.getItem("bs_locale") as Locale; if (saved && translations[saved]) setLocaleState(saved); }, []);
  const setLocale = (l: Locale) => { setLocaleState(l); localStorage.setItem("bs_locale", l); };
  return <LangContext.Provider value={{ locale, t: translations[locale] as any, setLocale }}>{children}</LangContext.Provider>;
}

export function useLang() { const ctx = useContext(LangContext); if (!ctx) throw new Error("useLang must be used within LangProvider"); return ctx; }
