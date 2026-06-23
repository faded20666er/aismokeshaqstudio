import { signIn, signOut, useSession } from "next-auth/react";

export default function AuthButtons() {
  const { data: session } = useSession();

  if (!session) {
    return (
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => signIn("google")}>Sign in with Google</button>
        <button onClick={() => signIn()}>Sign in / Email</button>
      </div>
    );
  }

  return (
    <div>
      <span style={{ marginRight: 8 }}>{session.user?.email}</span>
      <button onClick={() => signOut()}>Sign out</button>
    </div>
  );
}
