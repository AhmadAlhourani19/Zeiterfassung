import type { StempeluhrEntry } from "./types";

export function groupMonth(entries: StempeluhrEntry[]) {
  const grouped: Record<string, Record<string, StempeluhrEntry[]>> = {};

  for (const e of entries) {
    const userKey = e.Key ?? "unknown";
    const date = new Date(e.Zeit);

    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    const dayKey = `${dd}.${mm}.${yyyy}`;

    if (!grouped[userKey]) grouped[userKey] = {};
    if (!grouped[userKey][dayKey]) grouped[userKey][dayKey] = [];
    grouped[userKey][dayKey].push(e);
  }

  for (const user of Object.keys(grouped)) {
    for (const day of Object.keys(grouped[user])) {
      grouped[user][day].sort((a, b) => +new Date(b.Zeit) - +new Date(a.Zeit));
    }
  }

  return grouped;
}

export function formatDDMMYYYY(d: Date) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

export function formatMMYYYY(d: Date) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}.${yyyy}`;
}

export function getDisplayUserFromKey(key: string) {
  const cn = key.match(/CN=([^/]+)/)?.[1];
  return cn ?? key;
}

export function bookingLabel(bt: "0" | "1") {
  return bt === "0" ? "Anmeldung" : "Abmeldung";
}

export function bookingBadgeClasses(bt: "0" | "1") {
  return bt === "0"
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : "bg-rose-50 text-rose-700 ring-rose-200";
}