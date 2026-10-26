// PHAdmin Products Management Module
import { db } from "./firebase-config.js";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import { formatPrice, formatUsdt, formatNaira, calculateNairaPrice, fetchExchangeRate, getExchangeRate } from "./products.js";
import { showToast } from "./auth.js";

let productsList = [];

export async function initProductsPage() {
  await fetchExchangeRate();
  const tableBody = document.getElementById("products-tbody");
  const addBtn = document.getElementById("open-add-product-modal");
  const modal = document.getElementById("product-modal");
  const closeBtn = document.getElementById("close-product-modal");
  const productForm = document.getElementById("product-form");
  const searchInput = document.getElementById("product-search");
  const categoryFilter = document.getElementById("product-category-filter");
  const priceInput = document.getElementById("prod-price");

  // Live Naira conversion indicator inside modal
  const updateNairaPreview = () => {
    let previewEl = document.getElementById("prod-naira-hint");
    if (!previewEl && priceInput) {
      previewEl = document.createElement("div");
      previewEl.id = "prod-naira-hint";
      previewEl.style.cssText = "font-size:0.8rem;color:var(--admin-primary);font-weight:700;margin-top:4px;";
      priceInput.parentNode.appendChild(previewEl);
    }
    if (previewEl && priceInput) {
      const val = parseFloat(priceInput.value) || 0;
      const rate = getExchangeRate();
      const naira = calculateNairaPrice(val, rate);
      previewEl.textContent = `≈ ₦${naira.toLocaleString()} NGN (at 1$ = ₦${rate.toLocaleString()})`;
    }
  };

  priceInput?.addEventListener("input", updateNairaPreview);

  await loadProducts();

  function renderTable(items) {
    if (!tableBody) return;
    if (!items.length) {
      tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--admin-text-sub);">No products found. Click "Add Product" to create one.</td></tr>`;
      return;
    }

    tableBody.innerHTML = items.map(p => {
      const usdt = typeof p.priceUsdt === 'number' ? p.priceUsdt : (Number(p.price) || 0);
      const naira = p.priceNaira || calculateNairaPrice(usdt);
      return `
        <tr>
          <td>
            <img src="${p.image || 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=100&q=80'}" style="width:44px;height:44px;border-radius:8px;object-fit:cover;" alt="${p.name}">
          </td>
          <td style="font-weight:700;color:var(--admin-text-main);">${p.name}</td>
          <td><span style="background:var(--admin-light-purple);color:var(--admin-primary);padding:3px 8px;border-radius:6px;font-size:0.8rem;font-weight:600;">${p.category || 'General'}</span></td>
          <td style="font-weight:700;color:var(--admin-primary);">
            $${usdt.toFixed(2)} USDT
            <div style="font-size:0.75rem;color:var(--admin-text-sub);font-weight:500;">≈ ₦${naira.toLocaleString()}</div>
          </td>
          <td>
            <span class="badge ${p.available ? 'badge-confirmed' : 'badge-rejected'}">
              ${p.available ? 'In Stock' : 'Out of Stock'}
            </span>
          </td>
          <td>
            <button class="toggle-active-btn" data-id="${p.id}" data-active="${p.active !== false}" style="font-size:0.8rem;padding:4px 8px;border-radius:6px;background:${p.active !== false ? '#E0F2FE' : '#F3F4F6'};color:${p.active !== false ? '#0369A1' : '#6B7280'};font-weight:600;">
              ${p.active !== false ? 'Active' : 'Disabled'}
            </button>
          </td>
          <td>
            <div style="display:flex;gap:6px;">
              <button class="edit-prod-btn btn-sm" data-id="${p.id}" style="background:#F3EEFF;color:var(--admin-primary);border-radius:6px;font-weight:600;padding:4px 10px;">Edit</button>
              <button class="del-prod-btn btn-sm" data-id="${p.id}" style="background:#FEE2E2;color:#DC2626;border-radius:6px;font-weight:600;padding:4px 10px;">Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");

    // Attach listeners
    document.querySelectorAll(".edit-prod-btn").forEach(btn => {
      btn.addEventListener("click", () => openEditModal(btn.dataset.id));
    });
    document.querySelectorAll(".del-prod-btn").forEach(btn => {
      btn.addEventListener("click", () => handleDeleteProduct(btn.dataset.id));
    });
    document.querySelectorAll(".toggle-active-btn").forEach(btn => {
      btn.addEventListener("click", () => handleToggleActive(btn.dataset.id, btn.dataset.active === "true"));
    });
  }

  async function loadProducts() {
    try {
      const snap = await getDocs(collection(db, "products"));
      productsList = [];
      const rate = getExchangeRate();
      snap.forEach(d => {
        const data = d.data();
        let usdtPrice = data.price;
        if (typeof usdtPrice === 'number' && usdtPrice > 500) {
          usdtPrice = +(usdtPrice / rate).toFixed(2);
        }
        productsList.push({
          id: d.id,
          ...data,
          price: usdtPrice,
          priceUsdt: usdtPrice,
          priceNaira: calculateNairaPrice(usdtPrice, rate)
        });
      });
      renderTable(productsList);
    } catch (e) {
      console.error(e);
      showToast("Error loading products", "error");
    }
  }

  function filterItems() {
    const q = (searchInput?.value || "").toLowerCase();
    const cat = categoryFilter?.value || "all";
    const filtered = productsList.filter(p => {
      const matchQ = p.name.toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q);
      const matchCat = (cat === "all") || (p.category === cat);
      return matchQ && matchCat;
    });
    renderTable(filtered);
  }

  searchInput?.addEventListener("input", filterItems);
  categoryFilter?.addEventListener("change", filterItems);

  // Modal handlers
  addBtn?.addEventListener("click", () => {
    productForm.reset();
    document.getElementById("prod-edit-id").value = "";
    document.getElementById("modal-prod-title").textContent = "Add New Product";
    updateNairaPreview();
    modal.classList.add("open");
  });

  closeBtn?.addEventListener("click", () => modal.classList.remove("open"));

  function openEditModal(id) {
    const prod = productsList.find(p => p.id === id);
    if (!prod) return;

    document.getElementById("prod-edit-id").value = prod.id;
    document.getElementById("prod-name").value = prod.name || "";
    document.getElementById("prod-category").value = prod.category || "";
    document.getElementById("prod-price").value = prod.price || "";
    document.getElementById("prod-old-price").value = prod.oldPrice || "";
    document.getElementById("prod-image").value = prod.image || "";
    document.getElementById("prod-desc").value = prod.description || "";
    document.getElementById("prod-available").checked = prod.available !== false;
    document.getElementById("prod-active").checked = prod.active !== false;
    document.getElementById("modal-prod-title").textContent = "Edit Product";
    updateNairaPreview();
    modal.classList.add("open");
  }

  productForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const editId = document.getElementById("prod-edit-id").value;
    const usdtPrice = parseFloat(document.getElementById("prod-price").value) || 0;
    const oldPrice = parseFloat(document.getElementById("prod-old-price").value) || null;
    const rate = getExchangeRate();
    const nairaPrice = calculateNairaPrice(usdtPrice, rate);

    const prodData = {
      name: document.getElementById("prod-name").value.trim(),
      category: document.getElementById("prod-category").value.trim(),
      price: usdtPrice, // Base USDT
      priceUsdt: usdtPrice,
      priceNaira: nairaPrice,
      currency: "USDT",
      oldPrice: oldPrice,
      image: document.getElementById("prod-image").value.trim(),
      description: document.getElementById("prod-desc").value.trim(),
      available: document.getElementById("prod-available").checked,
      active: document.getElementById("prod-active").checked,
      updatedAt: serverTimestamp()
    };

    try {
      if (editId) {
        await updateDoc(doc(db, "products", editId), prodData);
        showToast("Product updated successfully", "success");
      } else {
        prodData.createdAt = serverTimestamp();
        await addDoc(collection(db, "products"), prodData);
        showToast("Product added successfully", "success");
      }
      modal.classList.remove("open");
      await loadProducts();
    } catch (err) {
      showToast(err.message || "Operation failed", "error");
    }
  });

  async function handleDeleteProduct(id) {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      await deleteDoc(doc(db, "products", id));
      showToast("Product deleted", "info");
      await loadProducts();
    } catch (err) {
      showToast(err.message || "Failed to delete", "error");
    }
  }

  async function handleToggleActive(id, currentActive) {
    try {
      await updateDoc(doc(db, "products", id), {
        active: !currentActive,
        updatedAt: serverTimestamp()
      });
      showToast(`Product ${!currentActive ? 'activated' : 'disabled'}`, "success");
      await loadProducts();
    } catch (err) {
      showToast("Error updating status", "error");
    }
  }
}
