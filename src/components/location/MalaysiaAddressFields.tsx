'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';

export interface MalaysiaStateOption {
  code: string;
  name: string;
}

export interface MalaysiaCityOption {
  id: string;
  name: string;
}

export interface MalaysiaPostcodeSuggestion {
  postcode: string;
  stateCode: string;
  stateName: string;
  cityId: string | null;
  cityName: string | null;
  placeName: string | null;
  verified: boolean;
}

interface MalaysiaAddressFieldNames {
  addressLine1?: string;
  addressLine2?: string;
  stateCode?: string;
  stateName?: string;
  cityName?: string;
  postcode?: string;
  country?: string;
  preferredLocation?: string;
}

interface MalaysiaAddressFieldLabels {
  addressLine1?: string;
  addressLine2?: string;
  state?: string;
  city?: string;
  postcode?: string;
  country?: string;
  selectState?: string;
  cityPlaceholder?: string;
  postcodePlaceholder?: string;
  customCityHint?: string;
  postcodeWarning?: string;
}

interface MalaysiaAddressFieldPlaceholders {
  addressLine1?: string;
  addressLine2?: string;
}

export interface MalaysiaAddressValue {
  addressLine1?: string | null;
  addressLine2?: string | null;
  stateCode?: string | null;
  stateName?: string | null;
  cityName?: string | null;
  postcode?: string | null;
  country?: string | null;
}

export function MalaysiaStateSelect({
  value,
  onChange,
  label = 'State',
  placeholder = 'Select state',
  disabled,
  required,
  error,
}: {
  value: string;
  onChange: (stateCode: string, option: MalaysiaStateOption | null) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
}) {
  const [options, setOptions] = useState<MalaysiaStateOption[]>([]);

  useEffect(() => {
    let active = true;
    void fetch('/api/public/locations/states', { cache: 'force-cache' })
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load states');
        return res.json() as Promise<{ states: MalaysiaStateOption[] }>;
      })
      .then((data) => {
        if (active) setOptions(data.states || []);
      })
      .catch(() => {
        if (active) setOptions([]);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div>
      <label className="label">{label}{required ? ' *' : ''}</label>
      <select
        className="input"
        value={value}
        disabled={disabled}
        onChange={(event) => {
          const nextCode = event.target.value;
          const option = options.find((item) => item.code === nextCode) || null;
          onChange(nextCode, option);
        }}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.code} value={option.code}>{option.name}</option>
        ))}
      </select>
      <FieldError error={error} />
    </div>
  );
}

export function MalaysiaCitySelect({
  stateCode,
  value,
  onChange,
  label = 'City',
  placeholder = 'Start typing a city',
  disabled,
  required,
  error,
  allowCustom = true,
  customHint,
}: {
  stateCode: string;
  value: string;
  onChange: (cityName: string, option: MalaysiaCityOption | null) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  allowCustom?: boolean;
  customHint?: string;
}) {
  const [options, setOptions] = useState<MalaysiaCityOption[]>([]);
  const dataListId = useId();

  useEffect(() => {
    if (!stateCode) {
      setOptions([]);
      return;
    }

    let active = true;
    void fetch(`/api/public/locations/cities?stateCode=${encodeURIComponent(stateCode)}`, { cache: 'force-cache' })
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load cities');
        return res.json() as Promise<{ cities: MalaysiaCityOption[] }>;
      })
      .then((data) => {
        if (active) setOptions(data.cities || []);
      })
      .catch(() => {
        if (active) setOptions([]);
      });

    return () => {
      active = false;
    };
  }, [stateCode]);

  const knownOptions = useMemo(() => new Map(options.map((option) => [normalizeLocationName(option.name), option])), [options]);
  const activeOption = knownOptions.get(normalizeLocationName(value)) || null;
  const showCustomHint = allowCustom && stateCode && value.trim() && !activeOption;

  return (
    <div>
      <label className="label">{label}{required ? ' *' : ''}</label>
      <input
        className="input"
        value={value}
        list={dataListId}
        disabled={disabled || !stateCode}
        placeholder={stateCode ? placeholder : 'Select state first'}
        onChange={(event) => {
          const nextValue = event.target.value;
          onChange(nextValue, knownOptions.get(normalizeLocationName(nextValue)) || null);
        }}
      />
      <datalist id={dataListId}>
        {options.map((option) => (
          <option key={option.id} value={option.name} />
        ))}
      </datalist>
      {showCustomHint && customHint ? <p className="mt-1 text-xs text-ink-500">{customHint}</p> : null}
      <FieldError error={error} />
    </div>
  );
}

