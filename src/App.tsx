import { useEffect, useMemo, useState } from "react";
import { Header } from "./components/Header";
import { AppShell } from "./layout/AppShell";
import type { NavId } from "./layout/AppShell";
import { TimeTracer } from "./pages/TimeTracer";
import { Projects } from "./pages/Projects";
import { Reports } from "./pages/Reports";
import { Status } from "./pages/Status";
import {
  createProject,
  getCurrentStatus,
  getDay,
  getMonth,
  getProjectPicklist,
  getProjects,
  isAuthError,
} from "./api/domino";
import type { ProjectEntry, ProjectPicklistEntry, StatusEntry, StempeluhrEntry } from "./api/types";
import { formatDDMMYYYY, formatMMYYYY, getDisplayUserFromKey } from "./api/grouping";

function currentKeys() {
  const now = new Date();
  return { todayKey: formatDDMMYYYY(now), monthKey: formatMMYYYY(now) };
}

function getAuthErrorMessage(error: unknown) {
  if (isAuthError(error)) {
    return "Sie sind nicht angemeldet. Bitte melden Sie sich an.";
  }
  if (!(error instanceof Error)) return null;
  const msg = error.message.toLowerCase();
  if (
    msg.includes("http 401") ||
    msg.includes("http 403") ||
    msg.includes("unauthorized") ||
    msg.includes("forbidden")
  ) {
    return "Sie sind nicht angemeldet. Bitte melden Sie sich an.";
  }
  return null;
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

function findValueInEntryData(
  entry: Pick<ProjectPicklistEntry, "entrydata">,
  matcher: (key: string) => boolean
) {
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

function getPicklistField(
  entry: ProjectPicklistEntry,
  keys: string[],
  matcher: (key: string) => boolean
) {
  for (const key of keys) {
    const text = extractText(entry[key as keyof ProjectPicklistEntry]);
    if (text) return text.trim();
  }
  const fromEntryData = findValueInEntryData(entry, matcher);
  return fromEntryData?.trim() || null;
}

function buildProjectLabel(entry: ProjectPicklistEntry) {
  const nummer = getPicklistField(
    entry,
    ["Projektnummer", "ProjektNummer", "ProjektNr", "Projektnr"],
    (key) => {
      const norm = key.toLowerCase();
      return norm === "projektnummer" || norm === "projektnr" || norm === "projekt-nr" || norm === "projekt_nr";
    }
  );
  const name = getPicklistField(
    entry,
    ["Projektname", "ProjektName"],
    (key) => key.toLowerCase().includes("projektname")
  );
  if (nummer && name) return `${nummer} ${name}`;
  return name || nummer || null;
}

export default function App() {
  const { todayKey, monthKey } = useMemo(currentKeys, []);
  const [active, setActive] = useState<NavId>("time");

  const [todayEntries, setTodayEntries] = useState<StempeluhrEntry[]>([]);
  const [monthEntries, setMonthEntries] = useState<StempeluhrEntry[]>([]);
  const [loadingToday, setLoadingToday] = useState(false);
  const [loadingMonth, setLoadingMonth] = useState(false);

  const [projects, setProjects] = useState<ProjectEntry[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);

  const [projectLookup, setProjectLookup] = useState<ProjectPicklistEntry[]>([]);
  const [loadingProjectLookup, setLoadingProjectLookup] = useState(false);

  const [statusEntries, setStatusEntries] = useState<StatusEntry[]>([]);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [authError, setAuthError] = useState<string | null>(null);
  const hasProjectLookup = projectLookup.length > 0;

  const projectSuggestions = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    if (hasProjectLookup) {
      for (const item of projectLookup) {
        const label = buildProjectLabel(item);
        if (!label) continue;
        const key = label.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        list.push(label);
      }
    } else {
      for (const item of projects) {
        if (item.Dokumentgeloescht) continue;
        const name = (item.Projektname ?? "").trim();
        if (!name) continue;
        const key = name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        list.push(name);
      }
    }
    list.sort((a, b) => a.localeCompare(b));
    return list;
  }, [hasProjectLookup, projectLookup, projects]);

  const userName = useMemo(() => {
    const first = todayEntries[0] ?? monthEntries[0];
    return first?.Key ? getDisplayUserFromKey(first.Key) : null;
  }, [todayEntries, monthEntries]);

  async function loadToday() {
    setLoadingToday(true);
    try {
      const data = await getDay(todayKey);
      data.sort((a, b) => +new Date(b.Zeit) - +new Date(a.Zeit));
      setTodayEntries(data);
      setAuthError(null);
    } catch (e: unknown) {
      const authMessage = getAuthErrorMessage(e);
      if (authMessage) {
        setAuthError(authMessage);
      } else {
        console.error(e);
      }
    } finally {
      setLoadingToday(false);
    }
  }

  async function loadMonth() {
    setLoadingMonth(true);
    try {
      const data = await getMonth(monthKey);
      data.sort((a, b) => +new Date(b.Zeit) - +new Date(a.Zeit));
      setMonthEntries(data);
      setAuthError(null);
    } catch (e: unknown) {
      const authMessage = getAuthErrorMessage(e);
      if (authMessage) {
        setAuthError(authMessage);
      } else {
        console.error(e);
      }
    } finally {
      setLoadingMonth(false);
    }
  }

  function refreshAll() {
    loadToday();
    loadMonth();
  }

  async function loadProjects() {
    setLoadingProjects(true);
    setProjectsError(null);
    try {
      const data = await getProjects();
      setProjects(Array.isArray(data) ? data : []);
      setAuthError(null);
    } catch (e: unknown) {
      const authMessage = getAuthErrorMessage(e);
      if (authMessage) {
        setProjects([]);
        setProjectsError(authMessage);
        setAuthError(authMessage);
        return;
      }
      const message = e instanceof Error ? e.message : "Projekte konnten nicht geladen werden";
      setProjects([]);
      setProjectsError(message || "Projekte konnten nicht geladen werden");
    } finally {
      setLoadingProjects(false);
    }
  }

  async function loadProjectLookup() {
    setLoadingProjectLookup(true);
    try {
      const data = await getProjectPicklist();
      setProjectLookup(Array.isArray(data) ? data : []);
      setAuthError(null);
    } catch (e: unknown) {
      const authMessage = getAuthErrorMessage(e);
      if (authMessage) {
        setProjectLookup([]);
        setAuthError(authMessage);
        return;
      }
      console.error(e);
    } finally {
      setLoadingProjectLookup(false);
    }
  }

  async function loadStatus() {
    setLoadingStatus(true);
    setStatusError(null);
    try {
      const data = await getCurrentStatus();
      setStatusEntries(Array.isArray(data) ? data : []);
      setAuthError(null);
    } catch (e: unknown) {
      const authMessage = getAuthErrorMessage(e);
      if (authMessage) {
        setStatusEntries([]);
        setStatusError(authMessage);
        setAuthError(authMessage);
        return;
      }
      const message = e instanceof Error ? e.message : "Status konnte nicht geladen werden";
      setStatusEntries([]);
      setStatusError(message || "Status konnte nicht geladen werden");
    } finally {
      setLoadingStatus(false);
    }
  }

  async function ensureProject(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const exists = projects.some(
      (item) =>
        !item.Dokumentgeloescht &&
        (item.Projektname ?? "").toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) return;
    try {
      await createProject({ Projektname: trimmed });
      await loadProjects();
    } catch {
      // ignore suggestion creation errors
    }
  }

  useEffect(() => {
    refreshAll();
    loadProjects();
    loadProjectLookup();
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Header />
      {authError && (
        <div className="mx-auto max-w-6xl px-4">
          <div className="mt-4 rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            {authError}
          </div>
        </div>
      )}
      <AppShell
        active={active}
        onChange={(id) => {
          setActive(id);
          if (id === "time") {
            refreshAll();
            if (!hasProjectLookup && !loadingProjectLookup) loadProjectLookup();
          }
          if (id === "projects") loadProjects();
          if (id === "status") loadStatus();
        }}
        userName={userName}
      >
        {active === "time" && (
          <TimeTracer
            todayKey={todayKey}
            todayEntries={todayEntries}
            loading={loadingToday || loadingMonth}
            onRefresh={refreshAll}
            projectSuggestions={projectSuggestions}
            onProjectUsed={(p) => {
              if (!hasProjectLookup) {
                void ensureProject(p);
              }
            }}
          />
        )}

        {active === "projects" && (
          <Projects
            projects={projects}
            loading={loadingProjects}
            error={projectsError}
            onReload={loadProjects}
          />
        )}

        {active === "reports" && <Reports />}

        {active === "status" && (
          <Status
            entries={statusEntries}
            loading={loadingStatus}
            error={statusError}
            onReload={loadStatus}
          />
        )}
      </AppShell>
    </>
  );
}
