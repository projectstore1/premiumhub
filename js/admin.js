// PHAdmin Core Controller & Authentication Guard
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { formatPrice, formatUsdt, formatNaira, calculateNairaPrice, fetchExchangeRate } from "./products.js";
import { showToast } from "./auth.js";

// Check if user is an authorized admin
export async function verifyAdminAuth() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = "./index.html";
        resolve(null);
        return;
      }
      try {
        // Never grant admin rights merely because a user signed in.
        const adminSnap = await getDoc(doc(db, "admins", user.uid));
        if (!adminSnap.exists() || adminSnap.data().active !== true) {
          showToast("This account is not authorized for PHAdmin.", "error");
          await signOut(auth);
          window.location.href = "./index.html";
          resolve(null);
          return;
        }
        resolve({ user, isAdmin: true, role: "admin" });
        initAdminOrderNotifications();
      } catch (err) {
        console.error("Admin verification failed:", err);
        showToast("Could not verify admin permissions.", "error");
        resolve(null);
      }
    });
  });
}

// Browser notifications for new orders while PHAdmin is open.
let adminOrderUnsubscribe = null;
async function initAdminOrderNotifications() {
  if (adminOrderUnsubscribe) return;
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    try { await Notification.requestPermission(); } catch (_) {}
  }
  const { onSnapshot, collection, query, orderBy, limit } = await import("https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js");
  let firstSnapshot = true;
  const knownStatuses = new Map();
  adminOrderUnsubscribe = onSnapshot(query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(100)), (snap) => {
    if (firstSnapshot) { snap.docs.forEach(d => { const o=d.data(); knownStatuses.set(d.id, `${o.orderStatus||'Pending'}|${o.paymentStatus||'Unverified'}`); }); firstSnapshot = false; return; }
    snap.docChanges().forEach(change => {
      const order = change.doc.data();
      const previous = knownStatuses.get(change.doc.id);
      const status = `${order.orderStatus||'Pending'}|${order.paymentStatus||'Unverified'}`;
      if (Notification.permission === "granted" && change.type === "added") {
        const title = "New order received";
        const body = `${order.productName || "Product"}${order.productVariant ? " — " + order.productVariant : ""} · ${order.orderId || change.doc.id}`;
        if (navigator.serviceWorker?.controller) navigator.serviceWorker.ready.then(reg => reg.showNotification(title, { body, icon: "../assets/icons/phadmin-192.png", tag: `order-${change.doc.id}`, data: { url: "./orders.html" } })).catch(() => new Notification(title, { body }));
        else new Notification(title, { body });
      } else if (previous && previous !== status && Notification.permission === "granted") {
        const title = "Order status updated";
        const body = `${order.orderId || change.doc.id}: ${order.orderStatus || 'Pending'} · Payment ${order.paymentStatus || 'Unverified'}`;
        if (navigator.serviceWorker?.controller) navigator.serviceWorker.ready.then(reg => reg.showNotification(title, { body, icon: "../assets/icons/phadmin-192.png", tag: `order-status-${change.doc.id}` })).catch(() => new Notification(title, { body }));
        else new Notification(title, { body });
      }
      knownStatuses.set(change.doc.id, status);
    });
  }, err => console.warn("Order notification listener:", err));
}


// Sidebar toggle setup
export function initAdminSidebar() {
  const toggleBtn = document.getElementById("admin-menu-toggle");
  const sidebar = document.getElementById("admin-sidebar");
  const overlay = document.getElementById("admin-sidebar-overlay");
  const logoutBtn = document.getElementById("admin-logout-btn");

  if (toggleBtn && sidebar && overlay) {
    toggleBtn.addEventListener("click", () => {
      sidebar.classList.toggle("open");
      overlay.classList.toggle("open");
    });
    overlay.addEventListener("click", () => {
      sidebar.classList.remove("open");
      overlay.classList.remove("open");
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await signOut(auth);
      showToast("Signed out from PHAdmin", "info");
      window.location.href = "./index.html";
    });
  }

  // Highlight active nav item
  const currentPath = window.location.pathname;
  document.querySelectorAll(".sidebar-nav-item").forEach(link => {
    if (link.getAttribute("href") && currentPath.endsWith(link.getAttribute("href"))) {
      link.classList.add("active");
    }
  });
}

