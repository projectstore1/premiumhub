// PHAdmin Settings, Payments, Banners, and Telegram Configuration Module
import { db } from "./firebase-config.js";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { showToast } from "./auth.js";

export async function initAdminSettingsPage() {
  await loadPaymentMethods();
  await loadBanners();
  await loadNoticeSettings();
  await loadGeneralSettings();

  // 1. Notice Settings Form
  document.getElementById("notice-settings-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const active = document.getElementById("notice-active").checked;
    const text = document.getElementById("notice-text").value.trim();
    const linkText = document.getElementById("notice-link-text").value.trim();
    const linkUrl = document.getElementById("notice-link-url").value.trim();

    try {
      await setDoc(doc(db, "siteSettings", "notice"), {
        active,
        text,
        linkText,
        linkUrl,
        updatedAt: serverTimestamp()
      });
      showToast("Store notice updated successfully!", "success");
    } catch (err) {
      showToast(err.message || "Failed to update notice", "error");
    }
  });

  // 2. Add Crypto Method Form
  document.getElementById("add-crypto-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("crypto-name").value.trim();
    const network = document.getElementById("crypto-network").value.trim();
    const address = document.getElementById("crypto-address").value.trim();
    const instructions = document.getElementById("crypto-instructions").value.trim();

    try {
      await addDoc(collection(db, "paymentMethods"), {
        name,
        network,
        address,
        instructions,
        active: true,
        createdAt: serverTimestamp()
      });
      showToast("Crypto payment method added!", "success");
      document.getElementById("add-crypto-form").reset();
      await loadPaymentMethods();
    } catch (err) {
      showToast(err.message || "Error adding crypto method", "error");
    }
  });

  // 3. Add Bank Account Form
  document.getElementById("add-bank-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const bankName = document.getElementById("bank-name").value.trim();
    const accountHolder = document.getElementById("bank-holder").value.trim();
    const accountNumber = document.getElementById("bank-number").value.trim();
    const instructions = document.getElementById("bank-instructions").value.trim();

    try {
      await addDoc(collection(db, "bankAccounts"), {
        bankName,
        accountHolder,
        accountNumber,
        instructions,
        active: true,
        createdAt: serverTimestamp()
      });
      showToast("Naira bank account added!", "success");
      document.getElementById("add-bank-form").reset();
      await loadPaymentMethods();
    } catch (err) {
      showToast(err.message || "Error adding bank account", "error");
    }
  });

  // 4. Add Banner Slide Form
  document.getElementById("add-banner-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("banner-title").value.trim();
    const subtitle = document.getElementById("banner-subtitle").value.trim();
    const badge = document.getElementById("banner-badge").value.trim();
    const imageUrl = document.getElementById("banner-image").value.trim();
    const linkUrl = document.getElementById("banner-link").value.trim();

    try {
      await addDoc(collection(db, "banners"), {
        title,
        subtitle,
        badge,
        imageUrl,
        linkUrl,
        active: true,
        createdAt: serverTimestamp()
      });
      showToast("Promotional banner added!", "success");
      document.getElementById("add-banner-form").reset();
      await loadBanners();
    } catch (err) {
      showToast(err.message || "Error adding banner", "error");
    }
  });

  // 5. Telegram Test Notification Button
  document.getElementById("test-telegram-btn")?.addEventListener("click", async () => {
    const chatId = document.getElementById("telegram-chat-id")?.value.trim();
    if (!chatId) {
      showToast("Please enter an Admin Chat ID", "warning");
      return;
    }
    showToast("Queueing test notification job...", "info");
    try {
      await addDoc(collection(db, "notificationJobs"), {
        type: "TEST_NOTIFICATION",
        chatId: chatId,
        status: "queued",
        createdAt: serverTimestamp(),
        message: "🔔 Premiumhub Telegram Integration Test — System is operational!"
      });
      showToast("Notification job queued in Firestore! Triggering Cloud Function.", "success");
    } catch (err) {
      showToast("Failed to queue job: " + err.message, "error");
    }
  });
}

