import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';

export interface FloatingPanelPosition {
  top: number;
  left: number;
}

export type FloatingPanelId = 'global' | 'terrain';

interface DraggablePanelProps {
  title: string;
  panelId: FloatingPanelId;
  position: FloatingPanelPosition;
  docked: boolean;
  onStartDrag: (panelId: FloatingPanelId, event: ReactPointerEvent<HTMLDivElement>) => void;
  onToggleDock: (panelId: FloatingPanelId) => void;
  children: ReactNode;
  widthClass?: string;
}

export function DraggablePanel({
  title,
  panelId,
  position,
  docked,
  onStartDrag,
  onToggleDock,
  children,
  widthClass = 'w-72',
}: DraggablePanelProps) {
  return (
    <div
      className={`absolute bg-slate-900/85 backdrop-blur-md border border-slate-700 shadow-xl rounded-xl z-[410] text-sm ${widthClass} ${docked ? 'opacity-70' : ''}`}
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
    >
      <div
        className="px-3 py-2 border-b border-slate-700 bg-slate-800/70 rounded-t-xl flex items-center justify-between cursor-move touch-none"
        onPointerDown={(event) => onStartDrag(panelId, event)}
      >
        <h4 className="font-bold text-white uppercase tracking-wide text-xs">{title}</h4>
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => onToggleDock(panelId)}
          className="text-[10px] px-2 py-1 rounded border border-slate-600 text-slate-200 hover:text-white hover:border-cyan-400"
        >
          {docked ? 'Soltar' : 'Integrar'}
        </button>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
