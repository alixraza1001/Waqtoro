/**
 * WAQTORO — Shop Page JavaScript
 */

document.addEventListener('DOMContentLoaded', () => {
  initShop();
});

const ShopState = {
  gender: [],
  brand: [],
  movement: [],
  strap: [],
  deals: [],
  priceMax: 15000,
  sort: 'default',
  view: 'grid'
};

function initShop() {
  populateBrandFilter();
  setupFilters();
  setupSort();
  setupViewToggle();
  setupMobileFilter();
  readURLParams();
  renderShop();
}

function populateBrandFilter() {
  const brands = [...new Set(PRODUCTS.map(p => p.brand))].sort();
  const container = document.getElementById('brand-filter-list');
  if (!container) return;
  container.innerHTML = brands.map(b =>
    `<label class="filter-check"><input type="checkbox" name="brand" value="${b}" /> ${b}</label>`
  ).join('');
  // re-attach event listeners for newly created inputs
  container.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('change', () => applyFilters());
  });
}

function setupFilters() {
  // Checkboxes (gender, movement, strap, deals)
  document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => applyFilters());
  });

  // Price range
  const priceSlider = document.getElementById('price-max');
  const priceLabel  = document.getElementById('price-max-label');
  if (priceSlider) {
    priceSlider.addEventListener('input', () => {
      ShopState.priceMax = parseInt(priceSlider.value);
      priceLabel.textContent = 'Rs. ' + parseInt(priceSlider.value).toLocaleString();
      applyFilters();
    });
  }

  // Clear all
  document.getElementById('clear-filters')?.addEventListener('click', clearAllFilters);
}

function applyFilters() {
  ShopState.gender   = getChecked('gender');
  ShopState.brand    = getChecked('brand');
  ShopState.movement = getChecked('movement');
  ShopState.strap    = getChecked('strap');
  ShopState.deals    = getChecked('deals');
  renderShop();
  updateActiveTags();
}

function getChecked(name) {
  return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map(i => i.value);
}

function clearAllFilters() {
  document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
  const priceSlider = document.getElementById('price-max');
  if (priceSlider) {
    priceSlider.value = 15000;
    document.getElementById('price-max-label').textContent = 'Rs. 15,000';
  }
  ShopState.gender = ShopState.brand = ShopState.movement = ShopState.strap = ShopState.deals = [];
  ShopState.priceMax = 15000;
  renderShop();
  updateActiveTags();
}

function setupSort() {
  const select = document.getElementById('sort-select');
  if (!select) return;
  select.addEventListener('change', () => {
    ShopState.sort = select.value;
    renderShop();
  });
}

function setupViewToggle() {
  const gridBtn = document.getElementById('grid-view-btn');
  const listBtn = document.getElementById('list-view-btn');
  const grid    = document.getElementById('shop-products-grid');
  if (!gridBtn || !listBtn || !grid) return;

  gridBtn.addEventListener('click', () => {
    ShopState.view = 'grid';
    grid.classList.remove('list-view');
    gridBtn.classList.add('active');
    listBtn.classList.remove('active');
  });
  listBtn.addEventListener('click', () => {
    ShopState.view = 'list';
    grid.classList.add('list-view');
    listBtn.classList.add('active');
    gridBtn.classList.remove('active');
  });
}

function setupMobileFilter() {
  const btn     = document.getElementById('mobile-filter-btn');
  const sidebar = document.getElementById('shop-sidebar');
  if (!btn || !sidebar) return;

  btn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });
  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!sidebar.contains(e.target) && !btn.contains(e.target)) {
      sidebar.classList.remove('open');
    }
  });
}

function readURLParams() {
  const params = new URLSearchParams(window.location.search);
  const filter = params.get('filter');
  if (filter === 'sale') {
    const cb = document.querySelector('input[name="deals"][value="sale"]');
    if (cb) { cb.checked = true; ShopState.deals = ['sale']; }
  }
  if (filter === 'new') {
    const cb = document.querySelector('input[name="deals"][value="new"]');
    if (cb) { cb.checked = true; ShopState.deals = ['new']; }
  }
}

function getFilteredProducts() {
  let filtered = [...PRODUCTS];

  if (ShopState.gender.length)   filtered = filtered.filter(p => ShopState.gender.includes(p.gender));
  if (ShopState.brand.length)    filtered = filtered.filter(p => ShopState.brand.includes(p.brand));
  if (ShopState.movement.length) filtered = filtered.filter(p => ShopState.movement.includes(p.movement));
  if (ShopState.strap.length)    filtered = filtered.filter(p => ShopState.strap.includes(p.strap));
  if (ShopState.deals.length) {
    filtered = filtered.filter(p => ShopState.deals.some(d => p.tags.includes(d)));
  }
  filtered = filtered.filter(p => p.price <= ShopState.priceMax);

  // Sort
  if (ShopState.sort === 'price-asc')  filtered.sort((a,b) => a.price - b.price);
  if (ShopState.sort === 'price-desc') filtered.sort((a,b) => b.price - a.price);
  if (ShopState.sort === 'newest')     filtered.sort((a,b) => b.id - a.id);
  if (ShopState.sort === 'rating')     filtered.sort((a,b) => b.rating - a.rating || b.reviews - a.reviews);

  return filtered;
}

function renderShop() {
  const grid = document.getElementById('shop-products-grid');
  const countEl = document.getElementById('results-count');
  const noResults = document.getElementById('no-results');
  if (!grid) return;

  const filtered = getFilteredProducts();
  if (countEl) countEl.innerHTML = `Showing <strong>${filtered.length}</strong> of <strong>${PRODUCTS.length}</strong> watches`;

  if (!filtered.length) {
    grid.innerHTML = '';
    if (noResults) noResults.style.display = 'block';
    return;
  }
  if (noResults) noResults.style.display = 'none';

  grid.innerHTML = filtered.map(p => buildProductCard(p, false)).join('');
  WaqtoroWishlist.updateButtons();
}

function updateActiveTags() {
  const container = document.getElementById('active-filters');
  if (!container) return;
  const tags = [];

  const addTags = (arr, label) => arr.forEach(v => tags.push({ label: `${label}: ${v}`, key: label.toLowerCase(), val: v }));
  addTags(ShopState.gender,   'Gender');
  addTags(ShopState.brand,    'Brand');
  addTags(ShopState.movement, 'Movement');
  addTags(ShopState.strap,    'Strap');
  addTags(ShopState.deals,    'Deals');
  if (ShopState.priceMax < 15000) tags.push({ label: `Max: Rs. ${ShopState.priceMax.toLocaleString()}`, key: 'price', val: '' });

  container.innerHTML = tags.map(t =>
    `<span class="filter-tag">${t.label} <button onclick="removeTag('${t.key}','${t.val}')">✕</button></span>`
  ).join('');
}

function removeTag(key, val) {
  if (key === 'gender')   { document.querySelector(`input[name="gender"][value="${val}"]`).checked = false; }
  if (key === 'brand')    { document.querySelector(`input[name="brand"][value="${val}"]`).checked = false; }
  if (key === 'movement') { document.querySelector(`input[name="movement"][value="${val}"]`).checked = false; }
  if (key === 'strap')    { document.querySelector(`input[name="strap"][value="${val}"]`).checked = false; }
  if (key === 'deals')    { document.querySelector(`input[name="deals"][value="${val}"]`).checked = false; }
  if (key === 'price')    {
    document.getElementById('price-max').value = 15000;
    document.getElementById('price-max-label').textContent = 'Rs. 15,000';
    ShopState.priceMax = 15000;
  }
  applyFilters();
}
