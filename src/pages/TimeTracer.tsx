import { useEffect, useMemo, useState } from "react";
import type { StempeluhrEntry } from "../api/types";
import { buildIntervalsForDay, calcWorkAndBreak, fmtHM } from "../utils/timeCalc";
import { createPunch, getUserStatusLookup, updatePunchStatus } from "../api/domino";

function latestEntry(entries: StempeluhrEntry[]) {
  if (!entries.length) return null;
  return [...entries].sort((a, b) => +new Date(b.Zeit) - +new Date(a.Zeit))[0];
}

export function TimeTracer({
  todayKey,
  todayEntries,
  loading,
  onRefresh,
  projectSuggestions,
  onProjectUsed,
}: {
  todayKey: string;
  todayEntries: StempeluhrEntry[];
  loading: boolean;
  onRefresh: () => void;
  projectSuggestions: string[];
  onProjectUsed: (p: string) => void;
}) {
  const latest = useMemo(() => latestEntry(todayEntries), [todayEntries]);
  const statusType = latest?.Buchungstyp ?? null;
  const isCheckedIn = statusType === "0";
  const isOnBreak = statusType === "2";

  const intervals = useMemo(() => buildIntervalsForDay(todayEntries, new Date()), [todayEntries]);
  const { breakMinutes, netMinutes } = useMemo(
    () => calcWorkAndBreak(intervals),
    [intervals]
  );

  const [projekt, setProjekt] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [statusUnid, setStatusUnid] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    getUserStatusLookup()
      .then((res) => {
        if (!mounted) return;
        setStatusUnid(res.unid ?? null);
      })
      .catch(() => {
        if (!mounted) return;
        setStatusUnid(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  async function updateStatus(type: "0" | "1" | "2", project: string) {
    const cleanedProject = project.trim() || latest?.Projekt?.trim() || "";
    let unid = statusUnid;
    if (!unid) {
      const lookup = await getUserStatusLookup();
      unid = lookup.unid ?? null;
      setStatusUnid(unid);
    }
    if (!unid) return;
    const payload: {
      Buchungstyp: "0" | "1" | "2";
      Zeit: string;
      Projekt?: string;
      Projektname?: string;
    } = {
      Buchungstyp: type,
      Zeit: new Date().toISOString(),
    };

    if (cleanedProject) {
      payload.Projekt = cleanedProject;
      payload.Projektname = cleanedProject;
    } else {
      payload.Projekt = "";
      payload.Projektname = "";
    }

    await updatePunchStatus(unid, payload);
  }

  async function doPunch(type: "0" | "1" | "2") {
    setBusy(true);
    setErr(null);
    try {
      const trimmed = projekt.trim();
      await createPunch({ Buchungstyp: type, Projekt: trimmed });
      try {
        await updateStatus(type, trimmed);
      } catch {
        // ignore status update errors for now
      }
      if (projekt.trim()) onProjectUsed(projekt.trim());
      setProjekt("");
      onRefresh();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Buchung fehlgeschlagen";
      setErr(message || "Buchung fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="order-last md:order-first">
            <div className="text-sm text-slate-500">Heute</div>
            <div className="mt-1 text-2xl font-semibold">{todayKey}</div>
            <div className="mt-2 text-sm text-slate-600">
              Status:{" "}
              <span className="font-semibold">
                {isCheckedIn ? "Eingestempelt" : isOnBreak ? "In der Pause" : "Ausgestempelt"}
              </span>
              {latest && (
                <span className="text-slate-500">
                  {" "}• {new Date(latest.Zeit).toLocaleTimeString()}
                </span>
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Stat title="Arbeitszeit (netto)" value={fmtHM(netMinutes)} />
              <Stat title="Pausen genommen" value={fmtHM(breakMinutes)} />
            </div>
          </div>    

          <div className="w-full md:w-[360px] order-first md:order-last">
            <label className="text-xs text-slate-500">Projekt (optional)</label>
            <input
              value={projekt}
              onChange={(e) => setProjekt(e.target.value)}
              placeholder="z.B. Kundenprojekt / Ticket …"
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
            />

            {projectSuggestions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {projectSuggestions.slice(0, 10).map((p) => (
                  <button
                    key={p}
                    onClick={() => setProjekt(p)}
                    className="max-w-[220px] truncate rounded-full bg-slate-100 hover:bg-slate-200 px-3 py-1 text-xs text-slate-700"
                    title={p}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-4 flex flex-col gap-2">
              {!isCheckedIn && !isOnBreak ? (
                <button
                  disabled={busy || loading}
                  onClick={() => doPunch("0")}
                  className="rounded-2xl bg-emerald-600 text-white px-5 py-3 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"
                >
                  {busy ? "Speichern…" : "Anmelden"}
                </button>
              ) : isOnBreak ? (
                <>
                  <button
                    disabled={busy || loading}
                    onClick={() => doPunch("0")}
                    className="rounded-2xl bg-emerald-600 text-white px-5 py-3 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {busy ? "Speichern…" : "Pause beenden"}
                  </button>
                  <button
                    disabled={busy || loading}
                    onClick={() => doPunch("1")}
                    className="rounded-2xl bg-rose-600 text-white px-5 py-3 text-sm font-semibold hover:bg-rose-700 disabled:opacity-60"
                  >
                    {busy ? "Speichern…" : "Abmelden"}
                  </button>
                </>
              ) : (
                <>
                  <button
                    disabled={busy || loading}
                    onClick={() => doPunch("0")}
                    className="rounded-2xl bg-indigo-600 text-white px-5 py-3 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60"
                    title="Neue Anmeldung = Projektwechsel"
                  >
                    {busy ? "Speichern…" : "Projekt wechseln"}
                  </button>

                  <button
                    disabled={busy || loading}
                    onClick={() => doPunch("2")}
                    className="rounded-2xl bg-amber-500 text-white px-5 py-3 text-sm font-semibold hover:bg-amber-600 disabled:opacity-60"
                  >
                    {busy ? "Speichern…" : "Pause"}
                  </button>

                  <button
                    disabled={busy || loading}
                    onClick={() => doPunch("1")}
                    className="rounded-2xl bg-rose-600 text-white px-5 py-3 text-sm font-semibold hover:bg-rose-700 disabled:opacity-60"
                  >
                    {busy ? "Speichern…" : "Abmelden"}
                  </button>
                </>
              )}
            </div>

            {err && (
              <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                {err}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({
  title,
  value,
  hint,
  highlight,
}: {
  title: string;
  value: string;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <div className={["rounded-2xl border p-4", highlight ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-slate-50"].join(" ")}>
      <div className="text-xs text-slate-500">{title}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-600">{hint}</div>}
    </div>
  );
}
