// Premiumhub Customer Profile Controller
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { doc, getDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { showToast } from "./auth.js";

export function initProfilePage() {
  const container = document.getElementById("profile-content");
  if (!container) return;

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "./login.html?redirect=profile.html";
      return;
    }

    try {
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);
      const userData = snap.exists() ? snap.data() : {};
      const profileUID = userData.profileUID || "Pending";
      const createdAt = userData.createdAt?.seconds 
        ? new Date(userData.createdAt.seconds * 1000).toLocaleDateString()
        : "Recent";

      container.innerHTML = `
        <div class="card" style="max-width: 600px; margin: 0 auto;">
          <div style="display:flex;align-items:center;gap:18px;margin-bottom:24px;border-bottom:1px solid var(--color-border);padding-bottom:18px;">
            <div style="width:68px;height:68px;border-radius:50%;background:linear-gradient(135deg,var(--color-primary),var(--color-dark-purple));color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.8rem;font-weight:800;box-shadow:0 4px 14px rgba(108,59,255,0.3);">
              ${(user.displayName || user.email || 'U')[0].toUpperCase()}
            </div>
            <div>
              <h2 style="font-size:1.35rem;font-weight:800;">${user.displayName || "Customer"}</h2>
              <div style="display:flex;align-items:center;gap:8px;margin-top:4px;">
                <span style="font-size:0.8rem;font-weight:700;background:var(--color-light-purple);color:var(--color-primary);padding:3px 10px;border-radius:9999px;">
                  Profile UID: #${profileUID}
                </span>
                <span style="font-size:0.8rem;color:var(--color-text-sub);">Member since: ${createdAt}</span>
              </div>
            </div>
          </div>

          <form id="profile-edit-form">
            <div class="form-group">
              <label class="form-label">Full Name</label>
              <input type="text" id="prof-name" class="form-input" value="${user.displayName || ''}" required>
            </div>

            <div class="form-group">
              <label class="form-label">Email Address (Login ID)</label>
              <input type="email" class="form-input" value="${user.email || ''}" disabled style="background:#F8F7FC;cursor:not-allowed;">
            </div>

            <div class="form-group">
              <label class="form-label">WhatsApp Number (For Order Updates)</label>
              <input type="tel" id="prof-whatsapp" class="form-input" placeholder="+234..." value="${userData.whatsapp || ''}">
            </div>

            <div class="form-group">
              <label class="form-label">Unique Numeric Profile UID</label>
              <input type="text" class="form-input" value="${profileUID}" disabled style="background:#F8F7FC;font-weight:700;color:var(--color-primary);letter-spacing:1px;cursor:not-allowed;">
              <small style="color:var(--color-text-sub);font-size:0.8rem;">Used as your reference for direct bank & crypto order verification.</small>
            </div>

            <button type="submit" class="btn btn-primary btn-block" style="margin-top:12px;">
              Save Profile Changes
            </button>
          </form>

          <div style="margin-top:20px;display:flex;justify-content:space-between;border-top:1px solid var(--color-border);padding-top:16px;">
            <a href="./my-orders.html" class="btn btn-secondary btn-sm">View My Orders</a>
            <button id="logout-btn" class="btn btn-outline btn-sm" style="color:var(--color-error);">Log Out</button>
          </div>
        </div>
      `;

      // Profile edit submit
      document.getElementById("profile-edit-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const newName = document.getElementById("prof-name").value.trim();
        const newWhatsapp = document.getElementById("prof-whatsapp").value.trim();

        try {
          await updateDoc(userRef, {
            displayName: newName,
            whatsapp: newWhatsapp,
            updatedAt: serverTimestamp()
          });
          showToast("Profile updated successfully!", "success");
        } catch (err) {
          showToast(err.message || "Failed to update profile", "error");
        }
      });

      // Logout handler
      document.getElementById("logout-btn")?.addEventListener("click", () => {
        auth.signOut().then(() => {
          showToast("Logged out", "info");
          window.location.href = "./index.html";
        });
      });
    } catch (err) {
      console.error("Profile load error:", err);
      container.innerHTML = `<div class="card"><p style="color:red;">Error loading profile. Please refresh.</p></div>`;
    }
  });
}
