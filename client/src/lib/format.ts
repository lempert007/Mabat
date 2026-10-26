import { t } from '@/i18n/he';

const LOCALE = 'he-IL';

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(LOCALE).format(value);
}

/** A count of seconds as a clock: 0:07, 2:45, 12:03. */
export function formatClock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

/** A keyframe's moment, to the tenth of a second it is kept to: 0:12, 0:12.4. */
export function formatCue(seconds: number): string {
  const tenths = Math.round(Math.max(0, seconds) * 10);
  const whole = Math.floor(tenths / 10);
  const clock = `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
  return tenths % 10 ? `${clock}.${tenths % 10}` : clock;
}

/** A measurement with as many decimals as it needs to read well, and no more. */
export function formatMeasure(value: number, decimals = 0): string {
  return new Intl.NumberFormat(LOCALE, { maximumFractionDigits: decimals, minimumFractionDigits: decimals }).format(value);
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium' }).format(new Date(iso));
}

/** "לפני 5 דקות" and friends, phrased by the platform so the grammar is right. */
export function formatRelative(iso: string): string {
  const relative = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' });
  const diffMs = new Date(iso).getTime() - Date.now();
  const minutes = Math.round(diffMs / 60000);
  if (Math.abs(minutes) < 1) return t.common.justNow;
  if (Math.abs(minutes) < 60) return relative.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relative.format(hours, 'hour');
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 7) return relative.format(days, 'day');
  return formatDate(iso);
}
