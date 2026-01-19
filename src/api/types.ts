export type StempeluhrEntry = {
  "@entryid"?: string;
  "@unid": string;
  "@form"?: string;

  Key: string;
  Zeit: string;          // ISO string
  Buchungstyp: "0" | "1"; // "0" Anmeldung, "1" Abmeldung
  Projekt: string;
};
