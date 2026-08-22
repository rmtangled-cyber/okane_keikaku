"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  User, GoogleAuthProvider,
  signInWithPopup, signInWithRedirect, getRedirectResult,
  signOut as fbSignOut, onAuthStateChanged,
} from "firebase/auth";
import { auth } from "./firebase";
import { setAuthUid } from "./uid";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Pick up any pending redirect result (e.g. after iOS redirect flow)
    getRedirectResult(auth).catch(() => {});
    return onAuthStateChanged(auth, (u) => {
      setAuthUid(u?.uid ?? null);
      setUser(u);
      setLoading(false);
    });
  }, []);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      // Popup works when called directly from a user gesture (including iOS Safari)
      await signInWithPopup(auth, provider);
    } catch (e: unknown) {
      const code = (e as { code?: string }).code ?? "";
      // Fall back to redirect only if popup is explicitly blocked
      if (code === "auth/popup-blocked" || code === "auth/cancelled-popup-request") {
        await signInWithRedirect(auth, provider);
      }
      // Other errors (user closed popup, network) are silently ignored
    }
  };

  const signOut = async () => {
    await fbSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
