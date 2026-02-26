"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface User { id: string; name: string; email: string; city?: string; neighborhood?: string; lat?: number; lng?: number; bio?: string; avatar_url?: string; rating?: number; books_shared?: number; books_borrowed?: number; }
interface AuthCtx { user: User | null; token: string | null; loading: boolean; login: (email: string, password: string) => Promise<void>; register: (data: RegisterData) => Promise<void>; logout: () => void; updateUser: (data: Partial<User>) => void; setUser: (user: User | null) => void; }
interface RegisterData { name: string; email: string; password: string; city?: string; neighborhood?: string; lat?: number; lng?: number; }

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem("bs_token");
    const savedUser = localStorage.getItem("bs_user");
    if (savedToken && savedUser) { setToken(savedToken); setUser(JSON.parse(savedUser)); }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");
    setUser(data.user); setToken(data.token);
    localStorage.setItem("bs_token", data.token); localStorage.setItem("bs_user", JSON.stringify(data.user));
  };

  const register = async (regData: RegisterData) => {
    const res = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(regData) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Registration failed");
    setUser(data.user); setToken(data.token);
    localStorage.setItem("bs_token", data.token); localStorage.setItem("bs_user", JSON.stringify(data.user));
  };

  const logout = () => { setUser(null); setToken(null); localStorage.removeItem("bs_token"); localStorage.removeItem("bs_user"); fetch("/api/auth/logout", { method: "POST" }); };
  const updateUser = (data: Partial<User>) => { if (!user) return; const updated = { ...user, ...data }; setUser(updated); localStorage.setItem("bs_user", JSON.stringify(updated)); };

  return <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUser, setUser }}>{children}</AuthContext.Provider>;
}

export function useAuth() { const ctx = useContext(AuthContext); if (!ctx) throw new Error("useAuth must be used within AuthProvider"); return ctx; }
