// pages/_app.js
import "../styles/globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import AgeGate from "../components/AgeGate";

export default function App({ Component, pageProps }) {
  return (
    <ClerkProvider {...pageProps}>
      <AgeGate>
        <Component {...pageProps} />
      </AgeGate>
    </ClerkProvider>
  );
}
