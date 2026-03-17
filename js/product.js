import { auth, db } from './firebase-config.js';
import { collection, addDoc, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Export globals early
window.toggleReviewForm = toggleReviewForm;
window.switchTab = switchTab;
window.changeQty = changeQty;
window.changeImg = changeImg;

document.addEventListener('DOMContentLoaded', () => {
  const id = parseInt(new URLSearchParams(window.location.search).get('id')) || 1;
  const product = PRODUCTS.find(p => p.id === id);

  if (!product) {
    document.getElementById('product-layout').innerHTML = `
      <div class="product-placeholder">
        <h2 style="color:var(--clr-white-dim)">Product not found.</h2>
        <a href="shop.html" class="btn btn-ghost" style="margin-top:1.5rem;">Back to Shop</a>
      </div>`;
    return;
  }

  // Breadcrumb
  document.title = `${product.brand} ${product.name} — WAQTORO`;
  document.getElementById('breadcrumb-name').textContent = `${product.brand} ${product.name}`;

  renderProduct(product);
  applyCachedReviewSummary(id);
  renderRelated(product);
  initTabs();
  loadReviews(id);

  window.addEventListener('waqtoro:reviews-updated', () => {
    applyCachedReviewSummary(id);
    loadReviews(id);
  });
});

function renderProduct(p) {
  const layout = document.getElementById('product-layout');
  const discount = p.originalPrice ? Math.round((1 - p.price / p.originalPrice) * 100) : 0;
  const wishlisted = WaqtoroWishlist.has(p.id);
  const imgPaths = Array.isArray(p.img) ? p.img : [p.img];
  const mainImgSrc = IMG_BASE + imgPaths[0];

  const badgeHTML = p.badge ? `<span class="badge badge-${p.badge === 'sale' ? 'sale' : p.badge === 'new' ? 'new' : 'limited'}">${
    p.badge === 'sale' ? `-${discount}% OFF` : p.badge === 'new' ? 'NEW' : '★ Bestseller'
  }</span>` : '';

  const priceHTML = p.originalPrice
    ? `<span class="product-price-current on-sale" style="color:var(--clr-gold)">${formatPrice(p.price)}</span>
       <span class="product-price-original">${formatPrice(p.originalPrice)}</span>
       <span class="product-price-save">Save ${discount}%</span>`
    : `<span class="product-price-current">${formatPrice(p.price)}</span>`;

  let thumbsHTML = '';
  if (imgPaths.length > 1) {
    thumbsHTML = '<div class="gallery-thumbs">';
    imgPaths.forEach((path, index) => {
      const src = IMG_BASE + path;
      thumbsHTML += `
        <div class="gallery-thumb ${index === 0 ? 'active' : ''}" onclick="changeImg(this, '${src}')">
          <img src="${src}" alt="View ${index + 1}" />
        </div>
      `;
    });
    thumbsHTML += '</div>';
  }

  layout.innerHTML = `
    <!-- Gallery -->
    <div class="product-gallery">
      <div class="gallery-main">
        <img src="${mainImgSrc}" alt="${p.brand} ${p.name}" id="main-product-img" />
        <div class="gallery-badge-wrap">${badgeHTML}</div>
      </div>
      ${thumbsHTML}
    </div>

    <!-- Info -->
    <div class="product-info">
      <div class="product-info-brand">
        <span>${p.brand}</span>
        <span class="product-sku">SKU: WQT-${String(p.id).padStart(4,'0')}</span>
      </div>
      <h1>${p.name}</h1>
      <div class="product-info-rating">
        <span class="stars" id="dynamic-stars-inline">${renderStars(0)}</span>
        <span class="count" id="dynamic-inline-rating">0.0 / 5</span>
        <span class="count" id="dynamic-inline-review-count">(0 reviews)</span>
        <a class="review-link" onclick="switchTab('reviews')">Read reviews</a>
      </div>

      <div class="product-price-wrap">${priceHTML}</div>

      <div class="product-stock">
        <span class="stock-dot in-stock"></span>
        <span style="color:var(--clr-green);font-weight:600;">In Stock</span>
        <span style="color:var(--clr-muted)">— Ships within 2–3 business days</span>
      </div>

      ${p.colors ? `
      <div class="product-colors" id="color-selection">
        <span class="color-label">Color: <span id="selected-color-name" style="color:var(--clr-white)">${p.colors[0].name}</span></span>
        <div class="color-options">
          ${p.colors.map((c, idx) => `
            <div class="color-swatch ${idx === 0 ? 'active' : ''}" 
                 style="--swatch-color: ${c.hex}" 
                 data-name="${c.name}"
                 onclick="selectColor(this, '${c.name}')">
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      <div class="product-actions">
        <div class="qty-control">
          <button class="qty-btn" onclick="changeQty(-1)">−</button>
          <input type="number" id="qty-value" value="1" min="1" max="10" readonly />
          <button class="qty-btn" onclick="changeQty(1)">+</button>
        </div>
        <button class="product-atc-btn add-to-cart-btn" data-id="${p.id}">
          <svg viewBox="0 0 24 24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
          Add to Cart
        </button>
        <button class="product-wishlist-btn wishlist-btn ${wishlisted ? 'wishlisted' : ''}" data-id="${p.id}" title="Add to Wishlist">
          <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
      </div>

      <!-- Trust -->
      <div class="product-trust">
        <div class="trust-item">
          <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span>Premium Build</span>
        </div>
        <div class="trust-item">
          <svg viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
          <span>Free Delivery</span>
        </div>
        <div class="trust-item">
          <svg viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          <span>7-Day Returns</span>
        </div>
      </div>

      <!-- Tabs -->
      <div class="product-tabs-section">
        <div class="product-tabs-nav">
          <button class="product-tab-btn active" data-tab="description">Description</button>
          <button class="product-tab-btn" data-tab="specs">Specifications</button>
          <button class="product-tab-btn" data-tab="reviews" id="reviews-tab-btn">Reviews (0)</button>
        </div>

        <div class="tab-panel active" id="tab-description">
          <p style="color:var(--clr-white-dim);line-height:1.8;font-size:0.9rem;">
            The <strong>${p.brand}-inspired ${p.name}</strong> is a premium replica crafted with meticulous attention to detail. Featuring a ${p.movement ? p.movement.toLowerCase() : 'premium'} movement and high-grade materials, it captures the essence of luxury at a fraction of the original price.
          </p>
          <p style="color:var(--clr-white-dim);line-height:1.8;font-size:0.9rem;margin-top:1rem;">
            Designed for the style-conscious ${p.gender === 'women' ? 'woman' : 'man'} who demands a premium look without the premium price tag. The ${p.dialColor ? p.dialColor.toLowerCase() : 'custom'} dial paired with its ${p.strap ? p.strap.toLowerCase() : 'beautiful strap'} makes this replica a head-turner in any setting.
          </p>
          <p style="color:var(--clr-muted);font-size:0.78rem;margin-top:1rem;font-style:italic;">
            ⚠️ This is a high-quality replica inspired by the original. It is not an official brand product.
          </p>
        </div>

        <div class="tab-panel" id="tab-specs">
          <table class="specs-table">
            <tr><th>Brand</th><td>${p.brand || 'N/A'}</td></tr>
            <tr><th>Model</th><td>${p.name || 'N/A'}</td></tr>
            <tr><th>Gender</th><td>${p.gender ? p.gender.charAt(0).toUpperCase() + p.gender.slice(1) : 'Unisex'}</td></tr>
            <tr><th>Movement</th><td>${p.movement || 'N/A'}</td></tr>
            <tr><th>Case Material</th><td>${p.caseMaterial || 'N/A'}</td></tr>
            <tr><th>Dial Color</th><td>${p.dialColor || 'N/A'}</td></tr>
            <tr><th>Strap / Bracelet</th><td>${p.strap || 'N/A'}</td></tr>
            <tr><th>Water Resistance</th><td>${p.waterResistance}</td></tr>
            <tr><th>Category</th><td>${p.category}</td></tr>
          </table>
        </div>

        <div class="tab-panel" id="tab-reviews">
          <div class="reviews-summary">
            <div class="reviews-big-rating">
              <div class="big-num" id="dynamic-rating-num">0.0</div>
              <div class="stars" id="dynamic-stars-top">${renderStars(0)}</div>
              <span id="dynamic-review-count">0 reviews</span>
            </div>
            <div class="review-bars" id="review-bars"></div>
          </div>

          <div class="write-review-toggle">
            <button class="btn btn-outline" id="write-review-btn" style="width:100%;margin-bottom:2rem;">Write a Review</button>
          </div>

          <form id="review-form" class="review-form" style="display:none;margin-bottom:3rem;padding:2rem;background:var(--clr-bg-card);border:1px solid var(--clr-border);border-radius:var(--radius-md);">
            <h3 style="margin-bottom:1.5rem;color:var(--clr-white)">Write a Review</h3>
            <div class="form-group" style="margin-bottom:1.2rem;">
              <label style="display:block;margin-bottom:0.5rem;font-size:0.8rem;color:var(--clr-muted)">Rating</label>
              <div class="star-rating-input" style="display:flex;gap:0.5rem;font-size:1.5rem;color:var(--clr-muted);cursor:pointer;">
                <span data-val="1">☆</span><span data-val="2">☆</span><span data-val="3">☆</span><span data-val="4">☆</span><span data-val="5">☆</span>
              </div>
              <input type="hidden" id="review-rating" value="5" />
            </div>
            <div class="form-group" style="margin-bottom:1.2rem;">
              <input type="text" id="review-title" placeholder="Review Title" required style="width:100%;padding:0.75rem;background:var(--clr-bg);border:1px solid var(--clr-border);color:var(--clr-white);border-radius:var(--radius-sm);" />
            </div>
            <div class="form-group" style="margin-bottom:1.2rem;">
              <textarea id="review-comment" placeholder="Your Experience" required style="width:100%;padding:0.75rem;background:var(--clr-bg);border:1px solid var(--clr-border);color:var(--clr-white);border-radius:var(--radius-sm);min-height:100px;"></textarea>
            </div>
            <button type="submit" class="btn btn-gold" style="width:100%">Submit Review</button>
          </form>

          <div id="reviews-container">
            <!-- Dynamic Reviews Load Here -->
            <div class="loading-reviews" style="text-align:center;padding:2rem;color:var(--clr-muted)">Loading community reviews...</div>
          </div>
        </div>
      </div>
    </div>
  `;

  WaqtoroWishlist.updateButtons();
  setupReviewForm();
  
  // Add listener for Write a Review button (more reliable than onclick in module)
  const writeReviewBtn = document.getElementById('write-review-btn');
  if (writeReviewBtn) {
    writeReviewBtn.addEventListener('click', toggleReviewForm);
  }

  // Handle ATC with color
  const atcBtn = layout.querySelector('.add-to-cart-btn');
  if (atcBtn) {
    atcBtn.addEventListener('click', () => {
      const id = parseInt(atcBtn.dataset.id);
      const colorEl = document.getElementById('selected-color-name');
      const color = colorEl ? colorEl.textContent : null;
      WaqtoroCart.add(id, color);
    });
  }
}

async function loadReviews(productId) {
  const container = document.getElementById('reviews-container');
  if (!container) return;

  try {
    const allSnapshot = await getDocs(collection(db, "reviews"));
    const reviews = [];

    allSnapshot.forEach((doc) => {
      const data = doc.data();
      const candidate = data.productId ?? data.productID ?? data.product_id;
      if (parseInt(candidate) === productId) {
        reviews.push({ id: doc.id, ...data });
      }
    });

    reviews.sort((a, b) => {
      const aDate = toDate(a.date);
      const bDate = toDate(b.date);
      const aTime = aDate ? aDate.getTime() : 0;
      const bTime = bDate ? bDate.getTime() : 0;
      return bTime - aTime;
    });

    persistFetchedReviewAggregate(productId, reviews);
    const summary = updateReviewSummary(reviews);
    updateCardTileReviewBlock(productId, summary.avg, summary.total);
    
    if (!reviews.length) {
      container.innerHTML = `<div style="text-align:center;padding:3rem;color:var(--clr-muted)">
        <p>No reviews yet. Be the first to review this timepiece!</p>
      </div>`;
      return;
    }

    let reviewsHTML = '';
    reviews.forEach((r) => {
      const dateStr = formatReviewDate(r.date);
      reviewsHTML += `
        <div class="review-item">
          <div class="review-header"><span class="review-author">${escapeHTML(r.author || 'Anonymous')}</span><span class="review-date">${dateStr}</span></div>
          <div class="stars" style="font-size:0.85rem;margin-bottom:0.4rem;color:var(--clr-gold)">${renderStars(r.rating || 5)}</div>
          <p class="review-title">${escapeHTML(r.title || 'Untitled')}</p>
          <p class="review-body">${escapeHTML(r.comment || '')}</p>
        </div>
      `;
    });
    container.innerHTML = reviewsHTML;
  } catch (err) {
    console.error("Error loading reviews for product", productId, ":", err);
    container.innerHTML = `
      <div style="text-align:center;padding:2rem;">
        <p style="color:var(--clr-red);margin-bottom:1rem;">Failed to load reviews.</p>
        <button class="btn btn-ghost btn-sm" onclick="location.reload()">Retry Loading</button>
        <p style="font-size:0.7rem;color:var(--clr-muted);margin-top:1rem;">Error: ${err.message}</p>
      </div>`;
  }
}

function applyCachedReviewSummary(productId) {
  try {
    const raw = localStorage.getItem('waqtoro_reviews_cache');
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const snapshot = parsed?.byProduct?.[String(productId)];
    if (!snapshot) return;

    const total = Number(snapshot.count) || 0;
    const avg = Number(snapshot.avg) || 0;
    const avgDisplay = avg.toFixed(1);

    const topRating = document.getElementById('dynamic-rating-num');
    const topStars = document.getElementById('dynamic-stars-top');
    const topCount = document.getElementById('dynamic-review-count');
    const inlineStars = document.getElementById('dynamic-stars-inline');
    const inlineRating = document.getElementById('dynamic-inline-rating');
    const inlineCount = document.getElementById('dynamic-inline-review-count');
    const tabBtn = document.getElementById('reviews-tab-btn');

    if (topRating) topRating.textContent = avgDisplay;
    if (topStars) topStars.textContent = renderStars(Math.round(avg));
    if (topCount) topCount.textContent = `${total} ${total === 1 ? 'review' : 'reviews'}`;
    if (inlineStars) inlineStars.textContent = renderStars(Math.round(avg));
    if (inlineRating) inlineRating.textContent = `${avgDisplay} / 5`;
    if (inlineCount) inlineCount.textContent = `(${total} ${total === 1 ? 'review' : 'reviews'})`;
    if (tabBtn) tabBtn.textContent = `Reviews (${total})`;
    updateCardTileReviewBlock(productId, avg, total);
  } catch (err) {
    console.error('Failed to apply cached review summary:', err);
  }
}

function persistFetchedReviewAggregate(productId, reviews) {
  try {
    const ratings = reviews
      .map(r => Math.max(1, Math.min(5, parseInt(r.rating) || 0)))
      .filter(Boolean);

    const total = ratings.length;
    const avg = total ? ratings.reduce((sum, value) => sum + value, 0) / total : 0;

    const key = 'waqtoro_reviews_cache';
    const raw = localStorage.getItem(key);
    const cache = raw ? JSON.parse(raw) : { byProduct: {} };
    const byProduct = cache.byProduct || {};

    byProduct[String(productId)] = {
      avg: Number(avg.toFixed(1)),
      count: total
    };

    localStorage.setItem(key, JSON.stringify({ updatedAt: Date.now(), byProduct }));

    const product = PRODUCTS.find(p => p.id === productId);
    if (product) {
      product.rating = Number(avg.toFixed(1));
      product.reviews = total;
    }
  } catch (err) {
    console.error('Failed to persist fetched review aggregate:', err);
  }
}

function setupReviewForm() {
  const form = document.getElementById('review-form');
  if (!form) return;

  const stars = form.querySelectorAll('.star-rating-input span');
  const ratingInput = document.getElementById('review-rating');

  stars.forEach(s => {
    s.addEventListener('click', () => {
      const val = parseInt(s.dataset.val);
      ratingInput.value = val;
      stars.forEach((star, index) => {
        star.textContent = index < val ? '★' : '☆';
        star.style.color = index < val ? 'var(--clr-gold)' : 'var(--clr-muted)';
      });
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const productId = parseInt(new URLSearchParams(window.location.search).get('id')) || 1;
    const user = auth.currentUser;
    
    if (!user) {
      showToast('Please sign in to leave a review', 'error');
      return;
    }

    const title = document.getElementById('review-title').value.trim();
    const comment = document.getElementById('review-comment').value.trim();

    if (!title || !comment) {
      showToast('Please add both title and comment', 'error');
      return;
    }

    const reviewData = {
      productId,
      userId: user.uid,
      author: user.displayName || user.email.split('@')[0],
      rating: parseInt(ratingInput.value),
      title,
      comment,
      date: serverTimestamp()
    };

    try {
      await addDoc(collection(db, "reviews"), reviewData);
      showToast('Review submitted successfully!', 'success');
      updateReviewCacheAfterSubmit(productId, reviewData.rating);
      form.reset();
      resetReviewFormState();
      toggleReviewForm();
      loadReviews(productId);
    } catch (err) {
      console.error("Error submitting review:", err);
      showToast('Failed to submit review', 'error');
    }
  });
}

function toggleReviewForm() {
  const form = document.getElementById('review-form');
  const btn = document.querySelector('.write-review-toggle');
  if (!form || !btn) return;
  if (form.style.display === 'none') {
    form.style.display = 'block';
    btn.style.display = 'none';
  } else {
    form.style.display = 'none';
    btn.style.display = 'block';
  }
}

function changeImg(thumb, src) {
  document.getElementById('main-product-img').src = src;
  document.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active'));
  thumb.classList.add('active');
}

function changeQty(delta) {
  const input = document.getElementById('qty-value');
  const newVal = Math.max(1, Math.min(10, parseInt(input.value) + delta));
  input.value = newVal;
}

function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatReviewDate(value) {
  const date = toDate(value);
  if (!date) return 'Recently';
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function escapeHTML(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function updateReviewSummary(reviews) {
  const total = reviews.length;
  const ratings = reviews
    .map(r => Math.max(1, Math.min(5, parseInt(r.rating) || 0)))
    .filter(Boolean);

  const avg = total ? (ratings.reduce((sum, rating) => sum + rating, 0) / total) : 0;
  const avgDisplay = avg.toFixed(1);

  const topRating = document.getElementById('dynamic-rating-num');
  const topStars = document.getElementById('dynamic-stars-top');
  const topCount = document.getElementById('dynamic-review-count');
  const inlineStars = document.getElementById('dynamic-stars-inline');
  const inlineRating = document.getElementById('dynamic-inline-rating');
  const inlineCount = document.getElementById('dynamic-inline-review-count');
  const tabBtn = document.getElementById('reviews-tab-btn');
  const bars = document.getElementById('review-bars');

  if (topRating) topRating.textContent = avgDisplay;
  if (topStars) topStars.textContent = renderStars(Math.round(avg));
  if (topCount) topCount.textContent = `${total} ${total === 1 ? 'review' : 'reviews'}`;
  if (inlineStars) inlineStars.textContent = renderStars(Math.round(avg));
  if (inlineRating) inlineRating.textContent = `${avgDisplay} / 5`;
  if (inlineCount) inlineCount.textContent = `(${total} ${total === 1 ? 'review' : 'reviews'})`;
  if (tabBtn) tabBtn.textContent = `Reviews (${total})`;

  if (!bars) return { avg, total };

  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  ratings.forEach((rating) => {
    counts[rating] += 1;
  });

  bars.innerHTML = [5, 4, 3, 2, 1].map((star) => {
    const pct = total ? Math.round((counts[star] / total) * 100) : 0;
    return `<div class="review-bar-row"><span class="star-label">${star}★</span><div class="review-bar"><div class="review-bar-fill" style="width:${pct}%"></div></div><span class="pct">${pct}%</span></div>`;
  }).join('');

  return { avg, total };
}

function updateCardTileReviewBlock(productId, avg, total) {
  const blocks = document.querySelectorAll(`.product-card-rating[data-product-id="${productId}"]`);
  if (!blocks.length) return;

  blocks.forEach((block) => {
    const starsEl = block.querySelector('.stars');
    const countEl = block.querySelector('.count');
    if (starsEl) starsEl.textContent = renderStars(avg);
    if (countEl) countEl.textContent = `(${total})`;
  });
}

function resetReviewFormState() {
  const ratingInput = document.getElementById('review-rating');
  const stars = document.querySelectorAll('.star-rating-input span');
  if (ratingInput) ratingInput.value = '5';
  stars.forEach((star, index) => {
    star.textContent = index < 5 ? '★' : '☆';
    star.style.color = index < 5 ? 'var(--clr-gold)' : 'var(--clr-muted)';
  });
}

function updateReviewCacheAfterSubmit(productId, rating) {
  try {
    const key = 'waqtoro_reviews_cache';
    const raw = localStorage.getItem(key);
    const cache = raw ? JSON.parse(raw) : { byProduct: {} };
    const byProduct = cache.byProduct || {};
    const id = String(productId);
    const current = byProduct[id] || { avg: 0, count: 0 };
    const newCount = (Number(current.count) || 0) + 1;
    const newAvg = ((Number(current.avg) || 0) * (newCount - 1) + Number(rating || 0)) / newCount;
    byProduct[id] = {
      avg: Number(newAvg.toFixed(1)),
      count: newCount
    };
    localStorage.setItem(key, JSON.stringify({ updatedAt: Date.now(), byProduct }));
    window.dispatchEvent(new CustomEvent('waqtoro:reviews-updated'));
  } catch (err) {
    console.error('Failed to update local review cache:', err);
  }
}

function initTabs() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.product-tab-btn');
    if (!btn) return;
    switchTab(btn.dataset.tab);
  });
}

function switchTab(name) {
  document.querySelectorAll('.product-tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === name);
  });
  document.querySelectorAll('.tab-panel').forEach(p => {
    p.classList.toggle('active', p.id === `tab-${name}`);
  });
}

function renderRelated(product) {
  const grid = document.getElementById('related-grid');
  if (!grid) return;
  const related = PRODUCTS.filter(p => p.id !== product.id && (p.gender === product.gender || p.brand === product.brand)).slice(0, 4);
  grid.innerHTML = related.map(p => buildProductCard(p, false)).join('');
  WaqtoroWishlist.updateButtons();
}

window.toggleReviewForm = toggleReviewForm;
window.switchTab = switchTab;
window.changeQty = changeQty;
window.changeImg = changeImg;
window.selectColor = selectColor;

function selectColor(el, name) {
  document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
  el.classList.add('active');
  const nameEl = document.getElementById('selected-color-name');
  if (nameEl) nameEl.textContent = name;
}
