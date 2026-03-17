import { db } from './firebase-reviews-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const CACHE_KEY = 'waqtoro_reviews_cache';
document.addEventListener('DOMContentLoaded', () => {
  applyRatingsFromCache();
  syncRatingsFromCloud();
  observeCardListChanges();
});

function observeCardListChanges() {
  const observer = new MutationObserver(() => {
    applyRatingsFromCache();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(byProduct) {
  const payload = {
    updatedAt: Date.now(),
    byProduct
  };
  localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  return payload;
}

function getStarText(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
}

function applyRatingsFromCache() {
  const cache = readCache();
  if (!cache?.byProduct) return;

  document.querySelectorAll('.product-card-rating[data-product-id]').forEach((block) => {
    const productId = block.getAttribute('data-product-id');
    const snapshot = cache.byProduct[productId];
    if (!snapshot || (Number(snapshot.count) || 0) <= 0) return;

    const starsEl = block.querySelector('.stars');
    const countEl = block.querySelector('.count');

    if (starsEl) starsEl.textContent = getStarText(snapshot.avg || 0);
    if (countEl) countEl.textContent = `(${snapshot.count || 0})`;
  });
}

function extractProductId(data) {
  const candidate = data.productId ?? data.productID ?? data.product_id;
  const parsed = parseInt(candidate);
  return Number.isNaN(parsed) ? null : parsed;
}

async function syncRatingsFromCloud() {
  try {
    const snapshot = await getDocs(collection(db, 'reviews'));
    const totals = new Map();

    snapshot.forEach((doc) => {
      const data = doc.data();
      const productId = extractProductId(data);
      const rating = Math.max(1, Math.min(5, parseInt(data.rating) || 0));
      if (!productId || !rating) return;

      const current = totals.get(productId) || { sum: 0, count: 0 };
      current.sum += rating;
      current.count += 1;
      totals.set(productId, current);
    });

    const byProduct = {};
    totals.forEach((value, key) => {
      byProduct[String(key)] = {
        avg: Number((value.sum / value.count).toFixed(1)),
        count: value.count
      };
    });

    writeCache(byProduct);

    if (Array.isArray(window.PRODUCTS)) {
      window.PRODUCTS.forEach((product) => {
        const live = byProduct[String(product.id)];
        if (!live) return;
        product.rating = live.avg;
        product.reviews = live.count;
      });
    }

    applyRatingsFromCache();
    window.dispatchEvent(new CustomEvent('waqtoro:reviews-updated'));
  } catch (error) {
    console.error('Review rating sync failed:', error);
  }
}
