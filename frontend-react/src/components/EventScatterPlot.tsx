import React, { useMemo, useState, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { ZoomIn, ZoomOut, RefreshCw, Layers, Filter } from 'lucide-react';

export type ScatterPoint = {
  id: string;
  x: number; // 0-100 (Time)
  y: number; // 0-100 (Severity/Weight)
  label: string;
  type: string;
  timestamp: string;
  severity: number;
  isOffline?: boolean;
  metadata?: unknown;
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
  const [pan, setPan] = useState(0); 
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [disabledTypes, setDisabledTypes] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  const eventTypes = useMemo(() => {
    return Array.from(new Set(points.map(p => p.type))).sort();
  }, [points]);

  const toggleType = (type: string) => {
    setDisabledTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const filteredPoints = useMemo(() => {
    return points.filter(p => !disabledTypes.has(p.type));
  }, [points, disabledTypes]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = -e.deltaY * 0.002;
      setZoom(z => Math.max(1, Math.min(10, z + delta)));
    } else {
      setPan(p => p - e.deltaX * 0.1);
    }
  }, []);

  const resetView = () => {
    setZoom(1);
    setPan(0);
  };

  const visiblePoints = useMemo(() => {
    return filteredPoints.map(p => ({
      ...p,
      displayX: (p.x * zoom) + pan
    }));
  }, [filteredPoints, zoom, pan]);


  return (
    <div 
      ref={containerRef}
      className="relative h-full w-full bg-slate-950 font-mono text-[10px] select-none overflow-hidden group"
      onWheel={handleWheel}
    >
      {/* Tactical UI Overlay */}
      <div className="absolute top-2 right-2 z-30 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => setZoom(z => Math.min(10, z + 0.5))} className="p-1 bg-slate-900 border border-slate-700 text-cyan-400 hover:bg-slate-800 rounded">
          <ZoomIn size={14} />
        </button>
        <button onClick={() => setZoom(z => Math.max(1, z - 0.5))} className="p-1 bg-slate-900 border border-slate-700 text-cyan-400 hover:bg-slate-800 rounded">
          <ZoomOut size={14} />
        </button>
        <button onClick={resetView} className="p-1 bg-slate-900 border border-slate-700 text-cyan-400 hover:bg-slate-800 rounded">
          <RefreshCw size={14} />
        </button>
        <button onClick={resetView} className="p-1 bg-slate-900 border border-slate-700 text-cyan-400 hover:bg-slate-800 rounded">
          <RefreshCw size={14} />
        </button>
        <button onClick={() => setShowMiniMap(!showMiniMap)} className={`p-1 border border-slate-700 rounded ${showMiniMap ? 'bg-cyan-900/50 text-cyan-400' : 'bg-slate-900 text-slate-500'}`}>
          <Layers size={14} />
        </button>
      </div>

      <div className="absolute top-2 left-2 z-30 pointer-events-none flex flex-col gap-1">
        <div className="flex items-center gap-2 text-cyan-400 uppercase tracking-widest text-[9px] font-black">
          <div className="w-2 h-2 bg-cyan-500 animate-ping rounded-full" />
          EVENT_TIMELINE // {zoom.toFixed(1)}x
        </div>
      </div>


      {/* Grid */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
        <div className="h-full w-full" style={{ backgroundImage: 'radial-gradient(circle, #475569 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
      </div>

      {/* Central Timeline Line */}
      <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-800/50 z-0" />

      {/* Points - V3 optimized rendering */}
      <div 
        className="relative h-full w-full cursor-crosshair"
        style={{ 
          transform: `scaleY(1)`, // Future perspective skew
        }}
      >
        {visiblePoints.map((p) => {
          const isSelected = hoveredId === p.id;
          if (p.displayX < -5 || p.displayX > 105) return null;
          const color = getEventColor(p.type, p.severity);

          return (
            <div
              key={p.id}
              className={`absolute flex flex-col items-center justify-center transition-all duration-300
                ${isSelected ? 'z-50' : 'z-10'}`}
              style={{ 
                left: `${p.displayX}%`, 
                top: `50%`,
                width: isSelected ? '32px' : '12px',
                height: isSelected ? '32px' : '12px',
                transform: 'translate(-50%, -50%)'
              }}
              onMouseEnter={() => onHover?.(p)}
              onMouseLeave={() => onHover?.(null)}
              onClick={() => onClick?.(p)}
            >
              {/* Point Marker */}
              <div 
                className={`w-full h-full border-2 transition-all duration-500 relative
                  ${p.type.includes('Rescue') ? 'rotate-45' : 'rounded-full'}`}
                style={{ 
                   backgroundColor: isSelected ? color : 'transparent',
                   borderColor: color,
                   boxShadow: isSelected ? `0 0 20px ${color}` : `0 0 5px ${color}44`,
                   transform: isSelected ? 'scale(1.2)' : 'scale(1)'
                }}
              >
                {/* Internal telemetry dot */}
                {!isSelected && (
                  <div className="absolute inset-1 bg-white/30 rounded-full" />
                )}
                
                {/* Selection Rings */}
                {isSelected && (
                  <>
                    <div className="absolute -inset-2 border border-cyan-400 rotate-12 animate-[spin_4s_linear_infinite]" />
                    <div className="absolute -inset-4 border border-cyan-400/30 -rotate-12 animate-[spin_8s_linear_infinite]" />
                  </>
                )}
              </div>

              {/* Dynamic Label Component for Selected/Hovered */}
              {isSelected && (
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 pointer-events-none min-w-[140px]">
                  <div className="bg-slate-900/95 border border-cyan-500/50 backdrop-blur-md px-2 py-1.5 rounded shadow-2xl relative">
                    <div className="text-[10px] font-black text-cyan-400 uppercase tracking-tighter truncate w-full">{p.label}</div>
                    <div className="flex justify-between mt-1 items-end">
                      <span className="text-[8px] text-slate-400 font-mono">{format(new Date(p.timestamp), 'HH:mm:ss')}</span>
                      <span className="text-[9px] text-cyan-500 font-black">LVL_{p.severity}</span>
                    </div>
                  </div>
                  {/* Connector Line */}
                  <div className="h-4 w-px bg-cyan-500/50 mx-auto" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom UI Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-10 bg-slate-900/90 border-t border-slate-800/50 backdrop-blur flex items-center px-4 justify-between z-40">
        <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide no-scrollbar">
           <div className="flex items-center gap-1.5 text-slate-500 font-bold uppercase text-[7px] border-r border-slate-800 pr-3 mr-1">
             <Filter size={10} /> FILTROS
           </div>
           {eventTypes.map(type => (
             <button
               key={type}
               onClick={() => toggleType(type)}
               className={`flex items-center gap-1.5 h-6 px-2 rounded-md border transition-all whitespace-nowrap
                 ${!disabledTypes.has(type) 
                   ? 'bg-slate-800 border-slate-600 text-slate-200 shadow-inner' 
                   : 'bg-slate-950 border-slate-900 text-slate-700 opacity-50'}`}
             >
               <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getEventColor(type, 3) }} />
               <span className="text-[9px] uppercase font-bold">{type}</span>
             </button>
           ))}
        </div>
        
        <div className="flex items-center gap-2 text-slate-600 font-bold uppercase text-[8px] ml-4 bg-slate-950/50 px-2 py-0.5 rounded border border-slate-800">
           TS: {format(new Date(), 'HH:mm:ss')} // STATUS: NOMINAL
        </div>
      </div>

      {/* MiniMap / Time Scrubber */}
      {showMiniMap && (
        <div className="absolute top-12 left-4 right-16 h-4 bg-slate-900/40 border border-white/5 rounded-full backdrop-blur-sm z-20 flex items-center px-0.5 overflow-hidden">
           <div className="relative w-full h-full flex items-center">
             {filteredPoints.map(p => (
               <div 
                 key={`mini-${p.id}`}
                 className="absolute w-px h-[40%] opacity-20"
                 style={{ left: `${p.x}%`, backgroundColor: getEventColor(p.type, p.severity) }}
               />
             ))}
             <div 
               className="absolute h-full bg-cyan-500/10 border-x border-cyan-500/20"
               style={{ left: `${(-pan/zoom)}%`, width: `${(100/zoom)}%` }}
             />
           </div>
        </div>
      )}
    </div>
  );
};

function getEventColor(type: string, severity: number): string {
  const t = type.toLowerCase();
  if (t.includes('rescue')) return '#f87171'; // Red
  if (t.includes('donation')) return '#4ade80'; // Green
  if (t.includes('search')) return '#fbbf24'; // Yellow
  if (t.includes('assignment')) return '#818cf8'; // Indigo
  if (t.includes('expense')) return '#f472b6'; // Pink
  if (t.includes('flood')) return '#3b82f6'; // Blue
  if (t.includes('fire') || t.includes('wildfire')) return '#f97316'; // Orange
  if (severity >= 4) return '#ef4444'; // Critical Red
  return '#22d3ee'; // Default Cyan
}
