// Premiumhub Global Floating Customer Support Widget
import { fetchSupportSettings } from "./products.js";

(async function initSupportWidget() {
  // Prevent duplicate insertion
  if (document.getElementById("ph-floating-support-btn")) return;

  const support = await fetchSupportSettings();

  const widget = document.createElement("div");
  widget.id = "ph-floating-support-container";
  widget.innerHTML = `
    <!-- Floating Support Bubble -->
    <button id="ph-floating-support-btn" style="position:fixed;bottom:78px;right:18px;z-index:999;background:linear-gradient(135deg,var(--color-primary, #6C3BFF),var(--color-dark-purple, #4B22CC));color:#FFFFFF;border:none;border-radius:9999px;padding:10px 18px;display:flex;align-items:center;gap:8px;font-weight:700;font-size:0.88rem;box-shadow:0 6px 20px rgba(108,59,255,0.4);cursor:pointer;transition:transform 0.2s, box-shadow 0.2s;font-family:system-ui, -apple-system, sans-serif;">
      <span style="font-size:1.15rem;">💬</span>
      <span>Support</span>
    </button>

    <!-- Support Modal Popup -->
    <div id="ph-support-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:1000;align-items:center;justify-content:center;padding:16px;">
      <div style="background:var(--color-card-bg,#FFFFFF);border-radius:20px;padding:24px;max-width:380px;width:100%;box-shadow:0 20px 40px rgba(0,0,0,0.25);border:1px solid #E8E5F2;position:relative;animation:fadeIn 0.2s ease;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:36px;height:36px;border-radius:10px;background:#F3EEFF;display:flex;align-items:center;justify-content:center;font-size:1.2rem;">💬</div>
            <div>
              <div style="font-weight:800;font-size:1.1rem;color:var(--color-text-main,#211B35);">Need Assistance?</div>
              <div style="font-size:0.78rem;color:var(--color-text-sub,#77718A);">24/7 Dedicated Support Desk</div>
            </div>
          </div>
          <button id="ph-support-close" style="background:none;border:none;font-size:1.5rem;color:var(--color-text-sub,#77718A);cursor:pointer;padding:4px 8px;line-height:1;">&times;</button>
        </div>

        <p style="font-size:0.85rem;color:var(--color-text-sub,#77718A);margin-bottom:18px;line-height:1.5;">
          Have questions about your order, automated verification, or crypto payments? Connect directly with our team:
        </p>

        <div style="display:flex;flex-direction:column;gap:10px;">
          <a href="${support.telegramUrl}" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-radius:12px;background:#0088cc;color:#ffffff;text-decoration:none;font-weight:700;box-shadow:0 4px 12px rgba(0,136,204,0.25);">
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="font-size:1.3rem;">✈️</span>
              <div>
                <div style="font-size:0.95rem;font-weight:800;">Chat on Telegram</div>
                <div style="font-size:0.75rem;opacity:0.9;font-weight:500;">${support.telegram}</div>
              </div>
            </div>
            <span>↗</span>
          </a>

          <a href="${support.whatsappUrl}" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-radius:12px;background:#25D366;color:#ffffff;text-decoration:none;font-weight:700;box-shadow:0 4px 12px rgba(37,211,102,0.25);">
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="font-size:1.3rem;">🟢</span>
              <div>
                <div style="font-size:0.95rem;font-weight:800;">Chat on WhatsApp</div>
                <div style="font-size:0.75rem;opacity:0.9;font-weight:500;">${support.whatsapp}</div>
              </div>
            </div>
            <span>↗</span>
          </a>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(widget);

  const btn = document.getElementById("ph-floating-support-btn");
  const modal = document.getElementById("ph-support-modal");
  const close = document.getElementById("ph-support-close");

  btn?.addEventListener("click", () => {
    modal.style.display = "flex";
  });

  close?.addEventListener("click", () => {
    modal.style.display = "none";
  });

  modal?.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.style.display = "none";
    }
  });
})();
