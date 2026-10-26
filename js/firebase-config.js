import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import {
  getStorage
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-storage.js";
import {
  getFunctions
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-functions.js";

const firebaseConfig = {
  apiKey: "AIzaSyBpEnmamrWAeAbnsUDDgUzVcaqB0q2Sl_M",
  authDomain: "ecommerceproject-ca840.firebaseapp.com",
  projectId: "ecommerceproject-ca840",
  storageBucket: "ecommerceproject-ca840.firebasestorage.app",
  messagingSenderId: "1010677219657",
  appId: "1:1010677219657:web:b757e0dc8d6cca2ebd9a98",
  measurementId: "G-TKMZSPC2CL"
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
export const authPersistence = setPersistence(
  auth,
  browserLocalPersistence
);
