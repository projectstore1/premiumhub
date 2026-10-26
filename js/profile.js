// Premiumhub Customer Profile Controller
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { showToast, generateUniqueProfileUID } from "./auth.js";

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
      let userData = snap.exists() ? snap.data() : {};
      
      // Auto-create Numeric Profile UID if missing
      let profileUID = userData.profileUID;
      if (!profileUID) {
        profileUID = await generateUniqueProfileUID();
        try {
          await setDoc(userRef, {
            uid: user.uid,
            profileUID: profileUID,
            email: user.email || "",
            displayName: user.displayName || "Customer",
            role: userData.role || "customer",
            createdAt: serverTimestamp()
          }, { merge: true });
        } catch (saveErr) {
          console.warn("Could not auto-persist profile UID:", saveErr);
        }
      }

      const createdAt = userData.createdAt?.seconds 
        ? new Date(userData.createdAt.seconds * 1000).toLocaleDateString()
        : "Active Member";

      container.innerHTML = `
        <div class="card" style="max-width: 600px; margin: 0 auto;">
          <div style="display:flex;align-items:center;gap:18px;margin-bottom:24px;border-bottom:1px solid var(--color-border);padding-bottom:18px;">
            <div style="width:68px;height:68px;border-radius:50%;background:linear-gradient(135deg,var(--color-primary),var(--color-dark-purple));color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.8rem;font-weight:800;box-shadow:0 4px 14px rgba(108,59,255,0.3);">
              ${(user.displayName || user.email || 'U')[0].toUpperCase()}
            </div>
            <div>
              <h2 style="font-size:1.35rem;font-weight:800;">${user.displayName || "Customer Profile"}</h2>
              <div style="display:flex;align-items:center;gap:8px;margin-top:4px;flex-wrap:wrap;">
                <span style="font-size:0.82rem;font-weight:800;background:var(--color-light-purple);color:var(--color-primary);padding:4px 12px;border-radius:9999px;border:1px solid #D2C8FF;">
                  Profile UID: #${profileUID}
                </span>
                <span style="font-size:0.8rem;color:var(--color-text-sub);">${createdAt}</span>
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
              <label class="form-label">WhatsApp Number (For Order Updates & Delivery)</label>
              <input type="tel" id="prof-whatsapp" class="form-input" placeholder="+234..." value="${userData.whatsapp || ''}">
            </div>

            <div class="form-group">
              <label class="form-label">Unique Numeric Profile UID (Reference)</label>
              <input type="text" class="form-input" value="${profileUID}" disabled style="background:#F8F7FC;font-weight:800;color:var(--color-primary);letter-spacing:1px;cursor:not-allowed;">
              <small style="color:var(--color-text-sub);font-size:0.8rem;">Your permanent automated verification reference for Crypto and Naira transfers.</small>
            </div>

            <button type="submit" id="save-prof-btn" class="btn btn-primary btn-block" style="margin-top:12px;">
              Save Profile Changes
            </button>
          </form>

          <div style="margin-top:20px;display:flex;justify-content:space-between;border-top:1px solid var(--color-border);padding-top:16px;">
            <a href="./my-orders.html" class="btn btn-secondary btn-sm">View My Orders</a>
            <button id="logout-btn" class="btn btn-outline btn-sm" style="color:var(--color-error);">Log Out</button>
          </div>
        </div>
      `;

      // Profile edit submit handler
      document.getElementById("profile-edit-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const saveBtn = document.getElementById("save-prof-btn");
        saveBtn.disabled = true;
        saveBtn.textContent = "Saving Changes...";

        const newName = document.getElementById("prof-name").value.trim();
        const newWhatsapp = document.getElementById("prof-whatsapp").value.trim();

        try {
          if (user.displayName !== newName) {
            await updateProfile(user, { displayName: newName }).catch(() => {});
          }

          // Use setDoc with merge: true to avoid document not found or permission errors
          await setDoc(userRef, {
            displayName: newName,
            whatsapp: newWhatsapp,
            email: user.email || "",
            profileUID: profileUID,
            updatedAt: serverTimestamp()
          }, { merge: true });

          showToast("Profile changes saved successfully!", "success");
        } catch (err) {
          console.error("Save profile error:", err);
          showToast(err.message || "Failed to update profile", "error");
        } finally {
          saveBtn.disabled = false;
          saveBtn.textContent = "Save Profile Changes";
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
      container.innerHTML = `<div class="card"><p style="color:red;">Error loading profile: ${err.message}. Please refresh.</p></div>`;
    }
  });
}
