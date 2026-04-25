import { useEffect, useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { loginWithGoogle } from '../api/auth';

interface Props {
  onAuthenticated: (token: string) => void;
  text?: 'signin_with' | 'signup_with' | 'continue_with';
  className?: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
        };
      };
    };
  }
}

const CLIENT_ID =
  (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID ?? '';

/**
 * Renders the official Google Identity Services button.
 *
 * Requires:
 *   - <script src="https://accounts.google.com/gsi/client" async defer> in index.html
 *   - VITE_GOOGLE_CLIENT_ID in the frontend env
 *   - GOOGLE_CLIENT_ID matching value on the Django backend
 *
 * On a successful credential exchange, calls onAuthenticated(token) with the
 * Knox token returned by the backend.
 */
export function GoogleSignInButton({
  onAuthenticated,
  text = 'continue_with',
  className,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID || !ref.current) return;

    let cancelled = false;
    let attempts = 0;

    const tryInit = () => {
      if (cancelled) return;
      const g = window.google;
      if (!g?.accounts?.id) {
        if (attempts++ < 40) window.setTimeout(tryInit, 150);
        return;
      }
      g.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: async (response: { credential: string }) => {
          setError(null);
          setBusy(true);
          try {
            const data = await loginWithGoogle(response.credential);
            onAuthenticated(data.token);
          } catch (e: any) {
            setError(
              e?.response?.data?.error ||
                'Google sign-in failed. Please try again.',
            );
          } finally {
            setBusy(false);
          }
        },
        ux_mode: 'popup',
        auto_select: false,
      });
      g.accounts.id.renderButton(ref.current!, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text,
        shape: 'pill',
        logo_alignment: 'center',
        width: 320,
      });
    };

    tryInit();
    return () => {
      cancelled = true;
    };
  }, [onAuthenticated, text]);

  if (!CLIENT_ID) {
    return (
      <div className="text-center text-xs text-gray-400 py-2">
        Google sign-in is not configured.
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex justify-center">
        <div ref={ref} aria-busy={busy} />
      </div>
      {error && (
        <div className="mt-3 flex items-start gap-2 text-xs text-red-600">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
