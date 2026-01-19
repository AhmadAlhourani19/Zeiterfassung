import type { StempeluhrEntry } from "../api/types";

export type Interval = {
  start: Date;
  end: Date;
  project: string;
};

export function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

export function buildIntervalsForDay(entries: StempeluhrEntry[], now = new Date()): Interval[] {
  // sort ascending by time
  const sorted = [...entries].sort((a, b) => +new Date(a.Zeit) - +new Date(b.Zeit));

  const intervals: Interval[] = [];
  let open: { start: Date; project: string } | null = null;

  for (const e of sorted) {
    const t = new Date(e.Zeit);

    if (e.Buchungstyp === "0") {
      // Anmeldung:
      // if already open => treat as project switch: close previous at this time
      if (open) {
        if (+t > +open.start) {
          intervals.push({ start: open.start, end: t, project: open.project });
        }
      }
      open = { start: t, project: e.Projekt ?? "" };
    } else {
      // Abmeldung:
      if (open) {
        if (+t > +open.start) {
          intervals.push({ start: open.start, end: t, project: open.project });
        }
        open = null;
      } else {
        // Abmeldung without open start -> ignore
      }
    }
  }

  // if still open, close at "now" (but only if it's the same day)
  if (open && isSameDay(open.start, now)) {
    const end = now;
    if (+end > +open.start) {
      intervals.push({ start: open.start, end, project: open.project });
    }
  }

  return intervals;
}

export function minutesBetween(a: Date, b: Date) {
  return Math.max(0, Math.round((+b - +a) / 60000));
}

export function calcWorkAndBreak(intervals: Interval[]) {
  const workMinutes = intervals.reduce((sum, it) => sum + minutesBetween(it.start, it.end), 0);

  // Break taken = gaps between consecutive intervals
  const sorted = [...intervals].sort((a, b) => +a.start - +b.start);
  let breakMinutes = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    const gap = minutesBetween(sorted[i].end, sorted[i + 1].start);
    if (gap > 0) breakMinutes += gap;
  }

  // German minimum breaks (ArbZG §4):
  // >6h to 9h => 30min, >9h => 45min
  // (strictly: "mehr als 6" and "mehr als 9")
  let requiredBreak = 0;
  if (workMinutes > 9 * 60) requiredBreak = 45;
  else if (workMinutes > 6 * 60) requiredBreak = 30;

  const missingBreak = Math.max(0, requiredBreak - breakMinutes);
  const netMinutes = Math.max(0, workMinutes - missingBreak);

  return { workMinutes, breakMinutes, requiredBreak, missingBreak, netMinutes };
}

export function fmtHM(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}
