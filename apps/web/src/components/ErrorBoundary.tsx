import { Component, type ErrorInfo, type ReactNode } from "react";
import { Postmark, Fleuron } from "./Ornament";
import { Button } from "./Button";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** Catches render/lifecycle errors in the subtree below it — a blank white
 *  screen otherwise, since React unmounts the whole tree on an uncaught
 *  render error. Does NOT catch errors in event handlers, async code, or
 *  Convex mutation rejections — those are handled locally where they occur
 *  (see TweetCard/Composer's own try/catch + error state). */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled error in render tree:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-svh flex items-center justify-center px-4">
          <div className="text-center py-20 max-w-sm">
            <Postmark label="Something" sub="Torn" />
            <h1 className="font-display font-black text-2xl text-ink mt-6">The press has jammed</h1>
            <p className="text-sm text-ink-soft mt-2">
              Something went wrong setting this dispatch in type. Try again, or return to the wire.
            </p>
            <Fleuron className="max-w-[160px] mx-auto my-6" />
            <Button variant="primary" size="sm" onClick={() => window.location.assign("/")}>
              Back to the wire
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
