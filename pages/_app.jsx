// pages/_app.jsx
// Replace your existing _app.jsx with this file.
// It adds the global NavBar with shared auth state across all pages.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import NavBar from '../components/NavBar';
import { supabase } from '../utils/supabaseClient'; // adjust path if yours differs

export default function App({ Component, pageProps }) {
  const [user, setUser]       = useState(null);
  const [credits, setCredits] = useState(0);
  const router = useRouter();

  useEffect(() => {
    // Load current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchCredits(session.user.id);
    });

    // Keep in sync when user signs in / out in any tab
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) fetchCredits(session.user.id);
        else setCredits(0);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function fetchCredits(userId) {
    const { data } = await supabase
      .from('users')          // ← change to your actual table name if different
      .select('credits')
      .eq('id', userId)
      .single();
    if (data) setCredits(data.credits ?? 0);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    setCredits(0);
    router.push('/');
  }

  return (
    <>
      <NavBar user={user} credits={credits} onLogout={handleLogout} />
      <Component {...pageProps} user={user} credits={credits} fetchCredits={fetchCredits} />
    </>
  );
}
