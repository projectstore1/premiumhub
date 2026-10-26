/**
 * Premiumhub Cloud Functions
 * Telegram Bot Order Notifications & Secure Verification Dispatcher
 */

import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { setGlobalOptions } from "firebase-functions/v2";

initializeApp();
const db = getFirestore();

// Limit concurrency to reduce cold-start costs
setGlobalOptions({ maxInstances: 10 });

/**
 * Server-side Telegram Bot Helper
 * TELEGRAM_BOT_TOKEN is loaded via Firebase Secret Manager
 * TELEGRAM_ADMIN_CHAT_ID is loaded via environment config
 */
async function sendTelegramNotification(message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

  if (!token || !chatId) {
    throw new Error("Telegram configuration is missing. Ensure TELEGRAM_BOT_TOKEN secret and TELEGRAM_ADMIN_CHAT_ID env var are set.");
  }

  const response = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Telegram notification request failed (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  if (!result.ok) {
    throw new Error(`Telegram API returned an error: ${result.description}`);
  }

  return true;
}

/**
 * Cloud Function Trigger: Process Notification Jobs Queue
 * Triggered whenever a job document is created in notificationJobs collection
 */
export const processNotificationJob = onDocumentCreated(
  {
    document: "notificationJobs/{jobId}",
    secrets: ["TELEGRAM_BOT_TOKEN"]
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const job = snap.data();
    if (job.status !== "queued") return;

    const jobRef = snap.ref;

    try {
      let message = "";

      if (job.type === "NEW_ORDER") {
        const p = job.payload || {};
        message = [
          "NEW ORDER RECEIVED — PREMIUMHUB",
          `Order ID: ${p.orderId || 'N/A'}`,
          `Product: ${p.productName || 'N/A'}`,
          `Price: ₦${(p.price || 0).toLocaleString()}`,
          `Customer: ${p.customerName || 'N/A'}`,
          `Profile UID: #${p.profileUID || 'N/A'}`,
          `Email: ${p.email || 'N/A'}`,
          `WhatsApp: ${p.whatsapp || 'N/A'}`,
          `Payment Method: ${p.paymentMethod || 'N/A'}`,
          `Transaction Reference: ${p.transactionReference || 'N/A'}`,
          "Payment Status: Unverified",
          "Order Status: Pending",
          `Date: ${new Date().toISOString()}`,
          "",
          "Open PHAdmin to review this order."
        ].join("\n");
      } else if (job.type === "TEST_NOTIFICATION") {
        message = job.message || "🔔 Premiumhub Telegram Integration Test — System is operational!";
      }

      if (message) {
        await sendTelegramNotification(message);
        await jobRef.update({
          status: "delivered",
          deliveredAt: FieldValue.serverTimestamp()
        });
      }
    } catch (err) {
      console.error("Failed to deliver Telegram notification:", err);
      await jobRef.update({
        status: "failed",
        error: err.message,
        failedAt: FieldValue.serverTimestamp(),
        retryCount: FieldValue.increment(1)
      });
    }
  }
);
