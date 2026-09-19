"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  User, GoogleAuthProvider,
  signInWithPopup, signInWithRedirect,
  signOut as fbSignOut, onAuthStateChanged,
} from "firebase/auth";
import { auth } from "./firebase";
import { setAuthUid } from "./uid";
import {
  setViewerOwnerUid as storageSetViewerOwnerUid,
  lookupOwnerByViewerEmail,
  loadOwnerDisplayName,
} from "./storage";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  viewerOwnerUid: string | null;
  viewerDisplayName: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewerOwnerUid, setViewerOwnerUid] = useState<string | null>(null);
  const [viewerDisplayName, setViewerDisplayName] = useState<string | null>(null);

  useEffect(() => {
    // Safety timeout: if Firebase doesn't resolve auth state in 8s, unblock the UI
    const timeout = setTimeout(() => setLoading(false), 8000);
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      clearTimeout(timeout);
      setAuthUid(u?.uid ?? null);
      setUser(u);

      if (u?.email) {
        const ownerUid = await lookupOwnerByViewerEmail(u.email);
        if (ownerUid) {
          storageSetViewerOwnerUid(ownerUid);
          setViewerOwnerUid(ownerUid);
          const name = await loadOwnerDisplayName(ownerUid);
          setViewerDisplayName(name);
        } else {
          storageSetViewerOwnerUid(null);
          setViewerOwnerUid(null);
          setViewerDisplayName(null);
        }
      } else {
        storageSetViewerOwnerUid(null);
        setViewerOwnerUid(null);
        setViewerDisplayName(null);
      }

      setLoading(false);
    });
    return () => { clearTimeout(timeout); unsubscribe(); };
  }, []);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (e: unknown) {
      const code = (e as { code?: string }).code ?? "";
      // Redirect fallback only when popup is explicitly blocked by the browser
      if (code === "auth/popup-blocked" || code === "auth/cancelled-popup-request") {
        await signInWithRedirect(auth, provider);
      }
    }
  };

  const signOut = async () => {
    await fbSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, viewerOwnerUid, viewerDisplayName, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
