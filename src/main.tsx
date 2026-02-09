import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

// Force clear old caches on load to prevent stale content on mobile
if ("caches" in window) {
  caches.keys().then((names) => {
    for (const name of names) {
      // Clear workbox precache and runtime caches on version mismatch
      if (name.includes("workbox") || name.includes("supabase-api")) {
        caches.delete(name);
      }
    }
  });
}

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
  onRegisteredSW(swUrl, registration) {
    // Check for updates every 60 seconds on mobile
    if (registration) {
      setInterval(() => {
        registration.update();
      }, 60 * 1000);
    }
  },
});

createRoot(document.getElementById("root")!).render(<App />);
