import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { notifyFirstFrameReady, notifyGameReady, reportError } from "./game/youtubePlayables.ts";

createRoot(document.getElementById("root")!).render(<App />);

window.addEventListener("error", reportError);
window.addEventListener("unhandledrejection", reportError);

requestAnimationFrame(() => {
  notifyFirstFrameReady();
  requestAnimationFrame(notifyGameReady);
});
