import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { PiProvider } from "./contexts/PiContext";
import { UserPreferencesProvider } from "./contexts/UserPreferencesContext";

// Ensure light mode is default
document.documentElement.classList.remove('dark');
if (!localStorage.getItem('theme')) {
  localStorage.setItem('theme', 'light');
}

createRoot(document.getElementById("root")!).render(
  <PiProvider>
    <UserPreferencesProvider>
      <App />
    </UserPreferencesProvider>
  </PiProvider>
);
