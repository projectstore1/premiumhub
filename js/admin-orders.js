// PHAdmin Orders Management Module
import { db } from "./firebase-config.js";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { formatPrice } from "./products.js";
import { showToast } from "./auth.js";

let allOrders = [];

export async function initOrdersPage() {
  const tbody = document.getElementById("orders-tbody");
  const searchInput = document.getElementById("order-search");
  const statusFilter = document.getElementById("order-status-filter");
  const paymentFilter = document.getElementById("order-payment-filter");
  const exportBtn = document.getElementById("export-orders-csv");
  const modal = document.getElementById("order-details-modal");
  const closeModalBtn = document.getElementById("close-order-modal");

  await loadOrders();

  // Check URL query for specific order ID
  const urlParams = new URLSearchParams(window.location.search);
  const targetId = urlParams.get("id");
  if (targetId) {
    setTimeout(() => openOrderModal(targetId), 400);
  }

  function renderTable(items) {
    if (!tbody) return;
    if (!items.length) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--admin-text-sub);">No orders found matching criteria.</td></tr>`;
      return;
    }

    tbody.innerHTML = items.map(o => {
      const dateStr = o.createdAt?.seconds 
        ? new Date(o.createdAt.seconds * 1000).toLocaleString() 
        : 'Recent';

      return `
        <tr>
          <td style="font-weight:700;"><a href="#" class="view-order-link" data-id="${o.orderId}" style="color:var(--admin-primary);">${o.orderId}</a></td>
          <td>
            <div style="font-weight:600;">${o.customerName || 'Customer'}</div>
            <div style="font-size:0.75rem;color:var(--admin-text-sub);">UID: #${o.profileUID || 'N/A'} • ${o.customerEmail || ''}</div>
          </td>
          <td>${o.productName}</td>
          <td style="font-weight:700;">${formatPrice(o.price)}</td>
          <td>
            <span style="font-size:0.8rem;font-weight:600;">${o.paymentMethod || 'Crypto/Bank'}</span>
            <div style="font-size:0.72rem;color:var(--admin-text-sub);max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">Ref: ${o.transactionReference || 'None'}</div>
          </td>
          <td>
            <span class="badge ${o.paymentStatus === 'Paid' ? 'badge-paid' : 'badge-unverified'}">
              ${o.paymentStatus || 'Unverified'}
            </span>
          </td>
          <td>
            <span class="badge badge-processing">${o.orderStatus || 'Pending'}</span>
          </td>
          <td>
            <button class="btn btn-secondary btn-sm view-order-btn" data-id="${o.orderId}">Manage</button>
          </td>
        </tr>
      `;
    }).join("");

    document.querySelectorAll(".view-order-link, .view-order-btn").forEach(el => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        openOrderModal(el.dataset.id);
      });
    });
  }

  async function loadOrders() {
    try {
      const snap = await getDocs(collection(db, "orders"));
      allOrders = [];
      snap.forEach(d => allOrders.push({ id: d.id, ...d.data() }));
      allOrders.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      renderTable(allOrders);
    } catch (e) {
      console.error(e);
      showToast("Error loading orders", "error");
    }
  }

  function filter() {
    const q = (searchInput?.value || "").toLowerCase().trim();
    const st = statusFilter?.value || "all";
    const pay = paymentFilter?.value || "all";

    const filtered = allOrders.filter(o => {
      const matchQ = (o.orderId || '').toLowerCase().includes(q) ||
                     (o.customerName || '').toLowerCase().includes(q) ||
                     (o.customerEmail || '').toLowerCase().includes(q) ||
                     (o.profileUID || '').toString().includes(q) ||
                     (o.transactionReference || '').toLowerCase().includes(q);
      const matchStatus = (st === "all") || (o.orderStatus === st);
      const matchPay = (pay === "all") || (o.paymentStatus === pay);
      return matchQ && matchStatus && matchPay;
    });

    renderTable(filtered);
  }

  searchInput?.addEventListener("input", filter);
  statusFilter?.addEventListener("change", filter);
  paymentFilter?.addEventListener("change", filter);

  // Order Details Modal
  function openOrderModal(orderId) {
    const order = allOrders.find(o => o.orderId === orderId);
    if (!order || !modal) return;

    const modalBody = document.getElementById("order-modal-details");
    if (!modalBody) return;

    modalBody.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--admin-border);padding-bottom:12px;">
          <div>
            <h3 style="font-size:1.2rem;font-weight:800;color:var(--admin-text-main);">${order.orderId}</h3>
            <span style="font-size:0.8rem;color:var(--admin-text-sub);">Created: ${order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleString() : 'N/A'}</span>
          </div>
          <a href="../invoice.html?id=${order.orderId}" target="_blank" class="btn btn-outline btn-sm">View Public Invoice ↗</a>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;background:#FAF9FE;padding:14px;border-radius:12px;">
          <div>
            <div style="font-size:0.75rem;color:var(--admin-text-sub);text-transform:uppercase;font-weight:700;">Customer Info</div>
            <div style="font-weight:700;margin-top:2px;">${order.customerName}</div>
            <div style="font-size:0.82rem;color:var(--admin-primary);font-weight:600;">UID: #${order.profileUID}</div>
            <div style="font-size:0.82rem;color:var(--admin-text-sub);">${order.customerEmail || 'No Email'}</div>
            <div style="font-size:0.82rem;color:var(--admin-text-sub);">WhatsApp: ${order.customerWhatsApp || 'N/A'}</div>
          </div>
          <div>
            <div style="font-size:0.75rem;color:var(--admin-text-sub);text-transform:uppercase;font-weight:700;">Order Details</div>
            <div style="font-weight:700;margin-top:2px;">${order.productName}</div>
            <div style="font-size:1.1rem;font-weight:800;color:var(--admin-primary);">${formatPrice(order.price)}</div>
            <div style="font-size:0.82rem;color:var(--admin-text-sub);margin-top:4px;">Method: ${order.paymentMethod}</div>
          </div>
        </div>

        ${order.customerRequirements && Object.keys(order.customerRequirements).length ? `<div style="background:#F3EEFF;border:1px solid var(--admin-border);padding:14px;border-radius:12px;"><div style="font-size:.8rem;font-weight:700;margin-bottom:8px;">Customer delivery requirements</div>${Object.entries(order.customerRequirements).map(([k,v])=>`<div style="font-size:.85rem;margin:4px 0;"><strong>${String(k).replace(/[<>]/g,'')}</strong>: ${String(v).replace(/[<>]/g,'')}</div>`).join('')}</div>` : ''}
        <div style="background:#FFF;border:1px solid var(--admin-border);padding:14px;border-radius:12px;">
          <div style="font-size:0.8rem;font-weight:700;color:var(--admin-text-sub);text-transform:uppercase;margin-bottom:6px;">Transaction Reference / Proof</div>
          <div style="font-family:monospace;background:#F1EFF8;padding:8px 12px;border-radius:6px;word-break:break-all;font-size:0.9rem;font-weight:600;">
            ${order.transactionReference || 'No reference submitted'}
          </div>
          ${order.paymentProofUrl ? `<div style="margin-top:10px;"><a href="${order.paymentProofUrl}" target="_blank" style="color:var(--admin-primary);font-weight:600;font-size:0.85rem;">View Uploaded Payment Proof Receipt ↗</a></div>` : ''}
        </div>

        <form id="update-order-status-form" style="display:flex;flex-direction:column;gap:12px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="form-group" style="margin:0;">
              <label class="form-label">Payment Status</label>
              <select id="modal-payment-status" class="form-select">
                <option value="Unverified" ${order.paymentStatus === 'Unverified' ? 'selected' : ''}>Unverified</option>
                <option value="Paid" ${order.paymentStatus === 'Paid' ? 'selected' : ''}>Paid (Verified)</option>
                <option value="Failed" ${order.paymentStatus === 'Failed' ? 'selected' : ''}>Failed</option>
                <option value="Refunded" ${order.paymentStatus === 'Refunded' ? 'selected' : ''}>Refunded</option>
              </select>
            </div>
            <div class="form-group" style="margin:0;">
              <label class="form-label">Order Processing Status</label>
              <select id="modal-order-status" class="form-select">
                <option value="Pending" ${order.orderStatus === 'Pending' ? 'selected' : ''}>Pending</option>
                <option value="Payment Under Review" ${order.orderStatus === 'Payment Under Review' ? 'selected' : ''}>Payment Under Review</option>
                <option value="Confirmed" ${order.orderStatus === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
                <option value="Processing" ${order.orderStatus === 'Processing' ? 'selected' : ''}>Processing</option>
                <option value="Completed" ${order.orderStatus === 'Completed' ? 'selected' : ''}>Completed</option>
                <option value="Rejected" ${order.orderStatus === 'Rejected' ? 'selected' : ''}>Rejected</option>
                <option value="Cancelled" ${order.orderStatus === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
              </select>
            </div>
          </div>

          <div class="form-group" style="margin:0;">
            <label class="form-label">Customer delivery details (shown on their private invoice)</label>
            <textarea id="modal-delivery-details" class="form-textarea" rows="4" placeholder="Product activation code, login instructions, account details, or delivery message">${order.deliveryDetails || ''}</textarea>
          </div>
          <div class="form-group" style="margin:0;">
            <label class="form-label">Admin Internal Note (not shown on invoice)</label>
            <textarea id="modal-admin-note" class="form-textarea" rows="2" placeholder="Internal note">${order.adminNote || ''}</textarea>
          </div>

          <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:8px;">
            <button type="button" class="btn btn-outline" id="close-order-modal-sub">Cancel</button>
            <button type="submit" class="btn btn-primary">Update Order</button>
          </div>
        </form>
      </div>
    `;

    modal.classList.add("open");

    document.getElementById("close-order-modal-sub")?.addEventListener("click", () => modal.classList.remove("open"));

    document.getElementById("update-order-status-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const newPayStatus = document.getElementById("modal-payment-status").value;
      const newOrderStatus = document.getElementById("modal-order-status").value;
      const newNote = document.getElementById("modal-admin-note").value.trim();
      const deliveryDetails = document.getElementById("modal-delivery-details").value.trim();

      try {
        await updateDoc(doc(db, "orders", order.orderId), {
          paymentStatus: newPayStatus,
          orderStatus: newOrderStatus,
          deliveryDetails,
          adminNote: newNote,
          updatedAt: serverTimestamp()
        });

        // Audit log
        await addDoc(collection(db, "auditLogs"), {
          action: "ORDER_UPDATED",
          orderId: order.orderId,
          details: `Order ${order.orderId} status set to ${newOrderStatus}, payment set to ${newPayStatus}`,
          timestamp: serverTimestamp()
        });

        showToast("Order status updated successfully!", "success");
        modal.classList.remove("open");
        await loadOrders();
      } catch (err) {
        showToast(err.message || "Failed to update order", "error");
      }
    });
  }

  closeModalBtn?.addEventListener("click", () => modal.classList.remove("open"));

  // CSV Export
  exportBtn?.addEventListener("click", () => {
    if (!allOrders.length) {
      showToast("No orders available to export", "info");
      return;
    }

    const headers = ["Order ID", "Customer Name", "Profile UID", "Email", "WhatsApp", "Product", "Price", "Payment Method", "Transaction Ref", "Payment Status", "Order Status", "Date"];
    const rows = allOrders.map(o => [
      `"${o.orderId}"`,
      `"${o.customerName || ''}"`,
      `"${o.profileUID || ''}"`,
      `"${o.customerEmail || ''}"`,
      `"${o.customerWhatsApp || ''}"`,
      `"${o.productName || ''}"`,
      `"${o.price || 0}"`,
      `"${o.paymentMethod || ''}"`,
      `"${o.transactionReference || ''}"`,
      `"${o.paymentStatus || ''}"`,
      `"${o.orderStatus || ''}"`,
      `"${o.createdAt?.seconds ? new Date(o.createdAt.seconds * 1000).toISOString() : ''}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `premiumhub-orders-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast("Orders exported to CSV", "success");
  });
}
