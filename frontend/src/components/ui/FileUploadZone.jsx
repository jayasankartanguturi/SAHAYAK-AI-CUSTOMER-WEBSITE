import React from 'react';
import { UploadCloud } from 'lucide-react';

export default function FileUploadZone({
  accept,
  onFileSelect,
  title = 'Click to upload a file',
  subtitle = 'Select a supported file from your device',
  previewUrl,
  loading = false,
}) {
  return (
    <label className="block bg-white rounded-[24px] p-6 border-2 border-dashed border-[#D8D2F0] hover:border-[#7650E8] text-center cursor-pointer transition-colors">
      <input
        type="file"
        accept={accept}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelect(file);
        }}
        className="hidden"
      />
      {previewUrl ? (
        <img
          src={previewUrl}
          alt="Uploaded preview"
          className="max-h-56 mx-auto rounded-xl object-contain"
        />
      ) : (
        <div className="space-y-2">
          <UploadCloud className="w-10 h-10 text-[#7650E8] mx-auto" />
          <div className="text-[14px] font-bold text-[#171638]">
            {loading ? 'Processing file...' : title}
          </div>
          <div className="text-[11.5px] text-[#85839A]">{subtitle}</div>
        </div>
      )}
    </label>
  );
}

