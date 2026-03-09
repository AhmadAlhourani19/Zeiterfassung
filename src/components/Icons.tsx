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
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" data-slot="icon" aria-hidden="true" {...props}>
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