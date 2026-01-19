type Props = {
  value: string;
  onChange: (v: string) => void;
};

export function DayPicker({ value, onChange }: Props) {
  const toInput = (v: string) => {
    const [dd, mm, yyyy] = v.split(".");
    if (!dd || !mm || !yyyy) return "";
    return `${yyyy}-${mm}-${dd}`;
  };

  const fromInput = (v: string) => {
    const [yyyy, mm, dd] = v.split("-");
    if (!dd || !mm || !yyyy) return "";
    return `${dd}.${mm}.${yyyy}`;
  };

  return (
    <div className="flex items-center gap-3">
      <label className="text-sm text-slate-800">Tag</label>
      <input
        type="date"
        value={toInput(value)}
        onChange={(e) => onChange(fromInput(e.target.value))}
        className="rounded-xl border border-slate-700 bg-slate-90 px-3 py-2 text-slate-800 outline-none focus:ring-2 focus:ring-slate-600"
      />
    </div>
  );
}