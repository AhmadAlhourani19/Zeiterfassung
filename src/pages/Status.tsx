import { useMemo, useState } from "react";
import type { StatusEntry } from "../api/types";
import { getDisplayUserFromKey } from "../api/grouping";

type Props = {
  entries: StatusEntry[];
  loading: boolean;
  error?: string | null;
  onReload: () => Promise<void> | void;
};

function formatTime(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

function extractText(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      const text = extractText(item);
      if (text) return text;
    }
    return null;
  }
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const direct =
      extractText(obj.text) ||
      extractText(obj.value) ||
      extractText(obj.values) ||
      extractText(obj["#text"]);
    return direct ?? null;
  }
  return null;
}

function findValueByKey(entry: StatusEntry, matcher: (key: string) => boolean) {
  for (const [key, value] of Object.entries(entry)) {
    if (matcher(key)) {
      const text = extractText(value);
      if (text) return text;
    }
  }
  return null;
}

function findValueInEntryData(entry: StatusEntry, matcher: (key: string) => boolean) {
  if (!Array.isArray(entry.entrydata)) return null;
  for (const item of entry.entrydata) {
    const name = item["@name"] ?? item.name ?? "";
    if (!name) continue;
    if (matcher(name)) {
      const text = extractText(item.text ?? item.value ?? item.values);
      if (text) return text;
    }
  }
  return null;
}

function getName(entry: StatusEntry) {
  const direct =
    entry.commonName ?? entry.CommonName ?? entry.Name ?? (entry.Key ? getDisplayUserFromKey(entry.Key) : null);
  return direct?.trim() || "Unbekannt";
}

function getStandort(entry: StatusEntry) {
  return entry.Standort?.trim() || "Unbekannt";
}

function getProject(entry: StatusEntry) {
  const direct =
    entry.Projekt?.trim() ||
    entry.Projektname?.trim() ||
    entry.ProjektName?.trim() ||
    entry.Projektbezeichnung?.trim() ||
    entry.Project?.trim() ||
    null;
  if (direct) return direct;

  const fromKeys = findValueByKey(entry, (key) => key.toLowerCase().includes("projekt"));
  if (fromKeys) return fromKeys;

  const fromEntryData = findValueInEntryData(entry, (key) => key.toLowerCase().includes("projekt"));
  if (fromEntryData) return fromEntryData;

  return null;
}

function getStatus(entry: StatusEntry) {
  const bt = (entry.Buchungstyp ?? "").trim();
  if (bt === "0") return { label: "Online", tone: "emerald" };
  if (bt === "" || bt === "1") return { label: "Offline", tone: "slate" };
  if (entry.Status) return { label: entry.Status, tone: "amber" };
  return { label: "Unbekannt", tone: "amber" };
}

export function Status({ entries, loading, error, onReload }: Props) {
  const [standortFilter, setStandortFilter] = useState("Alle");

  const standorte = useMemo(() => {
    const set = new Set<string>();
    for (const entry of entries) {
      const value = entry.Standort?.trim();
      if (value) set.add(value);
    }
    return ["Alle", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [entries]);

  const sorted = useMemo(() => {
    const mapped = entries.map((entry) => {
      const status = getStatus(entry);
      const name = getName(entry);
      const standort = getStandort(entry);
      const project = getProject(entry);
      const time = formatTime(entry.Zeit);
      const rank = status.label.toLowerCase().includes("online") ? 0 : 1;
      return { entry, status, name, standort, project, time, rank };
    });

    return mapped.sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      if (a.standort !== b.standort) return a.standort.localeCompare(b.standort);
      return a.name.localeCompare(b.name);
    });
  }, [entries]);

  const filtered = useMemo(() => {
    if (standortFilter === "Alle") return sorted;
    return sorted.filter((item) => item.standort === standortFilter);
  }, [sorted, standortFilter]);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Aktueller Mitarbeiter Status</h2>
        </div>
        <button
          onClick={() => void onReload()}
          disabled={loading}
          className="w-full sm:w-auto rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Aktualisieren
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      <div className="mt-4">
        <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap">
          {standorte.map((item) => (
            <button
              key={item}
              onClick={() => setStandortFilter(item)}
              className={[
                "shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition",
                standortFilter === item
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200",
              ].join(" ")}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="mt-4">
          <div className="hidden sm:grid sm:grid-cols-[140px_1fr_140px] rounded-t-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500">
            <div>Standort</div>
            <div>Name</div>
            <div className="text-right">Status</div>
          </div>

          <div className="space-y-2 sm:space-y-0 sm:divide-y sm:divide-slate-100 sm:border sm:border-slate-200 sm:border-t-0 sm:rounded-b-2xl sm:overflow-hidden">
            {loading && (
              <div className="px-4 py-3 text-sm text-slate-500">Lade Status...</div>
            )}

            {!loading && filtered.length === 0 ? (
              <div className="px-4 py-6 text-sm text-slate-500">Keine Statusdaten vorhanden.</div>
            ) : (
              filtered.map(({ entry, status, name, standort, time }) => {
                const badgeClass = [
                  "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1",
                  status.tone === "emerald"
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                    : status.tone === "slate"
                    ? "bg-slate-100 text-slate-700 ring-slate-200"
                    : "bg-amber-50 text-amber-700 ring-amber-200",
                ].join(" ");

                return (
                  <div
                    key={entry["@unid"] ?? `${name}-${standort}-${time ?? ""}`}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:rounded-none sm:border-0 sm:bg-transparent sm:px-4 sm:py-3 sm:shadow-none"
                  >
                    <div className="flex items-start justify-between sm:hidden">
                      <div>
                        <div className="text-xs text-slate-500">{standort}</div>
                        <div className="text-sm font-medium text-slate-900">{name}</div>
                        {time && <div className="text-xs text-slate-400">{time}</div>}
                      </div>
                      <span className={badgeClass}>{status.label}</span>
                    </div>

                    <div className="hidden sm:grid sm:grid-cols-[140px_1fr_140px] sm:items-center">
                      <div>
                        <span className="inline-flex items-center rounded-full bg-slate-900/10 px-3 py-1 text-xs font-semibold text-slate-700">
                          {standort}
                        </span>
                      </div>
                      <div className="text-sm font-medium text-slate-900">
                        {name}
                        {time && <span className="ml-2 text-xs text-slate-400">• {time}</span>}
                      </div>
                      <div className="text-right">
                        <span className={badgeClass}>{status.label}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
