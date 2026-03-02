import { useEffect, useMemo, useState } from "react";
import { getDay, getMonth } from "../api/domino";
import type { StempeluhrEntry } from "../api/types";
import { formatDDMMYYYY, formatMMYYYY } from "../api/grouping";
import { buildIntervalsForDay, calcWorkAndBreak, fmtHM } from "../utils/timeCalc";
import { IoCaretForward, IoCaretBack } from "react-icons/io5";
import "./styles/Reports.css";

function toInputDate(ddmmyyyy: string) {
  const [dd, mm, yyyy] = ddmmyyyy.split(".");
  return `${yyyy}-${mm}-${dd}`;
}

function fromInputDate(yyyyMMdd: string) {
  const [yyyy, mm, dd] = yyyyMMdd.split("-");
  return `${dd}.${mm}.${yyyy}`;
}

function toInputMonth(mmyyyy: string) {
  const [mm, yyyy] = mmyyyy.split(".");
  return `${yyyy}-${mm}`;
}

function fromInputMonth(yyyyMm: string) {
  const [yyyy, mm] = yyyyMm.split("-");
  return `${mm}.${yyyy}`;
}

function parseDayKey(dayKey: string) {
  const [dd, mm, yyyy] = dayKey.split(".");
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
}

function parseMonthKey(monthKey: string) {
  const [mm, yyyy] = monthKey.split(".");
  return new Date(Number(yyyy), Number(mm) - 1, 1);
}

function shiftDayKey(dayKey: string, deltaDays: number) {
  const date = parseDayKey(dayKey);
  date.setDate(date.getDate() + deltaDays);
  return formatDDMMYYYY(date);
}

function shiftMonthKey(monthKey: string, deltaMonths: number) {
  const date = parseMonthKey(monthKey);
  date.setMonth(date.getMonth() + deltaMonths);
  return formatMMYYYY(date);
}

