interface ObservedTemperatureRange {
  high_c: number;
  low_c: number;
}

const getKenyaDate = (timestamp: number): string => {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const getStorageKey = (countyName: string): string => `observed-temperature-ranges:${countyName}`;

export const recordObservedTemperature = (
  countyName: string,
  temperatureC: number,
  timestampSeconds: number
): void => {
  if (!Number.isFinite(temperatureC) || !Number.isFinite(timestampSeconds)) return;
  try {
    const storageKey = getStorageKey(countyName);
    const stored = JSON.parse(localStorage.getItem(storageKey) || '{}') as Record<string, ObservedTemperatureRange>;
    const date = getKenyaDate(timestampSeconds * 1000);
    const previous = stored[date];
    stored[date] = previous
      ? { high_c: Math.max(previous.high_c, temperatureC), low_c: Math.min(previous.low_c, temperatureC) }
      : { high_c: temperatureC, low_c: temperatureC };

    const retainedDates = Object.keys(stored).sort().slice(-14);
    const retained = Object.fromEntries(retainedDates.map((key) => [key, stored[key]]));
    localStorage.setItem(storageKey, JSON.stringify(retained));
  } catch (_error) {
    // Weather reporting can continue if browser storage is unavailable.
  }
};

export const getObservedTemperatureRange = (countyName: string, date: string): ObservedTemperatureRange | null => {
  try {
    const stored = JSON.parse(localStorage.getItem(getStorageKey(countyName)) || '{}') as Record<string, ObservedTemperatureRange>;
    const range = stored[date];
    return range && Number.isFinite(range.high_c) && Number.isFinite(range.low_c) ? range : null;
  } catch (_error) {
    return null;
  }
};
