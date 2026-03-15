import { auth, db } from './firebase-config.js';
import { collection, addDoc, query, where, getDocs, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
  renderRelated(product);
  initTabs();
  loadReviews(id);
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
        <span class="stars">${renderStars(p.rating)}</span>
        <span class="count">${p.rating}.0 / 5</span>
        <span class="count">(${p.reviews} reviews)</span>
        <a class="review-link" onclick="switchTab('reviews')">Read reviews</a>
      </div>

      <div class="product-price-wrap">${priceHTML}</div>

      <div class="product-stock">
        <span class="stock-dot in-stock"></span>
        <span style="color:var(--clr-green);font-weight:600;">In Stock</span>
        <span style="color:var(--clr-muted)">— Ships within 2–3 business days</span>
      </div>

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
          <button class="product-tab-btn" data-tab="reviews" id="reviews-tab-btn">Reviews (${p.reviews})</button>
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
            <tr><th>Type</th><td>Premium Replica / Inspired Design</td></tr>
            <tr><th>Warranty</th><td>6 Months Quality Guarantee</td></tr>
          </table>
        </div>

        <div class="tab-panel" id="tab-reviews">
          <div class="reviews-summary">
            <div class="reviews-big-rating">
              <div class="big-num" id="dynamic-rating-num">${p.rating}.0</div>
              <div class="stars" id="dynamic-stars-top">${renderStars(p.rating)}</div>
              <span id="dynamic-review-count">${p.reviews} reviews</span>
            </div>
            <div class="review-bars">
              <div class="review-bar-row"><span class="star-label">5★</span><div class="review-bar"><div class="review-bar-fill" style="width:78%"></div></div><span class="pct">78%</span></div>
              <div class="review-bar-row"><span class="star-label">4★</span><div class="review-bar"><div class="review-bar-fill" style="width:15%"></div></div><span class="pct">15%</span></div>
              <div class="review-bar-row"><span class="star-label">3★</span><div class="review-bar"><div class="review-bar-fill" style="width:5%"></div></div><span class="pct">5%</span></div>
              <div class="review-bar-row"><span class="star-label">2★</span><div class="review-bar"><div class="review-bar-fill" style="width:2%"></div></div><span class="pct">2%</span></div>
              <div class="review-bar-row"><span class="star-label">1★</span><div class="review-bar"><div class="review-bar-fill" style="width:0%"></div></div><span class="pct">0%</span></div>
            </div>
          </div>

          <div class="write-review-toggle">
            <button class="btn btn-outline" onclick="toggleReviewForm()" style="width:100%;margin-bottom:2rem;">Write a Review</button>
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
}

async function loadReviews(productId) {
  const container = document.getElementById('reviews-container');
  if (!container) return;

  try {
    const q = query(
      collection(db, "reviews"),
      where("productId", "==", productId),
      orderBy("date", "desc")
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      container.innerHTML = `<div style="text-align:center;padding:3rem;color:var(--clr-muted)">
        <p>No reviews yet. Be the first to review this timepiece!</p>
      </div>`;
      return;
    }

    let reviewsHTML = '';
    querySnapshot.forEach((doc) => {
      const r = doc.data();
      const dateStr = r.date ? new Date(r.date.seconds * 1000).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Recently';
      reviewsHTML += `
        <div class="review-item">
          <div class="review-header"><span class="review-author">${r.author || 'Anonymous'}</span><span class="review-date">${dateStr}</span></div>
          <div class="stars" style="font-size:0.85rem;margin-bottom:0.4rem;color:var(--clr-gold)">${renderStars(r.rating || 5)}</div>
          <p class="review-title">${r.title || 'Untitled'}</p>
          <p class="review-body">${r.comment || ''}</p>
        </div>
      `;
    });
    container.innerHTML = reviewsHTML;
  } catch (err) {
    console.error("Error loading reviews:", err);
    container.innerHTML = `<p style="color:var(--clr-red);text-align:center;">Failed to load reviews.</p>`;
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

    const reviewData = {
      productId,
      userId: user.uid,
      author: user.displayName || user.email.split('@')[0],
      rating: parseInt(ratingInput.value),
      title: document.getElementById('review-title').value,
      comment: document.getElementById('review-comment').value,
      date: serverTimestamp()
    };

    try {
      await addDoc(collection(db, "reviews"), reviewData);
      showToast('Review submitted successfully!', 'success');
      form.reset();
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
