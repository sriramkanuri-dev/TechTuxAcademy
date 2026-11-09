import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { apiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/Button';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: { client_id: string; callback: (response: { credential: string }) => void }) => void;
          renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

const CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) || '';

export function GoogleButton({ onSuccess }: { onSuccess: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const { loginWithGoogle } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID || !ref.current) return;
    let cancelled = false;

    const render = () => {
      if (cancelled || !ref.current || !window.google) return;
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: async (response) => {
          setLoading(true);
          try {
            await loginWithGoogle(response.credential);
            toast.success('Signed in with Google.');
            onSuccess();
          } catch (error) {
            toast.error(apiErrorMessage(error));
          } finally {
            setLoading(false);
          }
        },
      });
      window.google.accounts.id.renderButton(ref.current, {
        theme: 'outline',
        size: 'large',
        width: 360,
        text: 'continue_with',
        shape: 'pill',
      });
    };

    if (window.google) {
      render();
    } else {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = render;
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
    };
  }, [loginWithGoogle, onSuccess, toast]);

  if (!CLIENT_ID) return null;

  return (
    <div className="mt-4">
      <div className="mb-4 flex items-center gap-3 text-xs uppercase tracking-wide text-muted">
        <span className="h-px flex-1 bg-line/10" />
        or
        <span className="h-px flex-1 bg-line/10" />
      </div>
      <div ref={ref} className="flex justify-center" />
      {loading && (
        <Button loading className="mt-3 w-full">
          Signing in…
        </Button>
      )}
    </div>
  );
}
