
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { PiProvider } from "./contexts/PiContext";
import { UserPreferencesProvider } from "./contexts/UserPreferencesContext";
import ErrorBoundary from "./components/ErrorBoundary";
import { validatePiEnvironment } from "./utils/pi-env-check";

// Debug: Detect if running in Pi Browser and log environment info

// Improved Pi Browser detection: checks for PiBrowser in userAgent and window.Pi object
function isPiBrowser() {
  if (typeof window === 'undefined' || !window.navigator) return false;
  const ua = window.navigator.userAgent || '';
  const isPiUA = /PiBrowser/i.test(ua);
  const hasPiObj = typeof window.Pi !== 'undefined';
  return isPiUA || hasPiObj;
}


// For development/testing: force window.Pi to true if not present
if (typeof window !== 'undefined') {
  console.log('[Droplink Debug] UserAgent:', window.navigator.userAgent);
  if (isPiBrowser()) {
    console.log('[Droplink Debug] Detected Pi Browser environment.');
  } else {
    console.log('[Droplink Debug] Not running in Pi Browser.');
    if (typeof window.Pi === 'undefined') {
      window.Pi = {
        init: async () => {},
        authenticate: async () => ({
          accessToken: 'mock-access-token',
          user: { username: 'mockuser', uid: 'mockuid' }
        }),
        createPayment: async () => ({}),
        nativeFeaturesList: async () => ([]),
        Ads: {
          isAdReady: async () => ({ type: 'rewarded', ready: true }),
          showAd: async () => ({ type: 'rewarded', result: 'AD_REWARDED' }),
        },
        openShareDialog: () => {},
        openUrlInSystemBrowser: async () => {},
      };
      console.log('[Droplink Debug] window.Pi mock object set for dev/test');
    }
  }
  console.log('[Droplink Debug] Location:', window.location.href);
}


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
