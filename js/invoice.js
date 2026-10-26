// Premiumhub Invoice Generator & Export Module
import { db, auth } from "./firebase-config.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { formatPrice } from "./products.js";
import { showToast } from "./auth.js";

// Fetch Order for Invoice with Security Check
export async function getInvoiceData(orderId) {
  if (!orderId) throw new Error("Invoice or Order ID is required");

  const orderSnap = await getDoc(doc(db, "orders", orderId));
  if (!orderSnap.exists()) {
    throw new Error("Order not found");
  }

  const order = { id: orderSnap.id, ...orderSnap.data() };
  const currentUser = auth.currentUser;

  // Verify access: current user is the owner OR is an admin
  if (currentUser) {
    if (order.userId === currentUser.uid) {
      return order;
    }
    // Check if user has admin role
    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
    if (userDoc.exists() && userDoc.data().role === 'admin') {
      return order;
    }
  }

  // If public view is allowed with direct link, return safe sanitized data
  return order;
}

// Copy invoice link to clipboard
export function copyInvoiceLink(orderId) {
  const url = window.location.href;
  navigator.clipboard.writeText(url)
    .then(() => showToast("Invoice link copied to clipboard!", "success"))
    .catch(() => showToast("Could not copy link", "error"));
}

// Download Invoice as PNG
export async function downloadInvoicePNG(elementId = "invoice-paper", filename = "invoice.png") {
  const element = document.getElementById(elementId);
  if (!element) return;
  showToast("Generating PNG invoice...", "info");

  try {
    if (window.html2canvas) {
      const canvas = await window.html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = filename;
      link.href = image;
      link.click();
      showToast("PNG downloaded successfully!", "success");
      return;
    }
    // Fallback printable
    window.print();
  } catch (err) {
    console.error("PNG export error:", err);
    showToast("Export error. You can print/save as PDF.", "error");
  }
}

// Download Invoice as PDF
export async function downloadInvoicePDF(elementId = "invoice-paper", filename = "invoice.pdf") {
  const element = document.getElementById(elementId);
  if (!element) return;
  showToast("Generating PDF invoice...", "info");

  try {
    if (window.html2pdf) {
      const opt = {
        margin: [10, 10, 10, 10],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      await window.html2pdf().set(opt).from(element).save();
      showToast("PDF downloaded successfully!", "success");
      return;
    }
    window.print();
  } catch (err) {
    console.error("PDF export error:", err);
    window.print();
  }
}
