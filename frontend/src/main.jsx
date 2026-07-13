import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { registerSW } from "virtual:pwa-register";

// Register service worker — auto updates silently
registerSW({
  onNeedRefresh() {
    // New content available — auto reload
    console.log("[PWA] New content available, updating...");
  },
  onOfflineReady() {
    console.log("[PWA] App ready for offline use");
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
