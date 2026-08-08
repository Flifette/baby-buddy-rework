import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

class AppErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return <pre style={{ padding: 24, color: "#ff8a8a", whiteSpace: "pre-wrap" }}>{`Baby Buddy Dashboard - erreur d’affichage\n${this.state.error?.name || "Erreur"}: ${this.state.error?.message || "Erreur inconnue"}\n\n${this.state.error?.stack || ""}`}</pre>;
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AppErrorBoundary><App /></AppErrorBoundary>
  </StrictMode>
);
