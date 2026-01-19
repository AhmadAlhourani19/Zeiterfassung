import type { StempeluhrEntry } from "../api/types";

export type Interval = {
  start: Date;
  end: Date;
  project: string;
};

function minutesBetween(a: Date, b: Date) {
  return Math.max(0, Math.round((+b - +a) / 60000));
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

/**
 * Intervals:
 * - Anmeldung starts interval
 * - Abmeldung ends interval
 * - Another Anmeldung while open => closes previous interval (project switch) and starts new one
 * - Open interval closes at "now"
 */
export function buildIntervalsForDay(entries: StempeluhrEntry[], now = new Date()): Interval[] {
  const sorted = [...entries].sort((a, b) => +new Date(a.Zeit) - +new Date(b.Zeit));
  const intervals: Interval[] = [];

  let open: { start: Date; project: string } | null = null;

  for (const e of sorted) {
    const t = new Date(e.Zeit);

    if (e.Buchungstyp === "0") {
      // Anmeldung (also used for project switch)
      if (open) {
        if (+t > +open.start) {
          intervals.push({ start: open.start, end: t, project: open.project });
        }
      }
      open = { start: t, project: e.Projekt ?? "" };
    } else {
      // Abmeldung
      if (open) {
        if (+t > +open.start) {
          intervals.push({ start: open.start, end: t, project: open.project });
        }
        open = null;
      }
    }
  }

  if (open && isSameDay(open.start, now)) {
    if (+now > +open.start) {
      intervals.push({ start: open.start, end: now, project: open.project });
    }
  }

  return intervals;
}

export function calcWorkAndBreak(intervals: Interval[]) {
  const workMinutes = intervals.reduce((sum, it) => sum + minutesBetween(it.start, it.end), 0);

  // break taken = gaps between intervals
  const sorted = [...intervals].sort((a, b) => +a.start - +b.start);
  let breakMinutes = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    breakMinutes += minutesBetween(sorted[i].end, sorted[i + 1].start);
  }

  // ArbZG §4: >6h -> 30min, >9h -> 45min
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
