// Premiumhub Products, Banners, Exchange Rate & Support Module
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

// Exchange Rate Configuration (1 USDT / USD = 1,440 Naira default)
export const DEFAULT_USD_TO_NAIRA_RATE = 1440;
let cachedExchangeRate = DEFAULT_USD_TO_NAIRA_RATE;

export async function fetchExchangeRate() {
  try {
    const snap = await getDoc(doc(db, "siteSettings", "currency"));
    if (snap.exists() && snap.data().usdToNairaRate) {
      cachedExchangeRate = parseFloat(snap.data().usdToNairaRate) || DEFAULT_USD_TO_NAIRA_RATE;
      return cachedExchangeRate;
    }
    // Also check support doc
    const suppSnap = await getDoc(doc(db, "siteSettings", "support"));
    if (suppSnap.exists() && suppSnap.data().usdToNairaRate) {
      cachedExchangeRate = parseFloat(suppSnap.data().usdToNairaRate) || DEFAULT_USD_TO_NAIRA_RATE;
      return cachedExchangeRate;
    }
  } catch (err) {
    console.warn("Using default exchange rate (1$ = 1440 NGN):", err);
  }
  return DEFAULT_USD_TO_NAIRA_RATE;
}

export function getExchangeRate() {
  return cachedExchangeRate;
}

export function setExchangeRate(rate) {
  if (typeof rate === 'number' && rate > 0) {
    cachedExchangeRate = rate;
  }
}

// Convert USDT to Naira
export function calculateNairaPrice(usdtPrice, rate = cachedExchangeRate) {
  const usdt = typeof usdtPrice === 'number' ? usdtPrice : parseFloat(usdtPrice) || 0;
  return Math.round(usdt * (rate || DEFAULT_USD_TO_NAIRA_RATE));
}

// Format USDT string
export function formatUsdt(amount) {
  const val = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`;
}

// Format Naira string
export function formatNaira(amount) {
  const val = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  return `₦${val.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// Backward-compatible & enhanced formatPrice
// Default displays USDT with auto-calculated Naira equivalent
export function formatPrice(amount, rate = cachedExchangeRate) {
  let usdt = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  if (usdt > 500) {
    usdt = +(usdt / (rate || DEFAULT_USD_TO_NAIRA_RATE)).toFixed(2);
  }
  const naira = calculateNairaPrice(usdt, rate);
  return `${formatUsdt(usdt)} (≈ ${formatNaira(naira)})`;
}

// Fetch Customer Support Settings (Telegram, WhatsApp)
export async function fetchSupportSettings() {
  try {
    const snap = await getDoc(doc(db, "siteSettings", "support"));
    if (snap.exists()) {
      const data = snap.data();
      return {
        telegram: data.telegram || "@MD_ABDULLAH",
        telegramUrl: data.telegramUrl || (data.telegram?.startsWith('http') ? data.telegram : `https://t.me/${(data.telegram || 'MD_ABDULLAH').replace('@', '')}`),
        whatsapp: data.whatsapp || "+2348000000000",
        whatsappUrl: data.whatsappUrl || (data.whatsapp?.startsWith('http') ? data.whatsapp : `https://wa.me/${(data.whatsapp || '2348000000000').replace(/[^0-9]/g, '')}`),
        usdToNairaRate: parseFloat(data.usdToNairaRate) || DEFAULT_USD_TO_NAIRA_RATE
      };
    }
  } catch (err) {
    console.warn("Using default support links:", err);
  }
  return {
    telegram: "@MD_ABDULLAH",
    telegramUrl: "https://t.me/MD_ABDULLAH",
    whatsapp: "+2348000000000",
    whatsappUrl: "https://wa.me/2348000000000",
    usdToNairaRate: DEFAULT_USD_TO_NAIRA_RATE
  };
}

// Fetch published products
export async function fetchProducts(category = null) {
  await fetchExchangeRate();
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
      const data = docSnap.data();
      // Ensure price is USDT; if old naira price (> 100), convert to USDT
      let usdtPrice = data.price;
      if (typeof usdtPrice === 'number' && usdtPrice > 500) {
        usdtPrice = +(usdtPrice / cachedExchangeRate).toFixed(2);
      }
      products.push({
        id: docSnap.id,
        ...data,
        price: usdtPrice,
        priceUsdt: usdtPrice,
        priceNaira: calculateNairaPrice(usdtPrice)
      });
    });
    return products;
  } catch (error) {
    console.error("Error fetching products:", error);
    return getFallbackProducts();
  }
}

