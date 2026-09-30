import {
  createContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { getMe, login as loginRequest, type UserOut } from "../api/auth";
import { setToken } from "../api/client";

const TOKEN_STORAGE_KEY = "household-chores-token";

interface AuthContextValue {
  user: UserOut | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserOut | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCurrentUser() {
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!storedToken) {
        setLoading(false);
        return;
      }
      setToken(storedToken);
      try {
        const me = await getMe();
        setUser(me);
      } catch {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setToken(null);
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
    const me = await getMe();
    setUser(me);
  }

  function logout(): void {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
