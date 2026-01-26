import { useMemo, useState } from "react";
import { createProject, deleteProject } from "../api/domino";
import type { ProjectEntry } from "../api/types";

type Props = {
  projects: ProjectEntry[];
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

export function Projects({ projects, loading, error, onReload }: Props) {
  const [value, setValue] = useState("");
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

  async function add() {
    const v = value.trim();
    if (!v) return;
    if (sorted.some((item) => normalizeName(item.Projektname ?? "") === normalizeName(v))) {
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
          onClick={() => void onReload()}
          disabled={loading || busy}
          className="rounded-2xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Aktualisieren
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

      <div className="mt-4 space-y-2">
        {loading && <div className="text-sm text-slate-500">Lade Projekte...</div>}

        {!loading && sorted.length === 0 ? (
          <div className="text-sm text-slate-500">Noch keine Projekte.</div>
        ) : (
          sorted.map((item) => (
            <div
              key={item["@unid"]}
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <div className="text-sm font-medium">{item.Projektname ?? "(ohne Name)"}</div>
              <button
                onClick={() => remove(item)}
                disabled={busy || loading}
                className="text-sm text-rose-700 hover:text-rose-900 disabled:opacity-60"
              >
                Entfernen
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
