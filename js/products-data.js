/**
 * WAQTORO — Product Data
 * Central product database used across all pages
 */

// Detect if we're in the pages/ subdirectory (works with both file:// and http://)
const IMG_BASE = (window.location.href.replace(/\\/g, '/')).includes('/pages/') ? '../images/' : 'images/';

const PRODUCTS = [
  {
    id: 1,
    brand: "Calvin Klein",
    name: "CK Bangle Series",
    price: 3800,
    originalPrice: 5800,
    gender: "women",
    category: "Luxury",
    movement: "Quartz",
    strap: "Bracelet",
    caseMaterial: "Stainless Steel",
    dialColor: "Black",
    waterResistance: "NULL",
    rating: 4.5,
    reviews: 248,
    badge: "sale",
    stock: 15,
    img: ["CK Bangle/ck b1.jpeg", "CK Bangle/ck b2.jpeg", "CK Bangle/ck b3.jpeg", "CK Bangle/ck b7.jpeg", "CK Bangle/ck b8.jpeg"],
    colors: [
      { name: "Golden / Black Dial", strapHex: "#FFD700", dialHex: "#1a1a1a" },
      { name: "Golden / White Dial", strapHex: "#FFD700", dialHex: "#f5f5f0" },
      { name: "Silver / Pink Dial", strapHex: "#C0C0C0", dialHex: "#e8a4b8" },
      { name: "Silver / Black Dial", strapHex: "#C0C0C0", dialHex: "#1a1a1a" },
      { name: "Silver / White Dial", strapHex: "#C0C0C0", dialHex: "#f5f5f0" },
    ],
    tags: ["new"]
  },
  {
    id: 2,
    brand: "Rolex",
    name: "Rolex GMT Master",
    price: 4800,
    originalPrice: 6800,
    gender: "men",
    category: "Luxury",
    movement: "Quartz",
    strap: "Metal Bracelet",
    caseMaterial: "Stainless Steel",
    dialColor: "Black",
    waterResistance: "NULL",
    rating: 5,
    reviews: 189,
    badge: ["sale","new"],
    stock: 10,
    img: ["ROLEX GMT/GMT_1.jpeg","ROLEX GMT/GMT_2.jpeg","ROLEX GMT/GMT_3.jpeg","ROLEX GMT/GMT_4.jpeg","ROLEX GMT/GMT_5.jpeg","ROLEX GMT/GMT_6.jpeg","ROLEX GMT/GMT_7.jpeg","ROLEX GMT/GMT_8.jpeg","ROLEX GMT/GMT_9.jpeg"],
    colors: [
      { name: "Silver / Red/Blue Dial", strapHex: "#e90b0b", dialHex: "#0928f7" },
      { name: "Silver / Blk/Blue Dial", strapHex: "#000000", dialHex: "#0928f7" },
      { name: "Golden / Black Dial", strapHex: "#aec218", dialHex: "#1a1a1a" },
      { name: "Silver / Blk/Red Dial", strapHex: "#000000", dialHex: "#e90b0b" },
      { name: "Silver / Black Dial", strapHex: "#C0C0C0", dialHex: "#1a1a1a" },
      { name: "Multi / Black Dial", strapHex: "#878d5b", dialHex: "#1a1a1a" }
    ],
    tags: ["sale", "bestseller"]
  },
  {
    id: 3,
    brand: "Tissot",
    name: "Chemin Des Tourelles",
    price: 1950,
    originalPrice: null,
    gender: "women",
    category: "Mid-Range",
    movement: "Automatic",
    strap: "Leather",
    caseMaterial: "Rose Gold PVD",
    dialColor: "White Pearl",
    waterResistance: "30m",
    rating: 4,
    reviews: 97,
    badge: "new",
    stock: 8,
    img: "womens_watch_1.png",
    colors: [
      { name: "Silver / White Pearl", strapHex: "#C0C0C0", dialHex: "#faf7f0" },
      { name: "Gold / Ivory Dial", strapHex: "#D4AF37", dialHex: "#fdf8ec" },
      { name: "Rose Gold / Blush Dial", strapHex: "#B76E79", dialHex: "#f8e8e8" }
    ],
    tags: ["new"]
  },
  {
    id: 4,
    brand: "TAG Heuer",
    name: "Aquaracer Professional",
    price: 3200,
    originalPrice: 3600,
    gender: "men",
    category: "Sports",
    movement: "Quartz",
    strap: "Rubber",
    caseMaterial: "Stainless Steel",
    dialColor: "Black",
    waterResistance: "300m",
    rating: 4,
    reviews: 143,
    badge: "sale",
    stock: 0,
    img: "mens_watch_1.png",
    colors: [
      { name: "Black Rubber / Black Dial", strapHex: "#1a1a1a", dialHex: "#0d0d0d" },
      { name: "Black Rubber / Blue Dial", strapHex: "#1a1a1a", dialHex: "#1a3a8a" },
      { name: "Steel / Silver Dial", strapHex: "#9ba4af", dialHex: "#d0d0d0" }
    ],
    tags: ["sale"]
  },
  {
    id: 5,
    brand: "Longines",
    name: "La Grande Classique",
    price: 1450,
    originalPrice: null,
    gender: "women",
    category: "Classic",
    movement: "Quartz",
    strap: "Leather",
    caseMaterial: "Stainless Steel",
    dialColor: "Silver",
    waterResistance: "30m",
    rating: 5,
    reviews: 76,
    badge: null,
    stock: 20,
    img: "womens_watch_1.png",
    tags: []
  },
  {
    id: 6,
    brand: "Seiko",
    name: "Prospex Diver 1965",
    price: 850,
    originalPrice: null,
    gender: "men",
    category: "Sports",
    movement: "Automatic",
    strap: "NATO Strap",
    caseMaterial: "Stainless Steel",
    dialColor: "Navy Blue",
    waterResistance: "200m",
    rating: 4,
    reviews: 210,
    badge: "new",
    stock: 3,
    img: "mens_watch_1.png",
    tags: ["new", "bestseller"]
  },
  {
    id: 7,
    brand: "Rado",
    name: "True Thinline",
    price: 2100,
    originalPrice: 2400,
    gender: "women",
    category: "Luxury",
    movement: "Quartz",
    strap: "Ceramic Bracelet",
    caseMaterial: "High-Tech Ceramic",
    dialColor: "White",
    waterResistance: "30m",
    rating: 4,
    reviews: 58,
    badge: "sale",
    stock: 0,
    img: "womens_watch_1.png",
    tags: ["sale"]
  },
  {
    id: 8,
    brand: "Casio",
    name: "G-Shock GA-2100",
    price: 420,
    originalPrice: null,
    gender: "unisex",
    category: "Casual",
    movement: "Quartz",
    strap: "Resin",
    caseMaterial: "Carbon Core Guard",
    dialColor: "Black",
    waterResistance: "200m",
    rating: 5,
    reviews: 543,
    badge: "bestseller",
    stock: 50,
    img: "mens_watch_1.png",
    tags: ["bestseller"]
  },
  {
    id: 9,
    brand: "IWC",
    name: "Pilot's Chronograph",
    price: 4800,
    originalPrice: 5500,
    gender: "men",
    category: "Luxury",
    movement: "Automatic",
    strap: "Leather",
    caseMaterial: "Stainless Steel",
    dialColor: "Blue",
    waterResistance: "60m",
    rating: 5,
    reviews: 112,
    badge: "sale",
    stock: 1,
    img: "mens_watch_2.png",
    colors: [
      { name: "Brown Leather / Black Dial", strapHex: "#6b3a2a", dialHex: "#1a1a1a" },
      { name: "Black Leather / Blue Dial", strapHex: "#1a1a1a", dialHex: "#1a3a8a" },
      { name: "Black Leather / Silver Dial", strapHex: "#1a1a1a", dialHex: "#d0d0d0" }
    ],
    tags: ["sale"]
  },
  {
    id: 10,
    brand: "Breitling",
    name: "Navitimer Women's",
    price: 3600,
    originalPrice: null,
    gender: "women",
    category: "Luxury",
    movement: "Automatic",
    strap: "Metal Bracelet",
    caseMaterial: "Stainless Steel",
    dialColor: "Silver",
    waterResistance: "30m",
    rating: 4,
    reviews: 74,
    badge: "new",
    stock: 7,
    img: "womens_watch_2.png",
    tags: ["new"]
  },
  {
    id: 11,
    brand: "Michael Kors",
    name: "Michael Kors Access Gen 5 Lexington Smartwatch",
    price: 3600,
    originalPrice: null,
    gender: "women",
    category: "Luxury",
    strap: "Metal Bracelet",
    caseMaterial: "Stainless Steel",
    dialColor: "pink",
    waterResistance: "30m",
    rating: 4,
    reviews: 55,
    badge: "new",
    stock: 4,
    img: ["img1.jpg", "img2.jpg", "img3.jpg"],
    tags: ["new", "sale"]
  }
];

