"use client";

import { ownerIDAtom } from "@/atoms/chat";
import { ProfileT } from "@/types/collections";
import { Session } from "@supabase/supabase-js";
import { useSetAtom } from "jotai";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect } from "react";
import useSWR from "swr";
import { useSupabase } from "./supabase-provider";

// Add interfaces for sign-in and sign-up data
interface SignInCredentials {
  email: string;
  password: string;
}

interface SignUpCredentials extends SignInCredentials {
  username: string;
}

interface ContextI {
  user: ProfileT | null | undefined;
  error: any;
  isLoading: boolean;
  mutate: any;
  signOut: () => Promise<void>;
  signInWithGithub: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;  // Add Google sign-in
  signInWithEmail: (credentials: SignInCredentials) => Promise<{
    error: Error | null;
    success: boolean;
  }>;
  signUpWithEmail: (credentials: SignUpCredentials) => Promise<{
    error: Error | null;
    success: boolean;
  }>;
}

const Context = createContext<ContextI>({
  user: null,
  error: null,
  isLoading: true,
  mutate: null,
  signOut: async () => {},
  signInWithGithub: async () => {},
  signInWithGoogle: async () => {},  // Add Google sign-in to context default
  signInWithEmail: async () => ({ error: null, success: false }),
  signUpWithEmail: async () => ({ error: null, success: false }),
});

export default function SupabaseAuthProvider({
  serverSession,
  children,
}: {
  serverSession?: Session | null;
  children: React.ReactNode;
}) {
  if (
    !process.env.NEXT_PUBLIC_AUTH_REDIRECT_URL &&
    (process.env.NEXT_PUBLIC_VERCEL_ENV === "production" ||
      process.env.NEXT_PUBLIC_VERCEL_ENV === "preview")
  ) {
    throw new Error("NEXT_PUBLIC_AUTH_REDIRECT_URL must be set in .env");
  }

  const { supabase } = useSupabase();
  const router = useRouter();
  const setOwnerID = useSetAtom(ownerIDAtom);

  const getUser = async () => {
    const { data: user, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", serverSession?.user?.id)
      .single();
    if (error) {
      console.log(error);
      return null;
    } else {
      return user;
    }
  };

  const {
    data: user,
    error,
    isLoading,
    mutate,
  } = useSWR(serverSession ? "profile-context" : null, getUser);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    console.log("Signed Out! (from supabase-auth-provider.tsx)");
  };

  const signInWithGithub = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo:
          process.env.NEXT_PUBLIC_VERCEL_ENV === "production" ||
          process.env.NEXT_PUBLIC_VERCEL_ENV === "preview"
            ? process.env.NEXT_PUBLIC_AUTH_REDIRECT_URL
            : "http://localhost:3000/chat",
      },
    });
  };

  // Add Google sign-in function
  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo:
          process.env.NEXT_PUBLIC_VERCEL_ENV === "production" ||
          process.env.NEXT_PUBLIC_VERCEL_ENV === "preview"
            ? process.env.NEXT_PUBLIC_AUTH_REDIRECT_URL
            : "http://localhost:3000/chat",
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
  };

  // New sign-in with email function
  const signInWithEmail = async ({ email, password }: SignInCredentials) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      router.push("/chat");
      return { error: null, success: true };
    } catch (error) {
      console.error("Error signing in:", error);
      return { error: error as Error, success: false };
    }
  };

  // New sign-up with email function
  const signUpWithEmail = async ({ email, password, username }: SignUpCredentials) => {
    try {
      // Sign up the user with metadata including the username
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: username,  // This matches our trigger's expected field
            avatar_url: null        // Include this if you want to set a default avatar
          },
        },
      });
  
      if (authError) throw authError;
  
      // No need for manual profile creation since the trigger will handle it
      // The trigger will create the profile with username in the full_name field
  
      router.push("/chat");
      return { error: null, success: true };
    } catch (error) {
      console.error("Error signing up:", error);
      return { error: error as Error, success: false };
    }
  };

  // Set Owner ID
  useEffect(() => {
    if (user) {
      setOwnerID(user.id);
    }
  }, [setOwnerID, user]);

  // Refresh the Page to Sync Server and Client
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.access_token !== serverSession?.access_token) {
        router.refresh();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase, serverSession?.access_token]);

  const exposed: ContextI = {
    user,
    error,
    isLoading,
    mutate,
    signOut,
    signInWithGithub,
    signInWithGoogle,  // Add Google sign-in to exposed context
    signInWithEmail,
    signUpWithEmail,
  };

  return <Context.Provider value={exposed}>{children}</Context.Provider>;
}

export const useAuth = () => {
  let context = useContext(Context);
  if (context === undefined) {
    throw new Error("useAuth must be used inside SupabaseAuthProvider");
  } else {
    return context;
  }
};