import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

// Force immediate update: when a new SW is found, activate it and reload
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // Automatically update without prompting
    updateSW(true);
  },
  onOfflineReady() {
    console.log("App ready to work offline");
  },
});

createRoot(document.getElementById("root")!).render(<App />);
