import { useEffect, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const guestStarted = useRef(false);

  async function ensureGuestSession(current: Session | null) {
    if (current || guestStarted.current) return;
    guestStarted.current = true;
    await supabase.auth.signInAnonymously();
  }

  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setUser(next?.user ?? null);
      if (next) setLoading(false);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session) {
        setLoading(false);
      } else {
        void ensureGuestSession(data.session).finally(() => setLoading(false));
      }
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  return { session, user, loading, isAuthenticated: Boolean(session) };
}