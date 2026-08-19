import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Copy, Check, Download } from 'lucide-react';
import { loggerService } from '../../services/loggerService';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    copied: false,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      copied: false,
      showDetails: false,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    loggerService.error('ReactErrorBoundary', error.message || 'React render crash', error, {
      componentStack: errorInfo.componentStack,
    });
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
      showDetails: false,
    });
  };

  private handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  private handleCopyLog = () => {
    const { error, errorInfo } = this.state;
    const diagnostic = [
      `Error: ${error?.message}`,
      `Stack: ${error?.stack}`,
      `Component Stack: ${errorInfo?.componentStack}`,
      `Time: ${new Date().toISOString()}`,
      `URL: ${typeof window !== 'undefined' ? window.location.href : 'unknown'}`,
    ].join('\n\n');

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(diagnostic).then(() => {
        this.setState({ copied: true });
        setTimeout(() => this.setState({ copied: false }), 2500);
      });
    }
  };

  private handleDownloadLog = () => {
    loggerService.downloadLogs(`crash-report-${Date.now()}.json`);
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gradient-to-b from-[#FFFDF6] via-[#F4F9FF] to-[#FFF5F6] flex items-center justify-center p-4 sm:p-6 font-sans">
          <div className="max-w-xl w-full bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-rose-100/80 text-center space-y-6 animate-fade-in">
            {/* Warning badge */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-rose-50 border-2 border-rose-100 rounded-3xl mx-auto flex items-center justify-center text-rose-500 shadow-inner">
              <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10 animate-bounce" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                Đã xảy ra lỗi không mong muốn!
              </h2>
              <p className="text-sm text-slate-600 font-medium">
                Ứng dụng gặp sự cố trong quá trình hiển thị. Bạn có thể thử lại hoặc tải lại trang.
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <button
                type="button"
                onClick={this.handleRetry}
                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw size={16} />
                Thử lại
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                Tải lại trang
              </button>
            </div>

            {/* Diagnostic Box */}
            <div className="pt-4 border-t border-slate-100 text-left space-y-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 underline cursor-pointer"
                >
                  {this.state.showDetails ? 'Ẩn chi tiết kỹ thuật' : 'Xem chi tiết kỹ thuật'}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={this.handleCopyLog}
                    className="text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1 transition-all cursor-pointer"
                    title="Sao chép thông tin lỗi"
                  >
                    {this.state.copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                    <span>{this.state.copied ? 'Đã chép!' : 'Sao chép lỗi'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={this.handleDownloadLog}
                    className="text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1 transition-all cursor-pointer"
                    title="Tải file log"
                  >
                    <Download size={12} />
                    <span>Tải file log</span>
                  </button>
                </div>
              </div>

              {this.state.showDetails && (
                <div className="p-3.5 bg-slate-900 text-rose-300 rounded-2xl text-xs font-mono max-h-48 overflow-y-auto space-y-2 select-all shadow-inner">
                  <p className="font-bold text-rose-400">{this.state.error?.toString()}</p>
                  {this.state.errorInfo?.componentStack && (
                    <pre className="text-[11px] text-slate-400 whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
