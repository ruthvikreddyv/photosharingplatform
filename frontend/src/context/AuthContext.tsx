import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { api } from "../api/client";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MEMBER";
}

interface AuthContextValue {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (name: string, email: string, password: string, role: "ADMIN" | "MEMBER") => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser(): AuthUser | null {
  const raw = localStorage.getItem("user");
  return raw ? (JSON.parse(raw) as AuthUser) : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(readStoredUser());

  const persist = (token: string, user: AuthUser) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    setUser(user);
  };

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post("/api/auth/login", { email, password });
    persist(res.token, res.user);
    return res.user as AuthUser;
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string, role: "ADMIN" | "MEMBER") => {
      const res = await api.post("/api/auth/register", { name, email, password, role });
      persist(res.token, res.user);
      return res.user as AuthUser;
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
