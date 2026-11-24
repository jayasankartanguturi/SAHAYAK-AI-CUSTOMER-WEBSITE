import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const GIS_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

const GOOGLE_LABELS = {
  English: {
    cta: 'Continue with Google',
    loading: 'Signing in with Google...',
    locale: 'en',
  },
  Telugu: {
    cta: 'Google తో కొనసాగండి',
    loading: 'Google ద్వారా సైన్ ఇన్ అవుతోంది...',
    locale: 'te',
  },
  Hindi: {
    cta: 'Google के साथ जारी रखें',
    loading: 'Google से साइन इन हो रहा है...',
    locale: 'hi',
  },
};

function GoogleGLogo() {
  return (
    <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] shrink-0" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.3 0 6.08-1.09 8.1-2.96l-3.88-3.05c-1.09.73-2.48 1.16-4.22 1.16-3.24 0-5.99-2.19-6.97-5.13H1.03v3.14C3.04 21.15 7.21 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.03 14.02A7.2 7.2 0 0 1 4.65 12c0-.7.13-1.38.38-2.02V6.84H1.03A11.98 11.98 0 0 0 0 12c0 1.94.46 3.77 1.03 5.16l4-3.14Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.8 0 3.41.62 4.68 1.84l3.51-3.51C18.07 1.19 15.3 0 12 0 7.21 0 3.04 2.85 1.03 6.84l4 3.14c.98-2.94 3.73-5.23 6.97-5.23Z"
      />
    </svg>
  );
}

function loadGoogleScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve(window.google);
      return;
    }
    const existing = document.querySelector(`script[src="${GIS_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google));
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Sign-In SDK')));
      return;
    }
    const script = document.createElement('script');
    script.src = GIS_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error('Failed to load Google Sign-In SDK'));
    document.head.appendChild(script);
  });
}

/**
 * Reusable Continue with Google button using Google Identity Services (GIS).
 * Renders the official Google Sign-In button with clean spelling, locale sync,
 * and loading/fallback states.
 */
export default function GoogleSignInButton({
  onCredential,
  onError,
  onCancel,
  disabled = false,
}) {
  const { language } = useApp();
  const labels = GOOGLE_LABELS[language] || GOOGLE_LABELS.English;

  const [loading, setLoading] = useState(false);
  const [gisReady, setGisReady] = useState(false);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  const mountedRef = useRef(true);
  const wrapperRef = useRef(null);
  const gisContainerRef = useRef(null);
  const callbacksRef = useRef({ onCredential, onError, onCancel });

  useEffect(() => {
    callbacksRef.current = { onCredential, onError, onCancel };
  }, [onCredential, onError, onCancel]);

  useEffect(() => {
    mountedRef.current = true;
    if (!clientId) {
      setGisReady(false);
      return () => {
        mountedRef.current = false;
      };
    }

    let cancelled = false;

    loadGoogleScript()
      .then((google) => {
        if (cancelled || !mountedRef.current || !google?.accounts?.id || !gisContainerRef.current) {
          return;
        }

        google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response) => {
            if (!response?.credential) {
              callbacksRef.current.onCancel?.('Google Sign-In was cancelled.');
              return;
            }
            if (mountedRef.current) setLoading(true);
            try {
              await callbacksRef.current.onCredential?.(response.credential);
            } catch (err) {
              callbacksRef.current.onError?.(err?.message || 'Google authentication failed.');
            } finally {
              if (mountedRef.current) setLoading(false);
            }
          },
          ux_mode: 'popup',
        });

        const container = gisContainerRef.current;
        container.innerHTML = '';
        const measuredWidth = wrapperRef.current?.getBoundingClientRect().width || 360;
        const targetWidth = Math.min(Math.max(Math.round(measuredWidth), 240), 400);

        google.accounts.id.renderButton(container, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'center',
          locale: labels.locale,
          width: targetWidth,
        });

        if (mountedRef.current) setGisReady(true);
      })
      .catch((err) => {
        if (!cancelled && mountedRef.current) {
          setGisReady(false);
          callbacksRef.current.onError?.(err?.message || 'Unable to load Google Sign-In.');
        }
      });

    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, [clientId, labels.locale]);

  const handleFallbackClick = () => {
    if (disabled || loading) return;
    if (!clientId) {
      onError?.(
        'Google Sign-In is not configured yet. Add VITE_GOOGLE_CLIENT_ID to frontend/.env.'
      );
      return;
    }
    if (!gisReady) {
      onError?.('Google Sign-In is still initializing. Please try again in a moment.');
    }
  };

  const showNativeGisButton = Boolean(clientId) && gisReady && !disabled && !loading;

  return (
    <div ref={wrapperRef} className="w-full">
      <div
        ref={gisContainerRef}
        className={showNativeGisButton ? 'w-full flex justify-center min-h-[42px]' : 'hidden'}
      />

      {!showNativeGisButton && (
        <button
          type="button"
          onClick={handleFallbackClick}
          disabled={disabled || loading}
          className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-[#FAF9FF] border border-[#DFDAF2] hover:border-[#7650E8]/45 text-[#171638] text-[13.5px] font-semibold flex items-center justify-center gap-2.5 transition-colors disabled:opacity-60 cursor-pointer"
        >
          {loading ? (
            <Loader2 className="w-[18px] h-[18px] text-[#7650E8] animate-spin shrink-0" />
          ) : (
            <GoogleGLogo />
          )}
          <span>{loading ? labels.loading : labels.cta}</span>
        </button>
      )}
    </div>
  );
}
