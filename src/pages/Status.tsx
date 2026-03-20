import { useMemo, useState } from "react";
import type { StatusEntry } from "../api/types";
import { getDisplayUserFromKey } from "../api/grouping";
import "./styles/Status.css";

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

function getTaetigkeit(entry: StatusEntry) {
  const direct =
    entry.Taetigkeit?.trim() ||
    entry["T\u00e4tigkeit"]?.trim() ||
    null;
  if (direct) return direct;

  const fromKeys = findValueByKey(entry, (key) => key.toLowerCase().includes("taetig") || key.toLowerCase().includes("t�tig"));
  if (fromKeys) return fromKeys;

  const fromEntryData = findValueInEntryData(entry, (key) => key.toLowerCase().includes("taetig") || key.toLowerCase().includes("t�tig"));
  if (fromEntryData) return fromEntryData;

  return null;
}
function getStatus(entry: StatusEntry) {
  const bt = (entry.Buchungstyp ?? "").trim();
  if (bt === "0") return { label: "Online", tone: "online" as const };
  if (bt === "2") return { label: "Pause", tone: "break" as const };
  if (bt === "10") return { label: "Außer Haus", tone: "outside" as const };
  if (bt === "" || bt === "1") return { label: "Offline", tone: "offline" as const };
  if (entry.Status) return { label: entry.Status, tone: "break" as const };
  return { label: "Unbekannt", tone: "break" as const };
}

export function Status({ entries, loading, error, onReload }: Props) {
  const [standortFilter, setStandortFilter] = useState("Alle");
  const [sortBy, setSortBy] = useState<"name" | "status">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const showStandort = standortFilter === "Alle";
  const gridClass = [
    "status-page__grid",
    showStandort ? "status-page__grid--with-location" : "status-page__grid--without-location",
  ].join(" ");

  const standorte = useMemo(() => {
    const set = new Set<string>();
    for (const entry of entries) {
      const value = entry.Standort?.trim();
      if (value) set.add(value);
    }
    return ["Alle", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [entries]);

  function getStatusRank(status: ReturnType<typeof getStatus>) {
    if (status.tone === "online") return 0;
    if (status.tone === "break") return 1;
    if (status.tone === "outside") return 2;
    if (status.tone === "offline") return 3;
    return 4;
  }

  const sorted = useMemo(() => {
    const mapped = entries.map((entry) => {
      const status = getStatus(entry);
      const name = getName(entry);
      const standort = getStandort(entry);
      const project = getProject(entry);
      const time = formatTime(entry.Zeit);
      const taetigkeit = getTaetigkeit(entry);
      const rank = getStatusRank(status);

      return { entry, status, name, standort, project, taetigkeit, time, rank };
    });

    return mapped.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;

      if (sortBy === "status") {
        if (a.rank !== b.rank) return (a.rank - b.rank) * dir;
        return a.name.localeCompare(b.name) * dir;
      }

      if (a.name !== b.name) return a.name.localeCompare(b.name) * dir;
      if (a.rank !== b.rank) return (a.rank - b.rank) * dir;
      return a.standort.localeCompare(b.standort) * dir;
    });
  }, [entries, sortBy, sortDir]);

  const filtered = useMemo(() => {
    if (standortFilter === "Alle") return sorted;
    return sorted.filter((item) => item.standort === standortFilter);
  }, [sorted, standortFilter]);

  return (
    <div className="status-page">
      <div className="status-page__header">
        <h2 className="status-page__title">Anwesenheitsstatus</h2>
        <button
          type="button"
          onClick={() => void onReload()}
          disabled={loading}
          aria-label="Aktualisieren"
          className="status-page__refresh"
        >
          <svg viewBox="0 0 24 24" className="status-page__refresh-icon" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 0 1 15.2-6.4" />
            <path d="M21 12a9 9 0 0 1-15.2 6.4" />
            <path d="M3 4v5h5" />
            <path d="M21 20v-5h-5" />
          </svg>
        </button>
      </div>

      {error && <div className="status-page__error">{error}</div>}

      <div className="status-page__content">
        <div className="status-page__filters">
          {standorte.map((item) => (
            <button
              key={item}
              onClick={() => setStandortFilter(item)}
              className={[
                "status-page__filter-chip",
                standortFilter === item ? "status-page__filter-chip--active" : "status-page__filter-chip--inactive",
              ].join(" ")}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="status-page__table-wrap">
          <div className="status-page__table">
            <div className={["status-page__table-head", gridClass].join(" ")}>
              {showStandort && <div className="status-page__location-head">Standort</div>}

              <button
                type="button"
                onClick={() => {
                  if (sortBy === "name") {
                    setSortDir(sortDir === "asc" ? "desc" : "asc");
                  } else {
                    setSortBy("name");
                    setSortDir("asc");
                  }
                }}
                className="status-page__sort-btn status-page__sort-btn--left"
              >
                Name
                <span className="status-page__sort-indicator">{sortBy === "name" ? (sortDir === "asc" ? "^" : "v") : ""}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (sortBy === "status") {
                    setSortDir(sortDir === "asc" ? "desc" : "asc");
                  } else {
                    setSortBy("status");
                    setSortDir("asc");
                  }
                }}
                className="status-page__sort-btn status-page__sort-btn--right"
              >
                Status
                <span className="status-page__sort-indicator">{sortBy === "status" ? (sortDir === "asc" ? "^" : "v") : ""}</span>
              </button>
            </div>

            <div className="status-page__body">
              {loading && <div className="status-page__loading">Lade Status...</div>}

              {!loading && filtered.length === 0 ? (
                <div className="status-page__empty">Keine Statusdaten vorhanden.</div>
              ) : (
                filtered.map(({ entry, status, name, standort, project, taetigkeit, time }) => {
                  const badgeClass = [
                    "status-page__badge",
                    status.tone === "online"
                      ? "status-page__badge--online"
                      : status.tone === "offline"
                        ? "status-page__badge--offline"
                        : status.tone === "outside"
                          ? "status-page__badge--outside"
                          : "status-page__badge--break",
                  ].join(" ");

                  return (
                    <div key={entry["@unid"] ?? `${name}-${standort}-${time ?? ""}`} className={["status-page__row", gridClass].join(" ")}>
                      {showStandort && (
                        <div className="status-page__location-cell">
                          <span className="status-page__location-pill">{standort}</span>
                        </div>
                      )}

                      <div className="status-page__name-cell">
                        {showStandort && (
                          <div className="status-page__location-mobile">
                            <span className="status-page__location-pill status-page__location-pill--mobile">{standort}</span>
                          </div>
                        )}
                        {name}
                        {project && <div className="status-page__project">{project}</div>}
                        {taetigkeit && <div className="status-page__project">Tätigkeit: {taetigkeit}</div>}
                        {time && <span className="status-page__time">� {time}</span>}
                      </div>

                      <div className="status-page__status-cell">
                        <span className={badgeClass}>{status.label}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



