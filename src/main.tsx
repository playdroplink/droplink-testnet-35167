import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { PiProvider } from "./contexts/PiContext";
import { UserPreferencesProvider } from "./contexts/UserPreferencesContext";

// Set light mode as default if no theme preference exists
if (!localStorage.getItem('theme')) {
  localStorage.setItem('theme', 'light');
  document.documentElement.classList.remove('dark');
}

createRoot(document.getElementById("root")!).render(
  <PiProvider>
    <UserPreferencesProvider>
      <App />
    </UserPreferencesProvider>
  </PiProvider>
);
