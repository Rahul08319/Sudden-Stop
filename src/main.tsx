import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { notifyFirstFrameReady, notifyGameReady, reportError } from "./game/youtubePlayables.ts";
import { platform } from "./platform/platformManager";

// Clean up any stale service workers or corrupted cache from prior builds
if (typeof window !== "undefined") {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    }).catch(() => {});
  }

  // Automatic recovery if browser tries to load old chunk hash after a new Vercel deployment
  window.addEventListener("vite:preloadError", (event) => {
    console.warn("Vite chunk preload error detected; reloading fresh deployment...", event);
    window.location.reload();
  });
}

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<App />);
}

window.addEventListener("error", reportError);
window.addEventListener("unhandledrejection", reportError);

void platform.init().catch(() => {});

requestAnimationFrame(() => {
  notifyFirstFrameReady();
  platform.firstFrameReady();
  requestAnimationFrame(() => {
    notifyGameReady();
    platform.gameReady();
  });
});
