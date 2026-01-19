import type { ReactNode } from "react";

export type NavId = "time" | "projects" | "reports";

const nav: { id: NavId; label: string }[] = [
  { id: "time", label: "Time Tracer" },
  { id: "projects", label: "Projekte" },
  { id: "reports", label: "Berichte" },
];

export function AppShell({
  active,
  onChange,
  userName,
  children,
}: {
  active: NavId;
  onChange: (id: NavId) => void;
  userName?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
          <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4">
              <div className="text-xs text-slate-500">Angemeldet als</div>
              <div className="text-lg font-semibold">{userName ?? "—"}</div>
            </div>

            <nav className="space-y-2">
              {nav.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onChange(item.id)}
                  className={[
                    "w-full text-left rounded-2xl px-4 py-3 text-sm font-medium transition",
                    active === item.id
                      ? "bg-slate-900 text-white"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-800",
                  ].join(" ")}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="mt-6 text-xs text-slate-400">
              Stempeln wirkt nur auf <span className="font-medium">heute</span>.
              Berichte können andere Tage/Monate anzeigen.
            </div>
          </aside>

          <main>{children}</main>
        </div>
      </div>
    </div>
  );
}