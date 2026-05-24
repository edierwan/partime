'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PUBLIC_LOCALES, PublicLocale, normalizeLocale } from '@/lib/public-i18n';

export function PublicLanguageSelector({ locale }: { locale: PublicLocale }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState<PublicLocale>(locale);

  useEffect(() => {
    const stored = normalizeLocale(window.localStorage.getItem('partime_public_lang'));
    if (!searchParams.get('lang') && stored !== locale) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('lang', stored);
      router.replace(`?${params.toString()}`);
      setValue(stored);
    }
  }, [locale, router, searchParams]);

  function onChange(next: PublicLocale) {
    setValue(next);
    window.localStorage.setItem('partime_public_lang', next);
    document.cookie = `partime_public_lang=${next}; path=/; max-age=31536000; samesite=lax`;
    const params = new URLSearchParams(searchParams.toString());
    params.set('lang', next);
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="inline-flex rounded-2xl border border-white/80 bg-white/80 p-1 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.4)] backdrop-blur-sm">
      {PUBLIC_LOCALES.map((item) => (
        <button
          key={item.code}
          type="button"
          onClick={() => onChange(item.code)}
          aria-pressed={value === item.code}
          className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${value === item.code ? 'bg-brand-50 text-brand-700 shadow-sm' : 'text-ink-500 hover:bg-ink-50 hover:text-ink-700'}`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}