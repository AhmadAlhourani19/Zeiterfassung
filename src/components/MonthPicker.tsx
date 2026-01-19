type Props = {
  value: string;
  onChange: (v: string) => void;
};

export function MonthPicker({ value, onChange }: Props) {
  const toInput = (v: string) => {
    const [mm, yyyy] = v.split(".");
    if (!mm || !yyyy) return "";
    return `${yyyy}-${mm}`;
  };

  const fromInput = (v: string) => {
    const [yyyy, mm] = v.split("-");
    if (!mm || !yyyy) return "";
    return `${mm}.${yyyy}`;
  };

  return (
    <div className="flex items-center gap-3">
      <label className="text-sm text-slate-800">Monat</label>
      <input
        type="month"
        value={toInput(value)}
        onChange={(e) => onChange(fromInput(e.target.value))}
        className="rounded-xl border border-slate-700 bg-slate-90 px-3 py-2 text-slate-800 outline-none focus:ring-2 focus:ring-slate-600"
      />
    </div>
  );
}