// Load Dashboard Metrics & Recent Orders
export async function loadDashboardStats() {
  try {
    let prodCount = 0;
    let userCount = 0;
    const orders = [];
    let totalSalesUsdt = 0;
    let pendingOrders = 0;
    let processingOrders = 0;
    let completedOrders = 0;
    let verifiedPayments = 0;

    // Load products count safely
    try {
      const prodSnap = await getDocs(collection(db, "products"));
      prodCount = prodSnap.size;
    } catch (e) {
      console.warn("Could not load products count:", e);
    }

    // Load users count safely
    try {
      const userSnap = await getDocs(collection(db, "users"));
      userCount = userSnap.size;
    } catch (e) {
      console.warn("Could not load users count:", e);
    }

    // Load orders safely
    try {
      const orderSnap = await getDocs(collection(db, "orders"));
      orderSnap.forEach(d => {
        const data = { id: d.id, ...d.data() };
        orders.push(data);
        const usdt = typeof data.priceUsdt === 'number' ? data.priceUsdt : (Number(data.price) || 0);
        if (data.paymentStatus === "Paid") {
          totalSalesUsdt += usdt;
          verifiedPayments++;
        }
        if (data.orderStatus === "Pending") pendingOrders++;
        if (data.orderStatus === "Processing") processingOrders++;
        if (data.orderStatus === "Completed") completedOrders++;
      });
    } catch (e) {
      console.warn("Could not load orders stats:", e);
    }

    // Update DOM counters
    const updateEl = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    updateEl("stat-total-products", prodCount);
    updateEl("stat-total-customers", userCount);
    updateEl("stat-total-orders", orders.length);
    
    const salesEl = document.getElementById("stat-total-sales");
    if (salesEl) {
      salesEl.innerHTML = `$${totalSalesUsdt.toFixed(2)} USDT <span style="font-size:0.75rem;font-weight:600;color:var(--admin-text-sub);display:block;">≈ ₦${calculateNairaPrice(totalSalesUsdt).toLocaleString()}</span>`;
    }

    updateEl("stat-pending-orders", pendingOrders);
    updateEl("stat-processing-orders", processingOrders);
    updateEl("stat-completed-orders", completedOrders);
    updateEl("stat-verified-payments", verifiedPayments);

    // Render Recent Orders Table
    const recentTable = document.getElementById("recent-orders-tbody");
    if (recentTable) {
      // Sort orders descending by creation time
      orders.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      const recent = orders.slice(0, 6);
      if (!recent.length) {
        recentTable.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--admin-text-sub);">No orders placed yet.</td></tr>`;
      } else {
        recentTable.innerHTML = recent.map(o => {
          const usdt = typeof o.priceUsdt === 'number' ? o.priceUsdt : (Number(o.price) || 0);
          return `
            <tr>
              <td style="font-weight:700;"><a href="./orders.html?id=${o.orderId}" style="color:var(--admin-primary);">${o.orderId}</a></td>
              <td>${o.customerName || 'Customer'} (#${o.profileUID || 'N/A'})</td>
              <td>${o.productName}</td>
              <td style="font-weight:700;">$${usdt.toFixed(2)} USDT <br><small style="color:var(--admin-text-sub);font-weight:500;">≈ ₦${calculateNairaPrice(usdt).toLocaleString()}</small></td>
              <td><span class="badge ${o.paymentStatus === 'Paid' ? 'badge-paid' : 'badge-unverified'}">${o.paymentStatus || 'Unverified'}</span></td>
              <td><span class="badge badge-processing">${o.orderStatus || 'Pending'}</span></td>
            </tr>
          `;
        }).join("");
      }
    }

    // Render Sales Bar Chart
    renderSalesChart(orders);

  } catch (err) {
    console.error("Error loading dashboard stats:", err);
  }
}

function renderSalesChart(orders) {
  const chartContainer = document.getElementById("sales-chart-bars");
  if (!chartContainer) return;

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayTotals = [0, 0, 0, 0, 0, 0, 0];

  orders.forEach(o => {
    if (o.createdAt?.seconds) {
      const date = new Date(o.createdAt.seconds * 1000);
      const day = date.getDay();
      const usdt = typeof o.priceUsdt === 'number' ? o.priceUsdt : (Number(o.price) || 0);
      dayTotals[day] += usdt;
    }
  });

  const max = Math.max(...dayTotals, 50);

  chartContainer.innerHTML = dayTotals.map((tot, idx) => {
    const heightPercent = Math.max(8, Math.round((tot / max) * 100));
    return `
      <div class="chart-bar-col">
        <div class="chart-bar-fill" style="height: ${heightPercent}%;" title="${days[idx]}: $${tot.toFixed(2)} USDT"></div>
        <span class="chart-bar-label">${days[idx]}</span>
      </div>
    `;
  }).join("");
}
