import { format, formatDistanceToNow, parseISO } from "date-fns";

function toDate(value: string | Date): Date {
  return typeof value === "string" ? parseISO(value) : value;
}

/** "Jul 1, 2026, 8:00 AM" */
export function formatDateTime(value: string | Date): string {
  return format(toDate(value), "MMM d, yyyy, h:mm a");
}

/** "Jul 1, 2026" */
export function formatDate(value: string | Date): string {
  return format(toDate(value), "MMM d, yyyy");
}

/** "8:00 AM" */
export function formatTime(value: string | Date): string {
  return format(toDate(value), "h:mm a");
}

/** "in 3 days" / "2 hours ago" */
export function formatRelative(value: string | Date): string {
  return formatDistanceToNow(toDate(value), { addSuffix: true });
}

/** Value formatted for a <input type="datetime-local"> field. */
export function toDateTimeLocalValue(value: string | Date): string {
  return format(toDate(value), "yyyy-MM-dd'T'HH:mm");
}

/** Whole hours between two timestamps (>= 0). */
export function hoursBetween(start: string | Date, end: string | Date): number {
  const ms = toDate(end).getTime() - toDate(start).getTime();
  return Math.max(0, Math.round(ms / 36e5));
}
