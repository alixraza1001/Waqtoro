/**
 * WAQTORO — Cart Page JavaScript
 */

const PROMO_CODES = {
  'WAQTORO10': 0.10,
  'LUXURY20':  0.20,
  'WELCOME15': 0.15
};

let appliedDiscount = 0;

document.addEventListener('DOMContentLoaded', () => {
  renderCartPage();
  renderSuggested();
  setupPromo();

  document.getElementById('clear-cart-btn')?.addEventListener('click', () => {
    if (confirm('Clear all items from your cart?')) {
      WaqtoroCart.items = [];
      WaqtoroCart.save();
      renderCartPage();
    }
  });
});

function renderCartPage() {
  const empty   = document.getElementById('cart-empty');
  const content = document.getElementById('cart-content');

  if (!WaqtoroCart.items.length) {
    if (empty) empty.style.display = 'block';
    if (content) content.style.display = 'none';
    return;
  }
  if (empty) empty.style.display = 'none';
  if (content) content.style.display = 'grid';

  renderItems();
  updateSummary();
}

function renderItems() {
  const list = document.getElementById('cart-items-list');
  if (!list) return;

  list.innerHTML = WaqtoroCart.items.map(item => {
    const p = PRODUCTS.find(pr => pr.id === item.id);
    if (!p) return '';
    const lineTotal = p.price * item.qty;
    return `
      <div class="cart-item" data-id="${p.id}" data-color="${item.color || ''}">
        <div class="cart-item-img">
          <img src="${IMG_BASE}${Array.isArray(p.img) ? p.img[0] : p.img}" alt="${p.brand} ${p.name}" />
        </div>
        <div class="cart-item-info">
          <span class="cart-item-brand">${p.brand}</span>
          <span class="cart-item-name">${p.name}</span>
          <span class="cart-item-meta">${p.movement} · ${p.strap}${item.color ? ` · <span style="color:var(--clr-gold);font-weight:600;">${item.color}</span>` : ` · ${p.dialColor} Dial`}</span>
          <button class="cart-remove-btn" onclick="removeCartItem(${p.id}, '${item.color || ''}')">Remove</button>
        </div>
        <div class="cart-item-controls">
          <span class="cart-item-price">${formatPrice(lineTotal)}</span>
          <div class="cart-item-qty">
            <button class="cart-qty-btn" onclick="updateQty(${p.id}, -1, '${item.color || ''}')">−</button>
            <span>${item.qty}</span>
            <button class="cart-qty-btn" onclick="updateQty(${p.id}, 1, '${item.color || ''}')">+</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function updateQty(productId, delta, color = '') {
  const actualColor = color === '' ? null : color;
  const item = WaqtoroCart.items.find(i => i.id === productId && i.color === actualColor);
  if (!item) return;
  const newQty = item.qty + delta;
  if (newQty <= 0) {
    removeCartItem(productId, color);
    return;
  }
  if (newQty > 10) return;
  WaqtoroCart.updateQty(productId, newQty, actualColor);
  renderCartPage();
}

function removeCartItem(productId, color = '') {
  const actualColor = color === '' ? null : color;
  WaqtoroCart.remove(productId, actualColor);
  renderCartPage();
  showToast('Item removed from cart', 'cart');
}

function updateSummary() {
  const subtotal   = WaqtoroCart.total();
  const discount   = Math.round(subtotal * appliedDiscount);
  const total      = subtotal - discount;

  const subtotalEl  = document.getElementById('summary-subtotal');
  const totalEl     = document.getElementById('summary-total');
  const discountLine = document.getElementById('discount-line');
  const discountEl  = document.getElementById('discount-amount');

  if (subtotalEl) subtotalEl.textContent = formatPrice(subtotal);
  if (totalEl)    totalEl.textContent    = formatPrice(total);

  if (discount > 0) {
    if (discountLine) discountLine.style.display = 'flex';
    if (discountEl)   discountEl.textContent = `-${formatPrice(discount)}`;
  } else {
    if (discountLine) discountLine.style.display = 'none';
  }
}

function setupPromo() {
  const btn   = document.getElementById('promo-btn');
  const input = document.getElementById('promo-input');
  const msg   = document.getElementById('promo-msg');
  if (!btn || !input) return;

  btn.addEventListener('click', () => {
    const code = input.value.trim().toUpperCase();
    if (PROMO_CODES[code]) {
      appliedDiscount = PROMO_CODES[code];
      msg.className  = 'promo-msg success';
      msg.textContent = `✓ Code applied! ${Math.round(appliedDiscount * 100)}% discount`;
      input.disabled = true;
      btn.disabled   = true;
      updateSummary();
    } else {
      msg.className  = 'promo-msg error';
      msg.textContent = '✕ Invalid promo code. Try: WAQTORO10';
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btn.click();
  });
}

function renderSuggested() {
  const grid = document.getElementById('suggested-grid');
  if (!grid) return;
  const cartIds = WaqtoroCart.items.map(i => i.id);
  const suggestions = PRODUCTS.filter(p => !cartIds.includes(p.id)).slice(0, 4);
  grid.innerHTML = suggestions.map(p => buildProductCard(p, false)).join('');
  WaqtoroWishlist.updateButtons();
}
