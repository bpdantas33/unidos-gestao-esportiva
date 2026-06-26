import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
          <div className="text-6xl mb-4">⚽</div>
          <h1 className="text-2xl font-black text-white mb-2">Ops! Algo deu errado</h1>
          <p className="text-slate-400 text-sm mb-6 max-w-md">
            Ocorreu um erro ao carregar o aplicativo. Tente recarregar a página.
          </p>
          <pre className="text-xs text-red-400 bg-slate-900 p-4 rounded-lg max-w-lg overflow-auto mb-6">
            {this.state.error?.message}
          </pre>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors"
          >
            Recarregar App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
