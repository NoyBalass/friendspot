import { Component, type ReactNode } from 'react'

interface State { error: Error | null }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-svh flex flex-col items-center justify-center px-6 text-center bg-[#fafaf8]">
          <div className="text-5xl mb-4">😬</div>
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Something went wrong</h2>
          <p className="text-sm text-gray-400 mb-6 max-w-xs">
            {this.state.error.message || "Don't worry, it happens to the best of us."}
          </p>
          <button
            onClick={() => { this.setState({ error: null }); window.location.href = '/' }}
            className="px-5 py-2.5 rounded-xl bg-violet-500 text-white text-sm font-medium active:scale-95 transition-all"
          >
            Back to home
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
