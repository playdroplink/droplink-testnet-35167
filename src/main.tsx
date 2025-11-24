import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { PiProvider } from "./contexts/PiContext";
import { UserPreferencesProvider } from "./contexts/UserPreferencesContext";
import ErrorBoundary from "./components/ErrorBoundary";
import { validatePiEnvironment } from "./utils/pi-env-check";


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
