import React from 'react';

export const LoadingScreen: React.FC<{ message?: string }> = ({ message = 'Carregando...' }) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#09090F] text-white font-sans">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center">
          <span className="text-white font-semibold text-xs">SOS</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <p className="text-sm text-white/50">{message}</p>
        </div>
        <div className="h-px w-32 bg-white/[0.08] rounded-full overflow-hidden relative">
          <div className="absolute inset-0 bg-blue-600/70 animate-[loadingLine_1.8s_ease-in-out_infinite]" />
        </div>
      </div>

      <style>{`
        @keyframes loadingLine {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
};
