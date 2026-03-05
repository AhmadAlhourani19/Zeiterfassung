import { useState, type ReactNode } from "react";

export type NavId = "time" | "projects" | "reports" | "status";

export const IconTime = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    <path
      d="M12 7v5l3 2"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle
      cx="12"
      cy="12"
      r="9"
      stroke="currentColor"
      strokeWidth="2"
    />
  </svg>
);

const IconProjects = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" data-slot="icon" aria-hidden="true">
    <path d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" stroke-linecap="round" stroke-linejoin="round"></path>
  </svg>
);

export const IconReports = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    {/* Dokument */}
    <path d="M14 3H7.5A2.5 2.5 0 0 0 5 5.5v13A2.5 2.5 0 0 0 7.5 21h9A2.5 2.5 0 0 0 19 18.5V8l-5-5Z" />

    {/* Umgeknickte Ecke */}
    <path d="M14 3v5h5" />

    {/* Textlinien */}
    <path d="M9 13h6M9 17h4" />
  </svg>
);

export const IconStatus = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
    {/* Kreis */}
    <circle
      cx="12"
      cy="12"
      r="9"
      stroke="currentColor"
      strokeWidth="2"
    />
    {/* Häkchen */}
    <path
      d="M8 12l3 3 5-6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

type NavItem = { id: NavId; label: string; icon: ReactNode };
const nav: NavItem[] = [
  { id: "time", label: "Time Tracer", icon: <IconTime className="h-5 w-5" /> },
  { id: "projects", label: "Projekte", icon: <IconProjects className="h-5 w-5" /> },
  { id: "reports", label: "Berichte", icon: <IconReports className="h-5 w-5" /> },
  { id: "status", label: "Status", icon: <IconStatus className="h-5 w-5" /> },
];

export function AppShell({
  active,
  onChange,
  userName,
  authError,
  children,
}: {
  active: NavId;
  onChange: (id: NavId) => void;
  userName?: string | null;
  authError?: string | null;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const displayUser = userName?.trim() ? userName : "-";

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
          aria-label="Menu schliessen"
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
            <div className="text-lg font-semibold">{displayUser}</div>
            {authError && (
              <div className="mt-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                {authError}
              </div>
            )}
          </div>

          <nav className="space-y-0">
            {nav.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onChange(item.id);
                  setMobileOpen(false);
                }}
                className={[
                  "group w-full flex items-center rounded-md px-4 py-2 text-sm font-normal transition",
                  active === item.id
                    ? "text-blue-600"
                    : "hover:bg-slate-100 text-slate-800",
                ].join(" ")}
              >
                <span className="flex items-center gap-3 w-full">
                  <span className="flex items-center justify-center h-5 w-5">
                    {item.icon}
                  </span>
                  <span className="leading-none">{item.label}</span>
                </span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between rounded-3xl border border-slate-200 bg-white px-4 py-2 shadow-sm md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-2 text-slate-700 shadow-sm hover:bg-slate-50"
            aria-label="Menu oeffnen"
          >
            <span className="flex flex-col gap-1">
              <span className="h-0.5 w-5 rounded-full bg-slate-700"></span>
              <span className="h-0.5 w-5 rounded-full bg-slate-700"></span>
              <span className="h-0.5 w-5 rounded-full bg-slate-700"></span>
            </span>
          </button>
          <div className="text-sm font-semibold">{nav.find((item) => item.id === active)?.label}</div>
          <div className="text-xs text-slate-500">{displayUser}</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
          <aside className="hidden md:block rounded-3xl border border-slate-200 bg-white p-2 shadow-sm">
            <div className="px-4 mb-4">
              <div className="text-xs text-slate-500">Angemeldet als</div>
              <div className="text-lg font-semibold">{displayUser}</div>
              {authError && (
                <div className="mt-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                  {authError}
                </div>
              )}
            </div>

            <nav className="space-y-0">
              {nav.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onChange(item.id)}
                  className={[
                    "group w-full flex items-center rounded-md px-4 py-2 text-sm font-normal transition",
                    active === item.id
                      ? "bg-blue-100 text-slate-800"
                      : "hover:bg-slate-100",
                  ].join(" ")}
                >
                  <span className="flex items-center gap-3 w-full">
                    <span className="flex items-center justify-center h-5 w-5">
                      {item.icon}
                    </span>
                    <span className="leading-none">{item.label}</span>
                  </span>
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
