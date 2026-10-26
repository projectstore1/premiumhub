// Premiumhub Search Module
import { fetchProducts, formatPrice } from "./products.js";

export async function initSearchPage() {
  const searchInput = document.getElementById("search-input");
  const resultsContainer = document.getElementById("search-results");
  const countEl = document.getElementById("results-count");
  const categoryFilter = document.getElementById("search-category");

  if (!resultsContainer) return;

  resultsContainer.innerHTML = `<div class="skeleton skeleton-card" style="grid-column: 1/-1; height: 160px;"></div>`;
  const allProducts = await fetchProducts();

  function render(products) {
    if (!products.length) {
      resultsContainer.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 48px 16px;">
          <svg style="width:48px;height:48px;margin:0 auto 12px;color:var(--color-text-sub);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          <h3 style="font-size:1.15rem;font-weight:700;">No products found</h3>
          <p style="color:var(--color-text-sub);font-size:0.9rem;margin-top:4px;">Try searching for another keyword or clear filters.</p>
        </div>
      `;
      if (countEl) countEl.textContent = "0 products found";
      return;
    }

    if (countEl) countEl.textContent = `${products.length} products found`;

    resultsContainer.innerHTML = products.map(p => `
      <a href="./product.html?id=${p.id}" class="product-card">
        <div class="product-media">
          <img src="${p.image || 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=400&q=80'}" alt="${p.name}" class="product-img" loading="lazy">
          <span class="product-badge-avail ${p.available ? '' : 'product-badge-out'}">${p.available ? 'In Stock' : 'Sold Out'}</span>
        </div>
        <div class="product-body">
          <div class="product-title" title="${p.name}">${p.name}</div>
          <div class="product-price-row">
            <span class="product-price">${formatPrice(p.price)}</span>
            ${p.oldPrice ? `<span class="product-old-price">${formatPrice(p.oldPrice)}</span>` : ''}
          </div>
        </div>
      </a>
    `).join("");
  }

  function filter() {
    const query = (searchInput?.value || "").toLowerCase().trim();
    const cat = categoryFilter?.value || "all";

    const filtered = allProducts.filter(p => {
      const matchesQuery = p.name.toLowerCase().includes(query) || (p.description || '').toLowerCase().includes(query);
      const matchesCat = (cat === "all") || (p.category === cat);
      return matchesQuery && matchesCat;
    });

    render(filtered);
  }

  // Populate categories
  if (categoryFilter) {
    const cats = Array.from(new Set(allProducts.map(p => p.category).filter(Boolean)));
    categoryFilter.innerHTML = `<option value="all">All Categories</option>` + cats.map(c => `<option value="${c}">${c}</option>`).join("");
  }

  // Check URL query param
  const urlParams = new URLSearchParams(window.location.search);
  const initialQuery = urlParams.get("q");
  if (initialQuery && searchInput) {
    searchInput.value = initialQuery;
  }

  filter();

  searchInput?.addEventListener("input", filter);
  categoryFilter?.addEventListener("change", filter);
}
