import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api";

// Who is signed in, for the whole app. The session lives in an httpOnly
// cookie, so this only remembers what the API says about it.
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { user: current } = await api.get("/auth/me");
      setUser(current);
      return current;
    } catch {
      // API not running or not reachable: treat as signed out
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Runs once even in development's double-render, so the session is not
  // fetched twice on every page.
  const asked = useRef(false);
  useEffect(() => {
    if (asked.current) return;
    asked.current = true;
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      user,
      loading,
      refresh,

      async signUp({ username, email, password }) {
        const data = await api.post("/auth/signup", { username, email, password });
        setUser(data.user);
        return data; // devCode is included while emails print to the terminal
      },

      async signIn({ email, password }) {
        const data = await api.post("/auth/signin", { email, password });
        setUser(data.user);
        return data.user;
      },

      async signOut() {
        try {
          await api.post("/auth/signout");
        } finally {
          setUser(null);
        }
      },

      verifyEmail: (code) => api.post("/auth/verify-email", { code }).then(refresh),
      resendCode: () => api.post("/auth/resend-code"),
      forgotPassword: (email) => api.post("/auth/forgot-password", { email }),
      checkResetCode: (email, code) => api.post("/auth/check-reset-code", { email, code }),
      resetPassword: (email, code, password) =>
        api.post("/auth/reset-password", { email, code, password }),

      async updateProfile(patch) {
        const data = await api.patch("/me", patch);
        setUser(data.user);
        return data.user;
      },
    }),
    [user, loading, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>");
  return value;
}
