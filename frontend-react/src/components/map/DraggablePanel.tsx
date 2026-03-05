import type React from 'react';
import { useState } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import type { FloatingPanelPosition } from '../../types';

interface DraggablePanelProps {
  title: string;
  position: FloatingPanelPosition;
  onDragStart: (e: React.PointerEvent) => void;
  onToggleDock: () => void;
  children: React.ReactNode;
}

export const DraggablePanel: React.FC<DraggablePanelProps> = ({ 
  title, position, onDragStart, onToggleDock, children 
}) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div 
      className="fixed bg-slate-900/90 border border-slate-700 rounded-lg shadow-xl overflow-hidden flex flex-col pointer-events-auto transition-shadow hover:shadow-cyan-500/10"
      style={{ 
        top: position.top, 
        left: position.left, 
        right: position.right,
        bottom: position.bottom,
        width: 300,
        zIndex: 100
      }}
    >
      <div 
        className="px-3 py-2 bg-slate-800 border-b border-slate-700 flex items-center justify-between cursor-move"
        onPointerDown={onDragStart}
      >
        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-tight">{title}</h3>
        <div className="flex items-center gap-1">
          <button onClick={() => setCollapsed(!collapsed)} className="p-1 hover:bg-slate-700 rounded text-slate-400">
            {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
          <button onClick={onToggleDock} className="p-1 hover:bg-slate-700 rounded text-slate-400">
            <X size={14} />
          </button>
        </div>
      </div>
      {!collapsed && (
        <div className="flex-1 overflow-y-auto max-h-[400px]">
          {children}
        </div>
      )}
    </div>
  );
};
