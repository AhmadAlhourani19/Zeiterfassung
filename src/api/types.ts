export type StempeluhrEntry = {
  "@entryid"?: string;
  "@unid": string;
  "@form"?: string;

  Key: string;
  Zeit: string;          // ISO string
  Buchungstyp: "0" | "1" | "2"; // "0" Anmeldung, "1" Abmeldung, "2" Pause
  Projekt: string;
};

export type ProjectEntry = {
  "@entryid"?: string;
  "@unid": string;
  "@form"?: string;

  Projektname?: string;
  Dokumentgeloescht?: string;
};

export type StatusEntry = {
  "@entryid"?: string;
  "@unid"?: string;
  "@form"?: string;

  Key?: string;
  Zeit?: string;
  Buchungstyp?: "0" | "1" | "";
  Projekt?: string;
  Projektname?: string;
  ProjektName?: string;
  Projektbezeichnung?: string;
  Project?: string;
  Standort?: string;
  Status?: string;
  commonName?: string;
  CommonName?: string;
  Name?: string;
  entrydata?: Array<{
    "@name"?: string;
    name?: string;
    text?: unknown;
    value?: unknown;
    values?: unknown;
  }>;
};

export type UserStatusLookup = {
  effectiveName?: string;
  commonName?: string;
  unid?: string;
  status?: string;
  message?: string;
};
