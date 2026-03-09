import React from 'react';

interface ToolButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  className?: string;
  hideLabel?: boolean;
}

export function ToolButton({ active, onClick, icon, label, disabled, className = '', hideLabel = false }: ToolButtonProps) {
  return (
    <button 
      onClick={!disabled ? onClick : undefined}
      disabled={disabled}
      className={`
        flex items-center gap-3 px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300
        ${active 
          ? 'bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)] translate-x-1' 
          : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}
        ${disabled ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      title={hideLabel ? label : undefined}
    >
      <span className={active ? "animate-pulse" : ""}>{icon}</span>
      {!hideLabel && <span>{label}</span>}
    </button>
  );
}
