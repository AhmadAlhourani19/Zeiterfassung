import type React from "react";

export const IconClose = (props: React.SVGProps<SVGSVGElement>) => (
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
    <path d="M6 6l12 12M18 6l-12 12" />
  </svg>
);


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

export const IconProjects = (props: React.SVGProps<SVGSVGElement>) => (
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
    {/* Ordner */}
    <path d="M3.5 8.5V7a2 2 0 0 1 2-2h4l2 2h6.5a2 2 0 0 1 2 2v1.5" />
    <path d="M3.5 8.5h17l-1.5 8.5a2 2 0 0 1-2 1.5H6a2 2 0 0 1-2-1.5L3.5 8.5Z" />
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

    {/* Balken / Report */}
    <path d="M9 17v-3" />
    <path d="M12 17v-6" />
    <path d="M15 17v-4" />
  </svg>
);

export const IconSearch = (props: React.SVGProps<SVGSVGElement>) => (
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
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </svg>
);

export const IconDelete = (props: React.SVGProps<SVGSVGElement>) => (
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
    {/* Deckel */}
    <path d="M9 3h6M4 7h16" />

    {/* Papierkorb */}
    <path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />

    {/* Linien innen */}
    <path d="M10 11v6M14 11v6" />
  </svg>
);

export const IconAnmelden = (props: React.SVGProps<SVGSVGElement>) => (
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
    {/* Monitor */}
    <rect x="3" y="4" width="18" height="12" rx="2" />

    {/* Standfuß */}
    <path d="M8 20h8M12 16v4" />

    {/* Login Pfeil */}
    <path d="M9 10h6" />
    <path d="M12 8l3 2-3 2" />
  </svg>
);

export const IconPause = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 22 22"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    {/* Runde Tasse (leicht größer) */}
    <path d="M4.5 8.5h11v6.5a3.8 3.8 0 0 1-3.8 3.8h-3.4A3.8 3.8 0 0 1 4.5 15V8.5Z" />

    {/* Henkel */}
    <path d="M15.5 9.5h2.3a2.8 2.8 0 0 1 0 5.5h-2.3" />

    {/* Unterteller */}
    <path d="M4 19.5h13" />

    {/* Dampf */}
    <path d="M8 3.8c0 1 1 1.5 1 2.6S8 8.2 8 9.2" />
    <path d="M11.2 3.8c0 1 1 1.5 1 2.6S11.2 8.2 11.2 9.2" />
  </svg>
);

export const IconAbmelden = (props: React.SVGProps<SVGSVGElement>) => (
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
    <path d="M9 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3" />
    <path d="M14 7l5 5-5 5" />
    <path d="M20 12H9" />
  </svg>
);

export const IconStart = (props: React.SVGProps<SVGSVGElement>) => (
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
    <path d="M6.5 5v14l11-7-11-7Z" />
  </svg>
);

export const IconStatus = (props: React.SVGProps<SVGSVGElement>) => (
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
    {/* mittlere Person */}
    <circle cx="12" cy="8" r="3" />
    <path d="M6.5 18c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />

    {/* linke Person */}
    <circle cx="5" cy="9" r="2.5" />
    <path d="M1.5 18c0-2.2 1.8-3.8 3.5-4.2" />

    {/* rechte Person */}
    <circle cx="19" cy="9" r="2.5" />
    <path d="M22.5 18c0-2.2-1.8-3.8-3.5-4.2" />
  </svg>
);

export const IconMore = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <circle cx="5" cy="12" r="1.5" />
    <circle cx="12" cy="12" r="1.5" />
    <circle cx="19" cy="12" r="1.5" />
  </svg>
);

export const IconProjekt = (props: React.SVGProps<SVGSVGElement>) => (
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
    <path d="M3.5 8.5V7a2 2 0 0 1 2-2h4l2 2h6.5a2 2 0 0 1 2 2v1.5" />
    <path d="M3.5 8.5h17l-1.5 8.5a2 2 0 0 1-2 1.5H6a2 2 0 0 1-2-1.5L3.5 8.5Z" />
  </svg>
);

export const IconTaetigkeit = (props: React.SVGProps<SVGSVGElement>) => (
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
    <rect x="6" y="5" width="12" height="15" rx="2" />
    <path d="M9 5.5h6" />
    <path d="M9 10h6" />
    <path d="M9 14h6" />
  </svg>
);

export const IconEdit = (props: React.SVGProps<SVGSVGElement>) => (
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
    <path d="M4 20h4l10.5-10.5a2.12 2.12 0 0 0-3-3L5 17v3Z" />
    <path d="M13.5 6.5l3 3" />
  </svg>
);