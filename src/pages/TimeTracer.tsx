import { useEffect, useMemo, useState } from "react";
import type { StempeluhrEntry } from "../api/types";
import { buildIntervalsForDay, calcWorkAndBreak, fmtHM } from "../utils/timeCalc";
import { createPunch, getUserStatusLookup, updatePunchStatus } from "../api/domino";
import "./styles/TimeTracer.css";
import { MdOutlineExpandMore } from "react-icons/md";

function latestEntry(entries: StempeluhrEntry[]) {
  if (!entries.length) return null;
  return [...entries].sort((a, b) => +new Date(b.Zeit) - +new Date(a.Zeit))[0];
}

export function TimeTracer({
  todayKey,
  todayEntries,
  loading,
  onRefresh,
  projectSuggestions,
  onProjectUsed,
}: {
  todayKey: string;
  todayEntries: StempeluhrEntry[];
  loading: boolean;
  onRefresh: () => void;
  projectSuggestions: string[];
  onProjectUsed: (p: string) => void;
}) {
  const latest = useMemo(() => latestEntry(todayEntries), [todayEntries]);
  const statusType = latest?.Buchungstyp ?? null;
  const isCheckedIn = statusType === "0";
  const isOnBreak = statusType === "2";
  const statusLabel = isCheckedIn ? "Eingestempelt" : isOnBreak ? "In der Pause" : "Ausgestempelt";
  const statusBadgeClass = [
    "time-tracer__status-badge",
    isCheckedIn
      ? "time-tracer__status-badge--checked-in"
      : isOnBreak
      ? "time-tracer__status-badge--on-break"
      : "time-tracer__status-badge--checked-out",
  ].join(" ");
  const latestProject = latest?.Projekt?.trim() || "";

  const intervals = useMemo(() => buildIntervalsForDay(todayEntries, new Date()), [todayEntries]);
  const { breakMinutes, netMinutes } = useMemo(() => calcWorkAndBreak(intervals), [intervals]);

  const [projekt, setProjekt] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [statusUnid, setStatusUnid] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    getUserStatusLookup()
      .then((res) => {
        if (!mounted) return;
        setStatusUnid(res.unid ?? null);
      })
      .catch(() => {
        if (!mounted) return;
        setStatusUnid(null);
      });

    return () => {
      mounted = false;
    };
  }, []);

  async function updateStatus(type: "0" | "1" | "2", project: string) {
    const cleanedProject = project.trim() || latest?.Projekt?.trim() || "";
    let unid = statusUnid;
    if (!unid) {
      const lookup = await getUserStatusLookup();
      unid = lookup.unid ?? null;
      setStatusUnid(unid);
    }
    if (!unid) return;

    const payload: {
      Buchungstyp: "0" | "1" | "2";
      Zeit: string;
      Projekt?: string;
      Projektname?: string;
    } = {
      Buchungstyp: type,
      Zeit: new Date().toISOString(),
    };

    if (cleanedProject) {
      payload.Projekt = cleanedProject;
      payload.Projektname = cleanedProject;
    } else {
      payload.Projekt = "";
      payload.Projektname = "";
    }

    await updatePunchStatus(unid, payload);
  }

  async function doPunch(type: "0" | "1" | "2") {
    setBusy(true);
    setErr(null);
    try {
      const trimmed = projekt.trim();
      await createPunch({ Buchungstyp: type, Projekt: trimmed });
      try {
        await updateStatus(type, trimmed);
      } catch (error) {
        console.warn("Status update failed after punch creation", error);
      }
      if (trimmed) onProjectUsed(trimmed);
      setProjekt("");
      onRefresh();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Buchung fehlgeschlagen";
      setErr(message || "Buchung fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="time-tracer">
      <div className="time-tracer__card">
        <div className="time-tracer__layout">
          <div className="time-tracer__summary">
            <div className="time-tracer__date-label">Heute</div>
            <div className="time-tracer__date-value">{todayKey}</div>

            <div className="time-tracer__status-row">
              <span>Status: </span>
              <span className={statusBadgeClass}>{statusLabel}</span>
              {latest && <span className="time-tracer__status-time"> | {new Date(latest.Zeit).toLocaleTimeString()}</span>}
            </div>

            {latestProject && (
              <div className="time-tracer__project-row">
                <span>Projekt: </span>
                <span className="time-tracer__project-pill">{latestProject}</span>
              </div>
            )}

            <div className="time-tracer__stats">
              <Stat title="Arbeitszeit (netto)" value={fmtHM(netMinutes)} />
              <Stat title="Pausen genommen" value={fmtHM(breakMinutes)} />
            </div>
          </div>

          <div className="time-tracer__actions-panel">
            <label className="time-tracer__input-label">Projekt (optional)</label>
            <div className="time-tracer__select-wrap">
              <select
                value={projekt}
                onChange={(e) => setProjekt(e.target.value)}
                className="time-tracer__select"
                disabled={busy || loading || projectSuggestions.length === 0}
              >
                <option value="">Ohne Projekt</option>
                {projectSuggestions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <span className="time-tracer__select-arrow" aria-hidden="true">
                {<MdOutlineExpandMore size={20} />}
              </span>
            </div>
            {projectSuggestions.length === 0 && (
              <div className="time-tracer__select-hint">Keine Projekte verfuegbar.</div>
            )}

            <div className="time-tracer__actions">
              {!isCheckedIn && !isOnBreak ? (
                <button disabled={busy || loading} onClick={() => doPunch("0")} className="time-tracer__action-btn time-tracer__action-btn--green">
                  {busy ? "Speichern..." : "Anmelden"}
                </button>
              ) : isOnBreak ? (
                <>
                  <button disabled={busy || loading} onClick={() => doPunch("0")} className="time-tracer__action-btn time-tracer__action-btn--green">
                    {busy ? "Speichern..." : "Pause beenden"}
                  </button>
                  <button disabled={busy || loading} onClick={() => doPunch("1")} className="time-tracer__action-btn time-tracer__action-btn--red">
                    {busy ? "Speichern..." : "Abmelden"}
                  </button>
                </>
              ) : (
                <>
                  <button
                    disabled={busy || loading}
                    onClick={() => doPunch("0")}
                    className="time-tracer__action-btn time-tracer__action-btn--indigo"
                    title="Neue Anmeldung = Projektwechsel"
                  >
                    {busy ? "Speichern..." : "Projekt wechseln"}
                  </button>
                  <button disabled={busy || loading} onClick={() => doPunch("2")} className="time-tracer__action-btn time-tracer__action-btn--amber">
                    {busy ? "Speichern..." : "Pause"}
                  </button>
                  <button disabled={busy || loading} onClick={() => doPunch("1")} className="time-tracer__action-btn time-tracer__action-btn--red">
                    {busy ? "Speichern..." : "Abmelden"}
                  </button>
                </>
              )}
            </div>

            {err && <div className="time-tracer__error">{err}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({
  title,
  value,
  hint,
  highlight,
}: {
  title: string;
  value: string;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <div className={["time-tracer__stat", highlight ? "time-tracer__stat--highlight" : ""].join(" ").trim()}>
      <div className="time-tracer__stat-title">{title}</div>
      <div className="time-tracer__stat-value">{value}</div>
      {hint && <div className="time-tracer__stat-hint">{hint}</div>}
    </div>
  );
}
