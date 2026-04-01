import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-slate-900/50 border border-red-500/20 rounded-[2.5rem] h-full text-center space-y-4 backdrop-blur-md">
          <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
            <AlertTriangle size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-black uppercase tracking-widest text-white">Componente Indisponível</h3>
            <p className="text-xs text-slate-400 max-w-[240px]">
              Ocorreu um erro ao carregar este módulo visual. Tente atualizar a página.
            </p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="text-[10px] font-black uppercase tracking-widest px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
          >
            recarregar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
