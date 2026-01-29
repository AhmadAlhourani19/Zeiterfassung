import type { ProjectEntry, StatusEntry, StempeluhrEntry, UserStatusLookup } from "./types";

const BASE = "https://domino.hoecker-pm.com/dev/pmzeiterfassung.nsf/rest.xsp";

function extractCharset(contentType: string) {
  const match = contentType.match(/charset=([^;]+)/i);
  if (!match) return null;
  return match[1].replace(/["']/g, "").trim().toLowerCase();
}

function normalizeCharset(charset: string | null) {
  if (!charset) return null;
  if (charset === "utf8") return "utf-8";
  if (charset === "latin1" || charset === "iso-8859-1" || charset === "cp1252") {
    return "windows-1252";
  }
  return charset;
}

function decodeBody(buffer: ArrayBuffer, charset: string | null) {
  const normalized = normalizeCharset(charset);
  if (normalized) {
    try {
      return new TextDecoder(normalized).decode(buffer);
    } catch {
      // fall back to UTF-8 below
    }
  }

  const utf8Text = new TextDecoder("utf-8").decode(buffer);
  if (!charset && utf8Text.includes("\uFFFD")) {
    try {
      return new TextDecoder("windows-1252").decode(buffer);
    } catch {
      return utf8Text;
    }
  }

  return utf8Text;
}

async function readText(res: Response) {
  const contentType = res.headers.get("content-type") ?? "";
  const charset = extractCharset(contentType);
  const buffer = await res.arrayBuffer();
  return decodeBody(buffer, charset);
}

async function http<T>(url: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers ?? {});
  headers.set("Accept", "application/json");
  if (options?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json; charset=utf-8");
  }

  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers,
  });

  const ct = res.headers.get("content-type") ?? "";
  const text = await readText(res);
  if (!ct.includes("application/json")) {
    throw new Error(
      `Expected JSON but got ${ct || "unknown"}. (Maybe login/redirect)\n` +
        text.slice(0, 160)
    );
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} - ${text}`);
  }

  try {
    return JSON.parse(text) as T;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown JSON parse error";
    throw new Error(`Failed to parse JSON response: ${message}`);
  }
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function formatDeletionTimestamp(date = new Date()) {
  const dd = pad2(date.getDate());
  const mm = pad2(date.getMonth() + 1);
  const yyyy = date.getFullYear();
  const hh = pad2(date.getHours());
  const min = pad2(date.getMinutes());
  return `${dd}.${mm}.${yyyy} ${hh}:${min}`;
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

export function createPunch(payload: { Buchungstyp: "0" | "1" | "2"; Projekt: string }) {
  return http<unknown>(`${BASE}/Dokument?form=Stempeluhr`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getProjects() {
  return http<ProjectEntry[]>(`${BASE}/Projekte`);
}

export function createProject(payload: { Projektname: string }) {
  return http<unknown>(`${BASE}/Dokument?form=Projekt`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteProject(unid: string, deletedAt = formatDeletionTimestamp()) {
  return http<unknown>(`${BASE}/Dokument/${encodeURIComponent(unid)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-HTTP-Method-Override": "PATCH",
    },
    body: JSON.stringify({ Dokumentgeloescht: deletedAt }),
  });
}

export function updatePunchStatus(
  unid: string,
  payload: {
    Buchungstyp: "0" | "1" | "2";
    Zeit: string;
    Projekt?: string;
    Projektname?: string;
  }
) {
  return http<unknown>(`${BASE}/Dokument/${encodeURIComponent(unid)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-HTTP-Method-Override": "PATCH",
    },
    body: JSON.stringify(payload),
  });
}

export function getUserStatusLookup() {
  return http<UserStatusLookup>(`${BASE}/UserName`);
}

export function getCurrentStatus() {
  return http<StatusEntry[]>(`${BASE}/StatusAnzeige`);
}
