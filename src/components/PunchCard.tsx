import { useMemo, useState } from "react";
import { createPunch } from "../api/domino";
import type { StempeluhrEntry } from "../api/types";
import { bookingLabel } from "../api/grouping";

type Props = {
  todayEntries: StempeluhrEntry[];
  onPunched: () => void;
};

function getLatest(entries: StempeluhrEntry[]) {
  if (!entries.length) return null;
  return [...entries].sort((a, b) => +new Date(b.Zeit) - +new Date(a.Zeit))[0];
}

export function PunchCard({ todayEntries, onPunched }: Props) {
  const latest = useMemo(() => getLatest(todayEntries), [todayEntries]);

  const isClockedIn = latest?.Buchungstyp === "0";
  const status = isClockedIn ? "Eingestempelt" : "Ausgestempelt";
  const statusHint = isClockedIn
    ? "Du bist aktuell angemeldet."
    : "Du bist aktuell abgemeldet.";
  const anmeldenLabel = isClockedIn ? "Projekt starten" : "Anmelden";

  const [projekt, setProjekt] = useState("");
  const [loadingAction, setLoadingAction] = useState<"0" | "1" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function punch(action: "0" | "1") {
    setLoadingAction(action);
    setError(null);
    try {
      await createPunch({
        Buchungstyp: action,
        Projekt: action === "0" ? projekt : "",
      });
      setProjekt("");
      onPunched();
    } catch (e: any) {
      setError(e?.message ?? "Buchung fehlgeschlagen");
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-slate-500">Status</div>
          <div className="mt-1 text-2xl font-semibold">{status}</div>
          <div className="mt-1 text-sm text-slate-600">{statusHint}</div>

          {latest && (
            <div className="mt-3 text-xs text-slate-500">
              Letzte Buchung: <span className="font-medium">{bookingLabel(latest.Buchungstyp)}</span>{" "}
              um <span className="font-medium">{new Date(latest.Zeit).toLocaleTimeString()}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          <button
            onClick={() => punch("0")}
            disabled={loadingAction !== null}
            className={[
              "rounded-2xl px-5 py-3 text-sm font-semibold shadow-sm",
              "transition active:scale-[0.99] disabled:opacity-60",
              "bg-emerald-600 text-white hover:bg-emerald-700",
            ].join(" ")}
          >
            {loadingAction === "0" ? "Speichern..." : anmeldenLabel}
          </button>
          <button
            onClick={() => punch("1")}
            disabled={!isClockedIn || loadingAction !== null}
            className={[
              "rounded-2xl px-5 py-2 text-xs font-semibold shadow-sm",
              "transition active:scale-[0.99] disabled:opacity-60",
              "bg-rose-600 text-white hover:bg-rose-700",
            ].join(" ")}
          >
            {loadingAction === "1" ? "Speichern..." : "Abmelden"}
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-2">
        <label className="text-xs text-slate-500">Projekt</label>
        <input
          value={projekt}
          onChange={(e) => setProjekt(e.target.value)}
          placeholder="z.B. HPM-123 / Kundenprojekt"
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
        />
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {error}
        </div>
      )}
    </div>
  );
}
