/** Dates locales au format YYYY-MM-DD (sans décalage UTC). */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function startOfWeek(d = new Date()): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = r.getDay() || 7;
  r.setDate(r.getDate() - day + 1);
  return r;
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

const dayFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const shortFmt = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric' });
const relFmt = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });

export const formatDay = (d: Date) => dayFmt.format(d);
export const formatShortDay = (d: Date) => shortFmt.format(d);

export function daysUntil(iso: string): number {
  const target = parseISODate(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function relativeDays(iso: string): string {
  const n = daysUntil(iso);
  return relFmt.format(n, 'day');
}

export function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 86400000;
  if (diff < 1) return "aujourd'hui";
  if (diff < 30) return relFmt.format(-Math.round(diff), 'day');
  if (diff < 365) return relFmt.format(-Math.round(diff / 30), 'month');
  return relFmt.format(-Math.round(diff / 365), 'year');
}
