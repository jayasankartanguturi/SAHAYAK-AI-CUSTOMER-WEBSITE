import React from 'react';
import { Inbox } from 'lucide-react';

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'Nothing here yet',
  description = 'Items you create or save will appear here.',
  actionLabel,
  onAction,
}) {
  return (
    <div className="bg-white rounded-[24px] p-8 border border-dashed border-[#D8D2F0] flex flex-col items-center justify-center text-center">
      <div className="w-12 h-12 rounded-2xl bg-[#F1EFF8] text-[#7650E8] flex items-center justify-center mb-3">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-[15px] font-bold text-[#171638]">{title}</h3>
      <p className="text-[12.5px] text-[#85839A] mt-1 max-w-md">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-5 py-2 rounded-full bg-gradient-to-r from-[#7650E8] to-[#6336D9] text-white text-[12.5px] font-semibold shadow-sm hover:shadow-md transition-all"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

