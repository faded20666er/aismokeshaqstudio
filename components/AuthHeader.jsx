// components/AuthHeader.jsx
//
// Shows a "Sign in" link when signed out, or the user's avatar/account
// menu when signed in. Styled to match the existing gold/dark theme
// rather than Clerk's default Tailwind look.

import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

export default function AuthHeader() {
  return (
    <div className="auth-header">
      <SignedOut>
        <SignInButton mode="modal">
          <button className="auth-button">Sign In</button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button className="auth-button auth-button-primary">Sign Up</button>
        </SignUpButton>
      </SignedOut>

      <SignedIn>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>

      <style jsx>{`
        .auth-header {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .auth-button {
          padding: 7px 16px;
          border-radius: 999px;
          border: 1px solid rgba(255, 215, 0, 0.4);
          background: transparent;
          color: #f3d98b;
          font-size: 0.85rem;
          letter-spacing: 0.04em;
          cursor: pointer;
        }

        .auth-button-primary {
          background: linear-gradient(135deg, #f3d98b, #c9a227);
          color: #0a0a0c;
          border: none;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
