import { Component, type ReactNode } from 'react';

interface FallbackBoundaryProps {
  fallback: ReactNode;
  /** Tries again when this changes, such as a new upload replacing a model that failed. */
  resetKey: string;
  children: ReactNode;
}

interface FallbackBoundaryState {
  failed: boolean;
  key: string;
}

/**
 * Draws `fallback` in place of children that threw. A drone model that will not load falls
 * back to the built-in one instead of taking the whole scene down with it.
 */
export class FallbackBoundary extends Component<FallbackBoundaryProps, FallbackBoundaryState> {
  state: FallbackBoundaryState = { failed: false, key: this.props.resetKey };

  static getDerivedStateFromError(): Partial<FallbackBoundaryState> {
    return { failed: true };
  }

  static getDerivedStateFromProps(props: FallbackBoundaryProps, state: FallbackBoundaryState) {
    return props.resetKey === state.key ? null : { failed: false, key: props.resetKey };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
