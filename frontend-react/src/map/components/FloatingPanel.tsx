import { useRef } from 'react';
import type { ReactNode } from 'react';
import type { PanelState } from '../store/mapStore';

interface FloatingPanelProps {
  panel: PanelState;
  title: string;
  onChange: (next: Partial<PanelState>) => void;
  children: ReactNode;
}

export function FloatingPanel({ panel, title, onChange, children }: FloatingPanelProps) {
  const dragState = useRef<{ startX: number; startY: number; x: number; y: number } | null>(null);

  const onDragStart = (event: React.PointerEvent<HTMLDivElement>) => {
    dragState.current = { startX: event.clientX, startY: event.clientY, x: panel.x, y: panel.y };
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  };

  const onDragMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState.current) return;
    onChange({
      x: Math.max(8, dragState.current.x + (event.clientX - dragState.current.startX)),
      y: Math.max(8, dragState.current.y + (event.clientY - dragState.current.startY)),
    });
  };

  const onResizeStart = (event: React.PointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    const start = { x: event.clientX, y: event.clientY, width: panel.width, height: panel.height };

    const onMove = (moveEvent: PointerEvent) => {
      onChange({
        width: Math.max(220, start.width + (moveEvent.clientX - start.x)),
        height: Math.max(120, start.height + (moveEvent.clientY - start.y)),
      });
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  if (!panel.open) return null;

  return (
    <div
      className="absolute z-[1000] rounded-xl border border-slate-700 bg-slate-950/90 text-slate-100 shadow-2xl pointer-events-auto"
      style={{ left: panel.x, top: panel.y, width: panel.width, height: panel.minimized ? 'auto' : panel.height, opacity: panel.opacity }}
    >
      <div
        className="flex cursor-move items-center justify-between rounded-t-xl border-b border-slate-700 bg-slate-900/90 px-3 py-2"
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={() => {
          dragState.current = null;
        }}
      >
        <strong className="text-xs uppercase tracking-wide">{title}</strong>
        <div className="flex items-center gap-1 text-xs">
          <button onClick={() => onChange({ minimized: !panel.minimized })}>_</button>
          <button onClick={() => onChange({ open: false })}>×</button>
        </div>
      </div>
      {!panel.minimized && <div className="h-[calc(100%-40px)] overflow-auto p-3 text-xs">{children}</div>}
      {!panel.minimized && <div className="absolute bottom-1 right-1 h-3 w-3 cursor-se-resize rounded bg-slate-700" onPointerDown={onResizeStart} />}
    </div>
  );
}
