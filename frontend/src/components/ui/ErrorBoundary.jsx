import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-white rounded-[24px] p-8 border border-rose-200 text-center max-w-lg mx-auto my-8">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-[17px] font-bold text-[#171638]">Something went wrong</h2>
          <p className="text-[13px] text-[#5A5778] mt-1">
            An unexpected error occurred while rendering this page.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-4 inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-[#7650E8] to-[#6336D9] text-white text-[13px] font-semibold"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
