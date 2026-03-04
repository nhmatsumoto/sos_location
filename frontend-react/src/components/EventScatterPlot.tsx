import React, { useMemo } from 'react';
import { format } from 'date-fns';

export type ScatterPoint = {
  id: string;
  x: number; // 0-100 (Time)
  y: number; // 0-100 (Severity/Weight)
  label: string;
  type: string;
  timestamp: string;
  severity: number;
  isOffline?: boolean;
};

interface EventScatterPlotProps {
  points: ScatterPoint[];
  onHover?: (point: ScatterPoint | null) => void;
  onClick?: (point: ScatterPoint) => void;
  hoveredId?: string | null;
}

export const EventScatterPlot: React.FC<EventScatterPlotProps> = ({ 
  points, 
  onHover, 
  onClick,
  hoveredId 
}) => {
  const gridLines = useMemo(() => [25, 50, 75], []);

  return (
    <div className="relative h-full w-full bg-slate-950 font-mono text-[10px] select-none group">
      {/* Background Tactical Grid */}
      <div className="absolute inset-0 opacity-20">
        {gridLines.map(line => (
          <React.Fragment key={line}>
            <div className="absolute w-full border-t border-slate-500" style={{ top: `${line}%` }} />
            <div className="absolute h-full border-l border-slate-500" style={{ left: `${line}%` }} />
          </React.Fragment>
        ))}
        {/* Diagonal Crosshair Lines */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(15,23,42,0)_0%,rgba(15,23,42,1)_100%)]" />
      </div>

      {/* Axis Labels */}
      <div className="absolute bottom-1 left-2 text-slate-500">TEMPO ➔</div>
      <div className="absolute left-1 top-2 -rotate-90 origin-top-left text-slate-500">PESO/SEVERIDADE ➔</div>

      {/* Points */}
      <div className="relative h-full w-full cursor-crosshair">
        {points.map((p) => {
          const isSelected = hoveredId === p.id;
          return (
            <div
              key={p.id}
              className={`absolute h-3 w-3 -translate-x-1.5 -translate-y-1.5 rounded-full transition-all duration-300
                ${isSelected ? 'scale-150 z-20' : 'z-10'}
                ${p.isOffline ? 'border border-dashed border-cyan-400 bg-transparent' : 'bg-cyan-500'}
                hover:shadow-[0_0_12px_rgba(34,211,238,0.8)]`}
              style={{ 
                left: `${p.x}%`, 
                top: `${p.y}%`,
                backgroundColor: p.isOffline ? undefined : getEventColor(p.type, p.severity)
              }}
              onMouseEnter={() => onHover?.(p)}
              onMouseLeave={() => onHover?.(null)}
              onClick={() => onClick?.(p)}
            >
              {isSelected && (
                <div className="absolute -inset-2 rounded-full border border-cyan-400/50 animate-ping" />
              )}
              
              {/* Tooltip on Hover */}
              <div className={`absolute bottom-5 left-1/2 -translate-x-1/2 pointer-events-none whitespace-nowrap rounded bg-slate-900/95 border border-slate-700 px-2 py-1 text-slate-100 shadow-xl transition-opacity
                ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                <div className="font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getEventColor(p.type, p.severity) }} />
                  {p.label}
                </div>
                <div className="text-slate-400 text-[9px]">
                  {format(new Date(p.timestamp), 'HH:mm:ss')} · SEV {p.severity}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

function getEventColor(type: string, severity: number): string {
  if (type.includes('Rescue')) return '#f87171'; // Red
  if (type.includes('Donation')) return '#4ade80'; // Green
  if (type.includes('Search')) return '#fbbf24'; // Yellow
  if (severity >= 4) return '#ef4444'; // Critical Red
  return '#22d3ee'; // Default Cyan
}
