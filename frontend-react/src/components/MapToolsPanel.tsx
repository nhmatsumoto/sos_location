import React from 'react';

interface MapToolsPanelProps {
  title: string;
  children: React.ReactNode;
}

export const MapToolsPanel: React.FC<MapToolsPanelProps> = ({ title, children }) => {
  return (
    <aside className="absolute top-0 left-0 bottom-0 w-80 bg-slate-900/95 border-r border-slate-700 z-[500] flex flex-col shadow-2xl overflow-y-auto">
      <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-800/40">
        <h1 className="font-bold text-lg text-white tracking-tight">{title}</h1>
      </div>
      <div className="flex-1">
        {children}
      </div>
    </aside>
  );
};
