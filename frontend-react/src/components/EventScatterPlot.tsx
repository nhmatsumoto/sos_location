import React, { useMemo, useState, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { ZoomIn, ZoomOut, RefreshCw, Layers, Info } from 'lucide-react';

export type ScatterPoint = {
  id: string;
  x: number; // 0-100 (Time)
  y: number; // 0-100 (Severity/Weight)
  label: string;
  type: string;
  timestamp: string;
  severity: number;
  isOffline?: boolean;
  metadata?: any;
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
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState(0); // Offset in %
  const [showMiniMap, setShowMiniMap] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = -e.deltaY * 0.002;
      setZoom(z => Math.max(1, Math.min(10, z + delta)));
    } else {
      setPan(p => {
        const next = p - e.deltaX * 0.1;
        // Clamp pan logic would go here based on zoom
        return next;
      });
    }
  }, []);

  const resetView = () => {
    setZoom(1);
    setPan(0);
  };

  const visiblePoints = useMemo(() => {
    return points.map(p => ({
      ...p,
      displayX: (p.x * zoom) + pan
    }));
  }, [points, zoom, pan]);

  return (
    <div 
      ref={containerRef}
      className="relative h-full w-full bg-slate-950 font-mono text-[10px] select-none overflow-hidden"
      onWheel={handleWheel}
    >
      {/* Tactical UI Overlay */}
      <div className="absolute top-2 right-2 z-30 flex flex-col gap-1">
        <button onClick={() => setZoom(z => Math.min(10, z + 0.5))} className="p-1 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 text-cyan-400">
          <ZoomIn size={14} />
        </button>
        <button onClick={() => setZoom(z => Math.max(1, z - 0.5))} className="p-1 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 text-cyan-400">
          <ZoomOut size={14} />
        </button>
        <button onClick={resetView} className="p-1 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 text-cyan-400">
          <RefreshCw size={14} />
        </button>
        <button onClick={() => setShowMiniMap(!showMiniMap)} className={`p-1 rounded border border-slate-700 ${showMiniMap ? 'bg-cyan-900/50 text-cyan-300' : 'bg-slate-800 text-slate-500'}`}>
          <Layers size={14} />
        </button>
      </div>

      <div className="absolute top-2 left-2 z-30 pointer-events-none">
        <div className="flex items-center gap-2 text-cyan-500/70 uppercase tracking-widest text-[8px] font-bold">
          <Info size={10} />
          SCATTER TÁTICO v2.0 // ZOOM: {zoom.toFixed(1)}x
        </div>
      </div>

      {/* Background Tactical Grid */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        {[20, 40, 60, 80].map(line => (
          <React.Fragment key={line}>
            <div className="absolute w-full border-t border-slate-500" style={{ top: `${line}%` }} />
            <div className="absolute h-full border-l border-slate-500" style={{ left: `${line}%` }} />
          </React.Fragment>
        ))}
      </div>

      {/* Connection Lines (Optional - could show causal relationship) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
         {/* Could render lines between related events here */}
      </svg>

      {/* Points Container */}
      <div className="relative h-full w-full cursor-crosshair">
        {visiblePoints.map((p) => {
          const isSelected = hoveredId === p.id;
          // Hide points outside visible range
          if (p.displayX < -5 || p.displayX > 105) return null;

          return (
            <div
              key={p.id}
              className={`absolute h-4 w-4 -translate-x-2 -translate-y-2 rounded transition-all duration-200
                ${isSelected ? 'scale-150 z-20 brightness-125' : 'z-10'}
                ${p.isOffline ? 'border-2 border-dashed border-cyan-400 bg-cyan-900/20' : ''}
                hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] cursor-pointer`}
              style={{ 
                left: `${p.displayX}%`, 
                top: `${p.y}%`,
                backgroundColor: p.isOffline ? undefined : getEventColor(p.type, p.severity),
                clipPath: p.type.includes('Rescue') ? 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' : 'none',
                borderRadius: p.type.includes('Donation') ? '0' : '50%'
              }}
              onMouseEnter={() => onHover?.(p)}
              onMouseLeave={() => onHover?.(null)}
              onClick={() => onClick?.(p)}
            >
              {isSelected && (
                <div className="absolute -inset-2 rounded-full border-2 border-cyan-400 animate-[ping_2s_infinite]" />
              )}
              
              {/* Tooltip on Hover */}
              <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none z-50 rounded-lg bg-slate-900/95 border border-cyan-500/30 p-2 text-slate-100 shadow-2xl backdrop-blur-md transition-all duration-300
                ${isSelected ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-90'}`}>
                <div className="flex flex-col gap-1 min-w-[120px]">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1 mb-1">
                    <span className="font-bold text-cyan-400 uppercase">{p.type}</span>
                    <span className="bg-slate-800 px-1 rounded">SEV {p.severity}</span>
                  </div>
                  <div className="font-medium text-[11px] leading-tight break-words">{p.label}</div>
                  <div className="text-slate-400 text-[9px] flex items-center justify-between mt-1">
                    <span>{format(new Date(p.timestamp), 'dd/MM HH:mm')}</span>
                    {p.isOffline && <span className="text-amber-400">OFFLINE</span>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Axis Labels */}
      <div className="absolute bottom-2 left-4 text-slate-500 flex items-center gap-1">
        <span className="w-8 h-[1px] bg-slate-800" /> TEMPO (LINHA DO TEMPO)
      </div>

      {/* MiniMap / Time Scrubber */}
      {showMiniMap && (
        <div className="absolute bottom-2 right-4 left-32 h-6 bg-slate-900/80 border border-slate-800 rounded backdrop-blur z-20 flex items-center px-1">
          <div className="relative w-full h-full flex items-center">
             {/* Mini points */}
             {points.map(p => (
               <div 
                 key={`mini-${p.id}`}
                 className="absolute w-[2px] h-[60%] rounded-full opacity-30"
                 style={{ left: `${p.x}%`, backgroundColor: getEventColor(p.type, p.severity) }}
               />
             ))}
             {/* Visible range indicator */}
             <div 
               className="absolute h-full bg-cyan-500/20 border-x border-cyan-500/40"
               style={{ 
                 left: `${(-pan/zoom)}%`, 
                 width: `${(100/zoom)}%`
               }}
             />
          </div>
        </div>
      )}
    </div>
  );
};

function getEventColor(type: string, severity: number): string {
  if (type.includes('Rescue')) return '#f87171'; // Red
  if (type.includes('Donation')) return '#4ade80'; // Green
  if (type.includes('Search')) return '#fbbf24'; // Yellow
  if (type.includes('Assignment')) return '#818cf8'; // Indigo
  if (type.includes('Expense')) return '#f472b6'; // Pink
  if (severity >= 4) return '#ef4444'; // Critical Red
  return '#22d3ee'; // Default Cyan
}
