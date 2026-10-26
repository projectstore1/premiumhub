// Premiumhub Customer Settings & Support Module
import { showToast } from "./auth.js";
import { fetchSupportSettings } from "./products.js";

export async function initSettingsPage() {
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

  // Dynamically load Admin-Configured Telegram & WhatsApp links
  try {
    const support = await fetchSupportSettings();
    const tgBtn = document.getElementById("support-telegram-btn");
    const waBtn = document.getElementById("support-whatsapp-btn");
    const tgLabel = document.getElementById("support-telegram-label");
    const waLabel = document.getElementById("support-whatsapp-label");

    if (tgBtn && support.telegramUrl) {
      tgBtn.href = support.telegramUrl;
      if (tgLabel && support.telegram) {
        tgLabel.textContent = `${support.telegram} • Instant Replies`;
      }
    }

    if (waBtn && support.whatsappUrl) {
      waBtn.href = support.whatsappUrl;
      if (waLabel && support.whatsapp) {
        waLabel.textContent = `${support.whatsapp} • Direct Chat`;
      }
    }
  } catch (e) {
    console.warn("Could not populate support links:", e);
  }
}
