import React from 'react';

export default function PageHeader({ icon: Icon, title, subtitle, badge }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#7650E8] to-[#6336D9] text-white flex items-center justify-center shadow-sm shrink-0">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div>
          <h1 className="text-[20px] sm:text-[22px] font-bold text-[#171638] leading-tight">
            {title}
          </h1>
          {subtitle && <p className="text-[13px] text-[#85839A] mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {badge && (
        <span className="px-3 py-1 rounded-full bg-[#E8DFFF] text-[#6336D9] text-[11.5px] font-semibold">
          {badge}
        </span>
      )}
    </div>
  );
}

