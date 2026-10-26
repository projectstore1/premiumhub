// Premiumhub Checkout & Payment Processing
import { db, auth } from "./firebase-config.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  serverTimestamp,
  query,
  where
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { getProductById, formatPrice } from "./products.js";
import { showToast } from "./auth.js";

// Fetch Active Crypto and Bank Payment Methods
export async function fetchPaymentMethods() {
  try {
    const methods = {
      crypto: [],
      bank: []
    };

    // 1. Crypto payment methods
    const cryptoSnap = await getDocs(query(collection(db, "paymentMethods"), where("active", "==", true)));
    cryptoSnap.forEach(d => methods.crypto.push({ id: d.id, ...d.data() }));

    // 2. Bank accounts
    const bankSnap = await getDocs(query(collection(db, "bankAccounts"), where("active", "==", true)));
    bankSnap.forEach(d => methods.bank.push({ id: d.id, ...d.data() }));

    // If Firestore is newly initialized, provide configured active defaults
    if (methods.crypto.length === 0 && methods.bank.length === 0) {
      return getDefaultPaymentConfig();
    }

    return methods;
  } catch (err) {
    console.warn("Using default payment config:", err);
    return getDefaultPaymentConfig();
  }
}

function getDefaultPaymentConfig() {
  return {
    crypto: [
      {
        id: "usdt-bep20",
        name: "USDT",
        network: "BNB Smart Chain (BEP20)",
        address: "0x89205A3A3b2A5531023740eE93BE38e94879201D",
        instructions: "Send only USDT on BEP20 network. Payments sent via other networks cannot be recovered.",
        active: true
      },
      {
        id: "solana",
        name: "SOL",
        network: "Solana Network",
        address: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
        instructions: "Send exact SOL equivalent. Transaction is confirmed within 60 seconds.",
        active: true
      },
      {
        id: "usdc-erc20",
        name: "USDC",
        network: "ERC20 / Polygon",
        address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
        instructions: "Send USDC to the address provided and paste the tx hash below.",
        active: true
      }
    ],
    bank: [
      {
        id: "bank-opay",
        bankName: "OPay Digital Services",
        accountHolder: "PREMIUMHUB ENTERPRISE",
        accountNumber: "8123456789",
        instructions: "Transfer to OPay. Enter your Profile UID as the payment narration.",
        active: true
      },
      {
        id: "bank-moniepoint",
        bankName: "Moniepoint MFB",
        accountHolder: "PREMIUMHUB LIMITED",
        accountNumber: "5678901234",
        instructions: "Fast instant settlement. Keep your receipt for upload.",
        active: true
      }
    ]
  };
}

// Generate unique order ID
function generateOrderId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "PH-";
  for (let i = 0; i < 7; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Process Order Creation
export async function createOrder({
  productId,
  customerName,
  customerEmail,
  customerWhatsApp,
  paymentMethod,
  paymentNetwork,
  paymentDetails,
  transactionReference,
  paymentProofUrl = ""
}) {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("You must be logged in to place an order.");
  }

  // 1. Revalidate Product and Price on trusted data
  const product = await getProductById(productId);
  if (!product || !product.available) {
    throw new Error("Selected product is unavailable or invalid.");
  }

  const verifiedPrice = product.price;

  // 2. Fetch User Profile for Numeric Profile UID
  let profileUID = "0000";
  try {
    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
    if (userDoc.exists() && userDoc.data().profileUID) {
      profileUID = userDoc.data().profileUID;
    }
  } catch (e) {
    console.warn("Could not fetch profileUID:", e);
  }

  // 3. Prevent duplicate submission by transaction reference
  if (transactionReference && transactionReference.trim()) {
    const dupQuery = query(
      collection(db, "orders"),
      where("transactionReference", "==", transactionReference.trim())
    );
    const dupSnap = await getDocs(dupQuery);
    if (!dupSnap.empty) {
      throw new Error("An order with this transaction reference has already been submitted.");
    }
  }

  const orderId = generateOrderId();
  const orderData = {
    orderId,
    userId: currentUser.uid,
    profileUID: profileUID,
    customerName: customerName || currentUser.displayName || "Valued Customer",
    customerEmail: customerEmail || currentUser.email || "",
    customerWhatsApp: customerWhatsApp || "",
    productId: product.id,
    productName: product.name,
    productImage: product.image || "",
    price: verifiedPrice,
    currency: "₦",
    paymentMethod: paymentMethod,
    paymentNetwork: paymentNetwork || "",
    paymentDetails: paymentDetails || "",
    transactionReference: transactionReference.trim(),
    paymentProofUrl: paymentProofUrl || "",
    orderStatus: "Pending", // Pending, Payment Under Review, Confirmed, Processing, Completed, Rejected, Cancelled
    paymentStatus: "Unverified", // Unverified, Paid, Failed, Refunded
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  // 4. Save order to Firestore
  const orderRef = doc(db, "orders", orderId);
  await setDoc(orderRef, orderData);

  // 5. Create notification job for Telegram Bot & Audit Log
  try {
    await addDoc(collection(db, "notificationJobs"), {
      orderId: orderId,
      type: "NEW_ORDER",
      status: "queued",
      createdAt: serverTimestamp(),
      payload: {
        orderId: orderId,
        productName: product.name,
        price: verifiedPrice,
        customerName: orderData.customerName,
        profileUID: profileUID,
        email: orderData.customerEmail,
        whatsapp: orderData.customerWhatsApp,
        paymentMethod: paymentMethod,
        transactionReference: transactionReference.trim()
      }
    });

    // Also add to audit logs
    await addDoc(collection(db, "auditLogs"), {
      action: "ORDER_CREATED",
      orderId: orderId,
      userId: currentUser.uid,
      timestamp: serverTimestamp(),
      details: `New order ${orderId} created for ${product.name} (₦${verifiedPrice})`
    });
  } catch (err) {
    console.warn("Notification job queue notice:", err);
  }

  return { success: true, orderId, order: orderData };
}
