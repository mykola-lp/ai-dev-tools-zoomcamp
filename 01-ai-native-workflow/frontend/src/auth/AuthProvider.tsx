import { useEffect, useState, type ReactNode } from "react";

import { getMe, login as loginRequest } from "../api/auth";
import { setToken } from "../api/client";
import { AuthContext, type AuthContextValue } from "./AuthContext";
import type { UserOut } from "../api/auth";

const TOKEN_STORAGE_KEY = "household-chores-token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserOut | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCurrentUser() {
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!storedToken) {
        setLoading(false);
        return;
      }
      setToken(storedToken);
      setTokenState(storedToken);
      try {
        const me = await getMe();
        setUser(me);
      } catch {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setToken(null);
        setTokenState(null);
      } finally {
        setLoading(false);
      }
    }

    void loadCurrentUser();
  }, []);

  async function login(email: string, password: string): Promise<void> {
    const { access_token } = await loginRequest({ email, password });
    localStorage.setItem(TOKEN_STORAGE_KEY, access_token);
    setToken(access_token);
    setTokenState(access_token);
    const me = await getMe();
    setUser(me);
  }

  function logout(): void {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setTokenState(null);
    setUser(null);
  }

  const value: AuthContextValue = { user, token, loading, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
