import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { App } from "./App";
import { AuthProvider } from "./features/auth/auth-context";
import { ThemeProvider } from "./features/theme/theme-provider";
import { queryClient } from "./lib/query";
import "./index.css";

const container = document.getElementById("root");
if (!container) throw new Error("Root element #root was not found");

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // PWA support is best-effort; ignore registration failures.
    });
  });
}

createRoot(container).render(
  <StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
);
