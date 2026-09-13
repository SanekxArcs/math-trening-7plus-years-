import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Last line of defence.
 *
 * A thrown error anywhere in the tree — a Convex query rejecting, a bad render
 * — otherwise unmounts everything and leaves a blank white page. On a child's
 * tablet that is indistinguishable from the app being broken forever, with no
 * way back short of clearing site data.
 *
 * Deliberately plain text and plain buttons: whatever failed, this must render.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[math-master] unhandled error", error, info.componentStack);
  }

  private reload = () => {
    window.location.reload();
  };

  private reset = async () => {
    // Everything this app keeps is recoverable from the server or is practice
    // history it can live without, so a full local wipe is a safe last resort.
    try {
      const { db } = await import("./sync/db");
      await db.delete();
    } catch {
      /* nothing to delete */
    }
    try {
      localStorage.clear();
    } catch {
      /* private mode */
    }
    window.location.href = "/";
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "2rem",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <p style={{ fontSize: "3rem", margin: 0 }} aria-hidden>
          🛠️
        </p>
        <h1 style={{ fontSize: "1.5rem", margin: 0 }}>Something went wrong</h1>
        <p style={{ maxWidth: "32rem", color: "#555", margin: 0 }}>
          The game hit a problem and stopped. Reloading usually fixes it.
        </p>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
          <button
            type="button"
            onClick={this.reload}
            style={{
              padding: "0.75rem 1.5rem",
              borderRadius: "999px",
              border: "none",
              background: "#6d28d9",
              color: "white",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
          <button
            type="button"
            onClick={() => void this.reset()}
            style={{
              padding: "0.75rem 1.5rem",
              borderRadius: "999px",
              border: "1px solid #ccc",
              background: "transparent",
              color: "#555",
              cursor: "pointer",
            }}
          >
            Start fresh on this device
          </button>
        </div>

        <details style={{ maxWidth: "40rem", color: "#777", fontSize: "0.8rem" }}>
          <summary style={{ cursor: "pointer" }}>Details</summary>
          <pre style={{ whiteSpace: "pre-wrap", textAlign: "left" }}>
            {this.state.error.message}
          </pre>
        </details>
      </main>
    );
  }
}
