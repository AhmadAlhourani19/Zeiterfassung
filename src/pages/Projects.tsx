import { useMemo, useState } from "react";
import { createProject, deleteProject } from "../api/domino";
import type { ProjectEntry } from "../api/types";

type Props = {
  projects: ProjectEntry[];
  lookupProjects?: string[];
  loading: boolean;
  error?: string | null;
  onReload: () => Promise<void>;
};

function normalizeName(value: string) {
  return value.trim().toLowerCase();
}

function getErrorMessage(e: unknown, fallback: string) {
  if (e instanceof Error && e.message) return e.message;
  return fallback;
}

export function Projects({ projects, lookupProjects = [], loading, error, onReload }: Props) {
  const [value, setValue] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const visible = useMemo(
    () => projects.filter((item) => !item.Dokumentgeloescht),
    [projects]
  );
  const sorted = useMemo(
    () =>
      [...visible].sort((a, b) =>
        (a.Projektname ?? "").localeCompare(b.Projektname ?? "")
      ),
    [visible]
  );
  const removableByName = useMemo(() => {
    const map = new Map<string, ProjectEntry>();
    for (const item of sorted) {
      const name = (item.Projektname ?? "").trim();
      if (!name) continue;
      const key = normalizeName(name);
      if (!map.has(key)) map.set(key, item);
    }
    return map;
  }, [sorted]);
  const allProjectNames = useMemo(() => {
    const seen = new Set<string>();
    const names: string[] = [];

    for (const item of sorted) {
      const name = (item.Projektname ?? "").trim();
      if (!name) continue;
      const key = normalizeName(name);
      if (seen.has(key)) continue;
      seen.add(key);
      names.push(name);
    }

    for (const name of lookupProjects) {
      const trimmed = name.trim();
      if (!trimmed) continue;
      const key = normalizeName(trimmed);
      if (seen.has(key)) continue;
      seen.add(key);
      names.push(trimmed);
    }

    names.sort((a, b) => a.localeCompare(b));
    return names;
  }, [lookupProjects, sorted]);
  const filteredNames = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return allProjectNames;
    return allProjectNames.filter((name) =>
      name.toLowerCase().includes(query)
    );
  }, [allProjectNames, search]);

  async function add() {
    const v = value.trim();
    if (!v) return;
    if (allProjectNames.some((name) => normalizeName(name) === normalizeName(v))) {
      setValue("");
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      await createProject({ Projektname: v });
      setValue("");
      await onReload();
    } catch (e: unknown) {
      setActionError(getErrorMessage(e, "Projekt konnte nicht erstellt werden"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: ProjectEntry) {
    if (!item["@unid"]) return;
    setBusy(true);
    setActionError(null);
    try {
      await deleteProject(item["@unid"]);
      await onReload();
    } catch (e: unknown) {
      setActionError(getErrorMessage(e, "Projekt konnte nicht gelöscht werden"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Projekte</h2>
        <button
          type="button"
          onClick={() => void onReload()}
          disabled={loading || busy}
          aria-label="Aktualisieren"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 text-slate-600 hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 0 1 15.2-6.4" />
            <path d="M21 12a9 9 0 0 1-15.2 6.4" />
            <path d="M3 4v5h5" />
            <path d="M21 20v-5h-5" />
          </svg>
        </button>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Projekte werden vom Server geladen.
      </p>

      {error && (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {actionError && (
        <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {actionError}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Projektname..."
          className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
        />
        <button
          onClick={add}
          disabled={busy || loading}
          className="rounded-2xl bg-slate-900 text-white px-4 py-3 text-sm font-semibold hover:bg-black disabled:opacity-60"
        >
          Hinzufügen
        </button>
      </div>

      <div className="mt-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Projekt suchen..."
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
        />
      </div>

      <div className="mt-4 space-y-2">
        {loading && <div className="text-sm text-slate-500">Lade Projekte...</div>}

        {!loading && filteredNames.length === 0 ? (
          <div className="text-sm text-slate-500">
            {search.trim() ? "Keine Treffer." : "Noch keine Projekte."}
          </div>
        ) : (
          filteredNames.map((name) => {
            const removableItem = removableByName.get(normalizeName(name));
            return (
            <div
              key={name}
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <div className="text-sm font-medium">{name}</div>
              {removableItem ? (
                <button
                  onClick={() => remove(removableItem)}
                  disabled={busy || loading}
                  className="text-sm text-rose-700 hover:text-rose-900 disabled:opacity-60"
                >
                  Entfernen
                </button>
              ) : (
                <span className="text-xs text-slate-400">Lookup</span>
              )}
            </div>
            );
          })
        )}
      </div>
    </div>
  );
}
