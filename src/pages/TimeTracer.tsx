import { useMemo, useState } from "react";
import type { StempeluhrEntry } from "../api/types";
import { bookingLabel } from "../api/grouping";
import { buildIntervalsForDay, calcWorkAndBreak, fmtHM } from "../utils/timeCalc";
import { createPunch } from "../api/domino";

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
  const isCheckedIn = !!latest && latest.Buchungstyp === "0"; // last was Anmeldung => currently in

  const intervals = useMemo(() => buildIntervalsForDay(todayEntries, new Date()), [todayEntries]);
  const { workMinutes, breakMinutes, requiredBreak, missingBreak, netMinutes } = useMemo(
    () => calcWorkAndBreak(intervals),
    [intervals]
  );

  const [projekt, setProjekt] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function doPunch(type: "0" | "1") {
    setBusy(true);
    setErr(null);
    try {
      await createPunch({ Buchungstyp: type, Projekt: projekt.trim() });
      if (projekt.trim()) onProjectUsed(projekt.trim());
      setProjekt("");
      onRefresh();
    } catch (e: any) {
      setErr(e?.message ?? "Buchung fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="text-sm text-slate-500">Heute</div>
            <div className="mt-1 text-2xl font-semibold">{todayKey}</div>
            <div className="mt-2 text-sm text-slate-600">
              Status:{" "}
              <span className="font-semibold">
                {isCheckedIn ? "Eingestempelt" : "Ausgestempelt"}
              </span>
              {latest && (
                <>
                  {" "}• Letzte Buchung:{" "}
                  <span className="font-medium">{bookingLabel(latest.Buchungstyp)}</span>{" "}
                  um <span className="font-medium">{new Date(latest.Zeit).toLocaleTimeString()}</span>
                </>
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Stat title="Arbeitszeit (brutto)" value={fmtHM(workMinutes)} />
              <Stat title="Pausen genommen" value={fmtHM(breakMinutes)} />
              <Stat title="Pause erforderlich" value={fmtHM(requiredBreak)} />
              <Stat
                title="Arbeitszeit (netto)"
                value={fmtHM(netMinutes)}
                hint={missingBreak > 0 ? `Fehlende Pause: ${fmtHM(missingBreak)}` : "OK"}
                highlight={missingBreak > 0}
              />
            </div>
          </div>

          <div className="w-full md:w-[360px]">
            <label className="text-xs text-slate-500">Projekt (optional)</label>
            <input
              value={projekt}
              onChange={(e) => setProjekt(e.target.value)}
              placeholder="z.B. Kundenprojekt / Ticket …"
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
            />

            {projectSuggestions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {projectSuggestions.slice(0, 8).map((p) => (
                  <button
                    key={p}
                    onClick={() => setProjekt(p)}
                    className="rounded-full bg-slate-100 hover:bg-slate-200 px-3 py-1 text-xs text-slate-700"
                    title="Projekt übernehmen"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-4 flex flex-col gap-2">
              {!isCheckedIn ? (
                <button
                  disabled={busy || loading}
                  onClick={() => doPunch("0")}
                  className="rounded-2xl bg-emerald-600 text-white px-5 py-3 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"
                >
                  {busy ? "Speichern…" : "Anmelden"}
                </button>
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

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold">Arbeitsphasen (heute)</h3>
        <div className="mt-3 space-y-2">
          {intervals.length === 0 ? (
            <div className="text-sm text-slate-500">Noch keine Arbeitsphasen.</div>
          ) : (
            intervals.map((it, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
              >
                <div className="text-sm">
                  <span className="font-medium">
                    {it.start.toLocaleTimeString()} – {it.end.toLocaleTimeString()}
                  </span>
                  {it.project ? (
                    <span className="text-slate-600"> • {it.project}</span>
                  ) : (
                    <span className="text-slate-400"> • (ohne Projekt)</span>
                  )}
                </div>
                <div className="text-sm text-slate-600">{fmtHM(Math.round((+it.end - +it.start) / 60000))}</div>
              </div>
            ))
          )}
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
