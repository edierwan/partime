// Asia/Kuala_Lumpur is fixed at UTC+8 (no DST). We use this offset everywhere
// to derive "local day" boundaries deterministically.
export const MYT_OFFSET_MIN = 8 * 60;

export const TZ = 'Asia/Kuala_Lumpur';

/** Convert a UTC Date to a Date whose UTC fields read as MYT clock time. */
export function toMyt(d: Date) {
  return new Date(d.getTime() + MYT_OFFSET_MIN * 60_000);
}

/** Inverse of toMyt. */
export function fromMyt(d: Date) {
  return new Date(d.getTime() - MYT_OFFSET_MIN * 60_000);
}

/** Midnight in MYT of the day containing `d`, expressed as a UTC Date. */
export function mytStartOfDay(d: Date) {
  const m = toMyt(d);
  const start = Date.UTC(m.getUTCFullYear(), m.getUTCMonth(), m.getUTCDate(), 0, 0, 0);
  return fromMyt(new Date(start));
}

export function mytEndOfDay(d: Date) {
  return new Date(mytStartOfDay(d).getTime() + 24 * 60 * 60_000 - 1);
}

/** Monday 00:00 MYT for week containing d. */
export function mytStartOfWeek(d: Date) {
  const sd = mytStartOfDay(d);
  const m = toMyt(sd);
  const dow = m.getUTCDay(); // 0=Sun ... 6=Sat
  const diff = (dow + 6) % 7; // 0=Mon
  return new Date(sd.getTime() - diff * 24 * 60 * 60_000);
}

export function mytEndOfWeek(d: Date) {
  return new Date(mytStartOfWeek(d).getTime() + 7 * 24 * 60 * 60_000 - 1);
}

const fmt = (opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: TZ, ...opts });

export const formatDate    = (d: Date) => fmt({ day: '2-digit', month: 'short', year: 'numeric' }).format(d);
export const formatDateISO = (d: Date) => fmt({ year: 'numeric', month: '2-digit', day: '2-digit' }).format(d).split('/').reverse().join('-');
export const formatTime    = (d: Date) => fmt({ hour: '2-digit', minute: '2-digit', hour12: true }).format(d);
export const formatDayShort= (d: Date) => fmt({ weekday: 'short' }).format(d);
export const formatDateTime= (d: Date) => `${formatDate(d)} ${formatTime(d)}`;

export function parseDateInput(value: string): Date {
  // value = 'YYYY-MM-DD'; treat as MYT midnight
  const [y, m, d] = value.split('-').map(Number);
  return fromMyt(new Date(Date.UTC(y, (m || 1) - 1, d || 1, 0, 0, 0)));
}

export function parseTimeOnDate(dateMyt: Date, time: string): Date {
  // time = 'HH:MM'
  const [h, mi] = time.split(':').map(Number);
  const start = mytStartOfDay(dateMyt);
  return new Date(start.getTime() + ((h || 0) * 60 + (mi || 0)) * 60_000);
}

export function toDateInputValue(d: Date | null | undefined): string {
  if (!d) return '';
  return formatDateISO(d);
}

export function toTimeInputValue(d: Date | null | undefined): string {
  if (!d) return '';
  const m = toMyt(d);
  return `${String(m.getUTCHours()).padStart(2, '0')}:${String(m.getUTCMinutes()).padStart(2, '0')}`;
}
