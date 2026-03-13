import { useEffect, useMemo, useState } from "react";
import {
  createPunch,
  getDay,
  getMonth,
  getProjects,
  getUserStatusLookup,
  updatePunchProject,
  updatePunchStatus,
  updatePunchTaetigkeit,
} from "../api/domino";
import type { ProjectEntry, StempeluhrEntry } from "../api/types";
import { formatDDMMYYYY, formatMMYYYY, getDisplayUserFromKey } from "../api/grouping";
import { buildIntervalsForDay, calcWorkAndBreak, fmtHM } from "../utils/timeCalc";
import { IoCaretForward, IoCaretBack } from "react-icons/io5";
import { IconClose, IconStart } from "../components/Icons";
import * as XLSX from "xlsx-js-style";
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

function toExportMonthLabel(mmyyyy: string) {
  const [mm, yyyy] = mmyyyy.split(".");
  if (!mm || !yyyy) return mmyyyy;
  // Keep month label exactly as MM.YYYY in Excel export.
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

function isBoldRow(row: string[]) {
  const normalized = row.map((cell) => cell.trim().toLowerCase());
  const filled = normalized.filter(Boolean);
  if (!filled.length) return false;
  if (filled.length === 1) return true;

  if (normalized[0] === "monat" && normalized[1] === "projekt") return true;
  if (normalized[0] === "datum" && normalized.includes("brutto")) return true;
  if (normalized[0] === "datum" && normalized.includes("dauer")) return true;
  if (normalized[0] === "start" && normalized.includes("ende")) return true;
  if (normalized[0] === "gesamt" || normalized[1] === "gesamt") return true;

  return false;
}

function downloadExcel(filename: string, rows: string[][], widthPx = 220) {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 0);

  if (columnCount > 0) {
    sheet["!cols"] = Array.from({ length: columnCount }, () => ({ wpx: widthPx }));
  }

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    if (!isBoldRow(rows[rowIndex])) continue;
    for (let colIndex = 0; colIndex < columnCount; colIndex++) {
      const address = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
      const cell = sheet[address];
      if (!cell) continue;
      const currentStyle = (cell.s ?? {}) as { font?: { bold?: boolean } };
      const currentFont = currentStyle.font ?? {};
      cell.s = { ...currentStyle, font: { ...currentFont, bold: true } };
    }
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Bericht");
  XLSX.writeFile(workbook, filename, { compression: true, cellStyles: true });
}

