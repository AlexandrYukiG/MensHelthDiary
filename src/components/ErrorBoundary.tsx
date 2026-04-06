import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-red-200">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold mb-2 text-center text-slate-900">Щось пішло не так</h1>
          <p className="text-slate-500 mb-8 text-center max-w-md">
            Вибачте, сталася неочікувана помилка. Будь ласка, спробуйте оновити сторінку.
          </p>
          <Button onClick={() => window.location.reload()} size="lg" className="rounded-full px-8">
            Оновити сторінку
          </Button>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
