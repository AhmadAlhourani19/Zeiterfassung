import type { StempeluhrEntry } from "./types";

const BASE = "https://domino.hoecker-pm.com/dev/pmzeiterfassung.nsf/rest.xsp";

async function http<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });

  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Expected JSON but got ${ct || "unknown"}. (Maybe login/redirect)\n` +
        text.slice(0, 160)
    );
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} - ${text}`);
  }

  return (await res.json()) as T;
}

export function getMonth(keyMMYYYY: string) {
  return http<StempeluhrEntry[]>(
    `${BASE}/StempeluhrMonat?key=${encodeURIComponent(keyMMYYYY)}`
  );
}

export function getDay(keyDDMMYYYY: string) {
  return http<StempeluhrEntry[]>(
    `${BASE}/StempeluhrTag?key=${encodeURIComponent(keyDDMMYYYY)}`
  );
}

export function createPunch(payload: { Buchungstyp: "0" | "1"; Projekt: string }) {
  return http<any>(`${BASE}/Dokument?form=Stempeluhr`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
