/**
 * WAQTORO — Wishlist Page JavaScript
 */

document.addEventListener('DOMContentLoaded', () => {
  renderWishlist();

  document.getElementById('clear-wishlist-btn')?.addEventListener('click', () => {
    if (!WaqtoroWishlist.items.length) return;
    if (confirm('Clear your entire wishlist?')) {
      WaqtoroWishlist.items = [];
      WaqtoroWishlist.save();
      renderWishlist();
      showToast('Wishlist cleared.', 'info');
    }
  });

  document.getElementById('add-all-to-cart-btn')?.addEventListener('click', () => {
    const ids = WaqtoroWishlist.items;
    if (!ids.length) { showToast('Your wishlist is empty!', 'info'); return; }
    ids.forEach(id => WaqtoroCart.add(id));
    showToast(`${ids.length} item${ids.length > 1 ? 's' : ''} added to cart!`, 'cart');
  });
});

function renderWishlist() {
  const grid    = document.getElementById('wishlist-grid');
  const empty   = document.getElementById('wishlist-empty');
  const countEl = document.getElementById('wishlist-count-text');
  const ids     = WaqtoroWishlist.items || [];

  if (countEl) countEl.textContent = `${ids.length} saved item${ids.length !== 1 ? 's' : ''}`;

  if (!ids.length) {
    if (empty) empty.style.display = 'block';
    if (grid)  grid.innerHTML = '';
    renderSimilar([]);
    return;
  }

  if (empty) empty.style.display = 'none';
  const items = PRODUCTS.filter(p => ids.includes(p.id));
  if (grid) {
    grid.innerHTML = items.map(p => buildProductCard(p)).join('');
    WaqtoroWishlist.updateButtons();
  }
  renderSimilar(ids);
}

function renderSimilar(excludeIds) {
  const grid = document.getElementById('similar-grid');
  if (!grid) return;
  if (typeof renderProductSkeletons === 'function') {
    renderProductSkeletons('similar-grid', 4);
  }
  const suggestions = PRODUCTS.filter(p => !excludeIds.includes(p.id)).slice(0, 4);
  grid.innerHTML = suggestions.map(p => buildProductCard(p)).join('');
  WaqtoroWishlist.updateButtons();
}
