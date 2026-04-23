import { useEffect } from 'react';
import { cn } from '@/lib/utils';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

type AdBannerProps = {
  slot: string;
  className?: string;
  label?: string;
};

const ADSENSE_CLIENT = typeof import.meta.env.VITE_ADSENSE_CLIENT === 'string'
  ? import.meta.env.VITE_ADSENSE_CLIENT.trim()
  : '';

export function AdBanner({ slot, className, label = 'Advertisement' }: AdBannerProps) {
  useEffect(() => {
    if (!ADSENSE_CLIENT) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Ignore AdSense runtime hiccups during local development.
    }
  }, [slot]);

  if (!ADSENSE_CLIENT) {
    return (
      <div className={cn('rounded-2xl border border-dashed border-[#2a2a2a] bg-[#0d0d0d] p-4 text-center', className)}>
        <p className="text-[10px] uppercase tracking-[0.24em] text-[#666]">{label}</p>
        <p className="mt-2 text-sm text-[#888]">AdSense slot ready. Set `VITE_ADSENSE_CLIENT` to enable live ads.</p>
      </div>
    );
  }

  return (
    <div className={cn('rounded-2xl border border-[#1f1f1f] bg-[#0d0d0d] p-3', className)}>
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="text-[10px] uppercase tracking-[0.24em] text-[#666]">{label}</p>
        <p className="text-[10px] uppercase tracking-[0.24em] text-[#333]">Sponsored</p>
      </div>
      <ins
        className="adsbygoogle block min-h-[90px] w-full"
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
