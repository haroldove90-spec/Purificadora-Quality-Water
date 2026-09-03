import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturó un error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-3xl flex items-center justify-center mb-5 shadow-inner">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight mb-2">
            {this.props.fallbackTitle || 'Ocurrió un error al cargar la vista'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium max-w-md mb-6 leading-relaxed">
            Se protegió el sistema para evitar una pantalla en blanco. Tus datos guardados están seguros.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95"
            >
              <Home size={14} /> Reintentar Vista
            </button>
            <button
              onClick={this.handleReset}
              className="px-5 py-3 rounded-2xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-sky-500/20"
            >
              <RefreshCw size={14} /> Recargar Sistema
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