// Fetch single product by ID
export async function getProductById(id) {
  await fetchExchangeRate();
  try {
    const docRef = doc(db, "products", id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      let usdtPrice = data.price;
      if (typeof usdtPrice === 'number' && usdtPrice > 500) {
        usdtPrice = +(usdtPrice / cachedExchangeRate).toFixed(2);
      }
      return {
        id: snap.id,
        ...data,
        price: usdtPrice,
        priceUsdt: usdtPrice,
        priceNaira: calculateNairaPrice(usdtPrice)
      };
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
    text: "🔥 Welcome to Premiumhub! Prices in USDT with instant 1$=₦1,440 Naira bank & crypto payments.",
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
        price: item.price, // USDT base
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
      subtitle: "Instant delivery, verified security, USDT & Naira checkout (1$ = ₦1,440).",
      linkText: "Shop Now",
      linkUrl: "#products",
      imageUrl: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1200&q=80"
    },
    {
      id: "banner-2",
      badge: "USDT & NAIRA READY",
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
      price: 10.75, // USDT
      oldPrice: 15.00,
      priceNaira: 15480,
      category: "Entertainment",
      image: "https://images.unsplash.com/photo-1614680376593-902f749f7ffc?auto=format&fit=crop&w=600&q=80",
      description: "Get 12 months of non-stop ad-free music, offline listening, and high-fidelity streaming. Activated directly on your private account.",
      available: true,
      active: true
    },
    {
      id: "prod-netflix",
      name: "Netflix Premium Ultra HD 4K (Private Profile)",
      price: 6.60, // USDT
      oldPrice: 10.00,
      priceNaira: 9504,
      category: "Entertainment",
      image: "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?auto=format&fit=crop&w=600&q=80",
      description: "Watch in 4K HDR on any device. Personalized PIN-locked private profile with complete streaming freedom.",
      available: true,
      active: true
    },
    {
      id: "prod-chatgpt",
      name: "ChatGPT Plus 1-Month Subscription",
      price: 20.00, // USDT
      oldPrice: 25.00,
      priceNaira: 28800,
      category: "AI & Tools",
      image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=600&q=80",
      description: "Access GPT-4o, DALL-E image generation, advanced data analysis, and voice mode with priority server uptime.",
      available: true,
      active: true
    },
    {
      id: "prod-canva",
      name: "Canva Pro Lifetime License",
      price: 5.20, // USDT
      oldPrice: 10.00,
      priceNaira: 7488,
      category: "Design",
      image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80",
      description: "Unlock all premium templates, Brand Kit, background remover, and cloud storage for life.",
      available: true,
      active: true
    },
    {
      id: "prod-telegram",
      name: "Telegram Premium 1-Year Membership",
      price: 16.50, // USDT
      oldPrice: 22.00,
      priceNaira: 23760,
      category: "Communication",
      image: "https://images.unsplash.com/photo-1618761714954-0b8cd0026356?auto=format&fit=crop&w=600&q=80",
      description: "4GB file uploads, faster downloads, voice-to-text transcriptions, exclusive premium stickers, and profile badge.",
      available: true,
      active: true
    },
    {
      id: "prod-youtube",
      name: "YouTube Premium 6-Month Ad-Free + Music",
      price: 7.60, // USDT
      oldPrice: 11.00,
      priceNaira: 10944,
      category: "Entertainment",
      image: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=600&q=80",
      description: "Zero ads on videos, background play while using other apps, and full access to YouTube Music Premium.",
      available: true,
      active: true
    },
    {
      id: "prod-tradingview",
      name: "TradingView Pro+ Annual Plan",
      price: 31.25, // USDT
      oldPrice: 45.00,
      priceNaira: 45000,
      category: "Finance",
      image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=600&q=80",
      description: "Intraday bar replay, multi-chart layouts, 100+ server-side alerts, volume profile, and VIP indicators.",
      available: true,
      active: true
    },
    {
      id: "prod-apple",
      name: "Apple Music 1-Year Individual Subscription",
      price: 8.50, // USDT
      oldPrice: 12.00,
      priceNaira: 12240,
      category: "Entertainment",
      image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80",
      description: "Spatial audio with Dolby Atmos, lossless audio quality, and over 100 million tracks worldwide.",
      available: true,
      active: true
    }
  ];
}
