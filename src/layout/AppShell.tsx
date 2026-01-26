import { useState, type ReactNode } from "react";

export type NavId = "time" | "projects" | "reports" | "status";

const nav: { id: NavId; label: string }[] = [
  { id: "time", label: "Time Tracer" },
  { id: "projects", label: "Projekte" },
  { id: "reports", label: "Berichte" },
  { id: "status", label: "Status" },
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
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div
        className={[
          "fixed inset-0 z-40 md:hidden transition-opacity duration-200",
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        ].join(" ")}
      >
        <button
          type="button"
          aria-label="Menü schließen"
          className="absolute inset-0 h-full w-full bg-slate-900/40"
          onClick={() => setMobileOpen(false)}
        />
        <div
          className={[
            "absolute left-0 top-0 h-full w-[280px] border-r border-slate-200 bg-white p-5 shadow-2xl",
            "transition-transform duration-300 ease-out",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          ].join(" ")}
        >
          <div className="mb-6">
            <div className="text-xs text-slate-500">Angemeldet als</div>
            <div className="text-lg font-semibold">{userName ?? "—"}</div>
          </div>

          <nav className="space-y-2">
            {nav.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onChange(item.id);
                  setMobileOpen(false);
                }}
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
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between rounded-3xl border border-slate-200 bg-white px-4 py-3 shadow-sm md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 py-2 text-slate-700 shadow-sm hover:bg-slate-50"
            aria-label="Menü öffnen"
          >
            <span className="flex flex-col gap-1">
              <span className="h-0.5 w-5 rounded-full bg-slate-700"></span>
              <span className="h-0.5 w-5 rounded-full bg-slate-700"></span>
              <span className="h-0.5 w-5 rounded-full bg-slate-700"></span>
            </span>
          </button>
          <div className="text-sm font-semibold">{nav.find((item) => item.id === active)?.label}</div>
          <div className="text-xs text-slate-500">{userName ?? "—"}</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
          <aside className="hidden md:block rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
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
          </aside>

          <main>{children}</main>
        </div>
      </div>
    </div>
  );
}
