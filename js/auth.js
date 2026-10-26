// Premiumhub & PHAdmin Authentication & User Profile Module
import {
  auth,
  db
} from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// Toast Notification Helper
export function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Generate unique 5-digit numeric profile UID (e.g. 54821, 82910)
export async function generateUniqueProfileUID() {
  const candidate = Math.floor(10000 + Math.random() * 90000).toString();
  try {
    const q = query(collection(db, "users"), where("profileUID", "==", candidate));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return candidate;
    }
  } catch (err) {
    console.warn("UID uniqueness query bypassed:", err);
  }
  return candidate;
}

// Register Customer
export async function registerCustomer(name, email, password) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const user = cred.user;
    try {
      await updateProfile(user, { displayName: name });
    } catch (e) {}

    const profileUID = await generateUniqueProfileUID();
    const userDocRef = doc(db, "users", user.uid);
    await setDoc(userDocRef, {
      uid: user.uid,
      profileUID: profileUID,
      displayName: name,
      email: email,
      role: "customer",
      createdAt: serverTimestamp(),
      disabled: false
    }, { merge: true });

    showToast("Registration successful! Welcome to Premiumhub", "success");
    return { user, profileUID };
  } catch (error) {
    showToast(error.message || "Registration failed", "error");
    throw error;
  }
}

// Login User
export async function loginUser(email, password) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    showToast("Logged in successfully", "success");
    return cred.user;
  } catch (error) {
    showToast(error.message || "Invalid credentials", "error");
    throw error;
  }
}

// Logout
export async function logoutUser() {
  try {
    await signOut(auth);
    showToast("Logged out successfully", "info");
    window.location.href = "./index.html";
  } catch (error) {
    showToast(error.message || "Logout failed", "error");
  }
}

// Reset Password
export async function resetPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    showToast("Password reset email sent! Check your inbox.", "success");
  } catch (error) {
    showToast(error.message || "Failed to send reset email", "error");
    throw error;
  }
}
