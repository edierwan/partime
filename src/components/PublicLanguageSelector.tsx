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
    <div className="inline-flex rounded-xl border border-ink-200 bg-white p-1 shadow-sm">
      {PUBLIC_LOCALES.map((item) => (
        <button
          key={item.code}
          type="button"
          onClick={() => onChange(item.code)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${value === item.code ? 'bg-brand-500 text-white' : 'text-ink-600 hover:bg-ink-50'}`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}