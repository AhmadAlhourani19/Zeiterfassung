import type { StempeluhrEntry } from "../api/types";
import { bookingBadgeClasses, bookingLabel } from "../api/grouping";

function readTaetigkeit(entry: StempeluhrEntry) {
  return (entry.Taetigkeit ?? entry["T\u00e4tigkeit"] ?? "").trim();
}

export function PunchTable({ title, entries }: { title: string; entries: StempeluhrEntry[] }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        <span className="text-sm text-slate-500">{entries.length} Buchungen</span>
      </div>

      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-5 py-3 font-medium">Zeit</th>
              <th className="text-left px-5 py-3 font-medium">Typ</th>
              <th className="text-left px-5 py-3 font-medium">Projekt</th>
              <th className="text-left px-5 py-3 font-medium">Taetigkeit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {entries.map((e) => {
              const taetigkeit = readTaetigkeit(e);
              return (
                <tr key={e["@unid"]} className="hover:bg-slate-50">
                  <td className="px-5 py-3">{new Date(e.Zeit).toLocaleString()}</td>
                  <td className="px-5 py-3">
                    <span
                      className={[
                        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1",
                        bookingBadgeClasses(e.Buchungstyp),
                      ].join(" ")}
                    >
                      {bookingLabel(e.Buchungstyp)}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-700">
                    {e.Projekt || <span className="text-slate-400">-</span>}
                  </td>
                  <td className="px-5 py-3 text-slate-700">
                    {taetigkeit || <span className="text-slate-400">-</span>}
                  </td>
                </tr>
              );
            })}

            {entries.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-slate-500">
                  Keine Buchungen gefunden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
