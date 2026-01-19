import { useEffect, useMemo, useState } from "react";
import { Header } from "./components/Header";
import { AppShell } from "./layout/AppShell";
import type { NavId } from "./layout/AppShell";
import { TimeTracer } from "./pages/TimeTracer";
import { Projects } from "./pages/Projects";
import { Reports } from "./pages/Reports";
import { getDay, getMonth } from "./api/domino";
import type { StempeluhrEntry } from "./api/types";
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

  const [projects, setProjects] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem("pmzeiterfassung.projects");
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  });

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

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Header />
      <AppShell active={active} onChange={setActive} userName={userName}>
        {active === "time" && (
          <TimeTracer
            todayKey={todayKey}
            todayEntries={todayEntries}
            loading={loadingToday || loadingMonth}
            onRefresh={refreshAll}
            projectSuggestions={projects}
            onProjectUsed={(p) => {
              // add recent project automatically if new
              if (!p) return;
              setProjects((prev) => {
                if (prev.some((x) => x.toLowerCase() === p.toLowerCase())) return prev;
                const next = [p, ...prev].slice(0, 25);
                localStorage.setItem("pmzeiterfassung.projects", JSON.stringify(next));
                return next;
              });
            }}
          />
        )}

        {active === "projects" && (
          <Projects
            onProjectsChange={(p) => {
              setProjects(p);
            }}
          />
        )}

        {active === "reports" && <Reports />}
      </AppShell>
    </>
  );
}
