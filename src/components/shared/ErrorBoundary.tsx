"use client";

import React from "react";
import { captureError } from "@/lib/logger.client";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message ?? "An unexpected error occurred." };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    try {
      captureError(error, info.componentStack?.split("\n")[1]?.trim() ?? undefined);
    } catch {}
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main
        style={{
          minHeight: "100vh",
          background: "var(--paper)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center", padding: "40px 24px" }}>
          <p
            style={{
              fontFamily: "var(--display)",
              fontWeight: 800,
              fontSize: 64,
              color: "var(--clay)",
              margin: 0,
              lineHeight: 1,
            }}
          >
            Oops
          </p>
          <h1
            style={{
              fontFamily: "var(--display)",
              fontWeight: 800,
              fontSize: 28,
              color: "var(--ink)",
              margin: "16px 0 8px",
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              fontFamily: "var(--body)",
              fontSize: 14,
              color: "var(--ink-soft)",
              marginBottom: 24,
              maxWidth: 400,
            }}
          >
            {this.state.message}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, message: "" })}
            style={{
              padding: "12px 28px",
              background: "var(--clay)",
              color: "var(--white)",
              border: "none",
              borderRadius: 12,
              fontFamily: "var(--body)",
              fontWeight: 600,
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </main>
    );
  }
}
