
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
    // Log error to console only, let ErrorBoundary handle UI
    console.error('Pi environment validation failed:', err);
  }

  createRoot(document.getElementById("root")!).render(
    <ErrorBoundary>
      <PiProvider>
        <UserPreferencesProvider>
          {validationError ? (
            <div style={{padding:32, textAlign:'center', color:'#b91c1c', background:'#fff'}}>
              <h2 style={{fontSize:24, marginBottom:12}}>Pi environment validation failed</h2>
              <pre style={{whiteSpace:'pre-wrap', wordBreak:'break-word', color:'#111'}}>{validationError instanceof Error ? validationError.message : String(validationError)}</pre>
              <p style={{marginTop:14, color:'#666'}}>Please check your Pi Developer Portal settings, HTTPS, manifest, and validation key.<br/>If the problem persists, try clearing Pi Browser cache or open this site in a regular browser.</p>
            </div>
          ) : <App />}
        </UserPreferencesProvider>
      </PiProvider>
    </ErrorBoundary>
  );
})();
