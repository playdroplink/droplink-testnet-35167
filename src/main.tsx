
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

if (typeof window !== 'undefined') {
  console.log('[Droplink Debug] UserAgent:', window.navigator.userAgent);
  if (isPiBrowser()) {
    console.log('[Droplink Debug] Detected Pi Browser environment.');
  } else {
    console.log('[Droplink Debug] Not running in Pi Browser.');
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
  try {
    await validatePiEnvironment();
  } catch (err) {
    // If validation fails, throw an error to be caught by ErrorBoundary UI
    console.error('Pi environment validation failed:', err);
    // Render ErrorBoundary with thrown error by throwing here and letting React mount show it
    // We still render so ErrorBoundary can show a friendly message
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