export function MalaysiaPostcodeCombobox({
  stateCode,
  cityName,
  value,
  onChange,
  onSelectSuggestion,
  onWarningChange,
  label = 'Postcode',
  placeholder = 'e.g. 40100',
  required,
  error,
  warning,
}: {
  stateCode: string;
  cityName: string;
  value: string;
  onChange: (postcode: string) => void;
  onSelectSuggestion?: (suggestion: MalaysiaPostcodeSuggestion) => void;
  onWarningChange?: (warning: string | null) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  warning?: string | null;
}) {
  const [suggestions, setSuggestions] = useState<MalaysiaPostcodeSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const lastAutoResolvedRef = useRef('');
  const digits = normalizePostcode(value);

  useEffect(() => {
    if (digits.length < 2) {
      setSuggestions([]);
      onWarningChange?.(null);
      lastAutoResolvedRef.current = '';
      return;
    }

    let active = true;
    const params = new URLSearchParams({ query: digits, limit: '8' });
    if (stateCode) params.set('stateCode', stateCode);
    if (cityName) params.set('cityName', cityName);

    void fetch(`/api/public/locations/postcodes?${params.toString()}`, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load postcodes');
        return res.json() as Promise<{ postcodes: MalaysiaPostcodeSuggestion[] }>;
      })
      .then((data) => {
        if (!active) return;
        const nextSuggestions = data.postcodes || [];
        setSuggestions(nextSuggestions);
        if (digits.length === 5) {
          const exactMatch = nextSuggestions.find((item) => item.postcode === digits) || null;
          if (exactMatch) {
            onWarningChange?.(null);
            const key = `${exactMatch.postcode}:${exactMatch.stateCode}:${exactMatch.cityName || ''}`;
            if (lastAutoResolvedRef.current !== key) {
              lastAutoResolvedRef.current = key;
              onSelectSuggestion?.(exactMatch);
            }
          } else {
            lastAutoResolvedRef.current = '';
            onWarningChange?.('Postcode is not in the verified Malaysia postcode list yet. It will be saved as entered.');
          }
        } else {
          onWarningChange?.(null);
          lastAutoResolvedRef.current = '';
        }
      })
      .catch(() => {
        if (active) {
          setSuggestions([]);
          onWarningChange?.(null);
        }
      });

    return () => {
      active = false;
    };
  }, [cityName, digits, onSelectSuggestion, onWarningChange, stateCode]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  return (
    <div className="relative" ref={rootRef}>
      <label className="label">{label}{required ? ' *' : ''}</label>
      <input
        className="input"
        value={value}
        inputMode="numeric"
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          onChange(normalizePostcode(event.target.value));
          setOpen(true);
        }}
      />
      {open && suggestions.length > 0 ? (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-xl">
          {suggestions.map((suggestion) => (
            <button
              key={`${suggestion.postcode}:${suggestion.cityId || suggestion.cityName || suggestion.placeName || 'unknown'}`}
              type="button"
              className="flex w-full items-start justify-between gap-3 border-b border-ink-100 px-4 py-3 text-left text-sm last:border-b-0 hover:bg-ink-50"
              onClick={() => {
                onChange(suggestion.postcode);
                onSelectSuggestion?.(suggestion);
                onWarningChange?.(null);
                setOpen(false);
              }}
            >
              <span className="font-semibold text-ink-900">{suggestion.postcode}</span>
              <span className="text-right text-xs text-ink-500">{[suggestion.cityName || suggestion.placeName, suggestion.stateName].filter(Boolean).join(', ')}</span>
            </button>
          ))}
        </div>
      ) : null}
      {warning && !error ? <p className="mt-1 text-xs text-amber-700">{warning}</p> : null}
      <FieldError error={error} />
    </div>
  );
}

