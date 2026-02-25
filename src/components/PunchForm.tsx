import { useState } from "react";
import { createPunch } from "../api/domino";

type Props = {
  onCreated?: () => void;
};

export function PunchForm({ onCreated }: Props) {
  const [buchungstyp, setBuchungstyp] = useState<"0" | "1">("0");
  const [projekt, setProjekt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      await createPunch({ Buchungstyp: buchungstyp, Projekt: projekt });
      setProjekt("");
      onCreated?.();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to create punch";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-100">Create Punch</h3>
        <span className="text-xs text-slate-500">POST /Dokument?form=Stempeluhr</span>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-slate-400">Buchungstyp</label>
          <select
            value={buchungstyp}
            onChange={(e) => setBuchungstyp(e.target.value as "0" | "1")}
            className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-slate-600"
          >
            <option value="0">0</option>
            <option value="1">1</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="text-xs text-slate-400">Projekt</label>
          <input
            value={projekt}
            onChange={(e) => setProjekt(e.target.value)}
            placeholder="(optional) project name"
            className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-slate-600"
          />
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-xl border border-red-900/50 bg-red-950/40 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <button
        onClick={submit}
        disabled={loading}
        className="mt-4 inline-flex items-center justify-center rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-white disabled:opacity-60"
      >
        {loading ? "Saving..." : "Save"}
      </button>
    </div>
  );
}
