// Premiumhub Customer Settings Module
import { showToast } from "./auth.js";

export function initSettingsPage() {
  const installBtn = document.getElementById("manual-install-btn");
  if (installBtn) {
    installBtn.addEventListener("click", () => {
      if (typeof window.triggerPWAInstall === "function") {
        window.triggerPWAInstall();
      } else {
        showToast("Open your browser menu and choose 'Add to Home Screen'", "info");
      }
    });
  }

  // Clear cache / reset local storage preferences
  const clearCacheBtn = document.getElementById("clear-cache-btn");
  if (clearCacheBtn) {
    clearCacheBtn.addEventListener("click", async () => {
      if (confirm("Clear local cache and saved settings?")) {
        localStorage.clear();
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map(k => caches.delete(k)));
        }
        showToast("Cache cleared! Reloading...", "success");
        setTimeout(() => window.location.reload(), 1000);
      }
    });
  }
}
