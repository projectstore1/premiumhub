// Premiumhub Products, Banners, and Notice Management
import { db } from "./firebase-config.js";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  orderBy,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// Format currency
export function formatPrice(amount, currency = '₦') {
  if (typeof amount !== 'number') amount = parseFloat(amount) || 0;
  return `${currency}${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

// Fetch published products
export async function fetchProducts(category = null) {
  try {
    const productsRef = collection(db, "products");
    let q;
    if (category && category !== 'all') {
      q = query(productsRef, where("category", "==", category), where("active", "==", true));
    } else {
      q = query(productsRef, where("active", "==", true));
    }
    const snapshot = await getDocs(q);
    
    // If no products exist yet, seed initial premium products
    if (snapshot.empty && (!category || category === 'all')) {
      return await seedInitialProducts();
    }

    const products = [];
    snapshot.forEach(docSnap => {
      products.push({ id: docSnap.id, ...docSnap.data() });
    });
    return products;
  } catch (error) {
    console.error("Error fetching products:", error);
    return getFallbackProducts();
  }
}

// Fetch single product by ID
export async function getProductById(id) {
  try {
    const docRef = doc(db, "products", id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    }
    // Check fallback
    const fallback = getFallbackProducts().find(p => p.id === id);
    return fallback || null;
  } catch (err) {
    console.error("Error getting product:", err);
    return getFallbackProducts().find(p => p.id === id) || null;
  }
}

// Fetch Banners for Carousel
export async function fetchBanners() {
  try {
    const bannersRef = collection(db, "banners");
    const q = query(bannersRef, where("active", "==", true));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const banners = [];
      snapshot.forEach(doc => banners.push({ id: doc.id, ...doc.data() }));
      return banners;
    }
  } catch (e) {
    console.warn("Using default banners:", e);
  }
  return getDefaultBanners();
}

// Fetch Site Notice
export async function fetchSiteNotice() {
  try {
    const snap = await getDoc(doc(db, "siteSettings", "notice"));
    if (snap.exists() && snap.data().active) {
      return snap.data();
    }
  } catch (e) {
    console.warn("Using default notice:", e);
  }
  return {
    active: true,
    text: "🔥 Welcome to Premiumhub! Enjoy fast automated checkout with Crypto & Naira Bank transfers.",
    linkText: "Browse Store",
    linkUrl: "#products"
  };
}

// Seed initial default products to Firestore if empty
async function seedInitialProducts() {
  const defaults = getFallbackProducts();
  try {
    for (const item of defaults) {
      await addDoc(collection(db, "products"), {
        name: item.name,
        price: item.price,
        oldPrice: item.oldPrice,
        category: item.category,
        image: item.image,
        description: item.description,
        available: true,
        active: true,
        createdAt: serverTimestamp()
      });
    }
  } catch (e) {
    console.warn("Could not seed to Firestore:", e);
  }
  return defaults;
}

function getDefaultBanners() {
  return [
    {
      id: "banner-1",
      badge: "EXCLUSIVE DEALS",
      title: "Discover Premium Subscriptions & Digital Assets",
      subtitle: "Instant delivery, verified security, and multi-crypto checkout.",
      linkText: "Shop Now",
      linkUrl: "#products",
      imageUrl: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1200&q=80"
    },
    {
      id: "banner-2",
      badge: "CRYPTO & NAIRA READY",
      title: "Fast USDT, SOL, & Direct Bank Payments",
      subtitle: "Pay seamlessly with automated transaction verification.",
      linkText: "Learn More",
      linkUrl: "#products",
      imageUrl: "https://images.unsplash.com/photo-1621416894569-0f39ed31d247?auto=format&fit=crop&w=1200&q=80"
    }
  ];
}

function getFallbackProducts() {
  return [
    {
      id: "prod-spotify",
      name: "Spotify Premium 1-Year Family Plan",
      price: 15500,
      oldPrice: 22000,
      category: "Entertainment",
      image: "https://images.unsplash.com/photo-1614680376593-902f749f7ffc?auto=format&fit=crop&w=600&q=80",
      description: "Get 12 months of non-stop ad-free music, offline listening, and high-fidelity streaming. Activated directly on your private account.",
      available: true,
      active: true
    },
    {
      id: "prod-netflix",
      name: "Netflix Premium Ultra HD 4K (Private Profile)",
      price: 9500,
      oldPrice: 14000,
      category: "Entertainment",
      image: "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?auto=format&fit=crop&w=600&q=80",
      description: "Watch in 4K HDR on any device. Personalized PIN-locked private profile with complete streaming freedom.",
      available: true,
      active: true
    },
    {
      id: "prod-chatgpt",
      name: "ChatGPT Plus 1-Month Subscription",
      price: 28500,
      oldPrice: 35000,
      category: "AI & Tools",
      image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=600&q=80",
      description: "Access GPT-4o, DALL-E image generation, advanced data analysis, and voice mode with priority server uptime.",
      available: true,
      active: true
    },
    {
      id: "prod-canva",
      name: "Canva Pro Lifetime License",
      price: 7500,
      oldPrice: 15000,
      category: "Design",
      image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80",
      description: "Unlock all premium templates, Brand Kit, background remover, and cloud storage for life.",
      available: true,
      active: true
    },
    {
      id: "prod-telegram",
      name: "Telegram Premium 1-Year Membership",
      price: 24000,
      oldPrice: 32000,
      category: "Communication",
      image: "https://images.unsplash.com/photo-1618761714954-0b8cd0026356?auto=format&fit=crop&w=600&q=80",
      description: "4GB file uploads, faster downloads, voice-to-text transcriptions, exclusive premium stickers, and profile badge.",
      available: true,
      active: true
    },
    {
      id: "prod-youtube",
      name: "YouTube Premium 6-Month Ad-Free + Music",
      price: 11000,
      oldPrice: 16000,
      category: "Entertainment",
      image: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=600&q=80",
      description: "Zero ads on videos, background play while using other apps, and full access to YouTube Music Premium.",
      available: true,
      active: true
    },
    {
      id: "prod-tradingview",
      name: "TradingView Pro+ Annual Plan",
      price: 45000,
      oldPrice: 65000,
      category: "Finance",
      image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=600&q=80",
      description: "Multi-chart layouts, 100+ server alerts, volume profile indicators, and real-time intraday crypto & forex data.",
      available: true,
      active: true
    },
    {
      id: "prod-duolingo",
      name: "Duolingo Super Annual Subscription",
      price: 12000,
      oldPrice: 18000,
      category: "Education",
      image: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&w=600&q=80",
      description: "Unlimited hearts, practice mistakes, personalized review quizzes, and ad-free language learning on iOS & Android.",
      available: true,
      active: true
    }
  ];
}
