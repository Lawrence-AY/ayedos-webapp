import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('[frontend:error-boundary]', {
      message: error?.message,
      stack: error?.stack,
      componentStack: info?.componentStack,
    })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 px-4">
        <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-semibold tracking-normal text-slate-950">We could not load this screen</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Please refresh the page or sign in again. The error has been logged for review.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"
          >
            Reload
          </button>
        </section>
      </main>
    )
  }
}
