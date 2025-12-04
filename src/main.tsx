
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
import { validatePiEnvironment } from "./utils/pi-env-check";

// Improved Pi Browser detection: checks for PiBrowser in userAgent and window.Pi object
function isPiBrowser() {
  if (typeof window === 'undefined' || !window.navigator) return false;
  const ua = window.navigator.userAgent || '';
  const isPiUA = /PiBrowser/i.test(ua);
  const hasPiObj = typeof window.Pi !== 'undefined';
  return isPiUA || hasPiObj;
}


// Production: No mock Pi object. Only real Pi SDK should be used.


// Set theme from localStorage or default to light
const theme = localStorage.getItem('theme');
if (theme === 'dark') {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
  localStorage.setItem('theme', 'light');
}

// Run Pi environment validation before rendering to avoid silent white screens in Pi Browser
(async () => {
  let validationError = null;
  try {
    await validatePiEnvironment();
  } catch (err) {
    validationError = err;
    // Log error to console and show fallback UI if possible
    console.error('Pi environment validation failed:', err);
    // Optionally, you can show a fallback error message here if React hasn't mounted yet
    const root = document.getElementById("root");
    if (root) {
      root.innerHTML = `<div style='padding:32px;text-align:center;color:red;'><h2>Pi environment validation failed</h2><pre style='white-space:pre-wrap;'>${err instanceof Error ? err.message : err}</pre><p>Please check your Pi Developer Portal settings, HTTPS, manifest, and validation key.</p></div>`;
    }
  }

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