// Global product catalog
window.PRODUCTS = PRODUCTS;
const PRODUCT_CATALOG = PRODUCTS;

PRODUCTS.forEach((product) => {
  product.rating = 0;
  product.reviews = 0;
});


// Utility: format price
function formatPrice(amount) {
  return 'Rs. ' + amount.toLocaleString('en-PK');
}

// Utility: render star rating
function renderStars(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
}

function getOptimizedImagePath(path) {
  return String(path || '').replace(/\.(png|jpe?g)$/i, '.webp');
}

window.getOptimizedImagePath = getOptimizedImagePath;

function getLiveReviewSnapshot(productId) {
  try {
    const raw = localStorage.getItem('waqtoro_reviews_cache');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const entry = parsed?.byProduct?.[String(productId)];
    if (!entry) return null;
    const avg = Number(entry.avg);
    const count = Number(entry.count);
    if (!Number.isFinite(avg) || !Number.isFinite(count)) return null;
    return { avg, count };
  } catch {
    return null;
  }
}

function getLiveReviewSortData(product) {
  const live = getLiveReviewSnapshot(product.id);
  if (!live) return { rating: 0, count: 0 };
  return {
    rating: Number(live.avg) || 0,
    count: Number(live.count) || 0
  };
}

window.getLiveReviewSortData = getLiveReviewSortData;

