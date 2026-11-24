import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingState({ message = 'Loading...' }) {
  return (
    <div className="bg-white rounded-[24px] p-8 border border-[#ECEAF6] flex flex-col items-center justify-center text-center">
      <Loader2 className="w-7 h-7 text-[#7650E8] animate-spin mb-2" />
      <p className="text-[13px] font-medium text-[#5A5778]">{message}</p>
    </div>
  );
}

