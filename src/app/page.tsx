"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import Nav from "@/components/Nav";

export default function HomePage() {
  const { user } = useAuth();
  const { t } = useLang();
  const h = t.home;

  return (
    <div className="min-h-screen">
      <Nav />
      <section className="bg-ink relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `radial-gradient(ellipse 100% 80% at 70% 50%, #C89B3C 0%, transparent 60%), radial-gradient(ellipse 60% 60% at 20% 80%, #7C4B2A 0%, transparent 50%)` }} />
        <div className="relative max-w-6xl mx-auto px-6 py-24 lg:py-36 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-gold text-sm mb-6">
              <span>✦</span><span>{h.badge}</span>
            </div>
            <h1 className="font-display text-5xl lg:text-6xl text-white leading-tight mb-6">
              {h.headline1}<br /><span className="italic text-gold">{h.headline2}</span>
            </h1>
            <p className="text-white/60 text-lg leading-relaxed mb-8 max-w-md">{h.sub}</p>
            <div className="flex items-center gap-3 flex-wrap">
              {user ? (
                <>
                  <Link href="/catalog" className="px-6 py-3 bg-gold text-ink font-semibold rounded-xl hover:bg-yellow-400 transition-colors">{h.browseCatalog}</Link>
                  <Link href="/my-books" className="px-6 py-3 bg-white/10 text-white rounded-xl hover:bg-white/15 transition-colors">{h.myLibrary}</Link>
                </>
              ) : (
                <>
                  <Link href="/register" className="px-6 py-3 bg-gold text-ink font-semibold rounded-xl hover:bg-yellow-400 transition-colors">{h.joinFree}</Link>
                  <Link href="/catalog" className="px-6 py-3 bg-white/10 text-white rounded-xl hover:bg-white/15 transition-colors">{h.browseBooks}</Link>
                </>
              )}
            </div>
          </div>
          <div className="hidden lg:flex justify-center">
            <div className="relative">
              {[
                { color: "#7C4B2A", rotate: "-6deg", top: "20px", left: "20px", title: "The Midnight Library" },
                { color: "#6B7F5E", rotate: "3deg", top: "10px", left: "10px", title: "Piranesi" },
                { color: "#C89B3C", rotate: "0deg", top: "0px", left: "0px", title: "Pachinko" },
              ].map((b, i) => (
                <div key={i} className="absolute w-44 h-64 rounded-xl flex flex-col items-center justify-center shadow-2xl" style={{ background: `linear-gradient(135deg, ${b.color}dd, ${b.color}88)`, transform: `rotate(${b.rotate})`, top: b.top, left: b.left, zIndex: 3 - i }}>
                  <span className="text-3xl mb-3">📚</span>
                  <p className="text-white/90 text-sm font-display text-center px-3 leading-tight">{b.title}</p>
                </div>
              ))}
              <div className="w-44 h-64" />
            </div>
          </div>
        </div>
        <div className="relative border-t border-white/10">
          <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-3 gap-4 text-center">
            {[
              { num: "2,400+", label: h.stats.shared },
              { num: "840+", label: h.stats.readers },
              { num: "12 km", label: h.stats.distance },
            ].map((s) => (
              <div key={s.label}>
                <div className="font-display text-2xl text-gold">{s.num}</div>
                <div className="text-white/40 text-xs mt-1 uppercase tracking-widest">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="font-display text-3xl text-center text-ink mb-12">{h.howTitle}</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {h.steps.map((item) => (
            <div key={item.step} className="bg-white rounded-2xl p-8 border border-[var(--border)] relative overflow-hidden group hover:border-gold transition-colors">
              <div className="absolute top-6 right-6 font-display text-6xl text-cream font-bold select-none">{item.step}</div>
              <div className="text-4xl mb-4">{item.icon}</div>
              <h3 className="font-display text-xl text-ink mb-2">{item.title}</h3>
              <p className="text-muted text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-cream border-y border-[var(--border)]">
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <h2 className="font-display text-3xl text-ink mb-4">{h.ctaTitle}</h2>
          <p className="text-muted mb-8">{h.ctaSub}</p>
          <Link href={user ? "/my-books/add" : "/register"} className="inline-flex items-center gap-2 px-8 py-4 bg-ink text-gold font-display text-lg rounded-xl hover:bg-brown transition-colors">
            {user ? h.ctaBtnUser : h.ctaBtn}
          </Link>
        </div>
      </section>

      <footer className="bg-ink text-white/40 py-8 text-center text-sm">
        <p>{h.footer}</p>
      </footer>
    </div>
  );
}