// Utility: get stock status info for a product
function getStockInfo(stock) {
  if (stock === 0) return { label: 'Out of Stock', cls: 'stock-out', dot: 'dot-red' };
  if (stock <= 3) return { label: `Only ${stock} left!`, cls: 'stock-low', dot: 'dot-amber' };
  return { label: 'In Stock', cls: 'stock-in', dot: 'dot-green' };
}

function normalizeBadgeValue(rawBadge) {
  if (Array.isArray(rawBadge)) {
    const firstString = rawBadge.find((value) => typeof value === 'string' && value.trim());
    return firstString ? firstString.trim().toLowerCase() : '';
  }
  if (typeof rawBadge === 'string') {
    return rawBadge.trim().toLowerCase();
  }
  return '';
}

function buildProductCardSkeleton() {
  return `
    <div class="product-card skeleton-card" aria-hidden="true">
      <div class="product-card-img skeleton-block"></div>
      <div class="product-card-body">
        <div class="skeleton-line skeleton-sm"></div>
        <div class="skeleton-line skeleton-md"></div>
        <div class="skeleton-line skeleton-xs"></div>
        <div class="product-card-footer" style="margin-top:0.6rem;">
          <div class="skeleton-line skeleton-price"></div>
          <div class="skeleton-line skeleton-btn"></div>
        </div>
      </div>
    </div>
  `;
}

function renderProductSkeletons(containerId, count = 4) {
  const grid = document.getElementById(containerId);
  if (!grid) return;
  grid.innerHTML = Array.from({ length: count }).map(() => buildProductCardSkeleton()).join('');
}

window.renderProductSkeletons = renderProductSkeletons;

