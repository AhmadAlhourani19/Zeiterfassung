import { useEffect, useMemo, useState } from "react";

const LS_KEY = "pmzeiterfassung.projects";

function loadProjects(): string[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function saveProjects(items: string[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(items));
}

export function Projects({ onProjectsChange }: { onProjectsChange: (p: string[]) => void }) {
  const [items, setItems] = useState<string[]>(() => loadProjects());
  const [value, setValue] = useState("");

  useEffect(() => {
    saveProjects(items);
    onProjectsChange(items);
  }, [items, onProjectsChange]);

  const sorted = useMemo(() => [...items].sort((a, b) => a.localeCompare(b)), [items]);

  function add() {
    const v = value.trim();
    if (!v) return;
    if (items.some((x) => x.toLowerCase() === v.toLowerCase())) {
      setValue("");
      return;
    }
    setItems([...items, v]);
    setValue("");
  }

  function remove(p: string) {
    setItems(items.filter((x) => x !== p));
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-semibold">Projekte</h2>
      <p className="mt-1 text-sm text-slate-500">
        Lege eigene Projekte an. Diese werden lokal im Browser gespeichert.
      </p>

      <div className="mt-4 flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Projektname…"
          className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
        />
        <button
          onClick={add}
          className="rounded-2xl bg-slate-900 text-white px-4 py-3 text-sm font-semibold hover:bg-black"
        >
          Hinzufügen
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {sorted.length === 0 ? (
          <div className="text-sm text-slate-500">Noch keine Projekte.</div>
        ) : (
          sorted.map((p) => (
            <div key={p} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-sm font-medium">{p}</div>
              <button
                onClick={() => remove(p)}
                className="text-sm text-rose-700 hover:text-rose-900"
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
