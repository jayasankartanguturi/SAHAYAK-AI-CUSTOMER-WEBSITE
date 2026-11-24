import React from 'react';
import { AlertCircle, X } from 'lucide-react';

export default function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-[12.5px] flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
        <span className="font-medium">{message}</span>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded-lg hover:bg-rose-100 text-rose-600"
          aria-label="Dismiss error"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

