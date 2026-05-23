'use client';

import { useState } from 'react';
import { MalaysiaCitySelect, MalaysiaStateSelect } from '@/components/location/MalaysiaAddressFields';

export function JobsLocationFilters({
  initialStateCode,
  initialStateName,
  initialCityName,
}: {
  initialStateCode?: string;
  initialStateName?: string;
  initialCityName?: string;
}) {
  const [stateCode, setStateCode] = useState(initialStateCode || '');
  const [stateName, setStateName] = useState(initialStateName || '');
  const [cityName, setCityName] = useState(initialCityName || '');

  return (
    <>
      <MalaysiaStateSelect
        value={stateCode}
        label="State"
        placeholder="All states"
        onChange={(nextCode, option) => {
          setStateCode(nextCode);
          setStateName(option?.name || '');
          setCityName('');
        }}
      />
      <MalaysiaCitySelect
        stateCode={stateCode}
        value={cityName}
        label="City"
        placeholder="Any city"
        onChange={(nextCityName) => setCityName(nextCityName)}
        customHint="You can type a city that is not in the list yet."
      />
      <input type="hidden" name="stateCode" value={stateCode} />
      <input type="hidden" name="state" value={stateName} />
      <input type="hidden" name="city" value={cityName} />
    </>
  );
}