import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { PiProvider } from "./contexts/PiContext";
import { UserPreferencesProvider } from "./contexts/UserPreferencesContext";

createRoot(document.getElementById("root")!).render(
  <PiProvider>
    <UserPreferencesProvider>
      <App />
    </UserPreferencesProvider>
  </PiProvider>
);
