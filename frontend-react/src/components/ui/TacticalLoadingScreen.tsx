import React, { useState, useEffect } from 'react';

const LOADING_STEPS = [
  'Conectando ao servidor...',
  'Carregando dados geoespaciais...',
  'Sincronizando incidentes...',
  'Pronto',
] as const;

export const TacticalLoadingScreen: React.FC = () => {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState<string>(LOADING_STEPS[0]);

  useEffect(() => {
    let step = 0;
    const stepInterval = setInterval(() => {
      if (step < LOADING_STEPS.length - 1) {
        step++;
        setStatusText(LOADING_STEPS[step]);
      } else {
        clearInterval(stepInterval);
      }
    }, 600);

    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + Math.random() * 6, 100));
    }, 100);

    return () => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <div className="w-full h-full bg-[#09090F] flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-6 w-64">
        {/* Logo mark */}
        <div className="w-10 h-10 bg-blue-600 rounded-md flex items-center justify-center">
          <span className="text-white font-semibold text-sm">SOS</span>
        </div>

        {/* Progress bar */}
        <div className="w-full space-y-2">
          <div className="h-1 w-full bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-white/40">{statusText}</span>
            <span className="text-xs font-mono text-white/30">{Math.floor(progress)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
