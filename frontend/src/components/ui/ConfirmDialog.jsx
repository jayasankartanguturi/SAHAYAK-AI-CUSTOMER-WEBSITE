import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useLanguage } from '../../context/AppContext';

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}) {
  const { t } = useLanguage();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#171638]/40 backdrop-blur-xs">
      <div className="bg-white rounded-[24px] w-full max-w-sm p-6 border border-[#ECEAF6] shadow-2xl">
        <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <h3 className="text-[16px] font-bold text-[#171638]">{title || t('common.confirm')}</h3>
        <p className="text-[13px] text-[#5A5778] mt-1 leading-relaxed">{message || t('common.confirmMessage')}</p>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-full bg-[#F1EFF8] hover:bg-[#E8DFFF] text-[#323052] text-[12.5px] font-semibold"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-[12.5px] font-semibold"
          >
            {confirmLabel || t('common.delete')}
          </button>
        </div>
      </div>
    </div>
  );
}

