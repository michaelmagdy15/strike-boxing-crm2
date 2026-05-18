import React, { useEffect, useRef, useState } from 'react';
import { X, Share, MoreVertical } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type Platform = 'android' | 'ios' | 'other';

// ── Helpers ───────────────────────────────────────────────────────────────────
function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  return 'other';
}

function isInStandaloneMode(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && (navigator as any).standalone === true)
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export function PWAInstallBanner() {
  const [platform] = useState<Platform>(detectPlatform);
  const [showIosBanner, setShowIosBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Already installed — never show
    if (isInStandaloneMode()) return;
    // Already dismissed this session
    if (sessionStorage.getItem('pwa-dismissed')) return;

    if (platform === 'android') {
      const handler = (e: Event) => {
        e.preventDefault();
        deferredPrompt.current = e as BeforeInstallPromptEvent;
        setTimeout(() => triggerAndroidPrompt(), 1500);
      };
      window.addEventListener('beforeinstallprompt', handler);
      return () => window.removeEventListener('beforeinstallprompt', handler);
    }

    if (platform === 'ios') {
      const t = setTimeout(() => setShowIosBanner(true), 2000);
      return () => clearTimeout(t);
    }

    return undefined;
  }, [platform]);

  const triggerAndroidPrompt = async () => {
    if (!deferredPrompt.current) return;
    await deferredPrompt.current.prompt();
    await deferredPrompt.current.userChoice;
    deferredPrompt.current = null;
  };

  const dismiss = () => {
    setShowIosBanner(false);
    setDismissed(true);
    sessionStorage.setItem('pwa-dismissed', '1');
  };

  if (dismissed || !showIosBanner) return null;

  // ── iOS guide banner ──────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        padding: '16px 20px 32px',
        background: 'linear-gradient(135deg, #111 0%, #1a1a1a 100%)',
        borderTop: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        animation: 'slideUp 0.35s cubic-bezier(.22,1,.36,1)',
      }}
    >
      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        .pwa-bounce { animation: bounce 1.4s ease-in-out infinite; }
      `}</style>

      {/* Close */}
      <button
        onClick={dismiss}
        style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: 4 }}
      >
        <X size={18} />
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <img src="/strikelogo.png" alt="Strike" style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'contain', background: '#000' }} />
        <div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, letterSpacing: '0.02em' }}>Add Strike CRM to your Home Screen</div>
          <div style={{ color: '#888', fontSize: 12, marginTop: 2 }}>Access your portal like a native app — no App Store needed</div>
        </div>
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Step n={1} icon={<Share size={16} color="#fff" />} label='Tap the Share button' sub='at the bottom of Safari' />
        <Step n={2} icon={<span style={{ fontSize: 16 }}>📋</span>} label='"Add to Home Screen"' sub='scroll down in the share sheet' />
        <Step n={3} icon={<span style={{ fontSize: 16 }}>✅</span>} label='Tap "Add"' sub='top-right corner of the dialog' />
      </div>

      {/* Animated arrow pointing down toward iOS share button */}
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 4 }}>
        <div className="pwa-bounce" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, color: '#e5b94e' }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Tap here</span>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 2v14M4 10l6 6 6-6" stroke="#e5b94e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Step({ n, icon, label, sub }: { n: number; icon: React.ReactNode; label: string; sub: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', background: '#e5b94e',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#000', fontWeight: 800, fontSize: 13, flexShrink: 0,
      }}>{n}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
        <span>{icon}</span>
        <div>
          <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{label}</div>
          <div style={{ color: '#666', fontSize: 11 }}>{sub}</div>
        </div>
      </div>
    </div>
  );
}
