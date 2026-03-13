import { useEffect, useMemo, useState } from "react";
import { createProject, deleteProject } from "../api/domino";
import type { ProjectEntry } from "../api/types";
import { IconClose, IconSearch, IconDelete } from "../components/Icons";
import "./styles/Projects.css";

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
  const [lookupOpen, setLookupOpen] = useState(false);
  const [lookupQuery, setLookupQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const visible = useMemo(() => projects.filter((item) => !item.Dokumentgeloescht), [projects]);
  const sorted = useMemo(
    () => [...visible].sort((a, b) => (a.Projektname ?? "").localeCompare(b.Projektname ?? "")),
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

  const projectNames = useMemo(() => {
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

    names.sort((a, b) => a.localeCompare(b));
    return names;
  }, [sorted]);

  const selectedNameSet = useMemo(() => {
    const set = new Set<string>();
    for (const name of projectNames) {
      set.add(normalizeName(name));
    }
    return set;
  }, [projectNames]);

  // const filteredNames = useMemo(() => {
  //   const query = "search.trim().toLowerCase()";
  //   if (!query) return projectNames;
  //   return projectNames.filter((name) => name.toLowerCase().includes(query));
  // }, [projectNames, search]);

  const lookupNames = useMemo(() => {
    const seen = new Set<string>();
    const names: string[] = [];

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
  }, [lookupProjects]);

  const filteredLookupNames = useMemo(() => {
    const query = lookupQuery.trim().toLowerCase();
    if (!query) return lookupNames;
    return lookupNames.filter((name) => name.toLowerCase().includes(query));
  }, [lookupNames, lookupQuery]);

  const availableLookupCount = useMemo(() => {
    return lookupNames.filter((name) => !selectedNameSet.has(normalizeName(name))).length;
  }, [lookupNames, selectedNameSet]);

  useEffect(() => {
    if (!lookupOpen) return;

    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLookupOpen(false);
        setLookupQuery("");
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [lookupOpen]);

  function closeLookup() {
    setLookupOpen(false);
    setLookupQuery("");
  }

  async function add() {
    const v = value.trim();
    if (!v) return;
    if (selectedNameSet.has(normalizeName(v))) {
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

  async function addFromLookup(name: string) {
    const v = name.trim();
    if (!v) return;
    if (selectedNameSet.has(normalizeName(v))) return;

    setBusy(true);
    setActionError(null);
    try {
      await createProject({ Projektname: v });
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
      setActionError(getErrorMessage(e, "Projekt konnte nicht geloescht werden"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="projects-page">
      <div className="projects-page__header">
        <h2 className="projects-page__title">Projekte</h2>
        <button
          type="button"
          onClick={() => void onReload()}
          disabled={loading || busy}
          aria-label="Aktualisieren"
          className="projects-page__refresh"
        >
          <svg viewBox="0 0 24 24" className="projects-page__refresh-icon" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 0 1 15.2-6.4" />
            <path d="M21 12a9 9 0 0 1-15.2 6.4" />
            <path d="M3 4v5h5" />
            <path d="M21 20v-5h-5" />
          </svg>
        </button>
      </div>

      <p className="projects-page__subtitle">Aktuelle Projekte verwalten</p>

      {error && <div className="projects-page__error">{error}</div>}

      {actionError && <div className="projects-page__error projects-page__error--action">{actionError}</div>}

      <div className="projects-page__add-row">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Projektname.."
          className="projects-page__input projects-page__add-input"
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
        />
        
        <div className="projects-page__add-actions">
          <button
            type="button"
            onClick={add}
            disabled={busy || loading}
            className="projects-page__add-btn"
          >
            Hinzufügen
          </button>

          <button
            type="button"
            onClick={() => {
              if (lookupOpen) {
                closeLookup();
              } else {
                setLookupOpen(true);
              }
            }}
            disabled={busy || loading}
            className="projects-page__lookup-toggle-btn"
            aria-label="Projektakte durchsuchen"
            title="Projektakte durchsuchen"
          >
            <span className="projects-page__lookup-toggle-btn-icon">
              <IconSearch />
            </span>
          </button>
        </div>

      </div>

      {lookupOpen && (
        <div className="projects-page__lookup-overlay" onClick={closeLookup}>
          <div
            className="projects-page__lookup-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Projekt Lookup"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="projects-page__lookup-header">
              <div>
                <div className="projects-page__lookup-title">Projektakte durchsuchen</div>
                <div className="projects-page__lookup-count">{availableLookupCount} verfügbar</div>
              </div>
              <button
                type="button"
                onClick={closeLookup}
                className="projects-page__lookup-close-btn"
              >
                <IconClose className="projects-icon" />
              </button>
            </div>

            <div className="projects-page__lookup-search-row">
              <input
                value={lookupQuery}
                onChange={(e) => setLookupQuery(e.target.value)}
                placeholder="Projekt suchen..."
                className="projects-page__input"
                disabled={busy || loading}
              />
            </div>

            <div className="projects-page__lookup-list">
              {lookupNames.length === 0 && (
                <div className="projects-page__hint">Keine Lookup-Projekte verfügbar.</div>
              )}

              {lookupNames.length > 0 && filteredLookupNames.length === 0 && (
                <div className="projects-page__hint">Keine Treffer im Lookup.</div>
              )}

              {filteredLookupNames.map((name) => {
                const alreadyAdded = selectedNameSet.has(normalizeName(name));
                return (
                  <div key={name} className="projects-page__lookup-item">
                    <div className="projects-page__lookup-name" title={name}>
                      {name}
                    </div>

                    {alreadyAdded ? (
                      <span className="projects-page__lookup-state">Bereits hinzugefügt</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void addFromLookup(name)}
                        disabled={busy || loading}
                        className="projects-page__lookup-add-btn"
                      >
                        Auswählen
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}


      <div className="projects-page__list">
        {loading && <div className="projects-page__hint">Lade Projekte...</div>}

        {!loading && projectNames.length === 0 ? (
          <div className="projects-page__hint">{"Noch keine Projekte."}</div>
        ) : (
          projectNames.map((name) => {
            const removableItem = removableByName.get(normalizeName(name));
            if (!removableItem) return null;
            return (
              <div key={name} className="projects-page__item">
                <div className="projects-page__item-name">{name}</div>
                <button
                  onClick={() => remove(removableItem)}
                  disabled={busy || loading}
                  className="projects-page__remove-btn"
                  title="Entfernen"
                >
                  <IconDelete className="projects-icon" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
