// pages/_app.js
//
// Age gate removed from here intentionally — the whole site is NOT
// 18+, only the NSFW generation feature is. The gate now lives inside
// StudioPanel.jsx and only fires when a user tries to enable NSFW
// mode. See components/AgeGate.jsx for the modal implementation.
import "../styles/globals.css";
import { ClerkProvider } from "@clerk/nextjs";

export default function App({ Component, pageProps }) {
  return (
    <ClerkProvider {...pageProps}>
      <Component {...pageProps} />
    </ClerkProvider>
  );
}
