import { useEffect, useMemo, useState } from "react";
import { getDay, getMonth } from "../api/domino";
import type { StempeluhrEntry } from "../api/types";
import { formatDDMMYYYY, formatMMYYYY } from "../api/grouping";
import { buildIntervalsForDay, calcWorkAndBreak, fmtHM } from "../utils/timeCalc";

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

function formatTimeRounded(date: Date) {
  const rounded = new Date(date.getTime() + 30000);
  rounded.setSeconds(0, 0);
  return rounded.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function formatDayFromIso(iso: string) {
  return formatDDMMYYYY(new Date(iso));
}

function csvEscape(value: string) {
  return `"${value.replace(/"/g, "\"\"")}"`;
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

  const dayStats = useMemo(() => {
    const intervals = buildIntervalsForDay(dayEntries, new Date());
    return calcWorkAndBreak(intervals);
  }, [dayEntries]);
  const dayIntervals = useMemo(
    () => buildIntervalsForDay(dayEntries, new Date()),
    [dayEntries]
  );
  const monthSummaries = useMemo(() => {
    const grouped: Record<string, StempeluhrEntry[]> = {};
    for (const entry of monthEntries) {
      const key = formatDayFromIso(entry.Zeit);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(entry);
    }

    return Object.entries(grouped)
      .map(([key, entries]) => {
        const intervals = buildIntervalsForDay(entries, new Date());
        const stats = calcWorkAndBreak(intervals);
        const projectTotals: Record<string, number> = {};

        for (const it of intervals) {
          const minutes = Math.round((+it.end - +it.start) / 60000);
          if (minutes <= 0) continue;
          const name = it.project?.trim() ? it.project : "(ohne Projekt)";
          projectTotals[name] = (projectTotals[name] ?? 0) + minutes;
        }

        const projectSummary = Object.entries(projectTotals)
          .map(([name, minutes]) => ({ name, minutes }))
          .sort((a, b) => b.minutes - a.minutes || a.name.localeCompare(b.name));

        return {
          dayKey: key,
          dayDate: parseDayKey(key),
          stats,
          projectSummary,
        };
      })
      .sort((a, b) => +a.dayDate - +b.dayDate)
      .map(({ dayKey, stats, projectSummary }) => ({ dayKey, stats, projectSummary }));
  }, [monthEntries]);

  async function loadDay() {
    setLoading(true);
    setErr(null);
    try {
      const data = await getDay(dayKey);
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

  async function loadMonth() {
    setLoading(true);
    setErr(null);
    try {
      const data = await getMonth(monthKey);
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

  useEffect(() => {
    loadDay();
    loadMonth();
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
    const rows: string[][] = [
      [
        "Datum",
        "Brutto",
        "Netto",
        "Pause genommen",
        "Pause erforderlich",
        "Pause fehlend",
        "Projekt",
        "Projektzeit",
      ],
    ];

    for (const day of monthSummaries) {
      if (day.projectSummary.length === 0) {
        rows.push([
          day.dayKey,
          fmtHM(day.stats.workMinutes),
          fmtHM(day.stats.netMinutes),
          fmtHM(day.stats.breakMinutes),
          fmtHM(day.stats.requiredBreak),
          fmtHM(day.stats.missingBreak),
          "(keine Projekte)",
          fmtHM(0),
        ]);
        continue;
      }

      for (const project of day.projectSummary) {
        rows.push([
          day.dayKey,
          fmtHM(day.stats.workMinutes),
          fmtHM(day.stats.netMinutes),
          fmtHM(day.stats.breakMinutes),
          fmtHM(day.stats.requiredBreak),
          fmtHM(day.stats.missingBreak),
          project.name,
          fmtHM(project.minutes),
        ]);
      }
    }
    downloadCsv(`bericht-monat-${monthKey}.csv`, rows);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Berichte</h2>
        <p className="mt-1 text-sm text-slate-500">
          Tages- und Monatsübersichten (nur Anzeige).
        </p>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold">Tagesbericht</div>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="date"
                value={toInputDate(dayKey)}
                onChange={(e) => setDayKey(fromInputDate(e.target.value))}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
              />
              <button
                onClick={loadDay}
                className="rounded-2xl bg-slate-900 text-white px-4 py-2 text-sm font-semibold hover:bg-black"
              >
                Laden
              </button>
              <button
                onClick={handleExportDay}
                disabled={loading || dayEntries.length === 0}
                className={[
                  "rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700",
                  "hover:border-slate-400 hover:text-slate-900",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                ].join(" ")}
              >
                Export
              </button>
            </div>

            <div className="mt-3 text-sm text-slate-700">
              Brutto: <span className="font-semibold">{fmtHM(dayStats.workMinutes)}</span> / Netto:{" "}
              <span className="font-semibold">{fmtHM(dayStats.netMinutes)}</span>
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Pause: genommen {fmtHM(dayStats.breakMinutes)} / erforderlich {fmtHM(dayStats.requiredBreak)} / fehlend{" "}
              {fmtHM(dayStats.missingBreak)}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold">Monatsbericht</div>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="month"
                value={toInputMonth(monthKey)}
                onChange={(e) => setMonthKey(fromInputMonth(e.target.value))}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
              />
              <button
                onClick={loadMonth}
                className="rounded-2xl bg-slate-900 text-white px-4 py-2 text-sm font-semibold hover:bg-black"
              >
                Laden
              </button>
              <button
                onClick={handleExportMonth}
                disabled={loading || monthEntries.length === 0}
                className={[
                  "rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700",
                  "hover:border-slate-400 hover:text-slate-900",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                ].join(" ")}
              >
                Export
              </button>
            </div>
            <div className="mt-3 text-sm text-slate-600">
              Buchungen im Monat: <span className="font-semibold">{monthEntries.length}</span>
            </div>
          </div>
        </div>

        {err && (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {err}
          </div>
        )}

        {loading && <div className="mt-3 text-sm text-slate-500">Lade...</div>}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold">Arbeitsphasen ({dayKey})</h3>
        <div className="mt-3 space-y-2">
          {dayIntervals.length === 0 ? (
            <div className="text-sm text-slate-500">Noch keine Arbeitsphasen.</div>
          ) : (
            dayIntervals.map((it, idx) => (
              <div
                key={`${dayKey}-${idx}`}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <div className="text-sm">
                  <span className="font-medium">
                    {formatTimeRounded(it.start)} – {formatTimeRounded(it.end)}
                  </span>
                  {it.project ? (
                    <span className="text-slate-600"> • {it.project}</span>
                  ) : (
                    <span className="text-slate-400"> • (ohne Projekt)</span>
                  )}
                </div>
                <div className="text-sm text-slate-600">
                  {fmtHM(Math.round((+it.end - +it.start) / 60000))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold">Arbeitszeiten (Monat {monthKey})</h3>
        <div className="mt-3 space-y-3">
          {monthSummaries.length === 0 ? (
            <div className="text-sm text-slate-500">Keine Arbeitsphasen in diesem Monat.</div>
          ) : (
            monthSummaries.map((day) => (
              <div
                key={day.dayKey}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">{day.dayKey}</div>
                  <div className="text-xs text-slate-500">
                    Brutto {fmtHM(day.stats.workMinutes)} / Netto {fmtHM(day.stats.netMinutes)}
                  </div>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Pause: genommen {fmtHM(day.stats.breakMinutes)} / erforderlich {fmtHM(day.stats.requiredBreak)} / fehlend{" "}
                  {fmtHM(day.stats.missingBreak)}
                </div>
                <div className="mt-3">
                  <div className="text-xs text-slate-500">Projekte</div>
                  {day.projectSummary.length === 0 ? (
                    <div className="mt-1 text-xs text-slate-500">Keine Projekte.</div>
                  ) : (
                    <div className="mt-1 space-y-1">
                      {day.projectSummary.map((project) => (
                        <div
                          key={`${day.dayKey}-${project.name}`}
                          className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2"
                        >
                          <div className="text-xs text-slate-700">{project.name}</div>
                          <div className="text-xs text-slate-600">{fmtHM(project.minutes)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