async function loadPaymentMethods() {
  const cryptoList = document.getElementById("crypto-list");
  const bankList = document.getElementById("bank-list");

  if (cryptoList) {
    try {
      const snap = await getDocs(collection(db, "paymentMethods"));
      if (snap.empty) {
        cryptoList.innerHTML = `<div style="color:var(--admin-text-sub);padding:10px;">No custom crypto methods yet. Default USDT/SOL/USDC are active.</div>`;
      } else {
        const items = [];
        snap.forEach(d => items.push({ id: d.id, ...d.data() }));
        cryptoList.innerHTML = items.map(c => `
          <div style="background:#FFF;border:1px solid var(--admin-border);padding:12px;border-radius:10px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
            <div>
              <div style="font-weight:700;">${c.name} <span style="font-size:0.8rem;color:var(--admin-primary);">(${c.network})</span></div>
              <div style="font-family:monospace;font-size:0.82rem;color:var(--admin-text-sub);word-break:break-all;">${c.address}</div>
            </div>
            <div style="display:flex;gap:6px;">
              <button class="toggle-crypto-btn btn-sm" data-id="${c.id}" data-active="${c.active !== false}" style="background:${c.active !== false ? '#DCFCE7' : '#F3F4F6'};color:${c.active !== false ? '#15803D' : '#6B7280'};">
                ${c.active !== false ? 'Active' : 'Disabled'}
              </button>
              <button class="del-crypto-btn btn-sm" data-id="${c.id}" style="background:#FEE2E2;color:#DC2626;">Delete</button>
            </div>
          </div>
        `).join("");

        document.querySelectorAll(".del-crypto-btn").forEach(btn => {
          btn.addEventListener("click", async () => {
            if (confirm("Delete crypto method?")) {
              await deleteDoc(doc(db, "paymentMethods", btn.dataset.id));
              showToast("Deleted", "info");
              loadPaymentMethods();
            }
          });
        });

        document.querySelectorAll(".toggle-crypto-btn").forEach(btn => {
          btn.addEventListener("click", async () => {
            const current = btn.dataset.active === "true";
            await updateDoc(doc(db, "paymentMethods", btn.dataset.id), { active: !current });
            loadPaymentMethods();
          });
        });
      }
    } catch (e) { console.error(e); }
  }

  if (bankList) {
    try {
      const snap = await getDocs(collection(db, "bankAccounts"));
      if (snap.empty) {
        bankList.innerHTML = `<div style="color:var(--admin-text-sub);padding:10px;">No custom bank accounts yet. Default OPay & Moniepoint are active.</div>`;
      } else {
        const items = [];
        snap.forEach(d => items.push({ id: d.id, ...d.data() }));
        bankList.innerHTML = items.map(b => `
          <div style="background:#FFF;border:1px solid var(--admin-border);padding:12px;border-radius:10px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
            <div>
              <div style="font-weight:700;">${b.bankName} — <span style="color:var(--admin-primary);">${b.accountNumber}</span></div>
              <div style="font-size:0.85rem;color:var(--admin-text-sub);">${b.accountHolder}</div>
            </div>
            <div style="display:flex;gap:6px;">
              <button class="toggle-bank-btn btn-sm" data-id="${b.id}" data-active="${b.active !== false}" style="background:${b.active !== false ? '#DCFCE7' : '#F3F4F6'};color:${b.active !== false ? '#15803D' : '#6B7280'};">
                ${b.active !== false ? 'Active' : 'Disabled'}
              </button>
              <button class="del-bank-btn btn-sm" data-id="${b.id}" style="background:#FEE2E2;color:#DC2626;">Delete</button>
            </div>
          </div>
        `).join("");

        document.querySelectorAll(".del-bank-btn").forEach(btn => {
          btn.addEventListener("click", async () => {
            if (confirm("Delete bank account?")) {
              await deleteDoc(doc(db, "bankAccounts", btn.dataset.id));
              showToast("Deleted", "info");
              loadPaymentMethods();
            }
          });
        });

        document.querySelectorAll(".toggle-bank-btn").forEach(btn => {
          btn.addEventListener("click", async () => {
            const current = btn.dataset.active === "true";
            await updateDoc(doc(db, "bankAccounts", btn.dataset.id), { active: !current });
            loadPaymentMethods();
          });
        });
      }
    } catch (e) { console.error(e); }
  }
}

async function loadBanners() {
  const bannerList = document.getElementById("banner-list");
  if (!bannerList) return;
  try {
    const snap = await getDocs(collection(db, "banners"));
    if (snap.empty) {
      bannerList.innerHTML = `<div style="color:var(--admin-text-sub);padding:10px;">Default promotional banners are currently active.</div>`;
    } else {
      const items = [];
      snap.forEach(d => items.push({ id: d.id, ...d.data() }));
      bannerList.innerHTML = items.map(b => `
        <div style="background:#FFF;border:1px solid var(--admin-border);padding:12px;border-radius:10px;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between;gap:12px;">
          <img src="${b.imageUrl}" style="width:70px;height:40px;object-fit:cover;border-radius:6px;" alt="">
          <div style="flex:1;">
            <div style="font-weight:700;font-size:0.9rem;">${b.title}</div>
            <div style="font-size:0.75rem;color:var(--admin-text-sub);">${b.subtitle || ''}</div>
          </div>
          <button class="del-banner-btn btn-sm" data-id="${b.id}" style="background:#FEE2E2;color:#DC2626;">Delete</button>
        </div>
      `).join("");

      document.querySelectorAll(".del-banner-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
          if (confirm("Delete banner slide?")) {
            await deleteDoc(doc(db, "banners", btn.dataset.id));
            showToast("Banner deleted", "info");
            loadBanners();
          }
        });
      });
    }
  } catch (e) { console.error(e); }
}

async function loadNoticeSettings() {
  try {
    const snap = await getDoc(doc(db, "siteSettings", "notice"));
    if (snap.exists()) {
      const data = snap.data();
      const activeEl = document.getElementById("notice-active");
      const textEl = document.getElementById("notice-text");
      const linkTextEl = document.getElementById("notice-link-text");
      const linkUrlEl = document.getElementById("notice-link-url");

      if (activeEl) activeEl.checked = data.active !== false;
      if (textEl) textEl.value = data.text || "";
      if (linkTextEl) linkTextEl.value = data.linkText || "";
      if (linkUrlEl) linkUrlEl.value = data.linkUrl || "";
    }
  } catch (e) { console.error(e); }
}

async function loadGeneralSettings() {
  try {
    const snap = await getDoc(doc(db, "siteSettings", "general"));
    if (snap.exists()) {
      const data = snap.data();
      const chatIdEl = document.getElementById("telegram-chat-id");
      if (chatIdEl && data.telegramChatId) {
        chatIdEl.value = data.telegramChatId;
      }
    }
  } catch (e) { console.error(e); }
}
