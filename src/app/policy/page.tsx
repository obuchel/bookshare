"use client";

import Nav from "@/components/Nav";
import Link from "next/link";
import { useLang } from "@/contexts/LangContext";

export default function PolicyPage() {
  const { t } = useLang();
  const p = t.policy;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Nav />

      {/* Header */}
      <div className="bg-ink text-white">
        <div className="max-w-3xl mx-auto px-6 py-14 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-gold text-sm mb-5">
            <span>📋</span><span>{p.version}</span>
          </div>
          <h1 className="font-display text-4xl text-white mb-3">{p.title}</h1>
          <p className="text-white/60 max-w-xl mx-auto">{p.subtitle}</p>
        </div>
      </div>

      {/* Sections */}
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-6">
        {p.sections.map((section, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-[var(--border)] p-7"
          >
            <h2 className="font-display text-lg text-ink mb-3 flex items-start gap-3">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gold/15 text-gold text-sm font-bold shrink-0 mt-0.5">
                {i + 1}
              </span>
              {/* Strip the leading "N. " from heading since we show the number */}
              {section.heading.replace(/^\d+\.\s*/, "")}
            </h2>
            <p className="text-muted text-sm leading-relaxed">{section.body}</p>
          </div>
        ))}

        {/* Footer note */}
        <div className="bg-cream rounded-2xl border border-[var(--border)] p-7 text-center">
          <p className="text-ink font-medium mb-1">{p.questions}</p>
          <Link
            href="/profile"
            className="text-gold hover:underline text-sm"
          >
            {p.contact} →
          </Link>
        </div>

        <p className="text-center text-xs text-muted pb-4">
          КнигоОбмін · ukr-books.vercel.app
        </p>
      </div>
    </div>
  );
}
