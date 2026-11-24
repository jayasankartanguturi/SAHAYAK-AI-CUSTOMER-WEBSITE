import { useState, useRef, useEffect } from 'react';

function getSpeechLangCode(language) {
  if (language === 'Hindi') return 'hi-IN';
  if (language === 'Telugu') return 'te-IN';
  return 'en-IN';
}

const ERROR_MESSAGES = {
  'not-allowed':
    'Microphone permission was denied. Click the lock/site icon in your browser address bar and allow Microphone access.',
  'service-not-allowed':
    'Speech recognition service is blocked by browser settings. Please allow microphone access in Chrome or Edge.',
  'audio-capture':
    'No microphone was detected. Please connect or enable a microphone in Windows Sound settings.',
  'no-speech': 'No speech was detected. Please tap the microphone and speak clearly.',
  network:
    'Speech recognition needs an internet connection in Chrome/Edge. Check your network and try again.',
  aborted: '',
};

export function useSpeechRecognition({
  language,
  onTranscript,
  onUnsupported,
  onDenied,
  onError,
}) {
  const [listening, setListening] = useState(false);
  const [permission, setPermission] = useState('prompt');
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort?.();
      } catch {
        // ignore cleanup errors
      }
      recognitionRef.current = null;
    };
  }, []);

  const stop = () => {
    try {
      recognitionRef.current?.stop?.();
    } catch {
      // ignore
    }
    setListening(false);
  };

  const start = () => {
    if (listening) {
      stop();
      return;
    }

    setError('');

    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      const msg =
        'Microphone requires a secure HTTPS connection (or localhost in development).';
      setError(msg);
      onError?.(msg);
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      const msg =
        'Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.';
      setError(msg);
      onUnsupported?.(msg);
      onError?.(msg);
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }

      const recognition = new SpeechRecognition();
      recognition.lang = getSpeechLangCode(language);
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setListening(true);
        setPermission('granted');
        setError('');
      };

      recognition.onresult = (event) => {
        const text = Array.from(event.results)
          .map((r) => r[0]?.transcript || '')
          .join('')
          .trim();
        if (text) {
          onTranscript?.(text);
        }
      };

      recognition.onerror = (event) => {
        const code = event?.error || 'unknown';
        setListening(false);
        if (code === 'not-allowed' || code === 'service-not-allowed') {
          setPermission('denied');
          onDenied?.(ERROR_MESSAGES[code]);
        }
        const msg =
          ERROR_MESSAGES[code] !== undefined
            ? ERROR_MESSAGES[code]
            : `Microphone error (${code}). Please try again.`;
        if (msg) {
          setError(msg);
          onError?.(msg);
        }
      };

      recognition.onend = () => {
        setListening(false);
      };

      recognitionRef.current = recognition;
      setListening(true);
      recognition.start();
    } catch (err) {
      setListening(false);
      const msg =
        err?.message || 'Unable to start microphone. Please refresh and try again.';
      setError(msg);
      onError?.(msg);
    }
  };

  return { listening, permission, error, clearError: () => setError(''), start, stop };
}
