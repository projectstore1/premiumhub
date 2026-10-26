// Premiumhub Customer Orders Module
import { db, auth } from "./firebase-config.js";
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { formatPrice } from "./products.js";

// Fetch customer's orders
export async function getCustomerOrders(userId) {
  if (!userId) return [];
  try {
    const q = query(
      collection(db, "orders"),
      where("userId", "==", userId)
    );
    const snap = await getDocs(q);
    const orders = [];
    snap.forEach((doc) => {
      orders.push({ id: doc.id, ...doc.data() });
    });
    // Sort descending by creation
    return orders.sort((a, b) => {
      const timeA = a.createdAt?.seconds || 0;
      const timeB = b.createdAt?.seconds || 0;
      return timeB - timeA;
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return [];
  }
}

// Real-time listener for customer orders
export function subscribeCustomerOrders(userId, callback) {
  if (!userId) return () => {};
  const q = query(
    collection(db, "orders"),
    where("userId", "==", userId)
  );
  return onSnapshot(q, (snap) => {
    const orders = [];
    snap.forEach((doc) => {
      orders.push({ id: doc.id, ...doc.data() });
    });
    orders.sort((a, b) => {
      const timeA = a.createdAt?.seconds || 0;
      const timeB = b.createdAt?.seconds || 0;
      return timeB - timeA;
    });
    callback(orders);
  });
}

// Generate Status Badge HTML
export function getStatusBadge(status, type = 'order') {
  const s = (status || '').toLowerCase().replace(/\s+/g, '-');
  let badgeClass = 'badge-pending';

  if (s.includes('confirm') || s.includes('complete') || s.includes('paid')) {
    badgeClass = 'badge-confirmed';
  } else if (s.includes('process')) {
    badgeClass = 'badge-processing';
  } else if (s.includes('review')) {
    badgeClass = 'badge-review';
  } else if (s.includes('reject') || s.includes('cancel') || s.includes('fail')) {
    badgeClass = 'badge-rejected';
  } else if (s.includes('unverified')) {
    badgeClass = 'badge-unverified';
  }

  return `<span class="badge ${badgeClass}">${status || 'Pending'}</span>`;
}
