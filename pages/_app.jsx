// pages/_app.jsx
//
// Global app shell. Wraps every page in Clerk's <ClerkProvider> (required
// for useUser(), <SignedIn>/<SignedOut>, <UserButton>, etc. used elsewhere
// in the app — AuthHeader.jsx, useAppUserId.js) and renders the shared
// NavBar with live auth + credits state.
//
// NOTE: this file previously imported a Supabase client that doesn't
// exist in this project (auth here is Clerk, not Supabase — see
// middleware.js, utils/useAppUserId.js) and it dropped the ClerkProvider
// wrapper entirely, which broke both the production build (missing
// module) and, had the import not failed first, every Clerk-dependent
// component at runtime. Fixed to use Clerk's real session state and the
// existing /api/credits endpoint (backed by Redis — see
// middleware/creditsStore.js) instead of a nonexistent Supabase table.

import "../styles/globals.css";
import { ClerkProvider, useUser, useClerk } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import NavBar from "../components/NavBar";

function AppShell({ Component, pageProps }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const [credits, setCredits] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn && user) {
      fetchCredits(user.id);
    } else {
      setCredits(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn, user?.id]);

  async function fetchCredits(userId) {
    try {
      const res = await fetch(`/api/credits?userId=${encodeURIComponent(userId)}`);
      const data = await res.json();
      if (data?.success) setCredits(data.credits ?? 0);
    } catch (err) {
      console.error("Failed to fetch credits:", err);
    }
  }

  async function handleLogout() {
    await signOut();
    setCredits(0);
    router.push("/");
  }

  return (
    <>
      <NavBar user={user} credits={credits} onLogout={handleLogout} />
      <Component
        {...pageProps}
        user={user}
        credits={credits}
        fetchCredits={() => user && fetchCredits(user.id)}
      />
    </>
  );
}

export default function App({ Component, pageProps }) {
  return (
    <ClerkProvider {...pageProps}>
      <AppShell Component={Component} pageProps={pageProps} />
      {/* ADDED [Sep 1 2026]: the site had ZERO visitor tracking of any
          kind before this — no @vercel/analytics, no Google Analytics,
          nothing (confirmed by grepping the codebase and by Vercel's
          own Web Analytics API returning 404 "Web Analytics not found"
          for this project). This <Analytics /> script is what actually
          records pageviews going forward. IMPORTANT: shipping this
          code alone isn't enough — Web Analytics also has to be turned
          ON for this project in the Vercel dashboard (Project →
          Analytics tab → Enable) before any data starts recording.
          Safe to ship either way: if it's off, this script just no-ops
          silently instead of erroring. */}
      <Analytics />
    </ClerkProvider>
  );
}
