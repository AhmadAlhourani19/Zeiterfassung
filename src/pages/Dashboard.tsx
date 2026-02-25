import { useCallback, useEffect, useMemo, useState } from "react";
import { getDay, getMonth } from "../api/domino";
import type { StempeluhrEntry } from "../api/types";
import { PunchTable } from "../components/PunchTable";
import { PunchCard } from "../components/PunchCard";
import {
  formatDDMMYYYY,
  formatMMYYYY,
  groupMonth,
  getDisplayUserFromKey,
  bookingLabel,
} from "../api/grouping";

function getCurrentKeys() {
  const now = new Date();
  return {
    month: formatMMYYYY(now),
    day: formatDDMMYYYY(now),
  };
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

export default function Dashboard() {
  const { month: currentMonthKey, day: todayKey } = useMemo(getCurrentKeys, []);

  const [monthEntries, setMonthEntries] = useState<StempeluhrEntry[]>([]);
  const [todayEntries, setTodayEntries] = useState<StempeluhrEntry[]>([]);

  const [loadingMonth, setLoadingMonth] = useState(false);
  const [loadingToday, setLoadingToday] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userName = useMemo(() => {
    const first = todayEntries[0] ?? monthEntries[0];
    return first?.Key ? getDisplayUserFromKey(first.Key) : null;
  }, [todayEntries, monthEntries]);

  const monthGrouped = useMemo(() => groupMonth(monthEntries), [monthEntries]);
  const onlyUser = useMemo(() => Object.keys(monthGrouped)[0] ?? null, [monthGrouped]);
  const groupedDays = useMemo(() => (onlyUser ? monthGrouped[onlyUser] ?? {} : {}), [monthGrouped, onlyUser]);

  const loadMonth = useCallback(async () => {
    setLoadingMonth(true);
    setError(null);
    try {
      const data = await getMonth(currentMonthKey);
      setMonthEntries(data);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Monat konnte nicht geladen werden";
      setError(message);
      setMonthEntries([]);
    } finally {
      setLoadingMonth(false);
    }
  }, [currentMonthKey]);

  const loadToday = useCallback(async () => {
    setLoadingToday(true);
    setError(null);
    try {
      const data = await getDay(todayKey);
      data.sort((a, b) => +new Date(b.Zeit) - +new Date(a.Zeit));
      setTodayEntries(data);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Heute konnte nicht geladen werden";
      setError(message);
      setTodayEntries([]);
    } finally {
      setLoadingToday(false);
    }
  }, [todayKey]);

  useEffect(() => {
    void loadMonth();
    void loadToday();
  }, [loadMonth, loadToday]);

  function handleExportToday() {
    if (!todayEntries.length) return;
    const rows: string[][] = [["Datum", "Zeit", "Typ", "Projekt"]];
    const sorted = [...todayEntries].sort((a, b) => +new Date(a.Zeit) - +new Date(b.Zeit));
    for (const entry of sorted) {
      rows.push([
        todayKey,
        new Date(entry.Zeit).toLocaleTimeString("de-DE"),
        bookingLabel(entry.Buchungstyp),
        entry.Projekt ?? "",
      ]);
    }
    downloadCsv(`bericht-tag-${todayKey}.csv`, rows);
  }

  function handleExportMonth() {
    if (!monthEntries.length) return;
    const rows: string[][] = [["Datum", "Zeit", "Typ", "Projekt"]];
    const sorted = [...monthEntries].sort((a, b) => +new Date(a.Zeit) - +new Date(b.Zeit));
    for (const entry of sorted) {
      rows.push([
        formatDDMMYYYY(new Date(entry.Zeit)),
        new Date(entry.Zeit).toLocaleTimeString("de-DE"),
        bookingLabel(entry.Buchungstyp),
        entry.Projekt ?? "",
      ]);
    }
    downloadCsv(`bericht-monat-${currentMonthKey}.csv`, rows);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-sm text-slate-500">Angemeldeter Benutzer</div>
          <div className="mt-1 text-2xl font-semibold">
            {userName ?? "—"}
          </div>
          <div className="mt-1 text-sm text-slate-500">
            Datum: <span className="font-medium">{todayKey}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-5 rounded-3xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
          {error}
        </div>
      )}

      <div className="mt-6 space-y-6">
        <PunchCard
          todayEntries={todayEntries}
          onPunched={() => {
            loadToday();
            loadMonth();
          }}
        />

        <PunchTable title={`Heute (${todayKey})`} entries={todayEntries} />

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Berichte</h3>
            <div className="text-sm text-slate-500">Excel-Export</div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleExportToday}
              disabled={loadingToday || todayEntries.length === 0}
              className={[
                "rounded-2xl px-4 py-2 text-sm font-semibold transition",
                "bg-slate-900 text-white hover:bg-slate-800",
                "disabled:cursor-not-allowed disabled:opacity-60",
              ].join(" ")}
            >
              Tagesbericht exportieren
            </button>
            <button
              type="button"
              onClick={handleExportMonth}
              disabled={loadingMonth || monthEntries.length === 0}
              className={[
                "rounded-2xl px-4 py-2 text-sm font-semibold transition",
                "bg-slate-900 text-white hover:bg-slate-800",
                "disabled:cursor-not-allowed disabled:opacity-60",
              ].join(" ")}
            >
              Monatsbericht exportieren
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Monatsübersicht ({currentMonthKey})</h3>
            <div className="text-sm text-slate-500">
              {loadingMonth ? "Lade…" : `${monthEntries.length} Buchungen`}
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {Object.keys(groupedDays).length === 0 && (
              <div className="text-slate-500">Keine Buchungen in diesem Monat.</div>
            )}

            {Object.entries(groupedDays)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([day, entries]) => (
                <div
                  key={day}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{day}</div>
                    <div className="text-sm text-slate-500">{entries.length} Buchungen</div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
