import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, serverTimestamp, onSnapshot, updateDoc, setDoc, doc, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let unsubscribeProductReviews = null;
let allRawProductReviews = [];
let allProductReviews = [];
let activeProductId = null;
let visibleReviewCount = 6;
let isReviewAdmin = false;
const REVIEW_PAGE_SIZE = 6;
const REVIEW_RATE_LIMIT_MS = 30000;
const REVIEW_FORBIDDEN_WORDS = ['fuck', 'shit', 'bitch', 'asshole', 'bastard'];

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

  activeProductId = id;
  renderProduct(product);
  applyCachedReviewSummary(id);
  renderRelated(product);
  initTabs();
  initReviewAuthState();
  initReviewInteractions();
  subscribeToProductReviews(id);

  window.addEventListener('beforeunload', () => {
    if (typeof unsubscribeProductReviews === 'function') unsubscribeProductReviews();
  });
});

function buildReviewDocId(userId, productId) {
  return `${userId}_${productId}`;
}

function isApprovedReview(review) {
  return !review.status || review.status === 'approved';
}

function hasProfanity(text) {
  const normalized = String(text || '').toLowerCase();
  return REVIEW_FORBIDDEN_WORDS.some((word) => {
    const pattern = new RegExp(`\\b${word}\\b`, 'i');
    return pattern.test(normalized);
  });
}

function getRateLimitKey(userId, productId) {
  return `waqtoro_review_rl_${userId}_${productId}`;
}

function isRateLimited(userId, productId) {
  const raw = localStorage.getItem(getRateLimitKey(userId, productId));
  const last = raw ? Number(raw) : 0;
  if (!last) return false;
  return (Date.now() - last) < REVIEW_RATE_LIMIT_MS;
}

function markRateLimit(userId, productId) {
  localStorage.setItem(getRateLimitKey(userId, productId), String(Date.now()));
}

function getReviewTimestamp(review) {
  const updated = toDate(review.updatedAt);
  if (updated) return updated.getTime();
  const created = toDate(review.createdAt);
  if (created) return created.getTime();
  const date = toDate(review.date);
  if (date) return date.getTime();
  return 0;
}

function dedupeReviewsByUser(reviews) {
  const byKey = new Map();
  reviews.forEach((review) => {
    const key = review.userId || `anon_${review.id}`;
    const existing = byKey.get(key);
    if (!existing || getReviewTimestamp(review) > getReviewTimestamp(existing)) {
      byKey.set(key, review);
    }
  });
  return Array.from(byKey.values());
}

function isVisibleToCurrentViewer(review) {
  if (isReviewAdmin) return true;
  if (isApprovedReview(review)) return true;
  const currentUid = auth.currentUser?.uid;
  return !!currentUid && review.userId === currentUid;
}

function initReviewAuthState() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      isReviewAdmin = false;
      if (activeProductId) subscribeToProductReviews(activeProductId);
      renderCurrentReviewState();
      return;
    }

    try {
      const adminSnap = await getDoc(doc(db, 'admins', user.uid));
      isReviewAdmin = adminSnap.exists();
    } catch (error) {
      console.error('Failed to check admin review permissions:', error);
      isReviewAdmin = false;
    }

    if (activeProductId) subscribeToProductReviews(activeProductId);
    renderCurrentReviewState();
  });
}

