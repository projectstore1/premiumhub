// PHAdmin Core Controller & Authentication Guard
import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { formatPrice } from "./products.js";
import { showToast } from "./auth.js";

// Check if user is an authorized admin
export async function verifyAdminAuth() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (!window.location.pathname.endsWith("/admin/") && !window.location.pathname.endsWith("/admin/index.html")) {
          window.location.href = "/admin/index.html";
        }
        resolve(null);
        return;
      }

      try {
        const userDocRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userDocRef);

        // Check if there are ANY admins yet in the database.
        // If not, auto-promote the first user who accesses /admin/ so they can initialize the system!
        const adminQuery = query(collection(db, "users"), where("role", "==", "admin"));
        const adminSnaps = await getDocs(adminQuery);

        if (adminSnaps.empty) {
          // Promote this first user as Admin!
          await setDoc(userDocRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || "Master Administrator",
            role: "admin",
            createdAt: serverTimestamp()
          }, { merge: true });
          showToast("Welcome! You have been provisioned as Master Administrator.", "success");
          resolve({ user, isAdmin: true, role: "admin" });
          return;
        }

        if (userSnap.exists() && userSnap.data().role === "admin") {
          resolve({ user, isAdmin: true, role: "admin" });
        } else {
          showToast("Access Denied: Administrator role required.", "error");
          await signOut(auth);
          window.location.href = "/admin/index.html";
          resolve(null);
        }
      } catch (err) {
        console.error("Admin verification error:", err);
        resolve({ user, isAdmin: true }); // Fallback allow in dev
      }
    });
  });
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
      window.location.href = "/admin/index.html";
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
    const [prodSnap, orderSnap, userSnap] = await Promise.all([
      getDocs(collection(db, "products")),
      getDocs(collection(db, "orders")),
      getDocs(collection(db, "users"))
    ]);

    const totalProducts = prodSnap.size;
    const totalCustomers = userSnap.size;
    const orders = [];
    let totalSales = 0;
    let pendingOrders = 0;
    let processingOrders = 0;
    let completedOrders = 0;
    let verifiedPayments = 0;

    orderSnap.forEach(d => {
      const data = { id: d.id, ...d.data() };
      orders.push(data);

      if (data.paymentStatus === "Paid") {
        totalSales += (Number(data.price) || 0);
        verifiedPayments++;
      }
      if (data.orderStatus === "Pending") pendingOrders++;
      if (data.orderStatus === "Processing") processingOrders++;
      if (data.orderStatus === "Completed") completedOrders++;
    });

    // Update DOM counters
    const updateEl = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    updateEl("stat-total-products", totalProducts);
    updateEl("stat-total-customers", totalCustomers);
    updateEl("stat-total-orders", orders.length);
    updateEl("stat-total-sales", formatPrice(totalSales));
    updateEl("stat-pending-orders", pendingOrders);
    updateEl("stat-processing-orders", processingOrders);
    updateEl("stat-completed-orders", completedOrders);
    updateEl("stat-verified-payments", verifiedPayments);

    // Render Recent Orders Table
    const recentTable = document.getElementById("recent-orders-tbody");
    if (recentTable) {
      const recent = orders.slice(0, 6);
      if (!recent.length) {
        recentTable.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--admin-text-sub);">No orders placed yet.</td></tr>`;
      } else {
        recentTable.innerHTML = recent.map(o => `
          <tr>
            <td style="font-weight:700;"><a href="/admin/orders.html?id=${o.orderId}" style="color:var(--admin-primary);">${o.orderId}</a></td>
            <td>${o.customerName || 'Customer'} (#${o.profileUID || 'N/A'})</td>
            <td>${o.productName}</td>
            <td style="font-weight:700;">${formatPrice(o.price)}</td>
            <td><span class="badge ${o.paymentStatus === 'Paid' ? 'badge-paid' : 'badge-unverified'}">${o.paymentStatus || 'Unverified'}</span></td>
            <td><span class="badge badge-processing">${o.orderStatus || 'Pending'}</span></td>
          </tr>
        `).join("");
      }
    }

    // Render Simple Weekly Sales Bar Chart
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
      dayTotals[day] += (Number(o.price) || 0);
    }
  });

  const max = Math.max(...dayTotals, 10000);

  chartContainer.innerHTML = dayTotals.map((tot, idx) => {
    const heightPercent = Math.max(8, Math.round((tot / max) * 100));
    return `
      <div class="chart-bar-col">
        <div class="chart-bar-fill" style="height: ${heightPercent}%;" title="${days[idx]}: ${formatPrice(tot)}"></div>
        <span class="chart-bar-label">${days[idx]}</span>
      </div>
    `;
  }).join("");
}
