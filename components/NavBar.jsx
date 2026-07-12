// components/NavBar.jsx
import { useRouter } from 'next/router';
import Link from 'next/link';

const NAV_ITEMS = [
  { label: 'Studio',   href: '/',        emoji: '🎨' },
  { label: 'Tattoo',   href: '/tattoo',  emoji: '⚡' },
  { label: 'Audio',    href: '/audio',   emoji: '🎵' },
  { label: 'Timeline', href: '/timeline', emoji: '🎬' },
];

export default function NavBar({ user, credits, onLogout }) {
  const router = useRouter();

  return (
    <>
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: 'rgba(8, 8, 8, 0.96)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderBottom: '1px solid rgba(212, 175, 55, 0.18)',
        padding: '0 20px',
        height: 58,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}>

        {/* Logo */}
        <Link href="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
          <span style={{
            fontWeight: 900,
            fontSize: 16,
            background: 'linear-gradient(135deg, #d4af37 0%, #f5d76e 50%, #d4af37 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-0.3px',
            whiteSpace: 'nowrap',
          }}>
            AI SmokeShaq Studio
          </span>
        </Link>

        {/* Nav bubbles */}
        <div style={{
          display: 'flex',
          gap: 6,
          alignItems: 'center',
          flexWrap: 'nowrap',
          overflow: 'auto',
        }}>
          {NAV_ITEMS.map(item => {
            const isActive =
              item.href === '/'
                ? router.pathname === '/'
                : router.pathname.startsWith(item.href);

            return (
              <Link key={item.href} href={item.href} style={{ textDecoration: 'none', flexShrink: 0 }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '6px 14px',
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#0a0a0a' : 'rgba(255,255,255,0.65)',
                  background: isActive
                    ? 'linear-gradient(135deg, #d4af37, #f5d76e)'
                    : 'rgba(255,255,255,0.07)',
                  border: isActive ? 'none' : '1px solid rgba(255,255,255,0.1)',
                  transition: 'all 0.18s ease',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}>
                  <span style={{ fontSize: 14 }}>{item.emoji}</span>
                  <span>{item.label}</span>
                </span>
              </Link>
            );
          })}
        </div>

        {/* Account area */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {user ? (
            <>
              {/* Credits badge */}
              <span style={{
                padding: '5px 12px',
                borderRadius: 999,
                background: 'rgba(212,175,55,0.1)',
                border: '1px solid rgba(212,175,55,0.28)',
                color: '#d4af37',
                fontSize: 12,
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}>
                ✦ {credits ?? 0} credits
              </span>

              {/* Sign out */}
              <button
                onClick={onLogout}
                style={{
                  padding: '5px 13px',
                  borderRadius: 999,
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.13)',
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: 12,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.18s',
                }}
              >
                Sign out
              </button>
            </>
          ) : (
            <Link href="/login" style={{ textDecoration: 'none' }}>
              <span style={{
                display: 'inline-block',
                padding: '6px 18px',
                borderRadius: 999,
                background: 'linear-gradient(135deg, #d4af37, #f5d76e)',
                color: '#0a0a0a',
                fontSize: 13,
                fontWeight: 800,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}>
                Sign in
              </span>
            </Link>
          )}
        </div>

      </nav>

      {/* Spacer so page content doesn't hide under fixed nav */}
      <div style={{ height: 58 }} />
    </>
  );
}