function initReviewInteractions() {
  document.addEventListener('click', async (event) => {
    const loadMoreBtn = event.target.closest('#reviews-load-more-btn');
    if (loadMoreBtn) {
      visibleReviewCount += REVIEW_PAGE_SIZE;
      renderCurrentReviewState();
      return;
    }

    const moderateBtn = event.target.closest('.review-moderate-btn');
    if (!moderateBtn) return;
    if (!isReviewAdmin) {
      showToast('Only admins can moderate reviews.', 'info');
      return;
    }

    const reviewId = moderateBtn.dataset.reviewId;
    const nextStatus = moderateBtn.dataset.nextStatus;
    if (!reviewId || !nextStatus) return;

    try {
      await updateDoc(doc(db, 'reviews', reviewId), {
        status: nextStatus,
        moderatedBy: auth.currentUser?.uid || null,
        moderatedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      showToast(`Review marked as ${nextStatus}.`, 'check');
    } catch (error) {
      console.error('Failed to moderate review:', error);
      showToast('Failed to moderate review.', 'info');
    }
  });
}

function renderProduct(p) {
  const layout = document.getElementById('product-layout');
  const discount = p.originalPrice ? Math.round((1 - p.price / p.originalPrice) * 100) : 0;
  const wishlisted = WaqtoroWishlist.has(p.id);
  const imgPaths = Array.isArray(p.img) ? p.img : [p.img];
  const mainImgSrc = IMG_BASE + imgPaths[0];
  const mainImgWebp = IMG_BASE + getOptimizedImagePath(imgPaths[0]);

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
      const webp = IMG_BASE + getOptimizedImagePath(path);
      thumbsHTML += `
        <div class="gallery-thumb ${index === 0 ? 'active' : ''}" onclick="changeImg(this, '${src}', '${webp}')">
          <picture>
            <source srcset="${webp}" type="image/webp" />
            <img src="${src}" alt="View ${index + 1}" />
          </picture>
        </div>
      `;
    });
    thumbsHTML += '</div>';
  }

  layout.innerHTML = `
    <!-- Gallery -->
    <div class="product-gallery">
      <div class="gallery-main">
        <picture>
          <source id="main-product-source" srcset="${mainImgWebp}" type="image/webp" />
          <img src="${mainImgSrc}" alt="${p.brand} ${p.name}" id="main-product-img" />
        </picture>
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

      ${(() => {
        const stock = typeof p.stock === 'number' ? p.stock : 99;
        if (stock === 0) return `<div class="product-stock"><span class="stock-dot" style="background:var(--clr-red)"></span><span style="color:var(--clr-red);font-weight:600;">Out of Stock</span></div>`;
        if (stock <= 3) return `<div class="product-stock"><span class="stock-dot" style="background:#f59e0b"></span><span style="color:#f59e0b;font-weight:600;">Only ${stock} left!</span><span style="color:var(--clr-muted)"> — Order soon</span></div>`;
        return `<div class="product-stock"><span class="stock-dot in-stock"></span><span style="color:var(--clr-green);font-weight:600;">In Stock</span><span style="color:var(--clr-muted)"> — Ships within 2–3 business days</span></div>`;
      })()}

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
            <tr><th>Water Resistance</th><td>${p.waterResistance && p.waterResistance !== 'NULL' ? p.waterResistance : 'N/A'}</td></tr>
            <tr><th>Category</th><td>${p.category || 'N/A'}</td></tr>
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

function subscribeToProductReviews(productId) {
  const container = document.getElementById('reviews-container');
  if (!container) return;

  if (typeof unsubscribeProductReviews === 'function') {
    unsubscribeProductReviews();
  }

  const reviewsQuery = isReviewAdmin
    ? query(collection(db, "reviews"), where('productId', '==', productId))
    : query(collection(db, "reviews"), where('productId', '==', productId), where('status', '==', 'approved'));

  unsubscribeProductReviews = onSnapshot(reviewsQuery, (allSnapshot) => {
    const reviews = [];

    allSnapshot.forEach((doc) => {
      const data = doc.data();
      const candidate = data.productId ?? data.productID ?? data.product_id;
      if (parseInt(candidate) === productId) {
        reviews.push({ id: doc.id, ...data });
      }
    });

    allRawProductReviews = reviews;

    const dedupedPublicReviews = dedupeReviewsByUser(reviews.filter(isApprovedReview));
    dedupedPublicReviews.sort((a, b) => getReviewTimestamp(b) - getReviewTimestamp(a));

    allProductReviews = dedupeReviewsByUser(reviews.filter(isVisibleToCurrentViewer));
    allProductReviews.sort((a, b) => getReviewTimestamp(b) - getReviewTimestamp(a));

    persistFetchedReviewAggregate(productId, dedupedPublicReviews);
    const summary = updateReviewSummary(dedupedPublicReviews);
    updateCardTileReviewBlock(productId, summary.avg, summary.total);

    renderCurrentReviewState();
  }, (err) => {
    console.error("Error loading realtime reviews for product", productId, ":", err);
    container.innerHTML = `
      <div style="text-align:center;padding:2rem;">
        <p style="color:var(--clr-red);margin-bottom:1rem;">Failed to load reviews.</p>
        <button class="btn btn-ghost btn-sm" onclick="location.reload()">Retry Loading</button>
        <p style="font-size:0.7rem;color:var(--clr-muted);margin-top:1rem;">Error: ${err.message}</p>
      </div>`;
  });
}

function applyCachedReviewSummary(productId) {
  try {
    const product = PRODUCTS.find(p => p.id === productId);
    const raw = localStorage.getItem('waqtoro_reviews_cache');
    const parsed = raw ? JSON.parse(raw) : null;
    const snapshot = parsed?.byProduct?.[String(productId)];

    const hasLiveReviews = snapshot && Number(snapshot.count) > 0;
    const total = hasLiveReviews ? Number(snapshot.count) : 0;
    const avg = hasLiveReviews ? Number(snapshot.avg) : 0;
    const avgDisplay = Number(avg).toFixed(1);

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

    if (total > 0) {
      byProduct[String(productId)] = {
        avg: Number(avg.toFixed(1)),
        count: total
      };
    } else {
      delete byProduct[String(productId)];
    }

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

    if (hasProfanity(title) || hasProfanity(comment)) {
      showToast('Please remove inappropriate language from your review.', 'info');
      return;
    }

    if (isRateLimited(user.uid, productId)) {
      showToast('Please wait a bit before updating your review again.', 'info');
      return;
    }

    const reviewData = {
      productId,
      userId: user.uid,
      author: user.displayName || user.email.split('@')[0],
      rating: parseInt(ratingInput.value),
      title,
      comment,
      status: 'approved',
      updatedAt: serverTimestamp(),
      date: serverTimestamp()
    };

    try {
      const reviewRef = doc(db, 'reviews', buildReviewDocId(user.uid, productId));
      await setDoc(reviewRef, {
        ...reviewData,
        createdAt: serverTimestamp()
      }, { merge: true });

      markRateLimit(user.uid, productId);
      showToast('Review saved successfully!', 'success');

      form.reset();
      resetReviewFormState();
      toggleReviewForm();
    } catch (err) {
      console.error("Error submitting review:", err);
      const reason = err?.code ? ` (${err.code})` : '';
      showToast(`Failed to submit review${reason}`, 'error');
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

function changeImg(thumb, src, webpSrc) {
  const source = document.getElementById('main-product-source');
  if (source && webpSrc) source.srcset = webpSrc;
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
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function renderCurrentReviewState() {
  allProductReviews = dedupeReviewsByUser(allRawProductReviews.filter(isVisibleToCurrentViewer));
  allProductReviews.sort((a, b) => getReviewTimestamp(b) - getReviewTimestamp(a));
  renderReviewsList(allProductReviews);
  hydrateReviewFormFromExisting();
}

function hydrateReviewFormFromExisting() {
  const writeReviewBtn = document.getElementById('write-review-btn');
  const currentUid = auth.currentUser?.uid;
  if (!writeReviewBtn) return;

  if (!currentUid) {
    writeReviewBtn.textContent = 'Write a Review';
    return;
  }

  const existing = allProductReviews.find((review) => review.userId === currentUid);
  if (!existing) {
    writeReviewBtn.textContent = 'Write a Review';
    return;
  }

  writeReviewBtn.textContent = 'Update My Review';
  const titleEl = document.getElementById('review-title');
  const commentEl = document.getElementById('review-comment');
  const ratingInput = document.getElementById('review-rating');
  if (titleEl && !titleEl.value) titleEl.value = existing.title || '';
  if (commentEl && !commentEl.value) commentEl.value = existing.comment || '';
  if (ratingInput) {
    ratingInput.value = String(Math.max(1, Math.min(5, parseInt(existing.rating) || 5)));
    const stars = document.querySelectorAll('.star-rating-input span');
    stars.forEach((star, index) => {
      const active = index < parseInt(ratingInput.value);
      star.textContent = active ? '★' : '☆';
      star.style.color = active ? 'var(--clr-gold)' : 'var(--clr-muted)';
    });
  }
}

function renderReviewsList(reviews) {
  const container = document.getElementById('reviews-container');
  if (!container) return;

  if (!reviews.length) {
    container.innerHTML = `<div style="text-align:center;padding:3rem;color:var(--clr-muted)">
      <p>No reviews yet. Be the first to review this timepiece!</p>
    </div>`;
    return;
  }

  const visible = reviews.slice(0, visibleReviewCount);
  let reviewsHTML = '';
  visible.forEach((review) => {
    const dateStr = formatReviewDate(review.updatedAt || review.createdAt || review.date);
    const isMine = !!auth.currentUser?.uid && review.userId === auth.currentUser.uid;
    const status = review.status || 'approved';
    const statusTag = status === 'approved'
      ? ''
      : `<span style="font-size:0.68rem;color:var(--clr-gold);margin-left:0.5rem;text-transform:uppercase;">${escapeHTML(status)}</span>`;
    const mineTag = isMine
      ? `<span style="font-size:0.68rem;color:var(--clr-black);background:var(--clr-gold);margin-left:0.5rem;padding:0.12rem 0.45rem;border-radius:999px;text-transform:uppercase;font-weight:700;letter-spacing:0.04em;">Reviewed by you</span>`
      : '';

    const moderationControls = isReviewAdmin
      ? `<div style="display:flex;gap:0.6rem;margin-top:0.7rem;">
          <button class="btn btn-ghost review-moderate-btn" data-review-id="${review.id}" data-next-status="approved" style="font-size:0.68rem;padding:0.3rem 0.6rem;">Approve</button>
          <button class="btn btn-ghost review-moderate-btn" data-review-id="${review.id}" data-next-status="hidden" style="font-size:0.68rem;padding:0.3rem 0.6rem;">Hide</button>
        </div>`
      : '';

    reviewsHTML += `
      <div class="review-item">
        <div class="review-header"><span class="review-author">${escapeHTML(review.author || 'Anonymous')}${mineTag}${statusTag}</span><span class="review-date">${dateStr}</span></div>
        <div class="stars" style="font-size:0.85rem;margin-bottom:0.4rem;color:var(--clr-gold)">${renderStars(review.rating || 5)}</div>
        <p class="review-title">${escapeHTML(review.title || 'Untitled')}</p>
        <p class="review-body">${escapeHTML(review.comment || '')}</p>
        ${moderationControls}
      </div>
    `;
  });

  const hasMore = reviews.length > visible.length;
  const loadMore = hasMore
    ? `<div style="text-align:center;margin-top:1rem;"><button id="reviews-load-more-btn" class="btn btn-ghost">Load More Reviews</button></div>`
    : '';

  container.innerHTML = reviewsHTML + loadMore;
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
  const ratings = reviews
    .map(r => Math.max(1, Math.min(5, parseInt(r.rating) || 0)))
    .filter(Boolean);

  const total = ratings.length;
  const avg = total ? (ratings.reduce((sum, rating) => sum + rating, 0) / total) : 0;
  const avgDisplay = Number(avg).toFixed(1);

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