export function MalaysiaAddressFields({
  initialValue,
  names,
  labels,
  placeholders,
  errors,
  required,
  showAddressLine1 = true,
  showAddressLine2 = true,
  showCountry = true,
  allowCustomCity = true,
  helperText,
  footerError,
}: {
  initialValue?: MalaysiaAddressValue;
  names?: MalaysiaAddressFieldNames;
  labels?: MalaysiaAddressFieldLabels;
  placeholders?: MalaysiaAddressFieldPlaceholders;
  errors?: Record<string, string>;
  required?: Partial<Record<'addressLine1' | 'state' | 'city' | 'postcode', boolean>>;
  showAddressLine1?: boolean;
  showAddressLine2?: boolean;
  showCountry?: boolean;
  allowCustomCity?: boolean;
  helperText?: string;
  footerError?: string;
}) {
  const [stateCode, setStateCode] = useState(String(initialValue?.stateCode || '').trim().toUpperCase());
  const [stateName, setStateName] = useState(String(initialValue?.stateName || '').trim());
  const [cityName, setCityName] = useState(String(initialValue?.cityName || '').trim());
  const [postcode, setPostcode] = useState(normalizePostcode(initialValue?.postcode || ''));
  const [postcodeWarning, setPostcodeWarning] = useState<string | null>(null);
  const country = String(initialValue?.country || 'Malaysia').trim() || 'Malaysia';

  return (
    <div className="space-y-4">
      {showAddressLine1 ? (
        <div>
          <label className="label">{labels?.addressLine1 || 'Address line 1'}{required?.addressLine1 ? ' *' : ''}</label>
          <input className="input" name={names?.addressLine1} defaultValue={initialValue?.addressLine1 || ''} placeholder={placeholders?.addressLine1} />
          <FieldError error={pickError(errors, names?.addressLine1)} />
        </div>
      ) : null}

      {showAddressLine2 ? (
        <div>
          <label className="label">{labels?.addressLine2 || 'Address line 2'}</label>
          <input className="input" name={names?.addressLine2} defaultValue={initialValue?.addressLine2 || ''} placeholder={placeholders?.addressLine2} />
          <FieldError error={pickError(errors, names?.addressLine2)} />
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MalaysiaStateSelect
          value={stateCode}
          label={labels?.state || 'State'}
          placeholder={labels?.selectState || 'Select state'}
          required={required?.state}
          error={pickError(errors, names?.stateCode, names?.stateName, 'stateCode', 'state')}
          onChange={(nextCode, option) => {
            setStateCode(nextCode);
            setStateName(option?.name || '');
            setCityName('');
            setPostcode('');
            setPostcodeWarning(null);
          }}
        />
        <MalaysiaCitySelect
          stateCode={stateCode}
          value={cityName}
          label={labels?.city || 'City'}
          placeholder={labels?.cityPlaceholder || 'Start typing a city'}
          required={required?.city}
          allowCustom={allowCustomCity}
          customHint={labels?.customCityHint}
          error={pickError(errors, names?.cityName, 'city')}
          onChange={(nextCityName) => {
            setCityName(nextCityName);
          }}
        />
        <MalaysiaPostcodeCombobox
          stateCode={stateCode}
          cityName={cityName}
          value={postcode}
          label={labels?.postcode || 'Postcode'}
          placeholder={labels?.postcodePlaceholder || 'e.g. 40100'}
          required={required?.postcode}
          error={pickError(errors, names?.postcode, 'postcode')}
          warning={postcodeWarning || labels?.postcodeWarning || null}
          onWarningChange={setPostcodeWarning}
          onChange={setPostcode}
          onSelectSuggestion={(suggestion) => {
            setPostcode(suggestion.postcode);
            setStateCode(suggestion.stateCode);
            setStateName(suggestion.stateName);
            if (suggestion.cityName) setCityName(suggestion.cityName);
          }}
        />
      </div>

      {showCountry ? (
        <div>
          <label className="label">{labels?.country || 'Country'}</label>
          <input className="input bg-ink-50" value={country} readOnly disabled />
          <FieldError error={pickError(errors, names?.country, 'country')} />
        </div>
      ) : null}

      {helperText ? <p className="text-xs text-ink-500">{helperText}</p> : null}
      {footerError ? <FieldError error={footerError} /> : null}

      {names?.stateCode ? <input type="hidden" name={names.stateCode} value={stateCode} /> : null}
      {names?.stateName ? <input type="hidden" name={names.stateName} value={stateName} /> : null}
      {names?.cityName ? <input type="hidden" name={names.cityName} value={cityName} /> : null}
      {names?.postcode ? <input type="hidden" name={names.postcode} value={postcode} /> : null}
      {names?.country ? <input type="hidden" name={names.country} value={country} /> : null}
      {names?.preferredLocation ? <input type="hidden" name={names.preferredLocation} value={buildLocationLabel(cityName, stateName, postcode)} /> : null}
    </div>
  );
}

function normalizeLocationName(value: string): string {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizePostcode(value: string): string {
  return String(value || '').replace(/\D/g, '').slice(0, 5);
}

function buildLocationLabel(cityName: string, stateName: string, postcode: string): string {
  return [cityName.trim(), stateName.trim(), postcode.trim()].filter(Boolean).join(', ');
}

function pickError(errors: Record<string, string> | undefined, ...keys: Array<string | undefined>): string | undefined {
  if (!errors) return undefined;
  for (const key of keys) {
    if (key && errors[key]) return errors[key];
  }
  return undefined;
}

function FieldError({ error }: { error?: string }) {
  return error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null;
}