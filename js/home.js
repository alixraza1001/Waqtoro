/**
 * WAQTORO — Home Page JavaScript
 * Handles: product tabs, product grid rendering
 */

document.addEventListener('DOMContentLoaded', () => {
  initProductTabs();
});

/* =================== PRODUCT TABS =================== */
function initProductTabs() {
  const tabs = document.querySelectorAll('.product-tab');
  const grid = document.getElementById('home-products-grid');
  if (!tabs.length || !grid) return;

  function renderProducts(filter) {
    let filtered = PRODUCTS;
    if (filter === 'men')    filtered = PRODUCTS.filter(p => p.gender === 'men' || p.gender === 'unisex');
    if (filter === 'women')  filtered = PRODUCTS.filter(p => p.gender === 'women' || p.gender === 'unisex');
    if (filter === 'sale')   filtered = PRODUCTS.filter(p => p.badge === 'sale');

    // Show up to 8
    const show = filtered.slice(0, 8);

    if (!show.length) {
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--clr-muted);">No watches found in this category.</div>`;
      return;
    }

    grid.innerHTML = show.map(p => buildProductCard(p, true)).join('');

    // Re-apply wishlist state
    WaqtoroWishlist.updateButtons();

    // Animate new cards
    grid.querySelectorAll('.product-card').forEach((card, i) => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(20px)';
      setTimeout(() => {
        card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, i * 60);
    });
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderProducts(tab.dataset.tab);
    });
  });

  // Initial render
  renderProducts('all');
}
