import { Component, type ReactNode } from "react";
import type { DeviceIdentity } from "./db";
import { useProgressSync } from "./useProgressSync";

/** Long enough not to hammer a server that is down, short enough to catch a deploy. */
const RETRY_MS = 60_000;

/**
 * The progress backup, fenced off from the game.
 *
 * A Convex query that fails throws during render, and unfenced that takes
 * down the whole app — which is exactly what a backend a step behind the
 * client did: the child lost their game to a backup they cannot see. The
 * copy on the device is what the game plays with, so a failing backup is
 * worth a console line and a retry, never a crash screen.
 */
class QuietBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  private timer: number | undefined;

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.warn("[math-master] progress backup paused, retrying in a minute", error);
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => this.setState({ failed: false }), RETRY_MS);
  }

  componentWillUnmount() {
    window.clearTimeout(this.timer);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function Sync({ identity }: { identity: DeviceIdentity }) {
  useProgressSync(identity);
  return null;
}

export function BackupSync({ identity }: { identity: DeviceIdentity }) {
  return (
    <QuietBoundary>
      <Sync identity={identity} />
    </QuietBoundary>
  );
}
