import { useEffect, useState } from 'react';

interface TimelineControlProps {
  max: number;
  value: number;
  onChange: (value: number) => void;
}

export function TimelineControl({ max, value, onChange }: TimelineControlProps) {
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing || max <= 0) return;
    const timer = window.setInterval(() => onChange((value + 1) % (max + 1)), 1000);
    return () => window.clearInterval(timer);
  }, [playing, max, onChange, value]);

  return (
    <div className="space-y-2">
      <label className="block text-xs text-slate-300">Time Interval</label>
      <input type="range" min={0} max={max} value={Math.min(value, max)} onChange={(e) => onChange(Number(e.target.value))} className="w-full" />
      <div className="flex gap-2 text-xs">
        <button onClick={() => setPlaying((current) => !current)} className="rounded border border-slate-600 px-2 py-1">{playing ? 'Pause' : 'Play'}</button>
        <button onClick={() => onChange(Math.max(0, value - 1))} className="rounded border border-slate-600 px-2 py-1">-1h</button>
        <button onClick={() => onChange(Math.min(max, value + 1))} className="rounded border border-slate-600 px-2 py-1">+1h</button>
        <button onClick={() => onChange(Math.min(max, value + 24))} className="rounded border border-slate-600 px-2 py-1">+1d</button>
      </div>
    </div>
  );
}