function formatTimeRounded(date: Date) {
  const rounded = new Date(date.getTime() + 30000);
  rounded.setSeconds(0, 0);
  return rounded.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function csvEscape(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function buildCsv(rows: string[][]) {
  return rows.map((row) => row.map(csvEscape).join(";")).join("\r\n");
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = "\ufeff" + buildCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function Reports() {
  const now = new Date();
  const [dayKey, setDayKey] = useState(formatDDMMYYYY(now));
  const [monthKey, setMonthKey] = useState(formatMMYYYY(now));

  const [dayEntries, setDayEntries] = useState<StempeluhrEntry[]>([]);
  const [monthEntries, setMonthEntries] = useState<StempeluhrEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const dayIntervals = useMemo(() => buildIntervalsForDay(dayEntries, new Date()), [dayEntries]);
  const dayStats = useMemo(() => calcWorkAndBreak(dayIntervals), [dayIntervals]);

  const monthProjectTotals = useMemo(() => {
    const groupedByDay: Record<string, StempeluhrEntry[]> = {};
    for (const entry of monthEntries) {
      const day = formatDDMMYYYY(new Date(entry.Zeit));
      if (!groupedByDay[day]) groupedByDay[day] = [];
      groupedByDay[day].push(entry);
    }

    const totals: Record<string, number> = {};
    for (const entries of Object.values(groupedByDay)) {
      const intervals = buildIntervalsForDay(entries, new Date());
      for (const it of intervals) {
        const minutes = Math.round((+it.end - +it.start) / 60000);
        if (minutes <= 0) continue;
        const name = it.project?.trim() ? it.project : "(ohne Projekt)";
        totals[name] = (totals[name] ?? 0) + minutes;
      }
    }

    return Object.entries(totals)
      .map(([name, minutes]) => ({ name, minutes }))
      .sort((a, b) => b.minutes - a.minutes || a.name.localeCompare(b.name));
  }, [monthEntries]);

  const monthTotalMinutes = useMemo(
    () => monthProjectTotals.reduce((sum, project) => sum + project.minutes, 0),
    [monthProjectTotals]
  );

  async function loadDay(targetDayKey = dayKey) {
    setLoading(true);
    setErr(null);
    try {
      const data = await getDay(targetDayKey);
      data.sort((a, b) => +new Date(b.Zeit) - +new Date(a.Zeit));
      setDayEntries(data);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Tag konnte nicht geladen werden";
      setErr(message || "Tag konnte nicht geladen werden");
      setDayEntries([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadMonth(targetMonthKey = monthKey) {
    setLoading(true);
    setErr(null);
    try {
      const data = await getMonth(targetMonthKey);
      data.sort((a, b) => +new Date(b.Zeit) - +new Date(a.Zeit));
      setMonthEntries(data);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Monat konnte nicht geladen werden";
      setErr(message || "Monat konnte nicht geladen werden");
      setMonthEntries([]);
    } finally {
      setLoading(false);
    }
  }

  async function goDay(delta: number) {
    const next = shiftDayKey(dayKey, delta);
    setDayKey(next);
    await loadDay(next);
  }

  async function goMonth(delta: number) {
    const next = shiftMonthKey(monthKey, delta);
    setMonthKey(next);
    await loadMonth(next);
  }

  useEffect(() => {
    void loadDay(dayKey);
    void loadMonth(monthKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleExportDay() {
    if (!dayEntries.length) return;
    const rows: string[][] = [
      ["Datum", "Brutto", "Netto", "Pause genommen", "Pause erforderlich", "Pause fehlend"],
      [
        dayKey,
        fmtHM(dayStats.workMinutes),
        fmtHM(dayStats.netMinutes),
        fmtHM(dayStats.breakMinutes),
        fmtHM(dayStats.requiredBreak),
        fmtHM(dayStats.missingBreak),
      ],
      [],
      ["Start", "Ende", "Dauer", "Projekt"],
    ];

    for (const it of dayIntervals) {
      rows.push([
        formatTimeRounded(it.start),
        formatTimeRounded(it.end),
        fmtHM(Math.round((+it.end - +it.start) / 60000)),
        it.project?.trim() ? it.project : "(ohne Projekt)",
      ]);
    }
    downloadCsv(`bericht-tag-${dayKey}.csv`, rows);
  }

  function handleExportMonth() {
    if (!monthEntries.length) return;
    const rows: string[][] = [["Monat", "Projekt", "Arbeitszeit"]];

    if (!monthProjectTotals.length) {
      rows.push([monthKey, "(keine Projekte)", fmtHM(0)]);
    } else {
      for (const project of monthProjectTotals) {
        rows.push([monthKey, project.name, fmtHM(project.minutes)]);
      }
    }

    rows.push(["", "Gesamt", fmtHM(monthTotalMinutes)]);
    downloadCsv(`bericht-monat-${monthKey}.csv`, rows);
  }

  return (
    <div className="reports-page">
      <div className="reports-page__section">
        <h2 className="reports-page__title">Berichte</h2>
        <p className="reports-page__subtitle">Tages- und Monatsuebersichten (nur Anzeige).</p>

        <div className="reports-page__summary-grid">
          <div className="reports-page__panel">
            <div className="reports-page__panel-title">Tagesbericht</div>
            <div className="reports-page__controls">
              <button type="button" onClick={() => void goDay(-1)} className="reports-page__icon-btn">
                <IoCaretBack className="reports-page__icon" />
              </button>

              <input
                type="date"
                value={toInputDate(dayKey)}
                onChange={(e) => setDayKey(fromInputDate(e.target.value))}
                className="reports-page__input"
              />

              <button type="button" onClick={() => void goDay(1)} className="reports-page__icon-btn">
                <IoCaretForward className="reports-page__icon" />
              </button>

              <button type="button" onClick={() => void loadDay()} className="reports-page__primary-btn">
                Laden
              </button>

              <button
                type="button"
                onClick={handleExportDay}
                disabled={loading || dayEntries.length === 0}
                className="reports-page__secondary-btn"
              >
                Export
              </button>
            </div>

            <div className="reports-page__metric">
              Brutto: <span className="reports-page__metric-value">{fmtHM(dayStats.workMinutes)}</span> / Netto:{" "}
              <span className="reports-page__metric-value">{fmtHM(dayStats.netMinutes)}</span>
            </div>
            <div className="reports-page__metric-detail">
              Pause: genommen {fmtHM(dayStats.breakMinutes)} / erforderlich {fmtHM(dayStats.requiredBreak)} / fehlend{" "}
              {fmtHM(dayStats.missingBreak)}
            </div>
          </div>

          <div className="reports-page__panel">
            <div className="reports-page__panel-title">Monatsbericht</div>
            <div className="reports-page__controls">
              <button type="button" onClick={() => void goMonth(-1)} className="reports-page__icon-btn">
                <IoCaretBack className="reports-page__icon" />
              </button>

              <input
                type="month"
                value={toInputMonth(monthKey)}
                onChange={(e) => setMonthKey(fromInputMonth(e.target.value))}
                className="reports-page__input"
              />

              <button type="button" onClick={() => void goMonth(1)} className="reports-page__icon-btn">
                <IoCaretForward className="reports-page__icon" />
              </button>

              <button type="button" onClick={() => void loadMonth()} className="reports-page__primary-btn">
                Laden
              </button>

              <button
                type="button"
                onClick={handleExportMonth}
                disabled={loading || monthEntries.length === 0}
                className="reports-page__secondary-btn"
              >
                Export
              </button>
            </div>

            <div className="reports-page__metric">
              Buchungen im Monat: <span className="reports-page__metric-value">{monthEntries.length}</span>
            </div>
            <div className="reports-page__metric">
              Gesamt Projektzeit: <span className="reports-page__metric-value">{fmtHM(monthTotalMinutes)}</span>
            </div>
          </div>
        </div>

        {err && <div className="reports-page__error">{err}</div>}
        {loading && <div className="reports-page__loading">Lade...</div>}
      </div>

      <div className="reports-page__section">
        <div className="reports-page__section-header">
          <h3 className="reports-page__section-title">Arbeitsphasen ({dayKey})</h3>
          <div className="reports-page__section-actions">
            <button type="button" onClick={() => void goDay(-1)} className="reports-page__ghost-btn">
              Zuruck
            </button>
            <button type="button" onClick={() => void goDay(1)} className="reports-page__ghost-btn">
              Weiter
            </button>
          </div>
        </div>

        <div className="reports-page__list">
          {dayIntervals.length === 0 ? (
            <div className="reports-page__empty">Noch keine Arbeitsphasen.</div>
          ) : (
            dayIntervals.map((it, idx) => (
              <div key={`${dayKey}-${idx}`} className="reports-page__row">
                <div className="reports-page__row-main">
                  <span className="reports-page__row-time">
                    {formatTimeRounded(it.start)} - {formatTimeRounded(it.end)}
                  </span>
                  {it.project ? (
                    <span className="reports-page__row-project"> | {it.project}</span>
                  ) : (
                    <span className="reports-page__row-project-muted"> | (ohne Projekt)</span>
                  )}
                </div>
                <div className="reports-page__row-duration">{fmtHM(Math.round((+it.end - +it.start) / 60000))}</div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="reports-page__section">
        <div className="reports-page__section-header">
          <h3 className="reports-page__section-title">Projektzeiten (Monat {monthKey})</h3>
          <div className="reports-page__section-actions">
            <button type="button" onClick={() => void goMonth(-1)} className="reports-page__ghost-btn">
              Zuruck
            </button>
            <button type="button" onClick={() => void goMonth(1)} className="reports-page__ghost-btn">
              Weiter
            </button>
          </div>
        </div>

        <div className="reports-page__metric">
          Gesamt Projektzeit: <span className="reports-page__metric-value">{fmtHM(monthTotalMinutes)}</span>
        </div>

        <div className="reports-page__list">
          {monthProjectTotals.length === 0 ? (
            <div className="reports-page__empty">Keine Arbeitsphasen in diesem Monat.</div>
          ) : (
            monthProjectTotals.map((project) => (
              <div key={`${monthKey}-${project.name}`} className="reports-page__row">
                <div className="reports-page__project-name">{project.name}</div>
                <div className="reports-page__project-minutes">{fmtHM(project.minutes)}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

