import React, { useEffect, useRef } from 'react';
import { Box } from 'lucide-react';

interface MapContextMenuProps {
  x: number;
  y: number;
  lat: number;
  lon: number;
  onClose: () => void;
  onRender3D: (lat: number, lon: number) => void;
}

export const MapContextMenu: React.FC<MapContextMenuProps> = ({ x, y, lat, lon, onClose, onRender3D }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div 
      ref={menuRef}
      className="fixed z-1000 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl py-1 w-64 animate-in fade-in zoom-in duration-200"
      style={{ left: x, top: y }}
    >
      <div className="px-3 py-2 border-b border-white/5 mb-1">
        <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block">Localização Selecionada</span>
        <span className="text-[10px] font-mono text-cyan-400">{lat.toFixed(5)}, {lon.toFixed(5)}</span>
      </div>
      
      <button 
        onClick={() => {
          onRender3D(lat, lon);
          onClose();
        }}
        className="w-full text-left px-3 py-2 text-[11px] font-bold text-slate-300 hover:bg-cyan-500/20 hover:text-cyan-400 flex items-center gap-2 transition-colors uppercase"
      >
        <Box size={14} /> Renderizar Tático 3D Nesta Área
      </button>
    </div>
  );
};
