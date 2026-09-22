/** The next moment (strictly after `from`) whose local clock reads `hhmm` ("HH:MM"). */
export function nextOccurrence(hhmm: string, from: Date = new Date()): Date {
  const [hours, minutes] = hhmm.split(':').map(Number);
  const next = new Date(from);
  next.setHours(Number.isFinite(hours) ? hours : 0, Number.isFinite(minutes) ? minutes : 0, 0, 0);
  if (next.getTime() <= from.getTime()) next.setDate(next.getDate() + 1);
  return next;
}

/** "HH:MM" in local time for an ISO datetime — used to roll a daily reminder forward. */
export function localHHMM(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatClock(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h || 0, m || 0, 0, 0);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
