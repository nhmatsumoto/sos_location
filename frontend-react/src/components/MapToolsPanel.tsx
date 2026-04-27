import React from 'react';

interface MapToolsPanelProps {
  title: string;
  children: React.ReactNode;
}

export const MapToolsPanel: React.FC<MapToolsPanelProps> = ({ title, children }) => {
  return (
    <aside className="z-[500] flex h-full w-80 shrink-0 flex-col border-r border-slate-700 bg-slate-900/95 shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-700 bg-slate-800/40 p-4">
        <h1 className="font-bold text-lg text-white tracking-tight">{title}</h1>
      </div>
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </aside>
  );
};
