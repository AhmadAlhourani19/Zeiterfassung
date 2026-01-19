import { useEffect, useMemo, useState } from "react";
import { getDay, getMonth } from "../api/domino";
import type { StempeluhrEntry } from "../api/types";
import { formatDDMMYYYY, formatMMYYYY, bookingLabel } from "../api/grouping";
import { PunchTable } from "../components/PunchTable";
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
  const csv = buildCsv(rows);
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

  async function loadDay() {
    setLoading(true);
    setErr(null);
    try {
      const data = await getDay(dayKey);
      data.sort((a, b) => +new Date(b.Zeit) - +new Date(a.Zeit));
      setDayEntries(data);
    } catch (e: any) {
      setErr(e?.message ?? "Tag konnte nicht geladen werden");
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
    } catch (e: any) {
      setErr(e?.message ?? "Monat konnte nicht geladen werden");
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
    const rows: string[][] = [["Datum", "Zeit", "Typ", "Projekt"]];
    const sorted = [...dayEntries].sort((a, b) => +new Date(a.Zeit) - +new Date(b.Zeit));
    for (const entry of sorted) {
      rows.push([
        dayKey,
        new Date(entry.Zeit).toLocaleTimeString("de-DE"),
        bookingLabel(entry.Buchungstyp),
        entry.Projekt ?? "",
      ]);
    }
    downloadCsv(`bericht-tag-${dayKey}.csv`, rows);
  }

  function handleExportMonth() {
    if (!monthEntries.length) return;
    const rows: string[][] = [["Datum", "Zeit", "Typ", "Projekt"]];
    const sorted = [...monthEntries].sort((a, b) => +new Date(a.Zeit) - +new Date(b.Zeit));
    for (const entry of sorted) {
      rows.push([
        formatDayFromIso(entry.Zeit),
        new Date(entry.Zeit).toLocaleTimeString("de-DE"),
        bookingLabel(entry.Buchungstyp),
        entry.Projekt ?? "",
      ]);
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
              Brutto: <span className="font-semibold">{fmtHM(dayStats.workMinutes)}</span>{" "}
              • Netto: <span className="font-semibold">{fmtHM(dayStats.netMinutes)}</span>
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Pause: genommen {fmtHM(dayStats.breakMinutes)} • erforderlich {fmtHM(dayStats.requiredBreak)} • fehlend {fmtHM(dayStats.missingBreak)}
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

        {loading && <div className="mt-3 text-sm text-slate-500">Lade…</div>}
      </div>

      <PunchTable title={`Tagesbuchungen (${dayKey})`} entries={dayEntries} />
      <PunchTable title={`Monatsbuchungen (${monthKey})`} entries={monthEntries} />
    </div>
  );
}
