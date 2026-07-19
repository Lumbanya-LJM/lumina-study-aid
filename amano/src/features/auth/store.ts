import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Role } from "@/data/types";

/**
 * Mock-first session layer.
 * The surface mirrors Supabase Auth (signUp / signInWithPassword /
 * signInWithOAuth / signOut) so Phase-3→production is a provider swap,
 * not a refactor. Accounts live in localStorage; no real credentials.
 */

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  provider: "email" | "google" | "apple" | "microsoft";
  roles: Role[];
  emailVerified: boolean;
  onboarded: boolean;
  interests: string[]; // vertical ids
  pathId?: string;
}

interface AuthState {
  user: SessionUser | null;
  signUp: (args: { email: string; password: string; displayName: string }) => Promise<{ error?: string }>;
  signInWithPassword: (args: { email: string; password: string }) => Promise<{ error?: string }>;
  signInWithOAuth: (provider: "google" | "apple" | "microsoft") => Promise<void>;
  verifyEmail: (code: string) => Promise<{ error?: string }>;
  completeOnboarding: (args: { roles: Role[]; interests: string[]; pathId?: string }) => void;
  signOut: () => void;
}

/** Demo verification code accepted by the mock verifier. */
export const DEMO_OTP = "000000";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface StoredAccount {
  email: string;
  password: string;
  displayName: string;
}

const ACCOUNTS_KEY = "amano.accounts";

function loadAccounts(): StoredAccount[] {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveAccount(account: StoredAccount) {
  const rest = loadAccounts().filter((a) => a.email !== account.email);
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify([...rest, account]));
}

const providerNames = {
  google: "Google",
  apple: "Apple",
  microsoft: "Microsoft",
} as const;

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,

      signUp: async ({ email, password, displayName }) => {
        await wait(600);
        if (loadAccounts().some((a) => a.email === email)) {
          return { error: "An account with this email already exists. Sign in instead." };
        }
        saveAccount({ email, password, displayName });
        set({
          user: {
            id: crypto.randomUUID(),
            email,
            displayName,
            provider: "email",
            roles: ["student"],
            emailVerified: false,
            onboarded: false,
            interests: [],
          },
        });
        return {};
      },

      signInWithPassword: async ({ email, password }) => {
        await wait(600);
        const account = loadAccounts().find((a) => a.email === email);
        if (!account || account.password !== password) {
          return { error: "Email or password is incorrect." };
        }
        set({
          user: {
            id: crypto.randomUUID(),
            email,
            displayName: account.displayName,
            provider: "email",
            roles: ["student"],
            emailVerified: true,
            onboarded: get().user?.email === email ? get().user!.onboarded : true,
            interests: get().user?.interests ?? [],
          },
        });
        return {};
      },

      signInWithOAuth: async (provider) => {
        await wait(800); // stands in for the redirect round-trip
        set({
          user: {
            id: crypto.randomUUID(),
            email: `you@${provider}.example`,
            displayName: `${providerNames[provider]} User`,
            provider,
            roles: ["student"],
            emailVerified: true,
            onboarded: false,
            interests: [],
          },
        });
      },

      verifyEmail: async (code) => {
        await wait(500);
        if (code !== DEMO_OTP) {
          return { error: `Incorrect code. (Prototype accepts ${DEMO_OTP}.)` };
        }
        set((s) => (s.user ? { user: { ...s.user, emailVerified: true } } : s));
        return {};
      },

      completeOnboarding: ({ roles, interests, pathId }) =>
        set((s) =>
          s.user
            ? { user: { ...s.user, roles, interests, pathId, onboarded: true } }
            : s
        ),

      signOut: () => set({ user: null }),
    }),
    { name: "amano.session" }
  )
);
