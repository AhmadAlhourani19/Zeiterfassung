import { useEffect, useMemo, useState } from "react";
import { Header } from "./components/Header";
import { AppShell } from "./layout/AppShell";
import type { NavId } from "./layout/AppShell";
import { TimeTracer } from "./pages/TimeTracer";
import { Projects } from "./pages/Projects";
import { Reports } from "./pages/Reports";
import { Status } from "./pages/Status";
import { createProject, getCurrentStatus, getDay, getMonth, getProjects } from "./api/domino";
import type { ProjectEntry, StatusEntry, StempeluhrEntry } from "./api/types";
import { formatDDMMYYYY, formatMMYYYY, getDisplayUserFromKey } from "./api/grouping";

function currentKeys() {
  const now = new Date();
  return { todayKey: formatDDMMYYYY(now), monthKey: formatMMYYYY(now) };
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

  const [statusEntries, setStatusEntries] = useState<StatusEntry[]>([]);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const projectSuggestions = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const item of projects) {
      if (item.Dokumentgeloescht) continue;
      const name = (item.Projektname ?? "").trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      list.push(name);
    }
    return list;
  }, [projects]);

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
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Projekte konnten nicht geladen werden";
      setProjects([]);
      setProjectsError(message || "Projekte konnten nicht geladen werden");
    } finally {
      setLoadingProjects(false);
    }
  }

  async function loadStatus() {
    setLoadingStatus(true);
    setStatusError(null);
    try {
      const data = await getCurrentStatus();
      setStatusEntries(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
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
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Header />
      <AppShell
        active={active}
        onChange={(id) => {
          setActive(id);
          if (id === "time") refreshAll();
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
              void ensureProject(p);
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
