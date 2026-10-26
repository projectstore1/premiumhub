// Premiumhub Checkout & Payment Processing Module
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
import { getProductById, formatPrice, calculateNairaPrice, getExchangeRate, formatUsdt, formatNaira } from "./products.js";
import { showToast } from "./auth.js";

// Fetch Active Crypto and Bank Payment Methods
export async function fetchPaymentMethods() {
  try {
    const methods = {
      crypto: [],
      bank: []
    };

    // 1. Crypto payment methods
    try {
      const cryptoSnap = await getDocs(query(collection(db, "paymentMethods"), where("active", "==", true)));
      cryptoSnap.forEach(d => methods.crypto.push({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn("Could not query paymentMethods:", e);
    }

    // 2. Bank accounts
    try {
      const bankSnap = await getDocs(query(collection(db, "bankAccounts"), where("active", "==", true)));
      bankSnap.forEach(d => methods.bank.push({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn("Could not query bankAccounts:", e);
    }

    // If Firestore is newly initialized or returned empty, provide active defaults
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
        id: "usdt-trc20",
        name: "USDT",
        network: "TRON (TRC20)",
        address: "TYDny7hXq2ZJvHk8F9M4a7uBcLe689721D",
        instructions: "Send only USDT on TRON (TRC20) network. Instant blockchain verification.",
        active: true
      },
      {
        id: "usdt-bep20",
        name: "USDT",
        network: "BNB Smart Chain (BEP20)",
        address: "0x89205A3A3b2A5531023740eE93BE38e94879201D",
        instructions: "Send only USDT on BEP20 network. Fast verification within 2 minutes.",
        active: true
      },
      {
        id: "solana",
        name: "SOL / USDT",
        network: "Solana Network",
        address: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
        instructions: "Send exact USDT or SOL equivalent. Transaction confirmed in seconds.",
        active: true
      }
    ],
    bank: [
      {
        id: "bank-opay",
        bankName: "OPay Digital Services",
        accountHolder: "PREMIUMHUB ENTERPRISE",
        accountNumber: "8123456789",
        instructions: "Transfer Naira to OPay. Enter your Profile UID as payment remark.",
        active: true
      },
      {
        id: "bank-moniepoint",
        bankName: "Moniepoint MFB",
        accountHolder: "PREMIUMHUB LIMITED",
        accountNumber: "5678901234",
        instructions: "Transfer Naira to Moniepoint. Instant settlement.",
        active: true
      }
    ]
  };
}

// Generate unique human-readable order ID
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

  // 1. Revalidate Product and Price
  const product = await getProductById(productId);
  if (!product || !product.available) {
    throw new Error("Selected product is unavailable or invalid.");
  }

  const rate = getExchangeRate();
  const priceUsdt = typeof product.price === 'number' ? product.price : parseFloat(product.price) || 0;
  const priceNaira = calculateNairaPrice(priceUsdt, rate);

  // 2. Fetch User Profile for Numeric Profile UID
  let profileUID = "0000";
  try {
    const userDocRef = doc(db, "users", currentUser.uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists() && userDoc.data().profileUID) {
      profileUID = userDoc.data().profileUID;
    } else {
      // Auto-generate profile UID if missing
      profileUID = Math.floor(10000 + Math.random() * 90000).toString();
      await setDoc(userDocRef, {
        profileUID: profileUID,
        email: currentUser.email || "",
        displayName: customerName || currentUser.displayName || "Customer",
        role: "customer"
      }, { merge: true });
    }
  } catch (e) {
    console.warn("Could not fetch profileUID, generating fallback:", e);
    profileUID = Math.floor(10000 + Math.random() * 90000).toString();
  }

  // 3. Prevent duplicate submission by transaction reference (safe try/catch)
  if (transactionReference && transactionReference.trim()) {
    try {
      const dupQuery = query(
        collection(db, "orders"),
        where("userId", "==", currentUser.uid),
        where("transactionReference", "==", transactionReference.trim())
      );
      const dupSnap = await getDocs(dupQuery);
      if (!dupSnap.empty) {
        throw new Error("You have already submitted an order with this transaction reference.");
      }
    } catch (e) {
      if (e.message && e.message.includes("already submitted")) throw e;
      console.warn("Duplicate reference check query bypassed:", e);
    }
  }

  const orderId = generateOrderId();
  const isCrypto = paymentMethod.toLowerCase().includes("crypto") || paymentMethod.toLowerCase().includes("usdt") || paymentMethod.toLowerCase().includes("sol");

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
    price: priceUsdt, // Base USDT price
    priceUsdt: priceUsdt,
    priceNaira: priceNaira,
    currency: "USDT",
    exchangeRate: rate,
    billingCurrency: isCrypto ? "USDT" : "NGN",
    payableAmount: isCrypto ? priceUsdt : priceNaira,
    paymentMethod: paymentMethod,
    paymentNetwork: paymentNetwork || "",
    paymentDetails: paymentDetails || "",
    transactionReference: transactionReference.trim(),
    paymentProofUrl: paymentProofUrl || "",
    orderStatus: "Pending", // Pending, Payment Under Review, Confirmed, Processing, Completed, Rejected
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
        priceUsdt: priceUsdt,
        priceNaira: priceNaira,
        customerName: orderData.customerName,
        profileUID: profileUID,
        email: orderData.customerEmail,
        whatsapp: orderData.customerWhatsApp,
        paymentMethod: paymentMethod,
        transactionReference: transactionReference.trim()
      }
    });

    await addDoc(collection(db, "auditLogs"), {
      action: "ORDER_CREATED",
      orderId: orderId,
      userId: currentUser.uid,
      timestamp: serverTimestamp(),
      details: `New order ${orderId} created for ${product.name} ($${priceUsdt} USDT / ₦${priceNaira})`
    });
  } catch (err) {
    console.warn("Notification job queue notice:", err);
  }

  return { success: true, orderId, order: orderData };
}
