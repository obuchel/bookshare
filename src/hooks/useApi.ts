"use client";
import { useAuth } from "@/contexts/AuthContext";
import { useCallback } from "react";

export function useApi() {
  const { token } = useAuth();
  const apiFetch = useCallback(async (path: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = { "Content-Type": "application/json", ...(options.headers as Record<string, string>) };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(path, { ...options, headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  }, [token]);
  return { apiFetch };
}
