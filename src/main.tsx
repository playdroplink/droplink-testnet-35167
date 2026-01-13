
// Console filtering must be imported first to suppress errors early
import './lib/console-filter';

// Polyfill global for browser compatibility (stellar-sdk fix)
if (typeof global === "undefined") {
  // @ts-ignore
  window.global = window;
}

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { PiProvider } from "./contexts/PiContext";
import { UserPreferencesProvider } from "./contexts/UserPreferencesContext";
import ErrorBoundary from "./components/ErrorBoundary";

// Improved Pi Browser detection: checks for PiBrowser in userAgent and window.Pi object
function isPiBrowser() {
  if (typeof window === 'undefined' || !window.navigator) return false;
  const ua = window.navigator.userAgent || '';
  const isPiUA = /PiBrowser/i.test(ua);
  const hasPiObj = typeof window.Pi !== 'undefined';
  return isPiUA || hasPiObj;
}


// PRODUCTION ONLY - No environment validation or mock objects

// Run app immediately in production
(async () => {
  createRoot(document.getElementById("root")!).render(
    <ErrorBoundary>
      <PiProvider>
        <UserPreferencesProvider>
          <App />
        </UserPreferencesProvider>
      </PiProvider>
    </ErrorBoundary>
  );
})();
