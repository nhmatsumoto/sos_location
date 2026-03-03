import type { ReactNode } from 'react';

interface MapToolsPanelProps {
  title: string;
  children: ReactNode;
}

export function MapToolsPanel({ title, children }: MapToolsPanelProps) {
  return (
    <div className="fixed right-4 top-4 z-[460] w-[24rem] max-h-[calc(100vh-2rem)] border border-slate-700 bg-slate-800/95 backdrop-blur-md rounded-2xl flex flex-col shadow-2xl overflow-y-auto custom-scrollbar">
      <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/95 backdrop-blur-md sticky top-0 z-40">
        <h1 className="text-base font-bold tracking-tight text-white">{title}</h1>
      </div>
      {children}
    </div>
  );
}
