"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import LangSwitcher from "@/components/LangSwitcher";

export default function Nav() {
  const { user, logout } = useAuth();
  const { t } = useLang();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { href: "/catalog", label: t.nav.catalog },
    ...(user ? [
      { href: "/my-books", label: t.nav.myBooks },
      { href: "/requests", label: t.nav.requests },
      { href: "/messages", label: t.nav.messages },
      { href: "/invites", label: "👥 " + t.nav.invite }
    ] : []),
  ];

  return (
    <nav className="sticky top-0 z-50 bg-ink border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <Link href="/" className="font-display text-xl text-gold tracking-wide shrink-0">📚 {t.appName}</Link>

        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className={`px-3 py-1.5 rounded-md text-sm transition-colors ${pathname === link.href ? "text-gold bg-white/10" : "text-white/60 hover:text-white hover:bg-white/5"}`}>
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <LangSwitcher />
          {user ? (
            <div className="relative">
              <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 transition-colors">
                <div className="w-6 h-6 rounded-full bg-gold flex items-center justify-center text-ink text-xs font-semibold">{user.name.charAt(0).toUpperCase()}</div>
                <span className="text-white/80 text-sm hidden sm:block">{user.name.split(" ")[0]}</span>
                <span className="text-white/40 text-xs">▾</span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-[var(--border)] py-1 animate-fade-in">
                  <Link href={`/profile/${user.id}`} onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm text-ink hover:bg-cream">{t.nav.profile}</Link>
                  <Link href="/my-books" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm text-ink hover:bg-cream">{t.nav.myBooks}</Link>
                  <Link href="/requests" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm text-ink hover:bg-cream">{t.nav.requests}</Link>
                  <Link href="/invites" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm text-ink hover:bg-cream">👥 {t.invite.pageTitle}</Link>
                  <hr className="my-1 border-[var(--border)]" />
                  <button onClick={() => { logout(); setMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-rust hover:bg-cream">{t.nav.signOut}</button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="px-3 py-1.5 text-sm text-white/70 hover:text-white">{t.nav.signIn}</Link>
              <Link href="/register" className="px-4 py-1.5 text-sm bg-gold text-ink font-medium rounded-lg hover:bg-yellow-400">{t.nav.joinFree}</Link>
            </div>
          )}
          <button className="md:hidden text-white/70 hover:text-white" onClick={() => setMenuOpen(!menuOpen)}>☰</button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-ink border-t border-white/10 px-4 py-3 flex flex-col gap-1">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className="px-3 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/10">{link.label}</Link>
          ))}
        </div>
      )}
    </nav>
  );
}