function normalizeProjectName(value: string) {
  return value.trim().toLowerCase();
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function normalizeDisplayName(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return "";
  if (trimmed.includes("CN=")) return getDisplayUserFromKey(trimmed);
  return trimmed;
}

function readTaetigkeit(entry: StempeluhrEntry) {
  return (entry.Taetigkeit ?? entry["T\u00e4tigkeit"] ?? "").trim();
}

function intervalKey(start: Date, index: number) {
  return `${+start}-${index}`;
}

type EditProjectContext = {
  key: string;
  intervalStartMs: number;
  oldName: string;
};

type EditTaetigkeitContext = {
  key: string;
  intervalStartMs: number;
  projectName: string;
  oldValue: string;
};

export function Reports() {
  const now = new Date();
  const [dayKey, setDayKey] = useState(formatDDMMYYYY(now));
  const [monthKey, setMonthKey] = useState(formatMMYYYY(now));

  const [dayEntries, setDayEntries] = useState<StempeluhrEntry[]>([]);
  const [monthEntries, setMonthEntries] = useState<StempeluhrEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [projectOptions, setProjectOptions] = useState<string[]>([]);
  const [actionBusyKey, setActionBusyKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionInfo, setActionInfo] = useState<string | null>(null);

  const [editIntervalKey, setEditIntervalKey] = useState<string | null>(null);
  const [editContext, setEditContext] = useState<EditProjectContext | null>(null);
  const [editProjectValue, setEditProjectValue] = useState("");
  const [editProjectMenuOpen, setEditProjectMenuOpen] = useState(false);
  const [editProjectQuery, setEditProjectQuery] = useState("");

  const [editTaetigkeitContext, setEditTaetigkeitContext] = useState<EditTaetigkeitContext | null>(null);
  const [editTaetigkeitValue, setEditTaetigkeitValue] = useState("");
  const [editTaetigkeitMenuOpen, setEditTaetigkeitMenuOpen] = useState(false);
  const [editTaetigkeitQuery, setEditTaetigkeitQuery] = useState("");

  const dayIntervals = useMemo(() => buildIntervalsForDay(dayEntries, new Date()), [dayEntries]);
  const dayStats = useMemo(() => calcWorkAndBreak(dayIntervals), [dayIntervals]);

  const dayProjectTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const interval of dayIntervals) {
      const minutes = Math.round((+interval.end - +interval.start) / 60000);
      if (minutes <= 0) continue;
      const name = interval.project?.trim() ? interval.project : "(ohne Projekt)";
      totals[name] = (totals[name] ?? 0) + minutes;
    }

    return Object.entries(totals)
      .map(([name, minutes]) => ({ name, minutes }))
      .sort((a, b) => b.minutes - a.minutes || a.name.localeCompare(b.name));
  }, [dayIntervals]);

  const monthProjectSections = useMemo(() => {
    const groupedByDay: Record<string, StempeluhrEntry[]> = {};
    for (const entry of monthEntries) {
      const day = formatDDMMYYYY(new Date(entry.Zeit));
      if (!groupedByDay[day]) groupedByDay[day] = [];
      groupedByDay[day].push(entry);
    }

    const dayKeys = Object.keys(groupedByDay).sort((a, b) => +parseDayKey(a) - +parseDayKey(b));
    const sections: Record<
      string,
      { minutes: number; rows: Array<{ date: string; minutes: number; taetigkeit: string }> }
    > = {};

    for (const day of dayKeys) {
      const entries = groupedByDay[day];
      const intervals = buildIntervalsForDay(entries, new Date());
      for (const it of intervals) {
        const minutes = Math.round((+it.end - +it.start) / 60000);
        if (minutes <= 0) continue;
        const name = it.project?.trim() ? it.project : "(ohne Projekt)";
        if (!sections[name]) sections[name] = { minutes: 0, rows: [] };
        sections[name].minutes += minutes;
        sections[name].rows.push({
          date: day,
          minutes,
          taetigkeit: it.taetigkeit?.trim() ? it.taetigkeit : "",
        });
      }
    }

    return Object.entries(sections)
      .map(([name, section]) => ({
        name,
        minutes: section.minutes,
        rows: section.rows,
      }))
      .sort((a, b) => b.minutes - a.minutes || a.name.localeCompare(b.name));
  }, [monthEntries]);

  const monthProjectTotals = useMemo(
    () => monthProjectSections.map(({ name, minutes }) => ({ name, minutes })),
    [monthProjectSections]
  );

  const dayStartEntriesByStartMs = useMemo(() => {
    const map = new Map<number, StempeluhrEntry[]>();
    for (const entry of dayEntries) {
      if (entry.Buchungstyp !== "0") continue;
      const key = +new Date(entry.Zeit);
      const bucket = map.get(key);
      if (bucket) bucket.push(entry);
      else map.set(key, [entry]);
    }
    return map;
  }, [dayEntries]);

  const availableProjectOptions = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];

    const push = (name: string) => {
      const trimmed = name.trim();
      if (!trimmed || trimmed === "(ohne Projekt)") return;
      const key = normalizeProjectName(trimmed);
      if (seen.has(key)) return;
      seen.add(key);
      list.push(trimmed);
    };

    for (const name of projectOptions) push(name);
    for (const project of dayProjectTotals) push(project.name);

    list.sort((a, b) => a.localeCompare(b));
    return list;
  }, [projectOptions, dayProjectTotals]);

  const editSelectOptions = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];

    const push = (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const key = normalizeProjectName(trimmed);
      if (seen.has(key)) return;
      seen.add(key);
      list.push(trimmed);
    };

    push("(ohne Projekt)");
    for (const name of availableProjectOptions) push(name);
    if (editProjectValue.trim()) push(editProjectValue);

    return list;
  }, [availableProjectOptions, editProjectValue]);

  const filteredEditOptions = useMemo(() => {
    const query = editProjectQuery.trim().toLowerCase();
    if (!query) return editSelectOptions;
    return editSelectOptions.filter((name) => name.toLowerCase().includes(query));
  }, [editProjectQuery, editSelectOptions]);

  const editTaetigkeitOptions = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];

    const push = (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;
      const key = normalizeText(trimmed);
      if (seen.has(key)) return;
      seen.add(key);
      list.push(trimmed);
    };

    push("Ohne Tätigkeit");
    for (const interval of dayIntervals) {
      push(interval.taetigkeit);
    }
    for (const entry of monthEntries) {
      push(readTaetigkeit(entry));
    }
    if (editTaetigkeitValue.trim()) push(editTaetigkeitValue);

    return list;
  }, [dayIntervals, monthEntries, editTaetigkeitValue]);

  const filteredTaetigkeitOptions = useMemo(() => {
    const query = editTaetigkeitQuery.trim().toLowerCase();
    if (!query) return editTaetigkeitOptions;
    return editTaetigkeitOptions.filter((option) => option.toLowerCase().includes(query));
  }, [editTaetigkeitOptions, editTaetigkeitQuery]);

  const monthTotalMinutes = useMemo(
    () => monthProjectTotals.reduce((sum, project) => sum + project.minutes, 0),
    [monthProjectTotals]
  );

  const exportUserName = useMemo(() => {
    for (const entry of dayEntries) {
      const normalized = normalizeDisplayName(entry.Key);
      if (normalized) return normalized;
    }
    for (const entry of monthEntries) {
      const normalized = normalizeDisplayName(entry.Key);
      if (normalized) return normalized;
    }
    return "";
  }, [dayEntries, monthEntries]);

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

  async function loadProjectOptions() {
    try {
      const data = await getProjects();
      const rows = Array.isArray(data) ? (data as ProjectEntry[]) : [];
      const seen = new Set<string>();
      const list: string[] = [];

      for (const item of rows) {
        if (item.Dokumentgeloescht) continue;
        const name = (item.Projektname ?? "").trim();
        if (!name) continue;
        const key = normalizeProjectName(name);
        if (seen.has(key)) continue;
        seen.add(key);
        list.push(name);
      }

      list.sort((a, b) => a.localeCompare(b));
      setProjectOptions(list);
    } catch (error) {
      console.warn("Projektoptionen konnten nicht geladen werden", error);
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
    void loadProjectOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!editProjectMenuOpen && !editTaetigkeitMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (editTaetigkeitMenuOpen) {
        cancelEditTaetigkeit();
        return;
      }
      cancelEditProject();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [editProjectMenuOpen, editTaetigkeitMenuOpen]);

  function handleExportDay() {
    if (!dayEntries.length) return;
    const bruttoMinutes = dayStats.workMinutes + dayStats.breakMinutes;
    const nettoMinutes = dayStats.workMinutes;
    const rows: string[][] = [
      ["Arbeitszeit mit Pausen"],
      ["Datum", "Brutto", "Netto", "Pause genommen", "Pause erforderlich", "Pause fehlend"],
      [
        dayKey,
        fmtHM(bruttoMinutes),
        fmtHM(nettoMinutes),
        fmtHM(dayStats.breakMinutes),
        fmtHM(dayStats.requiredBreak),
        fmtHM(dayStats.missingBreak),
      ],
      [],
      ["Projektzeiten"],
    ];

    if (!dayProjectTotals.length) {
      rows.push(["(keine Projekte)", fmtHM(0)]);
    } else {
      for (const project of dayProjectTotals) {
        rows.push([project.name, fmtHM(project.minutes)]);
      }
    }

    rows.push([], ["Arbeitsphasen"], ["Start", "Ende", "Dauer", "Projekt", "Tätigkeit"]);

    for (const it of dayIntervals) {
      rows.push([
        formatTimeRounded(it.start),
        formatTimeRounded(it.end),
        fmtHM(Math.round((+it.end - +it.start) / 60000)),
        it.project?.trim() ? it.project : "(ohne Projekt)",
        it.taetigkeit?.trim() ? it.taetigkeit : "",
      ]);
    }
    downloadExcel(`bericht-tag-${dayKey}.xlsx`, rows);
  }

  function handleExportMonth() {
    if (!monthEntries.length) return;
    const exportMonth = toExportMonthLabel(monthKey);
    const rows: string[][] = [["Projektzeiten"], ["Monat", "Projekt", "Arbeitszeit"]];

    if (!monthProjectTotals.length) {
      rows.push([exportMonth, "(keine Projekte)", fmtHM(0)]);
    } else {
      for (const project of monthProjectTotals) {
        rows.push([exportMonth, project.name, fmtHM(project.minutes)]);
      }
    }

    rows.push(["", "Gesamt", fmtHM(monthTotalMinutes)]);

    if (monthProjectSections.length) {
      rows.push([], ["Einzelne Projekte im diesem Monat"]);
    }

    for (const section of monthProjectSections) {
      rows.push([], [section.name], ["Datum", "Dauer", "Name", "Tätigkeit"]);
      for (const row of section.rows) {
        rows.push([row.date, fmtHM(row.minutes), exportUserName, row.taetigkeit]);
      }
      rows.push(["Gesamt", fmtHM(section.minutes)]);
    }

    downloadExcel(`bericht-monat-${monthKey}.xlsx`, rows);
  }

  function openEditProjectMenu(intervalStart: Date, index: number, projectName: string) {
    const key = intervalKey(intervalStart, index);
    setEditIntervalKey(key);
    setEditContext({ key, intervalStartMs: +intervalStart, oldName: projectName });
    setEditProjectValue(projectName);
    setEditProjectQuery("");
    setEditTaetigkeitContext(null);
    setEditTaetigkeitValue("");
    setEditTaetigkeitQuery("");
    setEditTaetigkeitMenuOpen(false);
    setEditProjectMenuOpen(true);
    setActionError(null);
    setActionInfo(null);
  }

  function cancelEditProject() {
    setEditProjectMenuOpen(false);
    setEditProjectQuery("");
    setEditIntervalKey(null);
    setEditContext(null);
    setEditProjectValue("");
  }

  async function saveEditedProject() {
    if (!editContext) return;

    const oldName = editContext.oldName;
    const selected = editProjectValue.trim();

    if (!selected) {
      setActionError("Bitte ein Zielprojekt waehlen.");
      return;
    }

    if (normalizeProjectName(oldName) === normalizeProjectName(selected)) {
      cancelEditProject();
      return;
    }

    const sourceEntries = dayStartEntriesByStartMs.get(editContext.intervalStartMs) ?? [];
    if (!sourceEntries.length) {
      setActionError("Keine passenden Buchungen fuer dieses Projekt gefunden.");
      return;
    }

    const sourceEntry =
      sourceEntries.find(
        (entry) =>
          normalizeProjectName(entry.Projekt?.trim() ? entry.Projekt : "(ohne Projekt)") ===
          normalizeProjectName(oldName)
      ) ?? sourceEntries[0];

    const targetProjectValue = selected === "(ohne Projekt)" ? "" : selected;

    setActionBusyKey(`edit:${editContext.intervalStartMs}`);
    setActionError(null);
    setActionInfo(null);

    try {
      await updatePunchProject(sourceEntry["@unid"], targetProjectValue);

      cancelEditProject();
      await loadDay(dayKey);
      await loadMonth(monthKey);
      setActionInfo(`Projekt aktualisiert: ${oldName} -> ${selected}.`);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Projekt konnte nicht aktualisiert werden";
      setActionError(message || "Projekt konnte nicht aktualisiert werden");
    } finally {
      setActionBusyKey(null);
    }
  }

  function openEditTaetigkeitMenu(
    intervalStart: Date,
    index: number,
    projectName: string,
    taetigkeit: string
  ) {
    const key = intervalKey(intervalStart, index);
    setEditIntervalKey(key);
    setEditTaetigkeitContext({
      key,
      intervalStartMs: +intervalStart,
      projectName,
      oldValue: taetigkeit.trim(),
    });
    setEditTaetigkeitValue(taetigkeit.trim());
    setEditTaetigkeitQuery("");

    setEditContext(null);
    setEditProjectValue("");
    setEditProjectQuery("");
    setEditProjectMenuOpen(false);

    setEditTaetigkeitMenuOpen(true);
    setActionError(null);
    setActionInfo(null);
  }

  function cancelEditTaetigkeit() {
    setEditTaetigkeitMenuOpen(false);
    setEditTaetigkeitQuery("");
    setEditIntervalKey(null);
    setEditTaetigkeitContext(null);
    setEditTaetigkeitValue("");
  }

  async function saveEditedTaetigkeit() {
    if (!editTaetigkeitContext) return;

    const oldValue = editTaetigkeitContext.oldValue;
    const selectedRaw = editTaetigkeitValue.trim();
    const selected = selectedRaw === "Ohne Tätigkeit" ? "" : selectedRaw;

    if (normalizeText(oldValue) === normalizeText(selected)) {
      cancelEditTaetigkeit();
      return;
    }

    const sourceEntries = dayStartEntriesByStartMs.get(editTaetigkeitContext.intervalStartMs) ?? [];
    if (!sourceEntries.length) {
      setActionError("Keine passende Buchung fuer diese Taetigkeit gefunden.");
      return;
    }

    const sourceEntry =
      sourceEntries.find(
        (entry) =>
          normalizeProjectName(entry.Projekt?.trim() ? entry.Projekt : "(ohne Projekt)") ===
          normalizeProjectName(editTaetigkeitContext.projectName) &&
          normalizeText(readTaetigkeit(entry)) === normalizeText(oldValue)
      ) ??
      sourceEntries.find(
        (entry) =>
          normalizeProjectName(entry.Projekt?.trim() ? entry.Projekt : "(ohne Projekt)") ===
          normalizeProjectName(editTaetigkeitContext.projectName)
      ) ??
      sourceEntries[0];

    setActionBusyKey(`taetigkeit:${editTaetigkeitContext.intervalStartMs}`);
    setActionError(null);
    setActionInfo(null);

    try {
      await updatePunchTaetigkeit(sourceEntry["@unid"], selected);

      cancelEditTaetigkeit();
      await loadDay(dayKey);
      await loadMonth(monthKey);

      if (selected) {
        setActionInfo(`Tätigkeit aktualisiert: ${selected}.`);
      } else {
        setActionInfo("Tätigkeit entfernt.");
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Tätigkeit konnte nicht aktualisiert werden";
      setActionError(message || "Tätigkeit konnte nicht aktualisiert werden");
    } finally {
      setActionBusyKey(null);
    }
  }

  async function activateProject(projectName: string, taetigkeitValue = "") {
    const cleaned = projectName.trim();
    if (!cleaned || cleaned === "(ohne Projekt)") return;

    setActionBusyKey(`switch:${cleaned}`);
    setActionError(null);
    setActionInfo(null);

    try {
      await createPunch({
        Buchungstyp: "0",
        Projekt: cleaned,
        Taetigkeit: taetigkeitValue.trim(),
      });

      try {
        const lookup = await getUserStatusLookup();
        const unid = lookup.unid ?? "";
        if (unid) {
          await updatePunchStatus(unid, {
            Buchungstyp: "0",
            Zeit: new Date().toISOString(),
            Projekt: cleaned,
            Projektname: cleaned,
            Taetigkeit: taetigkeitValue.trim(),
          });
        }
      } catch (statusError) {
        console.warn("Status update after daily project switch failed", statusError);
      }

      await loadDay(dayKey);
      await loadMonth(monthKey);
      setActionInfo(`Projekt "${cleaned}" wurde direkt als aktive Buchung gestartet.`);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Projekt konnte nicht aktiviert werden";
      setActionError(message || "Projekt konnte nicht aktiviert werden");
    } finally {
      setActionBusyKey(null);
    }
  }

  return (
    <div className="reports-page">
      <div className="reports-page__section">
        <h2 className="reports-page__title">Berichte</h2>
        <p className="reports-page__subtitle">Tages- und Monatsübersichten</p>

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
                onChange={(e) => {
                  const next = fromInputDate(e.target.value);
                  setDayKey(next);
                  void loadDay(next);
                }}
                className="reports-page__input"
              />

              <button type="button" onClick={() => void goDay(1)} className="reports-page__icon-btn">
                <IoCaretForward className="reports-page__icon" />
              </button>

              <button
                type="button"
                onClick={handleExportDay}
                disabled={loading || dayEntries.length === 0}
                className="reports-page__export-btn"
              >
                Speichern
              </button>
            </div>

            <div className="reports-page__metric">
              Brutto: <span className="reports-page__metric-value">{fmtHM(dayStats.workMinutes + dayStats.breakMinutes)}</span> / Netto:{" "}
              <span className="reports-page__metric-value">{fmtHM(dayStats.workMinutes)}</span>
            </div>
            <div className="reports-page__metric-detail">
              Pause: genommen {fmtHM(dayStats.breakMinutes)} / erforderlich {fmtHM(dayStats.requiredBreak)} / fehlend{" "}
              {fmtHM(dayStats.missingBreak)}
            </div>

            {actionError && <div className="reports-page__error reports-page__error--inline">{actionError}</div>}
            {actionInfo && <div className="reports-page__info">{actionInfo}</div>}

            <div className="reports-page__panel-subheader">
              <h3 className="reports-page__panel-subtitle">Arbeitsphasen ({dayKey})</h3>
            </div>

            <div className="reports-page__list">
              {dayIntervals.length === 0 ? (
                <div className="reports-page__empty">Noch keine Arbeitsphasen.</div>
              ) : (
                dayIntervals.map((it, idx) => {
                  const currentProject = it.project?.trim() ? it.project : "(ohne Projekt)";
                  const editKey = intervalKey(it.start, idx);
                  const isEditingProject = editIntervalKey === editKey && editProjectMenuOpen;
                  const isEditingTaetigkeit = editIntervalKey === editKey && editTaetigkeitMenuOpen;
                  const disabled = loading || actionBusyKey !== null;

                  return (
                    <div key={`${dayKey}-${idx}`} className="reports-page__row reports-page__row--project">
                      <div className="reports-page__project-main">
                        <div className="reports-page__row-main">
                          <span className="reports-page__row-time">
                            {formatTimeRounded(it.start)} - {formatTimeRounded(it.end)}
                          </span>
                          {currentProject !== "(ohne Projekt)" && (
                            <span className="reports-page__row-project"> | {currentProject}</span>
                          )}
                          {currentProject === "(ohne Projekt)" && (
                            <span className="reports-page__row-project-muted"> | (ohne Projekt)</span>
                          )}
                          {it.taetigkeit?.trim() && (
                            <div className="reports-page__row-meta">Tätigkeit: {it.taetigkeit}</div>
                          )}
                        </div>
                      </div>

                      <div className="reports-page__project-actions">
                        <div className="reports-page__project-minutes">
                          {fmtHM(Math.round((+it.end - +it.start) / 60000))}
                        </div>

                        <div className="reports-page__split-btn-group">
                          <button
                            type="button"
                            onClick={() => openEditProjectMenu(it.start, idx, currentProject)}
                            disabled={disabled}
                            className="reports-page__split-btn reports-page__split-btn--left"
                            title="Projekt Ändern"
                          >
                            {isEditingProject ? "Projekt..." : "Projekt"}
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditTaetigkeitMenu(it.start, idx, currentProject, it.taetigkeit)}
                            disabled={disabled}
                            className="reports-page__split-btn reports-page__split-btn--middle"
                            title="Tätigkeit Ändern"
                          >
                            {isEditingTaetigkeit ? "Tätigkeit..." : "Tätigkeit"}
                          </button>                         

                          <button
                            type="button"
                            onClick={() => void activateProject(currentProject, it.taetigkeit)}
                            disabled={disabled}
                            className="reports-page__split-btn reports-page__split-btn--icon"
                            title="Projekt starten"
                          >
                            <span className="reports-page__lookup-btn-start-icon">
                              <IconStart />
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="reports-page__panel-subheader">
              <h3 className="reports-page__panel-subtitle">Projekt-Summary (Tag)</h3>
            </div>

            <div className="reports-page__list">
              {dayProjectTotals.length === 0 ? (
                <div className="reports-page__empty">Keine Projektzeit an diesem Tag.</div>
              ) : (
                dayProjectTotals.map((project) => (
                  <div key={`${dayKey}-sum-${project.name}`} className="reports-page__row">
                    <div className="reports-page__project-name">{project.name}</div>
                    <div className="reports-page__project-minutes">{fmtHM(project.minutes)}</div>
                  </div>
                ))
              )}
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
                onChange={(e) => {
                  const next = fromInputMonth(e.target.value);
                  setMonthKey(next);
                  void loadMonth(next);
                }}
                className="reports-page__input"
              />

              <button type="button" onClick={() => void goMonth(1)} className="reports-page__icon-btn">
                <IoCaretForward className="reports-page__icon" />
              </button>

              <button
                type="button"
                onClick={handleExportMonth}
                disabled={loading || monthEntries.length === 0}
                className="reports-page__export-btn"
              >
                Speichern
              </button>
            </div>

            <div className="reports-page__metric">
              Buchungen im Monat: <span className="reports-page__metric-value">{monthEntries.length}</span>
            </div>
            <div className="reports-page__metric">
              Gesamt Projektzeit: <span className="reports-page__metric-value">{fmtHM(monthTotalMinutes)}</span>
            </div>

            <div className="reports-page__panel-subheader">
              <h3 className="reports-page__panel-subtitle">Projektzeiten (Monat {monthKey})</h3>
            </div>

            <div className="reports-page__list">
              {monthProjectTotals.length === 0 ? (
                <div className="reports-page__empty">Keine Arbeitsphasen in diesem Monat.</div>
              ) : (
                monthProjectTotals.map((project) => {                  
                  return (
                    <div key={`${monthKey}-${project.name}`} className="reports-page__row reports-page__row--project">
                      <div className="reports-page__project-main">
                        <div className="reports-page__project-name">{project.name}</div>
                      </div>
                      <div className="reports-page__project-actions">
                        <div className="reports-page__project-minutes">{fmtHM(project.minutes)}</div>                        
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {editProjectMenuOpen && (
          <div className="reports-page__project-overlay" onClick={cancelEditProject}>
            <div
              className="reports-page__project-menu"
              role="dialog"
              aria-modal="true"
              aria-label="Projekt bearbeiten"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="reports-page__project-menu-header">
                <div>
                  <div className="reports-page__project-menu-title">Projekt bearbeiten</div>
                  <div className="reports-page__project-menu-subtitle">
                    {editSelectOptions.length} Optionen
                  </div>
                </div>
                <button
                  type="button"
                  onClick={cancelEditProject}
                  className="reports-page__project-menu-close"
                  aria-label="Schliessen"
                >
                  <IconClose className="h-5 w-5 text-slate-600" />
                </button>
              </div>

              <input
                value={editProjectQuery}
                onChange={(event) => setEditProjectQuery(event.target.value)}
                placeholder="Projekt suchen..."
                className="reports-page__project-search"
                disabled={loading || actionBusyKey !== null}
              />

              <div className="reports-page__project-list">
                {filteredEditOptions.length === 0 && (
                  <div className="reports-page__project-empty">Keine Treffer.</div>
                )}

                {filteredEditOptions.map((option) => {
                  const isActive = normalizeProjectName(option) === normalizeProjectName(editProjectValue);
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setEditProjectValue(option)}
                      className={[
                        "reports-page__project-item",
                        isActive ? "reports-page__project-item--active" : "",
                      ]
                        .join(" ")
                        .trim()}
                    >
                      <span className="reports-page__project-item-name" title={option}>
                        {option}
                      </span>
                      {isActive && <span className="reports-page__project-item-tag">Aktiv</span>}
                    </button>
                  );
                })}
              </div>

              <div className="reports-page__project-menu-actions">
                <button
                  type="button"
                  onClick={cancelEditProject}
                  className="reports-page__row-btn"
                  disabled={loading || actionBusyKey !== null}
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={() => void saveEditedProject()}
                  className="reports-page__row-btn reports-page__row-btn--primary"
                  disabled={loading || actionBusyKey !== null || !editProjectValue.trim()}
                >
                  Speichern
                </button>
              </div>
            </div>
          </div>
        )}

        {editTaetigkeitMenuOpen && (
          <div className="reports-page__project-overlay" onClick={cancelEditTaetigkeit}>
            <div
              className="reports-page__project-menu"
              role="dialog"
              aria-modal="true"
              aria-label="Tätigkeit bearbeiten"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="reports-page__project-menu-header">
                <div>
                  <div className="reports-page__project-menu-title">Tätigkeit bearbeiten</div>
                  <div className="reports-page__project-menu-subtitle">
                    Projekt: {editTaetigkeitContext?.projectName ?? "(ohne Projekt)"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={cancelEditTaetigkeit}
                  className="reports-page__project-menu-close"
                  aria-label="Schliessen"
                >
                  <IconClose className="h-5 w-5 text-slate-600" />
                </button>
              </div>

              <label className="reports-page__field-label" htmlFor="reports-edit-taetigkeit-value">
                Tätigkeit (frei eingeben oder unten auswählen)
              </label>
              <input
                id="reports-edit-taetigkeit-value"
                value={editTaetigkeitValue}
                onChange={(event) => setEditTaetigkeitValue(event.target.value)}
                placeholder="Neue Tätigkeit"
                className="reports-page__project-search"
                disabled={loading || actionBusyKey !== null}
              />

              {/* Suchen brauchen wir nicht */}
              {/* <input
                value={editTaetigkeitQuery}
                onChange={(event) => setEditTaetigkeitQuery(event.target.value)}
                placeholder="Suchen..."
                className="reports-page__project-search"
                disabled={loading || actionBusyKey !== null}
              /> */}

              <div className="reports-page__project-list">
                {filteredTaetigkeitOptions.length === 0 && (
                  <div className="reports-page__project-empty">Keine Treffer.</div>
                )}

                {filteredTaetigkeitOptions.map((option) => {
                  const normalizedOption = option === "Ohne Tätigkeit" ? "" : option;
                  const isActive = normalizeText(normalizedOption) === normalizeText(editTaetigkeitValue);

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setEditTaetigkeitValue(normalizedOption)}
                      className={[
                        "reports-page__project-item",
                        isActive ? "reports-page__project-item--active" : "",
                      ]
                        .join(" ")
                        .trim()}
                    >
                      <span className="reports-page__project-item-name" title={option}>
                        {option}
                      </span>
                      {isActive && <span className="reports-page__project-item-tag">Aktiv</span>}
                    </button>
                  );
                })}
              </div>

              <div className="reports-page__project-menu-actions">
                <button
                  type="button"
                  onClick={cancelEditTaetigkeit}
                  className="reports-page__row-btn"
                  disabled={loading || actionBusyKey !== null}
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={() => void saveEditedTaetigkeit()}
                  className="reports-page__row-btn reports-page__row-btn--primary"
                  disabled={loading || actionBusyKey !== null}
                >
                  Speichern
                </button>
              </div>
            </div>
          </div>
        )}

        {err && <div className="reports-page__error">{err}</div>}
        {loading && <div className="reports-page__loading">Lade...</div>}
      </div>
    </div>
  );
}

























