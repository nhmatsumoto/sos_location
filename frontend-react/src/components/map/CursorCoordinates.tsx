import React, { useEffect, useState } from 'react';
import { Crosshair } from 'lucide-react';

interface CursorCoordinatesProps {
  coords: [number, number] | null;
}

export const CursorCoordinates: React.FC<CursorCoordinatesProps> = ({ coords }) => {
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  if (!coords || !mousePos) return null;

  return (
    <div 
      className="fixed z-1000 pointer-events-none transition-opacity duration-150"
      style={{ left: mousePos.x + 15, top: mousePos.y + 15 }}
    >
      <div className="bg-slate-950/80 backdrop-blur-md border border-cyan-500/30 px-2 py-1 flex items-center gap-2 rounded shadow-lg">
        <Crosshair size={10} className="text-cyan-400" />
        <span className="text-[9px] font-mono text-cyan-500 uppercase">
          {coords[0].toFixed(5)}, {coords[1].toFixed(5)}
        </span>
      </div>
    </div>
  );
};
