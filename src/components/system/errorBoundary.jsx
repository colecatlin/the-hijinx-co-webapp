import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorId: null };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Log safely — no stack traces to UI
    const errorId = `err_${Date.now()}`;
    this.setState({ errorId });

    // Attempt to log to OperationLog via console (backend logging happens server-side)
    console.error('[ErrorBoundary]', {
      errorId,
      message: error?.message,
      component: info?.componentStack?.split('\n')?.[1]?.trim() || 'unknown',
      timestamp: new Date().toISOString(),
    });

    // Best-effort: log to OperationLog entity if SDK is available
    try {
      import('@/api/base44Client').then(({ base44 }) => {
        base44.entities.OperationLog.create({
          operation_type: 'runtime_error',
          entity_name: 'UI',
          status: 'error',
          message: `[UI Error] ${error?.message || 'Unknown error'}`,
          metadata_json: {
            error_id: errorId,
            component_stack: info?.componentStack?.split('\n')?.[1]?.trim() || 'unknown',
          },
          created_at: new Date().toISOString(),
        }).catch(() => {});
      }).catch(() => {});
    } catch (_) {}
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <AlertTriangle className="w-7 h-7 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            Our team has been notified. Please try refreshing the page or navigating back.
          </p>
          {this.state.errorId && (
            <p className="text-xs text-gray-400 font-mono mb-6">Ref: {this.state.errorId}</p>
          )}
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-medium hover:bg-black transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Reload Page
          </button>
        </div>
      </div>
    );
  }
}