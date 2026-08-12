import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { LanguageProvider } from "./utils/i18n";

class AppErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      const french = (navigator.language || "").toLowerCase().startsWith("fr");
      const title = french ? "erreur d’affichage" : "display error";
      const fallback = french ? "Erreur inconnue" : "Unknown error";
      return <pre style={{ padding: 24, color: "#ff8a8a", whiteSpace: "pre-wrap" }}>{`Baby Buddy Dashboard - ${title}\n${this.state.error?.name || "Error"}: ${this.state.error?.message || fallback}\n\n${this.state.error?.stack || ""}`}</pre>;
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AppErrorBoundary><LanguageProvider><App /></LanguageProvider></AppErrorBoundary>
  </StrictMode>
);
