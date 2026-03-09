import { useEffect, useMemo, useState } from "react";
import type { StempeluhrEntry } from "../api/types";
import { buildIntervalsForDay, calcWorkAndBreak, fmtHM } from "../utils/timeCalc";
import { createPunch, getUserStatusLookup, updatePunchStatus } from "../api/domino";
import "./styles/TimeTracer.css";
import { MdOutlineExpandMore } from "react-icons/md";
import { IconClose, IconAnmelden, IconPause, IconAbmelden } from "../components/Icons";

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

  const [nowMs, setNowMs] = useState(() => Date.now());

  // Keep work/break stats live while the user is checked in or currently on break.
  useEffect(() => {
    if (!isCheckedIn && !isOnBreak) return;
    const tick = () => setNowMs(Date.now());
    tick();
    const id = window.setInterval(tick, 15000);
    return () => window.clearInterval(id);
  }, [isCheckedIn, isOnBreak]);

  const intervals = useMemo(() => buildIntervalsForDay(todayEntries, new Date(nowMs)), [todayEntries, nowMs]);
  const baseStats = useMemo(() => calcWorkAndBreak(intervals), [intervals]);

  const breakMinutes = useMemo(() => {
    if (!isOnBreak || !latest?.Zeit) return baseStats.breakMinutes;
    const breakStartMs = +new Date(latest.Zeit);
    if (!Number.isFinite(breakStartMs)) return baseStats.breakMinutes;
    const ongoingBreak = Math.max(0, Math.round((nowMs - breakStartMs) / 60000));
    return baseStats.breakMinutes + ongoingBreak;
  }, [isOnBreak, latest?.Zeit, nowMs, baseStats.breakMinutes]);

  const netMinutes = useMemo(() => {
    const missingBreak = Math.max(0, baseStats.requiredBreak - breakMinutes);
    return Math.max(0, baseStats.workMinutes - missingBreak);
  }, [baseStats.requiredBreak, baseStats.workMinutes, breakMinutes]);

  const [projekt, setProjekt] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [statusUnid, setStatusUnid] = useState<string | null>(null);
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [projectMenuQuery, setProjectMenuQuery] = useState("");

  const filteredProjectSuggestions = useMemo(() => {
    const query = projectMenuQuery.trim().toLowerCase();
    if (!query) return projectSuggestions;
    return projectSuggestions.filter((name) => name.toLowerCase().includes(query));
  }, [projectSuggestions, projectMenuQuery]);

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

  useEffect(() => {
    if (!projectMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProjectMenuOpen(false);
        setProjectMenuQuery("");
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [projectMenuOpen]);

  // Beim Laden das zuletzt aktive Projekt als Auswahl übernehmen
  const [initialProjectSet, setInitialProjectSet] = useState(false);
  useEffect(() => {
    if (!initialProjectSet && latestProject) {
      setProjekt(latestProject);
      setInitialProjectSet(true);
    }
  }, [latestProject, initialProjectSet]);

  function closeProjectMenu() {
    setProjectMenuOpen(false);
    setProjectMenuQuery("");
  }

  function pickProject(name: string) {
    setProjekt(name);
    closeProjectMenu();
  }

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
      /* 
          Projekt in der Liste muss nicht wieder ausgewählt werden, wenn bereits ein Projekt aktiv ist und eine neue Anmeldung oder Pause erfolgt.
      */
      // Projekt nicht reseten
      // setProjekt("");      
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
              <span className={statusBadgeClass}>
                {statusLabel}
                {latest && ` ${new Date(latest.Zeit).toLocaleTimeString()}`}
              </span>
            </div>

            {isCheckedIn && latestProject && (
              <div className="time-tracer__project-row">
                <span>Projekt: </span>
                <span className="time-tracer__project-pill" title={latestProject}>
                  {latestProject}
                </span>
              </div>
            )}

            <div className="time-tracer__stats">
              <Stat title="Arbeitszeit (netto)" value={fmtHM(netMinutes)} />
              <Stat title="Pausen genommen" value={fmtHM(breakMinutes)} />
            </div>
          </div>

          <div className="time-tracer__actions-panel">
            <label className="time-tracer__input-label">Projekt (optional)</label>
            <button
              type="button"
              onClick={() => setProjectMenuOpen(true)}
              className="time-tracer__project-trigger"
              disabled={busy || loading || projectSuggestions.length === 0}
            >
              <span
                className={[
                  "time-tracer__project-trigger-value",
                  !projekt ? "time-tracer__project-trigger-value--muted" : "",
                ]
                  .join(" ")
                  .trim()}
              >
                {projekt || "Ohne Projekt"}
              </span>
              <span className="time-tracer__project-trigger-icon" aria-hidden="true">
                <MdOutlineExpandMore size={20} />
              </span>
            </button>

            {projectSuggestions.length === 0 && (
              <div className="time-tracer__project-hint">Keine Projekte verfügbar.</div>
            )}

            {projectMenuOpen && (
              <div className="time-tracer__project-overlay" onClick={closeProjectMenu}>
                <div
                  className="time-tracer__project-menu"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Projekt auswählen"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="time-tracer__project-menu-header">
                    <div>
                      <div className="time-tracer__project-menu-title">Projekt auswählen</div>
                      <div className="time-tracer__project-menu-subtitle">{projectSuggestions.length} Projekte</div>
                    </div>
                    <button type="button" onClick={closeProjectMenu} className="time-tracer__project-menu-close">
                      {/* Schliessen */}
                      <IconClose className="h-5 w-5 text-slate-600" />
                    </button>
                  </div>

                  <input
                    value={projectMenuQuery}
                    onChange={(event) => setProjectMenuQuery(event.target.value)}
                    placeholder="Suchen"
                    className="time-tracer__project-search"
                    disabled={busy || loading}
                  />

                  <div className="time-tracer__project-list">
                    <button
                      type="button"
                      onClick={() => pickProject("")}
                      className={[
                        "time-tracer__project-item",
                        !projekt ? "time-tracer__project-item--active" : "",
                      ]
                        .join(" ")
                        .trim()}
                    >
                      <span className="time-tracer__project-item-name">Ohne Projekt</span>
                      {!projekt && <span className="time-tracer__project-item-tag">Aktiv</span>}
                    </button>

                    {filteredProjectSuggestions.length === 0 && (
                      <div className="time-tracer__project-empty">Keine Treffer.</div>
                    )}

                    {filteredProjectSuggestions.map((name) => {
                      const isActive = projekt === name;
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => pickProject(name)}
                          className={[
                            "time-tracer__project-item",
                            isActive ? "time-tracer__project-item--active" : "",
                          ]
                            .join(" ")
                            .trim()}
                        >
                          <span className="time-tracer__project-item-name" title={name}>
                            {name}
                          </span>
                          {isActive && <span className="time-tracer__project-item-tag">Aktiv</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <div className="time-tracer__actions">
              {!isCheckedIn && !isOnBreak ? (
                <button
                  disabled={busy || loading}
                  onClick={() => doPunch("0")}
                  className="time-tracer__action-card time-tracer__action-card--green"
                >
                  <span className="time-tracer__action-card-content">
                    <span className="time-tracer__action-card-text">
                      <span className="time-tracer__action-card-title">
                        {busy ? "Speichern..." : "Anmelden"}
                      </span>
                      {!busy && (
                        <span className="time-tracer__action-card-subtitle">
                          Arbeitszeit starten
                        </span>
                      )}
                    </span>

                    <span className="time-tracer__action-card-icon-wrap">
                      <IconAnmelden className="time-tracer__action-card-icon" />
                    </span>
                  </span>
                </button>
            ) : isOnBreak ? (
                <>
                  <button
                  disabled={busy || loading}
                  onClick={() => doPunch("0")}
                  className="time-tracer__action-card time-tracer__action-card--green"
                >
                  <span className="time-tracer__action-card-content">
                    <span className="time-tracer__action-card-text">
                      <span className="time-tracer__action-card-title">
                        {busy ? "Speichern..." : "Anmelden"}
                      </span>
                      {!busy && (
                        <span className="time-tracer__action-card-subtitle">
                          Pause beende
                        </span>
                      )}
                    </span>

                    <span className="time-tracer__action-card-icon-wrap">
                      <IconAnmelden className="time-tracer__action-card-icon" />
                    </span>
                  </span>
                </button>
                  <button
                    disabled={busy || loading}
                    onClick={() => doPunch("1")}
                    className="time-tracer__action-card time-tracer__action-card--red"
                  >
                    <span className="time-tracer__action-card-content">
                      <span className="time-tracer__action-card-text">
                        <span className="time-tracer__action-card-title">
                          {busy ? "Speichern..." : "Abmelden"}
                        </span>
                        {!busy && (
                          <span className="time-tracer__action-card-subtitle">
                            Arbeitstag beenden
                          </span>
                        )}
                      </span>

                      <span className="time-tracer__action-card-icon-wrap">
                        <IconAbmelden className="time-tracer__action-card-icon" />
                      </span>
                    </span>
                  </button>
                </>  
            ) : (
                <>
                  <button
                    disabled={busy || loading}
                    onClick={() => doPunch("0")}
                    className="time-tracer__action-card time-tracer__action-card--green"
                    title="Neue Anmeldung = Projektwechsel"
                  >
                    <span className="time-tracer__action-card-content">
                      <span className="time-tracer__action-card-text">
                        <span className="time-tracer__action-card-title">
                          {busy ? "Speichern..." : "Projekt wechseln"}
                        </span>
                        {!busy && (
                          <span className="time-tracer__action-card-subtitle">
                            Anderes Projekt auswählen
                          </span>
                        )}
                      </span>

                      <span className="time-tracer__action-card-icon-wrap">
                        <IconAnmelden className="time-tracer__action-card-icon" />
                      </span>
                    </span>
                  </button>
                  <button
                    disabled={busy || loading}
                    onClick={() => doPunch("2")}
                    className="time-tracer__action-card time-tracer__action-card--amber"
                  >
                    <span className="time-tracer__action-card-content">
                      <span className="time-tracer__action-card-text">
                        <span className="time-tracer__action-card-title">
                          {busy ? "Speichern..." : "Pause"}
                        </span>
                        {!busy && (
                          <span className="time-tracer__action-card-subtitle">
                            Pause beginnen
                          </span>
                        )}
                      </span>

                      <span className="time-tracer__action-card-icon-wrap">
                        <IconPause className="time-tracer__action-card-icon" />
                      </span>
                    </span>
                  </button>
                  <button
                    disabled={busy || loading}
                    onClick={() => doPunch("1")}
                    className="time-tracer__action-card time-tracer__action-card--red"
                  >
                    <span className="time-tracer__action-card-content">
                      <span className="time-tracer__action-card-text">
                        <span className="time-tracer__action-card-title">
                          {busy ? "Speichern..." : "Abmelden"}
                        </span>
                        {!busy && (
                          <span className="time-tracer__action-card-subtitle">
                            Arbeitstag beenden
                          </span>
                        )}
                      </span>

                      <span className="time-tracer__action-card-icon-wrap">
                        <IconAbmelden className="time-tracer__action-card-icon" />
                      </span>
                    </span>
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