// Utility: build product card HTML
function buildProductCard(product, isHome = false) {
  const imgPath = Array.isArray(product.img) ? product.img[0] : product.img;
  const imgSrc = IMG_BASE + imgPath;
  const optimizedImgSrc = IMG_BASE + getOptimizedImagePath(imgPath);
  const inPages = window.location.pathname.includes('/pages/');
  const detailHref = inPages ? `product.html?id=${product.id}` : `pages/product.html?id=${product.id}`;
  const discount = product.originalPrice
    ? Math.round((1 - product.price / product.originalPrice) * 100)
    : null;

  const stock = typeof product.stock === 'number' ? product.stock : 99;
  const stockInfo = getStockInfo(stock);
  const isOutOfStock = stock === 0;
  const liveReview = getLiveReviewSnapshot(product.id);
  const cardRating = liveReview ? (Number(liveReview.avg) || 0) : 0;
  const cardReviewCount = liveReview ? (Number(liveReview.count) || 0) : 0;
  const normalizedBadge = normalizeBadgeValue(product.badge);

  let badgeClass = 'limited';
  if (normalizedBadge === 'sale') badgeClass = 'sale';
  else if (normalizedBadge === 'new') badgeClass = 'new';

  let badgeLabel = '';
  if (normalizedBadge === 'sale' && discount) badgeLabel = `-${discount}% OFF`;
  else if (normalizedBadge === 'new') badgeLabel = 'NEW';
  else if (normalizedBadge === 'bestseller') badgeLabel = '★ Bestseller';
  else if (normalizedBadge) badgeLabel = normalizedBadge.toUpperCase();

  const badgeHTML = normalizedBadge
    ? `<span class="badge badge-${badgeClass}">${badgeLabel}</span>`
    : '';

  const priceHTML = product.originalPrice
    ? `<span class="price-original">${formatPrice(product.originalPrice)}</span>
       <span class="price-current on-sale">${formatPrice(product.price)}</span>`
    : `<span class="price-current">${formatPrice(product.price)}</span>`;

  return `
    <div class="product-card ${isOutOfStock ? 'out-of-stock' : ''}" data-id="${product.id}" data-gender="${product.gender}" data-brand="${product.brand}" data-tags="${product.tags.join(',')}">
      <div class="product-card-img">
        <a href="${detailHref}">
          <picture>
            <source srcset="${optimizedImgSrc}" type="image/webp" />
            <img src="${imgSrc}" alt="${product.brand} ${product.name}" loading="lazy" width="640" height="640" />
          </picture>
        </a>
        <div class="product-card-badges">${badgeHTML}</div>
        ${isOutOfStock ? '<div class="sold-out-overlay">Sold Out</div>' : ''}
        <div class="product-card-actions">
          <button class="card-action-btn wishlist-btn" data-id="${product.id}" title="Add to Wishlist">
            <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </button>
          <a href="${detailHref}" class="card-action-btn" title="Quick View">
            <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </a>
        </div>
      </div>
      <div class="product-card-body">
        <p class="product-card-brand">${product.brand}</p>
        <a href="${detailHref}"><h3 class="product-card-name">${product.name}</h3></a>
        <div class="product-card-rating" data-product-id="${product.id}">
          <span class="stars">${renderStars(cardRating)}</span>
          <span class="count">(${cardReviewCount})</span>
        </div>
        <div class="stock-indicator ${stockInfo.cls}">
          <span class="stock-dot ${stockInfo.dot}"></span>
          <span class="stock-label">${stockInfo.label}</span>
        </div>
        <div class="product-card-footer">
          <div class="product-card-price">${priceHTML}</div>
          <button class="add-to-cart-btn" data-id="${product.id}" ${isOutOfStock ? 'disabled title="Out of Stock"' : ''}>
            <svg viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
            ${isOutOfStock ? 'Sold Out' : 'Add'}
          </button>
        </div>
        <div class="card-trust-strip">
          <span>Free Insured Shipping</span>
          <span>7-Day Returns</span>
        </div>
      </div>
    </div>
  `;
}
