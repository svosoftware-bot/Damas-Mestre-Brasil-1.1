import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State;
  public props: Props;

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = 'Ocorreu um erro inesperado.';
      try {
        const parsedError = JSON.parse(this.state.error?.message || '');
        if (parsedError.error && parsedError.operationType) {
          errorMessage = `Erro de Permissão (${parsedError.operationType}): ${parsedError.error}`;
        }
      } catch {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-[#2a1a10] flex items-center justify-center p-8 text-center">
          <div className="bg-[#3d2b1f] p-8 rounded-2xl border-2 border-red-600 shadow-2xl max-w-md w-full">
            <h2 className="text-2xl font-black italic text-white mb-4">OPS! ALGO DEU ERRADO</h2>
            <p className="text-white/80 mb-6">{errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-8 py-3 bg-red-600 rounded-xl font-bold shadow-lg hover:bg-red-700 transition-all"
            >
              Recarregar Jogo
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
