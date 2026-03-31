import { useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session — onAuthStateChange also fires SIGNED_IN on mount
    // so we only use getSession to set initial loading state correctly
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Single listener — this is the ONLY thing that updates session state.
    // login.tsx and other screens must NOT manually navigate after signIn/signOut.
    // Navigation is driven entirely by session state changes in _layout.tsx / index.tsx.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      // Ensure loading is cleared on any auth event in case getSession was slow
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    // Return error only — caller should NOT navigate. Let onAuthStateChange handle it.
    return { error };
  };

  const signOut = async () => {
    // Set loading true so layouts show spinner during the transition,
    // preventing any flash of protected content
    setLoading(true);
    await supabase.auth.signOut();
    // onAuthStateChange will fire with null session → setSession(null) → setLoading(false)
    // Navigation is handled by AdminLayout's <Redirect href="/login" />
  };

  return { session, loading, signIn, signOut };
}