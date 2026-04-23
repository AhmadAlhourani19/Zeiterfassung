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
import "./styles/Dashboard.css";

function getCurrentKeys() {
  const now = new Date();
  return {
    month: formatMMYYYY(now),
    day: formatDDMMYYYY(now),
  };
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

function readTaetigkeit(entry: StempeluhrEntry) {
  return (entry.Taetigkeit ?? entry["T\u00e4tigkeit"] ?? "").trim();
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
    const rows: string[][] = [["Datum", "Zeit", "Typ", "Projekt", "Tätigkeit"]];
    const sorted = [...todayEntries].sort((a, b) => +new Date(a.Zeit) - +new Date(b.Zeit));
    for (const entry of sorted) {
      rows.push([
        todayKey,
        new Date(entry.Zeit).toLocaleTimeString("de-DE"),
        bookingLabel(entry.Buchungstyp),
        entry.Projekt ?? "",
        readTaetigkeit(entry),
      ]);
    }
    downloadCsv(`bericht-tag-${todayKey}.csv`, rows);
  }

  function handleExportMonth() {
    if (!monthEntries.length) return;
    const rows: string[][] = [["Datum", "Zeit", "Typ", "Projekt", "Tätigkeit"]];
    const sorted = [...monthEntries].sort((a, b) => +new Date(a.Zeit) - +new Date(b.Zeit));
    for (const entry of sorted) {
      rows.push([
        formatDDMMYYYY(new Date(entry.Zeit)),
        new Date(entry.Zeit).toLocaleTimeString("de-DE"),
        bookingLabel(entry.Buchungstyp),
        entry.Projekt ?? "",
        readTaetigkeit(entry),
      ]);
    }
    downloadCsv(`bericht-monat-${currentMonthKey}.csv`, rows);
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-page__top">
        <div>
          <div className="dashboard-page__label">Angemeldeter Benutzer</div>
          <div className="dashboard-page__username">{userName ?? "-"}</div>
          <div className="dashboard-page__date">
            Datum: <span className="dashboard-page__date-value">{todayKey}</span>
          </div>
        </div>
      </div>

      {error && <div className="dashboard-page__error">{error}</div>}

      <div className="dashboard-page__sections">
        <PunchCard
          todayEntries={todayEntries}
          onPunched={() => {
            loadToday();
            loadMonth();
          }}
        />

        <PunchTable title={`Heute (${todayKey})`} entries={todayEntries} />

        <div className="dashboard-page__card">
          <div className="dashboard-page__card-header">
            <h3 className="dashboard-page__card-title">Berichte</h3>
            <div className="dashboard-page__card-subtitle">Excel-Export</div>
          </div>

          <div className="dashboard-page__export-grid">
            <button
              type="button"
              onClick={handleExportToday}
              disabled={loadingToday || todayEntries.length === 0}
              className="dashboard-page__export-btn"
            >
              Tagesbericht exportieren
            </button>
            <button
              type="button"
              onClick={handleExportMonth}
              disabled={loadingMonth || monthEntries.length === 0}
              className="dashboard-page__export-btn"
            >
              Monatsbericht exportieren
            </button>
          </div>
        </div>

        <div className="dashboard-page__card">
          <div className="dashboard-page__card-header">
            <h3 className="dashboard-page__card-title">Monatsubersicht ({currentMonthKey})</h3>
            <div className="dashboard-page__card-subtitle">
              {loadingMonth ? "Lade..." : `${monthEntries.length} Buchungen`}
            </div>
          </div>

          <div className="dashboard-page__month-list">
            {Object.keys(groupedDays).length === 0 && (
              <div className="dashboard-page__empty">Keine Buchungen in diesem Monat.</div>
            )}

            {Object.entries(groupedDays)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([day, entries]) => (
                <div key={day} className="dashboard-page__month-item">
                  <div className="dashboard-page__month-item-row">
                    <div className="dashboard-page__month-item-day">{day}</div>
                    <div className="dashboard-page__month-item-count">{entries.length} Buchungen</div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}