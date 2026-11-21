// ISO date helpers. All dates are 'YYYY-MM-DD' strings; arithmetic is done in UTC
// so that daylight-saving shifts never change the day count.
import type { ISODate } from './types';

const MS_PER_DAY = 86400000;

function pad(n: number, width = 2): string {
  return String(n).padStart(width, '0');
}

export function parseISO(iso: ISODate): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d };
}

function toUTCms(iso: ISODate): number {
  const { y, m, d } = parseISO(iso);
  return Date.UTC(y, m - 1, d);
}

function fromUTCms(ms: number): ISODate {
  const dt = new Date(ms);
  return `${pad(dt.getUTCFullYear(), 4)}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

/** Adds a whole number of days to an ISO date. */
export function addDays(iso: ISODate, days: number): ISODate {
  return fromUTCms(toUTCms(iso) + Math.round(days) * MS_PER_DAY);
}

/** Days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: ISODate, to: ISODate): number {
  return Math.round((toUTCms(to) - toUTCms(from)) / MS_PER_DAY);
}

/** Today's date in the local timezone, as YYYY-MM-DD. */
export function todayISO(now: Date = new Date()): ISODate {
  return `${pad(now.getFullYear(), 4)}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** 'YYYY-MM' for an ISO date. */
export function monthOf(iso: ISODate): string {
  const { y, m } = parseISO(iso);
  return `${pad(y, 4)}-${pad(m)}`;
}

/** Number of days in a month; `month` is 1-12. */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Due date for a given month. `month` is 1-12. A dueDay past the end of the
 * month (e.g. 30 in February) is clamped to the last day of that month.
 */
export function dueDateForMonth(year: number, month: number, dueDay: number): ISODate {
  const last = daysInMonth(year, month);
  const day = Math.min(Math.max(1, Math.round(dueDay)), last);
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}
