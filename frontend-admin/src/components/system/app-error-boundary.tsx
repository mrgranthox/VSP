import { Component, type ErrorInfo, type PropsWithChildren, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { reportAdminError } from "@/lib/error-reporting";

interface AppErrorBoundaryState {
  error: Error | null;
}

class AppErrorBoundary extends Component<PropsWithChildren, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    error: null
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Admin route crashed", {
      error,
      componentStack: errorInfo.componentStack
    });

    reportAdminError(error, {
      source: "react.error-boundary",
      componentStack: errorInfo.componentStack ?? undefined
    });
  }

  private handleReset = () => {
    this.setState({ error: null });
    window.location.assign("/overview");
  };

  render(): ReactNode {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-admin-canvas px-4 py-10">
        <div
          className="w-full max-w-2xl rounded-[2rem] border border-[rgba(112,104,84,0.16)] bg-[linear-gradient(145deg,rgba(255,253,248,0.98),rgba(248,242,232,0.96),rgba(255,242,234,0.92))] p-8 shadow-[0_30px_60px_rgba(71,61,45,0.16)]"
          data-testid="route-error-boundary"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--jo-forest)]">Admin recovery lane</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-[color:var(--jo-ink)]">This admin route crashed</h1>
          <p className="mt-3 text-sm leading-7 text-[color:var(--jo-muted)]">
            The rest of the session is still recoverable. Reload the current lane or jump back to the overview desk without losing the whole workspace.
          </p>

          <div className="mt-6 rounded-[1.35rem] border border-[rgba(112,104,84,0.12)] bg-[rgba(255,251,244,0.92)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:rgba(107,114,102,0.72)]">Error message</p>
            <p className="mt-3 break-words text-sm font-semibold text-[color:var(--jo-ink)]">{this.state.error.message || "Unknown route failure"}</p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button data-testid="route-error-boundary-reset" onClick={this.handleReset}>
              Return to overview
            </Button>
            <Button data-testid="route-error-boundary-reload" onClick={() => window.location.reload()} variant="outline">
              Reload page
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

export { AppErrorBoundary };
