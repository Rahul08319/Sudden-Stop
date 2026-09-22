import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { notifyFirstFrameReady, notifyGameReady, reportError } from "./game/youtubePlayables.ts";
import { platform } from "./platform/platformManager";

createRoot(document.getElementById("root")!).render(<App />);

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
