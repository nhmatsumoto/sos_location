import React, { useMemo, useState, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { ZoomIn, ZoomOut, RefreshCw, Layers, Info, Filter, TrendingUp } from 'lucide-react';

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
  const [pan, setPan] = useState(0); 
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [showTrend, setShowTrend] = useState(true);
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

  // Dynamic Trend Line (Moving Average)
  const trendPath = useMemo(() => {
    if (!showTrend || filteredPoints.length < 2) return "";
    const sorted = [...filteredPoints].sort((a, b) => a.x - b.x);
    
    // Simple 3-point moving average for smoothing
    const points = sorted.map((p, i) => {
      if (i === 0) return { x: (p.x * zoom) + pan, y: p.y };
      const prev = sorted[i - 1];
      const next = sorted[i + 1] || p;
      const smoothY = (prev.y + p.y + next.y) / 3;
      return { x: (p.x * zoom) + pan, y: smoothY };
    });

    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x}% ${p.y}%`).join(' ');
  }, [filteredPoints, zoom, pan, showTrend]);

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
        <button onClick={() => setShowTrend(!showTrend)} className={`p-1 border border-slate-700 rounded ${showTrend ? 'bg-indigo-900/50 text-indigo-400' : 'bg-slate-900 text-slate-500'}`}>
          <TrendingUp size={14} />
        </button>
        <button onClick={() => setShowMiniMap(!showMiniMap)} className={`p-1 border border-slate-700 rounded ${showMiniMap ? 'bg-cyan-900/50 text-cyan-400' : 'bg-slate-900 text-slate-500'}`}>
          <Layers size={14} />
        </button>
      </div>

      <div className="absolute top-2 left-2 z-30 pointer-events-none flex flex-col gap-1">
        <div className="flex items-center gap-2 text-cyan-500/70 uppercase tracking-widest text-[8px] font-bold">
          <Info size={10} />
          SCATTER TÁTICO v3.0 // ZOOM: {zoom.toFixed(1)}x
        </div>
      </div>

      {/* Background Glow - Density Map */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
        {filteredPoints.filter(p => !p.isOffline && p.severity >= 3).map(p => (
           <div 
             key={`glow-${p.id}`}
             className="absolute w-32 h-32 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl transition-all duration-1000"
             style={{ 
               left: `${(p.x * zoom) + pan}%`, 
               top: `${p.y}%`, 
               background: `radial-gradient(circle, ${getEventColor(p.type, p.severity)} 0%, transparent 70%)` 
             }}
           />
        ))}
      </div>

      {/* Grid */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
        <div className="h-full w-full" style={{ backgroundImage: 'radial-gradient(circle, #475569 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
      </div>

      {/* SVG Layer for lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
        {showTrend && trendPath && (
          <path 
            d={trendPath} 
            fill="none" 
            stroke="url(#trendGradient)" 
            strokeWidth="2" 
            strokeDasharray="4 2"
            className="transition-all duration-300"
          />
        )}
        <defs>
          <linearGradient id="trendGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#818cf8" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.2" />
          </linearGradient>
        </defs>
      </svg>

      {/* Points */}
      <div className="relative h-full w-full cursor-crosshair">
        {visiblePoints.map((p) => {
          const isSelected = hoveredId === p.id;
          if (p.displayX < -5 || p.displayX > 105) return null;

          return (
            <div
              key={p.id}
              className={`absolute h-3 w-3 -translate-x-1.5 -translate-y-1.5 transition-all duration-300
                ${isSelected ? 'scale-[2.5] z-50' : 'z-10 hover:scale-150'}`}
              style={{ 
                left: `${p.displayX}%`, 
                top: `${p.y}%`,
                filter: isSelected ? `drop-shadow(0 0 8px ${getEventColor(p.type, p.severity)})` : 'none'
              }}
              onMouseEnter={() => onHover?.(p)}
              onMouseLeave={() => onHover?.(null)}
              onClick={() => onClick?.(p)}
            >
              <div 
                className={`w-full h-full border border-white/20 shadow-xl transition-all
                  ${p.type.includes('Rescue') ? 'polygon-diamond' : 'rounded-full'}`}
                style={{ 
                   background: isSelected 
                    ? `radial-gradient(circle at 30% 30%, #fff, ${getEventColor(p.type, p.severity)})`
                    : getEventColor(p.type, p.severity),
                   clipPath: p.type.includes('Rescue') ? 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' : 'none',
                }}
              />
              
              {isSelected && (
                <div className="absolute -inset-1 border border-cyan-400 rotate-45 animate-pulse" />
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
